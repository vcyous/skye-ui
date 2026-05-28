import { assertSupabaseConfigured, supabase } from "./supabaseClient";
import { normalizeError } from "./utils/errorUtils";
import { buildUniqueHandle } from "./utils/slugUtils";

export function mapPublicUser(authUser, profile) {
  return {
    id: authUser.id,
    name:
      profile?.full_name ||
      profile?.name ||
      authUser.user_metadata?.name ||
      authUser.user_metadata?.full_name ||
      authUser.email?.split("@")[0] ||
      "Store Owner",
    email: authUser.email,
    phone:
      profile?.phone ||
      authUser.user_metadata?.phone ||
      null,
    status: profile?.status || "active",
    createdAt: profile?.created_at || null,
    updatedAt: profile?.updated_at || null,
  };
}

export function mapStoreSummary(store) {
  if (!store) return null;
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    description: store.description,
    currency: store.currency || "IDR",
    timezone: store.timezone || "Asia/Jakarta",
    isPublished: store.is_published ?? false,
    customDomain: store.custom_domain || null,
    onboardingCompletedAt: store.onboarding_completed_at || null,
    settings: store.settings || {},
    createdAt: store.created_at,
    updatedAt: store.updated_at,
  };
}

export async function getCurrentAuthUser() {
  assertSupabaseConfigured();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw normalizeError(error);
  if (!data.user) {
    const err = new Error("Not authenticated");
    err.code = "AUTH_REQUIRED";
    throw err;
  }
  return data.user;
}

async function getAppUserById(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw normalizeError(error);
  return data;
}

function resolveProfileName(authUser, payload = {}) {
  return (
    payload.name ||
    payload.full_name ||
    authUser.user_metadata?.name ||
    authUser.user_metadata?.full_name ||
    authUser.email?.split("@")[0] ||
    "Store Owner"
  );
}

function resolveProfilePhone(authUser, payload = {}) {
  return payload.phone || authUser.user_metadata?.phone || null;
}

export async function ensureAppUser(authUser, payload = {}) {
  const existing = await getAppUserById(authUser.id);
  if (existing) return existing;

  const insertPayload = {
    id: authUser.id,
    full_name: resolveProfileName(authUser, payload),
    email: authUser.email,
    phone: resolveProfilePhone(authUser, payload),
    status: "active",
  };

  const { error } = await supabase.from("users").insert(insertPayload);
  if (error && error.code !== "23505") throw normalizeError(error);

  return getAppUserById(authUser.id);
}

async function findPrimaryStoreByOwner(userId) {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw normalizeError(error);
  return data?.[0] || null;
}

async function insertPrimaryStore(userId, displayName) {
  const slug = buildUniqueHandle(displayName || "skye-store");
  const insertPayload = {
    owner_id: userId,
    name: `${displayName || "Skye"} Store`,
    slug,
    description: "Default store profile",
    currency: "IDR",
    timezone: "Asia/Jakarta",
    locale: "id",
    country: "ID",
  };

  const { data, error } = await supabase
    .from("stores")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) throw normalizeError(error);
  return data;
}

export async function ensurePrimaryStore(authUser, profile) {
  let store = await findPrimaryStoreByOwner(authUser.id);
  if (!store) {
    const displayName =
      profile?.full_name ||
      profile?.name ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email;
    store = await insertPrimaryStore(authUser.id, displayName);
  }
  return store;
}

export async function getStoreContext() {
  const authUser = await getCurrentAuthUser();
  const profile = await ensureAppUser(authUser);
  const store = await ensurePrimaryStore(authUser, profile);
  return { authUser, profile, store };
}

export async function completeOnboarding(payload) {
  const { authUser, store } = await getStoreContext();

  const { error: storeErr } = await supabase
    .from("stores")
    .update({
      name: payload.storeName,
      currency: payload.currency || "IDR",
      timezone: payload.timezone || "Asia/Jakarta",
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", store.id)
    .eq("owner_id", authUser.id);

  if (storeErr) throw normalizeError(storeErr);

  if (payload.templateSlug) {
    const { data: tpl } = await supabase
      .from("templates")
      .select("default_config")
      .eq("slug", payload.templateSlug)
      .maybeSingle();

    const { error: themeErr } = await supabase
      .from("themes")
      .upsert(
        {
          store_id: store.id,
          template_slug: payload.templateSlug,
          config_json: tpl?.default_config || {},
          is_published: true,
        },
        { onConflict: "store_id" },
      );

    if (themeErr) throw normalizeError(themeErr);
  }
}
