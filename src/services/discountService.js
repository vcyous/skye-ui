/**
 * discountService — Discount CRUD, validation, overlap detection, and outcome preview
 *
 * Domain: Discounts / Promotions
 * Feature: 06
 * Depends on: supabaseClient, utils/errorUtils, storeService
 */

import { getStoreContext } from "./storeService.js";
import { supabase } from "./supabaseClient.js";
import { isMissingColumnError, normalizeError } from "./utils/errorUtils.js";

export function calculateDiscountAmount(subtotal, discount) {
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

function getDiscountColumnSet(useExtended = true) {
  if (!useExtended) {
    return "id, code, title, description, discount_type, value, min_purchase_amount, max_uses, uses_count, starts_at, ends_at, status, created_at";
  }

  return "id, code, title, description, discount_type, value, min_purchase_amount, max_uses, uses_count, starts_at, ends_at, status, stackable, priority, applies_to, scope_product_ids, scope_collection_ids, buy_x_qty, buy_y_qty, buy_x_product_id, get_y_product_id, campaign_id, created_at";
}

export function normalizeCodeList(input) {
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

export function validateDiscountPayload(payload) {
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

export async function listDiscountRows(storeId, status = "all") {
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

export function resolveApplicableDiscounts(discounts, options = {}) {
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
