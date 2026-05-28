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

const STORE_TTL_SECONDS = 600;

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
