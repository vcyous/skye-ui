/**
 * analyticsService — Dashboard KPIs, overview reports, metric dictionary, and report cache
 *
 * Domain: Analytics
 * Feature: 13
 * Depends on: supabaseClient, utils/errorUtils, utils/dbUtils, storeService
 */

import { supabase } from "./supabaseClient.js";
import { normalizeError, isMissingTableError } from "./utils/errorUtils.js";
import { tableExists } from "./utils/dbUtils.js";
import { getStoreContext } from "./storeService.js";

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
    analyticsResponse,
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
    supabase
      .from("analytics_daily")
      .select("visitors")
      .eq("store_id", store.id)
      .order("date", { ascending: false })
      .limit(1),
  ]);

  const responses = [
    todaysOrdersResponse,
    ordersCountResponse,
    productCountResponse,
    statusOrdersResponse,
    analyticsResponse,
  ];

  for (const response of responses) {
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
    visitors: Number(analyticsResponse.data?.[0]?.visitors || 0),
    products: Number(productCountResponse.count || 0),
    orders: Number(ordersCountResponse.count || 0),
    topStatuses: statusMap,
  };
}

const ANALYTICS_METRIC_DICTIONARY_FALLBACK = [
  {
    metricKey: "total_sales",
    label: "Total Sales",
    description: "Sum of order total amount in selected window",
    dataSource: "orders.total_amount",
    refreshCadenceMinutes: 5,
    unit: "currency",
  },
  {
    metricKey: "total_orders",
    label: "Total Orders",
    description: "Count of orders created in selected window",
    dataSource: "orders.id",
    refreshCadenceMinutes: 5,
    unit: "count",
  },
  {
    metricKey: "average_order_value",
    label: "Average Order Value",
    description: "total_sales / total_orders",
    dataSource: "orders.total_amount",
    refreshCadenceMinutes: 5,
    unit: "currency",
  },
  {
    metricKey: "conversion_rate",
    label: "Conversion Rate",
    description: "total_orders / visitors",
    dataSource: "orders + analytics_daily.visitors",
    refreshCadenceMinutes: 15,
    unit: "percentage",
  },
];

function normalizeAnalyticsRangeDays(value) {
  const parsed = Number(value || 30);
  if ([7, 14, 30, 90].includes(parsed)) {
    return parsed;
  }
  return 30;
}

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

function buildAnalyticsBuckets(days) {
  const list = [];
  const today = startOfUtcDay(new Date());

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = addUtcDays(today, -offset);
    const key = date.toISOString().slice(0, 10);
    list.push({
      date: key,
      label: key.slice(5),
      sales: 0,
      orders: 0,
      visitors: 0,
    });
  }

  return list;
}

function calculateAnalyticsPeriodMetrics(orders = [], visitors = []) {
  const totalSales = (orders || []).reduce(
    (sum, row) => sum + Number(row.total_amount || 0),
    0,
  );
  const totalOrders = Number((orders || []).length);
  const totalVisitors = (visitors || []).reduce(
    (sum, row) => sum + Number(row.visitors || 0),
    0,
  );

  return {
    totalSales: Number(totalSales.toFixed(2)),
    totalOrders,
    totalVisitors,
    averageOrderValue: totalOrders
      ? Number((totalSales / totalOrders).toFixed(2))
      : 0,
    conversionRate: totalVisitors
      ? Number(((totalOrders / totalVisitors) * 100).toFixed(2))
      : 0,
  };
}

export function calculateDeltaPercent(currentValue, previousValue) {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);

  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Number((((current - previous) / previous) * 100).toFixed(2));
}

async function readAnalyticsReportCache(storeId, reportType, cacheKey) {
  if (!(await tableExists("analytics_report_cache"))) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("analytics_report_cache")
    .select("payload_json")
    .eq("store_id", storeId)
    .eq("report_type", reportType)
    .eq("cache_key", cacheKey)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "analytics_report_cache")) {
      return null;
    }
    throw normalizeError(error);
  }

  return data?.payload_json || null;
}

async function writeAnalyticsReportCache(
  storeId,
  reportType,
  cacheKey,
  payload,
  ttlMinutes = 5,
) {
  if (!(await tableExists("analytics_report_cache"))) {
    return;
  }

  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  const { error } = await supabase.from("analytics_report_cache").upsert(
    {
      store_id: storeId,
      report_type: reportType,
      cache_key: cacheKey,
      payload_json: payload,
      expires_at: expiresAt,
      last_refreshed_at: nowIso,
      updated_at: nowIso,
    },
    { onConflict: "store_id,report_type,cache_key" },
  );

  if (error && !isMissingTableError(error, "analytics_report_cache")) {
    throw normalizeError(error);
  }
}

