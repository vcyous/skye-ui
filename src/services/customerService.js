// @ts-nocheck
/**
 * customerService — Customer CRUD, segments, timeline, and engagement notes
 *
 * Domain: Customers / CRM
 * Feature: ongoing
 * Depends on: supabaseClient, utils/errorUtils, storeService
 */

import { supabase } from "./supabaseClient.js";
import {
  normalizeError,
  isMissingColumnError,
  isMissingTableError,
} from "./utils/errorUtils.js";
import { tableExists } from "./utils/dbUtils.js";
import { getStoreContext } from "./storeService.js";

function normalizeCustomerTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeCustomerSegmentFilter(input) {
  if (!input || typeof input !== "object") {
    return { match: "all", conditions: [] };
  }

  const match = input.match === "any" ? "any" : "all";
  const conditions = Array.isArray(input.conditions)
    ? input.conditions
        .map((condition) => ({
          field: String(condition?.field || "").trim(),
          operator: String(condition?.operator || "").trim(),
          value: condition?.value,
        }))
        .filter((condition) => condition.field && condition.operator)
    : [];

  return { match, conditions };
}

function resolveCustomerSegmentFieldValue(customer, field) {
  const key = String(field || "")
    .trim()
    .toLowerCase();

  if (key === "total_spent" || key === "totalspent") {
    return Number(customer.totalSpent || 0);
  }
  if (key === "order_count" || key === "ordercount") {
    return Number(customer.orderCount || 0);
  }
  if (key === "accepts_email" || key === "acceptsemail") {
    return Boolean(customer.acceptsEmail);
  }
  if (key === "is_b2b" || key === "isb2b") {
    return Boolean(customer.isB2b);
  }
  if (key === "country") {
    return String(customer.country || "");
  }
  if (key === "company_name" || key === "companyname") {
    return String(customer.companyName || "");
  }
  if (key === "tags") {
    return normalizeCustomerTags(customer.tags);
  }
  if (key === "last_order_days" || key === "lastorderdays") {
    if (!customer.lastOrderAt) {
      return Number.POSITIVE_INFINITY;
    }
    const elapsedMs = Date.now() - new Date(customer.lastOrderAt).getTime();
    return Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  }

  return customer[key];
}

function evaluateCustomerSegmentCondition(customer, condition) {
  const left = resolveCustomerSegmentFieldValue(customer, condition.field);
  const operator = String(condition.operator || "").toLowerCase();
  const right = condition.value;

  if (operator === "in") {
    const list = normalizeArrayValue(right).map((item) =>
      String(item).toLowerCase(),
    );
    return list.includes(String(left || "").toLowerCase());
  }

  if (operator === "not_in") {
    const list = normalizeArrayValue(right).map((item) =>
      String(item).toLowerCase(),
    );
    return !list.includes(String(left || "").toLowerCase());
  }

  if (operator === "contains") {
    if (Array.isArray(left)) {
      const leftSet = left.map((item) => String(item).toLowerCase());
      return normalizeArrayValue(right)
        .map((item) => String(item).toLowerCase())
        .every((item) => leftSet.includes(item));
    }
    return String(left || "")
      .toLowerCase()
      .includes(String(right || "").toLowerCase());
  }

  if (operator === "not_contains") {
    if (Array.isArray(left)) {
      const leftSet = left.map((item) => String(item).toLowerCase());
      return normalizeArrayValue(right)
        .map((item) => String(item).toLowerCase())
        .every((item) => !leftSet.includes(item));
    }
    return !String(left || "")
      .toLowerCase()
      .includes(String(right || "").toLowerCase());
  }

  if (["gt", "gte", "lt", "lte"].includes(operator)) {
    const numericLeft = Number(left || 0);
    const numericRight = Number(right || 0);
    if (operator === "gt") return numericLeft > numericRight;
    if (operator === "gte") return numericLeft >= numericRight;
    if (operator === "lt") return numericLeft < numericRight;
    return numericLeft <= numericRight;
  }

  const normalizedLeft = String(left || "").toLowerCase();
  const normalizedRight = String(right || "").toLowerCase();
  if (operator === "eq") {
    return normalizedLeft === normalizedRight;
  }
  if (operator === "neq") {
    return normalizedLeft !== normalizedRight;
  }

  return false;
}

export function evaluateCustomerSegmentFilter(customer, filterInput) {
  const filter = normalizeCustomerSegmentFilter(filterInput);
  if (!filter.conditions.length) {
    return true;
  }

  if (filter.match === "any") {
    return filter.conditions.some((condition) =>
      evaluateCustomerSegmentCondition(customer, condition),
    );
  }

  return filter.conditions.every((condition) =>
    evaluateCustomerSegmentCondition(customer, condition),
  );
}

