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

function isMissingColumnError(err, columnName) {
  const message = String(err?.message || "").toLowerCase();
  const details = String(err?.details || "").toLowerCase();
  const target = String(columnName || "").toLowerCase();
  return (
    ((message.includes("column") && message.includes("does not exist")) ||
      (details.includes("column") && details.includes("does not exist"))) &&
    (message.includes(target) || details.includes(target))
  );
}

function isMissingTableError(err, tableName) {
  const message = String(err?.message || "").toLowerCase();
  const details = String(err?.details || "").toLowerCase();
  const hint = String(err?.hint || "").toLowerCase();
  const target = String(tableName || "").toLowerCase();
  return (
    (message.includes("could not find the table") ||
      message.includes("relation") ||
      details.includes("does not exist") ||
      hint.includes("schema cache")) &&
    (message.includes(target) || details.includes(target))
  );
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

function normalizeSeoHandle(value, fallback) {
  const normalized = slugify(value);
  if (normalized) {
    return normalized;
  }
  return buildUniqueHandle(fallback || "page");
}

function validateSeoMetadataFields(payload = {}) {
  const seoTitle = String(payload.seoTitle || "").trim();
  const seoDescription = String(payload.seoDescription || "").trim();
  const urlHandle = String(payload.urlHandle || payload.handle || "").trim();

  if (seoTitle.length > 70) {
    throw new Error("SEO title must be 70 characters or fewer");
  }

  if (seoDescription.length > 160) {
    throw new Error("SEO description must be 160 characters or fewer");
  }

  if (urlHandle && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugify(urlHandle))) {
    throw new Error(
      "URL handle must contain only lowercase letters, numbers, and hyphens",
    );
  }
}

async function assertUniqueHandle(tableName, storeId, handle, ignoreId = null) {
  const normalizedHandle = String(handle || "").trim();
  if (!normalizedHandle) {
    return;
  }

  let query = supabase
    .from(tableName)
    .select("id")
    .eq("store_id", storeId)
    .eq("handle", normalizedHandle)
    .limit(1);

  if (ignoreId) {
    query = query.neq("id", ignoreId);
  }

  const { data, error } = await query;
  if (error) {
    throw normalizeError(error);
  }

  if ((data || []).length > 0) {
    throw new Error(`URL handle '${normalizedHandle}' already exists`);
  }
}

const COLLECTION_RULE_FIELDS = new Set([
  "name",
  "title",
  "description",
  "vendor",
  "productType",
  "product_type",
  "status",
  "tags",
  "sku",
  "price",
  "stock",
  "quantity_in_stock",
]);

const COLLECTION_RULE_OPERATORS = new Set([
  "eq",
  "neq",
  "contains",
  "not_contains",
  "in",
  "not_in",
  "gt",
  "gte",
  "lt",
  "lte",
]);

function normalizeRuleSet(input) {
  if (!input || typeof input !== "object") {
    return null;
  }

  const match = input.match === "any" ? "any" : "all";
  const rawConditions = Array.isArray(input.conditions) ? input.conditions : [];
  const conditions = rawConditions
    .map((condition) => ({
      field: String(condition?.field || "").trim(),
      operator: String(condition?.operator || "").trim(),
      value: condition?.value,
    }))
    .filter((condition) => condition.field && condition.operator);

  return {
    match,
    conditions,
  };
}

function validateCollectionRules(input) {
  const normalized = normalizeRuleSet(input);
  if (!normalized) {
    return null;
  }

  if (normalized.conditions.length === 0) {
    throw new Error(
      "Smart collections require at least one valid rule condition",
    );
  }

  for (const condition of normalized.conditions) {
    if (!COLLECTION_RULE_FIELDS.has(condition.field)) {
      throw new Error(`Unsupported rule field: ${condition.field}`);
    }

    if (!COLLECTION_RULE_OPERATORS.has(condition.operator)) {
      throw new Error(`Unsupported rule operator: ${condition.operator}`);
    }

    if (
      String(condition.field).toLowerCase().includes("collection") ||
      String(condition.value || "")
        .toLowerCase()
        .includes("collection")
    ) {
      throw new Error("Recursive collection rule definitions are not allowed");
    }
  }

  return normalized;
}

