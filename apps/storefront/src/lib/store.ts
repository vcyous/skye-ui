import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";

export type Store = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  settings: Record<string, unknown> | null;
};

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
