// @ts-nocheck
/**
 * collectionService — Collection CRUD, smart rule evaluation, and product assignment
 *
 * Domain: Collections
 * Feature: 04
 * Depends on: supabaseClient, utils/errorUtils, utils/slugUtils, utils/dbUtils, storeService, productService
 */

import { getProducts } from "./productService.js";
import { getStoreContext } from "./storeService.js";
import { supabase } from "./supabaseClient.js";
import { assertUniqueHandle } from "./utils/dbUtils.js";
import {
  isMissingColumnError,
  isMissingTableError,
  normalizeError,
} from "./utils/errorUtils.js";
import {
  normalizeSeoHandle,
  validateSeoMetadataFields,
} from "./utils/slugUtils.js";

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
