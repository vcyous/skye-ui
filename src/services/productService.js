import { getStoreContext } from "./storeService";
import { supabase } from "./supabaseClient";
import { normalizeError } from "./utils/errorUtils";

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function getProducts(status = "all") {
  const { store } = await getStoreContext();

  let query = supabase
    .from("products")
    .select("id, name, slug, description, price, compare_at_price, category, tags, status, media_urls, stock, created_at, updated_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw normalizeError(error);
  return data || [];
}

export async function createProduct(payload) {
  const { store } = await getStoreContext();

  const tags = Array.isArray(payload.tags)
    ? payload.tags
    : String(payload.tags || "").split(",").map((t) => t.trim()).filter(Boolean);

  const baseSlug = slugify(payload.name);
  const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

  const row = {
    store_id: store.id,
    name: String(payload.name || "").trim(),
    slug: uniqueSlug,
    description: payload.description || null,
    price: Number(payload.price || 0),
    compare_at_price: payload.compareAtPrice != null && payload.compareAtPrice !== "" ? Number(payload.compareAtPrice) : null,
    category: payload.category || null,
    tags,
    status: payload.status || "draft",
    media_urls: Array.isArray(payload.mediaUrls) ? payload.mediaUrls : [],
    stock: Number(payload.stock || 0),
  };

  const { data, error } = await supabase
    .from("products")
    .insert(row)
    .select("id, name, slug, description, price, compare_at_price, category, tags, status, media_urls, stock, created_at, updated_at")
    .single();

  if (error) throw normalizeError(error);
  return data;
}

export async function updateProduct(productId, payload) {
  const { store } = await getStoreContext();

  const tags = Array.isArray(payload.tags)
    ? payload.tags
    : String(payload.tags || "").split(",").map((t) => t.trim()).filter(Boolean);

  const updates = {
    name: String(payload.name || "").trim(),
    description: payload.description || null,
    price: Number(payload.price || 0),
    compare_at_price: payload.compareAtPrice != null && payload.compareAtPrice !== "" ? Number(payload.compareAtPrice) : null,
    category: payload.category || null,
    tags,
    status: payload.status || "draft",
    media_urls: Array.isArray(payload.mediaUrls) ? payload.mediaUrls : [],
    stock: Number(payload.stock || 0),
  };

  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", productId)
    .eq("store_id", store.id)
    .select("id, name, slug, description, price, compare_at_price, category, tags, status, media_urls, stock, created_at, updated_at")
    .single();

  if (error) throw normalizeError(error);
  return data;
}

export async function deleteProduct(productId) {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("store_id", store.id);
  if (error) throw normalizeError(error);
  return { ok: true };
}

export async function bulkUpdateProductStatus(productIds, nextStatus) {
  const { store } = await getStoreContext();
  const ids = Array.isArray(productIds) ? productIds.filter(Boolean) : [];
  if (!ids.length) return { ok: true, updatedCount: 0 };

  const { data, error } = await supabase
    .from("products")
    .update({ status: nextStatus })
    .eq("store_id", store.id)
    .in("id", ids)
    .select("id");

  if (error) throw normalizeError(error);
  return { ok: true, updatedCount: (data || []).length };
}

export async function bulkDeleteProducts(productIds) {
  const { store } = await getStoreContext();
  const ids = Array.isArray(productIds) ? productIds.filter(Boolean) : [];
  if (!ids.length) return { ok: true, deletedCount: 0 };

  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("store_id", store.id)
    .in("id", ids)
    .select("id");

  if (error) throw normalizeError(error);
  return { ok: true, deletedCount: (data || []).length };
}
