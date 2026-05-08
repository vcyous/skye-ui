import { assertSupabaseConfigured, supabase } from "./supabaseClient.js";

const DEFAULT_THEME_CONFIG = {
  colors: {
    primary: "#006c9c",
    accent: "#ffd566",
    background: "#f4f6f8",
  },
  typography: {
    heading: "Space Grotesk",
    body: "Manrope",
  },
};

const DEFAULT_THEMES = [
  { name: "Aurora Classic", is_published: true },
  { name: "Modern Grid", is_published: false },
  { name: "Bold Commerce", is_published: false },
];

let accessToken = null;
let authFailureHandler = null;

function normalizeError(err) {
  const message =
    err?.message || err?.error_description || "Unexpected request error";
  const next = new Error(message);
  next.code = err?.code;
  next.details = err?.details;
  return next;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function buildUniqueHandle(base) {
  const normalized = slugify(base) || "item";
  return `${normalized}-${Date.now().toString(36)}`;
}

function mapPublicUser(authUser, profile) {
  return {
    id: authUser.id,
    name:
      profile?.name ||
      authUser.user_metadata?.name ||
      authUser.email?.split("@")[0] ||
      "Store Owner",
    email: authUser.email,
    phone: profile?.phone || authUser.user_metadata?.phone || null,
    status: profile?.status || "active",
    createdAt: profile?.created_at || null,
    updatedAt: profile?.updated_at || null,
  };
}

async function getCurrentAuthUser() {
  assertSupabaseConfigured();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw normalizeError(error);
  }

  if (!data.user) {
    const err = new Error("Not authenticated");
    err.code = "AUTH_REQUIRED";
    throw err;
  }

  return data.user;
}

async function getAppUserById(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, phone, status, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw normalizeError(error);
  }

  return data;
}

async function ensureAppUser(authUser, payload = {}) {
  const existing = await getAppUserById(authUser.id);
  if (existing) {
    return existing;
  }

  const insertPayload = {
    id: authUser.id,
    name:
      payload.name ||
      authUser.user_metadata?.name ||
      authUser.email?.split("@")[0] ||
      "Store Owner",
    email: authUser.email,
    phone: payload.phone || authUser.user_metadata?.phone || null,
    status: "active",
  };

  const { error: insertError } = await supabase
    .from("users")
    .insert(insertPayload);

  if (insertError && insertError.code !== "23505") {
    throw normalizeError(insertError);
  }

  return getAppUserById(authUser.id);
}

async function ensureThemes(storeId) {
  const { data, error } = await supabase
    .from("themes")
    .select("id")
    .eq("store_id", storeId)
    .limit(1);

  if (error) {
    throw normalizeError(error);
  }

  if (data.length > 0) {
    return;
  }

  const { error: themeInsertError } = await supabase.from("themes").insert(
    DEFAULT_THEMES.map((theme) => ({
      store_id: storeId,
      name: theme.name,
      version: "1.0.0",
      config_json: DEFAULT_THEME_CONFIG,
      is_published: theme.is_published,
    })),
  );

  if (themeInsertError) {
    throw normalizeError(themeInsertError);
  }
}

async function ensurePrimaryStore(authUser, profile) {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", authUser.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw normalizeError(error);
  }

  let store = data[0] || null;

  if (!store) {
    const displayName =
      profile?.name || authUser.user_metadata?.name || authUser.email;

    const { data: inserted, error: insertError } = await supabase
      .from("stores")
      .insert({
        owner_id: authUser.id,
        name: `${displayName || "Skye"} Store`,
        handle: buildUniqueHandle(displayName || "skye-store"),
        description: "Default store profile",
        status: "active",
        currency_code: "USD",
        timezone: "UTC",
      })
      .select("*")
      .single();

    if (insertError) {
      throw normalizeError(insertError);
    }

    store = inserted;
  }

  await ensureThemes(store.id);
  return store;
}

async function getStoreContext() {
  const authUser = await getCurrentAuthUser();
  const profile = await ensureAppUser(authUser);
  const store = await ensurePrimaryStore(authUser, profile);
  return { authUser, profile, store };
}

export function setAccessToken(token) {
  accessToken = token || null;
}

export function setAuthFailureHandler(handler) {
  authFailureHandler = handler;
}

export async function registerRequest(payload) {
  assertSupabaseConfigured();

  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        name: payload.name,
        phone: payload.phone || null,
      },
    },
  });

  if (error) {
    throw normalizeError(error);
  }

  if (!data.user) {
    throw new Error("Registration did not return an authenticated user.");
  }

  const profile = await ensureAppUser(data.user, payload);
  await ensurePrimaryStore(data.user, profile);

  return {
    user: mapPublicUser(data.user, profile),
    accessToken: data.session?.access_token || accessToken,
    refreshToken: data.session?.refresh_token || null,
  };
}

export async function loginRequest(payload) {
  assertSupabaseConfigured();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (error) {
    throw normalizeError(error);
  }

  if (!data.user) {
    throw new Error("Login failed.");
  }

  const profile = await ensureAppUser(data.user);
  await ensurePrimaryStore(data.user, profile);

  return {
    user: mapPublicUser(data.user, profile),
    accessToken: data.session?.access_token || null,
    refreshToken: data.session?.refresh_token || null,
  };
}

