const RESERVED_SUBDOMAINS = new Set([
  "www",
  "dashboard",
  "skyeseller",
  "storefront",
  "api",
  "admin",
]);

const STOREFRONT_DOMAINS = new Set(["skyeseller.online", "localhost"]);

/**
 * Extract merchant slug from a host header value.
 *
 * Examples:
 *   "tokopepi.skyeseller.online"  → "tokopepi"
 *   "tokopepi.localhost:3000"     → "tokopepi"
 *   "skyeseller.online"           → null  (apex, not a merchant)
 *   "dashboard.skyeseller.online" → null  (reserved)
 *   "localhost:3000"              → null  (root local dev)
 *   "127.0.0.1:3000"              → null  (IP)
 */
export function extractSlug(host: string | null | undefined): string | null {
  if (!host) return null;

  const hostname = host.split(":")[0].toLowerCase();

  if (/^[\d.:]+$/.test(hostname)) return null;

  if (STOREFRONT_DOMAINS.has(hostname)) return null;

  const parts = hostname.split(".");
  if (parts.length < 2) return null;

  const slug = parts[0];
  if (!slug || RESERVED_SUBDOMAINS.has(slug)) return null;

  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) return null;

  return slug;
}
