/**
 * dbUtils — Database schema probe helpers
 *
 * Domain: Shared / Cross-cutting
 * Feature: all
 * Depends on: supabaseClient, utils/errorUtils
 */

import { supabase } from "../supabaseClient";
import { normalizeError, isMissingTableError } from "./errorUtils";

export async function assertUniqueHandle(
  tableName,
  storeId,
  handle,
  ignoreId = null,
) {
  const normalizedHandle = String(handle || "").trim();
  if (!normalizedHandle) {
    return;
  }

  let query = supabase
    .from(tableName)
    .select("id")
    .eq("store_id", storeId)
    .eq("handle", normalizedHandle)
    .limit(1);

  if (ignoreId) {
    query = query.neq("id", ignoreId);
  }

  const { data, error } = await query;
  if (error) {
    throw normalizeError(error);
  }

  if ((data || []).length > 0) {
    throw new Error(`URL handle '${normalizedHandle}' already exists`);
  }
}

export async function tableExists(tableName) {
  const { error } = await supabase.from(tableName).select("id").limit(1);
  if (!error) {
    return true;
  }

  if (isMissingTableError(error, tableName)) {
    return false;
  }

  throw normalizeError(error);
}