export async function refreshAccessToken() {
  assertSupabaseConfigured();

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    throw normalizeError(sessionError);
  }

  if (!sessionData.session) {
    throw new Error("No active session.");
  }

  const authUser = await getCurrentAuthUser();
  const profile = await ensureAppUser(authUser);
  await ensurePrimaryStore(authUser, profile);

  return {
    user: mapPublicUser(authUser, profile),
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
  };
}

export async function logoutRequest() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw normalizeError(error);
  }

  if (authFailureHandler) {
    authFailureHandler();
  }
}

export async function fetchProfile() {
  const authUser = await getCurrentAuthUser();
  const profile = await ensureAppUser(authUser);
  return mapPublicUser(authUser, profile);
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

export async function getProducts(status = "all") {
  const { store } = await getStoreContext();

  let query = supabase
    .from("products")
    .select(
      "id, title, status, created_at, updated_at, product_variants(sku, price, quantity_in_stock, created_at)",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((product) => {
    const variants = Array.isArray(product.product_variants)
      ? product.product_variants
      : [];
    const primaryVariant = variants[0] || null;

    return {
      id: product.id,
      name: product.title,
      sku: primaryVariant?.sku || "-",
      price: Number(primaryVariant?.price || 0),
      quantity_in_stock: Number(primaryVariant?.quantity_in_stock || 0),
      stock: Number(primaryVariant?.quantity_in_stock || 0),
      status: product.status,
      rating: null,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  });
}

export async function createProduct(payload) {
  const { store } = await getStoreContext();

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      store_id: store.id,
      title: payload.name,
      handle: buildUniqueHandle(payload.name),
      status: payload.status || "draft",
      tags: [],
    })
    .select("id, title, status, created_at, updated_at")
    .single();

  if (productError) {
    throw normalizeError(productError);
  }

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .insert({
      product_id: product.id,
      sku: payload.sku,
      title: `${payload.name} Default`,
      price: Number(payload.price),
      quantity_in_stock: Number(payload.stock),
    })
    .select("sku, price, quantity_in_stock")
    .single();

  if (variantError) {
    throw normalizeError(variantError);
  }

  return {
    id: product.id,
    name: product.title,
    sku: variant.sku,
    price: Number(variant.price),
    quantity_in_stock: Number(variant.quantity_in_stock),
    stock: Number(variant.quantity_in_stock),
    status: product.status,
    rating: null,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

export async function getOrders(status = "semua_orders") {
  const { store } = await getStoreContext();

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, total_amount, created_at, updated_at, customers(first_name, last_name)",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (status && status !== "semua_orders") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((order) => {
    const customer = Array.isArray(order.customers)
      ? order.customers[0]
      : order.customers;
    const customerName =
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      "Guest Customer";

    return {
      id: order.id,
      order_number: order.order_number,
      orderNumber: order.order_number,
      customer_name: customerName,
      customerName,
      total_price: Number(order.total_amount || 0),
      total: Number(order.total_amount || 0),
      status: order.status,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  });
}

export async function updateOrderStatus(orderId, status) {
  const { authUser, store } = await getStoreContext();

  const { data: order, error: updateError } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("store_id", store.id)
    .select("id, order_number, status, total_amount, created_at, updated_at")
    .maybeSingle();

  if (updateError) {
    throw normalizeError(updateError);
  }

  if (!order) {
    const err = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    throw err;
  }

  const { error: timelineError } = await supabase
    .from("order_timeline")
    .insert({
      order_id: order.id,
      status,
      actor_type: "user",
      actor_id: authUser.id,
      note: `Order status updated to ${status}`,
    });

  if (timelineError) {
    throw normalizeError(timelineError);
  }

  return {
    id: order.id,
    order_number: order.order_number,
    orderNumber: order.order_number,
    total_price: Number(order.total_amount || 0),
    total: Number(order.total_amount || 0),
    status: order.status,
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
}

export async function getStoreProfile() {
  const { authUser, profile, store } = await getStoreContext();

  const { data: themes, error: themeError } = await supabase
    .from("themes")
    .select("id, name, is_published, config_json, created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: true });

  if (themeError) {
    throw normalizeError(themeError);
  }

  const activeTheme = themes.find((theme) => theme.is_published) || themes[0];
  const settings = activeTheme?.config_json?.settings || {};

  return {
    id: store.id,
    storeName: store.name,
    ownerName:
      profile?.name || authUser.user_metadata?.name || authUser.email || "-",
    email: authUser.email,
    phone: profile?.phone || authUser.user_metadata?.phone || "-",
    logisticsProvider: settings.logisticsProvider || "JNE",
    paymentGateway: settings.paymentGateway || "Midtrans",
    activeTemplate: activeTheme?.name || "Aurora Classic",
    createdAt: store.created_at,
    updatedAt: store.updated_at,
  };
}

export async function getTemplates() {
  const { store } = await getStoreContext();
  const { data, error } = await supabase
    .from("themes")
    .select("id, name, is_published")
    .eq("store_id", store.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    name: item.name,
    active: item.is_published,
  }));
}

export { supabase as api };