export async function invalidateAnalyticsReportCache(storeId, reportType = null) {
  if (!(await tableExists("analytics_report_cache"))) {
    return;
  }

  let query = supabase
    .from("analytics_report_cache")
    .delete()
    .eq("store_id", storeId);

  if (reportType) {
    query = query.eq("report_type", reportType);
  }

  const { error } = await query;
  if (error && !isMissingTableError(error, "analytics_report_cache")) {
    throw normalizeError(error);
  }
}

export async function getAnalyticsMetricDictionary() {
  const { store } = await getStoreContext();

  if (!(await tableExists("analytics_metric_dictionary"))) {
    return ANALYTICS_METRIC_DICTIONARY_FALLBACK;
  }

  const { data, error } = await supabase
    .from("analytics_metric_dictionary")
    .select(
      "metric_key, label, description, data_source, refresh_cadence_minutes, unit",
    )
    .eq("store_id", store.id)
    .order("metric_key", { ascending: true });

  if (error) {
    if (isMissingTableError(error, "analytics_metric_dictionary")) {
      return ANALYTICS_METRIC_DICTIONARY_FALLBACK;
    }
    throw normalizeError(error);
  }

  if (!(data || []).length) {
    return ANALYTICS_METRIC_DICTIONARY_FALLBACK;
  }

  return (data || []).map((item) => ({
    metricKey: item.metric_key,
    label: item.label,
    description: item.description || "",
    dataSource: item.data_source || "",
    refreshCadenceMinutes: Number(item.refresh_cadence_minutes || 5),
    unit: item.unit || "count",
  }));
}

