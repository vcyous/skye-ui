/**
 * taxService — Tax rule CRUD and tax pricing calculation engine
 *
 * Domain: Tax
 * Feature: 11
 * Depends on: supabaseClient, utils/errorUtils, storeService
 */

import { supabase } from "./supabaseClient.js";
import { normalizeError, isMissingColumnError } from "./utils/errorUtils.js";
import { getStoreContext } from "./storeService.js";

export function normalizeTaxBehavior(value) {
  const behavior = String(value || "exclusive")
    .trim()
    .toLowerCase();
  if (behavior === "inclusive" || behavior === "exclusive") {
    return behavior;
  }
  return "exclusive";
}

export function resolveMatchingTaxRule(taxRules, country) {
  const region = String(country || "")
    .trim()
    .toLowerCase();

  const activeRules = (taxRules || []).filter((item) => item?.isActive);
  if (!activeRules.length) {
    return null;
  }

  const matched = activeRules
    .filter(
      (item) =>
        String(item.regionCode || "")
          .trim()
          .toLowerCase() === region,
    )
    .sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));

  if (matched.length) {
    return matched[0];
  }

  const defaultRule = activeRules
    .filter((item) => item.isDefault)
    .sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));

  return defaultRule[0] || null;
}

export function resolveTaxPricing(input = {}) {
  const subtotalAmount = Number(input.subtotalAmount || 0);
  const discountAmount = Number(input.discountAmount || 0);
  const shippingAmount = Number(input.shippingAmount || 0);
  const taxableBase = Math.max(0, subtotalAmount - discountAmount);
  const taxRule = input.taxRule || null;

  if (!taxRule) {
    const taxAmount = Number(input.manualTaxAmount || 0);
    const totalAmount = Number(
      (taxableBase + shippingAmount + taxAmount).toFixed(2),
    );
    return {
      taxableAmount: Number(taxableBase.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount,
      taxBehavior: "exclusive",
      taxRate: 0,
      taxRuleId: null,
    };
  }

  const taxRate = Number(taxRule.taxRate || 0);
  const taxBehavior = normalizeTaxBehavior(taxRule.taxBehavior);
  let taxAmount = 0;
  let totalAmount = taxableBase + shippingAmount;

  if (taxBehavior === "inclusive") {
    if (taxRate > 0) {
      taxAmount = Number(
        (taxableBase - taxableBase / (1 + taxRate / 100)).toFixed(2),
      );
    }
  } else {
    taxAmount = Number(((taxableBase * taxRate) / 100).toFixed(2));
    totalAmount += taxAmount;
  }

  return {
    taxableAmount: Number(taxableBase.toFixed(2)),
    taxAmount,
    totalAmount: Number(totalAmount.toFixed(2)),
    taxBehavior,
    taxRate,
    taxRuleId: taxRule.id || null,
  };
}

export async function getTaxRules() {
  const { store } = await getStoreContext();
  let { data, error } = await supabase
    .from("tax_rules")
    .select(
      "id, name, region_code, tax_rate, tax_behavior, priority, is_default, is_active, created_at",
    )
    .eq("store_id", store.id)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (error && isMissingColumnError(error, "tax_behavior")) {
    const fallback = await supabase
      .from("tax_rules")
      .select("id, name, region_code, tax_rate, is_active, created_at")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    data = (fallback.data || []).map((item) => ({
      ...item,
      tax_behavior: "exclusive",
      priority: 100,
      is_default: false,
    }));
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    name: item.name,
    regionCode: item.region_code,
    taxRate: Number(item.tax_rate || 0),
    taxBehavior: normalizeTaxBehavior(item.tax_behavior),
    priority: Number(item.priority || 100),
    isDefault: Boolean(item.is_default),
    isActive: Boolean(item.is_active),
    createdAt: item.created_at,
  }));
}

export async function createTaxRule(payload) {
  const { store } = await getStoreContext();
  let { error } = await supabase.from("tax_rules").insert({
    store_id: store.id,
    name: payload.name,
    region_code: payload.regionCode,
    tax_rate: Number(payload.taxRate || 0),
    tax_behavior: normalizeTaxBehavior(payload.taxBehavior),
    priority: Number(payload.priority || 100),
    is_default: Boolean(payload.isDefault),
    is_active: payload.isActive ?? true,
  });

  if (error && isMissingColumnError(error, "tax_behavior")) {
    const fallback = await supabase.from("tax_rules").insert({
      store_id: store.id,
      name: payload.name,
      region_code: payload.regionCode,
      tax_rate: Number(payload.taxRate || 0),
      is_active: payload.isActive ?? true,
    });
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function updateTaxRule(taxRuleId, payload) {
  const { store } = await getStoreContext();
  let { error } = await supabase
    .from("tax_rules")
    .update({
      name: payload.name,
      region_code: payload.regionCode,
      tax_rate: Number(payload.taxRate || 0),
      tax_behavior: normalizeTaxBehavior(payload.taxBehavior),
      priority: Number(payload.priority || 100),
      is_default: Boolean(payload.isDefault),
      is_active: payload.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taxRuleId)
    .eq("store_id", store.id);

  if (error && isMissingColumnError(error, "tax_behavior")) {
    const fallback = await supabase
      .from("tax_rules")
      .update({
        name: payload.name,
        region_code: payload.regionCode,
        tax_rate: Number(payload.taxRate || 0),
        is_active: payload.isActive ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taxRuleId)
      .eq("store_id", store.id);
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function deleteTaxRule(taxRuleId) {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("tax_rules")
    .delete()
    .eq("id", taxRuleId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}
