// @ts-nocheck
/**
 * subscriptionService — Subscription plans, active subscriptions, and recurring billing engine
 *
 * Domain: Subscriptions / Recurring Commerce
 * Feature: advanced
 * Depends on: supabaseClient, utils/errorUtils, storeService, customerService, currencyService
 */

import { supabase } from "./supabaseClient.js";
import {
  normalizeError,
  isMissingTableError,
  isMissingColumnError,
} from "./utils/errorUtils.js";
import { tableExists } from "./utils/dbUtils.js";
import {
  getStoreContext,
  createOrderNumber,
  createInvoiceNumber,
} from "./storeService.js";
import { normalizeCurrencyCode } from "./currencyService.js";

const SUBSCRIPTION_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
  "paused",
  "cancelled",
  "expired",
]);

const SUBSCRIPTION_DUNNING_STATUSES = new Set([
  "clear",
  "at_risk",
  "in_retry",
  "exhausted",
]);

const BILLING_CYCLES = new Set(["daily", "weekly", "monthly", "yearly"]);
const BILLING_ANCHORS = new Set(["signup", "calendar_day", "week_start"]);

function normalizeSubscriptionStatus(value, fallback = "active") {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase();
  return SUBSCRIPTION_STATUSES.has(normalized) ? normalized : fallback;
}

function normalizeDunningStatus(value, fallback = "clear") {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase();
  return SUBSCRIPTION_DUNNING_STATUSES.has(normalized) ? normalized : fallback;
}

function normalizeBillingCycle(value) {
  const normalized = String(value || "monthly")
    .trim()
    .toLowerCase();
  if (!BILLING_CYCLES.has(normalized)) {
    throw new Error("Invalid billing cycle");
  }
  return normalized;
}

function normalizeBillingAnchor(value) {
  const normalized = String(value || "signup")
    .trim()
    .toLowerCase();
  if (!BILLING_ANCHORS.has(normalized)) {
    throw new Error("Invalid billing anchor");
  }
  return normalized;
}

function computeCycleEndDate(
  startDate,
  cycle,
  interval,
  billingAnchorDay = null,
) {
  const base = new Date(startDate);
  const safeInterval = Math.max(1, Number(interval || 1));

  if (cycle === "daily") {
    base.setUTCDate(base.getUTCDate() + safeInterval);
    return base;
  }

  if (cycle === "weekly") {
    base.setUTCDate(base.getUTCDate() + safeInterval * 7);
    return base;
  }

  if (cycle === "monthly") {
    const originalDay =
      Number(billingAnchorDay || 0) > 0
        ? Number(billingAnchorDay)
        : base.getUTCDate();
    base.setUTCMonth(base.getUTCMonth() + safeInterval);
    const maxDay = new Date(
      Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0),
    ).getUTCDate();
    base.setUTCDate(Math.min(originalDay, maxDay));
    return base;
  }

  base.setUTCFullYear(base.getUTCFullYear() + safeInterval);
  return base;
}

async function appendSubscriptionAudit(payload = {}) {
  if (!(await tableExists("subscription_audit_logs"))) {
    return;
  }

  const { error } = await supabase.from("subscription_audit_logs").insert({
    store_id: payload.storeId,
    subscription_id: payload.subscriptionId,
    action: payload.action,
    from_status: payload.fromStatus || null,
    to_status: payload.toStatus || null,
    actor_id: payload.actorId || null,
    note: payload.note || null,
    metadata_json: payload.metadata || {},
  });

  if (error) {
    if (isMissingTableError(error, "subscription_audit_logs")) {
      return;
    }
    throw normalizeError(error);
  }
}

function mapSubscriptionPlanRow(row = {}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    billingCycle: row.billing_cycle,
    billingInterval: Number(row.billing_interval || 1),
    billingAnchor: row.billing_anchor || "signup",
    billingAnchorDay: row.billing_anchor_day || null,
    priceAmount: Number(row.price_amount || 0),
    currencyCode: row.currency_code || "USD",
    trialDays: Number(row.trial_days || 0),
    maxRetryAttempts: Number(row.max_retry_attempts || 3),
    retryIntervalHours: Number(row.retry_interval_hours || 24),
    isActive: Boolean(row.is_active),
    metadata: row.metadata_json || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSubscriptionPlans() {
  const { store } = await getStoreContext();
  if (!(await tableExists("subscription_plans"))) {
    return [];
  }

  const { data, error } = await supabase
    .from("subscription_plans")
    .select(
      "id, name, description, billing_cycle, billing_interval, billing_anchor, billing_anchor_day, price_amount, currency_code, trial_days, max_retry_attempts, retry_interval_hours, is_active, metadata_json, created_at, updated_at",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error, "subscription_plans")) {
      return [];
    }
    throw normalizeError(error);
  }

  return (data || []).map((row) => mapSubscriptionPlanRow(row));
}