function mapCustomerRecord(row, aggregates = {}, subscriptionAggregates = {}) {
  const fullName = [row?.first_name, row?.last_name].filter(Boolean).join(" ");
  return {
    id: row.id,
    email: row.email || "",
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    name: fullName || row.email || "Unnamed customer",
    phone: row.phone || "",
    acceptsEmail: Boolean(row.accepts_email),
    tags: normalizeCustomerTags(row.tags),
    notes: row.notes || "",
    companyName: row.company_name || "",
    b2bAccountNo: row.b2b_account_no || "",
    isB2b: Boolean(row.is_b2b),
    lastContactedAt: row.last_contacted_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalSpent: Number(aggregates.totalSpent || 0),
    orderCount: Number(aggregates.orderCount || 0),
    lastOrderAt: aggregates.lastOrderAt || null,
    activeSubscriptions: Number(subscriptionAggregates.active || 0),
    pausedSubscriptions: Number(subscriptionAggregates.paused || 0),
    pastDueSubscriptions: Number(subscriptionAggregates.pastDue || 0),
    totalSubscriptions: Number(subscriptionAggregates.total || 0),
    country:
      row.default_address?.country || row.shipping_address?.country || "",
  };
}

async function getCustomerOrderAggregates(storeId, customerIds) {
  if (!Array.isArray(customerIds) || !customerIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("orders")
    .select("customer_id, total_amount, created_at")
    .eq("store_id", storeId)
    .in("customer_id", customerIds);

  if (error) {
    throw normalizeError(error);
  }

  const aggregates = new Map();
  for (const row of data || []) {
    if (!row.customer_id) {
      continue;
    }

    const current = aggregates.get(row.customer_id) || {
      totalSpent: 0,
      orderCount: 0,
      lastOrderAt: null,
    };

    current.totalSpent += Number(row.total_amount || 0);
    current.orderCount += 1;
    if (
      !current.lastOrderAt ||
      new Date(row.created_at).getTime() >
        new Date(current.lastOrderAt).getTime()
    ) {
      current.lastOrderAt = row.created_at;
    }

    aggregates.set(row.customer_id, current);
  }

  return aggregates;
}

async function getCustomerSubscriptionAggregates(storeId, customerIds) {
  if (!Array.isArray(customerIds) || !customerIds.length) {
    return new Map();
  }

  if (!(await tableExists("customer_subscriptions"))) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("customer_subscriptions")
    .select("customer_id, status")
    .eq("store_id", storeId)
    .in("customer_id", customerIds);

  if (error) {
    if (isMissingTableError(error, "customer_subscriptions")) {
      return new Map();
    }
    throw normalizeError(error);
  }

  const aggregates = new Map();
  for (const row of data || []) {
    if (!row.customer_id) {
      continue;
    }

    const current = aggregates.get(row.customer_id) || {
      active: 0,
      paused: 0,
      pastDue: 0,
      total: 0,
    };

    current.total += 1;
    if (row.status === "active" || row.status === "trialing") {
      current.active += 1;
    }
    if (row.status === "paused") {
      current.paused += 1;
    }
    if (row.status === "past_due") {
      current.pastDue += 1;
    }

    aggregates.set(row.customer_id, current);
  }

  return aggregates;
}

export async function getCustomers(filters = {}) {
  const { store } = await getStoreContext();

  let query = supabase
    .from("customers")
    .select(
      "id, email, first_name, last_name, phone, accepts_email, tags, notes, company_name, b2b_account_no, is_b2b, last_contacted_at, created_at, updated_at",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  let { data, error } = await query;

  if (error && isMissingColumnError(error, "tags")) {
    const fallback = await supabase
      .from("customers")
      .select(
        "id, email, first_name, last_name, phone, accepts_email, created_at, updated_at",
      )
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  const rows = data || [];
  const customerIds = rows.map((item) => item.id);
  const [aggregates, subscriptionAggregates] = await Promise.all([
    getCustomerOrderAggregates(store.id, customerIds),
    getCustomerSubscriptionAggregates(store.id, customerIds),
  ]);

  let customers = rows.map((item) =>
    mapCustomerRecord(
      item,
      aggregates.get(item.id),
      subscriptionAggregates.get(item.id),
    ),
  );

  if (filters.query) {
    const keyword = String(filters.query).toLowerCase().trim();
    customers = customers.filter((item) => {
      const searchable = [
        item.name,
        item.email,
        item.phone,
        item.companyName,
        ...(item.tags || []),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(keyword);
    });
  }

  if (filters.segmentId) {
    const { data: segment, error: segmentError } = await supabase
      .from("customer_segments")
      .select("id, filter_json")
      .eq("store_id", store.id)
      .eq("id", filters.segmentId)
      .maybeSingle();

    if (
      segmentError &&
      !isMissingTableError(segmentError, "customer_segments")
    ) {
      throw normalizeError(segmentError);
    }

    if (segment?.filter_json) {
      customers = customers.filter((item) =>
        evaluateCustomerSegmentFilter(item, segment.filter_json),
      );
    }
  }

  return customers;
}

export async function createCustomer(payload = {}) {
  const { store } = await getStoreContext();
  const input = {
    store_id: store.id,
    email: payload.email || null,
    first_name: payload.firstName || null,
    last_name: payload.lastName || null,
    phone: payload.phone || null,
    accepts_email: Boolean(payload.acceptsEmail),
    tags: normalizeCustomerTags(payload.tags),
    notes: payload.notes || null,
    company_name: payload.companyName || null,
    b2b_account_no: payload.b2bAccountNo || null,
    is_b2b: Boolean(payload.isB2b),
    last_contacted_at: payload.lastContactedAt || null,
  };

  let { data, error } = await supabase
    .from("customers")
    .insert(input)
    .select("id")
    .single();

  if (error && isMissingColumnError(error, "tags")) {
    const fallback = await supabase
      .from("customers")
      .insert({
        store_id: store.id,
        email: payload.email || null,
        first_name: payload.firstName || null,
        last_name: payload.lastName || null,
        phone: payload.phone || null,
        accepts_email: Boolean(payload.acceptsEmail),
      })
      .select("id")
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  return data;
}

export async function updateCustomer(customerId, payload = {}) {
  if (!customerId) {
    throw new Error("Customer id is required");
  }

  const { store } = await getStoreContext();
  const updatePayload = {
    email: payload.email || null,
    first_name: payload.firstName || null,
    last_name: payload.lastName || null,
    phone: payload.phone || null,
    accepts_email: Boolean(payload.acceptsEmail),
    tags: normalizeCustomerTags(payload.tags),
    notes: payload.notes || null,
    company_name: payload.companyName || null,
    b2b_account_no: payload.b2bAccountNo || null,
    is_b2b: Boolean(payload.isB2b),
    last_contacted_at: payload.lastContactedAt || null,
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabase
    .from("customers")
    .update(updatePayload)
    .eq("id", customerId)
    .eq("store_id", store.id);

  if (error && isMissingColumnError(error, "tags")) {
    const fallback = await supabase
      .from("customers")
      .update({
        email: payload.email || null,
        first_name: payload.firstName || null,
        last_name: payload.lastName || null,
        phone: payload.phone || null,
        accepts_email: Boolean(payload.acceptsEmail),
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId)
      .eq("store_id", store.id);
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function deleteCustomer(customerId) {
  if (!customerId) {
    throw new Error("Customer id is required");
  }

  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function getCustomerSegments() {
  const { store } = await getStoreContext();
  const { data, error } = await supabase
    .from("customer_segments")
    .select(
      "id, name, description, filter_json, is_active, last_preview_count, created_at, updated_at",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error, "customer_segments")) {
      return [];
    }
    throw normalizeError(error);
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || "",
    filter: normalizeCustomerSegmentFilter(row.filter_json),
    isActive: Boolean(row.is_active),
    matchedCount: Number(row.last_preview_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function previewCustomerSegment(input = {}) {
  const filter = normalizeCustomerSegmentFilter(input.filter || input);
  const customers = await getCustomers();
  const matched = customers.filter((item) =>
    evaluateCustomerSegmentFilter(item, filter),
  );

  return {
    totalCustomers: customers.length,
    matchedCount: matched.length,
    customerIds: matched.map((item) => item.id),
    sample: matched.slice(0, 10),
  };
}

export async function createCustomerSegment(payload = {}) {
  const { store } = await getStoreContext();
  const filter = normalizeCustomerSegmentFilter(payload.filter);
  const preview = await previewCustomerSegment({ filter });

  const { data, error } = await supabase
    .from("customer_segments")
    .insert({
      store_id: store.id,
      name: String(payload.name || "").trim(),
      description: payload.description || null,
      filter_json: filter,
      is_active: payload.isActive !== false,
      last_preview_count: preview.matchedCount,
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeError(error);
  }

  return data;
}

export async function updateCustomerSegment(segmentId, payload = {}) {
  if (!segmentId) {
    throw new Error("Segment id is required");
  }

  const { store } = await getStoreContext();
  const filter = normalizeCustomerSegmentFilter(payload.filter);
  const preview = await previewCustomerSegment({ filter });

  const { error } = await supabase
    .from("customer_segments")
    .update({
      name: String(payload.name || "").trim(),
      description: payload.description || null,
      filter_json: filter,
      is_active: payload.isActive !== false,
      last_preview_count: preview.matchedCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", segmentId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function deleteCustomerSegment(segmentId) {
  if (!segmentId) {
    throw new Error("Segment id is required");
  }

  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("customer_segments")
    .delete()
    .eq("id", segmentId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function getCustomerTimeline(customerId) {
  if (!customerId) {
    throw new Error("Customer id is required");
  }

  const { store } = await getStoreContext();
  const timeline = [];

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, total_amount, currency_code, created_at",
    )
    .eq("store_id", store.id)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (ordersError) {
    throw normalizeError(ordersError);
  }

  for (const order of orders || []) {
    timeline.push({
      id: `order-${order.id}`,
      type: "order",
      title: `Order ${order.order_number}`,
      description: `${order.status} / ${order.payment_status}`,
      amount: Number(order.total_amount || 0),
      currencyCode: order.currency_code || "USD",
      createdAt: order.created_at,
      metadata: {
        orderId: order.id,
      },
    });
  }

  const orderIds = (orders || []).map((item) => item.id);
  if (orderIds.length) {
    const { data: returns, error: returnsError } = await supabase
      .from("returns")
      .select("id, order_id, status, reason_code, created_at")
      .eq("store_id", store.id)
      .in("order_id", orderIds)
      .order("created_at", { ascending: false })
      .limit(50);

    if (returnsError && !isMissingTableError(returnsError, "returns")) {
      throw normalizeError(returnsError);
    }

    for (const item of returns || []) {
      timeline.push({
        id: `return-${item.id}`,
        type: "return",
        title: "Return request",
        description: `${item.status}${
          item.reason_code ? ` (${item.reason_code})` : ""
        }`,
        createdAt: item.created_at,
        metadata: {
          returnId: item.id,
          orderId: item.order_id,
        },
      });
    }

    const returnIds = (returns || []).map((item) => item.id);
    if (returnIds.length) {
      const { data: refunds, error: refundsError } = await supabase
        .from("refunds")
        .select("id, return_id, amount, status, refund_type, created_at")
        .in("return_id", returnIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (refundsError && !isMissingTableError(refundsError, "refunds")) {
        throw normalizeError(refundsError);
      }

      for (const item of refunds || []) {
        timeline.push({
          id: `refund-${item.id}`,
          type: "refund",
          title: "Refund",
          description: `${item.status}${
            item.refund_type ? ` (${item.refund_type})` : ""
          }`,
          amount: Number(item.amount || 0),
          createdAt: item.created_at,
          metadata: {
            refundId: item.id,
            returnId: item.return_id,
          },
        });
      }
    }
  }

  if (await tableExists("customer_subscriptions")) {
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("customer_subscriptions")
      .select(
        "id, status, next_billing_at, created_at, updated_at, subscription_plans(name, price_amount, currency_code)",
      )
      .eq("store_id", store.id)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (
      subscriptionsError &&
      !isMissingTableError(subscriptionsError, "customer_subscriptions")
    ) {
      throw normalizeError(subscriptionsError);
    }

    for (const subscription of subscriptions || []) {
      timeline.push({
        id: `subscription-${subscription.id}`,
        type: "subscription",
        title: `Subscription ${subscription.subscription_plans?.name || "Plan"}`,
        description: `${subscription.status} · next billing ${subscription.next_billing_at ? new Date(subscription.next_billing_at).toLocaleString() : "-"}`,
        amount: Number(subscription.subscription_plans?.price_amount || 0),
        currencyCode: subscription.subscription_plans?.currency_code || "USD",
        createdAt: subscription.updated_at || subscription.created_at,
        metadata: {
          subscriptionId: subscription.id,
          status: subscription.status,
        },
      });
    }
  }

  const { data: events, error: eventsError } = await supabase
    .from("customer_timeline_events")
    .select("id, event_type, title, description, metadata_json, created_at")
    .eq("store_id", store.id)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (
    eventsError &&
    !isMissingTableError(eventsError, "customer_timeline_events")
  ) {
    throw normalizeError(eventsError);
  }

  for (const event of events || []) {
    timeline.push({
      id: `event-${event.id}`,
      type: event.event_type || "note",
      title: event.title || "Engagement",
      description: event.description || "",
      createdAt: event.created_at,
      metadata: event.metadata_json || {},
    });
  }

  return timeline.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function addCustomerEngagementNote(customerId, payload = {}) {
  if (!customerId) {
    throw new Error("Customer id is required");
  }

  const { store } = await getStoreContext();
  const { error } = await supabase.from("customer_timeline_events").insert({
    store_id: store.id,
    customer_id: customerId,
    event_type: "note",
    title: payload.title || "Manual note",
    description: payload.description || "",
    metadata_json: payload.metadata || {},
  });

  if (error) {
    throw normalizeError(error);
  }

  await supabase
    .from("customers")
    .update({
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId)
    .eq("store_id", store.id);

  return { ok: true };
}
