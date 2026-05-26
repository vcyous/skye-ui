/**
 * storeService — Store bootstrap, profile, branding, and theme management
 *
 * Domain: Store
 * Feature: 02
 * Depends on: supabaseClient, utils/errorUtils, utils/slugUtils
 */

import { assertSupabaseConfigured, supabase } from "./supabaseClient";
import { isMissingTableError, normalizeError } from "./utils/errorUtils";
import { buildUniqueHandle } from "./utils/slugUtils";

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

function normalizeCustomerTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeArrayValue(value) {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeCustomerSegmentFilter(input) {
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

export async function resolveCollectionMembershipTable() {
  const probes = ["product_collections", "collection_products"];

  for (const tableName of probes) {
    const { error } = await supabase.from(tableName).select("id").limit(1);
    if (!error) {
      return tableName;
    }

    if (!isMissingTableError(error, tableName)) {
      throw normalizeError(error);
    }
  }

  throw new Error(
    "Collection membership table is missing. Run Feature 04 schema migration.",
  );
}

const INVENTORY_REASON_CODES = new Set([
  "manual_adjustment",
  "purchase",
  "sale",
  "return",
  "stock_take",
  "damage",
  "transfer",
  "import",
]);

export async function tableExists(tableName) {
  const { error } = await supabase.from(tableName).select("id").limit(1);
  if (!error) {
    return true;
  }

  if (isMissingTableError(error, tableName)) {
    return false;
  }

  throw normalizeError(error);
}

export async function resolveInventoryMovementTable() {
  if (await tableExists("stock_movements")) {
    return "stock_movements";
  }

  if (await tableExists("inventory_movements")) {
    return "inventory_movements";
  }

  throw new Error(
    "No stock movement table found. Run Feature 05 inventory migration.",
  );
}

export function normalizeInventoryReasonCode(value) {
  const normalized = String(value || "manual_adjustment")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (!INVENTORY_REASON_CODES.has(normalized)) {
    throw new Error(
      `Invalid reason code: ${value}. Allowed: ${[
        ...INVENTORY_REASON_CODES,
      ].join(", ")}`,
    );
  }

  return normalized;
}

export function toCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const next = String(value);
  if (!next.includes(",") && !next.includes('"') && !next.includes("\n")) {
    return next;
  }

  return `"${next.replace(/"/g, '""')}"`;
}

export function parseSimpleCsv(content) {
  const rows = String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!rows.length) {
    return { headers: [], records: [] };
  }

  const parseLine = (line) => {
    const output = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        output.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    output.push(current);
    return output.map((value) => value.trim());
  };

  const headers = parseLine(rows[0]).map((header) =>
    header.toLowerCase().replace(/\s+/g, "_"),
  );
  const records = rows.slice(1).map((row) => {
    const values = parseLine(row);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] || "";
      return acc;
    }, {});
  });

  return { headers, records };
}

export function mapPublicUser(authUser, profile) {
  return {
    id: authUser.id,
    name:
      profile?.full_name ||
      profile?.name ||
      authUser.user_metadata?.name ||
      authUser.user_metadata?.full_name ||
      authUser.email?.split("@")[0] ||
      "Store Owner",
    email: authUser.email,
    phone:
      profile?.phone_number ||
      profile?.phone ||
      authUser.user_metadata?.phone ||
      null,
    status: profile?.status || "active",
    createdAt: profile?.created_at || null,
    updatedAt: profile?.updated_at || null,
  };
}

export function mapStoreSummary(store) {
  if (!store) {
    return null;
  }

  return {
    id: store.id,
    name: store.name,
    handle: store.slug || store.handle,
    description: store.description,
    currencyCode: store.currency || store.currency_code,
    timezone: store.timezone,
    status: store.status,
    createdAt: store.created_at,
    updatedAt: store.updated_at,
    // NEW
    isPublished: store.is_published ?? false,
    subdomain: store.subdomain || null,
    onboardingCompletedAt: store.onboarding_completed_at || null,
  };
}

export function createOrderNumber() {
  return `SKY-${Date.now().toString(36).toUpperCase()}`;
}

export function createInvoiceNumber() {
  return `INV-${Date.now().toString(36).toUpperCase()}`;
}

