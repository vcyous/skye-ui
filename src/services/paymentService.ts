// @ts-nocheck
/**
 * paymentService — Payment methods, transactions, and status lifecycle management
 *
 * Domain: Payments
 * Feature: 09
 * Depends on: supabaseClient, utils/errorUtils, storeService
 */

import { getStoreContext } from "./storeService.js";
import { supabase } from "./supabaseClient.js";
import { tableExists } from "./utils/dbUtils.js";
import { isMissingColumnError, normalizeError } from "./utils/errorUtils.js";

const TRANSACTION_STATUS_FLOW = {
  pending: ["authorized", "failed", "voided"],
  authorized: ["captured", "partially_captured", "voided", "failed"],
  partially_captured: ["captured", "voided", "failed", "refunded"],
  captured: ["refunded"],
  refunded: [],
  failed: ["pending"],
  voided: ["pending"],
};

const PROVIDER_STATUS_MAP = {
  stripe: {
    requires_payment_method: "failed",
    requires_action: "pending",
    requires_capture: "authorized",
    succeeded: "captured",
    canceled: "voided",
    failed: "failed",
  },
  paypal: {
    created: "pending",
    approved: "authorized",
    completed: "captured",
    voided: "voided",
    declined: "failed",
  },
  manual: {
    pending: "pending",
    authorized: "authorized",
    captured: "captured",
    partially_captured: "partially_captured",
    voided: "voided",
    failed: "failed",
    refunded: "refunded",
  },
};

function normalizeTransactionStatus(value) {
  const status = String(value || "pending")
    .trim()
    .toLowerCase();
  return TRANSACTION_STATUS_FLOW[status] ? status : "pending";
}

function canTransitionTransaction(fromStatus, toStatus) {
  const from = normalizeTransactionStatus(fromStatus);
  const to = normalizeTransactionStatus(toStatus);
  if (from === to) {
    return true;
  }
  return (TRANSACTION_STATUS_FLOW[from] || []).includes(to);
}

function mapProviderStatus(provider, rawStatus) {
  const providerKey = String(provider || "manual").toLowerCase();
  const raw = String(rawStatus || "")
    .trim()
    .toLowerCase();
  if (!raw) {
    return "pending";
  }

  const map = PROVIDER_STATUS_MAP[providerKey] || PROVIDER_STATUS_MAP.manual;
  return map[raw] || normalizeTransactionStatus(raw);
}

export async function loadTransactionEventsByTransactionIds(transactionIds) {
  if (!transactionIds.length || !(await tableExists("transaction_events"))) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("transaction_events")
    .select(
      "id, transaction_id, event_type, status, provider_status, amount, reference_id, note, created_at",
    )
    .in("transaction_id", transactionIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).reduce((acc, item) => {
    const bucket = acc.get(item.transaction_id) || [];
    bucket.push({
      id: item.id,
      eventType: item.event_type,
      status: item.status,
      providerStatus: item.provider_status,
      amount: Number(item.amount || 0),
      referenceId: item.reference_id || "",
      note: item.note || "",
      createdAt: item.created_at,
    });
    acc.set(item.transaction_id, bucket);
    return acc;
  }, new Map());
}

export async function createTransactionEvent(payload) {
  if (!(await tableExists("transaction_events"))) {
    return;
  }

  const { error } = await supabase.from("transaction_events").insert({
    transaction_id: payload.transactionId,
    order_id: payload.orderId,
    event_type: payload.eventType,
    status: payload.status,
    provider_status: payload.providerStatus || null,
    amount: payload.amount ?? null,
    reference_id: payload.referenceId || null,
    note: payload.note || null,
    metadata: payload.metadata || {},
  });

  if (error) {
    throw normalizeError(error);
  }
}

function buildTransactionActions(status) {
  const current = normalizeTransactionStatus(status);
  return [current, ...(TRANSACTION_STATUS_FLOW[current] || [])];
}

export function getTransactionStatusOptions(currentStatus) {
  return Array.from(new Set(buildTransactionActions(currentStatus))).map(
    (value) => ({ value, label: value }),
  );
}

export async function getPaymentMethods() {
  const { store } = await getStoreContext();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, provider, display_name, config_json, is_active, created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    provider: item.provider,
    displayName: item.display_name,
    config: item.config_json || {},
    isActive: Boolean(item.is_active),
    createdAt: item.created_at,
  }));
}

