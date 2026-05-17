/**
 * slugUtils — URL handle and SEO metadata validation helpers
 *
 * Domain: Shared / Cross-cutting
 * Feature: 02, 03, 04
 * Depends on: nothing
 */

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function buildUniqueHandle(base) {
  const normalized = slugify(base) || "item";
  return `${normalized}-${Date.now().toString(36)}`;
}

export function normalizeSeoHandle(value, fallback) {
  const normalized = slugify(value);
  if (normalized) {
    return normalized;
  }
  return buildUniqueHandle(fallback || "page");
}

export function validateSeoMetadataFields(payload = {}) {
  const seoTitle = String(payload.seoTitle || "").trim();
  const seoDescription = String(payload.seoDescription || "").trim();
  const urlHandle = String(payload.urlHandle || payload.handle || "").trim();

  if (seoTitle.length > 70) {
    throw new Error("SEO title must be 70 characters or fewer");
  }

  if (seoDescription.length > 160) {
    throw new Error("SEO description must be 160 characters or fewer");
  }

  if (urlHandle && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugify(urlHandle))) {
    throw new Error(
      "URL handle must contain only lowercase letters, numbers, and hyphens",
    );
  }
}