function normalizeArrayValue(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function evaluateCondition(product, condition) {
  const fieldAliasMap = {
    title: "name",
    product_type: "productType",
    quantity_in_stock: "stock",
  };
  const sourceField = fieldAliasMap[condition.field] || condition.field;
  const sourceValue = product?.[sourceField];
  const operator = condition.operator;
  const expectedValue = condition.value;

  if (operator === "in") {
    const list = normalizeArrayValue(expectedValue).map((item) =>
      String(item).toLowerCase(),
    );
    return list.includes(String(sourceValue || "").toLowerCase());
  }

  if (operator === "not_in") {
    const list = normalizeArrayValue(expectedValue).map((item) =>
      String(item).toLowerCase(),
    );
    return !list.includes(String(sourceValue || "").toLowerCase());
  }

  if (operator === "contains") {
    if (Array.isArray(sourceValue)) {
      const sourceSet = sourceValue.map((item) => String(item).toLowerCase());
      return normalizeArrayValue(expectedValue)
        .map((item) => String(item).toLowerCase())
        .every((item) => sourceSet.includes(item));
    }

    return String(sourceValue || "")
      .toLowerCase()
      .includes(String(expectedValue || "").toLowerCase());
  }

  if (operator === "not_contains") {
    if (Array.isArray(sourceValue)) {
      const sourceSet = sourceValue.map((item) => String(item).toLowerCase());
      return normalizeArrayValue(expectedValue)
        .map((item) => String(item).toLowerCase())
        .every((item) => !sourceSet.includes(item));
    }

    return !String(sourceValue || "")
      .toLowerCase()
      .includes(String(expectedValue || "").toLowerCase());
  }

  if (["gt", "gte", "lt", "lte"].includes(operator)) {
    const left = Number(sourceValue || 0);
    const right = Number(expectedValue || 0);

    if (operator === "gt") return left > right;
    if (operator === "gte") return left >= right;
    if (operator === "lt") return left < right;
    return left <= right;
  }

  const left = String(sourceValue || "").toLowerCase();
  const right = String(expectedValue || "").toLowerCase();

  if (operator === "eq") {
    return left === right;
  }

  if (operator === "neq") {
    return left !== right;
  }

  return false;
}

function evaluateCollectionRuleMatch(product, ruleSet) {
  const normalized = normalizeRuleSet(ruleSet);
  if (!normalized || !normalized.conditions.length) {
    return false;
  }

  if (normalized.match === "any") {
    return normalized.conditions.some((condition) =>
      evaluateCondition(product, condition),
    );
  }

  return normalized.conditions.every((condition) =>
    evaluateCondition(product, condition),
  );
}

function normalizeCustomerTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
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

function evaluateCustomerSegmentFilter(customer, filterInput) {
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

async function resolveCollectionMembershipTable() {
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

async function tableExists(tableName) {
  const { error } = await supabase.from(tableName).select("id").limit(1);
  if (!error) {
    return true;
  }

  if (isMissingTableError(error, tableName)) {
    return false;
  }

  throw normalizeError(error);
}

async function resolveInventoryMovementTable() {
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

function normalizeInventoryReasonCode(value) {
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

function toCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const next = String(value);
  if (!next.includes(",") && !next.includes('"') && !next.includes("\n")) {
    return next;
  }

  return `"${next.replace(/"/g, '""')}"`;
}

function parseSimpleCsv(content) {
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

function mapPublicUser(authUser, profile) {
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

function mapStoreSummary(store) {
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
    .select("*")
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
    full_name:
      payload.name ||
      payload.full_name ||
      authUser.user_metadata?.name ||
      authUser.user_metadata?.full_name ||
      authUser.email?.split("@")[0] ||
      "Store Owner",
    email: authUser.email,
    phone_number:
      payload.phone ||
      payload.phone_number ||
      authUser.user_metadata?.phone ||
      null,
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
    // Feature may not be provisioned yet; don't block auth/store bootstrap.
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

async function ensurePrimaryStore(authUser, profile) {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw normalizeError(error);
  }

  let store = data[0] || null;

  if (!store) {
    const displayName =
      profile?.full_name ||
      profile?.name ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email;

    const { data: inserted, error: insertError } = await supabase
      .from("stores")
      .insert({
        user_id: authUser.id,
        name: `${displayName || "Skye"} Store`,
        slug: buildUniqueHandle(displayName || "skye-store"),
        description: "Default store profile",
        status: "active",
        currency: "IDR",
        timezone: "Asia/Jakarta",
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
  if (discount.discount_type === "buy_x_get_y") {
    const buyQty = Number(discount.buy_x_qty || 0);
    const getQty = Number(discount.buy_y_qty || 0);
    const lineCount = Number(discount.applicable_item_count || 0);
    if (!buyQty || !getQty || !lineCount) {
      return 0;
    }

    const groups = Math.floor(lineCount / (buyQty + getQty));
    const freeUnits = groups * getQty;
    const unitAmount = Number(discount.average_item_amount || 0);
    return Number((freeUnits * unitAmount).toFixed(2));
  }

  if (discount.discount_type === "percentage") {
    return Number(
      ((subtotalValue * Number(discount.value || 0)) / 100).toFixed(2),
    );
  }

  return Math.min(subtotalValue, Number(discount.value || 0));
}

function normalizeTaxBehavior(value) {
  const behavior = String(value || "exclusive")
    .trim()
    .toLowerCase();
  if (behavior === "inclusive" || behavior === "exclusive") {
    return behavior;
  }
  return "exclusive";
}

function resolveMatchingTaxRule(taxRules, country) {
  const region = String(country || "")
    .trim()
    .toLowerCase();

  const activeRules = (taxRules || []).filter((item) => item?.isActive);
  if (!activeRules.length) {
    return null;
  }

  const matched = activeRules
    .filter(
      (item) =>
        String(item.regionCode || "")
          .trim()
          .toLowerCase() === region,
    )
    .sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));

  if (matched.length) {
    return matched[0];
  }

  const defaultRule = activeRules
    .filter((item) => item.isDefault)
    .sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));

  return defaultRule[0] || null;
}

function resolveTaxPricing(input = {}) {
  const subtotalAmount = Number(input.subtotalAmount || 0);
  const discountAmount = Number(input.discountAmount || 0);
  const shippingAmount = Number(input.shippingAmount || 0);
  const taxableBase = Math.max(0, subtotalAmount - discountAmount);
  const taxRule = input.taxRule || null;

  if (!taxRule) {
    const taxAmount = Number(input.manualTaxAmount || 0);
    const totalAmount = Number(
      (taxableBase + shippingAmount + taxAmount).toFixed(2),
    );
    return {
      taxableAmount: Number(taxableBase.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount,
      taxBehavior: "exclusive",
      taxRate: 0,
      taxRuleId: null,
    };
  }

  const taxRate = Number(taxRule.taxRate || 0);
  const taxBehavior = normalizeTaxBehavior(taxRule.taxBehavior);
  let taxAmount = 0;
  let totalAmount = taxableBase + shippingAmount;

  if (taxBehavior === "inclusive") {
    if (taxRate > 0) {
      taxAmount = Number(
        (taxableBase - taxableBase / (1 + taxRate / 100)).toFixed(2),
      );
    }
  } else {
    taxAmount = Number(((taxableBase * taxRate) / 100).toFixed(2));
    totalAmount += taxAmount;
  }

  return {
    taxableAmount: Number(taxableBase.toFixed(2)),
    taxAmount,
    totalAmount: Number(totalAmount.toFixed(2)),
    taxBehavior,
    taxRate,
    taxRuleId: taxRule.id || null,
  };
}

function getDiscountColumnSet(useExtended = true) {
  if (!useExtended) {
    return "id, code, title, description, discount_type, value, min_purchase_amount, max_uses, uses_count, starts_at, ends_at, status, created_at";
  }

  return "id, code, title, description, discount_type, value, min_purchase_amount, max_uses, uses_count, starts_at, ends_at, status, stackable, priority, applies_to, scope_product_ids, scope_collection_ids, buy_x_qty, buy_y_qty, buy_x_product_id, get_y_product_id, campaign_id, created_at";
}

function normalizeCodeList(input) {
  if (Array.isArray(input)) {
    return [
      ...new Set(
        input.map((item) => String(item || "").trim()).filter(Boolean),
      ),
    ];
  }

  return [
    ...new Set(
      String(input || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function isWindowOverlapping(aStart, aEnd, bStart, bEnd) {
  const startA = aStart ? new Date(aStart).getTime() : Number.NEGATIVE_INFINITY;
  const endA = aEnd ? new Date(aEnd).getTime() : Number.POSITIVE_INFINITY;
  const startB = bStart ? new Date(bStart).getTime() : Number.NEGATIVE_INFINITY;
  const endB = bEnd ? new Date(bEnd).getTime() : Number.POSITIVE_INFINITY;
  return startA <= endB && startB <= endA;
}

function normalizeDiscountRecord(item = {}) {
  return {
    id: item.id,
    code: item.code,
    title: item.title,
    description: item.description || "",
    discount_type: item.discount_type,
    value: Number(item.value || 0),
    min_purchase_amount: item.min_purchase_amount,
    max_uses: item.max_uses,
    uses_count: Number(item.uses_count || 0),
    starts_at: item.starts_at,
    ends_at: item.ends_at,
    status: item.status,
    stackable: Boolean(item.stackable),
    priority: Number(item.priority || 100),
    applies_to: item.applies_to || "order",
    scope_product_ids: Array.isArray(item.scope_product_ids)
      ? item.scope_product_ids
      : [],
    scope_collection_ids: Array.isArray(item.scope_collection_ids)
      ? item.scope_collection_ids
      : [],
    buy_x_qty: item.buy_x_qty,
    buy_y_qty: item.buy_y_qty,
    buy_x_product_id: item.buy_x_product_id,
    get_y_product_id: item.get_y_product_id,
    campaign_id: item.campaign_id || null,
    created_at: item.created_at,
  };
}

function validateDiscountPayload(payload) {
  if (!payload.code || !payload.title) {
    throw new Error("Discount code and title are required");
  }

  const startTime = payload.startsAt
    ? new Date(payload.startsAt).getTime()
    : null;
  const endTime = payload.endsAt ? new Date(payload.endsAt).getTime() : null;
  if (startTime && endTime && startTime >= endTime) {
    throw new Error("End date must be after start date");
  }

  const discountType = payload.discountType;
  if (!["percentage", "fixed_amount", "buy_x_get_y"].includes(discountType)) {
    throw new Error("Unsupported discount type");
  }

  if (discountType === "percentage" && Number(payload.value) > 100) {
    throw new Error("Percentage discount cannot exceed 100");
  }

  if (Number(payload.value || 0) < 0) {
    throw new Error("Discount value must be zero or greater");
  }

  if (
    payload.maxUses !== undefined &&
    payload.maxUses !== null &&
    Number(payload.maxUses) < 1
  ) {
    throw new Error("Max uses must be at least 1");
  }

  if (discountType === "buy_x_get_y") {
    if (!Number(payload.buyXQty || 0) || !Number(payload.buyYQty || 0)) {
      throw new Error("Buy X Get Y requires buy and get quantities");
    }
  }
}

async function listDiscountRows(storeId, status = "all") {
  let query = supabase
    .from("discounts")
    .select(getDiscountColumnSet(true))
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  let { data, error } = await query;

  if (error && isMissingColumnError(error, "stackable")) {
    let fallbackQuery = supabase
      .from("discounts")
      .select(getDiscountColumnSet(false))
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (status !== "all") {
      fallbackQuery = fallbackQuery.eq("status", status);
    }

    const fallback = await fallbackQuery;
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => normalizeDiscountRecord(item));
}

function resolveApplicableDiscounts(discounts, options = {}) {
  const now = options.now || Date.now();
  const subtotal = Number(options.subtotal || 0);
  const codes = normalizeCodeList(options.codes);
  const cartItemCount = Number(options.cartItemCount || 0);
  const averageItemAmount =
    cartItemCount > 0 ? Number((subtotal / cartItemCount).toFixed(2)) : 0;

  let candidates = discounts.filter((discount) => discount.status === "active");

  if (codes.length) {
    const targetCodes = new Set(codes.map((code) => code.toLowerCase()));
    candidates = candidates.filter((discount) =>
      targetCodes.has(String(discount.code || "").toLowerCase()),
    );
  }

  candidates = candidates.filter((discount) => {
    if (discount.starts_at && new Date(discount.starts_at).getTime() > now) {
      return false;
    }
    if (discount.ends_at && new Date(discount.ends_at).getTime() < now) {
      return false;
    }
    if (
      discount.min_purchase_amount &&
      subtotal < Number(discount.min_purchase_amount)
    ) {
      return false;
    }
    if (
      discount.max_uses !== null &&
      discount.max_uses !== undefined &&
      Number(discount.uses_count || 0) >= Number(discount.max_uses)
    ) {
      return false;
    }
    return true;
  });

  const withAmounts = candidates.map((discount) => {
    const amount = calculateDiscountAmount(subtotal, {
      ...discount,
      applicable_item_count: cartItemCount,
      average_item_amount: averageItemAmount,
    });
    return {
      ...discount,
      calculated_amount: Number(amount || 0),
    };
  });

  if (!withAmounts.length) {
    return { applied: [], rejected: [] };
  }

  const sorted = withAmounts.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return Number(b.calculated_amount || 0) - Number(a.calculated_amount || 0);
  });

  const nonStackable = sorted.filter((item) => !item.stackable);
  const stackable = sorted.filter((item) => item.stackable);

  if (nonStackable.length) {
    const winner = nonStackable.sort(
      (a, b) =>
        Number(b.calculated_amount || 0) - Number(a.calculated_amount || 0),
    )[0];
    const rejected = sorted
      .filter((item) => item.id !== winner.id)
      .map((item) => ({
        id: item.id,
        code: item.code,
        reason: "Overlapping promotion blocked by non-stackable rule",
      }));
    return { applied: [winner], rejected };
  }

  return {
    applied: stackable,
    rejected: [],
  };
}

async function assertNoDiscountOverlapConflict(
  storeId,
  payload,
  ignoreDiscountId = null,
) {
  const discounts = await listDiscountRows(storeId, "all");
  const normalizedCode = String(payload.code || "")
    .trim()
    .toLowerCase();
  const currentStatus = payload.status || "draft";
  const stackable = Boolean(payload.stackable);

  const conflicts = discounts.filter((item) => {
    if (ignoreDiscountId && item.id === ignoreDiscountId) {
      return false;
    }
    if (
      String(item.code || "")
        .trim()
        .toLowerCase() !== normalizedCode
    ) {
      return false;
    }

    if (currentStatus !== "active" || item.status !== "active") {
      return false;
    }

    if (stackable && item.stackable) {
      return false;
    }

    return isWindowOverlapping(
      payload.startsAt,
      payload.endsAt,
      item.starts_at,
      item.ends_at,
    );
  });

  if (conflicts.length) {
    throw new Error(
      `Promotion overlap conflict with ${conflicts[0].code}. Disable stackability or adjust active windows.`,
    );
  }
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
        full_name: payload.name,
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

  const hasSession = Boolean(data.session?.access_token);

  // When email confirmation is required, there is no active session yet.
  // Defer profile/store bootstrap until first successful login.
  if (!hasSession) {
    return {
      user: null,
      store: null,
      accessToken: null,
      refreshToken: null,
      requiresEmailVerification: true,
    };
  }

  const profile = await ensureAppUser(data.user, payload);
  const store = await ensurePrimaryStore(data.user, profile);

  return {
    user: mapPublicUser(data.user, profile),
    store: mapStoreSummary(store),
    accessToken: data.session?.access_token || null,
    refreshToken: data.session?.refresh_token || null,
    requiresEmailVerification: false,
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
    full_name: payload.name,
    phone_number: payload.phone || null,
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

function startOfUtcDay(value = new Date()) {
  const source = new Date(value);
  return new Date(
    Date.UTC(
      source.getUTCFullYear(),
      source.getUTCMonth(),
      source.getUTCDate(),
    ),
  );
}

function addUtcDays(value, days) {
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

function calculateDeltaPercent(currentValue, previousValue) {
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

async function invalidateAnalyticsReportCache(storeId, reportType = null) {
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

export async function getProducts(status = "all") {
  const { store } = await getStoreContext();

  let query = supabase
    .from("products")
    .select(
      "id, title, handle, description, tags, vendor, product_type, seo_title, seo_description, media_urls, status, created_at, updated_at, product_variants(id, sku, price, compare_at_price, cost_price, price_start_at, price_end_at, quantity_in_stock, created_at)",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  let { data, error } = await query;

  if (error && isMissingColumnError(error, "vendor")) {
    let fallbackQuery = supabase
      .from("products")
      .select(
        "id, title, handle, description, tags, status, created_at, updated_at, product_variants(id, sku, price, compare_at_price, cost_price, price_start_at, price_end_at, quantity_in_stock, created_at)",
      )
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      fallbackQuery = fallbackQuery.eq("status", status);
    }

    const fallbackResult = await fallbackQuery;
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error && isMissingColumnError(error, "price_start_at")) {
    let fallbackQuery = supabase
      .from("products")
      .select(
        "id, title, handle, description, tags, vendor, product_type, seo_title, seo_description, media_urls, status, created_at, updated_at, product_variants(id, sku, price, compare_at_price, cost_price, quantity_in_stock, created_at)",
      )
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      fallbackQuery = fallbackQuery.eq("status", status);
    }

    const fallbackResult = await fallbackQuery;
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((product) => {
    const variants = Array.isArray(product.product_variants)
      ? product.product_variants
      : [];
    const primaryVariant = variants[0] || null;

    const priceWindowStart = primaryVariant?.price_start_at || null;
    const priceWindowEnd = primaryVariant?.price_end_at || null;
    const now = Date.now();
    const isPriceWindowActive =
      (!priceWindowStart || new Date(priceWindowStart).getTime() <= now) &&
      (!priceWindowEnd || new Date(priceWindowEnd).getTime() >= now);

    return {
      id: product.id,
      name: product.title,
      urlHandle: product.handle || "",
      description: product.description || "",
      tags: Array.isArray(product.tags) ? product.tags : [],
      variantId: primaryVariant?.id || null,
      sku: primaryVariant?.sku || "-",
      price: Number(primaryVariant?.price || 0),
      compareAtPrice: primaryVariant?.compare_at_price,
      costPrice: primaryVariant?.cost_price,
      priceStartAt: priceWindowStart,
      priceEndAt: priceWindowEnd,
      isPriceWindowActive,
      quantity_in_stock: Number(primaryVariant?.quantity_in_stock || 0),
      stock: Number(primaryVariant?.quantity_in_stock || 0),
      status: product.status,
      vendor: product.vendor || null,
      productType: product.product_type || null,
      seoTitle: product.seo_title || "",
      seoDescription: product.seo_description || "",
      mediaUrls: Array.isArray(product.media_urls) ? product.media_urls : [],
      rating: null,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  });
}

export async function createProduct(payload) {
  const { store } = await getStoreContext();
  validateSeoMetadataFields(payload);

  const tags = Array.isArray(payload.tags)
    ? payload.tags
    : String(payload.tags || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const normalizedSku = String(payload.sku || "").trim();

  const { data: existingVariant, error: existingVariantError } = await supabase
    .from("product_variants")
    .select("id, sku, products!inner(id, store_id)")
    .eq("sku", normalizedSku)
    .eq("products.store_id", store.id)
    .limit(1)
    .maybeSingle();

  if (existingVariantError) {
    throw normalizeError(existingVariantError);
  }

  if (existingVariant) {
    const skuError = new Error("SKU already exists in this store");
    skuError.code = "SKU_CONFLICT";
    throw skuError;
  }

  const productHandle = normalizeSeoHandle(payload.urlHandle, payload.name);
  await assertUniqueHandle("products", store.id, productHandle);

  const productInsertPayload = {
    store_id: store.id,
    title: payload.name,
    handle: productHandle,
    description: payload.description || null,
    status: payload.status || "draft",
    tags,
    vendor: payload.vendor || null,
    product_type: payload.productType || null,
    seo_title: payload.seoTitle || null,
    seo_description: payload.seoDescription || null,
    media_urls: Array.isArray(payload.mediaUrls) ? payload.mediaUrls : [],
  };

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert(productInsertPayload)
    .select("id, title, description, tags, status, created_at, updated_at")
    .single();

  if (productError && isMissingColumnError(productError, "vendor")) {
    const { data: fallbackProduct, error: fallbackProductError } =
      await supabase
        .from("products")
        .insert({
          store_id: store.id,
          title: payload.name,
          handle: productHandle,
          description: payload.description || null,
          status: payload.status || "draft",
          tags,
        })
        .select("id, title, description, tags, status, created_at, updated_at")
        .single();

    if (fallbackProductError) {
      throw normalizeError(fallbackProductError);
    }

    const { data: variant, error: variantError } = await supabase
      .from("product_variants")
      .insert({
        product_id: fallbackProduct.id,
        sku: normalizedSku,
        title: `${payload.name} Default`,
        price: Number(payload.price),
        compare_at_price:
          payload.compareAtPrice === undefined ||
          payload.compareAtPrice === null
            ? null
            : Number(payload.compareAtPrice),
        cost_price:
          payload.costPrice === undefined || payload.costPrice === null
            ? null
            : Number(payload.costPrice),
        quantity_in_stock: Number(payload.stock),
      })
      .select("id, sku, price, compare_at_price, cost_price, quantity_in_stock")
      .single();

    if (variantError) {
      throw normalizeError(variantError);
    }

    return {
      id: fallbackProduct.id,
      name: fallbackProduct.title,
      urlHandle: productHandle,
      description: fallbackProduct.description || "",
      tags,
      variantId: variant.id,
      sku: variant.sku,
      price: Number(variant.price),
      compareAtPrice: variant.compare_at_price,
      costPrice: variant.cost_price,
      priceStartAt: null,
      priceEndAt: null,
      quantity_in_stock: Number(variant.quantity_in_stock),
      stock: Number(variant.quantity_in_stock),
      status: fallbackProduct.status,
      vendor: payload.vendor || null,
      productType: payload.productType || null,
      seoTitle: payload.seoTitle || "",
      seoDescription: payload.seoDescription || "",
      mediaUrls: Array.isArray(payload.mediaUrls) ? payload.mediaUrls : [],
      rating: null,
      created_at: fallbackProduct.created_at,
      updated_at: fallbackProduct.updated_at,
    };
  }

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
      compare_at_price:
        payload.compareAtPrice === undefined || payload.compareAtPrice === null
          ? null
          : Number(payload.compareAtPrice),
      cost_price:
        payload.costPrice === undefined || payload.costPrice === null
          ? null
          : Number(payload.costPrice),
      price_start_at: payload.priceStartAt || null,
      price_end_at: payload.priceEndAt || null,
      quantity_in_stock: Number(payload.stock),
    })
    .select(
      "id, sku, price, compare_at_price, cost_price, price_start_at, price_end_at, quantity_in_stock",
    )
    .single();

  if (variantError && isMissingColumnError(variantError, "price_start_at")) {
    const { data: fallbackVariant, error: fallbackVariantError } =
      await supabase
        .from("product_variants")
        .insert({
          product_id: product.id,
          sku: payload.sku,
          title: `${payload.name} Default`,
          price: Number(payload.price),
          compare_at_price:
            payload.compareAtPrice === undefined ||
            payload.compareAtPrice === null
              ? null
              : Number(payload.compareAtPrice),
          cost_price:
            payload.costPrice === undefined || payload.costPrice === null
              ? null
              : Number(payload.costPrice),
          quantity_in_stock: Number(payload.stock),
        })
        .select(
          "id, sku, price, compare_at_price, cost_price, quantity_in_stock",
        )
        .single();

    if (fallbackVariantError) {
      throw normalizeError(fallbackVariantError);
    }

    return {
      id: product.id,
      name: product.title,
      description: product.description || "",
      tags,
      variantId: fallbackVariant.id,
      sku: fallbackVariant.sku,
      price: Number(fallbackVariant.price),
      compareAtPrice: fallbackVariant.compare_at_price,
      costPrice: fallbackVariant.cost_price,
      priceStartAt: null,
      priceEndAt: null,
      quantity_in_stock: Number(fallbackVariant.quantity_in_stock),
      stock: Number(fallbackVariant.quantity_in_stock),
      status: product.status,
      rating: null,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  }

  if (variantError) {
    throw normalizeError(variantError);
  }

  return {
    id: product.id,
    name: product.title,
    urlHandle: productHandle,
    description: product.description || "",
    tags,
    variantId: variant.id,
    sku: variant.sku,
    price: Number(variant.price),
    compareAtPrice: variant.compare_at_price,
    costPrice: variant.cost_price,
    priceStartAt: variant.price_start_at || null,
    priceEndAt: variant.price_end_at || null,
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
  validateSeoMetadataFields(payload);

  const tags = Array.isArray(payload.tags)
    ? payload.tags
    : String(payload.tags || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const normalizedSku = String(payload.sku || "").trim();

  const { data: existingVariant, error: existingVariantError } = await supabase
    .from("product_variants")
    .select("id, sku, product_id, products!inner(id, store_id)")
    .eq("sku", normalizedSku)
    .eq("products.store_id", store.id)
    .neq("product_id", productId)
    .limit(1)
    .maybeSingle();

  if (existingVariantError) {
    throw normalizeError(existingVariantError);
  }

  if (existingVariant) {
    const skuError = new Error("SKU already exists in this store");
    skuError.code = "SKU_CONFLICT";
    throw skuError;
  }

  const productHandle = normalizeSeoHandle(payload.urlHandle, payload.name);
  await assertUniqueHandle("products", store.id, productHandle, productId);

  const productUpdatePayload = {
    title: payload.name,
    handle: productHandle,
    description: payload.description || null,
    status: payload.status || "draft",
    tags,
    vendor: payload.vendor || null,
    product_type: payload.productType || null,
    seo_title: payload.seoTitle || null,
    seo_description: payload.seoDescription || null,
    media_urls: Array.isArray(payload.mediaUrls) ? payload.mediaUrls : [],
    updated_at: new Date().toISOString(),
  };

  const { data: product, error: productError } = await supabase
    .from("products")
    .update(productUpdatePayload)
    .eq("id", productId)
    .eq("store_id", store.id)
    .select("id, title, description, status, tags, created_at, updated_at")
    .single();

  if (productError && isMissingColumnError(productError, "vendor")) {
    const { data: fallbackProduct, error: fallbackProductError } =
      await supabase
        .from("products")
        .update({
          title: payload.name,
          handle: productHandle,
          description: payload.description || null,
          status: payload.status || "draft",
          tags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId)
        .eq("store_id", store.id)
        .select("id, title, description, status, tags, created_at, updated_at")
        .single();

    if (fallbackProductError) {
      throw normalizeError(fallbackProductError);
    }

    const { data: variant, error: variantError } = await supabase
      .from("product_variants")
      .update({
        sku: normalizedSku,
        price: Number(payload.price),
        compare_at_price:
          payload.compareAtPrice === undefined ||
          payload.compareAtPrice === null
            ? null
            : Number(payload.compareAtPrice),
        cost_price:
          payload.costPrice === undefined || payload.costPrice === null
            ? null
            : Number(payload.costPrice),
        quantity_in_stock: Number(payload.stock),
        updated_at: new Date().toISOString(),
      })
      .eq("product_id", fallbackProduct.id)
      .select("id, sku, price, compare_at_price, cost_price, quantity_in_stock")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (variantError) {
      throw normalizeError(variantError);
    }

    return {
      id: fallbackProduct.id,
      name: fallbackProduct.title,
      urlHandle: productHandle,
      description: fallbackProduct.description || "",
      tags: Array.isArray(fallbackProduct.tags) ? fallbackProduct.tags : [],
      variantId: variant.id,
      sku: variant.sku,
      price: Number(variant.price),
      compareAtPrice: variant.compare_at_price,
      costPrice: variant.cost_price,
      priceStartAt: null,
      priceEndAt: null,
      quantity_in_stock: Number(variant.quantity_in_stock),
      stock: Number(variant.quantity_in_stock),
      status: fallbackProduct.status,
      vendor: payload.vendor || null,
      productType: payload.productType || null,
      seoTitle: payload.seoTitle || "",
      seoDescription: payload.seoDescription || "",
      mediaUrls: Array.isArray(payload.mediaUrls) ? payload.mediaUrls : [],
      rating: null,
      created_at: fallbackProduct.created_at,
      updated_at: fallbackProduct.updated_at,
    };
  }

  if (productError) {
    throw normalizeError(productError);
  }

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .update({
      sku: normalizedSku,
      price: Number(payload.price),
      compare_at_price:
        payload.compareAtPrice === undefined || payload.compareAtPrice === null
          ? null
          : Number(payload.compareAtPrice),
      cost_price:
        payload.costPrice === undefined || payload.costPrice === null
          ? null
          : Number(payload.costPrice),
      price_start_at: payload.priceStartAt || null,
      price_end_at: payload.priceEndAt || null,
      quantity_in_stock: Number(payload.stock),
      updated_at: new Date().toISOString(),
    })
    .eq("product_id", product.id)
    .select(
      "id, sku, price, compare_at_price, cost_price, price_start_at, price_end_at, quantity_in_stock",
    )
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (variantError && isMissingColumnError(variantError, "price_start_at")) {
    const { data: fallbackVariant, error: fallbackVariantError } =
      await supabase
        .from("product_variants")
        .update({
          sku: normalizedSku,
          price: Number(payload.price),
          compare_at_price:
            payload.compareAtPrice === undefined ||
            payload.compareAtPrice === null
              ? null
              : Number(payload.compareAtPrice),
          cost_price:
            payload.costPrice === undefined || payload.costPrice === null
              ? null
              : Number(payload.costPrice),
          quantity_in_stock: Number(payload.stock),
          updated_at: new Date().toISOString(),
        })
        .eq("product_id", product.id)
        .select(
          "id, sku, price, compare_at_price, cost_price, quantity_in_stock",
        )
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

    if (fallbackVariantError) {
      throw normalizeError(fallbackVariantError);
    }

    return {
      id: product.id,
      name: product.title,
      description: product.description || "",
      tags: Array.isArray(product.tags) ? product.tags : [],
      variantId: fallbackVariant.id,
      sku: fallbackVariant.sku,
      price: Number(fallbackVariant.price),
      compareAtPrice: fallbackVariant.compare_at_price,
      costPrice: fallbackVariant.cost_price,
      priceStartAt: null,
      priceEndAt: null,
      quantity_in_stock: Number(fallbackVariant.quantity_in_stock),
      stock: Number(fallbackVariant.quantity_in_stock),
      status: product.status,
      vendor: payload.vendor || null,
      productType: payload.productType || null,
      seoTitle: payload.seoTitle || "",
      seoDescription: payload.seoDescription || "",
      mediaUrls: Array.isArray(payload.mediaUrls) ? payload.mediaUrls : [],
      rating: null,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  }

  if (variantError) {
    throw normalizeError(variantError);
  }

  return {
    id: product.id,
    name: product.title,
    urlHandle: productHandle,
    description: product.description || "",
    tags: Array.isArray(product.tags) ? product.tags : [],
    variantId: variant.id,
    sku: variant.sku,
    price: Number(variant.price),
    compareAtPrice: variant.compare_at_price,
    costPrice: variant.cost_price,
    priceStartAt: variant.price_start_at || null,
    priceEndAt: variant.price_end_at || null,
    quantity_in_stock: Number(variant.quantity_in_stock),
    stock: Number(variant.quantity_in_stock),
    status: product.status,
    vendor: payload.vendor || null,
    productType: payload.productType || null,
    seoTitle: payload.seoTitle || "",
    seoDescription: payload.seoDescription || "",
    mediaUrls: Array.isArray(payload.mediaUrls) ? payload.mediaUrls : [],
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

export async function bulkUpdateProductStatus(productIds, nextStatus) {
  const { store } = await getStoreContext();
  const ids = Array.isArray(productIds) ? productIds.filter(Boolean) : [];

  if (!ids.length) {
    return { ok: true, updatedCount: 0 };
  }

  const { data, error } = await supabase
    .from("products")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", store.id)
    .in("id", ids)
    .select("id");

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true, updatedCount: (data || []).length };
}

export async function bulkDeleteProducts(productIds) {
  const { store } = await getStoreContext();
  const ids = Array.isArray(productIds) ? productIds.filter(Boolean) : [];

  if (!ids.length) {
    return { ok: true, deletedCount: 0 };
  }

  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("store_id", store.id)
    .in("id", ids)
    .select("id");

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true, deletedCount: (data || []).length };
}

export async function getCollections(filters = {}) {
  const { store } = await getStoreContext();
  const membershipTable = await resolveCollectionMembershipTable();

  let query = supabase
    .from("collections")
    .select(
      "id, name, handle, description, status, collection_type, rule_json, seo_title, seo_description, created_at",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.collectionType && filters.collectionType !== "all") {
    query = query.eq("collection_type", filters.collectionType);
  }

  let { data, error } = await query;

  if (error && isMissingColumnError(error, "seo_title")) {
    let fallbackQuery = supabase
      .from("collections")
      .select(
        "id, name, handle, description, status, collection_type, rule_json, created_at",
      )
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (filters.status && filters.status !== "all") {
      fallbackQuery = fallbackQuery.eq("status", filters.status);
    }

    if (filters.collectionType && filters.collectionType !== "all") {
      fallbackQuery = fallbackQuery.eq(
        "collection_type",
        filters.collectionType,
      );
    }

    const fallback = await fallbackQuery;
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  const list = data || [];
  const collectionIds = list.map((item) => item.id);

  let linksByCollection = new Map();
  if (collectionIds.length) {
    const { data: links, error: linksError } = await supabase
      .from(membershipTable)
      .select("collection_id, product_id")
      .in("collection_id", collectionIds);

    if (linksError) {
      throw normalizeError(linksError);
    }

    linksByCollection = (links || []).reduce((acc, link) => {
      const bucket = acc.get(link.collection_id) || [];
      bucket.push(link.product_id);
      acc.set(link.collection_id, bucket);
      return acc;
    }, new Map());
  }

  const products = await getProducts("all");

  let normalizedList = list.map((item) => {
    const rules = normalizeRuleSet(item.rule_json);
    const manualProductIds = linksByCollection.get(item.id) || [];
    const evaluatedProductIds =
      item.collection_type === "smart" && rules?.conditions?.length
        ? products
            .filter((product) => evaluateCollectionRuleMatch(product, rules))
            .map((product) => product.id)
        : manualProductIds;

    return {
      id: item.id,
      name: item.name,
      urlHandle: item.handle || "",
      description: item.description || "",
      status: item.status,
      collectionType: item.collection_type,
      seoTitle: item.seo_title || "",
      seoDescription: item.seo_description || "",
      rules,
      productIds: evaluatedProductIds,
      productCount: evaluatedProductIds.length,
      createdAt: item.created_at,
    };
  });

  if (filters.search) {
    const keyword = String(filters.search).trim().toLowerCase();
    normalizedList = normalizedList.filter((item) =>
      [item.name, item.description].join(" ").toLowerCase().includes(keyword),
    );
  }

  return normalizedList;
}

export async function createCollection(payload) {
  const { store } = await getStoreContext();
  const membershipTable = await resolveCollectionMembershipTable();
  validateSeoMetadataFields(payload);
  const isSmart = (payload.collectionType || "manual") === "smart";
  const validatedRules = isSmart
    ? validateCollectionRules(payload.rules)
    : null;
  const collectionHandle = normalizeSeoHandle(payload.urlHandle, payload.name);
  await assertUniqueHandle("collections", store.id, collectionHandle);

  let { data, error } = await supabase
    .from("collections")
    .insert({
      store_id: store.id,
      name: payload.name,
      handle: collectionHandle,
      description: payload.description || null,
      collection_type: payload.collectionType || "manual",
      rule_json: validatedRules,
      seo_title: payload.seoTitle || null,
      seo_description: payload.seoDescription || null,
      status: payload.status || "draft",
    })
    .select("id")
    .single();

  if (error && isMissingColumnError(error, "seo_title")) {
    const fallback = await supabase
      .from("collections")
      .insert({
        store_id: store.id,
        name: payload.name,
        handle: collectionHandle,
        description: payload.description || null,
        collection_type: payload.collectionType || "manual",
        rule_json: validatedRules,
        status: payload.status || "draft",
      })
      .select("id")
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  if (
    !isSmart &&
    Array.isArray(payload.productIds) &&
    payload.productIds.length > 0
  ) {
    const { error: assignError } = await supabase.from(membershipTable).upsert(
      payload.productIds.map((productId, index) => ({
        collection_id: data.id,
        product_id: productId,
        sort_order: index,
      })),
      { onConflict: "product_id,collection_id" },
    );

    if (assignError) {
      throw normalizeError(assignError);
    }
  }

  return { ok: true };
}

export async function updateCollection(collectionId, payload) {
  const { store } = await getStoreContext();
  validateSeoMetadataFields(payload);
  const isSmart = (payload.collectionType || "manual") === "smart";
  const validatedRules = isSmart
    ? validateCollectionRules(payload.rules)
    : null;
  const collectionHandle = normalizeSeoHandle(payload.urlHandle, payload.name);
  await assertUniqueHandle(
    "collections",
    store.id,
    collectionHandle,
    collectionId,
  );

  let { error } = await supabase
    .from("collections")
    .update({
      name: payload.name,
      handle: collectionHandle,
      description: payload.description || null,
      status: payload.status || "draft",
      collection_type: payload.collectionType || "manual",
      rule_json: validatedRules,
      seo_title: payload.seoTitle || null,
      seo_description: payload.seoDescription || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", collectionId)
    .eq("store_id", store.id);

  if (error && isMissingColumnError(error, "seo_title")) {
    const fallback = await supabase
      .from("collections")
      .update({
        name: payload.name,
        handle: collectionHandle,
        description: payload.description || null,
        status: payload.status || "draft",
        collection_type: payload.collectionType || "manual",
        rule_json: validatedRules,
        updated_at: new Date().toISOString(),
      })
      .eq("id", collectionId)
      .eq("store_id", store.id);
    error = fallback.error;
  }

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
  const membershipTable = await resolveCollectionMembershipTable();

  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("id, collection_type")
    .eq("id", collectionId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (collectionError) {
    throw normalizeError(collectionError);
  }

  if (!collection) {
    throw new Error("Collection not found");
  }

  if (collection.collection_type === "smart") {
    throw new Error(
      "Smart collections do not support manual product assignment",
    );
  }

  const normalizedIds = Array.isArray(productIds)
    ? [...new Set(productIds.filter(Boolean))]
    : [];

  if (normalizedIds.length > 0) {
    const { data: validProducts, error: validProductsError } = await supabase
      .from("products")
      .select("id")
      .eq("store_id", store.id)
      .in("id", normalizedIds);

    if (validProductsError) {
      throw normalizeError(validProductsError);
    }

    const validIds = new Set((validProducts || []).map((item) => item.id));
    const hasInvalidProduct = normalizedIds.some((id) => !validIds.has(id));
    if (hasInvalidProduct) {
      throw new Error("Some selected products do not belong to this store");
    }
  }

  const { data: existingRows, error: existingRowsError } = await supabase
    .from(membershipTable)
    .select("product_id")
    .eq("collection_id", collectionId);

  if (existingRowsError) {
    throw normalizeError(existingRowsError);
  }

  const existingIds = new Set(
    (existingRows || []).map((item) => item.product_id),
  );
  const nextIds = new Set(normalizedIds);
  const idsToDelete = [...existingIds].filter((id) => !nextIds.has(id));

  if (idsToDelete.length) {
    const { error: deleteError } = await supabase
      .from(membershipTable)
      .delete()
      .eq("collection_id", collectionId)
      .in("product_id", idsToDelete);

    if (deleteError) {
      throw normalizeError(deleteError);
    }
  }

  if (normalizedIds.length > 0) {
    const { error: insertError } = await supabase.from(membershipTable).upsert(
      normalizedIds.map((productId, index) => ({
        collection_id: collectionId,
        product_id: productId,
        sort_order: index,
      })),
      { onConflict: "product_id,collection_id" },
    );

    if (insertError) {
      throw normalizeError(insertError);
    }
  }

  return { ok: true };
}

const CONTENT_PAGE_STATUSES = new Set([
  "draft",
  "review",
  "published",
  "archived",
]);
const CONTENT_PAGE_VISIBILITY = new Set(["preview", "public", "private"]);

function normalizeContentPageStatus(value) {
  const normalized = String(value || "draft")
    .trim()
    .toLowerCase();
  return CONTENT_PAGE_STATUSES.has(normalized) ? normalized : "draft";
}

function normalizeContentPageVisibility(value) {
  const normalized = String(value || "preview")
    .trim()
    .toLowerCase();
  return CONTENT_PAGE_VISIBILITY.has(normalized) ? normalized : "preview";
}

function mapContentPage(item = {}) {
  return {
    id: item.id,
    pageType: item.page_type || "static",
    title: item.title || "",
    urlHandle: item.handle || "",
    excerpt: item.excerpt || "",
    body: item.body || "",
    seoTitle: item.seo_title || "",
    seoDescription: item.seo_description || "",
    status: normalizeContentPageStatus(item.status),
    visibility: normalizeContentPageVisibility(item.visibility),
    publishedAt: item.published_at || null,
    previewToken: item.preview_token || null,
    authorName: item.author_name || "",
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

async function assertUniqueContentPageHandle(storeId, handle, ignoreId = null) {
  if (!(await tableExists("content_pages"))) {
    return;
  }

  await assertUniqueHandle("content_pages", storeId, handle, ignoreId);
}

export async function getContentPages(filters = {}) {
  const { store } = await getStoreContext();
  if (!(await tableExists("content_pages"))) {
    return [];
  }

  let query = supabase
    .from("content_pages")
    .select(
      "id, page_type, title, handle, excerpt, body, seo_title, seo_description, status, visibility, published_at, preview_token, author_name, created_at, updated_at",
    )
    .eq("store_id", store.id)
    .order("updated_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", normalizeContentPageStatus(filters.status));
  }

  if (filters.pageType && filters.pageType !== "all") {
    query = query.eq("page_type", filters.pageType);
  }

  const { data, error } = await query;
  if (error) {
    throw normalizeError(error);
  }

  let rows = (data || []).map((item) => mapContentPage(item));

  if (filters.search) {
    const keyword = String(filters.search).trim().toLowerCase();
    rows = rows.filter((item) =>
      [item.title, item.excerpt, item.urlHandle]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }

  return rows;
}

export async function createContentPage(payload = {}) {
  const { authUser, store } = await getStoreContext();
  if (!(await tableExists("content_pages"))) {
    throw new Error(
      "Content pages schema missing. Run Feature 16 migration first.",
    );
  }

  const title = String(payload.title || "").trim();
  if (!title) {
    throw new Error("Title is required");
  }

  validateSeoMetadataFields(payload);
  const handle = normalizeSeoHandle(payload.urlHandle, title);
  await assertUniqueContentPageHandle(store.id, handle);

  const status = normalizeContentPageStatus(payload.status);
  const visibility = normalizeContentPageVisibility(payload.visibility);

  const { error } = await supabase.from("content_pages").insert({
    store_id: store.id,
    page_type: payload.pageType || "static",
    title,
    handle,
    excerpt: payload.excerpt || null,
    body: payload.body || "",
    seo_title: payload.seoTitle || null,
    seo_description: payload.seoDescription || null,
    status,
    visibility,
    author_name: payload.authorName || authUser.email || "",
    preview_token: Math.random().toString(36).slice(2, 14),
    published_at: status === "published" ? new Date().toISOString() : null,
  });

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function updateContentPage(pageId, payload = {}) {
  if (!pageId) {
    throw new Error("Content page id is required");
  }

  const { authUser, store } = await getStoreContext();
  const title = String(payload.title || "").trim();
  if (!title) {
    throw new Error("Title is required");
  }

  validateSeoMetadataFields(payload);
  const handle = normalizeSeoHandle(payload.urlHandle, title);
  await assertUniqueContentPageHandle(store.id, handle, pageId);

  const status = normalizeContentPageStatus(payload.status);
  const visibility = normalizeContentPageVisibility(payload.visibility);

  const { error } = await supabase
    .from("content_pages")
    .update({
      page_type: payload.pageType || "static",
      title,
      handle,
      excerpt: payload.excerpt || null,
      body: payload.body || "",
      seo_title: payload.seoTitle || null,
      seo_description: payload.seoDescription || null,
      status,
      visibility,
      author_name: payload.authorName || authUser.email || "",
      published_at:
        status === "published"
          ? payload.publishedAt || new Date().toISOString()
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pageId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function deleteContentPage(pageId) {
  if (!pageId) {
    throw new Error("Content page id is required");
  }

  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("content_pages")
    .delete()
    .eq("id", pageId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function publishContentPage(pageId, visibility = "public") {
  if (!pageId) {
    throw new Error("Content page id is required");
  }

  const { store } = await getStoreContext();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("content_pages")
    .update({
      status: "published",
      visibility: normalizeContentPageVisibility(visibility),
      published_at: now,
      updated_at: now,
    })
    .eq("id", pageId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function getSeoOverview() {
  const [products, collections, contentPages] = await Promise.all([
    getProducts("all"),
    getCollections(),
    getContentPages(),
  ]);

  const completionRate = (rows = []) => {
    if (!rows.length) {
      return 0;
    }
    const completed = rows.filter((item) => {
      const hasTitle = String(item.seoTitle || "").trim().length > 0;
      const hasDescription =
        String(item.seoDescription || "").trim().length > 0;
      const hasHandle = String(item.urlHandle || "").trim().length > 0;
      return hasTitle && hasDescription && hasHandle;
    }).length;

    return Number(((completed / rows.length) * 100).toFixed(2));
  };

  return {
    products: {
      total: products.length,
      completionRate: completionRate(products),
    },
    collections: {
      total: collections.length,
      completionRate: completionRate(collections),
    },
    contentPages: {
      total: contentPages.length,
      completionRate: completionRate(contentPages),
      publishedCount: contentPages.filter((item) => item.status === "published")
        .length,
    },
  };
}

export async function getContentPagePreview(pageId) {
  if (!pageId) {
    throw new Error("Content page id is required");
  }

  const { store } = await getStoreContext();
  const { data, error } = await supabase
    .from("content_pages")
    .select(
      "id, title, handle, excerpt, body, seo_title, seo_description, status, visibility, preview_token",
    )
    .eq("id", pageId)
    .eq("store_id", store.id)
    .single();

  if (error) {
    throw normalizeError(error);
  }

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://store";

  return {
    id: data.id,
    title: data.title,
    excerpt: data.excerpt || "",
    body: data.body || "",
    seoTitle: data.seo_title || "",
    seoDescription: data.seo_description || "",
    status: data.status,
    visibility: data.visibility,
    previewUrl: `${baseUrl}/pages/${data.handle}?preview=${data.preview_token}`,
  };
}

export async function getInventoryItems(filters = {}) {
  const { store } = await getStoreContext();

  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "id, sku, title, price, quantity_in_stock, reorder_level, updated_at, products!inner(id, title, store_id)",
    )
    .eq("products.store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  let rows = (data || []).map((item) => {
    const stock = Number(item.quantity_in_stock || 0);
    const reorderLevel = Number(item.reorder_level || 0);
    const lowStockThreshold = Math.max(1, reorderLevel);
    return {
      id: item.id,
      sku: item.sku,
      variantTitle: item.title,
      price: Number(item.price || 0),
      stock,
      reorderLevel,
      lowStockThreshold,
      isLowStock: stock <= lowStockThreshold,
      productId: item.products?.id,
      productName: item.products?.title || "-",
      updatedAt: item.updated_at,
    };
  });

  if (filters.search) {
    const keyword = String(filters.search).trim().toLowerCase();
    rows = rows.filter((item) =>
      [item.productName, item.variantTitle, item.sku]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }

  if (filters.alertOnly) {
    rows = rows.filter((item) => item.isLowStock);
  }

  return rows;
}

async function syncInventoryLevelSnapshot({
  storeId,
  variantId,
  sku,
  variantTitle,
  quantityAfter,
  reorderLevel,
}) {
  const hasItems = await tableExists("inventory_items");
  const hasLevels = await tableExists("inventory_levels");

  if (!hasItems || !hasLevels) {
    return;
  }

  const { data: item, error: itemError } = await supabase
    .from("inventory_items")
    .upsert(
      {
        store_id: storeId,
        product_variant_id: variantId,
        sku,
        title: variantTitle || sku,
        total_available: Number(quantityAfter || 0),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_variant_id" },
    )
    .select("id")
    .single();

  if (itemError) {
    throw normalizeError(itemError);
  }

  const { error: levelError } = await supabase.from("inventory_levels").upsert(
    {
      inventory_item_id: item.id,
      location_code: "MAIN",
      available_quantity: Number(quantityAfter || 0),
      reserved_quantity: 0,
      reorder_point: Number(reorderLevel || 0),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "inventory_item_id,location_code" },
  );

  if (levelError) {
    throw normalizeError(levelError);
  }
}

async function recordStockMovement({
  storeId,
  variantId,
  quantityBefore,
  quantityAfter,
  quantityDelta,
  reasonCode,
  note,
  metadata,
}) {
  const movementTable = await resolveInventoryMovementTable();

  if (movementTable === "stock_movements") {
    const hasInventoryItems = await tableExists("inventory_items");
    let inventoryItemId = null;

    if (hasInventoryItems) {
      const { data: inventoryItem, error: inventoryItemError } = await supabase
        .from("inventory_items")
        .select("id")
        .eq("product_variant_id", variantId)
        .eq("store_id", storeId)
        .maybeSingle();

      if (inventoryItemError) {
        throw normalizeError(inventoryItemError);
      }

      inventoryItemId = inventoryItem?.id || null;
    }

    const { error: movementError } = await supabase
      .from("stock_movements")
      .insert({
        store_id: storeId,
        inventory_item_id: inventoryItemId,
        product_variant_id: variantId,
        event_type: quantityDelta >= 0 ? "increase" : "decrease",
        reason_code: reasonCode,
        quantity_delta: quantityDelta,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        note: note || "Stock movement",
        metadata: metadata || {},
      });

    if (movementError) {
      throw normalizeError(movementError);
    }

    return;
  }

  const { error: movementError } = await supabase
    .from("inventory_movements")
    .insert({
      store_id: storeId,
      product_variant_id: variantId,
      movement_type: quantityDelta >= 0 ? "adjustment" : "sale",
      quantity_change: quantityDelta,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      reason: `${reasonCode}: ${note || "Stock movement"}`,
    });

  if (movementError) {
    throw normalizeError(movementError);
  }
}

export async function adjustInventory(payload) {
  const { store } = await getStoreContext();
  const amount = Number(payload.adjustment || 0);

  if (!amount) {
    throw new Error("Adjustment value is required");
  }

  const reasonCode = normalizeInventoryReasonCode(payload.reasonCode);
  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select(
      "id, sku, title, quantity_in_stock, reorder_level, products!inner(id, title, store_id)",
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

  const nextReorderLevel =
    payload.reorderLevel === undefined || payload.reorderLevel === null
      ? Number(variant.reorder_level || 0)
      : Number(payload.reorderLevel);

  const { data: updatedRows, error: updateError } = await supabase
    .from("product_variants")
    .update({
      quantity_in_stock: quantityAfter,
      reorder_level: nextReorderLevel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", variant.id)
    .eq("quantity_in_stock", quantityBefore)
    .select("id");

  if (updateError) {
    throw normalizeError(updateError);
  }

  if (!(updatedRows || []).length) {
    const conflictError = new Error(
      "Inventory was updated by another process. Please retry your adjustment.",
    );
    conflictError.code = "INVENTORY_CONFLICT";
    throw conflictError;
  }

  await recordStockMovement({
    storeId: store.id,
    variantId: variant.id,
    quantityBefore,
    quantityAfter,
    quantityDelta: amount,
    reasonCode,
    note: payload.reason || "Manual adjustment",
    metadata: payload.metadata || {},
  });

  await syncInventoryLevelSnapshot({
    storeId: store.id,
    variantId: variant.id,
    sku: variant.sku,
    variantTitle: variant.title,
    quantityAfter,
    reorderLevel: nextReorderLevel,
  });

  return {
    ok: true,
    quantityBefore,
    quantityAfter,
    reasonCode,
    isLowStock: quantityAfter <= Math.max(1, nextReorderLevel),
  };
}

export async function getInventoryMovements(limit = 40, filters = {}) {
  const { store } = await getStoreContext();
  const movementTable = await resolveInventoryMovementTable();

  if (movementTable === "stock_movements") {
    let query = supabase
      .from("stock_movements")
      .select(
        "id, event_type, reason_code, quantity_delta, quantity_before, quantity_after, note, created_at, product_variants(sku, title)",
      )
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filters.reasonCode && filters.reasonCode !== "all") {
      query = query.eq("reason_code", filters.reasonCode);
    }

    const { data, error } = await query;
    if (error) {
      throw normalizeError(error);
    }

    return (data || []).map((item) => ({
      id: item.id,
      movementType: item.event_type,
      reasonCode: item.reason_code || "manual_adjustment",
      quantityChange: Number(item.quantity_delta || 0),
      quantityBefore: Number(item.quantity_before || 0),
      quantityAfter: Number(item.quantity_after || 0),
      reason: item.note || "-",
      createdAt: item.created_at,
      sku: item.product_variants?.sku || "-",
      variantTitle: item.product_variants?.title || "-",
    }));
  }

  let fallbackQuery = supabase
    .from("inventory_movements")
    .select(
      "id, movement_type, quantity_change, quantity_before, quantity_after, reason, created_at, product_variants(sku, title)",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.reasonCode && filters.reasonCode !== "all") {
    fallbackQuery = fallbackQuery.ilike("reason", `%${filters.reasonCode}%`);
  }

  const { data, error } = await fallbackQuery;

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    movementType: item.movement_type,
    reasonCode: String(item.reason || "manual_adjustment").split(":")[0],
    quantityChange: Number(item.quantity_change || 0),
    quantityBefore: Number(item.quantity_before || 0),
    quantityAfter: Number(item.quantity_after || 0),
    reason: item.reason || "-",
    createdAt: item.created_at,
    sku: item.product_variants?.sku || "-",
    variantTitle: item.product_variants?.title || "-",
  }));
}

export async function getLowStockAlerts(filters = {}) {
  const items = await getInventoryItems({
    search: filters.search || "",
    alertOnly: true,
  });

  return items.map((item) => ({
    variantId: item.id,
    sku: item.sku,
    productName: item.productName,
    variantTitle: item.variantTitle,
    stock: item.stock,
    threshold: item.lowStockThreshold,
    severity:
      item.stock <= 0
        ? "critical"
        : item.stock <= Math.ceil(item.lowStockThreshold / 2)
          ? "high"
          : "medium",
  }));
}

export async function exportInventoryCsv() {
  const rows = await getInventoryItems();
  const headers = [
    "sku",
    "product_name",
    "variant_title",
    "stock",
    "reorder_level",
    "price",
  ];

  const body = rows.map((item) =>
    [
      item.sku,
      item.productName,
      item.variantTitle,
      item.stock,
      item.reorderLevel,
      item.price,
    ]
      .map(toCsvValue)
      .join(","),
  );

  return [headers.join(","), ...body].join("\n");
}

export async function importInventoryCsv(csvContent) {
  const { store } = await getStoreContext();
  const hasImportRuns = await tableExists("inventory_import_runs");
  let importRunId = null;

  if (hasImportRuns) {
    const { data: importRun, error: importRunError } = await supabase
      .from("inventory_import_runs")
      .insert({
        store_id: store.id,
        file_name: "inventory-import.csv",
        status: "running",
      })
      .select("id")
      .single();

    if (importRunError) {
      throw normalizeError(importRunError);
    }

    importRunId = importRun.id;
  }

  const parsed = parseSimpleCsv(csvContent);
  if (!parsed.records.length) {
    throw new Error("CSV is empty");
  }

  const requiredHeader = "sku";
  if (!parsed.headers.includes(requiredHeader)) {
    throw new Error("CSV must contain sku column");
  }

  const items = await getInventoryItems();
  const bySku = new Map(
    items.map((item) => [String(item.sku).toLowerCase(), item]),
  );

  const results = [];

  for (let index = 0; index < parsed.records.length; index += 1) {
    const row = parsed.records[index];
    const sku = String(row.sku || "").trim();
    const target = bySku.get(sku.toLowerCase());

    if (!sku || !target) {
      results.push({
        row: index + 2,
        sku,
        status: "failed",
        error: "SKU not found",
      });
      continue;
    }

    const adjustmentRaw = row.adjustment || row.quantity_change;
    const stockRaw = row.stock || row.quantity;
    const reorderRaw = row.reorder_level;

    let adjustment = Number(adjustmentRaw || 0);
    if (!adjustmentRaw && stockRaw !== "" && stockRaw !== undefined) {
      adjustment = Number(stockRaw) - Number(target.stock || 0);
    }

    if (!Number.isFinite(adjustment) || adjustment === 0) {
      results.push({
        row: index + 2,
        sku,
        status: "failed",
        error:
          "Provide adjustment or a stock value different from current stock",
      });
      continue;
    }

    try {
      await adjustInventory({
        variantId: target.id,
        adjustment,
        reorderLevel:
          reorderRaw === "" || reorderRaw === undefined
            ? undefined
            : Number(reorderRaw),
        reasonCode: row.reason_code || "import",
        reason: row.reason || "CSV import",
      });

      results.push({ row: index + 2, sku, status: "success" });
    } catch (err) {
      results.push({
        row: index + 2,
        sku,
        status: "failed",
        error: err.message || "Import row failed",
      });
    }
  }

  const summary = {
    total: results.length,
    successCount: results.filter((item) => item.status === "success").length,
    failedCount: results.filter((item) => item.status === "failed").length,
    rows: results,
  };

  if (hasImportRuns && importRunId) {
    const { error: updateImportRunError } = await supabase
      .from("inventory_import_runs")
      .update({
        status: summary.failedCount > 0 ? "failed" : "completed",
        total_rows: summary.total,
        success_rows: summary.successCount,
        failed_rows: summary.failedCount,
        error_report_json:
          summary.failedCount > 0
            ? summary.rows.filter((row) => row.status === "failed")
            : null,
      })
      .eq("id", importRunId)
      .eq("store_id", store.id);

    if (updateImportRunError) {
      throw normalizeError(updateImportRunError);
    }
  }

  return summary;
}

export async function getDiscounts(status = "all") {
  const { store } = await getStoreContext();
  const rows = await listDiscountRows(store.id, status);
  return rows.map((item) => ({
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
    stackable: Boolean(item.stackable),
    priority: Number(item.priority || 100),
    appliesTo: item.applies_to || "order",
    scopeProductIds: Array.isArray(item.scope_product_ids)
      ? item.scope_product_ids
      : [],
    scopeCollectionIds: Array.isArray(item.scope_collection_ids)
      ? item.scope_collection_ids
      : [],
    buyXQty: item.buy_x_qty,
    buyYQty: item.buy_y_qty,
    buyXProductId: item.buy_x_product_id,
    getYProductId: item.get_y_product_id,
    campaignId: item.campaign_id || null,
    status: item.status,
    createdAt: item.created_at,
  }));
}

export async function createDiscount(payload) {
  const { store } = await getStoreContext();
  validateDiscountPayload(payload);
  await assertNoDiscountOverlapConflict(store.id, payload);

  const discountPayload = {
    store_id: store.id,
    code: String(payload.code || "")
      .trim()
      .toUpperCase(),
    title: payload.title,
    description: payload.description || null,
    discount_type: payload.discountType,
    value: Number(payload.value || 0),
    min_purchase_amount: payload.minPurchaseAmount
      ? Number(payload.minPurchaseAmount)
      : null,
    max_uses: payload.maxUses ? Number(payload.maxUses) : null,
    starts_at: payload.startsAt || null,
    ends_at: payload.endsAt || null,
    status: payload.status || "draft",
    stackable: Boolean(payload.stackable),
    priority: Number(payload.priority || 100),
    applies_to: payload.appliesTo || "order",
    scope_product_ids: Array.isArray(payload.scopeProductIds)
      ? payload.scopeProductIds
      : [],
    scope_collection_ids: Array.isArray(payload.scopeCollectionIds)
      ? payload.scopeCollectionIds
      : [],
    buy_x_qty: payload.buyXQty ? Number(payload.buyXQty) : null,
    buy_y_qty: payload.buyYQty ? Number(payload.buyYQty) : null,
    buy_x_product_id: payload.buyXProductId || null,
    get_y_product_id: payload.getYProductId || null,
    campaign_id: payload.campaignId || null,
  };

  let { error } = await supabase.from("discounts").insert(discountPayload);

  if (error && isMissingColumnError(error, "campaign_id")) {
    const { campaign_id: ignoredCampaignId, ...fallbackPayload } =
      discountPayload;
    const fallback = await supabase.from("discounts").insert({
      ...fallbackPayload,
    });
    error = fallback.error;
  }

  if (error && isMissingColumnError(error, "stackable")) {
    const { error: fallbackError } = await supabase.from("discounts").insert({
      store_id: store.id,
      code: discountPayload.code,
      title: discountPayload.title,
      description: discountPayload.description,
      discount_type: discountPayload.discount_type,
      value: discountPayload.value,
      min_purchase_amount: discountPayload.min_purchase_amount,
      max_uses: discountPayload.max_uses,
      starts_at: discountPayload.starts_at,
      ends_at: discountPayload.ends_at,
      status: discountPayload.status,
    });
    error = fallbackError;
  }

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function updateDiscount(discountId, payload) {
  const { store } = await getStoreContext();
  validateDiscountPayload(payload);
  await assertNoDiscountOverlapConflict(store.id, payload, discountId);

  let { error } = await supabase
    .from("discounts")
    .update({
      code: String(payload.code || "")
        .trim()
        .toUpperCase(),
      title: payload.title,
      description: payload.description || null,
      discount_type: payload.discountType,
      value: Number(payload.value || 0),
      min_purchase_amount: payload.minPurchaseAmount
        ? Number(payload.minPurchaseAmount)
        : null,
      max_uses: payload.maxUses ? Number(payload.maxUses) : null,
      starts_at: payload.startsAt || null,
      ends_at: payload.endsAt || null,
      status: payload.status || "draft",
      stackable: Boolean(payload.stackable),
      priority: Number(payload.priority || 100),
      applies_to: payload.appliesTo || "order",
      scope_product_ids: Array.isArray(payload.scopeProductIds)
        ? payload.scopeProductIds
        : [],
      scope_collection_ids: Array.isArray(payload.scopeCollectionIds)
        ? payload.scopeCollectionIds
        : [],
      buy_x_qty: payload.buyXQty ? Number(payload.buyXQty) : null,
      buy_y_qty: payload.buyYQty ? Number(payload.buyYQty) : null,
      buy_x_product_id: payload.buyXProductId || null,
      get_y_product_id: payload.getYProductId || null,
      campaign_id: payload.campaignId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", discountId)
    .eq("store_id", store.id);

  if (error && isMissingColumnError(error, "campaign_id")) {
    const fallback = await supabase
      .from("discounts")
      .update({
        code: String(payload.code || "")
          .trim()
          .toUpperCase(),
        title: payload.title,
        description: payload.description || null,
        discount_type: payload.discountType,
        value: Number(payload.value || 0),
        min_purchase_amount: payload.minPurchaseAmount
          ? Number(payload.minPurchaseAmount)
          : null,
        max_uses: payload.maxUses ? Number(payload.maxUses) : null,
        starts_at: payload.startsAt || null,
        ends_at: payload.endsAt || null,
        status: payload.status || "draft",
        stackable: Boolean(payload.stackable),
        priority: Number(payload.priority || 100),
        applies_to: payload.appliesTo || "order",
        scope_product_ids: Array.isArray(payload.scopeProductIds)
          ? payload.scopeProductIds
          : [],
        scope_collection_ids: Array.isArray(payload.scopeCollectionIds)
          ? payload.scopeCollectionIds
          : [],
        buy_x_qty: payload.buyXQty ? Number(payload.buyXQty) : null,
        buy_y_qty: payload.buyYQty ? Number(payload.buyYQty) : null,
        buy_x_product_id: payload.buyXProductId || null,
        get_y_product_id: payload.getYProductId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", discountId)
      .eq("store_id", store.id);
    error = fallback.error;
  }

  if (error && isMissingColumnError(error, "stackable")) {
    const { error: fallbackError } = await supabase
      .from("discounts")
      .update({
        code: String(payload.code || "")
          .trim()
          .toUpperCase(),
        title: payload.title,
        description: payload.description || null,
        discount_type: payload.discountType,
        value: Number(payload.value || 0),
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
    error = fallbackError;
  }

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function previewDiscountOutcome(payload) {
  const { store } = await getStoreContext();
  const subtotal = Number(payload.subtotal || 0);
  const cartItemCount = Number(payload.cartItemCount || 0);
  const discounts = await listDiscountRows(store.id, "active");
  const resolution = resolveApplicableDiscounts(discounts, {
    subtotal,
    cartItemCount,
    codes: payload.codes,
  });

  const totalDiscount = resolution.applied.reduce(
    (sum, item) => sum + Number(item.calculated_amount || 0),
    0,
  );

  return {
    subtotal,
    totalDiscount: Number(totalDiscount.toFixed(2)),
    estimatedTotal: Number((subtotal - totalDiscount).toFixed(2)),
    applied: resolution.applied.map((item) => ({
      id: item.id,
      code: item.code,
      title: item.title,
      amount: Number(item.calculated_amount || 0),
      stackable: Boolean(item.stackable),
      priority: Number(item.priority || 100),
    })),
    rejected: resolution.rejected,
  };
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

const MARKETING_CAMPAIGN_STATUSES = new Set([
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
]);

function normalizeCampaignStatus(value) {
  const status = String(value || "draft")
    .trim()
    .toLowerCase();
  return MARKETING_CAMPAIGN_STATUSES.has(status) ? status : "draft";
}

function getCampaignTrendDays(days = 14) {
  const values = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    const day = date.toISOString().slice(0, 10);
    values.push({
      day,
      visits: 0,
      conversions: 0,
      revenue: 0,
    });
  }
  return values;
}

function mapMarketingCampaign(row = {}, coupons = []) {
  return {
    id: row.id,
    name: row.name,
    goal: row.goal || "",
    channel: row.channel || "other",
    status: normalizeCampaignStatus(row.status),
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null,
    attributionMetadata: row.attribution_metadata_json || {},
    budgetAmount: Number(row.budget_amount || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    coupons,
  };
}

async function listCampaignRows(storeId, status = "all") {
  let query = supabase
    .from("marketing_campaigns")
    .select(
      "id, name, goal, channel, status, starts_at, ends_at, attribution_metadata_json, budget_amount, created_at, updated_at",
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", normalizeCampaignStatus(status));
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error, "marketing_campaigns")) {
      return [];
    }
    throw normalizeError(error);
  }

  return data || [];
}

async function listCampaignCoupons(storeId, campaignIds = []) {
  if (!campaignIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("discounts")
    .select("id, code, title, status, uses_count, max_uses, campaign_id")
    .eq("store_id", storeId)
    .in("campaign_id", campaignIds);

  if (error) {
    if (isMissingColumnError(error, "campaign_id")) {
      return [];
    }
    throw normalizeError(error);
  }

  return data || [];
}

export async function getMarketingCampaigns(status = "all") {
  const { store } = await getStoreContext();
  const campaigns = await listCampaignRows(store.id, status);
  const campaignIds = campaigns.map((item) => item.id);
  const coupons = await listCampaignCoupons(store.id, campaignIds);

  const couponMap = coupons.reduce((acc, item) => {
    const bucket = acc.get(item.campaign_id) || [];
    bucket.push({
      id: item.id,
      code: item.code,
      title: item.title,
      status: item.status,
      usesCount: Number(item.uses_count || 0),
      maxUses: item.max_uses,
    });
    acc.set(item.campaign_id, bucket);
    return acc;
  }, new Map());

  return campaigns.map((item) =>
    mapMarketingCampaign(item, couponMap.get(item.id) || []),
  );
}

export async function createMarketingCampaign(payload = {}) {
  const { store } = await getStoreContext();
  const name = String(payload.name || "").trim();
  if (!name) {
    throw new Error("Campaign name is required");
  }

  const { error } = await supabase.from("marketing_campaigns").insert({
    store_id: store.id,
    name,
    goal: payload.goal || null,
    channel: payload.channel || "other",
    status: normalizeCampaignStatus(payload.status),
    starts_at: payload.startsAt || null,
    ends_at: payload.endsAt || null,
    attribution_metadata_json: payload.attributionMetadata || {},
    budget_amount: payload.budgetAmount ? Number(payload.budgetAmount) : null,
  });

  if (error) {
    if (isMissingTableError(error, "marketing_campaigns")) {
      throw new Error(
        "Marketing campaigns schema missing. Run Feature 14 migration first.",
      );
    }
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function updateMarketingCampaign(campaignId, payload = {}) {
  if (!campaignId) {
    throw new Error("Campaign id is required");
  }

  const { store } = await getStoreContext();
  const name = String(payload.name || "").trim();
  if (!name) {
    throw new Error("Campaign name is required");
  }

  const { error } = await supabase
    .from("marketing_campaigns")
    .update({
      name,
      goal: payload.goal || null,
      channel: payload.channel || "other",
      status: normalizeCampaignStatus(payload.status),
      starts_at: payload.startsAt || null,
      ends_at: payload.endsAt || null,
      attribution_metadata_json: payload.attributionMetadata || {},
      budget_amount: payload.budgetAmount ? Number(payload.budgetAmount) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function setMarketingCampaignStatus(campaignId, nextStatus) {
  if (!campaignId) {
    throw new Error("Campaign id is required");
  }

  const { store } = await getStoreContext();
  const status = normalizeCampaignStatus(nextStatus);

  const { error } = await supabase
    .from("marketing_campaigns")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function linkCampaignCoupons(campaignId, discountIds = []) {
  if (!campaignId) {
    throw new Error("Campaign id is required");
  }

  const { store } = await getStoreContext();
  const selectedIds = Array.from(
    new Set((discountIds || []).map((item) => String(item || "").trim())),
  ).filter(Boolean);

  const { data: currentlyLinked, error: currentError } = await supabase
    .from("discounts")
    .select("id")
    .eq("store_id", store.id)
    .eq("campaign_id", campaignId);

  if (currentError) {
    if (isMissingColumnError(currentError, "campaign_id")) {
      throw new Error(
        "Discount campaign linkage column missing. Run Feature 14 migration first.",
      );
    }
    throw normalizeError(currentError);
  }

  const linkedIds = (currentlyLinked || []).map((item) => item.id);
  const toUnlink = linkedIds.filter((id) => !selectedIds.includes(id));

  if (toUnlink.length) {
    const { error: unlinkError } = await supabase
      .from("discounts")
      .update({ campaign_id: null, updated_at: new Date().toISOString() })
      .eq("store_id", store.id)
      .in("id", toUnlink);

    if (unlinkError) {
      throw normalizeError(unlinkError);
    }
  }

  if (selectedIds.length) {
    const { error: linkError } = await supabase
      .from("discounts")
      .update({ campaign_id: campaignId, updated_at: new Date().toISOString() })
      .eq("store_id", store.id)
      .in("id", selectedIds);

    if (linkError) {
      throw normalizeError(linkError);
    }
  }

  return { ok: true };
}

export async function getMarketingCampaignAnalytics(status = "all") {
  const { store } = await getStoreContext();
  const campaigns = await getMarketingCampaigns(status);
  const discountRows = await listDiscountRows(store.id, "all");
  const linkedDiscounts = discountRows.filter((item) => item.campaign_id);

  const totalCouponUses = linkedDiscounts.reduce(
    (sum, item) => sum + Number(item.uses_count || 0),
    0,
  );

  const trend = getCampaignTrendDays(14);
  const trendMap = trend.reduce((acc, item) => {
    acc.set(item.day, item);
    return acc;
  }, new Map());

  let visits = 0;
  let conversions = 0;
  let attributedRevenue = 0;

  const fromDate = trend[0]?.day;
  if (fromDate) {
    const { data: attributionEvents, error: attributionError } = await supabase
      .from("campaign_attribution_events")
      .select("event_type, event_at, order_amount")
      .eq("store_id", store.id)
      .gte("event_at", `${fromDate}T00:00:00.000Z`)
      .order("event_at", { ascending: true });

    if (
      attributionError &&
      !isMissingTableError(attributionError, "campaign_attribution_events")
    ) {
      throw normalizeError(attributionError);
    }

    for (const event of attributionEvents || []) {
      const day = String(event.event_at || "").slice(0, 10);
      const row = trendMap.get(day);
      if (!row) {
        continue;
      }

      const eventType = String(event.event_type || "").toLowerCase();
      if (eventType === "visit") {
        row.visits += 1;
        visits += 1;
      }

      if (eventType === "conversion" || eventType === "coupon_redeem") {
        row.conversions += 1;
        row.revenue += Number(event.order_amount || 0);
        conversions += 1;
        attributedRevenue += Number(event.order_amount || 0);
      }
    }
  }

  return {
    summary: {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((item) => item.status === "active")
        .length,
      pausedCampaigns: campaigns.filter((item) => item.status === "paused")
        .length,
      linkedCoupons: linkedDiscounts.length,
      totalCouponUses,
      attributedRevenue: Number(attributedRevenue.toFixed(2)),
      conversionRate: Number(
        (visits > 0 ? (conversions / visits) * 100 : 0).toFixed(2),
      ),
    },
    trend,
  };
}

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

async function loadTransactionEventsByTransactionIds(transactionIds) {
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

async function createTransactionEvent(payload) {
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

  const rows = data || [];
  let zonesByMethod = new Map();

  if (
    rows.length &&
    (await tableExists("shipping_method_zones")) &&
    (await tableExists("shipping_zones"))
  ) {
    const methodIds = rows.map((item) => item.id);
    const { data: links, error: linksError } = await supabase
      .from("shipping_method_zones")
      .select(
        "shipping_method_id, shipping_zones(id, zone_name, country_code, region_code, postal_code_pattern, is_active)",
      )
      .in("shipping_method_id", methodIds);

    if (linksError) {
      throw normalizeError(linksError);
    }

    zonesByMethod = (links || []).reduce((acc, link) => {
      const bucket = acc.get(link.shipping_method_id) || [];
      if (link.shipping_zones) {
        bucket.push({
          id: link.shipping_zones.id,
          name: link.shipping_zones.zone_name,
          countryCode: link.shipping_zones.country_code || "",
          regionCode: link.shipping_zones.region_code || "",
          postalCodePattern: link.shipping_zones.postal_code_pattern || "",
          isActive: Boolean(link.shipping_zones.is_active),
        });
      }
      acc.set(link.shipping_method_id, bucket);
      return acc;
    }, new Map());
  }

  return rows.map((item) => ({
    id: item.id,
    name: item.name,
    shippingType: item.shipping_type,
    baseRate: Number(item.base_rate || 0),
    config: item.config_json || {},
    isActive: Boolean(item.is_active),
    zones: zonesByMethod.get(item.id) || [],
    createdAt: item.created_at,
  }));
}

export async function getShippingZones() {
  const { store } = await getStoreContext();
  if (!(await tableExists("shipping_zones"))) {
    return [];
  }

  const { data, error } = await supabase
    .from("shipping_zones")
    .select(
      "id, zone_name, country_code, region_code, postal_code_pattern, is_active, created_at",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    name: item.zone_name,
    countryCode: item.country_code || "",
    regionCode: item.region_code || "",
    postalCodePattern: item.postal_code_pattern || "",
    isActive: Boolean(item.is_active),
    createdAt: item.created_at,
  }));
}

export async function createShippingZone(payload) {
  const { store } = await getStoreContext();
  if (!(await tableExists("shipping_zones"))) {
    throw new Error(
      "Shipping zones table is missing. Run Feature 10 migration first.",
    );
  }

  const { error } = await supabase.from("shipping_zones").insert({
    store_id: store.id,
    zone_name: payload.name,
    country_code: payload.countryCode || null,
    region_code: payload.regionCode || null,
    postal_code_pattern: payload.postalCodePattern || null,
    is_active: payload.isActive ?? true,
  });

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function updateShippingZone(zoneId, payload) {
  const { store } = await getStoreContext();
  if (!(await tableExists("shipping_zones"))) {
    throw new Error(
      "Shipping zones table is missing. Run Feature 10 migration first.",
    );
  }

  const { error } = await supabase
    .from("shipping_zones")
    .update({
      zone_name: payload.name,
      country_code: payload.countryCode || null,
      region_code: payload.regionCode || null,
      postal_code_pattern: payload.postalCodePattern || null,
      is_active: payload.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", zoneId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function deleteShippingZone(zoneId) {
  const { store } = await getStoreContext();
  if (!(await tableExists("shipping_zones"))) {
    return { ok: true };
  }

  const { error } = await supabase
    .from("shipping_zones")
    .delete()
    .eq("id", zoneId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function createShippingMethod(payload) {
  const { store } = await getStoreContext();
  const { data: method, error } = await supabase
    .from("shipping_methods")
    .insert({
      store_id: store.id,
      name: payload.name,
      shipping_type: payload.shippingType,
      base_rate: Number(payload.baseRate || 0),
      config_json: payload.config || {},
      is_active: payload.isActive ?? true,
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeError(error);
  }

  if (
    method?.id &&
    Array.isArray(payload.zoneIds) &&
    payload.zoneIds.length &&
    (await tableExists("shipping_method_zones"))
  ) {
    const { error: linkError } = await supabase
      .from("shipping_method_zones")
      .insert(
        payload.zoneIds.map((zoneId) => ({
          shipping_method_id: method.id,
          shipping_zone_id: zoneId,
        })),
      );

    if (linkError) {
      throw normalizeError(linkError);
    }
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

  if (await tableExists("shipping_method_zones")) {
    const { error: deleteLinkError } = await supabase
      .from("shipping_method_zones")
      .delete()
      .eq("shipping_method_id", shippingMethodId);

    if (deleteLinkError) {
      throw normalizeError(deleteLinkError);
    }

    if (Array.isArray(payload.zoneIds) && payload.zoneIds.length) {
      const { error: insertLinkError } = await supabase
        .from("shipping_method_zones")
        .insert(
          payload.zoneIds.map((zoneId) => ({
            shipping_method_id: shippingMethodId,
            shipping_zone_id: zoneId,
          })),
        );

      if (insertLinkError) {
        throw normalizeError(insertLinkError);
      }
    }
  }

  return { ok: true };
}

export async function getOrderFulfillmentItems(orderId) {
  const { store } = await getStoreContext();
  const [orderItemsResult, shipmentItemsResult] = await Promise.all([
    supabase
      .from("order_items")
      .select(
        "id, product_title, variant_title, sku, quantity, unit_price, line_total, orders!inner(id, store_id)",
      )
      .eq("order_id", orderId)
      .eq("orders.store_id", store.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("shipment_items")
      .select("order_item_id, quantity, shipments!inner(order_id, status)")
      .eq("shipments.order_id", orderId),
  ]);

  if (orderItemsResult.error) {
    throw normalizeError(orderItemsResult.error);
  }
  if (shipmentItemsResult.error) {
    throw normalizeError(shipmentItemsResult.error);
  }

  const allocatedMap = (shipmentItemsResult.data || []).reduce((acc, row) => {
    const status = row.shipments?.status;
    if (status === "failed") {
      return acc;
    }

    const key = row.order_item_id;
    acc.set(key, Number(acc.get(key) || 0) + Number(row.quantity || 0));
    return acc;
  }, new Map());

  return (orderItemsResult.data || []).map((item) => {
    const orderedQty = Number(item.quantity || 0);
    const allocatedQty = Number(allocatedMap.get(item.id) || 0);
    const remainingQty = Math.max(orderedQty - allocatedQty, 0);
    return {
      id: item.id,
      productTitle: item.product_title,
      variantTitle: item.variant_title,
      sku: item.sku,
      orderedQty,
      allocatedQty,
      remainingQty,
      unitPrice: Number(item.unit_price || 0),
      lineTotal: Number(item.line_total || 0),
    };
  });
}

async function syncOrderFulfillmentFromShipments(orderId, storeId) {
  const [orderItemsResult, shipmentItemsResult] = await Promise.all([
    supabase.from("order_items").select("id, quantity").eq("order_id", orderId),
    supabase
      .from("shipment_items")
      .select("order_item_id, quantity, shipments!inner(order_id, status)")
      .eq("shipments.order_id", orderId),
  ]);

  if (orderItemsResult.error) {
    throw normalizeError(orderItemsResult.error);
  }
  if (shipmentItemsResult.error) {
    throw normalizeError(shipmentItemsResult.error);
  }

  const totalOrdered = (orderItemsResult.data || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

  let totalDelivered = 0;
  let totalShipped = 0;
  for (const row of shipmentItemsResult.data || []) {
    const qty = Number(row.quantity || 0);
    const status = row.shipments?.status;
    if (status === "delivered") {
      totalDelivered += qty;
      totalShipped += qty;
    } else if (status === "shipped") {
      totalShipped += qty;
    }
  }

  let fulfillmentStatus = "unfulfilled";
  let orderStatus = "need_ship";
  if (totalOrdered > 0 && totalDelivered >= totalOrdered) {
    fulfillmentStatus = "delivered";
    orderStatus = "receive";
  } else if (totalShipped > 0 && totalShipped >= totalOrdered) {
    fulfillmentStatus = "shipped";
    orderStatus = "ongoing_shipped";
  } else if (totalShipped > 0) {
    fulfillmentStatus = "partial";
    orderStatus = "ongoing_shipped";
  }

  let orderUpdate = await supabase
    .from("orders")
    .update({
      status: orderStatus,
      fulfillment_status: fulfillmentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("store_id", storeId);

  if (
    orderUpdate.error &&
    isMissingColumnError(orderUpdate.error, "fulfillment_status")
  ) {
    orderUpdate = await supabase
      .from("orders")
      .update({
        status: orderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("store_id", storeId);
  }

  if (orderUpdate.error) {
    throw normalizeError(orderUpdate.error);
  }

  return { fulfillmentStatus, orderStatus };
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
  let { data, error } = await supabase
    .from("tax_rules")
    .select(
      "id, name, region_code, tax_rate, tax_behavior, priority, is_default, is_active, created_at",
    )
    .eq("store_id", store.id)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (error && isMissingColumnError(error, "tax_behavior")) {
    const fallback = await supabase
      .from("tax_rules")
      .select("id, name, region_code, tax_rate, is_active, created_at")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    data = (fallback.data || []).map((item) => ({
      ...item,
      tax_behavior: "exclusive",
      priority: 100,
      is_default: false,
    }));
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    name: item.name,
    regionCode: item.region_code,
    taxRate: Number(item.tax_rate || 0),
    taxBehavior: normalizeTaxBehavior(item.tax_behavior),
    priority: Number(item.priority || 100),
    isDefault: Boolean(item.is_default),
    isActive: Boolean(item.is_active),
    createdAt: item.created_at,
  }));
}

export async function createTaxRule(payload) {
  const { store } = await getStoreContext();
  let { error } = await supabase.from("tax_rules").insert({
    store_id: store.id,
    name: payload.name,
    region_code: payload.regionCode,
    tax_rate: Number(payload.taxRate || 0),
    tax_behavior: normalizeTaxBehavior(payload.taxBehavior),
    priority: Number(payload.priority || 100),
    is_default: Boolean(payload.isDefault),
    is_active: payload.isActive ?? true,
  });

  if (error && isMissingColumnError(error, "tax_behavior")) {
    const fallback = await supabase.from("tax_rules").insert({
      store_id: store.id,
      name: payload.name,
      region_code: payload.regionCode,
      tax_rate: Number(payload.taxRate || 0),
      is_active: payload.isActive ?? true,
    });
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function updateTaxRule(taxRuleId, payload) {
  const { store } = await getStoreContext();
  let { error } = await supabase
    .from("tax_rules")
    .update({
      name: payload.name,
      region_code: payload.regionCode,
      tax_rate: Number(payload.taxRate || 0),
      tax_behavior: normalizeTaxBehavior(payload.taxBehavior),
      priority: Number(payload.priority || 100),
      is_default: Boolean(payload.isDefault),
      is_active: payload.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taxRuleId)
    .eq("store_id", store.id);

  if (error && isMissingColumnError(error, "tax_behavior")) {
    const fallback = await supabase
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
    error = fallback.error;
  }

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

  let shipmentItemsPayload = [];
  if (Array.isArray(payload.items) && payload.items.length) {
    const availableItems = await getOrderFulfillmentItems(payload.orderId);
    const byId = new Map(availableItems.map((item) => [item.id, item]));
    shipmentItemsPayload = payload.items
      .map((item) => ({
        order_item_id: item.orderItemId,
        quantity: Number(item.quantity || 0),
      }))
      .filter((item) => item.quantity > 0);

    for (const item of shipmentItemsPayload) {
      const available = byId.get(item.order_item_id);
      if (!available) {
        throw new Error("Invalid order item selected for shipment");
      }
      if (item.quantity > Number(available.remainingQty || 0)) {
        throw new Error(
          `Shipment quantity exceeds remaining quantity for ${available.sku || available.productTitle}`,
        );
      }
    }
  } else {
    const { data: orderItems, error: orderItemsError } = await supabase
      .from("order_items")
      .select("id, quantity")
      .eq("order_id", payload.orderId);

    if (orderItemsError) {
      throw normalizeError(orderItemsError);
    }

    shipmentItemsPayload = (orderItems || []).map((item) => ({
      order_item_id: item.id,
      quantity: Number(item.quantity || 0),
    }));
  }

  if (shipmentItemsPayload.length) {
    const { error: shipmentItemsError } = await supabase
      .from("shipment_items")
      .insert(
        shipmentItemsPayload.map((item) => ({
          shipment_id: shipment.id,
          order_item_id: item.order_item_id,
          quantity: item.quantity,
        })),
      );

    if (shipmentItemsError) {
      throw normalizeError(shipmentItemsError);
    }
  }

  const syncResult = await syncOrderFulfillmentFromShipments(
    payload.orderId,
    store.id,
  );

  const { error: timelineError } = await supabase
    .from("order_timeline")
    .insert({
      order_id: payload.orderId,
      status: syncResult.orderStatus,
      actor_type: "user",
      actor_id: authUser.id,
      note:
        payload.note ||
        `Shipment created with status ${payload.status || "pending"}`,
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

  const syncResult = await syncOrderFulfillmentFromShipments(
    shipment.order_id,
    store.id,
  );

  const { error: timelineError } = await supabase
    .from("order_timeline")
    .insert({
      order_id: shipment.order_id,
      status: syncResult.orderStatus,
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
  let { data, error } = await supabase
    .from("invoices")
    .select(
      "id, order_id, invoice_number, subtotal, taxable_amount, tax_rate, tax_behavior, tax_amount, discount_amount, total, status, issued_at, metadata_json, orders(order_number)",
    )
    .eq("store_id", store.id)
    .order("issued_at", { ascending: false });

  if (error && isMissingColumnError(error, "taxable_amount")) {
    const fallback = await supabase
      .from("invoices")
      .select(
        "id, order_id, invoice_number, subtotal, tax_amount, discount_amount, total, issued_at, orders(order_number)",
      )
      .eq("store_id", store.id)
      .order("issued_at", { ascending: false });
    data = (fallback.data || []).map((item) => ({
      ...item,
      taxable_amount: item.subtotal,
      tax_rate: 0,
      tax_behavior: "exclusive",
      status: "issued",
      metadata_json: {},
    }));
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    orderId: item.order_id,
    orderNumber: item.orders?.order_number || "-",
    invoiceNumber: item.invoice_number,
    subtotal: Number(item.subtotal || 0),
    taxableAmount: Number(item.taxable_amount || item.subtotal || 0),
    taxRate: Number(item.tax_rate || 0),
    taxBehavior: normalizeTaxBehavior(item.tax_behavior),
    taxAmount: Number(item.tax_amount || 0),
    discountAmount: Number(item.discount_amount || 0),
    total: Number(item.total || 0),
    status: item.status || "issued",
    metadata: item.metadata_json || {},
    issuedAt: item.issued_at,
  }));
}

const RETURN_STATUS_FLOW = {
  pending: ["approved", "rejected"],
  approved: ["received", "rejected"],
  received: ["refunded"],
  rejected: [],
  refunded: [],
};

function normalizeReturnStatus(value) {
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

const ABANDONED_CART_STATUSES = new Set([
  "detected",
  "scheduled",
  "contacted",
  "recovered",
  "dismissed",
]);

const RECOVERY_MESSAGE_STATUSES = new Set([
  "scheduled",
  "sent",
  "opened",
  "converted",
  "failed",
  "cancelled",
]);

function normalizeAbandonedCartStatus(value) {
  const status = String(value || "detected")
    .trim()
    .toLowerCase();
  return ABANDONED_CART_STATUSES.has(status) ? status : "detected";
}

function normalizeRecoveryMessageStatus(value) {
  const status = String(value || "scheduled")
    .trim()
    .toLowerCase();
  return RECOVERY_MESSAGE_STATUSES.has(status) ? status : "scheduled";
}

function renderTemplateString(template, context = {}) {
  return String(template || "").replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_m, key) => String(context[key] ?? ""),
  );
}

function mapAbandonedRecovery(row = {}) {
  return {
    id: row.id,
    cartId: row.cart_id,
    customerId: row.customer_id,
    customerEmail: row.customer_email || "",
    customerName: row.customer_name || "Guest",
    itemCount: Number(row.item_count || 0),
    cartValue: Number(row.cart_value || 0),
    currencyCode: row.currency_code || "USD",
    status: normalizeAbandonedCartStatus(row.status),
    lastActivityAt: row.last_activity_at,
    detectedAt: row.detected_at,
    lastContactedAt: row.last_contacted_at,
    reminderScheduledAt: row.reminder_scheduled_at,
    recoveredAt: row.recovered_at,
    recoveredOrderId: row.recovered_order_id || null,
    metadata: row.metadata_json || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecoveryTemplate(row = {}) {
  return {
    id: row.id,
    name: row.name,
    channel: row.channel || "email",
    subject: row.subject_template || "",
    body: row.body_template || "",
    isDefault: Boolean(row.is_default),
    placeholders: Array.isArray(row.placeholders) ? row.placeholders : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listCartRowsForRecovery(storeId) {
  const { data: carts, error: cartError } = await supabase
    .from("carts")
    .select(
      "id, customer_id, status, created_at, updated_at, customers(first_name, last_name, email)",
    )
    .eq("store_id", storeId)
    .in("status", ["active", "abandoned"])
    .order("updated_at", { ascending: false })
    .limit(500);

  if (cartError) {
    throw normalizeError(cartError);
  }

  const cartIds = (carts || []).map((item) => item.id);
  if (!cartIds.length) {
    return [];
  }

  const { data: cartItems, error: itemError } = await supabase
    .from("cart_items")
    .select("cart_id, quantity, unit_price")
    .in("cart_id", cartIds);

  if (itemError) {
    throw normalizeError(itemError);
  }

  const totalsByCart = (cartItems || []).reduce((acc, item) => {
    const bucket = acc.get(item.cart_id) || { itemCount: 0, cartValue: 0 };
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || 0);
    bucket.itemCount += quantity;
    bucket.cartValue += quantity * unitPrice;
    acc.set(item.cart_id, bucket);
    return acc;
  }, new Map());

  return (carts || [])
    .map((cart) => {
      const totals = totalsByCart.get(cart.id) || {
        itemCount: 0,
        cartValue: 0,
      };
      const customerFirstName = cart.customers?.first_name || "";
      const customerLastName = cart.customers?.last_name || "";
      const fullName = [customerFirstName, customerLastName]
        .filter(Boolean)
        .join(" ");

      return {
        id: cart.id,
        customerId: cart.customer_id,
        customerEmail: cart.customers?.email || null,
        customerName: fullName || "Guest",
        lastActivityAt: cart.updated_at || cart.created_at,
        itemCount: totals.itemCount,
        cartValue: Number(totals.cartValue.toFixed(2)),
      };
    })
    .filter((item) => item.itemCount > 0 && item.cartValue > 0);
}

async function ensureAbandonedCartTemplateSeed(store) {
  if (!(await tableExists("recovery_message_templates"))) {
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from("recovery_message_templates")
    .select("id")
    .eq("store_id", store.id)
    .limit(1);

  if (existingError) {
    throw normalizeError(existingError);
  }

  if ((existing || []).length > 0) {
    return;
  }

  const now = new Date().toISOString();
  const templates = [
    {
      store_id: store.id,
      name: "Friendly recovery reminder",
      channel: "email",
      subject_template: "You left items in your cart, {{customer_name}}",
      body_template:
        "Hi {{customer_name}},\n\nYou still have {{item_count}} items worth {{cart_value}} in your cart. Complete checkout here: {{checkout_url}}\n\nNeed help? Reply to this email.",
      is_default: true,
      placeholders: [
        "customer_name",
        "item_count",
        "cart_value",
        "checkout_url",
      ],
      created_at: now,
      updated_at: now,
    },
    {
      store_id: store.id,
      name: "Last chance reminder",
      channel: "email",
      subject_template: "Last chance to complete your order",
      body_template:
        "Hi {{customer_name}},\n\nYour cart is still waiting. Items: {{item_count}} | Value: {{cart_value}}. Complete now: {{checkout_url}}",
      is_default: false,
      placeholders: [
        "customer_name",
        "item_count",
        "cart_value",
        "checkout_url",
      ],
      created_at: now,
      updated_at: now,
    },
  ];

  const { error: insertError } = await supabase
    .from("recovery_message_templates")
    .insert(templates);

  if (insertError) {
    throw normalizeError(insertError);
  }
}

export async function detectAbandonedCarts(options = {}) {
  const { store } = await getStoreContext();
  if (!(await tableExists("abandoned_cart_recoveries"))) {
    throw new Error(
      "Abandoned cart recovery schema missing. Run Feature 15 migration first.",
    );
  }

  const ageHours = Math.max(1, Number(options.ageHours || 24));
  const cutoffMs = Date.now() - ageHours * 60 * 60 * 1000;

  const cartRows = await listCartRowsForRecovery(store.id);
  const candidates = cartRows.filter(
    (item) => new Date(item.lastActivityAt).getTime() <= cutoffMs,
  );

  if (!candidates.length) {
    return { detectedCount: 0, rows: [] };
  }

  const now = new Date().toISOString();
  const upsertRows = candidates.map((item) => ({
    store_id: store.id,
    cart_id: item.id,
    customer_id: item.customerId,
    customer_email: item.customerEmail,
    customer_name: item.customerName,
    item_count: item.itemCount,
    cart_value: item.cartValue,
    currency_code: store.currency_code || "USD",
    status: "detected",
    last_activity_at: item.lastActivityAt,
    detected_at: now,
    metadata_json: {
      ageHours,
      source: "cart_activity",
    },
    updated_at: now,
  }));

  const { data, error } = await supabase
    .from("abandoned_cart_recoveries")
    .upsert(upsertRows, { onConflict: "store_id,cart_id" })
    .select(
      "id, cart_id, customer_id, customer_email, customer_name, item_count, cart_value, currency_code, status, last_activity_at, detected_at, last_contacted_at, reminder_scheduled_at, recovered_at, recovered_order_id, metadata_json, created_at, updated_at",
    );

  if (error) {
    throw normalizeError(error);
  }

  return {
    detectedCount: (data || []).length,
    rows: (data || []).map((item) => mapAbandonedRecovery(item)),
  };
}

export async function getAbandonedCartRecoveries(filters = {}) {
  const { store } = await getStoreContext();

  if (filters.autoDetect !== false) {
    await detectAbandonedCarts({ ageHours: filters.ageHours || 24 });
  }

  let query = supabase
    .from("abandoned_cart_recoveries")
    .select(
      "id, cart_id, customer_id, customer_email, customer_name, item_count, cart_value, currency_code, status, last_activity_at, detected_at, last_contacted_at, reminder_scheduled_at, recovered_at, recovered_order_id, metadata_json, created_at, updated_at",
    )
    .eq("store_id", store.id)
    .order("last_activity_at", { ascending: true });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", normalizeAbandonedCartStatus(filters.status));
  }

  let { data, error } = await query;

  if (error) {
    if (isMissingTableError(error, "abandoned_cart_recoveries")) {
      return [];
    }
    throw normalizeError(error);
  }

  let rows = (data || []).map((item) => mapAbandonedRecovery(item));
  const minAgeHours = Number(filters.ageHours || 0);
  if (minAgeHours > 0) {
    const cutoffMs = Date.now() - minAgeHours * 60 * 60 * 1000;
    rows = rows.filter(
      (item) => new Date(item.lastActivityAt).getTime() <= cutoffMs,
    );
  }

  return rows;
}

export async function updateAbandonedCartRecoveryStatus(
  recoveryId,
  status,
  payload = {},
) {
  if (!recoveryId) {
    throw new Error("Recovery id is required");
  }

  const { store } = await getStoreContext();
  const nextStatus = normalizeAbandonedCartStatus(status);
  const now = new Date().toISOString();
  const updatePayload = {
    status: nextStatus,
    updated_at: now,
  };

  if (nextStatus === "recovered") {
    updatePayload.recovered_at = now;
    updatePayload.recovered_order_id = payload.recoveredOrderId || null;
  }

  const { error } = await supabase
    .from("abandoned_cart_recoveries")
    .update(updatePayload)
    .eq("id", recoveryId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function getRecoveryMessageTemplates() {
  const { store } = await getStoreContext();
  await ensureAbandonedCartTemplateSeed(store);

  const { data, error } = await supabase
    .from("recovery_message_templates")
    .select(
      "id, name, channel, subject_template, body_template, is_default, placeholders, created_at, updated_at",
    )
    .eq("store_id", store.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error, "recovery_message_templates")) {
      return [];
    }
    throw normalizeError(error);
  }

  return (data || []).map((item) => mapRecoveryTemplate(item));
}

export async function createRecoveryMessageTemplate(payload = {}) {
  const { store } = await getStoreContext();
  const name = String(payload.name || "").trim();
  if (!name) {
    throw new Error("Template name is required");
  }

  const { error } = await supabase.from("recovery_message_templates").insert({
    store_id: store.id,
    name,
    channel: payload.channel || "email",
    subject_template: payload.subject || "",
    body_template: payload.body || "",
    is_default: Boolean(payload.isDefault),
    placeholders: Array.isArray(payload.placeholders)
      ? payload.placeholders
      : ["customer_name", "item_count", "cart_value", "checkout_url"],
  });

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function updateRecoveryMessageTemplate(templateId, payload = {}) {
  if (!templateId) {
    throw new Error("Template id is required");
  }

  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("recovery_message_templates")
    .update({
      name: String(payload.name || "").trim(),
      channel: payload.channel || "email",
      subject_template: payload.subject || "",
      body_template: payload.body || "",
      is_default: Boolean(payload.isDefault),
      placeholders: Array.isArray(payload.placeholders)
        ? payload.placeholders
        : ["customer_name", "item_count", "cart_value", "checkout_url"],
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function sendAbandonedCartRecoveryMessage(payload = {}) {
  const { store } = await getStoreContext();
  if (!payload.recoveryId) {
    throw new Error("Recovery id is required");
  }
  if (!payload.templateId) {
    throw new Error("Template id is required");
  }

  const { data: recovery, error: recoveryError } = await supabase
    .from("abandoned_cart_recoveries")
    .select(
      "id, customer_email, customer_name, item_count, cart_value, cart_id, currency_code",
    )
    .eq("id", payload.recoveryId)
    .eq("store_id", store.id)
    .single();

  if (recoveryError) {
    throw normalizeError(recoveryError);
  }

  const { data: template, error: templateError } = await supabase
    .from("recovery_message_templates")
    .select("id, channel, subject_template, body_template")
    .eq("id", payload.templateId)
    .eq("store_id", store.id)
    .single();

  if (templateError) {
    throw normalizeError(templateError);
  }

  const context = {
    customer_name: recovery.customer_name || "there",
    item_count: Number(recovery.item_count || 0),
    cart_value: `${Number(recovery.cart_value || 0).toFixed(2)} ${
      recovery.currency_code || "USD"
    }`,
    checkout_url:
      payload.checkoutUrl ||
      `${typeof window !== "undefined" ? window.location.origin : ""}/checkout`,
  };

  const subject = renderTemplateString(template.subject_template, context);
  const body = renderTemplateString(template.body_template, context);
  const status = payload.scheduleAt ? "scheduled" : "sent";
  const now = new Date().toISOString();

  const { error: messageError } = await supabase
    .from("abandoned_cart_messages")
    .insert({
      store_id: store.id,
      recovery_id: recovery.id,
      template_id: template.id,
      channel: payload.channel || template.channel || "email",
      recipient: recovery.customer_email || null,
      subject,
      body,
      status,
      scheduled_at: payload.scheduleAt || null,
      sent_at: status === "sent" ? now : null,
      metadata_json: {
        placeholders: context,
      },
      created_at: now,
      updated_at: now,
    });

  if (messageError) {
    throw normalizeError(messageError);
  }

  const nextRecoveryStatus = status === "scheduled" ? "scheduled" : "contacted";
  const { error: recoveryUpdateError } = await supabase
    .from("abandoned_cart_recoveries")
    .update({
      status: nextRecoveryStatus,
      last_contacted_at: status === "sent" ? now : null,
      reminder_scheduled_at: status === "scheduled" ? payload.scheduleAt : null,
      updated_at: now,
    })
    .eq("id", recovery.id)
    .eq("store_id", store.id);

  if (recoveryUpdateError) {
    throw normalizeError(recoveryUpdateError);
  }

  return { ok: true };
}

export async function updateAbandonedCartMessageStatus(messageId, status) {
  if (!messageId) {
    throw new Error("Message id is required");
  }

  const { store } = await getStoreContext();
  const nextStatus = normalizeRecoveryMessageStatus(status);
  const now = new Date().toISOString();
  const updatePayload = {
    status: nextStatus,
    updated_at: now,
  };

  if (nextStatus === "opened") {
    updatePayload.opened_at = now;
  }

  if (nextStatus === "converted") {
    updatePayload.converted_at = now;
  }

  const { data: updatedMessage, error: updateError } = await supabase
    .from("abandoned_cart_messages")
    .update(updatePayload)
    .eq("id", messageId)
    .eq("store_id", store.id)
    .select("recovery_id")
    .single();

  if (updateError) {
    throw normalizeError(updateError);
  }

  if (nextStatus === "converted") {
    await updateAbandonedCartRecoveryStatus(
      updatedMessage.recovery_id,
      "recovered",
    );
  }

  return { ok: true };
}

export async function getAbandonedCartPerformance(filters = {}) {
  const { store } = await getStoreContext();
  const trendDays = Math.max(7, Number(filters.trendDays || 14));
  const trend = [];
  const trendMap = new Map();

  for (let offset = trendDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    const day = date.toISOString().slice(0, 10);
    const row = {
      day,
      sent: 0,
      opened: 0,
      converted: 0,
    };
    trend.push(row);
    trendMap.set(day, row);
  }

  const fromDate = `${trend[0]?.day || new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;

  const { data: messageRows, error: messageError } = await supabase
    .from("abandoned_cart_messages")
    .select("status, sent_at, opened_at, converted_at, created_at")
    .eq("store_id", store.id)
    .gte("created_at", fromDate)
    .order("created_at", { ascending: true });

  if (messageError) {
    if (isMissingTableError(messageError, "abandoned_cart_messages")) {
      return {
        summary: {
          totalDetected: 0,
          messagesSent: 0,
          openedCount: 0,
          convertedCount: 0,
          openRate: 0,
          conversionRate: 0,
          recoveredRate: 0,
        },
        trend,
      };
    }
    throw normalizeError(messageError);
  }

  let messagesSent = 0;
  let openedCount = 0;
  let convertedCount = 0;

  for (const message of messageRows || []) {
    const sentDay = String(message.sent_at || message.created_at || "").slice(
      0,
      10,
    );
    if (
      sentDay &&
      trendMap.has(sentDay) &&
      ["sent", "opened", "converted"].includes(message.status)
    ) {
      trendMap.get(sentDay).sent += 1;
      messagesSent += 1;
    }

    const openedDay = String(message.opened_at || "").slice(0, 10);
    if (openedDay && trendMap.has(openedDay)) {
      trendMap.get(openedDay).opened += 1;
      openedCount += 1;
    }

    const convertedDay = String(message.converted_at || "").slice(0, 10);
    if (convertedDay && trendMap.has(convertedDay)) {
      trendMap.get(convertedDay).converted += 1;
      convertedCount += 1;
    }
  }

  const { data: recoveries, error: recoveryError } = await supabase
    .from("abandoned_cart_recoveries")
    .select("id, status")
    .eq("store_id", store.id);

  if (recoveryError) {
    throw normalizeError(recoveryError);
  }

  const totalDetected = (recoveries || []).length;
  const recoveredCount = (recoveries || []).filter(
    (item) => item.status === "recovered",
  ).length;

  return {
    summary: {
      totalDetected,
      messagesSent,
      openedCount,
      convertedCount,
      openRate: Number(
        (messagesSent > 0 ? (openedCount / messagesSent) * 100 : 0).toFixed(2),
      ),
      conversionRate: Number(
        (messagesSent > 0 ? (convertedCount / messagesSent) * 100 : 0).toFixed(
          2,
        ),
      ),
      recoveredRate: Number(
        (totalDetected > 0
          ? (recoveredCount / totalDetected) * 100
          : 0
        ).toFixed(2),
      ),
    },
    trend,
  };
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

const CHECKOUT_STEP_ORDER = [
  "cart_review",
  "customer_info",
  "shipping",
  "payment",
  "review",
  "confirmed",
  "failed",
];

function normalizeCheckoutStep(value) {
  const step = String(value || "cart_review")
    .trim()
    .toLowerCase();
  return CHECKOUT_STEP_ORDER.includes(step) ? step : "cart_review";
}

function isValidCheckoutTransition(currentStep, nextStep) {
  const current = normalizeCheckoutStep(currentStep);
  const next = normalizeCheckoutStep(nextStep);

  if (next === current) {
    return true;
  }

  if (next === "failed") {
    return true;
  }

  if (current === "failed" && next === "cart_review") {
    return true;
  }

  if (current === "confirmed") {
    return false;
  }

  const currentIndex = CHECKOUT_STEP_ORDER.indexOf(current);
  const nextIndex = CHECKOUT_STEP_ORDER.indexOf(next);
  return nextIndex === currentIndex + 1;
}

async function resolveCheckoutSessionTable() {
  if (await tableExists("checkout_sessions")) {
    return "checkout_sessions";
  }

  return null;
}

async function saveCheckoutSessionEvent(payload) {
  if (!(await tableExists("checkout_state_events"))) {
    return;
  }

  const { error } = await supabase.from("checkout_state_events").insert({
    session_id: payload.sessionId,
    from_state: payload.fromState,
    to_state: payload.toState,
    status: payload.status || "ok",
    note: payload.note || null,
    metadata: payload.metadata || {},
  });

  if (error) {
    throw normalizeError(error);
  }
}

export async function revalidateCheckout(payload = {}) {
  const { store } = await getStoreContext();
  const cart = await getCart();

  if (!cart.items.length) {
    return {
      ok: false,
      issues: [{ code: "CART_EMPTY", message: "Cart is empty" }],
      cart,
      pricing: {
        subtotal: 0,
        discountAmount: 0,
        shippingAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
      },
      appliedDiscounts: [],
    };
  }

  const issues = [];

  const variantIds = cart.items.map((item) => item.variantId).filter(Boolean);
  const { data: liveVariants, error: liveVariantError } = await supabase
    .from("product_variants")
    .select(
      "id, price, quantity_in_stock, products!inner(id, title, store_id, status)",
    )
    .in("id", variantIds)
    .eq("products.store_id", store.id);

  if (liveVariantError) {
    throw normalizeError(liveVariantError);
  }

  const liveById = new Map((liveVariants || []).map((row) => [row.id, row]));

  for (const cartItem of cart.items) {
    const live = liveById.get(cartItem.variantId);
    if (!live) {
      issues.push({
        code: "VARIANT_MISSING",
        message: `${cartItem.productName} is no longer available`,
      });
      continue;
    }

    if (live.products?.status !== "active") {
      issues.push({
        code: "PRODUCT_INACTIVE",
        message: `${cartItem.productName} is not active`,
      });
    }

    if (Number(cartItem.quantity || 0) > Number(live.quantity_in_stock || 0)) {
      issues.push({
        code: "INSUFFICIENT_STOCK",
        message: `Insufficient stock for ${cartItem.productName}`,
      });
    }

    if (Number(cartItem.unitPrice || 0) !== Number(live.price || 0)) {
      issues.push({
        code: "PRICE_CHANGED",
        message: `Price changed for ${cartItem.productName}`,
      });
    }
  }

  const shippingMethods = (await getShippingMethods()).filter(
    (item) => item.isActive,
  );
  if (payload.shippingMethodId) {
    const selectedShipping = shippingMethods.find(
      (item) => item.id === payload.shippingMethodId,
    );
    if (!selectedShipping) {
      issues.push({
        code: "SHIPPING_INVALID",
        message: "Selected shipping method is unavailable",
      });
    }
  }

  const paymentMethods = (await getPaymentMethods()).filter(
    (item) => item.isActive,
  );
  if (payload.paymentMethodId) {
    const selectedPayment = paymentMethods.find(
      (item) => item.id === payload.paymentMethodId,
    );
    if (!selectedPayment) {
      issues.push({
        code: "PAYMENT_INVALID",
        message: "Selected payment method is unavailable",
      });
    }
  }

  const subtotalAmount = Number(cart.subtotal || 0);
  let appliedDiscounts = [];
  if (payload.discountCode) {
    const activeDiscounts = await listDiscountRows(store.id, "active");
    const discountResolution = resolveApplicableDiscounts(activeDiscounts, {
      subtotal: subtotalAmount,
      cartItemCount: cart.items.length,
      codes: payload.discountCode,
    });

    if (!discountResolution.applied.length) {
      issues.push({
        code: "DISCOUNT_INVALID",
        message: "Discount is inactive, expired, or not eligible",
      });
    } else {
      appliedDiscounts = discountResolution.applied;
      for (const rejected of discountResolution.rejected) {
        issues.push({
          code: "DISCOUNT_REJECTED",
          message: `${rejected.code}: ${rejected.reason}`,
        });
      }
    }
  }

  const discountAmount = Number(
    appliedDiscounts
      .reduce(
        (sum, discount) =>
          sum +
          calculateDiscountAmount(subtotalAmount, {
            ...discount,
            applicable_item_count: cart.items.length,
            average_item_amount:
              cart.items.length > 0
                ? Number(subtotalAmount) / Number(cart.items.length)
                : 0,
          }),
        0,
      )
      .toFixed(2),
  );

  const selectedShippingMethod = shippingMethods.find(
    (item) => item.id === payload.shippingMethodId,
  );
  const shippingAmount = Number(selectedShippingMethod?.baseRate || 0);

  const taxRules = await getTaxRules();
  const matchingTaxRule = resolveMatchingTaxRule(taxRules, payload.country);
  const pricing = resolveTaxPricing({
    subtotalAmount,
    discountAmount,
    shippingAmount,
    taxRule: matchingTaxRule,
    manualTaxAmount: 0,
  });

  const currencyQuote = await getCurrencyConversionQuote({
    baseCurrency: store.currency || store.currency_code || "USD",
    displayCurrency: payload.displayCurrency || store.currency || "USD",
    subtotal: subtotalAmount,
    discountAmount,
    shippingAmount,
    taxableAmount: pricing.taxableAmount,
    taxAmount: pricing.taxAmount,
    totalAmount: pricing.totalAmount,
  });

  return {
    ok: issues.length === 0,
    issues,
    cart,
    appliedDiscounts: appliedDiscounts.map((item) => ({
      id: item.id,
      code: item.code,
      title: item.title,
      amount: Number(item.calculated_amount || 0),
    })),
    pricing: {
      subtotal: subtotalAmount,
      discountAmount,
      shippingAmount,
      taxableAmount: pricing.taxableAmount,
      taxAmount: pricing.taxAmount,
      totalAmount: pricing.totalAmount,
      taxBehavior: pricing.taxBehavior,
      taxRate: pricing.taxRate,
    },
    currencyQuote,
  };
}

export async function getCheckoutRecoveryState() {
  const { authUser, store } = await getStoreContext();
  const cart = await ensureActiveCart(store.id);
  const checkoutSessionTable = await resolveCheckoutSessionTable();

  if (!checkoutSessionTable) {
    return {
      sessionId: null,
      state: "cart_review",
      status: "in_progress",
      formData: {},
      revalidation: null,
      lastError: null,
    };
  }

  const { data, error } = await supabase
    .from(checkoutSessionTable)
    .select(
      "id, current_state, status, form_data_json, revalidation_json, last_error, updated_at",
    )
    .eq("store_id", store.id)
    .eq("cart_id", cart.id)
    .eq("user_id", authUser.id)
    .in("status", ["in_progress", "failed"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw normalizeError(error);
  }

  if (!data) {
    return {
      sessionId: null,
      state: "cart_review",
      status: "in_progress",
      formData: {},
      revalidation: null,
      lastError: null,
    };
  }

  return {
    sessionId: data.id,
    state: normalizeCheckoutStep(data.current_state),
    status: data.status,
    formData: data.form_data_json || {},
    revalidation: data.revalidation_json || null,
    lastError: data.last_error || null,
  };
}

export async function saveCheckoutRecoveryState(payload = {}) {
  const { authUser, store } = await getStoreContext();
  const cart = await ensureActiveCart(store.id);
  const checkoutSessionTable = await resolveCheckoutSessionTable();

  if (!checkoutSessionTable) {
    return {
      sessionId: null,
      state: normalizeCheckoutStep(payload.state),
      status: "in_progress",
      formData: payload.formData || {},
      revalidation: payload.revalidation || null,
      lastError: payload.lastError || null,
    };
  }

  const existing = await getCheckoutRecoveryState();
  const nextState = normalizeCheckoutStep(payload.state || existing.state);
  if (!isValidCheckoutTransition(existing.state, nextState)) {
    const transitionError = new Error(
      `Invalid checkout transition from ${existing.state} to ${nextState}`,
    );
    transitionError.code = "CHECKOUT_TRANSITION_INVALID";
    throw transitionError;
  }

  const nextStatus =
    payload.status ||
    (nextState === "confirmed"
      ? "completed"
      : nextState === "failed"
        ? "failed"
        : "in_progress");

  const dataPayload = {
    store_id: store.id,
    cart_id: cart.id,
    user_id: authUser.id,
    current_state: nextState,
    status: nextStatus,
    form_data_json: payload.formData || existing.formData || {},
    revalidation_json: payload.revalidation || existing.revalidation || null,
    last_error: payload.lastError || null,
    last_attempted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let sessionId = existing.sessionId;

  if (sessionId) {
    const { error: updateError } = await supabase
      .from(checkoutSessionTable)
      .update(dataPayload)
      .eq("id", sessionId)
      .eq("store_id", store.id)
      .eq("user_id", authUser.id);

    if (updateError) {
      throw normalizeError(updateError);
    }
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from(checkoutSessionTable)
      .insert(dataPayload)
      .select("id")
      .single();

    if (insertError) {
      throw normalizeError(insertError);
    }

    sessionId = inserted.id;
  }

  await saveCheckoutSessionEvent({
    sessionId,
    fromState: existing.state || "cart_review",
    toState: nextState,
    status: nextStatus === "failed" ? "error" : "ok",
    note: payload.note || null,
    metadata: payload.metadata || {},
  });

  return {
    sessionId,
    state: nextState,
    status: nextStatus,
    formData: dataPayload.form_data_json,
    revalidation: dataPayload.revalidation_json,
    lastError: dataPayload.last_error,
  };
}

export async function getCheckoutSnapshot() {
  const { store } = await getStoreContext();
  const [
    cart,
    discounts,
    paymentMethods,
    shippingMethods,
    taxRules,
    recovery,
    currencySettings,
  ] = await Promise.all([
    getCart(),
    getDiscounts("active"),
    getPaymentMethods(),
    getShippingMethods(),
    getTaxRules(),
    getCheckoutRecoveryState(),
    getCurrencySettings(),
  ]);

  return {
    store: mapStoreSummary(store),
    cart,
    discounts,
    paymentMethods: paymentMethods.filter((item) => item.isActive),
    shippingMethods: shippingMethods.filter((item) => item.isActive),
    taxRules: taxRules.filter((item) => item.isActive),
    recovery,
    currencySettings,
  };
}

export async function createOrderFromCart(payload) {
  const { authUser, store } = await getStoreContext();
  const activeState = normalizeCheckoutStep(payload.checkoutState || "review");

  await saveCheckoutRecoveryState({
    state: activeState,
    status: "in_progress",
    formData: payload.formData || payload,
    note: "Checkout submit attempt",
  });

  const precheck = await revalidateCheckout(payload);
  if (!precheck.ok) {
    await saveCheckoutRecoveryState({
      state: "failed",
      status: "failed",
      formData: payload.formData || payload,
      revalidation: precheck,
      lastError: precheck.issues.map((item) => item.message).join("; "),
      note: "Revalidation failed before order creation",
    });

    const err = new Error(
      `Checkout revalidation failed: ${precheck.issues
        .map((item) => item.message)
        .join("; ")}`,
    );
    err.code = "CHECKOUT_REVALIDATION_FAILED";
    throw err;
  }

  const cart = await getCart();

  if (!cart.items.length) {
    await saveCheckoutRecoveryState({
      state: "failed",
      status: "failed",
      formData: payload.formData || payload,
      lastError: "Cart is empty",
      note: "Cart empty during submit",
    });
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
  let appliedDiscounts = [];
  if (payload.discountCode) {
    const discounts = await listDiscountRows(store.id, "active");
    const codes = normalizeCodeList(payload.discountCode);
    const resolution = resolveApplicableDiscounts(discounts, {
      subtotal: Number(cart.subtotal || 0),
      cartItemCount: Array.isArray(cart.items) ? cart.items.length : 0,
      codes,
    });

    if (!resolution.applied.length) {
      throw new Error("Discount code not found, inactive, or ineligible");
    }

    appliedDiscounts = resolution.applied;
    appliedDiscount = resolution.applied[0];
  }

  const subtotalAmount = Number(cart.subtotal || 0);
  const discountAmount = appliedDiscounts.length
    ? Number(
        appliedDiscounts
          .reduce(
            (sum, discount) =>
              sum +
              calculateDiscountAmount(subtotalAmount, {
                ...discount,
                applicable_item_count: Array.isArray(cart.items)
                  ? cart.items.length
                  : 0,
                average_item_amount:
                  Array.isArray(cart.items) && cart.items.length
                    ? Number(subtotalAmount) / Number(cart.items.length)
                    : 0,
              }),
            0,
          )
          .toFixed(2),
      )
    : calculateDiscountAmount(subtotalAmount, appliedDiscount);
  const activeShippingMethods = await getShippingMethods();
  const selectedShippingMethod = activeShippingMethods.find(
    (item) => item.id === payload.shippingMethodId,
  );
  const paymentMethods = await getPaymentMethods();
  const selectedPaymentMethod = paymentMethods.find(
    (item) => item.id === payload.paymentMethodId,
  );
  const taxRules = await getTaxRules();
  const matchingTaxRule = resolveMatchingTaxRule(taxRules, payload.country);

  const shippingAmount = Number(
    selectedShippingMethod?.baseRate ?? payload.shippingAmount ?? 0,
  );
  const pricing = resolveTaxPricing({
    subtotalAmount,
    discountAmount,
    shippingAmount,
    taxRule: matchingTaxRule,
    manualTaxAmount: Number(payload.taxAmount || 0),
  });
  const taxAmount = pricing.taxAmount;
  const totalAmount = pricing.totalAmount;

  const currencyQuote = await getCurrencyConversionQuote({
    baseCurrency: store.currency || store.currency_code || "USD",
    displayCurrency:
      payload.displayCurrency || store.currency || store.currency_code || "USD",
    subtotal: subtotalAmount,
    discountAmount,
    shippingAmount,
    taxableAmount: pricing.taxableAmount,
    taxAmount,
    totalAmount,
  });

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
      currency_code: store.currency || store.currency_code || "USD",
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
    const transactionStatus =
      selectedPaymentMethod.provider === "manual" ? "authorized" : "pending";

    const { data: insertedTransaction, error: transactionError } =
      await supabase
        .from("transactions")
        .insert({
          store_id: store.id,
          order_id: order.id,
          payment_method_id: selectedPaymentMethod.id,
          amount: totalAmount,
          currency_code: store.currency || store.currency_code || "USD",
          status: transactionStatus,
          gateway_transaction_id: `txn-${Date.now().toString(36)}`,
          gateway_response: { provider: selectedPaymentMethod.provider },
        })
        .select("id, gateway_transaction_id")
        .single();

    if (transactionError) {
      throw normalizeError(transactionError);
    }

    if (insertedTransaction?.id) {
      await createTransactionEvent({
        transactionId: insertedTransaction.id,
        orderId: order.id,
        eventType:
          transactionStatus === "authorized" ? "authorization" : "attempt",
        status: transactionStatus,
        providerStatus: transactionStatus,
        amount: totalAmount,
        referenceId: insertedTransaction.gateway_transaction_id,
        note: `Checkout initiated payment via ${selectedPaymentMethod.provider}`,
        metadata: { provider: selectedPaymentMethod.provider },
      });
    }
  }

  const invoiceInsertPayload = {
    store_id: store.id,
    order_id: order.id,
    invoice_number: createInvoiceNumber(),
    subtotal: subtotalAmount,
    taxable_amount: pricing.taxableAmount,
    tax_rate: pricing.taxRate,
    tax_behavior: pricing.taxBehavior,
    tax_rule_id: pricing.taxRuleId,
    tax_amount: taxAmount,
    discount_amount: discountAmount,
    total: totalAmount,
    metadata_json: {
      source: "checkout",
      country: payload.country || null,
      shippingMethodId: payload.shippingMethodId || null,
      paymentMethodId: payload.paymentMethodId || null,
      taxRuleId: pricing.taxRuleId,
    },
  };

  let { error: invoiceError } = await supabase
    .from("invoices")
    .insert(invoiceInsertPayload);

  if (invoiceError && isMissingColumnError(invoiceError, "taxable_amount")) {
    const fallbackInvoice = await supabase.from("invoices").insert({
      store_id: store.id,
      order_id: order.id,
      invoice_number: createInvoiceNumber(),
      subtotal: subtotalAmount,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total: totalAmount,
    });
    invoiceError = fallbackInvoice.error;
  }

  if (invoiceError) {
    throw normalizeError(invoiceError);
  }

  if (await tableExists("order_currency_snapshots")) {
    const { error: snapshotError } = await supabase
      .from("order_currency_snapshots")
      .insert({
        store_id: store.id,
        order_id: order.id,
        base_currency: currencyQuote.baseCurrency,
        display_currency: currencyQuote.displayCurrency,
        fx_rate: currencyQuote.rate,
        fx_source: currencyQuote.source,
        fx_confidence: currencyQuote.confidence,
        fx_as_of: currencyQuote.asOf,
        used_fallback: currencyQuote.usedFallback,
        rounding_policy: currencyQuote.roundingPolicy,
        subtotal_display: currencyQuote.converted.subtotal,
        discount_display: currencyQuote.converted.discountAmount,
        shipping_display: currencyQuote.converted.shippingAmount,
        tax_display: currencyQuote.converted.taxAmount,
        total_display: currencyQuote.converted.totalAmount,
      });

    if (
      snapshotError &&
      !isMissingTableError(snapshotError, "order_currency_snapshots")
    ) {
      throw normalizeError(snapshotError);
    }
  }

  if (
    payload.subscriptionId &&
    (await tableExists("order_subscription_context"))
  ) {
    const { error: subscriptionContextError } = await supabase
      .from("order_subscription_context")
      .insert({
        store_id: store.id,
        order_id: order.id,
        subscription_id: payload.subscriptionId,
        is_renewal: Boolean(payload.isSubscriptionRenewal),
        cycle_index: payload.subscriptionCycleIndex || null,
        context_json: payload.subscriptionContext || {},
      });

    if (
      subscriptionContextError &&
      !isMissingTableError(
        subscriptionContextError,
        "order_subscription_context",
      )
    ) {
      throw normalizeError(subscriptionContextError);
    }
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

    if (quantityAfter < 0) {
      throw new Error(
        `Insufficient stock for SKU ${item.sku || item.variantId}`,
      );
    }

    const { data: stockRows, error: stockError } = await supabase
      .from("product_variants")
      .update({
        quantity_in_stock: quantityAfter,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.variantId)
      .eq("quantity_in_stock", quantityBefore)
      .select("id");

    if (stockError) {
      throw normalizeError(stockError);
    }

    if (!(stockRows || []).length) {
      throw new Error(
        `Stock for SKU ${item.sku || item.variantId} changed during checkout. Please retry.`,
      );
    }

    await recordStockMovement({
      storeId: store.id,
      variantId: item.variantId,
      quantityBefore,
      quantityAfter,
      quantityDelta: -Number(item.quantity || 0),
      reasonCode: "sale",
      note: `Order ${order.order_number}`,
      metadata: { orderId: order.id, orderNumber: order.order_number },
    });

    await syncInventoryLevelSnapshot({
      storeId: store.id,
      variantId: item.variantId,
      sku: item.sku,
      variantTitle: item.variantName || item.variantTitle,
      quantityAfter,
      reorderLevel: Number(item.reorderLevel || 0),
    });
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

  if (appliedDiscounts.length) {
    for (const discount of appliedDiscounts) {
      const { error: discountUpdateError } = await supabase
        .from("discounts")
        .update({
          uses_count: Number(discount.uses_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", discount.id)
        .eq("store_id", store.id);

      if (discountUpdateError) {
        throw normalizeError(discountUpdateError);
      }
    }
  }

  await ensureActiveCart(store.id);

  await saveCheckoutRecoveryState({
    state: "confirmed",
    status: "completed",
    formData: payload.formData || payload,
    revalidation: precheck,
    note: `Order ${order.order_number} created`,
    metadata: { orderId: order.id, orderNumber: order.order_number },
  });

  await invalidateAnalyticsReportCache(store.id, "analytics_overview");

  return {
    id: order.id,
    orderNumber: order.order_number,
    currencyQuote,
  };
}

const ORDER_STATUS_FLOW = {
  pending: ["not_paid", "cancelled"],
  not_paid: ["need_ship", "cancelled", "failed_delivery"],
  need_ship: ["ongoing_shipped", "cancelled", "failed_delivery"],
  ongoing_shipped: ["receive", "failed_delivery"],
  failed_delivery: ["need_ship", "cancelled"],
  receive: [],
  cancelled: [],
};

const PAYMENT_STATUS_FLOW = {
  pending: ["authorized", "paid", "failed", "cancelled"],
  authorized: ["paid", "failed", "refunded"],
  paid: ["partially_refunded", "refunded"],
  partially_refunded: ["refunded"],
  refunded: [],
  failed: ["pending", "cancelled"],
  cancelled: [],
};

const FULFILLMENT_STATUS_FLOW = {
  unfulfilled: ["partial", "shipped", "fulfilled", "cancelled"],
  partial: ["shipped", "fulfilled", "cancelled"],
  shipped: ["delivered", "failed"],
  fulfilled: ["delivered"],
  delivered: [],
  failed: ["shipped", "cancelled"],
  cancelled: [],
};

function canTransition(flow, from, to) {
  const fromKey = String(from || "").toLowerCase();
  const toKey = String(to || "").toLowerCase();

  if (!toKey || toKey === fromKey) {
    return true;
  }

  const allowed = flow[fromKey] || [];
  return allowed.includes(toKey);
}

async function logOrderTimelineEvent(
  orderIdValue,
  statusValue,
  authUserId,
  note,
) {
  const { error: timelineError } = await supabase
    .from("order_timeline")
    .insert({
      order_id: orderIdValue,
      status: statusValue,
      actor_type: "user",
      actor_id: authUserId,
      note: note || null,
    });

  if (timelineError) {
    throw normalizeError(timelineError);
  }
}

async function logOrderStateEvent(payload) {
  if (!(await tableExists("order_state_events"))) {
    return;
  }

  const { error } = await supabase.from("order_state_events").insert({
    order_id: payload.orderId,
    actor_id: payload.actorId,
    event_type: payload.eventType,
    from_value: payload.fromValue || null,
    to_value: payload.toValue || null,
    note: payload.note || null,
    metadata: payload.metadata || {},
  });

  if (error) {
    throw normalizeError(error);
  }
}

async function fetchOrderLifecycleSnapshot(orderIdValue, storeId) {
  let { data, error } = await supabase
    .from("orders")
    .select("id, status, payment_status, fulfillment_status")
    .eq("id", orderIdValue)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error && isMissingColumnError(error, "fulfillment_status")) {
    const fallback = await supabase
      .from("orders")
      .select("id, status, payment_status")
      .eq("id", orderIdValue)
      .eq("store_id", storeId)
      .maybeSingle();

    data = fallback.data
      ? {
          ...fallback.data,
          fulfillment_status:
            fallback.data.status === "receive"
              ? "delivered"
              : fallback.data.status === "ongoing_shipped"
                ? "shipped"
                : fallback.data.status === "cancelled"
                  ? "cancelled"
                  : "unfulfilled",
        }
      : fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  if (!data) {
    const err = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    throw err;
  }

  return data;
}

async function updateOrderLifecycle(orderIdValue, payload = {}) {
  const { authUser, store } = await getStoreContext();
  const current = await fetchOrderLifecycleSnapshot(orderIdValue, store.id);

  const nextStatus = payload.status || current.status;
  const nextPaymentStatus = payload.paymentStatus || current.payment_status;
  const nextFulfillmentStatus =
    payload.fulfillmentStatus || current.fulfillment_status;

  if (!canTransition(ORDER_STATUS_FLOW, current.status, nextStatus)) {
    throw new Error(
      `Invalid order status transition: ${current.status} -> ${nextStatus}`,
    );
  }

  if (
    !canTransition(
      PAYMENT_STATUS_FLOW,
      current.payment_status,
      nextPaymentStatus,
    )
  ) {
    throw new Error(
      `Invalid payment status transition: ${current.payment_status} -> ${nextPaymentStatus}`,
    );
  }

  if (
    !canTransition(
      FULFILLMENT_STATUS_FLOW,
      current.fulfillment_status,
      nextFulfillmentStatus,
    )
  ) {
    throw new Error(
      `Invalid fulfillment status transition: ${current.fulfillment_status} -> ${nextFulfillmentStatus}`,
    );
  }

  const updatePayload = {
    status: nextStatus,
    payment_status: nextPaymentStatus,
    fulfillment_status: nextFulfillmentStatus,
    updated_at: new Date().toISOString(),
  };

  let { data: updatedOrder, error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderIdValue)
    .eq("store_id", store.id)
    .select(
      "id, order_number, status, payment_status, fulfillment_status, total_amount, created_at, updated_at",
    )
    .maybeSingle();

  if (error && isMissingColumnError(error, "fulfillment_status")) {
    const fallback = await supabase
      .from("orders")
      .update({
        status: nextStatus,
        payment_status: nextPaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderIdValue)
      .eq("store_id", store.id)
      .select(
        "id, order_number, status, payment_status, total_amount, created_at, updated_at",
      )
      .maybeSingle();

    updatedOrder = fallback.data
      ? {
          ...fallback.data,
          fulfillment_status: current.fulfillment_status,
        }
      : fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  if (!updatedOrder) {
    const err = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    throw err;
  }

  if (nextStatus !== current.status) {
    await logOrderTimelineEvent(
      updatedOrder.id,
      nextStatus,
      authUser.id,
      payload.note || `Order status updated to ${nextStatus}`,
    );
    await logOrderStateEvent({
      orderId: updatedOrder.id,
      actorId: authUser.id,
      eventType: "order_status",
      fromValue: current.status,
      toValue: nextStatus,
      note: payload.note,
    });
  }

  if (nextPaymentStatus !== current.payment_status) {
    await logOrderTimelineEvent(
      updatedOrder.id,
      nextStatus,
      authUser.id,
      payload.note || `Payment status updated to ${nextPaymentStatus}`,
    );
    await logOrderStateEvent({
      orderId: updatedOrder.id,
      actorId: authUser.id,
      eventType: "payment_status",
      fromValue: current.payment_status,
      toValue: nextPaymentStatus,
      note: payload.note,
    });
  }

  if (nextFulfillmentStatus !== current.fulfillment_status) {
    await logOrderTimelineEvent(
      updatedOrder.id,
      nextStatus,
      authUser.id,
      payload.note || `Fulfillment status updated to ${nextFulfillmentStatus}`,
    );
    await logOrderStateEvent({
      orderId: updatedOrder.id,
      actorId: authUser.id,
      eventType: "fulfillment_status",
      fromValue: current.fulfillment_status,
      toValue: nextFulfillmentStatus,
      note: payload.note,
    });
  }

  if (payload.internalNote) {
    await logOrderTimelineEvent(
      updatedOrder.id,
      nextStatus,
      authUser.id,
      `Internal note: ${payload.internalNote}`,
    );
    await logOrderStateEvent({
      orderId: updatedOrder.id,
      actorId: authUser.id,
      eventType: "internal_note",
      fromValue: null,
      toValue: null,
      note: payload.internalNote,
    });
  }

  await invalidateAnalyticsReportCache(store.id, "analytics_overview");

  return {
    id: updatedOrder.id,
    order_number: updatedOrder.order_number,
    orderNumber: updatedOrder.order_number,
    total_price: Number(updatedOrder.total_amount || 0),
    total: Number(updatedOrder.total_amount || 0),
    status: updatedOrder.status,
    paymentStatus: updatedOrder.payment_status,
    fulfillmentStatus:
      updatedOrder.fulfillment_status || current.fulfillment_status,
    created_at: updatedOrder.created_at,
    updated_at: updatedOrder.updated_at,
  };
}

export async function addOrderInternalNote(orderId, note) {
  const text = String(note || "").trim();
  if (!text) {
    throw new Error("Internal note is required");
  }

  return updateOrderLifecycle(orderId, {
    internalNote: text,
    note: "Internal order note added",
  });
}

export async function updateOrderLifecycleState(orderId, payload) {
  return updateOrderLifecycle(orderId, payload || {});
}

export function getOrderLifecycleOptions(current = {}) {
  const status = String(current.status || "").toLowerCase();
  const paymentStatus = String(current.paymentStatus || "").toLowerCase();
  const fulfillmentStatus = String(
    current.fulfillmentStatus || "",
  ).toLowerCase();

  const statusOptions = [status, ...(ORDER_STATUS_FLOW[status] || [])].filter(
    Boolean,
  );
  const paymentOptions = [
    paymentStatus,
    ...(PAYMENT_STATUS_FLOW[paymentStatus] || []),
  ].filter(Boolean);
  const fulfillmentOptions = [
    fulfillmentStatus,
    ...(FULFILLMENT_STATUS_FLOW[fulfillmentStatus] || []),
  ].filter(Boolean);

  return {
    status: Array.from(new Set(statusOptions)),
    paymentStatus: Array.from(new Set(paymentOptions)),
    fulfillmentStatus: Array.from(new Set(fulfillmentOptions)),
  };
}

export async function getOrderDetail(orderId) {
  const { store } = await getStoreContext();
  const hasOrderCurrencySnapshots = await tableExists(
    "order_currency_snapshots",
  );
  const hasOrderSubscriptionContext = await tableExists(
    "order_subscription_context",
  );
  let orderResponse = await supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, fulfillment_status, subtotal_amount, discount_amount, tax_amount, shipping_amount, total_amount, currency_code, note, shipping_address, billing_address, created_at, updated_at, customers(first_name, last_name, email, phone)",
    )
    .eq("store_id", store.id)
    .eq("id", orderId)
    .maybeSingle();

  if (
    orderResponse.error &&
    isMissingColumnError(orderResponse.error, "fulfillment_status")
  ) {
    const fallbackOrderResponse = await supabase
      .from("orders")
      .select(
        "id, order_number, status, payment_status, subtotal_amount, discount_amount, tax_amount, shipping_amount, total_amount, currency_code, note, shipping_address, billing_address, created_at, updated_at, customers(first_name, last_name, email, phone)",
      )
      .eq("store_id", store.id)
      .eq("id", orderId)
      .maybeSingle();

    orderResponse = {
      data: fallbackOrderResponse.data
        ? {
            ...fallbackOrderResponse.data,
            fulfillment_status:
              fallbackOrderResponse.data.status === "receive"
                ? "delivered"
                : fallbackOrderResponse.data.status === "ongoing_shipped"
                  ? "shipped"
                  : fallbackOrderResponse.data.status === "cancelled"
                    ? "cancelled"
                    : "unfulfilled",
          }
        : fallbackOrderResponse.data,
      error: fallbackOrderResponse.error,
    };
  }

  const [
    itemsResponse,
    timelineResponse,
    transactionsResponse,
    shipmentsResponse,
    invoiceResponse,
    returnsResponse,
    refundsResponse,
    currencySnapshotResponse,
    subscriptionContextResponse,
  ] = await Promise.all([
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
        "id, amount, captured_amount, currency_code, status, provider_status, gateway_transaction_id, failure_code, created_at, payment_methods(display_name)",
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
        "id, invoice_number, subtotal, taxable_amount, tax_rate, tax_behavior, tax_amount, discount_amount, total, status, metadata_json, issued_at",
      )
      .eq("store_id", store.id)
      .eq("order_id", orderId)
      .maybeSingle(),
    supabase
      .from("returns")
      .select(
        "id, rma_number, reason, reason_code, resolution_note, status, requested_at, approved_at, rejected_at, received_at, refunded_at",
      )
      .eq("store_id", store.id)
      .eq("order_id", orderId)
      .order("requested_at", { ascending: true }),
    supabase
      .from("refunds")
      .select(
        "id, amount, status, refund_type, reason_code, note, processed_at, created_at, returns!inner(order_id)",
      )
      .eq("store_id", store.id)
      .eq("returns.order_id", orderId)
      .order("created_at", { ascending: true }),
    hasOrderCurrencySnapshots
      ? supabase
          .from("order_currency_snapshots")
          .select(
            "display_currency, base_currency, fx_rate, fx_source, fx_confidence, fx_as_of, used_fallback, subtotal_display, discount_display, shipping_display, tax_display, total_display",
          )
          .eq("store_id", store.id)
          .eq("order_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    hasOrderSubscriptionContext
      ? supabase
          .from("order_subscription_context")
          .select(
            "subscription_id, is_renewal, cycle_index, context_json, customer_subscriptions(status, next_billing_at, plan_id, subscription_plans(name))",
          )
          .eq("store_id", store.id)
          .eq("order_id", orderId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
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
    if (isMissingColumnError(transactionsResponse.error, "captured_amount")) {
      const fallbackTransactions = await supabase
        .from("transactions")
        .select(
          "id, amount, currency_code, status, gateway_transaction_id, created_at, payment_methods(display_name)",
        )
        .eq("store_id", store.id)
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (fallbackTransactions.error) {
        throw normalizeError(fallbackTransactions.error);
      }

      transactionsResponse.data = (fallbackTransactions.data || []).map(
        (item) => ({
          ...item,
          captured_amount:
            item.status === "captured"
              ? Number(item.amount || 0)
              : item.status === "partially_captured"
                ? Number(item.amount || 0) / 2
                : 0,
          provider_status: null,
          failure_code: null,
        }),
      );
    } else {
      throw normalizeError(transactionsResponse.error);
    }
  }
  if (shipmentsResponse.error) {
    throw normalizeError(shipmentsResponse.error);
  }
  if (invoiceResponse.error) {
    if (isMissingColumnError(invoiceResponse.error, "taxable_amount")) {
      const fallbackInvoiceResponse = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, subtotal, tax_amount, discount_amount, total, issued_at",
        )
        .eq("store_id", store.id)
        .eq("order_id", orderId)
        .maybeSingle();

      if (fallbackInvoiceResponse.error) {
        throw normalizeError(fallbackInvoiceResponse.error);
      }

      invoiceResponse.data = fallbackInvoiceResponse.data
        ? {
            ...fallbackInvoiceResponse.data,
            taxable_amount: fallbackInvoiceResponse.data.subtotal,
            tax_rate: 0,
            tax_behavior: "exclusive",
            status: "issued",
            metadata_json: {},
          }
        : fallbackInvoiceResponse.data;
    } else {
      throw normalizeError(invoiceResponse.error);
    }
  }
  if (returnsResponse.error) {
    if (isMissingColumnError(returnsResponse.error, "reason_code")) {
      const fallbackReturns = await supabase
        .from("returns")
        .select("id, rma_number, reason, status, requested_at")
        .eq("store_id", store.id)
        .eq("order_id", orderId)
        .order("requested_at", { ascending: true });

      if (fallbackReturns.error) {
        throw normalizeError(fallbackReturns.error);
      }

      returnsResponse.data = (fallbackReturns.data || []).map((item) => ({
        ...item,
        reason_code: "other",
        resolution_note: null,
        approved_at: null,
        rejected_at: null,
        received_at: null,
        refunded_at: null,
      }));
    } else {
      throw normalizeError(returnsResponse.error);
    }
  }
  if (refundsResponse.error) {
    if (isMissingColumnError(refundsResponse.error, "refund_type")) {
      const fallbackRefunds = await supabase
        .from("refunds")
        .select("id, amount, status, created_at, returns!inner(order_id)")
        .eq("store_id", store.id)
        .eq("returns.order_id", orderId)
        .order("created_at", { ascending: true });

      if (fallbackRefunds.error) {
        throw normalizeError(fallbackRefunds.error);
      }

      refundsResponse.data = (fallbackRefunds.data || []).map((item) => ({
        ...item,
        refund_type: "partial",
        reason_code: "other",
        note: null,
        processed_at: item.created_at,
      }));
    } else {
      throw normalizeError(refundsResponse.error);
    }
  }
  if (currencySnapshotResponse.error) {
    throw normalizeError(currencySnapshotResponse.error);
  }
  if (subscriptionContextResponse.error) {
    throw normalizeError(subscriptionContextResponse.error);
  }

  if (!orderResponse.data) {
    throw new Error("Order not found");
  }

  const currencySnapshot = currencySnapshotResponse.data || null;
  const subscriptionContext = subscriptionContextResponse.data || null;

  const customer = Array.isArray(orderResponse.data.customers)
    ? orderResponse.data.customers[0]
    : orderResponse.data.customers;

  const transactionIds = (transactionsResponse.data || []).map(
    (item) => item.id,
  );
  const transactionEventMap =
    await loadTransactionEventsByTransactionIds(transactionIds);

  return {
    id: orderResponse.data.id,
    orderNumber: orderResponse.data.order_number,
    status: orderResponse.data.status,
    paymentStatus: orderResponse.data.payment_status,
    fulfillmentStatus: orderResponse.data.fulfillment_status || "unfulfilled",
    subtotalAmount: Number(orderResponse.data.subtotal_amount || 0),
    discountAmount: Number(orderResponse.data.discount_amount || 0),
    taxAmount: Number(orderResponse.data.tax_amount || 0),
    shippingAmount: Number(orderResponse.data.shipping_amount || 0),
    totalAmount: Number(orderResponse.data.total_amount || 0),
    currencyCode: orderResponse.data.currency_code,
    displayCurrencyCode:
      currencySnapshot?.display_currency || orderResponse.data.currency_code,
    displaySubtotalAmount: Number(
      currencySnapshot?.subtotal_display ||
        orderResponse.data.subtotal_amount ||
        0,
    ),
    displayDiscountAmount: Number(
      currencySnapshot?.discount_display ||
        orderResponse.data.discount_amount ||
        0,
    ),
    displayShippingAmount: Number(
      currencySnapshot?.shipping_display ||
        orderResponse.data.shipping_amount ||
        0,
    ),
    displayTaxAmount: Number(
      currencySnapshot?.tax_display || orderResponse.data.tax_amount || 0,
    ),
    displayTotalAmount: Number(
      currencySnapshot?.total_display || orderResponse.data.total_amount || 0,
    ),
    currencySnapshot: currencySnapshot
      ? {
          baseCurrency: currencySnapshot.base_currency,
          displayCurrency: currencySnapshot.display_currency,
          fxRate: Number(currencySnapshot.fx_rate || 1),
          fxSource: currencySnapshot.fx_source || "manual",
          fxConfidence: Number(currencySnapshot.fx_confidence || 0),
          fxAsOf: currencySnapshot.fx_as_of || null,
          usedFallback: Boolean(currencySnapshot.used_fallback),
        }
      : null,
    subscriptionContext: subscriptionContext
      ? {
          subscriptionId: subscriptionContext.subscription_id,
          status:
            subscriptionContext.customer_subscriptions?.status || "active",
          nextBillingAt:
            subscriptionContext.customer_subscriptions?.next_billing_at || null,
          planId: subscriptionContext.customer_subscriptions?.plan_id || null,
          planName:
            subscriptionContext.customer_subscriptions?.subscription_plans
              ?.name ||
            subscriptionContext.context_json?.planName ||
            "Subscription",
          isRenewal: Boolean(subscriptionContext.is_renewal),
          cycleIndex:
            subscriptionContext.cycle_index ??
            subscriptionContext.context_json?.cycleIndex ??
            null,
          context: subscriptionContext.context_json || {},
        }
      : null,
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
      capturedAmount: Number(item.captured_amount || 0),
      currencyCode: item.currency_code,
      status: item.status,
      providerStatus: item.provider_status || "",
      failureCode: item.failure_code || "",
      gatewayTransactionId: item.gateway_transaction_id || "",
      paymentMethodName: item.payment_methods?.display_name || "-",
      attempts: transactionEventMap.get(item.id) || [],
      attemptCount: (transactionEventMap.get(item.id) || []).length,
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
          taxableAmount: Number(
            invoiceResponse.data.taxable_amount ||
              invoiceResponse.data.subtotal ||
              0,
          ),
          taxRate: Number(invoiceResponse.data.tax_rate || 0),
          taxBehavior: normalizeTaxBehavior(invoiceResponse.data.tax_behavior),
          taxAmount: Number(invoiceResponse.data.tax_amount || 0),
          discountAmount: Number(invoiceResponse.data.discount_amount || 0),
          total: Number(invoiceResponse.data.total || 0),
          status: invoiceResponse.data.status || "issued",
          metadata: invoiceResponse.data.metadata_json || {},
          issuedAt: invoiceResponse.data.issued_at,
        }
      : null,
    returns: (returnsResponse.data || []).map((item) => ({
      id: item.id,
      rmaNumber: item.rma_number,
      reason: item.reason || "",
      reasonCode: item.reason_code || "other",
      resolutionNote: item.resolution_note || "",
      status: normalizeReturnStatus(item.status),
      requestedAt: item.requested_at,
      approvedAt: item.approved_at,
      rejectedAt: item.rejected_at,
      receivedAt: item.received_at,
      refundedAt: item.refunded_at,
    })),
    refunds: (refundsResponse.data || []).map((item) => ({
      id: item.id,
      amount: Number(item.amount || 0),
      status: item.status,
      refundType: item.refund_type || "partial",
      reasonCode: item.reason_code || "other",
      note: item.note || "",
      processedAt: item.processed_at || item.created_at,
      createdAt: item.created_at,
    })),
  };
}

export async function getOrders(status = "semua_orders") {
  const { store } = await getStoreContext();

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, fulfillment_status, total_amount, currency_code, created_at, updated_at, customers(first_name, last_name)",
    )
    .eq("store_id", store.id)
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
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (status && status !== "semua_orders") {
      fallbackQuery = fallbackQuery.eq("status", status);
    }

    const fallback = await fallbackQuery;
    data = (fallback.data || []).map((row) => ({
      ...row,
      fulfillment_status:
        row.status === "receive"
          ? "delivered"
          : row.status === "ongoing_shipped"
            ? "shipped"
            : row.status === "cancelled"
              ? "cancelled"
              : "unfulfilled",
    }));
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  let snapshotMap = new Map();
  let subscriptionMap = new Map();
  if (await tableExists("order_currency_snapshots")) {
    const orderIds = (data || []).map((row) => row.id);
    if (orderIds.length) {
      const snapshotResponse = await supabase
        .from("order_currency_snapshots")
        .select("order_id, display_currency, total_display")
        .eq("store_id", store.id)
        .in("order_id", orderIds);

      if (snapshotResponse.error) {
        throw normalizeError(snapshotResponse.error);
      }

      snapshotMap = (snapshotResponse.data || []).reduce((acc, row) => {
        acc.set(row.order_id, row);
        return acc;
      }, new Map());
    }
  }

  if (await tableExists("order_subscription_context")) {
    const orderIds = (data || []).map((row) => row.id);
    if (orderIds.length) {
      const subscriptionResponse = await supabase
        .from("order_subscription_context")
        .select(
          "order_id, subscription_id, is_renewal, context_json, customer_subscriptions(status)",
        )
        .eq("store_id", store.id)
        .in("order_id", orderIds);

      if (subscriptionResponse.error) {
        throw normalizeError(subscriptionResponse.error);
      }

      subscriptionMap = (subscriptionResponse.data || []).reduce((acc, row) => {
        acc.set(row.order_id, row);
        return acc;
      }, new Map());
    }
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
      fulfillmentStatus: order.fulfillment_status || "unfulfilled",
      total_price: Number(order.total_amount || 0),
      total: Number(order.total_amount || 0),
      displayCurrencyCode:
        snapshotMap.get(order.id)?.display_currency || order.currency_code,
      displayTotal: Number(
        snapshotMap.get(order.id)?.total_display || order.total_amount || 0,
      ),
      subscriptionId: subscriptionMap.get(order.id)?.subscription_id || null,
      subscriptionStatus:
        subscriptionMap.get(order.id)?.customer_subscriptions?.status || null,
      isSubscriptionRenewal: Boolean(subscriptionMap.get(order.id)?.is_renewal),
      subscriptionLabel:
        subscriptionMap.get(order.id)?.context_json?.planName || null,
      status: order.status,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  });
}

export async function updateOrderStatus(orderId, status) {
  return updateOrderLifecycle(orderId, { status });
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

  // Fallback path for MVP environments where themes table is not provisioned yet.
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

const SUPPORTED_CURRENCIES = [
  "USD",
  "IDR",
  "SGD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
];

const CURRENCY_MINOR_UNITS = {
  USD: 2,
  IDR: 0,
  SGD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  AUD: 2,
  CAD: 2,
};

function normalizeCurrencyCode(value, fallback = "USD") {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (!normalized) {
    return fallback;
  }
  return SUPPORTED_CURRENCIES.includes(normalized) ? normalized : fallback;
}

function normalizeCurrencyList(values = [], fallback = ["USD", "IDR"]) {
  const source = Array.isArray(values) ? values : [values];
  const normalized = Array.from(
    new Set(
      source.map((item) => normalizeCurrencyCode(item, "")).filter(Boolean),
    ),
  );
  return normalized.length ? normalized : fallback;
}

function roundCurrencyAmount(amount, currencyCode, roundingPolicy = "half_up") {
  const decimals = CURRENCY_MINOR_UNITS[currencyCode] ?? 2;
  const factor = 10 ** decimals;
  const value = Number(amount || 0) * factor;

  if (roundingPolicy === "down") {
    return Number((Math.floor(value) / factor).toFixed(decimals));
  }

  if (roundingPolicy === "up") {
    return Number((Math.ceil(value) / factor).toFixed(decimals));
  }

  return Number((Math.round(value) / factor).toFixed(decimals));
}

async function resolveLatestFxRate(storeId, baseCurrency, quoteCurrency) {
  if (baseCurrency === quoteCurrency) {
    return {
      rate: 1,
      source: "identity",
      confidence: 1,
      asOf: new Date().toISOString(),
      stale: false,
      fallback: false,
    };
  }

  if (!(await tableExists("currency_rate_snapshots"))) {
    return {
      rate: 1,
      source: "fallback",
      confidence: 0,
      asOf: new Date().toISOString(),
      stale: true,
      fallback: true,
    };
  }

  const nowIso = new Date().toISOString();
  let { data, error } = await supabase
    .from("currency_rate_snapshots")
    .select("rate, source, confidence, as_of, expires_at")
    .eq("store_id", storeId)
    .eq("base_currency", baseCurrency)
    .eq("quote_currency", quoteCurrency)
    .gte("expires_at", nowIso)
    .order("as_of", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && isMissingTableError(error, "currency_rate_snapshots")) {
    return {
      rate: 1,
      source: "fallback",
      confidence: 0,
      asOf: new Date().toISOString(),
      stale: true,
      fallback: true,
    };
  }

  if (error) {
    throw normalizeError(error);
  }

  if (!data) {
    const stale = await supabase
      .from("currency_rate_snapshots")
      .select("rate, source, confidence, as_of, expires_at")
      .eq("store_id", storeId)
      .eq("base_currency", baseCurrency)
      .eq("quote_currency", quoteCurrency)
      .order("as_of", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      stale.error &&
      !isMissingTableError(stale.error, "currency_rate_snapshots")
    ) {
      throw normalizeError(stale.error);
    }

    data = stale.data || null;
  }

  if (!data) {
    return {
      rate: 1,
      source: "fallback",
      confidence: 0,
      asOf: new Date().toISOString(),
      stale: true,
      fallback: true,
    };
  }

  return {
    rate: Number(data.rate || 1),
    source: data.source || "manual",
    confidence: Number(data.confidence || 0),
    asOf: data.as_of,
    stale: Boolean(data.expires_at && data.expires_at < nowIso),
    fallback: false,
  };
}

export async function getCurrencySettings() {
  const { store } = await getStoreContext();
  const baseCurrency = normalizeCurrencyCode(
    store.currency || store.currency_code || "USD",
    "USD",
  );

  if (!(await tableExists("currency_settings"))) {
    return {
      baseCurrency,
      fallbackCurrency: baseCurrency,
      enabledCurrencies: normalizeCurrencyList([baseCurrency, "USD", "IDR"]),
      roundingPolicy: "half_up",
      source: "store",
    };
  }

  const { data, error } = await supabase
    .from("currency_settings")
    .select(
      "base_currency, fallback_currency, enabled_currencies, rounding_policy, updated_at",
    )
    .eq("store_id", store.id)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "currency_settings")) {
      return {
        baseCurrency,
        fallbackCurrency: baseCurrency,
        enabledCurrencies: normalizeCurrencyList([baseCurrency, "USD", "IDR"]),
        roundingPolicy: "half_up",
        source: "store",
      };
    }
    throw normalizeError(error);
  }

  return {
    baseCurrency: normalizeCurrencyCode(
      data?.base_currency || baseCurrency,
      baseCurrency,
    ),
    fallbackCurrency: normalizeCurrencyCode(
      data?.fallback_currency || baseCurrency,
      baseCurrency,
    ),
    enabledCurrencies: normalizeCurrencyList(
      data?.enabled_currencies || [baseCurrency, "USD", "IDR"],
      [baseCurrency, "USD", "IDR"],
    ),
    roundingPolicy: String(data?.rounding_policy || "half_up"),
    source: data ? "currency_settings" : "store",
    updatedAt: data?.updated_at || null,
  };
}

export async function updateCurrencySettings(payload = {}) {
  const { store } = await getStoreContext();
  const current = await getCurrencySettings();
  const baseCurrency = normalizeCurrencyCode(
    payload.baseCurrency || current.baseCurrency,
    current.baseCurrency,
  );
  const fallbackCurrency = normalizeCurrencyCode(
    payload.fallbackCurrency || current.fallbackCurrency || baseCurrency,
    baseCurrency,
  );
  const enabledCurrencies = normalizeCurrencyList(
    payload.enabledCurrencies || current.enabledCurrencies,
    [baseCurrency],
  );

  if (!enabledCurrencies.includes(baseCurrency)) {
    enabledCurrencies.unshift(baseCurrency);
  }

  const roundingPolicy = ["half_up", "up", "down"].includes(
    String(payload.roundingPolicy || current.roundingPolicy || "half_up"),
  )
    ? String(payload.roundingPolicy || current.roundingPolicy || "half_up")
    : "half_up";

  if (await tableExists("currency_settings")) {
    const { error } = await supabase.from("currency_settings").upsert(
      {
        store_id: store.id,
        base_currency: baseCurrency,
        fallback_currency: fallbackCurrency,
        enabled_currencies: enabledCurrencies,
        rounding_policy: roundingPolicy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" },
    );

    if (error && !isMissingTableError(error, "currency_settings")) {
      throw normalizeError(error);
    }
  }

  const { error: storeError } = await supabase
    .from("stores")
    .update({
      currency: baseCurrency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", store.id);

  if (storeError) {
    throw normalizeError(storeError);
  }

  return getCurrencySettings();
}

export async function getCurrencyRateSnapshots(baseCurrency) {
  const { store } = await getStoreContext();
  const base = normalizeCurrencyCode(
    baseCurrency || store.currency || "USD",
    "USD",
  );
  if (!(await tableExists("currency_rate_snapshots"))) {
    return [];
  }

  const { data, error } = await supabase
    .from("currency_rate_snapshots")
    .select(
      "id, base_currency, quote_currency, rate, source, confidence, as_of, expires_at",
    )
    .eq("store_id", store.id)
    .eq("base_currency", base)
    .order("as_of", { ascending: false });

  if (error) {
    if (isMissingTableError(error, "currency_rate_snapshots")) {
      return [];
    }
    throw normalizeError(error);
  }

  return (data || []).map((row) => ({
    id: row.id,
    baseCurrency: row.base_currency,
    quoteCurrency: row.quote_currency,
    rate: Number(row.rate || 0),
    source: row.source || "manual",
    confidence: Number(row.confidence || 0),
    asOf: row.as_of,
    expiresAt: row.expires_at,
  }));
}

export async function upsertCurrencyRateSnapshot(payload = {}) {
  const { store } = await getStoreContext();
  const baseCurrency = normalizeCurrencyCode(
    payload.baseCurrency || store.currency || "USD",
    "USD",
  );
  const quoteCurrency = normalizeCurrencyCode(
    payload.quoteCurrency || "USD",
    "USD",
  );

  if (baseCurrency === quoteCurrency) {
    throw new Error("Base and quote currency must be different");
  }

  const rate = Number(payload.rate || 0);
  if (rate <= 0) {
    throw new Error("Rate must be greater than 0");
  }

  if (!(await tableExists("currency_rate_snapshots"))) {
    throw new Error(
      "Currency rate schema missing. Run Feature 19 migration before updating rates.",
    );
  }

  const asOf = payload.asOf || new Date().toISOString();
  const expiresAt =
    payload.expiresAt ||
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const source = String(payload.source || "manual").trim() || "manual";
  const confidence = Number(payload.confidence ?? 0.95);

  const { error } = await supabase.from("currency_rate_snapshots").upsert(
    {
      store_id: store.id,
      base_currency: baseCurrency,
      quote_currency: quoteCurrency,
      rate,
      source,
      confidence,
      as_of: asOf,
      expires_at: expiresAt,
      metadata_json: payload.metadata || {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id,base_currency,quote_currency,as_of" },
  );

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function getCurrencyConversionQuote(options = {}) {
  const { store } = await getStoreContext();
  const settings = await getCurrencySettings();
  const baseCurrency = normalizeCurrencyCode(
    options.baseCurrency || settings.baseCurrency || store.currency || "USD",
    "USD",
  );
  const displayCurrency = normalizeCurrencyCode(
    options.displayCurrency || baseCurrency,
    baseCurrency,
  );
  const roundingPolicy = settings.roundingPolicy || "half_up";
  const amounts = {
    subtotal: Number(options.subtotal || 0),
    discountAmount: Number(options.discountAmount || 0),
    shippingAmount: Number(options.shippingAmount || 0),
    taxableAmount: Number(options.taxableAmount || 0),
    taxAmount: Number(options.taxAmount || 0),
    totalAmount: Number(options.totalAmount || 0),
  };

  const rateInfo = await resolveLatestFxRate(
    store.id,
    baseCurrency,
    displayCurrency,
  );

  const converted = Object.entries(amounts).reduce((acc, [key, value]) => {
    acc[key] = roundCurrencyAmount(
      Number(value || 0) * Number(rateInfo.rate || 1),
      displayCurrency,
      roundingPolicy,
    );
    return acc;
  }, {});

  return {
    baseCurrency,
    displayCurrency,
    rate: Number(rateInfo.rate || 1),
    source: rateInfo.source,
    confidence: Number(rateInfo.confidence || 0),
    asOf: rateInfo.asOf,
    stale: Boolean(rateInfo.stale),
    usedFallback: Boolean(rateInfo.fallback),
    roundingPolicy,
    amounts,
    converted,
  };
}

const SUPPORTED_LOCALES = ["en", "id", "ms", "fr", "de", "es", "pt-BR"];

function normalizeLocaleCode(value, fallback = "en") {
  const input = String(value || "")
    .trim()
    .replace("_", "-");
  if (!input) {
    return fallback;
  }

  const [language, region] = input.split("-");
  const normalizedLanguage = String(language || "").toLowerCase();
  const normalizedRegion = region ? String(region).toUpperCase() : null;
  const combined = normalizedRegion
    ? `${normalizedLanguage}-${normalizedRegion}`
    : normalizedLanguage;

  if (SUPPORTED_LOCALES.includes(combined)) {
    return combined;
  }

  if (SUPPORTED_LOCALES.includes(normalizedLanguage)) {
    return normalizedLanguage;
  }

  return fallback;
}

function normalizeLocaleList(input = []) {
  const values = Array.isArray(input) ? input : [input];
  const unique = Array.from(
    new Set(
      values.map((item) => normalizeLocaleCode(item, "")).filter(Boolean),
    ),
  );
  return unique.length ? unique : ["en", "id"];
}

function normalizeTranslationNamespace(value) {
  const namespace = String(value || "admin")
    .trim()
    .toLowerCase();
  return namespace || "admin";
}

export async function getLocalizationSettings() {
  const { store } = await getStoreContext();
  const defaultLocale = normalizeLocaleCode(store.locale || "id", "id");

  if (!(await tableExists("localization_settings"))) {
    return {
      storeId: store.id,
      defaultLocale,
      fallbackLocale: "en",
      enabledLocales: normalizeLocaleList([defaultLocale, "en"]),
      currencyCode: store.currency || "IDR",
      timezone: store.timezone || "Asia/Jakarta",
      source: "store",
    };
  }

  const { data, error } = await supabase
    .from("localization_settings")
    .select(
      "default_locale, fallback_locale, enabled_locales, formatting_json, updated_at",
    )
    .eq("store_id", store.id)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "localization_settings")) {
      return {
        storeId: store.id,
        defaultLocale,
        fallbackLocale: "en",
        enabledLocales: normalizeLocaleList([defaultLocale, "en"]),
        currencyCode: store.currency || "IDR",
        timezone: store.timezone || "Asia/Jakarta",
        source: "store",
      };
    }
    throw normalizeError(error);
  }

  return {
    storeId: store.id,
    defaultLocale: normalizeLocaleCode(
      data?.default_locale || defaultLocale,
      "id",
    ),
    fallbackLocale: normalizeLocaleCode(data?.fallback_locale || "en", "en"),
    enabledLocales: normalizeLocaleList(
      data?.enabled_locales || [defaultLocale, "en"],
    ),
    formatting: data?.formatting_json || {},
    currencyCode: store.currency || "IDR",
    timezone: store.timezone || "Asia/Jakarta",
    source: "localization_settings",
    updatedAt: data?.updated_at || null,
  };
}

export async function updateLocalizationSettings(payload = {}) {
  const { store } = await getStoreContext();

  const defaultLocale = normalizeLocaleCode(
    payload.defaultLocale || store.locale || "id",
    "id",
  );
  const fallbackLocale = normalizeLocaleCode(
    payload.fallbackLocale || "en",
    "en",
  );
  const enabledLocales = normalizeLocaleList(
    payload.enabledLocales || [defaultLocale, "en"],
  );
  if (!enabledLocales.includes(defaultLocale)) {
    enabledLocales.unshift(defaultLocale);
  }

  if (await tableExists("localization_settings")) {
    const { error } = await supabase.from("localization_settings").upsert(
      {
        store_id: store.id,
        default_locale: defaultLocale,
        fallback_locale: fallbackLocale,
        enabled_locales: enabledLocales,
        formatting_json: payload.formatting || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" },
    );

    if (error && !isMissingTableError(error, "localization_settings")) {
      throw normalizeError(error);
    }
  }

  const { error: storeError } = await supabase
    .from("stores")
    .update({
      locale: defaultLocale,
      updated_at: new Date().toISOString(),
    })
    .eq("id", store.id);

  if (storeError) {
    throw normalizeError(storeError);
  }

  return getLocalizationSettings();
}

export async function getLocalizationTranslations(options = {}) {
  const { store } = await getStoreContext();
  const locale = normalizeLocaleCode(
    options.locale || store.locale || "id",
    "id",
  );
  const namespace = normalizeTranslationNamespace(options.namespace);

  if (!(await tableExists("translation_entries"))) {
    return [];
  }

  const { data, error } = await supabase
    .from("translation_entries")
    .select(
      "id, locale, namespace, translation_key, translation_value, is_machine_translated, updated_at",
    )
    .eq("store_id", store.id)
    .eq("locale", locale)
    .eq("namespace", namespace)
    .order("translation_key", { ascending: true });

  if (error) {
    if (isMissingTableError(error, "translation_entries")) {
      return [];
    }
    throw normalizeError(error);
  }

  return (data || []).map((row) => ({
    id: row.id,
    locale: row.locale,
    namespace: row.namespace,
    translationKey: row.translation_key,
    translationValue: row.translation_value || "",
    isMachineTranslated: Boolean(row.is_machine_translated),
    updatedAt: row.updated_at,
  }));
}

export async function upsertLocalizationTranslation(payload = {}) {
  const { store } = await getStoreContext();
  const locale = normalizeLocaleCode(
    payload.locale || store.locale || "id",
    "id",
  );
  const namespace = normalizeTranslationNamespace(payload.namespace);
  const translationKey = String(payload.translationKey || "").trim();

  if (!translationKey) {
    throw new Error("Translation key is required");
  }

  const translationValue = String(payload.translationValue || "");

  if (!(await tableExists("translation_entries"))) {
    throw new Error(
      "Translation schema missing. Run Feature 18 migration before managing translations.",
    );
  }

  const { error } = await supabase.from("translation_entries").upsert(
    {
      store_id: store.id,
      locale,
      namespace,
      translation_key: translationKey,
      translation_value: translationValue,
      is_machine_translated: Boolean(payload.isMachineTranslated),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id,locale,namespace,translation_key" },
  );

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function deleteLocalizationTranslation(translationId) {
  if (!translationId) {
    throw new Error("Translation id is required");
  }

  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("translation_entries")
    .delete()
    .eq("id", translationId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function getLocalizationMissingTranslations(options = {}) {
  const { store } = await getStoreContext();
  const locale = normalizeLocaleCode(
    options.locale || store.locale || "id",
    "id",
  );
  const namespace = normalizeTranslationNamespace(options.namespace);
  const baseLocale = normalizeLocaleCode(options.baseLocale || "en", "en");

  if (!(await tableExists("translation_entries"))) {
    return [];
  }

  const [baseRows, targetRows] = await Promise.all([
    supabase
      .from("translation_entries")
      .select("translation_key")
      .eq("store_id", store.id)
      .eq("locale", baseLocale)
      .eq("namespace", namespace),
    supabase
      .from("translation_entries")
      .select("translation_key")
      .eq("store_id", store.id)
      .eq("locale", locale)
      .eq("namespace", namespace),
  ]);

  if (baseRows.error) {
    throw normalizeError(baseRows.error);
  }

  if (targetRows.error) {
    throw normalizeError(targetRows.error);
  }

  const baseSet = new Set(
    (baseRows.data || []).map((item) => item.translation_key),
  );
  const targetSet = new Set(
    (targetRows.data || []).map((item) => item.translation_key),
  );

  return Array.from(baseSet).filter((key) => !targetSet.has(key));
}

export async function recordLocalizationFallbackEvent(payload = {}) {
  const { store } = await getStoreContext();
  if (!(await tableExists("localization_fallback_events"))) {
    return { ok: true };
  }

  const locale = normalizeLocaleCode(
    payload.locale || store.locale || "id",
    "id",
  );
  const fallbackLocale = normalizeLocaleCode(
    payload.fallbackLocale || "en",
    "en",
  );
  const namespace = normalizeTranslationNamespace(payload.namespace);
  const translationKey = String(payload.translationKey || "").trim();

  if (!translationKey) {
    return { ok: true };
  }

  const { error } = await supabase.from("localization_fallback_events").insert({
    store_id: store.id,
    locale,
    fallback_locale: fallbackLocale,
    namespace,
    translation_key: translationKey,
    context_path: payload.contextPath || null,
    metadata_json: payload.metadata || {},
  });

  if (error && !isMissingTableError(error, "localization_fallback_events")) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export { supabase as api };
