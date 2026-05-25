/**
 * productService — Product catalog CRUD and bulk operations
 *
 * Domain: Products
 * Feature: 03
 * Depends on: supabaseClient, utils/errorUtils, utils/slugUtils, utils/dbUtils, storeService
 */

import { getStoreContext } from "./storeService";
import { supabase } from "./supabaseClient";
import { assertUniqueHandle } from "./utils/dbUtils";
import { normalizeError } from "./utils/errorUtils";
import {
  normalizeSeoHandle,
  validateSeoMetadataFields,
} from "./utils/slugUtils";
import { Product } from "../types";

export async function getProducts(status: string = "all"): Promise<Product[]> {
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

  const { data, error } = await query;

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((product: any) => {
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

export async function createProduct(payload: any): Promise<Product> {
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
    const skuError = new Error("SKU already exists in this store") as any;
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
    isPriceWindowActive: true,
    quantity_in_stock: Number(variant.quantity_in_stock),
    stock: Number(variant.quantity_in_stock),
    status: product.status as any,
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

export async function updateProduct(productId: string, payload: any): Promise<Product> {
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
    const skuError = new Error("SKU already exists in this store") as any;
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
    isPriceWindowActive: true,
    quantity_in_stock: Number(variant.quantity_in_stock),
    stock: Number(variant.quantity_in_stock),
    status: product.status as any,
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

export async function deleteProduct(productId: string): Promise<{ ok: boolean }> {
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

export async function bulkUpdateProductStatus(
  productIds: string[],
  nextStatus: string,
): Promise<{ ok: boolean; updatedCount: number }> {
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

export async function bulkDeleteProducts(
  productIds: string[],
): Promise<{ ok: boolean; deletedCount: number }> {
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
