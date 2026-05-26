/**
 * websiteBuilderService — Template config persistence for the website builder
 *
 * Domain: Website Builder
 * Feature: WB-01 to WB-06
 * Depends on: supabaseClient, storeService, utils/errorUtils
 */

import { getStoreContext } from "./storeService";
import { supabase } from "./supabaseClient";
import { normalizeError } from "./utils/errorUtils";

export const DEFAULT_CATALOG_CONFIG = {
  collectionId: null,
  displayCount: 6,
  layout: "grid-3",
};

export async function getActiveTheme() {
  const { store } = await getStoreContext();

  const { data, error } = await supabase
    .from("themes")
    .select("id, template_slug, config_json")
    .eq("store_id", store.id)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw normalizeError(error);
  if (!data) return null;

  const rawConfig = data.config_json ?? {};
  return {
    id: data.id,
    templateSlug: data.template_slug ?? "modern-minimal",
    config: {
      texts: rawConfig.texts ?? {},
      colors: rawConfig.colors ?? {},
      images: rawConfig.images ?? {},
      catalog: { ...DEFAULT_CATALOG_CONFIG, ...(rawConfig.catalog ?? {}) },
    },
  };
}

export async function saveThemeConfig(themeId, config) {
  const { store } = await getStoreContext();

  const { error } = await supabase
    .from("themes")
    .update({
      config_json: config,
      updated_at: new Date().toISOString(),
    })
    .eq("id", themeId)
    .eq("store_id", store.id);

  if (error) throw normalizeError(error);
}

export async function activateTemplate(templateSlug) {
  const { store } = await getStoreContext();

  const { data: template, error: tErr } = await supabase
    .from("templates")
    .select("default_config")
    .eq("slug", templateSlug)
    .single();

  if (tErr) throw normalizeError(tErr);

  const { error } = await supabase
    .from("themes")
    .update({
      template_slug: templateSlug,
      config_json: template.default_config,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", store.id)
    .eq("is_published", true);

  if (error) throw normalizeError(error);
}

export async function uploadStoreAsset(file, assetKey) {
  const { store } = await getStoreContext();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${store.id}/${assetKey}.${ext}`;

  const { error } = await supabase.storage
    .from("store-assets")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw normalizeError(error);

  const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function uploadProductImage(file, productId) {
  const { store } = await getStoreContext();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${store.id}/products/${productId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("store-assets")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw normalizeError(uploadError);

  const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
  return data.publicUrl;
}

export async function getCatalogOptions() {
  const { store } = await getStoreContext();

  const { data, error } = await supabase
    .from("collections")
    .select("id, name")
    .eq("store_id", store.id)
    .eq("status", "active")
    .order("name");

  if (error) throw normalizeError(error);
  return (data ?? []).map((col) => ({ value: col.id, label: col.name }));
}

export async function getProductsForPreview(collectionId, limit = 6) {
  const { store } = await getStoreContext();

  if (collectionId) {
    const { data, error } = await supabase
      .from("product_collections")
      .select(
        "product:products(id, title, media_urls, status, product_variants(price))",
      )
      .eq("collection_id", collectionId)
      .limit(limit);

    if (error) throw normalizeError(error);

    return (data ?? [])
      .map((row) => row.product)
      .filter((p) => p?.status === "active")
      .map((p) => ({
        id: p.id,
        name: p.title,
        price: p.product_variants?.[0]?.price ?? 0,
        currency: store.currency ?? "IDR",
        imageUrl: p.media_urls?.[0] ?? null,
        status: p.status,
      }));
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, title, media_urls, status, product_variants(price)")
    .eq("store_id", store.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw normalizeError(error);

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.title,
    price: p.product_variants?.[0]?.price ?? 0,
    currency: store.currency ?? "IDR",
    imageUrl: p.media_urls?.[0] ?? null,
    status: p.status,
  }));
}
