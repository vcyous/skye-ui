import { getStoreContext } from "../storeService";
import { supabase } from "../supabaseClient";
import { tableExists } from "../utils/dbUtils";
import { isMissingColumnError, normalizeError } from "../utils/errorUtils";

function legacyFulfillmentFromStatus(status) {
  if (status === "receive") return "delivered";
  if (status === "ongoing_shipped") return "shipped";
  if (status === "cancelled") return "cancelled";
  return "unfulfilled";
}

async function fetchOrderRows(storeId, status) {
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, fulfillment_status, total_amount, currency_code, created_at, updated_at, customers(first_name, last_name)",
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (status && status !== "semua_orders") {
    query = query.eq("status", status);
  }

  let { data, error } = await query;

  if (error && isMissingColumnError(error, "fulfillment_status")) {
    let fallbackQuery = supabase
      .from("orders")
      .select(
        "id, order_number, status, payment_status, total_amount, currency_code, created_at, updated_at, customers(first_name, last_name)",
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (status && status !== "semua_orders") {
      fallbackQuery = fallbackQuery.eq("status", status);
    }
    const fallback = await fallbackQuery;
    data = (fallback.data || []).map((row) => ({
      ...row,
      fulfillment_status: legacyFulfillmentFromStatus(row.status),
    }));
    error = fallback.error;
  }

  if (error) throw normalizeError(error);
  return data || [];
}

async function loadCurrencySnapshotMap(storeId, orderIds) {
  if (!orderIds.length) return new Map();
  if (!(await tableExists("order_currency_snapshots"))) return new Map();

  const response = await supabase
    .from("order_currency_snapshots")
    .select("order_id, display_currency, total_display")
    .eq("store_id", storeId)
    .in("order_id", orderIds);

  if (response.error) throw normalizeError(response.error);

  return (response.data || []).reduce((acc, row) => {
    acc.set(row.order_id, row);
    return acc;
  }, new Map());
}

async function loadSubscriptionMap(storeId, orderIds) {
  if (!orderIds.length) return new Map();
  if (!(await tableExists("order_subscription_context"))) return new Map();

  const response = await supabase
    .from("order_subscription_context")
    .select(
      "order_id, subscription_id, is_renewal, context_json, customer_subscriptions(status)",
    )
    .eq("store_id", storeId)
    .in("order_id", orderIds);

  if (response.error) throw normalizeError(response.error);

  return (response.data || []).reduce((acc, row) => {
    acc.set(row.order_id, row);
    return acc;
  }, new Map());
}

function mapOrderRow(order, snapshotMap, subscriptionMap) {
  const customer = Array.isArray(order.customers)
    ? order.customers[0]
    : order.customers;
  const customerName =
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
    "Guest Customer";

  const snapshot = snapshotMap.get(order.id);
  const subscription = subscriptionMap.get(order.id);

  return {
    id: order.id,
    order_number: order.order_number,
    orderNumber: order.order_number,
    customer_name: customerName,
    customerName,
    customerEmail: null,
    lifecycleState: null,
    paymentStatus: order.payment_status,
    fulfillmentStatus: order.fulfillment_status || "unfulfilled",
    total_price: Number(order.total_amount || 0),
    total: Number(order.total_amount || 0),
    totalAmount: Number(order.total_amount || 0),
    displayCurrencyCode: snapshot?.display_currency || order.currency_code,
    currencyCode: order.currency_code || null,
    displayTotal: Number(snapshot?.total_display || order.total_amount || 0),
    subscriptionId: subscription?.subscription_id || null,
    subscriptionStatus: subscription?.customer_subscriptions?.status || null,
    isSubscriptionRenewal: Boolean(subscription?.is_renewal),
    subscriptionLabel: subscription?.context_json?.planName || null,
    status: order.status,
    created_at: order.created_at,
    createdAt: order.created_at,
    updated_at: order.updated_at,
    updatedAt: order.updated_at || null,
  };
}

export async function getOrders(status = "semua_orders") {
  const { store } = await getStoreContext();
  const rows = await fetchOrderRows(store.id, status);
  const orderIds = rows.map((row) => row.id);

  const [snapshotMap, subscriptionMap] = await Promise.all([
    loadCurrencySnapshotMap(store.id, orderIds),
    loadSubscriptionMap(store.id, orderIds),
  ]);

  return rows.map((order) => mapOrderRow(order, snapshotMap, subscriptionMap));
}
