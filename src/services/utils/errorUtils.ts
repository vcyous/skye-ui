/**
 * errorUtils — Supabase error normalization and classification helpers
 *
 * Domain: Shared / Cross-cutting
 * Feature: all
 * Depends on: nothing
 */

export interface NormalizedError extends Error {
  code?: string;
  details?: string;
}

export function normalizeError(err: any): NormalizedError {
  const message =
    err?.message || err?.error_description || "Unexpected request error";
  const next = new Error(message) as NormalizedError;
  next.code = err?.code;
  next.details = err?.details;
  return next;
}

export function isMissingColumnError(err: any, columnName: string): boolean {
  const message = String(err?.message || "").toLowerCase();
  const details = String(err?.details || "").toLowerCase();
  const target = String(columnName || "").toLowerCase();
  return (
    ((message.includes("column") && message.includes("does not exist")) ||
      (details.includes("column") && details.includes("does not exist"))) &&
    (message.includes(target) || details.includes(target))
  );
}

export function isMissingTableError(err: any, tableName: string): boolean {
  const message = String(err?.message || "").toLowerCase();
  const details = String(err?.details || "").toLowerCase();
  const hint = String(err?.hint || "").toLowerCase();
  const target = String(tableName || "").toLowerCase();
  return (
    (message.includes("could not find the table") ||
      message.includes("relation") ||
      details.includes("does not exist") ||
      hint.includes("schema cache")) &&
    (message.includes(target) || details.includes(target))
  );
}