export async function createSubscriptionPlan(payload = {}) {
  const { store } = await getStoreContext();
  if (!(await tableExists("subscription_plans"))) {
    throw new Error(
      "Subscription schema missing. Run Feature 20 migration before creating plans.",
    );
  }

  const plan = {
    store_id: store.id,
    name: String(payload.name || "").trim(),
    description: payload.description || null,
    billing_cycle: normalizeBillingCycle(payload.billingCycle),
    billing_interval: Math.max(1, Number(payload.billingInterval || 1)),
    billing_anchor: normalizeBillingAnchor(payload.billingAnchor || "signup"),
    billing_anchor_day: payload.billingAnchorDay || null,
    price_amount: Number(payload.priceAmount || 0),
    currency_code: normalizeCurrencyCode(payload.currencyCode || "USD", "USD"),
    trial_days: Math.max(0, Number(payload.trialDays || 0)),
    max_retry_attempts: Math.max(0, Number(payload.maxRetryAttempts || 3)),
    retry_interval_hours: Math.max(1, Number(payload.retryIntervalHours || 24)),
    is_active: payload.isActive !== false,
    metadata_json: payload.metadata || {},
  };

  if (!plan.name) {
    throw new Error("Plan name is required");
  }
  if (plan.price_amount <= 0) {
    throw new Error("Plan price must be greater than 0");
  }

  const { data, error } = await supabase
    .from("subscription_plans")
    .insert(plan)
    .select(
      "id, name, description, billing_cycle, billing_interval, billing_anchor, billing_anchor_day, price_amount, currency_code, trial_days, max_retry_attempts, retry_interval_hours, is_active, metadata_json, created_at, updated_at",
    )
    .single();

  if (error) {
    throw normalizeError(error);
  }

  return mapSubscriptionPlanRow(data);
}