export function createRmaNumber() {
  return `RMA-${Date.now().toString(36).toUpperCase()}`;
}

export async function getCurrentAuthUser() {
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
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw normalizeError(error);
  }

  return data;
}

function resolveProfileName(authUser, payload = {}) {
  return (
    payload.name ||
    payload.full_name ||
    authUser.user_metadata?.name ||
    authUser.user_metadata?.full_name ||
    authUser.email?.split("@")[0] ||
    "Store Owner"
  );
}

function resolveProfilePhone(authUser, payload = {}) {
  return (
    payload.phone ||
    payload.phone_number ||
    authUser.user_metadata?.phone ||
    null
  );
}

async function insertAppUser(insertPayload) {
  const { error } = await supabase.from("users").insert(insertPayload);
  if (!error || error.code === "23505") {
    return;
  }

  throw normalizeError(error);
}

async function findPrimaryStoreByOwner(userId) {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw normalizeError(error);
  }

  return data?.[0] || null;
}

async function insertPrimaryStore(userId, displayName) {
  const slug = buildUniqueHandle(displayName || "skye-store");
  const insertPayload = {
    user_id: userId,
    name: `${displayName || "Skye"} Store`,
    slug,
    subdomain: slug,
    description: "Default store profile",
    status: "active",
    currency: "IDR",
    timezone: "Asia/Jakarta",
  };

  const { data, error } = await supabase
    .from("stores")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    throw normalizeError(error);
  }

  return data;
}

export async function ensureAppUser(authUser, payload = {}) {
  const existing = await getAppUserById(authUser.id);
  if (existing) {
    return existing;
  }

  const insertPayload = {
    id: authUser.id,
    full_name: resolveProfileName(authUser, payload),
    email: authUser.email,
    phone_number: resolveProfilePhone(authUser, payload),
    status: "active",
  };

  await insertAppUser(insertPayload);

  return getAppUserById(authUser.id);
}

async function ensureThemes(storeId) {
  const { data, error } = await supabase
    .from("themes")
    .select("id")
    .eq("store_id", storeId)
    .limit(1);

  if (error) {
    if (isMissingTableError(error, "themes")) {
      return;
    }
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
    if (isMissingTableError(themeInsertError, "themes")) {
      return;
    }
    throw normalizeError(themeInsertError);
  }
}

export async function ensurePrimaryStore(authUser, profile) {
  let store = await findPrimaryStoreByOwner(authUser.id);

  if (!store) {
    const displayName =
      profile?.full_name ||
      profile?.name ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email;

    store = await insertPrimaryStore(authUser.id, displayName);
  }

  await ensureThemes(store.id);
  return store;
}

export async function getStoreContext() {
  const authUser = await getCurrentAuthUser();
  const profile = await ensureAppUser(authUser);
  const store = await ensurePrimaryStore(authUser, profile);
  return { authUser, profile, store };
}

