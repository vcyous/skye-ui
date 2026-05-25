/**
 * websiteBuilderService — Template config persistence for the website builder
 *
 * Domain: Website Builder
 * Feature: WB-01 to WB-06
 * Depends on: supabaseClient, storeService, utils/errorUtils
 */

import type { PreviewProduct } from "../types";
import { getStoreContext } from "./storeService";
import { supabase } from "./supabaseClient";
import { normalizeError } from "./utils/errorUtils";

export interface CatalogConfig {
  collectionId: string | null;
  displayCount: number;
  layout: "grid-3" | "grid-2" | "grid-4";
}

export const DEFAULT_CATALOG_CONFIG: CatalogConfig = {
  collectionId: null,
  displayCount: 6,
  layout: "grid-3",
};

export interface ThemeConfig {
  texts: Record<string, string>;
  colors: Record<string, string>;
  images: Record<string, string>;
  catalog: CatalogConfig;
}

export interface ActiveTheme {
  id: string;
  templateSlug: string;
  config: ThemeConfig;
}

export async function getActiveTheme(): Promise<ActiveTheme | null> {
  const { store } = await getStoreContext();

  const { data, error } = await supabase
    .from("themes")
    .select("id, template_slug, config_json")
    .eq("store_id", store.id)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw normalizeError(error);
  if (!data) return null;

  const rawConfig = (data.config_json as Partial<ThemeConfig>) ?? {};
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

export async function saveThemeConfig(
  themeId: string,
  config: ThemeConfig,
): Promise<void> {
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

export async function activateTemplate(templateSlug: string): Promise<void> {
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

export async function uploadStoreAsset(
  file: File,
  assetKey: string,
): Promise<string> {
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

export async function uploadProductImage(
  file: File,
  productId: string,
): Promise<string> {
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

export interface CatalogOption {
  value: string;
  label: string;
}

export async function getCatalogOptions(): Promise<CatalogOption[]> {
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

export async function getProductsForPreview(
  collectionId: string | null,
  limit = 6,
): Promise<PreviewProduct[]> {
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
      .map((row: any) => row.product)
      .filter((p: any) => p?.status === "active")
      .map((p: any) => ({
        id: p.id,
        name: p.title,
        price: p.product_variants?.[0]?.price ?? 0,
        currency: (store as any).currency ?? "IDR",
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

  return (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.title,
    price: p.product_variants?.[0]?.price ?? 0,
    currency: (store as any).currency ?? "IDR",
    imageUrl: p.media_urls?.[0] ?? null,
    status: p.status,
  }));
}