export async function getAnalyticsOverviewReport(options = {}) {
  const { store } = await getStoreContext();
  const rangeDays = normalizeAnalyticsRangeDays(options.rangeDays);
  const compareMode =
    String(options.compareMode || "previous").toLowerCase() === "none"
      ? "none"
      : "previous";

  const cacheKey = `range:${rangeDays}|compare:${compareMode}`;
  const cached = await readAnalyticsReportCache(
    store.id,
    "analytics_overview",
    cacheKey,
  );

  if (cached) {
    return {
      ...cached,
      cached: true,
    };
  }

  const currentStart = addUtcDays(startOfUtcDay(new Date()), -(rangeDays - 1));
  const currentEndExclusive = addUtcDays(startOfUtcDay(new Date()), 1);
  const previousStart = addUtcDays(currentStart, -rangeDays);

  const [ordersResponse, visitorsResponse, productsResponse, metricDictionary] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id, status, total_amount, created_at")
        .eq("store_id", store.id)
        .gte("created_at", previousStart.toISOString())
        .lt("created_at", currentEndExclusive.toISOString()),
      supabase
        .from("analytics_daily")
        .select("date, visitors")
        .eq("store_id", store.id)
        .gte("date", previousStart.toISOString().slice(0, 10))
        .lt("date", currentEndExclusive.toISOString().slice(0, 10)),
      supabase
        .from("order_items")
        .select(
          "product_title, quantity, line_total, orders!inner(store_id, created_at)",
        )
        .eq("orders.store_id", store.id)
        .gte("orders.created_at", currentStart.toISOString())
        .lt("orders.created_at", currentEndExclusive.toISOString()),
      getAnalyticsMetricDictionary(),
    ]);

  if (ordersResponse.error) {
    throw normalizeError(ordersResponse.error);
  }

  let visitorRows = visitorsResponse.data || [];
  if (visitorsResponse.error) {
    if (isMissingTableError(visitorsResponse.error, "analytics_daily")) {
      visitorRows = [];
    } else {
      throw normalizeError(visitorsResponse.error);
    }
  }

  let productRows = productsResponse.data || [];
  if (productsResponse.error) {
    productRows = [];
  }

  const allOrderRows = ordersResponse.data || [];
  const currentOrderRows = allOrderRows.filter(
    (row) => new Date(row.created_at).getTime() >= currentStart.getTime(),
  );
  const previousOrderRows =
    compareMode === "previous"
      ? allOrderRows.filter(
          (row) => new Date(row.created_at).getTime() < currentStart.getTime(),
        )
      : [];

  const currentVisitorRows = visitorRows.filter(
    (row) =>
      new Date(`${row.date}T00:00:00.000Z`).getTime() >= currentStart.getTime(),
  );
  const previousVisitorRows =
    compareMode === "previous"
      ? visitorRows.filter(
          (row) =>
            new Date(`${row.date}T00:00:00.000Z`).getTime() <
            currentStart.getTime(),
        )
      : [];

  const currentMetrics = calculateAnalyticsPeriodMetrics(
    currentOrderRows,
    currentVisitorRows,
  );
  const previousMetrics = calculateAnalyticsPeriodMetrics(
    previousOrderRows,
    previousVisitorRows,
  );

  const kpis = {
    totalSales: {
      value: currentMetrics.totalSales,
      previous: previousMetrics.totalSales,
      delta: calculateDeltaPercent(
        currentMetrics.totalSales,
        previousMetrics.totalSales,
      ),
    },
    totalOrders: {
      value: currentMetrics.totalOrders,
      previous: previousMetrics.totalOrders,
      delta: calculateDeltaPercent(
        currentMetrics.totalOrders,
        previousMetrics.totalOrders,
      ),
    },
    averageOrderValue: {
      value: currentMetrics.averageOrderValue,
      previous: previousMetrics.averageOrderValue,
      delta: calculateDeltaPercent(
        currentMetrics.averageOrderValue,
        previousMetrics.averageOrderValue,
      ),
    },
    conversionRate: {
      value: currentMetrics.conversionRate,
      previous: previousMetrics.conversionRate,
      delta: calculateDeltaPercent(
        currentMetrics.conversionRate,
        previousMetrics.conversionRate,
      ),
    },
  };

  const trendRows = buildAnalyticsBuckets(rangeDays);
  const trendMap = trendRows.reduce((acc, row) => {
    acc.set(row.date, row);
    return acc;
  }, new Map());

  for (const row of currentOrderRows) {
    const key = String(row.created_at || "").slice(0, 10);
    const bucket = trendMap.get(key);
    if (!bucket) {
      continue;
    }
    bucket.orders += 1;
    bucket.sales = Number(
      (bucket.sales + Number(row.total_amount || 0)).toFixed(2),
    );
  }

  for (const row of currentVisitorRows) {
    const key = String(row.date || "").slice(0, 10);
    const bucket = trendMap.get(key);
    if (!bucket) {
      continue;
    }
    bucket.visitors += Number(row.visitors || 0);
  }

  const statusAccumulator = new Map();
  for (const row of currentOrderRows) {
    const status = String(row.status || "unknown");
    const existing = statusAccumulator.get(status) || {
      status,
      orders: 0,
      grossSales: 0,
      share: 0,
    };
    existing.orders += 1;
    existing.grossSales += Number(row.total_amount || 0);
    statusAccumulator.set(status, existing);
  }

  const statusBreakdown = Array.from(statusAccumulator.values())
    .map((item) => ({
      ...item,
      grossSales: Number(item.grossSales.toFixed(2)),
      share: currentMetrics.totalOrders
        ? Number(((item.orders / currentMetrics.totalOrders) * 100).toFixed(2))
        : 0,
    }))
    .sort((a, b) => b.orders - a.orders);

  const productAccumulator = new Map();
  for (const row of productRows) {
    const title = String(row.product_title || "Unknown product").trim();
    const existing = productAccumulator.get(title) || {
      productTitle: title,
      quantity: 0,
      grossSales: 0,
      share: 0,
    };
    existing.quantity += Number(row.quantity || 0);
    existing.grossSales += Number(row.line_total || 0);
    productAccumulator.set(title, existing);
  }

  const productBreakdown = Array.from(productAccumulator.values())
    .map((item) => ({
      ...item,
      grossSales: Number(item.grossSales.toFixed(2)),
      share: currentMetrics.totalSales
        ? Number(
            ((item.grossSales / currentMetrics.totalSales) * 100).toFixed(2),
          )
        : 0,
    }))
    .sort((a, b) => b.grossSales - a.grossSales)
    .slice(0, 8);

  const responsePayload = {
    range: {
      days: rangeDays,
      compareMode,
      from: currentStart.toISOString().slice(0, 10),
      to: addUtcDays(currentEndExclusive, -1).toISOString().slice(0, 10),
    },
    kpis,
    trendSeries: trendRows,
    statusBreakdown,
    productBreakdown,
    metricDictionary,
    hasEnoughData: currentMetrics.totalOrders > 0,
    cached: false,
  };

  await writeAnalyticsReportCache(
    store.id,
    "analytics_overview",
    cacheKey,
    responsePayload,
    5,
  );

  return responsePayload;
}