export async function updateSubscriptionPlan(planId, payload = {}) {
  if (!planId) {
    throw new Error("Plan id is required");
  }

  const { store } = await getStoreContext();
  const updates = {
    name: payload.name ? String(payload.name).trim() : undefined,
    description: payload.description,
    billing_cycle: payload.billingCycle
      ? normalizeBillingCycle(payload.billingCycle)
      : undefined,
    billing_interval:
      payload.billingInterval !== undefined
        ? Math.max(1, Number(payload.billingInterval || 1))
        : undefined,
    billing_anchor: payload.billingAnchor
      ? normalizeBillingAnchor(payload.billingAnchor)
      : undefined,
    billing_anchor_day: payload.billingAnchorDay,
    price_amount:
      payload.priceAmount !== undefined
        ? Number(payload.priceAmount || 0)
        : undefined,
    currency_code: payload.currencyCode
      ? normalizeCurrencyCode(payload.currencyCode, "USD")
      : undefined,
    trial_days:
      payload.trialDays !== undefined
        ? Math.max(0, Number(payload.trialDays || 0))
        : undefined,
    max_retry_attempts:
      payload.maxRetryAttempts !== undefined
        ? Math.max(0, Number(payload.maxRetryAttempts || 3))
        : undefined,
    retry_interval_hours:
      payload.retryIntervalHours !== undefined
        ? Math.max(1, Number(payload.retryIntervalHours || 24))
        : undefined,
    is_active: payload.isActive,
    metadata_json: payload.metadata,
    updated_at: new Date().toISOString(),
  };

  const patch = Object.fromEntries(
    Object.entries(updates).filter(([_key, value]) => value !== undefined),
  );

  if (patch.price_amount !== undefined && patch.price_amount <= 0) {
    throw new Error("Plan price must be greater than 0");
  }

  const { error } = await supabase
    .from("subscription_plans")
    .update(patch)
    .eq("id", planId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function deleteSubscriptionPlan(planId) {
  if (!planId) {
    throw new Error("Plan id is required");
  }

  const { store } = await getStoreContext();
  const { count, error: countError } = await supabase
    .from("customer_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store.id)
    .eq("plan_id", planId)
    .in("status", ["trialing", "active", "past_due", "paused"]);

  if (
    countError &&
    !isMissingTableError(countError, "customer_subscriptions")
  ) {
    throw normalizeError(countError);
  }

  if (Number(count || 0) > 0) {
    throw new Error("Plan has active subscriptions and cannot be deleted");
  }

  const { error } = await supabase
    .from("subscription_plans")
    .delete()
    .eq("id", planId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

function mapSubscriptionRow(row = {}) {
  const customer = Array.isArray(row.customers)
    ? row.customers[0]
    : row.customers;
  const plan = Array.isArray(row.subscription_plans)
    ? row.subscription_plans[0]
    : row.subscription_plans;

  return {
    id: row.id,
    customerId: row.customer_id,
    customerName:
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      customer?.email ||
      "Guest Customer",
    customerEmail: customer?.email || "",
    planId: row.plan_id,
    planName: plan?.name || "Plan",
    billingCycle: plan?.billing_cycle || "monthly",
    billingInterval: Number(plan?.billing_interval || 1),
    billingAnchor: plan?.billing_anchor || "signup",
    priceAmount: Number(plan?.price_amount || 0),
    currencyCode: plan?.currency_code || "USD",
    status: normalizeSubscriptionStatus(row.status),
    dunningStatus: normalizeDunningStatus(row.dunning_status),
    nextBillingAt: row.next_billing_at,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    retryCount: Number(row.retry_count || 0),
    lastPaymentStatus: row.last_payment_status || "pending",
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    cancelledAt: row.cancelled_at,
    pausedAt: row.paused_at,
    resumedAt: row.resumed_at,
    metadata: row.metadata_json || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSubscriptions(filters = {}) {
  const { store } = await getStoreContext();
  if (!(await tableExists("customer_subscriptions"))) {
    return [];
  }

  let query = supabase
    .from("customer_subscriptions")
    .select(
      "id, customer_id, plan_id, status, dunning_status, next_billing_at, current_period_start, current_period_end, retry_count, last_payment_status, cancel_at_period_end, cancelled_at, paused_at, resumed_at, metadata_json, created_at, updated_at, customers(first_name, last_name, email), subscription_plans(name, billing_cycle, billing_interval, billing_anchor, price_amount, currency_code)",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", normalizeSubscriptionStatus(filters.status));
  }

  if (filters.customerId) {
    query = query.eq("customer_id", filters.customerId);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error, "customer_subscriptions")) {
      return [];
    }
    throw normalizeError(error);
  }

  return (data || []).map((row) => mapSubscriptionRow(row));
}

export async function createSubscription(payload = {}) {
  const { authUser, store } = await getStoreContext();
  if (!(await tableExists("customer_subscriptions"))) {
    throw new Error(
      "Subscription schema missing. Run Feature 20 migration before creating subscriptions.",
    );
  }

  const startsAt = payload.startsAt ? new Date(payload.startsAt) : new Date();
  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Invalid start date");
  }

  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select(
      "id, billing_cycle, billing_interval, billing_anchor_day, trial_days, is_active",
    )
    .eq("store_id", store.id)
    .eq("id", payload.planId)
    .maybeSingle();

  if (planError) {
    throw normalizeError(planError);
  }

  if (!plan?.id) {
    throw new Error("Subscription plan not found");
  }

  if (!plan.is_active) {
    throw new Error("Selected plan is inactive");
  }

  const initialStatus = normalizeSubscriptionStatus(payload.status || "active");
  const trialDays = Math.max(0, Number(plan.trial_days || 0));
  const initialBillingDate = new Date(startsAt);
  if (initialStatus === "trialing" && trialDays > 0) {
    initialBillingDate.setUTCDate(initialBillingDate.getUTCDate() + trialDays);
  }

  const currentPeriodEnd = computeCycleEndDate(
    initialBillingDate,
    normalizeBillingCycle(plan.billing_cycle),
    Number(plan.billing_interval || 1),
    plan.billing_anchor_day,
  );

  const { data, error } = await supabase
    .from("customer_subscriptions")
    .insert({
      store_id: store.id,
      customer_id: payload.customerId,
      plan_id: payload.planId,
      status: initialStatus,
      dunning_status: "clear",
      started_at: startsAt.toISOString(),
      current_period_start: initialBillingDate.toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
      next_billing_at: initialBillingDate.toISOString(),
      cancel_at_period_end: false,
      last_payment_status: "pending",
      metadata_json: payload.metadata || {},
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeError(error);
  }

  await appendSubscriptionAudit({
    storeId: store.id,
    subscriptionId: data.id,
    action: "create",
    fromStatus: null,
    toStatus: initialStatus,
    actorId: authUser.id,
    note: "Subscription created",
  });

  return { id: data.id };
}

export async function updateSubscriptionStatus(subscriptionId, payload = {}) {
  if (!subscriptionId) {
    throw new Error("Subscription id is required");
  }

  const { authUser, store } = await getStoreContext();
  const { data: subscription, error: fetchError } = await supabase
    .from("customer_subscriptions")
    .select("id, status, cancel_at_period_end")
    .eq("store_id", store.id)
    .eq("id", subscriptionId)
    .maybeSingle();

  if (fetchError) {
    throw normalizeError(fetchError);
  }

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  const action = String(payload.action || "")
    .trim()
    .toLowerCase();
  const nowIso = new Date().toISOString();
  const patch = { updated_at: nowIso };
  let toStatus = subscription.status;

  if (action === "pause") {
    toStatus = "paused";
    patch.status = "paused";
    patch.paused_at = nowIso;
  } else if (action === "resume") {
    toStatus = "active";
    patch.status = "active";
    patch.resumed_at = nowIso;
    patch.dunning_status = "clear";
  } else if (action === "cancel") {
    toStatus = "cancelled";
    patch.status = "cancelled";
    patch.cancelled_at = nowIso;
    patch.cancel_at_period_end = false;
  } else if (action === "cancel_at_period_end") {
    patch.cancel_at_period_end = true;
  } else {
    throw new Error("Unsupported subscription action");
  }

  const { error } = await supabase
    .from("customer_subscriptions")
    .update(patch)
    .eq("id", subscriptionId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  await appendSubscriptionAudit({
    storeId: store.id,
    subscriptionId,
    action,
    fromStatus: subscription.status,
    toStatus,
    actorId: authUser.id,
    note: payload.note || null,
    metadata: payload.metadata || {},
  });

  return { ok: true };
}

async function createRecurringOrderForSubscription({
  store,
  subscription,
  plan,
  billingAttemptId,
}) {
  const amount = Number(plan.price_amount || 0);
  const nowIso = new Date().toISOString();

  const shippingAddress = {
    fullName:
      [subscription.customers?.first_name, subscription.customers?.last_name]
        .filter(Boolean)
        .join(" ") || "Subscription Customer",
    email: subscription.customers?.email || null,
  };

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      store_id: store.id,
      customer_id: subscription.customer_id,
      order_number: createOrderNumber(),
      status: "receive",
      payment_status: "paid",
      subtotal_amount: amount,
      discount_amount: 0,
      tax_amount: 0,
      shipping_amount: 0,
      total_amount: amount,
      currency_code: plan.currency_code || "USD",
      note: `Subscription renewal for ${plan.name}`,
      shipping_address: shippingAddress,
      billing_address: shippingAddress,
      updated_at: nowIso,
    })
    .select("id, order_number")
    .single();

  if (orderError) {
    throw normalizeError(orderError);
  }

  const { error: itemError } = await supabase.from("order_items").insert({
    order_id: order.id,
    product_variant_id: null,
    product_title: `Subscription: ${plan.name}`,
    variant_title: "Recurring charge",
    sku: `SUB-${subscription.id.slice(0, 8).toUpperCase()}`,
    quantity: 1,
    unit_price: amount,
    line_total: amount,
  });

  if (itemError) {
    throw normalizeError(itemError);
  }

  let transactionId = null;
  if (await tableExists("transactions")) {
    const transactionResponse = await supabase
      .from("transactions")
      .insert({
        store_id: store.id,
        order_id: order.id,
        amount,
        currency_code: plan.currency_code || "USD",
        status: "captured",
        provider_status: "captured",
        captured_amount: amount,
        gateway_transaction_id: `sub-${Date.now().toString(36)}`,
        gateway_response: {
          source: "subscription_engine",
          subscriptionId: subscription.id,
        },
      })
      .select("id")
      .single();

    if (transactionResponse.error) {
      if (!isMissingColumnError(transactionResponse.error, "captured_amount")) {
        throw normalizeError(transactionResponse.error);
      }

      const fallbackTransaction = await supabase
        .from("transactions")
        .insert({
          store_id: store.id,
          order_id: order.id,
          amount,
          currency_code: plan.currency_code || "USD",
          status: "captured",
          gateway_transaction_id: `sub-${Date.now().toString(36)}`,
        })
        .select("id")
        .single();

      if (fallbackTransaction.error) {
        throw normalizeError(fallbackTransaction.error);
      }

      transactionId = fallbackTransaction.data.id;
    } else {
      transactionId = transactionResponse.data.id;
    }
  }

  let invoiceError = null;
  if (await tableExists("invoices")) {
    const invoiceResponse = await supabase.from("invoices").insert({
      store_id: store.id,
      order_id: order.id,
      invoice_number: createInvoiceNumber(),
      subtotal: amount,
      taxable_amount: amount,
      tax_rate: 0,
      tax_behavior: "exclusive",
      tax_amount: 0,
      discount_amount: 0,
      total: amount,
      status: "issued",
      metadata_json: {
        source: "subscription_renewal",
        subscriptionId: subscription.id,
      },
    });

    invoiceError = invoiceResponse.error;
    if (invoiceError && isMissingColumnError(invoiceError, "taxable_amount")) {
      const fallbackInvoice = await supabase.from("invoices").insert({
        store_id: store.id,
        order_id: order.id,
        invoice_number: createInvoiceNumber(),
        subtotal: amount,
        tax_amount: 0,
        discount_amount: 0,
        total: amount,
      });
      invoiceError = fallbackInvoice.error;
    }
  }

  if (invoiceError) {
    throw normalizeError(invoiceError);
  }

  if (await tableExists("order_subscription_context")) {
    const { error: contextError } = await supabase
      .from("order_subscription_context")
      .insert({
        store_id: store.id,
        order_id: order.id,
        subscription_id: subscription.id,
        billing_attempt_id: billingAttemptId,
        is_renewal: true,
        context_json: {
          planId: plan.id,
          planName: plan.name,
        },
      });

    if (
      contextError &&
      !isMissingTableError(contextError, "order_subscription_context")
    ) {
      throw normalizeError(contextError);
    }
  }

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    transactionId,
  };
}

export async function processRecurringSubscriptionBilling(options = {}) {
  const { authUser, store } = await getStoreContext();
  if (!(await tableExists("customer_subscriptions"))) {
    throw new Error(
      "Subscription schema missing. Run Feature 20 migration before recurring billing.",
    );
  }

  const limit = Math.max(1, Math.min(100, Number(options.limit || 20)));
  const nowIso = new Date().toISOString();

  const { data: dueSubscriptions, error: dueError } = await supabase
    .from("customer_subscriptions")
    .select(
      "id, customer_id, plan_id, status, dunning_status, next_billing_at, retry_count, cancel_at_period_end, customers(first_name, last_name, email), subscription_plans(id, name, billing_cycle, billing_interval, billing_anchor_day, price_amount, currency_code, max_retry_attempts, retry_interval_hours)",
    )
    .eq("store_id", store.id)
    .in("status", ["trialing", "active", "past_due"])
    .lte("next_billing_at", nowIso)
    .order("next_billing_at", { ascending: true })
    .limit(limit);

  if (dueError) {
    throw normalizeError(dueError);
  }

  const summary = {
    processed: 0,
    paid: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  for (const row of dueSubscriptions || []) {
    summary.processed += 1;

    const plan = Array.isArray(row.subscription_plans)
      ? row.subscription_plans[0]
      : row.subscription_plans;

    if (!plan?.id) {
      summary.skipped += 1;
      summary.details.push({
        subscriptionId: row.id,
        result: "skipped",
        reason: "missing_plan",
      });
      continue;
    }

    const attemptNumber = Number(row.retry_count || 0) + 1;
    const billingAttemptPayload = {
      store_id: store.id,
      subscription_id: row.id,
      attempt_number: attemptNumber,
      status: "processing",
      amount: Number(plan.price_amount || 0),
      currency_code: plan.currency_code || "USD",
      scheduled_at: nowIso,
      processed_at: nowIso,
      metadata_json: { source: "recurring_engine" },
      updated_at: nowIso,
    };

    let billingAttemptId = null;
    if (await tableExists("subscription_billing_attempts")) {
      const billingAttemptResponse = await supabase
        .from("subscription_billing_attempts")
        .insert(billingAttemptPayload)
        .select("id")
        .single();

      if (billingAttemptResponse.error) {
        if (
          !isMissingTableError(
            billingAttemptResponse.error,
            "subscription_billing_attempts",
          )
        ) {
          throw normalizeError(billingAttemptResponse.error);
        }
      } else {
        billingAttemptId = billingAttemptResponse.data.id;
      }
    }

    try {
      const paymentResult = await createRecurringOrderForSubscription({
        store,
        subscription: row,
        plan,
        billingAttemptId,
      });

      const currentPeriodStart = new Date(row.next_billing_at || nowIso);
      const currentPeriodEnd = computeCycleEndDate(
        currentPeriodStart,
        normalizeBillingCycle(plan.billing_cycle),
        Number(plan.billing_interval || 1),
        plan.billing_anchor_day,
      );
      const nextBillingAt = computeCycleEndDate(
        currentPeriodStart,
        normalizeBillingCycle(plan.billing_cycle),
        Number(plan.billing_interval || 1),
        plan.billing_anchor_day,
      );

      const shouldCancelNow = Boolean(row.cancel_at_period_end);
      const subscriptionPatch = {
        status: shouldCancelNow ? "cancelled" : "active",
        dunning_status: "clear",
        retry_count: 0,
        last_retry_at: nowIso,
        last_payment_status: "paid",
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        next_billing_at: nextBillingAt.toISOString(),
        updated_at: nowIso,
      };

      if (shouldCancelNow) {
        subscriptionPatch.cancelled_at = nowIso;
      }

      const { error: updateSubscriptionError } = await supabase
        .from("customer_subscriptions")
        .update(subscriptionPatch)
        .eq("store_id", store.id)
        .eq("id", row.id);

      if (updateSubscriptionError) {
        throw normalizeError(updateSubscriptionError);
      }

      if (billingAttemptId) {
        const { error: updateAttemptError } = await supabase
          .from("subscription_billing_attempts")
          .update({
            status: "paid",
            order_id: paymentResult.orderId,
            transaction_id: paymentResult.transactionId,
            processed_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", billingAttemptId)
          .eq("store_id", store.id);

        if (
          updateAttemptError &&
          !isMissingTableError(
            updateAttemptError,
            "subscription_billing_attempts",
          )
        ) {
          throw normalizeError(updateAttemptError);
        }
      }

      await appendSubscriptionAudit({
        storeId: store.id,
        subscriptionId: row.id,
        action: "billing_success",
        fromStatus: row.status,
        toStatus: shouldCancelNow ? "cancelled" : "active",
        actorId: authUser.id,
        note: `Recurring billing paid (${paymentResult.orderNumber})`,
        metadata: {
          orderId: paymentResult.orderId,
          billingAttemptId,
        },
      });

      summary.paid += 1;
      summary.details.push({
        subscriptionId: row.id,
        result: "paid",
        orderId: paymentResult.orderId,
      });
    } catch (err) {
      const maxRetries = Math.max(0, Number(plan.max_retry_attempts || 3));
      const retryIntervalHours = Math.max(
        1,
        Number(plan.retry_interval_hours || 24),
      );
      const exhausted = attemptNumber >= maxRetries;
      const nextRetry = new Date(
        Date.now() + retryIntervalHours * 60 * 60 * 1000,
      );

      const { error: updateSubscriptionError } = await supabase
        .from("customer_subscriptions")
        .update({
          status: exhausted ? "past_due" : "past_due",
          dunning_status: exhausted ? "exhausted" : "in_retry",
          retry_count: attemptNumber,
          last_retry_at: nowIso,
          last_payment_status: "failed",
          next_billing_at: exhausted
            ? row.next_billing_at
            : nextRetry.toISOString(),
          updated_at: nowIso,
        })
        .eq("store_id", store.id)
        .eq("id", row.id);

      if (updateSubscriptionError) {
        throw normalizeError(updateSubscriptionError);
      }

      if (billingAttemptId) {
        const { error: updateAttemptError } = await supabase
          .from("subscription_billing_attempts")
          .update({
            status: exhausted ? "abandoned" : "retry_scheduled",
            error_message: err.message || "Recurring billing failed",
            next_retry_at: exhausted ? null : nextRetry.toISOString(),
            processed_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", billingAttemptId)
          .eq("store_id", store.id);

        if (
          updateAttemptError &&
          !isMissingTableError(
            updateAttemptError,
            "subscription_billing_attempts",
          )
        ) {
          throw normalizeError(updateAttemptError);
        }
      }

      await appendSubscriptionAudit({
        storeId: store.id,
        subscriptionId: row.id,
        action: "billing_failed",
        fromStatus: row.status,
        toStatus: "past_due",
        actorId: authUser.id,
        note: err.message || "Recurring billing failed",
        metadata: {
          billingAttemptId,
          retryCount: attemptNumber,
          exhausted,
        },
      });

      summary.failed += 1;
      summary.details.push({
        subscriptionId: row.id,
        result: "failed",
        reason: err.message || "Recurring billing failed",
      });
    }
  }

  return summary;
}