export async function getStoreProfile() {
  const { authUser, profile, store } = await getStoreContext();

  const { data: themes, error: themeError } = await supabase
    .from("themes")
    .select("id, name, is_published, config_json, created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: true });

  if (themeError && !isMissingTableError(themeError, "themes")) {
    throw normalizeError(themeError);
  }

  const themeList = themeError ? [] : themes || [];
  const activeTheme =
    themeList.find((theme) => theme.is_published) || themeList[0];
  const storeSettings = store.settings || {};
  const themeBranding = activeTheme?.config_json?.branding || {};
  const fallbackBranding = storeSettings.branding || {};
  const branding = {
    logoUrl: themeBranding.logoUrl || fallbackBranding.logoUrl || "",
    primaryColor:
      themeBranding.primaryColor ||
      fallbackBranding.primaryColor ||
      store.primary_color ||
      "#006c9c",
    accentColor:
      themeBranding.accentColor || fallbackBranding.accentColor || "#ffd566",
    headingFont:
      themeBranding.headingFont ||
      fallbackBranding.headingFont ||
      "Space Grotesk",
    bodyFont: themeBranding.bodyFont || fallbackBranding.bodyFont || "Manrope",
  };

  return {
    id: store.id,
    storeName: store.name,
    slug: store.slug,
    description: store.description || "",
    currencyCode: store.currency || "IDR",
    timezone: store.timezone,
    locale: store.locale || "id",
    country: store.country || "ID",
    status: store.status,
    contactEmail: store.email || authUser.email,
    contactPhone:
      store.phone ||
      profile?.phone_number ||
      authUser.user_metadata?.phone ||
      "",
    address: store.address || "",
    city: store.city || "",
    province: store.province || "",
    postalCode: store.postal_code || "",
    ownerName:
      profile?.full_name ||
      profile?.name ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email ||
      "-",
    email: authUser.email,
    phone:
      profile?.phone_number ||
      profile?.phone ||
      authUser.user_metadata?.phone ||
      "-",
    activeTemplate: activeTheme?.name || "Aurora Classic",
    branding,
    createdAt: store.created_at,
    updatedAt: store.updated_at,
  };
}

export async function updateStoreProfile(payload) {
  const { store } = await getStoreContext();

  const updates = {
    name: payload.storeName,
    description: payload.description || null,
    currency: payload.currencyCode || "IDR",
    timezone: payload.timezone || "Asia/Jakarta",
    locale: payload.locale || "id",
    country: payload.country || "ID",
    status: payload.status || "active",
    email: payload.contactEmail || null,
    phone: payload.contactPhone || null,
    address: payload.address || null,
    city: payload.city || null,
    province: payload.province || null,
    postal_code: payload.postalCode || null,
    primary_color: payload.primaryColor || store.primary_color || "#006c9c",
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
    if (isMissingTableError(error, "themes")) {
      return [];
    }
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

  if (themeError && !isMissingTableError(themeError, "themes")) {
    throw normalizeError(themeError);
  }

  const normalizedBranding = {
    logoUrl: payload.logoUrl || "",
    primaryColor: payload.primaryColor || store.primary_color || "#006c9c",
    accentColor: payload.accentColor || "#ffd566",
    headingFont: payload.headingFont || "Space Grotesk",
    bodyFont: payload.bodyFont || "Manrope",
  };

  if (themeError && isMissingTableError(themeError, "themes")) {
    const { error: storeUpdateError } = await supabase
      .from("stores")
      .update({
        primary_color: normalizedBranding.primaryColor,
        settings: {
          ...(store.settings || {}),
          branding: normalizedBranding,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", store.id);

    if (storeUpdateError) {
      throw normalizeError(storeUpdateError);
    }

    return {
      ok: true,
      branding: normalizedBranding,
      persistedIn: "stores.settings",
    };
  }

  const themeList = themes || [];
  const activeTheme =
    themeList.find((item) => item.is_published) || themeList[0];
  if (!activeTheme) {
    const { error: storeUpdateError } = await supabase
      .from("stores")
      .update({
        primary_color: normalizedBranding.primaryColor,
        settings: {
          ...(store.settings || {}),
          branding: normalizedBranding,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", store.id);

    if (storeUpdateError) {
      throw normalizeError(storeUpdateError);
    }

    return {
      ok: true,
      branding: normalizedBranding,
      persistedIn: "stores.settings",
    };
  }

  const nextConfig = {
    ...(activeTheme.config_json || {}),
    branding: {
      ...(activeTheme.config_json?.branding || {}),
      ...normalizedBranding,
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

export async function completeOnboarding(payload) {
  const { authUser, store } = await getStoreContext();

  const { error: storeErr } = await supabase
    .from("stores")
    .update({
      name: payload.storeName,
      currency: payload.currency,
      timezone: payload.timezone,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", store.id)
    .eq("owner_id", authUser.id);

  if (storeErr) throw normalizeError(storeErr);

  const { error: themeErr } = await supabase
    .from("themes")
    .update({
      template_slug: payload.templateSlug,
      is_published: true,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", store.id)
    .eq("is_published", true);

  if (themeErr) throw normalizeError(themeErr);
}

export async function toggleStorePublish(publish) {
  const { authUser, store } = await getStoreContext();

  const { data, error } = await supabase
    .from("stores")
    .update({
      is_published: publish,
      updated_at: new Date().toISOString(),
    })
    .eq("id", store.id)
    .eq("owner_id", authUser.id)
    .select("subdomain")
    .single();

  if (error) throw normalizeError(error);
  return { subdomain: data.subdomain ?? null };
}
