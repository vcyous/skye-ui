// @ts-nocheck
/**
 * returnsService — Return requests, status lifecycle, refunds, and inventory reconciliation
 *
 * Domain: Returns / Refunds
 * Feature: 12
 * Depends on: supabaseClient, utils/errorUtils, storeService, inventoryService, paymentService
 */

import { recordStockMovement } from "./inventoryService.js";
import { createTransactionEvent } from "./paymentService.js";
import { createRmaNumber, getStoreContext } from "./storeService.js";
import { supabase } from "./supabaseClient.js";
import { isMissingColumnError, normalizeError } from "./utils/errorUtils.js";

const RETURN_STATUS_FLOW = {
  pending: ["approved", "rejected"],
  approved: ["received", "rejected"],
  received: ["refunded"],
  rejected: [],
  refunded: [],
};

export function normalizeReturnStatus(value) {
  const status = String(value || "pending")
    .trim()
    .toLowerCase();
  return RETURN_STATUS_FLOW[status] ? status : "pending";
}

function canTransitionReturn(fromStatus, toStatus) {
  const from = normalizeReturnStatus(fromStatus);
  const to = normalizeReturnStatus(toStatus);
  if (from === to) {
    return true;
  }
  return (RETURN_STATUS_FLOW[from] || []).includes(to);
}

function normalizeReturnReasonCode(value) {
  const next = String(value || "other")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const allowed = new Set([
    "wrong_size",
    "wrong_item",
    "damaged",
    "defective",
    "not_as_described",
    "changed_mind",
    "late_delivery",
    "other",
  ]);

  return allowed.has(next) ? next : "other";
}

function shouldRestockReturnedItem(condition, restockAction = "auto") {
  const normalizedAction = String(restockAction || "auto")
    .trim()
    .toLowerCase();

  if (normalizedAction === "discard") {
    return false;
  }
  if (normalizedAction === "restock") {
    return true;
  }

  const normalizedCondition = String(condition || "opened")
    .trim()
    .toLowerCase();
  return normalizedCondition === "unopened" || normalizedCondition === "opened";
}

async function reconcileReturnedInventory({
  storeId,
  orderId,
  returnId,
  reasonCode,
  note,
}) {
  let returnItemsResponse = await supabase
    .from("return_items")
    .select("id, order_item_id, quantity, condition, restock_action")
    .eq("return_id", returnId);

  if (
    returnItemsResponse.error &&
    isMissingColumnError(returnItemsResponse.error, "restock_action")
  ) {
    const fallback = await supabase
      .from("return_items")
      .select("id, order_item_id, quantity, condition")
      .eq("return_id", returnId);
    returnItemsResponse = {
      data: (fallback.data || []).map((item) => ({
        ...item,
        restock_action: "auto",
      })),
      error: fallback.error,
    };
  }

  if (returnItemsResponse.error) {
    throw normalizeError(returnItemsResponse.error);
  }

  const returnItems = returnItemsResponse.data || [];
  if (!returnItems.length) {
    return;
  }

  const orderItemIds = returnItems
    .map((item) => item.order_item_id)
    .filter(Boolean);
  const { data: orderItems, error: orderItemsError } = await supabase
    .from("order_items")
    .select("id, product_variant_id, product_title, sku")
    .eq("order_id", orderId)
    .in("id", orderItemIds);

  if (orderItemsError) {
    throw normalizeError(orderItemsError);
  }

  const orderItemMap = new Map(
    (orderItems || []).map((item) => [item.id, item]),
  );

  for (const returnedItem of returnItems) {
    if (
      !shouldRestockReturnedItem(
        returnedItem.condition,
        returnedItem.restock_action,
      )
    ) {
      continue;
    }

    const orderItem = orderItemMap.get(returnedItem.order_item_id);
    if (!orderItem?.product_variant_id) {
      continue;
    }

    const qty = Number(returnedItem.quantity || 0);
    if (!qty) {
      continue;
    }

    const { data: variant, error: variantError } = await supabase
      .from("product_variants")
      .select("id, quantity_in_stock")
      .eq("id", orderItem.product_variant_id)
      .maybeSingle();

    if (variantError) {
      throw normalizeError(variantError);
    }

    if (!variant) {
      continue;
    }

    const quantityBefore = Number(variant.quantity_in_stock || 0);
    const quantityAfter = quantityBefore + qty;

    const { error: updateError } = await supabase
      .from("product_variants")
      .update({
        quantity_in_stock: quantityAfter,
        updated_at: new Date().toISOString(),
      })
      .eq("id", variant.id);

    if (updateError) {
      throw normalizeError(updateError);
    }

    await recordStockMovement({
      storeId,
      variantId: variant.id,
      quantityBefore,
      quantityAfter,
      quantityDelta: qty,
      reasonCode: "return",
      note:
        note ||
        `Return restock (${normalizeReturnReasonCode(reasonCode)}) for order ${orderId}`,
      metadata: {
        orderId,
        returnId,
        reasonCode: normalizeReturnReasonCode(reasonCode),
      },
    });
  }
}

