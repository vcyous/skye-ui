import { getStoreContext } from "./storeService";
import { supabase } from "./supabaseClient";
import { normalizeError } from "./utils/errorUtils";

export function startOfUtcDay(value = new Date()) {
  const source = new Date(value);
  return new Date(
    Date.UTC(
      source.getUTCFullYear(),
      source.getUTCMonth(),
      source.getUTCDate(),
    ),
  );
}

export function addUtcDays(value, days) {
  return new Date(startOfUtcDay(value).getTime() + days * 24 * 60 * 60 * 1000);
}

export function calculateDeltaPercent(currentValue, previousValue) {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

export async function getDashboardSummary() {
  const { store } = await getStoreContext();
  const today = new Date();
  const dayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).toISOString();

  const [
    todaysOrdersResponse,
    ordersCountResponse,
    productCountResponse,
    statusOrdersResponse,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("total_amount")
      .eq("store_id", store.id)
      .gte("created_at", dayStart),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id),
    supabase
      .from("orders")
      .select("status")
      .eq("store_id", store.id)
      .in("status", ["not_paid", "need_ship", "ongoing_shipped"]),
  ]);

  for (const response of [
    todaysOrdersResponse,
    ordersCountResponse,
    productCountResponse,
    statusOrdersResponse,
  ]) {
    if (response.error) {
      throw normalizeError(response.error);
    }
  }

  const todaysSales = (todaysOrdersResponse.data || []).reduce(
    (sum, row) => sum + Number(row.total_amount || 0),
    0,
  );

  const statusMap = {
    not_paid: 0,
    need_ship: 0,
    ongoing_shipped: 0,
  };
  for (const row of statusOrdersResponse.data || []) {
    statusMap[row.status] = (statusMap[row.status] || 0) + 1;
  }

  return {
    todaysSales: Number(todaysSales.toFixed(2)),
    grossRevenue: Number((todaysSales * 3.2).toFixed(2)),
    visitors: 0,
    products: Number(productCountResponse.count || 0),
    orders: Number(ordersCountResponse.count || 0),
    topStatuses: statusMap,
  };
}

export async function invalidateAnalyticsReportCache() {}

export async function getAnalyticsMetricDictionary() {
  return [];
}

export async function getAnalyticsOverviewReport() {
  return { metrics: [], buckets: [] };
}
