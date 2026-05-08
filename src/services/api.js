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

function mapStoreSummary(store) {
  if (!store) {
    return null;
  }

  return {
    id: store.id,
    name: store.name,
    handle: store.handle,
    description: store.description,
    currencyCode: store.currency_code,
    timezone: store.timezone,
    status: store.status,
    createdAt: store.created_at,
    updatedAt: store.updated_at,
  };
}

function createOrderNumber() {
  return `SKY-${Date.now().toString(36).toUpperCase()}`;
}

function createInvoiceNumber() {
  return `INV-${Date.now().toString(36).toUpperCase()}`;
}

function createRmaNumber() {
  return `RMA-${Date.now().toString(36).toUpperCase()}`;
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

async function ensureActiveCart(storeId) {
  const { data: carts, error: cartError } = await supabase
    .from("carts")
    .select("id, store_id, status, note, created_at, updated_at")
    .eq("store_id", storeId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  if (cartError) {
    throw normalizeError(cartError);
  }

  if (carts?.[0]) {
    return carts[0];
  }

  const { data: inserted, error: insertError } = await supabase
    .from("carts")
    .insert({
      store_id: storeId,
      status: "active",
    })
    .select("id, store_id, status, note, created_at, updated_at")
    .single();

  if (insertError) {
    throw normalizeError(insertError);
  }

  return inserted;
}

function calculateDiscountAmount(subtotal, discount) {
  if (!discount) {
    return 0;
  }

  const subtotalValue = Number(subtotal || 0);
  if (discount.discount_type === "percentage") {
    return Number(
      ((subtotalValue * Number(discount.value || 0)) / 100).toFixed(2),
    );
  }

  return Math.min(subtotalValue, Number(discount.value || 0));
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
  const store = await ensurePrimaryStore(data.user, profile);
  const hasSession = Boolean(data.session?.access_token);

  return {
    user: hasSession ? mapPublicUser(data.user, profile) : null,
    store: hasSession ? mapStoreSummary(store) : null,
    accessToken: data.session?.access_token || null,
    refreshToken: data.session?.refresh_token || null,
    requiresEmailVerification: !hasSession,
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
  const store = await ensurePrimaryStore(data.user, profile);

  return {
    user: mapPublicUser(data.user, profile),
    store: mapStoreSummary(store),
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
  const store = await ensurePrimaryStore(authUser, profile);

  return {
    user: mapPublicUser(authUser, profile),
    store: mapStoreSummary(store),
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

export async function updateProfile(payload) {
  const authUser = await getCurrentAuthUser();

  const updates = {
    name: payload.name,
    phone: payload.phone || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", authUser.id);

  if (error) {
    throw normalizeError(error);
  }

  return fetchProfile();
}

export async function resetPasswordRequest(email) {
  assertSupabaseConfigured();

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/login`
      : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
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
      "id, title, description, tags, status, created_at, updated_at, product_variants(id, sku, price, quantity_in_stock, created_at)",
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
      description: product.description || "",
      tags: Array.isArray(product.tags) ? product.tags : [],
      variantId: primaryVariant?.id || null,
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

  const tags = Array.isArray(payload.tags)
    ? payload.tags
    : String(payload.tags || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      store_id: store.id,
      title: payload.name,
      handle: buildUniqueHandle(payload.name),
      description: payload.description || null,
      status: payload.status || "draft",
      tags,
    })
    .select("id, title, description, tags, status, created_at, updated_at")
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
    .select("id, sku, price, quantity_in_stock")
    .single();

  if (variantError) {
    throw normalizeError(variantError);
  }

  return {
    id: product.id,
    name: product.title,
    description: product.description || "",
    tags,
    variantId: variant.id,
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

export async function updateProduct(productId, payload) {
  const { store } = await getStoreContext();

  const tags = Array.isArray(payload.tags)
    ? payload.tags
    : String(payload.tags || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const { data: product, error: productError } = await supabase
    .from("products")
    .update({
      title: payload.name,
      description: payload.description || null,
      status: payload.status || "draft",
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("store_id", store.id)
    .select("id, title, description, status, tags, created_at, updated_at")
    .single();

  if (productError) {
    throw normalizeError(productError);
  }

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .update({
      sku: payload.sku,
      price: Number(payload.price),
      quantity_in_stock: Number(payload.stock),
      updated_at: new Date().toISOString(),
    })
    .eq("product_id", product.id)
    .select("id, sku, price, quantity_in_stock")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (variantError) {
    throw normalizeError(variantError);
  }

  return {
    id: product.id,
    name: product.title,
    description: product.description || "",
    tags: Array.isArray(product.tags) ? product.tags : [],
    variantId: variant.id,
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

export async function deleteProduct(productId) {
  const { store } = await getStoreContext();

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function getCollections() {
  const { store } = await getStoreContext();
  const { data, error } = await supabase
    .from("collections")
    .select(
      "id, name, description, status, collection_type, created_at, product_collections(product_id)",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => {
    const links = Array.isArray(item.product_collections)
      ? item.product_collections
      : [];
    return {
      id: item.id,
      name: item.name,
      description: item.description || "",
      status: item.status,
      collectionType: item.collection_type,
      productIds: links.map((link) => link.product_id),
      productCount: links.length,
      createdAt: item.created_at,
    };
  });
}

export async function createCollection(payload) {
  const { store } = await getStoreContext();
  const { data, error } = await supabase
    .from("collections")
    .insert({
      store_id: store.id,
      name: payload.name,
      handle: buildUniqueHandle(payload.name),
      description: payload.description || null,
      collection_type: payload.collectionType || "manual",
      status: payload.status || "draft",
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeError(error);
  }

  if (Array.isArray(payload.productIds) && payload.productIds.length > 0) {
    const { error: assignError } = await supabase
      .from("product_collections")
      .insert(
        payload.productIds.map((productId, index) => ({
          collection_id: data.id,
          product_id: productId,
          sort_order: index,
        })),
      );

    if (assignError) {
      throw normalizeError(assignError);
    }
  }

  return { ok: true };
}

export async function updateCollection(collectionId, payload) {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("collections")
    .update({
      name: payload.name,
      description: payload.description || null,
      status: payload.status || "draft",
      collection_type: payload.collectionType || "manual",
      updated_at: new Date().toISOString(),
    })
    .eq("id", collectionId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function deleteCollection(collectionId) {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function updateCollectionProducts(collectionId, productIds) {
  const { store } = await getStoreContext();

  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (collectionError) {
    throw normalizeError(collectionError);
  }

  if (!collection) {
    throw new Error("Collection not found");
  }

  const { error: deleteError } = await supabase
    .from("product_collections")
    .delete()
    .eq("collection_id", collectionId);

  if (deleteError) {
    throw normalizeError(deleteError);
  }

  const normalizedIds = Array.isArray(productIds)
    ? [...new Set(productIds.filter(Boolean))]
    : [];

  if (normalizedIds.length > 0) {
    const { error: insertError } = await supabase
      .from("product_collections")
      .insert(
        normalizedIds.map((productId, index) => ({
          collection_id: collectionId,
          product_id: productId,
          sort_order: index,
        })),
      );

    if (insertError) {
      throw normalizeError(insertError);
    }
  }

  return { ok: true };
}

export async function getInventoryItems() {
  const { store } = await getStoreContext();

  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "id, sku, title, price, quantity_in_stock, reorder_level, products!inner(id, title, store_id)",
    )
    .eq("products.store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    sku: item.sku,
    variantTitle: item.title,
    price: Number(item.price || 0),
    stock: Number(item.quantity_in_stock || 0),
    reorderLevel: Number(item.reorder_level || 0),
    productId: item.products?.id,
    productName: item.products?.title || "-",
  }));
}

export async function adjustInventory(payload) {
  const { store } = await getStoreContext();
  const amount = Number(payload.adjustment || 0);

  if (!amount) {
    throw new Error("Adjustment value is required");
  }

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select(
      "id, quantity_in_stock, reorder_level, products!inner(id, title, store_id)",
    )
    .eq("id", payload.variantId)
    .eq("products.store_id", store.id)
    .maybeSingle();

  if (variantError) {
    throw normalizeError(variantError);
  }

  if (!variant) {
    throw new Error("Variant not found");
  }

  const quantityBefore = Number(variant.quantity_in_stock || 0);
  const quantityAfter = quantityBefore + amount;

  if (quantityAfter < 0) {
    throw new Error("Stock cannot be negative");
  }

  const { error: updateError } = await supabase
    .from("product_variants")
    .update({
      quantity_in_stock: quantityAfter,
      reorder_level:
        payload.reorderLevel === undefined || payload.reorderLevel === null
          ? variant.reorder_level
          : Number(payload.reorderLevel),
      updated_at: new Date().toISOString(),
    })
    .eq("id", variant.id);

  if (updateError) {
    throw normalizeError(updateError);
  }

  const { error: movementError } = await supabase
    .from("inventory_movements")
    .insert({
      store_id: store.id,
      product_variant_id: variant.id,
      movement_type: "adjustment",
      quantity_change: amount,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      reason: payload.reason || "Manual adjustment",
    });

  if (movementError) {
    throw normalizeError(movementError);
  }

  return { ok: true };
}

export async function getInventoryMovements(limit = 40) {
  const { store } = await getStoreContext();

  const { data, error } = await supabase
    .from("inventory_movements")
    .select(
      "id, movement_type, quantity_change, quantity_before, quantity_after, reason, created_at, product_variants(sku, title)",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    movementType: item.movement_type,
    quantityChange: Number(item.quantity_change || 0),
    quantityBefore: Number(item.quantity_before || 0),
    quantityAfter: Number(item.quantity_after || 0),
    reason: item.reason || "-",
    createdAt: item.created_at,
    sku: item.product_variants?.sku || "-",
    variantTitle: item.product_variants?.title || "-",
  }));
}

export async function getDiscounts(status = "all") {
  const { store } = await getStoreContext();

  let query = supabase
    .from("discounts")
    .select(
      "id, code, title, description, discount_type, value, min_purchase_amount, max_uses, uses_count, starts_at, ends_at, status, created_at",
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

  return (data || []).map((item) => ({
    id: item.id,
    code: item.code,
    title: item.title,
    description: item.description || "",
    discountType: item.discount_type,
    value: Number(item.value || 0),
    minPurchaseAmount: Number(item.min_purchase_amount || 0),
    maxUses: item.max_uses,
    usesCount: Number(item.uses_count || 0),
    startsAt: item.starts_at,
    endsAt: item.ends_at,
    status: item.status,
    createdAt: item.created_at,
  }));
}

export async function createDiscount(payload) {
  const { store } = await getStoreContext();
  const { error } = await supabase.from("discounts").insert({
    store_id: store.id,
    code: payload.code,
    title: payload.title,
    description: payload.description || null,
    discount_type: payload.discountType,
    value: Number(payload.value),
    min_purchase_amount: payload.minPurchaseAmount
      ? Number(payload.minPurchaseAmount)
      : null,
    max_uses: payload.maxUses ? Number(payload.maxUses) : null,
    starts_at: payload.startsAt || null,
    ends_at: payload.endsAt || null,
    status: payload.status || "draft",
  });

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function updateDiscount(discountId, payload) {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("discounts")
    .update({
      code: payload.code,
      title: payload.title,
      description: payload.description || null,
      discount_type: payload.discountType,
      value: Number(payload.value),
      min_purchase_amount: payload.minPurchaseAmount
        ? Number(payload.minPurchaseAmount)
        : null,
      max_uses: payload.maxUses ? Number(payload.maxUses) : null,
      starts_at: payload.startsAt || null,
      ends_at: payload.endsAt || null,
      status: payload.status || "draft",
      updated_at: new Date().toISOString(),
    })
    .eq("id", discountId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function deleteDiscount(discountId) {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("discounts")
    .delete()
    .eq("id", discountId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
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

export async function getShippingMethods() {
  const { store } = await getStoreContext();
  const { data, error } = await supabase
    .from("shipping_methods")
    .select(
      "id, name, shipping_type, base_rate, config_json, is_active, created_at",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    name: item.name,
    shippingType: item.shipping_type,
    baseRate: Number(item.base_rate || 0),
    config: item.config_json || {},
    isActive: Boolean(item.is_active),
    createdAt: item.created_at,
  }));
}

export async function createShippingMethod(payload) {
  const { store } = await getStoreContext();
  const { error } = await supabase.from("shipping_methods").insert({
    store_id: store.id,
    name: payload.name,
    shipping_type: payload.shippingType,
    base_rate: Number(payload.baseRate || 0),
    config_json: payload.config || {},
    is_active: payload.isActive ?? true,
  });

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function updateShippingMethod(shippingMethodId, payload) {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("shipping_methods")
    .update({
      name: payload.name,
      shipping_type: payload.shippingType,
      base_rate: Number(payload.baseRate || 0),
      config_json: payload.config || {},
      is_active: payload.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shippingMethodId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function deleteShippingMethod(shippingMethodId) {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("shipping_methods")
    .delete()
    .eq("id", shippingMethodId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function getTaxRules() {
  const { store } = await getStoreContext();
  const { data, error } = await supabase
    .from("tax_rules")
    .select("id, name, region_code, tax_rate, is_active, created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    name: item.name,
    regionCode: item.region_code,
    taxRate: Number(item.tax_rate || 0),
    isActive: Boolean(item.is_active),
    createdAt: item.created_at,
  }));
}

export async function createTaxRule(payload) {
  const { store } = await getStoreContext();
  const { error } = await supabase.from("tax_rules").insert({
    store_id: store.id,
    name: payload.name,
    region_code: payload.regionCode,
    tax_rate: Number(payload.taxRate || 0),
    is_active: payload.isActive ?? true,
  });

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function updateTaxRule(taxRuleId, payload) {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("tax_rules")
    .update({
      name: payload.name,
      region_code: payload.regionCode,
      tax_rate: Number(payload.taxRate || 0),
      is_active: payload.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taxRuleId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function deleteTaxRule(taxRuleId) {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("tax_rules")
    .delete()
    .eq("id", taxRuleId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function getTransactions() {
  const { store } = await getStoreContext();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, order_id, amount, currency_code, status, gateway_transaction_id, created_at, payment_methods(display_name), orders(order_number)",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    orderId: item.order_id,
    orderNumber: item.orders?.order_number || "-",
    paymentMethodName: item.payment_methods?.display_name || "-",
    amount: Number(item.amount || 0),
    currencyCode: item.currency_code,
    status: item.status,
    gatewayTransactionId: item.gateway_transaction_id || "",
    createdAt: item.created_at,
  }));
}

export async function updateTransactionStatus(transactionId, status) {
  const { authUser, store } = await getStoreContext();
  const { data: transaction, error } = await supabase
    .from("transactions")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transactionId)
    .eq("store_id", store.id)
    .select("id, order_id")
    .maybeSingle();

  if (error) {
    throw normalizeError(error);
  }

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  const nextPaymentStatus =
    status === "captured"
      ? "paid"
      : status === "authorized"
        ? "authorized"
        : status === "refunded"
          ? "refunded"
          : status === "failed"
            ? "failed"
            : "pending";

  const { error: orderError } = await supabase
    .from("orders")
    .update({
      payment_status: nextPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transaction.order_id)
    .eq("store_id", store.id);

  if (orderError) {
    throw normalizeError(orderError);
  }

  const { error: timelineError } = await supabase
    .from("order_timeline")
    .insert({
      order_id: transaction.order_id,
      status: status === "captured" ? "need_ship" : "not_paid",
      actor_type: "user",
      actor_id: authUser.id,
      note: `Payment updated to ${status}`,
    });

  if (timelineError) {
    throw normalizeError(timelineError);
  }

  return { ok: true };
}

export async function getShipments() {
  const { store } = await getStoreContext();
  const { data, error } = await supabase
    .from("shipments")
    .select(
      "id, order_id, tracking_number, carrier, status, shipping_cost, shipped_at, delivered_at, created_at, shipping_methods(name), orders(order_number)",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    orderId: item.order_id,
    orderNumber: item.orders?.order_number || "-",
    shippingMethodName: item.shipping_methods?.name || "-",
    trackingNumber: item.tracking_number || "",
    carrier: item.carrier || "",
    status: item.status,
    shippingCost: Number(item.shipping_cost || 0),
    shippedAt: item.shipped_at,
    deliveredAt: item.delivered_at,
    createdAt: item.created_at,
  }));
}

export async function createShipment(payload) {
  const { authUser, store } = await getStoreContext();
  const shippingMethods = await getShippingMethods();
  const shippingMethod = shippingMethods.find(
    (item) => item.id === payload.shippingMethodId,
  );
  const { data: shipment, error } = await supabase
    .from("shipments")
    .insert({
      store_id: store.id,
      order_id: payload.orderId,
      shipping_method_id: payload.shippingMethodId || null,
      tracking_number: payload.trackingNumber || null,
      carrier: payload.carrier || null,
      status: payload.status || "pending",
      shipping_cost: Number(
        shippingMethod?.baseRate || payload.shippingCost || 0,
      ),
      shipped_at:
        payload.status === "shipped" ? new Date().toISOString() : null,
      delivered_at:
        payload.status === "delivered" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeError(error);
  }

  const { data: orderItems, error: orderItemsError } = await supabase
    .from("order_items")
    .select("id, quantity")
    .eq("order_id", payload.orderId);

  if (orderItemsError) {
    throw normalizeError(orderItemsError);
  }

  if ((orderItems || []).length) {
    const { error: shipmentItemsError } = await supabase
      .from("shipment_items")
      .insert(
        orderItems.map((item) => ({
          shipment_id: shipment.id,
          order_item_id: item.id,
          quantity: item.quantity,
        })),
      );

    if (shipmentItemsError) {
      throw normalizeError(shipmentItemsError);
    }
  }

  const nextOrderStatus =
    payload.status === "delivered"
      ? "receive"
      : payload.status === "shipped"
        ? "ongoing_shipped"
        : "need_ship";

  const { error: orderError } = await supabase
    .from("orders")
    .update({
      status: nextOrderStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.orderId)
    .eq("store_id", store.id);

  if (orderError) {
    throw normalizeError(orderError);
  }

  const { error: timelineError } = await supabase
    .from("order_timeline")
    .insert({
      order_id: payload.orderId,
      status: nextOrderStatus,
      actor_type: "user",
      actor_id: authUser.id,
      note: `Shipment created with status ${payload.status || "pending"}`,
    });

  if (timelineError) {
    throw normalizeError(timelineError);
  }

  return { ok: true };
}

export async function updateShipmentStatus(shipmentId, status) {
  const { authUser, store } = await getStoreContext();
  const updates = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "shipped") {
    updates.shipped_at = new Date().toISOString();
  }
  if (status === "delivered") {
    updates.delivered_at = new Date().toISOString();
  }

  const { data: shipment, error } = await supabase
    .from("shipments")
    .update(updates)
    .eq("id", shipmentId)
    .eq("store_id", store.id)
    .select("id, order_id")
    .maybeSingle();

  if (error) {
    throw normalizeError(error);
  }

  if (!shipment) {
    throw new Error("Shipment not found");
  }

  const nextOrderStatus =
    status === "delivered"
      ? "receive"
      : status === "shipped"
        ? "ongoing_shipped"
        : "need_ship";

  const { error: orderError } = await supabase
    .from("orders")
    .update({ status: nextOrderStatus, updated_at: new Date().toISOString() })
    .eq("id", shipment.order_id)
    .eq("store_id", store.id);

  if (orderError) {
    throw normalizeError(orderError);
  }

  const { error: timelineError } = await supabase
    .from("order_timeline")
    .insert({
      order_id: shipment.order_id,
      status: nextOrderStatus,
      actor_type: "user",
      actor_id: authUser.id,
      note: `Shipment updated to ${status}`,
    });

  if (timelineError) {
    throw normalizeError(timelineError);
  }

  return { ok: true };
}

export async function getInvoices() {
  const { store } = await getStoreContext();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, order_id, invoice_number, subtotal, tax_amount, discount_amount, total, issued_at, orders(order_number)",
    )
    .eq("store_id", store.id)
    .order("issued_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    orderId: item.order_id,
    orderNumber: item.orders?.order_number || "-",
    invoiceNumber: item.invoice_number,
    subtotal: Number(item.subtotal || 0),
    taxAmount: Number(item.tax_amount || 0),
    discountAmount: Number(item.discount_amount || 0),
    total: Number(item.total || 0),
    issuedAt: item.issued_at,
  }));
}

export async function getReturns() {
  const { store } = await getStoreContext();
  const { data, error } = await supabase
    .from("returns")
    .select(
      "id, order_id, rma_number, reason, status, requested_at, orders(order_number)",
    )
    .eq("store_id", store.id)
    .order("requested_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    orderId: item.order_id,
    orderNumber: item.orders?.order_number || "-",
    rmaNumber: item.rma_number,
    reason: item.reason || "",
    status: item.status,
    requestedAt: item.requested_at,
  }));
}

export async function createReturnRequest(payload) {
  const { authUser, store } = await getStoreContext();
  const { data: returnRow, error } = await supabase
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
        }));

  const { error: returnItemsError } = await supabase
    .from("return_items")
    .insert(
      requestedItems.map((item) => ({
        return_id: returnRow.id,
        order_item_id: item.orderItemId,
        quantity: Number(item.quantity || 1),
        condition: item.condition || "opened",
      })),
    );

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
      note: "Return requested",
    });

  if (timelineError) {
    throw normalizeError(timelineError);
  }

  return { ok: true };
}

export async function updateReturnStatus(returnId, status) {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("returns")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", returnId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function getRefunds() {
  const { store } = await getStoreContext();
  const { data, error } = await supabase
    .from("refunds")
    .select(
      "id, return_id, transaction_id, amount, status, created_at, returns(rma_number)",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    returnId: item.return_id,
    transactionId: item.transaction_id,
    amount: Number(item.amount || 0),
    status: item.status,
    rmaNumber: item.returns?.rma_number || "-",
    createdAt: item.created_at,
  }));
}

export async function processRefund(payload) {
  const { authUser, store } = await getStoreContext();
  const { data: returnRow, error: returnError } = await supabase
    .from("returns")
    .select("id, order_id, status")
    .eq("id", payload.returnId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (returnError) {
    throw normalizeError(returnError);
  }

  if (!returnRow) {
    throw new Error("Return not found");
  }

  const { data: transaction } = await supabase
    .from("transactions")
    .select("id")
    .eq("order_id", returnRow.order_id)
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("refunds").insert({
    store_id: store.id,
    return_id: payload.returnId,
    transaction_id: transaction?.id || null,
    amount: Number(payload.amount || 0),
    status: "processed",
    gateway_refund_id: `refund-${Date.now().toString(36)}`,
  });

  if (error) {
    throw normalizeError(error);
  }

  const { error: returnUpdateError } = await supabase
    .from("returns")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("id", payload.returnId)
    .eq("store_id", store.id);

  if (returnUpdateError) {
    throw normalizeError(returnUpdateError);
  }

  if (transaction?.id) {
    const { error: transactionUpdateError } = await supabase
      .from("transactions")
      .update({ status: "refunded", updated_at: new Date().toISOString() })
      .eq("id", transaction.id)
      .eq("store_id", store.id);

    if (transactionUpdateError) {
      throw normalizeError(transactionUpdateError);
    }
  }

  const { error: orderError } = await supabase
    .from("orders")
    .update({
      payment_status: "refunded",
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
      note: "Refund processed",
    });

  if (timelineError) {
    throw normalizeError(timelineError);
  }

  return { ok: true };
}

export async function getCart() {
  const { store } = await getStoreContext();
  const cart = await ensureActiveCart(store.id);

  const { data: items, error } = await supabase
    .from("cart_items")
    .select(
      "id, quantity, unit_price, product_variants(id, sku, title, price, quantity_in_stock, products!inner(id, title, store_id, status))",
    )
    .eq("cart_id", cart.id)
    .eq("product_variants.products.store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  const normalizedItems = (items || []).map((item) => ({
    id: item.id,
    variantId: item.product_variants?.id,
    productId: item.product_variants?.products?.id,
    productName: item.product_variants?.products?.title || "-",
    variantTitle: item.product_variants?.title || "-",
    sku: item.product_variants?.sku || "-",
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unit_price || item.product_variants?.price || 0),
    stock: Number(item.product_variants?.quantity_in_stock || 0),
    lineTotal:
      Number(item.quantity || 0) *
      Number(item.unit_price || item.product_variants?.price || 0),
  }));

  const subtotal = normalizedItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0,
  );

  return {
    id: cart.id,
    status: cart.status,
    items: normalizedItems,
    subtotal: Number(subtotal.toFixed(2)),
  };
}

export async function addToCart(payload) {
  const { store } = await getStoreContext();
  const cart = await ensureActiveCart(store.id);

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select(
      "id, sku, title, price, quantity_in_stock, products!inner(id, title, store_id, status)",
    )
    .eq("id", payload.variantId)
    .eq("products.store_id", store.id)
    .maybeSingle();

  if (variantError) {
    throw normalizeError(variantError);
  }

  if (!variant) {
    throw new Error("Variant not found");
  }

  if (variant.products?.status !== "active") {
    throw new Error("Only active products can be added to cart");
  }

  const quantityToAdd = Math.max(1, Number(payload.quantity || 1));
  const { data: existing, error: existingError } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cart.id)
    .eq("product_variant_id", variant.id)
    .maybeSingle();

  if (existingError) {
    throw normalizeError(existingError);
  }

  const nextQuantity = Number(existing?.quantity || 0) + quantityToAdd;
  if (nextQuantity > Number(variant.quantity_in_stock || 0)) {
    throw new Error("Requested quantity exceeds current stock");
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("cart_items")
      .update({
        quantity: nextQuantity,
        unit_price: Number(variant.price || 0),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("cart_id", cart.id);

    if (updateError) {
      throw normalizeError(updateError);
    }
  } else {
    const { error: insertError } = await supabase.from("cart_items").insert({
      cart_id: cart.id,
      product_variant_id: variant.id,
      quantity: quantityToAdd,
      unit_price: Number(variant.price || 0),
    });

    if (insertError) {
      throw normalizeError(insertError);
    }
  }

  return getCart();
}

export async function updateCartItemQuantity(cartItemId, quantity) {
  const { store } = await getStoreContext();
  const nextQuantity = Number(quantity || 0);
  if (nextQuantity <= 0) {
    return removeCartItem(cartItemId);
  }

  const { data: item, error: itemError } = await supabase
    .from("cart_items")
    .select(
      "id, cart_id, product_variant_id, product_variants(quantity_in_stock), carts!inner(store_id)",
    )
    .eq("id", cartItemId)
    .eq("carts.store_id", store.id)
    .maybeSingle();

  if (itemError) {
    throw normalizeError(itemError);
  }

  if (!item) {
    throw new Error("Cart item not found");
  }

  if (nextQuantity > Number(item.product_variants?.quantity_in_stock || 0)) {
    throw new Error("Requested quantity exceeds current stock");
  }

  const { error: updateError } = await supabase
    .from("cart_items")
    .update({
      quantity: nextQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cartItemId);

  if (updateError) {
    throw normalizeError(updateError);
  }

  return getCart();
}

export async function removeCartItem(cartItemId) {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", cartItemId)
    .in(
      "cart_id",
      (await supabase
        .from("carts")
        .select("id")
        .eq("store_id", store.id)
        .then((result) => (result.data || []).map((row) => row.id))) || [],
    );

  if (error) {
    throw normalizeError(error);
  }

  return getCart();
}

export async function getCheckoutSnapshot() {
  const { store } = await getStoreContext();
  const [cart, discounts, paymentMethods, shippingMethods, taxRules] =
    await Promise.all([
      getCart(),
      getDiscounts("active"),
      getPaymentMethods(),
      getShippingMethods(),
      getTaxRules(),
    ]);

  return {
    store: mapStoreSummary(store),
    cart,
    discounts,
    paymentMethods: paymentMethods.filter((item) => item.isActive),
    shippingMethods: shippingMethods.filter((item) => item.isActive),
    taxRules: taxRules.filter((item) => item.isActive),
  };
}

export async function createOrderFromCart(payload) {
  const { authUser, store } = await getStoreContext();
  const cart = await getCart();

  if (!cart.items.length) {
    throw new Error("Cart is empty");
  }

  let customerId = null;
  if (payload.customerEmail || payload.customerName) {
    const [firstName, ...rest] = String(
      payload.customerName || "Guest Customer",
    ).split(" ");
    const lastName = rest.join(" ") || null;
    const { data: existingCustomer, error: customerLookupError } =
      await supabase
        .from("customers")
        .select("id")
        .eq("store_id", store.id)
        .eq("email", payload.customerEmail || "")
        .maybeSingle();

    if (customerLookupError) {
      throw normalizeError(customerLookupError);
    }

    if (existingCustomer?.id) {
      customerId = existingCustomer.id;
    } else {
      const { data: insertedCustomer, error: customerInsertError } =
        await supabase
          .from("customers")
          .insert({
            store_id: store.id,
            email: payload.customerEmail || null,
            first_name: firstName || "Guest",
            last_name: lastName,
            phone: payload.customerPhone || null,
          })
          .select("id")
          .single();

      if (customerInsertError) {
        throw normalizeError(customerInsertError);
      }

      customerId = insertedCustomer.id;
    }
  }

  let appliedDiscount = null;
  if (payload.discountCode) {
    const { data: discount, error: discountError } = await supabase
      .from("discounts")
      .select(
        "id, code, discount_type, value, min_purchase_amount, max_uses, uses_count, status, starts_at, ends_at",
      )
      .eq("store_id", store.id)
      .eq("code", payload.discountCode)
      .eq("status", "active")
      .maybeSingle();

    if (discountError) {
      throw normalizeError(discountError);
    }

    if (!discount) {
      throw new Error("Discount code not found or inactive");
    }

    const now = Date.now();
    if (discount.starts_at && new Date(discount.starts_at).getTime() > now) {
      throw new Error("Discount has not started yet");
    }
    if (discount.ends_at && new Date(discount.ends_at).getTime() < now) {
      throw new Error("Discount has expired");
    }
    if (
      discount.min_purchase_amount &&
      Number(cart.subtotal) < Number(discount.min_purchase_amount)
    ) {
      throw new Error("Cart subtotal does not meet discount minimum");
    }
    if (
      discount.max_uses !== null &&
      discount.max_uses !== undefined &&
      Number(discount.uses_count || 0) >= Number(discount.max_uses)
    ) {
      throw new Error("Discount usage limit reached");
    }

    appliedDiscount = discount;
  }

  const subtotalAmount = Number(cart.subtotal || 0);
  const discountAmount = calculateDiscountAmount(
    subtotalAmount,
    appliedDiscount,
  );
  const activeShippingMethods = await getShippingMethods();
  const selectedShippingMethod = activeShippingMethods.find(
    (item) => item.id === payload.shippingMethodId,
  );
  const paymentMethods = await getPaymentMethods();
  const selectedPaymentMethod = paymentMethods.find(
    (item) => item.id === payload.paymentMethodId,
  );
  const taxRules = await getTaxRules();
  const matchingTaxRule = taxRules.find(
    (item) =>
      item.isActive &&
      String(item.regionCode || "").toLowerCase() ===
        String(payload.country || "").toLowerCase(),
  );

  const shippingAmount = Number(
    selectedShippingMethod?.baseRate ?? payload.shippingAmount ?? 0,
  );
  const taxAmount = matchingTaxRule
    ? Number(
        (
          (subtotalAmount - discountAmount) *
          (matchingTaxRule.taxRate / 100)
        ).toFixed(2),
      )
    : Number(payload.taxAmount || 0);
  const totalAmount = Number(
    (subtotalAmount - discountAmount + shippingAmount + taxAmount).toFixed(2),
  );

  for (const item of cart.items) {
    if (item.quantity > item.stock) {
      throw new Error(`Insufficient stock for ${item.productName}`);
    }
  }

  const shippingAddress = {
    fullName: payload.customerName || "Guest Customer",
    email: payload.customerEmail || null,
    phone: payload.customerPhone || null,
    addressLine1: payload.addressLine1 || "",
    city: payload.city || "",
    postalCode: payload.postalCode || "",
    country: payload.country || "",
  };

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      store_id: store.id,
      customer_id: customerId,
      order_number: createOrderNumber(),
      status: "not_paid",
      payment_status: "pending",
      subtotal_amount: subtotalAmount,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      shipping_amount: shippingAmount,
      total_amount: totalAmount,
      currency_code: store.currency_code,
      note: payload.note || null,
      shipping_address: shippingAddress,
      billing_address: shippingAddress,
    })
    .select("id, order_number")
    .single();

  if (orderError) {
    throw normalizeError(orderError);
  }

  const { error: orderItemsError } = await supabase.from("order_items").insert(
    cart.items.map((item) => ({
      order_id: order.id,
      product_variant_id: item.variantId,
      product_title: item.productName,
      variant_title: item.variantTitle,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: Number((item.quantity * item.unitPrice).toFixed(2)),
    })),
  );

  if (orderItemsError) {
    throw normalizeError(orderItemsError);
  }

  if (selectedPaymentMethod) {
    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        store_id: store.id,
        order_id: order.id,
        payment_method_id: selectedPaymentMethod.id,
        amount: totalAmount,
        currency_code: store.currency_code,
        status:
          selectedPaymentMethod.provider === "manual"
            ? "authorized"
            : "pending",
        gateway_transaction_id: `txn-${Date.now().toString(36)}`,
        gateway_response: { provider: selectedPaymentMethod.provider },
      });

    if (transactionError) {
      throw normalizeError(transactionError);
    }
  }

  const { error: invoiceError } = await supabase.from("invoices").insert({
    store_id: store.id,
    order_id: order.id,
    invoice_number: createInvoiceNumber(),
    subtotal: subtotalAmount,
    tax_amount: taxAmount,
    discount_amount: discountAmount,
    total: totalAmount,
  });

  if (invoiceError) {
    throw normalizeError(invoiceError);
  }

  const { error: timelineError } = await supabase
    .from("order_timeline")
    .insert({
      order_id: order.id,
      status: "not_paid",
      actor_type: "user",
      actor_id: authUser.id,
      note: "Order created from checkout",
    });

  if (timelineError) {
    throw normalizeError(timelineError);
  }

  for (const item of cart.items) {
    const quantityBefore = Number(item.stock || 0);
    const quantityAfter = quantityBefore - Number(item.quantity || 0);
    const { error: stockError } = await supabase
      .from("product_variants")
      .update({
        quantity_in_stock: quantityAfter,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.variantId);

    if (stockError) {
      throw normalizeError(stockError);
    }

    const { error: movementError } = await supabase
      .from("inventory_movements")
      .insert({
        store_id: store.id,
        product_variant_id: item.variantId,
        movement_type: "sale",
        quantity_change: -Number(item.quantity || 0),
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        reason: `Order ${order.order_number}`,
      });

    if (movementError) {
      throw normalizeError(movementError);
    }
  }

  const { error: cartStatusError } = await supabase
    .from("carts")
    .update({
      status: "converted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", cart.id)
    .eq("store_id", store.id);

  if (cartStatusError) {
    throw normalizeError(cartStatusError);
  }

  if (appliedDiscount?.id) {
    const { error: discountUpdateError } = await supabase
      .from("discounts")
      .update({
        uses_count: Number(appliedDiscount.uses_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appliedDiscount.id)
      .eq("store_id", store.id);

    if (discountUpdateError) {
      throw normalizeError(discountUpdateError);
    }
  }

  await ensureActiveCart(store.id);

  return {
    id: order.id,
    orderNumber: order.order_number,
  };
}

export async function getOrderDetail(orderId) {
  const { store } = await getStoreContext();
  const [
    orderResponse,
    itemsResponse,
    timelineResponse,
    transactionsResponse,
    shipmentsResponse,
    invoiceResponse,
    returnsResponse,
    refundsResponse,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, order_number, status, payment_status, subtotal_amount, discount_amount, tax_amount, shipping_amount, total_amount, currency_code, note, shipping_address, billing_address, created_at, updated_at, customers(first_name, last_name, email, phone)",
      )
      .eq("store_id", store.id)
      .eq("id", orderId)
      .maybeSingle(),
    supabase
      .from("order_items")
      .select(
        "id, product_title, variant_title, sku, quantity, unit_price, line_total",
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("order_timeline")
      .select("id, status, note, actor_type, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select(
        "id, amount, currency_code, status, gateway_transaction_id, created_at, payment_methods(display_name)",
      )
      .eq("store_id", store.id)
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("shipments")
      .select(
        "id, tracking_number, carrier, status, shipping_cost, shipped_at, delivered_at, shipping_methods(name)",
      )
      .eq("store_id", store.id)
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, subtotal, tax_amount, discount_amount, total, issued_at",
      )
      .eq("store_id", store.id)
      .eq("order_id", orderId)
      .maybeSingle(),
    supabase
      .from("returns")
      .select("id, rma_number, reason, status, requested_at")
      .eq("store_id", store.id)
      .eq("order_id", orderId)
      .order("requested_at", { ascending: true }),
    supabase
      .from("refunds")
      .select("id, amount, status, created_at, returns!inner(order_id)")
      .eq("store_id", store.id)
      .eq("returns.order_id", orderId)
      .order("created_at", { ascending: true }),
  ]);

  if (orderResponse.error) {
    throw normalizeError(orderResponse.error);
  }
  if (itemsResponse.error) {
    throw normalizeError(itemsResponse.error);
  }
  if (timelineResponse.error) {
    throw normalizeError(timelineResponse.error);
  }
  if (transactionsResponse.error) {
    throw normalizeError(transactionsResponse.error);
  }
  if (shipmentsResponse.error) {
    throw normalizeError(shipmentsResponse.error);
  }
  if (invoiceResponse.error) {
    throw normalizeError(invoiceResponse.error);
  }
  if (returnsResponse.error) {
    throw normalizeError(returnsResponse.error);
  }
  if (refundsResponse.error) {
    throw normalizeError(refundsResponse.error);
  }

  if (!orderResponse.data) {
    throw new Error("Order not found");
  }

  const customer = Array.isArray(orderResponse.data.customers)
    ? orderResponse.data.customers[0]
    : orderResponse.data.customers;

  return {
    id: orderResponse.data.id,
    orderNumber: orderResponse.data.order_number,
    status: orderResponse.data.status,
    paymentStatus: orderResponse.data.payment_status,
    subtotalAmount: Number(orderResponse.data.subtotal_amount || 0),
    discountAmount: Number(orderResponse.data.discount_amount || 0),
    taxAmount: Number(orderResponse.data.tax_amount || 0),
    shippingAmount: Number(orderResponse.data.shipping_amount || 0),
    totalAmount: Number(orderResponse.data.total_amount || 0),
    currencyCode: orderResponse.data.currency_code,
    note: orderResponse.data.note || "",
    shippingAddress: orderResponse.data.shipping_address || {},
    billingAddress: orderResponse.data.billing_address || {},
    customerName:
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      orderResponse.data.shipping_address?.fullName ||
      "Guest Customer",
    customerEmail:
      customer?.email || orderResponse.data.shipping_address?.email || null,
    customerPhone:
      customer?.phone || orderResponse.data.shipping_address?.phone || null,
    createdAt: orderResponse.data.created_at,
    updatedAt: orderResponse.data.updated_at,
    items: (itemsResponse.data || []).map((item) => ({
      id: item.id,
      productTitle: item.product_title,
      variantTitle: item.variant_title,
      sku: item.sku,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unit_price || 0),
      lineTotal: Number(item.line_total || 0),
    })),
    timeline: (timelineResponse.data || []).map((item) => ({
      id: item.id,
      status: item.status,
      note: item.note || "",
      actorType: item.actor_type,
      createdAt: item.created_at,
    })),
    transactions: (transactionsResponse.data || []).map((item) => ({
      id: item.id,
      amount: Number(item.amount || 0),
      currencyCode: item.currency_code,
      status: item.status,
      gatewayTransactionId: item.gateway_transaction_id || "",
      paymentMethodName: item.payment_methods?.display_name || "-",
      createdAt: item.created_at,
    })),
    shipments: (shipmentsResponse.data || []).map((item) => ({
      id: item.id,
      trackingNumber: item.tracking_number || "",
      carrier: item.carrier || "",
      status: item.status,
      shippingCost: Number(item.shipping_cost || 0),
      shippingMethodName: item.shipping_methods?.name || "-",
      shippedAt: item.shipped_at,
      deliveredAt: item.delivered_at,
    })),
    invoice: invoiceResponse.data
      ? {
          id: invoiceResponse.data.id,
          invoiceNumber: invoiceResponse.data.invoice_number,
          subtotal: Number(invoiceResponse.data.subtotal || 0),
          taxAmount: Number(invoiceResponse.data.tax_amount || 0),
          discountAmount: Number(invoiceResponse.data.discount_amount || 0),
          total: Number(invoiceResponse.data.total || 0),
          issuedAt: invoiceResponse.data.issued_at,
        }
      : null,
    returns: (returnsResponse.data || []).map((item) => ({
      id: item.id,
      rmaNumber: item.rma_number,
      reason: item.reason || "",
      status: item.status,
      requestedAt: item.requested_at,
    })),
    refunds: (refundsResponse.data || []).map((item) => ({
      id: item.id,
      amount: Number(item.amount || 0),
      status: item.status,
      createdAt: item.created_at,
    })),
  };
}

export async function getOrders(status = "semua_orders") {
  const { store } = await getStoreContext();

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, total_amount, created_at, updated_at, customers(first_name, last_name)",
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
      paymentStatus: order.payment_status,
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

  const themeList = themes || [];
  const activeTheme =
    themeList.find((theme) => theme.is_published) || themeList[0];
  const settings = activeTheme?.config_json?.settings || {};

  return {
    id: store.id,
    storeName: store.name,
    handle: store.handle,
    description: store.description || "",
    currencyCode: store.currency_code,
    timezone: store.timezone,
    status: store.status,
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

export async function updateStoreProfile(payload) {
  const { store } = await getStoreContext();

  const updates = {
    name: payload.storeName,
    description: payload.description || null,
    currency_code: payload.currencyCode || "USD",
    timezone: payload.timezone || "UTC",
    status: payload.status || "active",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("stores")
    .update(updates)
    .eq("id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return getStoreProfile();
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

export async function updateStoreBranding(payload) {
  const { store } = await getStoreContext();
  const { data: themes, error: themeError } = await supabase
    .from("themes")
    .select("id, config_json, is_published")
    .eq("store_id", store.id)
    .order("created_at", { ascending: true });

  if (themeError) {
    throw normalizeError(themeError);
  }

  const themeList = themes || [];
  const activeTheme =
    themeList.find((item) => item.is_published) || themeList[0];
  if (!activeTheme) {
    throw new Error("No theme found for this store");
  }

  const nextConfig = {
    ...(activeTheme.config_json || {}),
    branding: {
      ...(activeTheme.config_json?.branding || {}),
      logoUrl: payload.logoUrl || "",
      primaryColor: payload.primaryColor || "#006c9c",
      accentColor: payload.accentColor || "#ffd566",
      headingFont: payload.headingFont || "Space Grotesk",
      bodyFont: payload.bodyFont || "Manrope",
    },
  };

  const { error: updateError } = await supabase
    .from("themes")
    .update({
      config_json: nextConfig,
      updated_at: new Date().toISOString(),
    })
    .eq("id", activeTheme.id)
    .eq("store_id", store.id);

  if (updateError) {
    throw normalizeError(updateError);
  }

  return {
    ok: true,
    branding: nextConfig.branding,
  };
}

export { supabase as api };