export function getReturnStatusOptions(currentStatus) {
  const current = normalizeReturnStatus(currentStatus);
  return [current, ...(RETURN_STATUS_FLOW[current] || [])];
}

export async function getReturns() {
  const { store } = await getStoreContext();
  let { data, error } = await supabase
    .from("returns")
    .select(
      "id, order_id, rma_number, reason, reason_code, resolution_note, status, requested_at, approved_at, rejected_at, received_at, refunded_at, orders(order_number)",
    )
    .eq("store_id", store.id)
    .order("requested_at", { ascending: false });

  if (error && isMissingColumnError(error, "reason_code")) {
    const fallback = await supabase
      .from("returns")
      .select(
        "id, order_id, rma_number, reason, status, requested_at, orders(order_number)",
      )
      .eq("store_id", store.id)
      .order("requested_at", { ascending: false });
    data = (fallback.data || []).map((item) => ({
      ...item,
      reason_code: "other",
      resolution_note: null,
      approved_at: null,
      rejected_at: null,
      received_at: null,
      refunded_at: null,
    }));
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  const returnIds = (data || []).map((item) => item.id);
  let refundRows = [];
  if (returnIds.length) {
    const { data: refundData, error: refundError } = await supabase
      .from("refunds")
      .select("return_id, amount, status")
      .eq("store_id", store.id)
      .in("return_id", returnIds);

    if (refundError) {
      throw normalizeError(refundError);
    }
    refundRows = refundData || [];
  }

  const refundTotals = new Map();
  for (const row of refundRows) {
    if (row.status !== "processed") {
      continue;
    }
    const current = Number(refundTotals.get(row.return_id) || 0);
    refundTotals.set(
      row.return_id,
      Number((current + Number(row.amount || 0)).toFixed(2)),
    );
  }

  return (data || []).map((item) => ({
    id: item.id,
    orderId: item.order_id,
    orderNumber: item.orders?.order_number || "-",
    rmaNumber: item.rma_number,
    reason: item.reason || "",
    reasonCode: item.reason_code || "other",
    resolutionNote: item.resolution_note || "",
    status: normalizeReturnStatus(item.status),
    availableStatuses: getReturnStatusOptions(item.status),
    refundedAmount: Number(refundTotals.get(item.id) || 0),
    requestedAt: item.requested_at,
    approvedAt: item.approved_at,
    rejectedAt: item.rejected_at,
    receivedAt: item.received_at,
    refundedAt: item.refunded_at,
  }));
}

export async function createReturnRequest(payload) {
  const { authUser, store } = await getStoreContext();
  const reasonCode = normalizeReturnReasonCode(payload.reasonCode);
  let { data: returnRow, error } = await supabase
    .from("returns")
    .insert({
      store_id: store.id,
      order_id: payload.orderId,
      rma_number: createRmaNumber(),
      reason: payload.reason || null,
      reason_code: reasonCode,
      status: "pending",
    })
    .select("id")
    .single();

  if (error && isMissingColumnError(error, "reason_code")) {
    const fallback = await supabase
      .from("returns")
      .insert({
        store_id: store.id,
        order_id: payload.orderId,
        rma_number: createRmaNumber(),
        reason: payload.reason || null,
        status: "pending",
      })
      .select("id")
      .single();
    if (fallback.error) {
      throw normalizeError(fallback.error);
    }
    returnRow = fallback.data;
    error = null;
  }

  if (error) {
    throw normalizeError(error);
  }

  const { data: orderItems, error: orderItemsError } = await supabase
    .from("order_items")
    .select("id, quantity")
    .eq("order_id", payload.orderId)
    .order("created_at", { ascending: true });

  if (orderItemsError) {
    throw normalizeError(orderItemsError);
  }

  const requestedItems =
    Array.isArray(payload.items) && payload.items.length
      ? payload.items
      : (orderItems || []).map((item) => ({
          orderItemId: item.id,
          quantity: item.quantity,
          condition: "opened",
          restockAction: "auto",
        }));

  let { error: returnItemsError } = await supabase.from("return_items").insert(
    requestedItems.map((item) => ({
      return_id: returnRow.id,
      order_item_id: item.orderItemId,
      quantity: Number(item.quantity || 1),
      condition: item.condition || "opened",
      restock_action: item.restockAction || "auto",
    })),
  );

  if (
    returnItemsError &&
    isMissingColumnError(returnItemsError, "restock_action")
  ) {
    const fallback = await supabase.from("return_items").insert(
      requestedItems.map((item) => ({
        return_id: returnRow.id,
        order_item_id: item.orderItemId,
        quantity: Number(item.quantity || 1),
        condition: item.condition || "opened",
      })),
    );
    returnItemsError = fallback.error;
  }

  if (returnItemsError) {
    throw normalizeError(returnItemsError);
  }

  const { error: timelineError } = await supabase
    .from("order_timeline")
    .insert({
      order_id: payload.orderId,
      status: "receive",
      actor_type: "user",
      actor_id: authUser.id,
      note: `Return requested (${reasonCode})`,
    });

  if (timelineError) {
    throw normalizeError(timelineError);
  }

  return { ok: true };
}

export async function updateReturnStatus(returnId, status) {
  const { authUser, store } = await getStoreContext();
  const nextStatus = normalizeReturnStatus(status);

  const { data: currentReturn, error: currentError } = await supabase
    .from("returns")
    .select("id, order_id, status, reason_code")
    .eq("id", returnId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (currentError) {
    throw normalizeError(currentError);
  }

  if (!currentReturn) {
    throw new Error("Return not found");
  }

  if (!canTransitionReturn(currentReturn.status, nextStatus)) {
    throw new Error(
      `Invalid return transition: ${currentReturn.status} -> ${nextStatus}`,
    );
  }

  const timestampPayload = {
    updated_at: new Date().toISOString(),
  };
  if (nextStatus === "approved") {
    timestampPayload.approved_at = new Date().toISOString();
  }
  if (nextStatus === "rejected") {
    timestampPayload.rejected_at = new Date().toISOString();
  }
  if (nextStatus === "received") {
    timestampPayload.received_at = new Date().toISOString();
  }
  if (nextStatus === "refunded") {
    timestampPayload.refunded_at = new Date().toISOString();
  }

  let { error } = await supabase
    .from("returns")
    .update({
      status: nextStatus,
      ...timestampPayload,
    })
    .eq("id", returnId)
    .eq("store_id", store.id);

  if (error && isMissingColumnError(error, "approved_at")) {
    const fallback = await supabase
      .from("returns")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", returnId)
      .eq("store_id", store.id);
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  if (nextStatus === "received") {
    await reconcileReturnedInventory({
      storeId: store.id,
      orderId: currentReturn.order_id,
      returnId,
      reasonCode: currentReturn.reason_code || "other",
      note: "Return items restocked after receipt",
    });
  }

  const { error: timelineError } = await supabase
    .from("order_timeline")
    .insert({
      order_id: currentReturn.order_id,
      status: "receive",
      actor_type: "user",
      actor_id: authUser.id,
      note: `Return status changed to ${nextStatus}`,
    });

  if (timelineError) {
    throw normalizeError(timelineError);
  }

  return { ok: true };
}

export async function getRefunds() {
  const { store } = await getStoreContext();
  let { data, error } = await supabase
    .from("refunds")
    .select(
      "id, return_id, transaction_id, amount, status, refund_type, reason_code, note, processed_at, created_at, returns(rma_number)",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error && isMissingColumnError(error, "refund_type")) {
    const fallback = await supabase
      .from("refunds")
      .select(
        "id, return_id, transaction_id, amount, status, created_at, returns(rma_number)",
      )
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    data = (fallback.data || []).map((item) => ({
      ...item,
      refund_type: "partial",
      reason_code: "other",
      note: null,
      processed_at: item.created_at,
    }));
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    returnId: item.return_id,
    transactionId: item.transaction_id,
    amount: Number(item.amount || 0),
    status: item.status,
    refundType: item.refund_type || "partial",
    reasonCode: item.reason_code || "other",
    note: item.note || "",
    processedAt: item.processed_at || item.created_at,
    rmaNumber: item.returns?.rma_number || "-",
    createdAt: item.created_at,
  }));
}

export async function processRefund(payload) {
  const { authUser, store } = await getStoreContext();
  const { data: returnRow, error: returnError } = await supabase
    .from("returns")
    .select("id, order_id, status, reason_code")
    .eq("id", payload.returnId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (returnError) {
    throw normalizeError(returnError);
  }

  if (!returnRow) {
    throw new Error("Return not found");
  }

  if (!["approved", "received", "refunded"].includes(returnRow.status)) {
    throw new Error("Return must be approved before refund processing");
  }

  let transactionResponse = await supabase
    .from("transactions")
    .select("id, amount, captured_amount, status")
    .eq("order_id", returnRow.order_id)
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    transactionResponse.error &&
    isMissingColumnError(transactionResponse.error, "captured_amount")
  ) {
    const fallback = await supabase
      .from("transactions")
      .select("id, amount, status")
      .eq("order_id", returnRow.order_id)
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    transactionResponse = {
      data: fallback.data
        ? {
            ...fallback.data,
            captured_amount:
              fallback.data.status === "captured"
                ? Number(fallback.data.amount || 0)
                : 0,
          }
        : fallback.data,
      error: fallback.error,
    };
  }

  if (transactionResponse.error) {
    throw normalizeError(transactionResponse.error);
  }

  const transaction = transactionResponse.data;

  const { data: refundRows, error: refundRowsError } = await supabase
    .from("refunds")
    .select("amount, status")
    .eq("store_id", store.id)
    .eq("return_id", payload.returnId);

  if (refundRowsError) {
    throw normalizeError(refundRowsError);
  }

  const refundedSoFar = Number(
    (refundRows || [])
      .filter((item) => item.status === "processed")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
      .toFixed(2),
  );

  const refundableBase = transaction
    ? Number(
        transaction.captured_amount ||
          transaction.amount ||
          payload.maxRefundAmount ||
          0,
      )
    : Number(payload.maxRefundAmount || 0);

  const remainingRefund = Number((refundableBase - refundedSoFar).toFixed(2));
  const requestedAmount = Number(payload.amount || 0);
  if (!requestedAmount || requestedAmount <= 0) {
    throw new Error("Refund amount must be greater than zero");
  }
  if (remainingRefund > 0 && requestedAmount > remainingRefund) {
    throw new Error(
      `Refund amount exceeds remaining refundable amount ${remainingRefund.toFixed(2)}`,
    );
  }

  const totalAfterRefund = Number((refundedSoFar + requestedAmount).toFixed(2));
  const refundType =
    refundableBase > 0 && totalAfterRefund >= refundableBase
      ? "full"
      : "partial";
  const reasonCode = normalizeReturnReasonCode(
    payload.reasonCode || returnRow.reason_code || "other",
  );

  let { error } = await supabase.from("refunds").insert({
    store_id: store.id,
    return_id: payload.returnId,
    transaction_id: transaction?.id || null,
    amount: requestedAmount,
    status: "processed",
    refund_type: refundType,
    reason_code: reasonCode,
    note: payload.note || null,
    processed_at: new Date().toISOString(),
    gateway_refund_id: `refund-${Date.now().toString(36)}`,
    metadata_json: {
      actorId: authUser.id,
      refundedSoFar,
      refundableBase,
      remainingRefund,
    },
  });

  if (error && isMissingColumnError(error, "refund_type")) {
    const fallback = await supabase.from("refunds").insert({
      store_id: store.id,
      return_id: payload.returnId,
      transaction_id: transaction?.id || null,
      amount: requestedAmount,
      status: "processed",
      gateway_refund_id: `refund-${Date.now().toString(36)}`,
    });
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  const nextReturnStatus = refundType === "full" ? "refunded" : "received";
  let { error: returnUpdateError } = await supabase
    .from("returns")
    .update({
      status: nextReturnStatus,
      refunded_at: refundType === "full" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.returnId)
    .eq("store_id", store.id);

  if (
    returnUpdateError &&
    isMissingColumnError(returnUpdateError, "refunded_at")
  ) {
    const fallback = await supabase
      .from("returns")
      .update({
        status: nextReturnStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.returnId)
      .eq("store_id", store.id);
    returnUpdateError = fallback.error;
  }

  if (returnUpdateError) {
    throw normalizeError(returnUpdateError);
  }

  if (transaction?.id) {
    const currentCaptured = Number(
      transaction.captured_amount || transaction.amount || 0,
    );
    const capturedAfter = Number(
      Math.max(0, currentCaptured - requestedAmount).toFixed(2),
    );
    const transactionStatus =
      refundType === "full" ? "refunded" : transaction.status || "captured";

    let transactionUpdate = await supabase
      .from("transactions")
      .update({
        status: transactionStatus,
        captured_amount: capturedAfter,
        provider_status:
          refundType === "full" ? "refunded" : "partially_refunded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id)
      .eq("store_id", store.id);

    if (
      transactionUpdate.error &&
      isMissingColumnError(transactionUpdate.error, "captured_amount")
    ) {
      transactionUpdate = await supabase
        .from("transactions")
        .update({
          status: transactionStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id)
        .eq("store_id", store.id);
    }

    const transactionUpdateError = transactionUpdate.error;

    if (transactionUpdateError) {
      throw normalizeError(transactionUpdateError);
    }

    await createTransactionEvent({
      transactionId: transaction.id,
      orderId: returnRow.order_id,
      eventType: "refund",
      status: refundType === "full" ? "refunded" : transaction.status,
      providerStatus: refundType === "full" ? "refunded" : "partially_refunded",
      amount: requestedAmount,
      referenceId: `refund-${Date.now().toString(36)}`,
      note: payload.note || `Refund processed (${refundType})`,
      metadata: {
        reasonCode,
        refundType,
      },
    });
  }

  const nextPaymentStatus =
    refundType === "full" ? "refunded" : "partially_refunded";

  const { error: orderError } = await supabase
    .from("orders")
    .update({
      payment_status: nextPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", returnRow.order_id)
    .eq("store_id", store.id);

  if (orderError) {
    throw normalizeError(orderError);
  }

  const { error: timelineError } = await supabase
    .from("order_timeline")
    .insert({
      order_id: returnRow.order_id,
      status: "receive",
      actor_type: "user",
      actor_id: authUser.id,
      note: `Refund processed (${refundType}) - ${requestedAmount.toFixed(2)}`,
    });

  if (timelineError) {
    throw normalizeError(timelineError);
  }

  return { ok: true };
}