export async function createPaymentMethod(payload) {
  const { store } = await getStoreContext();
  const { error } = await supabase.from("payment_methods").insert({
    store_id: store.id,
    provider: payload.provider,
    display_name: payload.displayName,
    config_json: payload.config || {},
    is_active: payload.isActive ?? true,
  });

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function updatePaymentMethod(paymentMethodId, payload) {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("payment_methods")
    .update({
      provider: payload.provider,
      display_name: payload.displayName,
      config_json: payload.config || {},
      is_active: payload.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentMethodId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function deletePaymentMethod(paymentMethodId) {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", paymentMethodId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function getTransactions() {
  const { store } = await getStoreContext();
  let { data, error } = await supabase
    .from("transactions")
    .select(
      "id, order_id, amount, captured_amount, currency_code, status, provider_status, gateway_transaction_id, failure_code, created_at, payment_methods(display_name), orders(order_number)",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error && isMissingColumnError(error, "captured_amount")) {
    const fallback = await supabase
      .from("transactions")
      .select(
        "id, order_id, amount, currency_code, status, gateway_transaction_id, created_at, payment_methods(display_name), orders(order_number)",
      )
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    data = (fallback.data || []).map((item) => ({
      ...item,
      captured_amount:
        item.status === "captured"
          ? Number(item.amount || 0)
          : item.status === "partially_captured"
            ? Number(item.amount || 0) / 2
            : 0,
      provider_status: null,
      failure_code: null,
    }));
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  const rows = data || [];
  const eventMap = await loadTransactionEventsByTransactionIds(
    rows.map((item) => item.id),
  );

  return rows.map((item) => {
    const attempts = eventMap.get(item.id) || [];
    const lastAttempt = attempts[attempts.length - 1] || null;
    return {
      id: item.id,
      orderId: item.order_id,
      orderNumber: item.orders?.order_number || "-",
      paymentMethodName: item.payment_methods?.display_name || "-",
      amount: Number(item.amount || 0),
      capturedAmount: Number(item.captured_amount || 0),
      currencyCode: item.currency_code,
      status: normalizeTransactionStatus(item.status),
      providerStatus: item.provider_status || "",
      gatewayTransactionId: item.gateway_transaction_id || "",
      failureCode: item.failure_code || "",
      attempts,
      attemptCount: attempts.length,
      lastAttemptAt: lastAttempt?.createdAt || null,
      availableActions: buildTransactionActions(item.status),
      createdAt: item.created_at,
    };
  });
}

export async function updateTransactionStatus(
  transactionId,
  status,
  payload = {},
) {
  const { authUser, store } = await getStoreContext();
  const targetStatus = normalizeTransactionStatus(status);

  let { data: transaction, error } = await supabase
    .from("transactions")
    .select(
      "id, order_id, amount, captured_amount, status, payment_method_id, gateway_transaction_id, payment_methods(provider)",
    )
    .eq("id", transactionId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (error && isMissingColumnError(error, "captured_amount")) {
    const fallback = await supabase
      .from("transactions")
      .select(
        "id, order_id, amount, status, payment_method_id, gateway_transaction_id, payment_methods(provider)",
      )
      .eq("id", transactionId)
      .eq("store_id", store.id)
      .maybeSingle();
    transaction = fallback.data
      ? {
          ...fallback.data,
          captured_amount:
            fallback.data.status === "captured"
              ? Number(fallback.data.amount || 0)
              : 0,
        }
      : fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  if (!canTransitionTransaction(transaction.status, targetStatus)) {
    throw new Error(
      `Invalid transaction transition: ${transaction.status} -> ${targetStatus}`,
    );
  }

  const provider = transaction.payment_methods?.provider || "manual";
  const providerStatus = String(payload.providerStatus || targetStatus)
    .trim()
    .toLowerCase();
  const mappedStatus = mapProviderStatus(provider, providerStatus);
  const amount = Number(transaction.amount || 0);
  const capturedBefore = Number(transaction.captured_amount || 0);
  const remaining = Number((amount - capturedBefore).toFixed(2));

  let nextCapturedAmount = capturedBefore;
  if (mappedStatus === "partially_captured") {
    const captureAmount = Number(payload.captureAmount || 0);
    if (!captureAmount || captureAmount <= 0 || captureAmount >= remaining) {
      throw new Error(
        `Partial capture amount must be greater than 0 and less than ${remaining.toFixed(2)}`,
      );
    }
    nextCapturedAmount = Number((capturedBefore + captureAmount).toFixed(2));
  } else if (mappedStatus === "captured") {
    const captureAmount = Number(payload.captureAmount || 0);
    if (captureAmount > 0) {
      if (captureAmount > remaining) {
        throw new Error(
          `Capture amount exceeds remaining amount ${remaining.toFixed(2)}`,
        );
      }
      nextCapturedAmount = Number((capturedBefore + captureAmount).toFixed(2));
    } else {
      nextCapturedAmount = amount;
    }
  } else if (mappedStatus === "refunded") {
    nextCapturedAmount = 0;
  }

  let referenceId = String(payload.referenceId || "").trim();
  if (!referenceId && mappedStatus !== transaction.status) {
    referenceId = `${provider}-${Date.now().toString(36)}`;
  }

  const updatePayload = {
    status: mappedStatus,
    provider_status: providerStatus || null,
    captured_amount: nextCapturedAmount,
    gateway_transaction_id: referenceId || transaction.gateway_transaction_id,
    failure_code:
      mappedStatus === "failed"
        ? String(payload.failureCode || "PAYMENT_FAILED")
        : null,
    last_error:
      mappedStatus === "failed"
        ? String(payload.failureMessage || "Payment failed")
        : null,
    updated_at: new Date().toISOString(),
  };

  let updateResponse = await supabase
    .from("transactions")
    .update(updatePayload)
    .eq("id", transactionId)
    .eq("store_id", store.id)
    .select("id, order_id, status, captured_amount, gateway_transaction_id")
    .maybeSingle();

  if (
    updateResponse.error &&
    isMissingColumnError(updateResponse.error, "provider_status")
  ) {
    updateResponse = await supabase
      .from("transactions")
      .update({
        status: mappedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)
      .eq("store_id", store.id)
      .select("id, order_id, status, gateway_transaction_id")
      .maybeSingle();
  }

  if (updateResponse.error) {
    throw normalizeError(updateResponse.error);
  }

  const updatedTransaction = updateResponse.data;

  const nextPaymentStatus =
    mappedStatus === "captured"
      ? "paid"
      : mappedStatus === "partially_captured"
        ? "partially_paid"
        : mappedStatus === "authorized"
          ? "authorized"
          : mappedStatus === "refunded"
            ? "refunded"
            : mappedStatus === "failed"
              ? "failed"
              : "pending";

  let orderUpdate = await supabase
    .from("orders")
    .update({
      payment_status: nextPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transaction.order_id)
    .eq("store_id", store.id);

  if (orderUpdate.error) {
    const fallbackPaymentStatus =
      mappedStatus === "captured"
        ? "paid"
        : mappedStatus === "authorized" || mappedStatus === "partially_captured"
          ? "authorized"
          : mappedStatus === "refunded"
            ? "refunded"
            : mappedStatus === "failed"
              ? "failed"
              : "pending";

    orderUpdate = await supabase
      .from("orders")
      .update({
        payment_status: fallbackPaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.order_id)
      .eq("store_id", store.id);

    if (orderUpdate.error) {
      throw normalizeError(orderUpdate.error);
    }
  }

  await createTransactionEvent({
    transactionId: transaction.id,
    orderId: transaction.order_id,
    eventType:
      mappedStatus === "partially_captured"
        ? "partial_capture"
        : mappedStatus === "captured"
          ? "capture"
          : mappedStatus === "authorized"
            ? "authorization"
            : mappedStatus === "voided"
              ? "void"
              : mappedStatus === "failed"
                ? "failure"
                : mappedStatus === "refunded"
                  ? "refund"
                  : "status_update",
    status: mappedStatus,
    providerStatus,
    amount:
      mappedStatus === "captured" || mappedStatus === "partially_captured"
        ? Number(payload.captureAmount || amount)
        : mappedStatus === "refunded"
          ? Number(payload.refundAmount || amount)
          : null,
    referenceId: referenceId || updatedTransaction?.gateway_transaction_id,
    note: payload.note || `Payment updated to ${mappedStatus}`,
    metadata: {
      actorId: authUser.id,
      previousStatus: transaction.status,
      capturedBefore,
      capturedAfter: nextCapturedAmount,
    },
  });

  const { error: timelineError } = await supabase
    .from("order_timeline")
    .insert({
      order_id: transaction.order_id,
      status:
        mappedStatus === "captured" || mappedStatus === "partially_captured"
          ? "need_ship"
          : "not_paid",
      actor_type: "user",
      actor_id: authUser.id,
      note: payload.note || `Payment updated to ${mappedStatus}`,
    });

  if (timelineError) {
    throw normalizeError(timelineError);
  }

  return {
    ok: true,
    status: mappedStatus,
    capturedAmount: nextCapturedAmount,
    referenceId:
      referenceId || updatedTransaction?.gateway_transaction_id || "",
  };
}