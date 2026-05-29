import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";
import type {
  Collection,
  Order,
  OrderItem,
  Product,
  ProductVariant,
  Store,
  Theme,
} from "./types";

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

      if (sort === "newest")
        query = query.order("created_at", { ascending: false });
      if (sort === "price-asc")
        query = query.order("price", { ascending: true });
      if (sort === "price-desc")
        query = query.order("price", { ascending: false });

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

export async function getThemeByStore(
  storeId: string,
  storeSlug: string,
): Promise<Theme | null> {
  const fetcher = unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from("themes")
        .select("id, store_id, template_slug, config_json")
        .eq("store_id", storeId)
        .maybeSingle();

      if (error) throw error;
      return data as Theme | null;
    },
    ["theme-by-store", storeId],
    {
      revalidate: STORE_TTL_SECONDS,
      tags: [`store:${storeSlug}`],
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

export async function getCollectionsByStore(
  storeId: string,
  storeSlug: string,
): Promise<Collection[]> {
  const fetcher = unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from("collections")
        .select(
          "id, store_id, name, slug, description, hero_image_url, is_active, display_order",
        )
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return (data ?? []) as Collection[];
    },
    ["collections-by-store", storeId],
    {
      revalidate: STORE_TTL_SECONDS,
      tags: [`store:${storeSlug}`],
    },
  );
  return fetcher();
}

export async function getProductsByCategory(
  storeId: string,
  storeSlug: string,
  category: string,
  opts: { limit?: number; excludeId?: string } = {},
): Promise<Product[]> {
  const { limit = 4, excludeId } = opts;
  const cacheKey = [
    "products-by-category",
    storeId,
    category,
    excludeId ?? "none",
    String(limit),
  ];

  const fetcher = unstable_cache(
    async () => {
      let query = supabase
        .from("products")
        .select(
          "id, store_id, name, slug, description, price, compare_at_price, category, tags, status, media_urls, stock",
        )
        .eq("store_id", storeId)
        .eq("status", "active")
        .eq("category", category)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (excludeId) query = query.neq("id", excludeId);

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

export async function getVariantsByProduct(
  productId: string,
  storeSlug: string,
): Promise<ProductVariant[]> {
  const fetcher = unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select(
          "id, product_id, name, sku, size, color, price, stock, display_order",
        )
        .eq("product_id", productId)
        .order("display_order");

      if (error) throw error;
      return (data ?? []) as ProductVariant[];
    },
    ["variants-by-product", productId],
    {
      revalidate: STORE_TTL_SECONDS,
      tags: [`store:${storeSlug}:products`],
    },
  );
  return fetcher();
}
