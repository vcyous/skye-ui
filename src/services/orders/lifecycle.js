import { invalidateAnalyticsReportCache } from "../analyticsService";
import { getStoreContext } from "../storeService";
import { supabase } from "../supabaseClient";
import { isMissingColumnError, normalizeError } from "../utils/errorUtils";
import {
  canTransition,
  FULFILLMENT_STATUS_FLOW,
  ORDER_STATUS_FLOW,
  PAYMENT_STATUS_FLOW,
} from "./flows";
import { logOrderStateEvent, logOrderTimelineEvent } from "./lifecycleLog";

function legacyFulfillmentFromStatus(status) {
  if (status === "receive") return "delivered";
  if (status === "ongoing_shipped") return "shipped";
  if (status === "cancelled") return "cancelled";
  return "unfulfilled";
}

async function fetchOrderLifecycleSnapshot(orderId, storeId) {
  let { data, error } = await supabase
    .from("orders")
    .select("id, status, payment_status, fulfillment_status")
    .eq("id", orderId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error && isMissingColumnError(error, "fulfillment_status")) {
    const fallback = await supabase
      .from("orders")
      .select("id, status, payment_status")
      .eq("id", orderId)
      .eq("store_id", storeId)
      .maybeSingle();
    data = fallback.data
      ? {
          ...fallback.data,
          fulfillment_status: legacyFulfillmentFromStatus(fallback.data.status),
        }
      : fallback.data;
    error = fallback.error;
  }

  if (error) throw normalizeError(error);
  if (!data) {
    const err = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    throw err;
  }
  return data;
}

async function updateOrderLifecycle(orderId, payload = {}) {
  const { authUser, store } = await getStoreContext();
  const current = await fetchOrderLifecycleSnapshot(orderId, store.id);

  const nextStatus = payload.status || current.status;
  const nextPaymentStatus = payload.paymentStatus || current.payment_status;
  const nextFulfillmentStatus =
    payload.fulfillmentStatus || current.fulfillment_status;

  if (!canTransition(ORDER_STATUS_FLOW, current.status, nextStatus)) {
    throw new Error(
      `Invalid order status transition: ${current.status} -> ${nextStatus}`,
    );
  }
  if (!canTransition(PAYMENT_STATUS_FLOW, current.payment_status, nextPaymentStatus)) {
    throw new Error(
      `Invalid payment status transition: ${current.payment_status} -> ${nextPaymentStatus}`,
    );
  }
  if (
    !canTransition(
      FULFILLMENT_STATUS_FLOW,
      current.fulfillment_status,
      nextFulfillmentStatus,
    )
  ) {
    throw new Error(
      `Invalid fulfillment status transition: ${current.fulfillment_status} -> ${nextFulfillmentStatus}`,
    );
  }

  const updatePayload = {
    status: nextStatus,
    payment_status: nextPaymentStatus,
    fulfillment_status: nextFulfillmentStatus,
    updated_at: new Date().toISOString(),
  };

  let { data: updatedOrder, error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId)
    .eq("store_id", store.id)
    .select(
      "id, order_number, status, payment_status, fulfillment_status, total_amount, created_at, updated_at",
    )
    .maybeSingle();

  if (error && isMissingColumnError(error, "fulfillment_status")) {
    const fallback = await supabase
      .from("orders")
      .update({
        status: nextStatus,
        payment_status: nextPaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("store_id", store.id)
      .select(
        "id, order_number, status, payment_status, total_amount, created_at, updated_at",
      )
      .maybeSingle();
    updatedOrder = fallback.data
      ? { ...fallback.data, fulfillment_status: current.fulfillment_status }
      : fallback.data;
    error = fallback.error;
  }

  if (error) throw normalizeError(error);
  if (!updatedOrder) {
    const err = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    throw err;
  }

  await emitTransitionEvents({
    current,
    next: { status: nextStatus, paymentStatus: nextPaymentStatus, fulfillmentStatus: nextFulfillmentStatus },
    orderId: updatedOrder.id,
    actorId: authUser.id,
    note: payload.note,
    internalNote: payload.internalNote,
  });

  await invalidateAnalyticsReportCache(store.id, "analytics_overview");

  return {
    id: updatedOrder.id,
    order_number: updatedOrder.order_number,
    orderNumber: updatedOrder.order_number,
    total_price: Number(updatedOrder.total_amount || 0),
    total: Number(updatedOrder.total_amount || 0),
    status: updatedOrder.status,
    paymentStatus: updatedOrder.payment_status,
    fulfillmentStatus:
      updatedOrder.fulfillment_status || current.fulfillment_status,
    created_at: updatedOrder.created_at,
    updated_at: updatedOrder.updated_at,
  };
}

async function emitTransitionEvents({ current, next, orderId, actorId, note, internalNote }) {
  if (next.status !== current.status) {
    await logOrderTimelineEvent(
      orderId,
      next.status,
      actorId,
      note || `Order status updated to ${next.status}`,
    );
    await logOrderStateEvent({
      orderId,
      actorId,
      eventType: "order_status",
      fromValue: current.status,
      toValue: next.status,
      note,
    });
  }

  if (next.paymentStatus !== current.payment_status) {
    await logOrderTimelineEvent(
      orderId,
      next.status,
      actorId,
      note || `Payment status updated to ${next.paymentStatus}`,
    );
    await logOrderStateEvent({
      orderId,
      actorId,
      eventType: "payment_status",
      fromValue: current.payment_status,
      toValue: next.paymentStatus,
      note,
    });
  }

  if (next.fulfillmentStatus !== current.fulfillment_status) {
    await logOrderTimelineEvent(
      orderId,
      next.status,
      actorId,
      note || `Fulfillment status updated to ${next.fulfillmentStatus}`,
    );
    await logOrderStateEvent({
      orderId,
      actorId,
      eventType: "fulfillment_status",
      fromValue: current.fulfillment_status,
      toValue: next.fulfillmentStatus,
      note,
    });
  }

  if (internalNote) {
    await logOrderTimelineEvent(
      orderId,
      next.status,
      actorId,
      `Internal note: ${internalNote}`,
    );
    await logOrderStateEvent({
      orderId,
      actorId,
      eventType: "internal_note",
      fromValue: null,
      toValue: null,
      note: internalNote,
    });
  }
}

export async function addOrderInternalNote(orderId, note) {
  const text = String(note || "").trim();
  if (!text) throw new Error("Internal note is required");
  return updateOrderLifecycle(orderId, {
    internalNote: text,
    note: "Internal order note added",
  });
}

export async function updateOrderLifecycleState(orderId, payload) {
  return updateOrderLifecycle(orderId, payload || {});
}

export async function updateOrderStatus(orderId, status) {
  return updateOrderLifecycle(orderId, { status });
}

export function getOrderLifecycleOptions(current = {}) {
  const status = String(current.status || "").toLowerCase();
  const paymentStatus = String(current.paymentStatus || "").toLowerCase();
  const fulfillmentStatus = String(current.fulfillmentStatus || "").toLowerCase();

  return {
    status: Array.from(
      new Set([status, ...(ORDER_STATUS_FLOW[status] || [])].filter(Boolean)),
    ),
    paymentStatus: Array.from(
      new Set(
        [paymentStatus, ...(PAYMENT_STATUS_FLOW[paymentStatus] || [])].filter(
          Boolean,
        ),
      ),
    ),
    fulfillmentStatus: Array.from(
      new Set(
        [
          fulfillmentStatus,
          ...(FULFILLMENT_STATUS_FLOW[fulfillmentStatus] || []),
        ].filter(Boolean),
      ),
    ),
  };
}
