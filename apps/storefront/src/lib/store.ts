import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";
import type { Order, OrderItem, Product, Store } from "./types";

// 60s = stale data tolerable for MVP merchant low-traffic. On-demand
// revalidation via /api/revalidate (tag `store:<slug>`) busts immediately.
const STORE_TTL_SECONDS = 60;

export async function getStoreBySlug(slug: string): Promise<Store | null> {
  const fetcher = unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from("stores")
        .select(
          "id, name, slug, description, contact_email, contact_phone, settings",
        )
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;
      return data as Store | null;
    },
    ["store-by-slug", slug],
    {
      revalidate: STORE_TTL_SECONDS,
      tags: [`store:${slug}`],
    },
  );

  return fetcher();
}

export type ProductListOptions = {
  limit?: number;
  sort?: "newest" | "price-asc" | "price-desc";
};

export async function getProductsByStore(
  storeId: string,
  storeSlug: string,
  opts: ProductListOptions = {},
): Promise<Product[]> {
  const { limit, sort = "newest" } = opts;
  const cacheKey = ["products-by-store", storeId, sort, String(limit ?? "all")];

  const fetcher = unstable_cache(
    async () => {
      let query = supabase
        .from("products")
        .select(
          "id, store_id, name, slug, description, price, compare_at_price, category, tags, status, media_urls, stock",
        )
        .eq("store_id", storeId)
        .eq("status", "active");

      if (sort === "newest") query = query.order("created_at", { ascending: false });
      if (sort === "price-asc") query = query.order("price", { ascending: true });
      if (sort === "price-desc") query = query.order("price", { ascending: false });

      if (limit) query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Product[];
    },
    cacheKey,
    {
      revalidate: STORE_TTL_SECONDS,
      tags: [`store:${storeSlug}`, `store:${storeSlug}:products`],
    },
  );

  return fetcher();
}

export async function getProductByHandle(
  storeId: string,
  storeSlug: string,
  handle: string,
): Promise<Product | null> {
  const fetcher = unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, store_id, name, slug, description, price, compare_at_price, category, tags, status, media_urls, stock",
        )
        .eq("store_id", storeId)
        .eq("slug", handle)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      return data as Product | null;
    },
    ["product-by-handle", storeId, handle],
    {
      revalidate: STORE_TTL_SECONDS,
      tags: [`store:${storeSlug}`, `store:${storeSlug}:products`],
    },
  );

  return fetcher();
}

export async function getOrderById(
  orderId: string,
): Promise<{ order: Order; items: OrderItem[] } | null> {
  const [orderRes, itemsRes] = await Promise.all([
    supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
    supabase.from("order_items").select("*").eq("order_id", orderId),
  ]);

  if (orderRes.error || !orderRes.data) return null;
  if (itemsRes.error) throw itemsRes.error;

  return {
    order: orderRes.data as Order,
    items: (itemsRes.data ?? []) as OrderItem[],
  };
}
