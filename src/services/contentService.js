// @ts-nocheck
/**
 * contentService — Content pages, SEO overview, and preview management
 *
 * Domain: Content / CMS
 * Feature: 02, 03
 * Depends on: supabaseClient, utils/errorUtils, utils/slugUtils, utils/dbUtils, storeService
 */

import { supabase } from "./supabaseClient.js";
import { normalizeError } from "./utils/errorUtils.js";
import {
  normalizeSeoHandle,
  validateSeoMetadataFields,
} from "./utils/slugUtils.js";
import { tableExists, assertUniqueHandle } from "./utils/dbUtils.js";
import { getStoreContext } from "./storeService.js";
import { getProducts } from "./productService.js";
import { getCollections } from "./collectionService.js";

const CONTENT_PAGE_STATUSES = new Set([
  "draft",
  "review",
  "published",
  "archived",
]);
const CONTENT_PAGE_VISIBILITY = new Set(["preview", "public", "private"]);

function normalizeContentPageStatus(value) {
  const normalized = String(value || "draft")
    .trim()
    .toLowerCase();
  return CONTENT_PAGE_STATUSES.has(normalized) ? normalized : "draft";
}

function normalizeContentPageVisibility(value) {
  const normalized = String(value || "preview")
    .trim()
    .toLowerCase();
  return CONTENT_PAGE_VISIBILITY.has(normalized) ? normalized : "preview";
}

function mapContentPage(item = {}) {
  return {
    id: item.id,
    pageType: item.page_type || "static",
    title: item.title || "",
    urlHandle: item.handle || "",
    excerpt: item.excerpt || "",
    body: item.body || "",
    seoTitle: item.seo_title || "",
    seoDescription: item.seo_description || "",
    status: normalizeContentPageStatus(item.status),
    visibility: normalizeContentPageVisibility(item.visibility),
    publishedAt: item.published_at || null,
    previewToken: item.preview_token || null,
    authorName: item.author_name || "",
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

async function assertUniqueContentPageHandle(storeId, handle, ignoreId = null) {
  if (!(await tableExists("content_pages"))) {
    return;
  }

  await assertUniqueHandle("content_pages", storeId, handle, ignoreId);
}

export async function getContentPages(filters = {}) {
  const { store } = await getStoreContext();
  if (!(await tableExists("content_pages"))) {
    return [];
  }

  let query = supabase
    .from("content_pages")
    .select(
      "id, page_type, title, handle, excerpt, body, seo_title, seo_description, status, visibility, published_at, preview_token, author_name, created_at, updated_at",
    )
    .eq("store_id", store.id)
    .order("updated_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", normalizeContentPageStatus(filters.status));
  }

  if (filters.pageType && filters.pageType !== "all") {
    query = query.eq("page_type", filters.pageType);
  }

  const { data, error } = await query;
  if (error) {
    throw normalizeError(error);
  }

  let rows = (data || []).map((item) => mapContentPage(item));

  if (filters.search) {
    const keyword = String(filters.search).trim().toLowerCase();
    rows = rows.filter((item) =>
      [item.title, item.excerpt, item.urlHandle]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }

  return rows;
}

export async function createContentPage(payload = {}) {
  const { authUser, store } = await getStoreContext();
  if (!(await tableExists("content_pages"))) {
    throw new Error(
      "Content pages schema missing. Run Feature 16 migration first.",
    );
  }

  const title = String(payload.title || "").trim();
  if (!title) {
    throw new Error("Title is required");
  }

  validateSeoMetadataFields(payload);
  const handle = normalizeSeoHandle(payload.urlHandle, title);
  await assertUniqueContentPageHandle(store.id, handle);

  const status = normalizeContentPageStatus(payload.status);
  const visibility = normalizeContentPageVisibility(payload.visibility);

  const { error } = await supabase.from("content_pages").insert({
    store_id: store.id,
    page_type: payload.pageType || "static",
    title,
    handle,
    excerpt: payload.excerpt || null,
    body: payload.body || "",
    seo_title: payload.seoTitle || null,
    seo_description: payload.seoDescription || null,
    status,
    visibility,
    author_name: payload.authorName || authUser.email || "",
    preview_token: Math.random().toString(36).slice(2, 14),
    published_at: status === "published" ? new Date().toISOString() : null,
  });

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function updateContentPage(pageId, payload = {}) {
  if (!pageId) {
    throw new Error("Content page id is required");
  }

  const { authUser, store } = await getStoreContext();
  const title = String(payload.title || "").trim();
  if (!title) {
    throw new Error("Title is required");
  }

  validateSeoMetadataFields(payload);
  const handle = normalizeSeoHandle(payload.urlHandle, title);
  await assertUniqueContentPageHandle(store.id, handle, pageId);

  const status = normalizeContentPageStatus(payload.status);
  const visibility = normalizeContentPageVisibility(payload.visibility);

  const { error } = await supabase
    .from("content_pages")
    .update({
      page_type: payload.pageType || "static",
      title,
      handle,
      excerpt: payload.excerpt || null,
      body: payload.body || "",
      seo_title: payload.seoTitle || null,
      seo_description: payload.seoDescription || null,
      status,
      visibility,
      author_name: payload.authorName || authUser.email || "",
      published_at:
        status === "published"
          ? payload.publishedAt || new Date().toISOString()
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pageId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function deleteContentPage(pageId) {
  if (!pageId) {
    throw new Error("Content page id is required");
  }

  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("content_pages")
    .delete()
    .eq("id", pageId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function publishContentPage(pageId, visibility = "public") {
  if (!pageId) {
    throw new Error("Content page id is required");
  }

  const { store } = await getStoreContext();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("content_pages")
    .update({
      status: "published",
      visibility: normalizeContentPageVisibility(visibility),
      published_at: now,
      updated_at: now,
    })
    .eq("id", pageId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function getSeoOverview() {
  const [products, collections, contentPages] = await Promise.all([
    getProducts("all"),
    getCollections(),
    getContentPages(),
  ]);

  const completionRate = (rows = []) => {
    if (!rows.length) {
      return 0;
    }
    const completed = rows.filter((item) => {
      const hasTitle = String(item.seoTitle || "").trim().length > 0;
      const hasDescription =
        String(item.seoDescription || "").trim().length > 0;
      const hasHandle = String(item.urlHandle || "").trim().length > 0;
      return hasTitle && hasDescription && hasHandle;
    }).length;

    return Number(((completed / rows.length) * 100).toFixed(2));
  };

  return {
    products: {
      total: products.length,
      completionRate: completionRate(products),
    },
    collections: {
      total: collections.length,
      completionRate: completionRate(collections),
    },
    contentPages: {
      total: contentPages.length,
      completionRate: completionRate(contentPages),
      publishedCount: contentPages.filter((item) => item.status === "published")
        .length,
    },
  };
}

export async function getContentPagePreview(pageId) {
  if (!pageId) {
    throw new Error("Content page id is required");
  }

  const { store } = await getStoreContext();
  const { data, error } = await supabase
    .from("content_pages")
    .select(
      "id, title, handle, excerpt, body, seo_title, seo_description, status, visibility, preview_token",
    )
    .eq("id", pageId)
    .eq("store_id", store.id)
    .single();

  if (error) {
    throw normalizeError(error);
  }

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://store";

  return {
    id: data.id,
    title: data.title,
    excerpt: data.excerpt || "",
    body: data.body || "",
    seoTitle: data.seo_title || "",
    seoDescription: data.seo_description || "",
    status: data.status,
    visibility: data.visibility,
    previewUrl: `${baseUrl}/pages/${data.handle}?preview=${data.preview_token}`,
  };
}
