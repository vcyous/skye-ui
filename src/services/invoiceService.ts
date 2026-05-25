// @ts-nocheck
/**
 * invoiceService — Invoice retrieval and management
 *
 * Domain: Invoicing
 * Feature: 11
 * Depends on: supabaseClient, utils/errorUtils, storeService
 */

import { supabase } from "./supabaseClient.js";
import { normalizeError, isMissingColumnError } from "./utils/errorUtils.js";
import { getStoreContext } from "./storeService.js";
import { normalizeTaxBehavior } from "./taxService.js";

export async function getInvoices() {
  const { store } = await getStoreContext();
  let { data, error } = await supabase
    .from("invoices")
    .select(
      "id, order_id, invoice_number, subtotal, taxable_amount, tax_rate, tax_behavior, tax_amount, discount_amount, total, status, issued_at, metadata_json, orders(order_number)",
    )
    .eq("store_id", store.id)
    .order("issued_at", { ascending: false });

  if (error && isMissingColumnError(error, "taxable_amount")) {
    const fallback = await supabase
      .from("invoices")
      .select(
        "id, order_id, invoice_number, subtotal, tax_amount, discount_amount, total, issued_at, orders(order_number)",
      )
      .eq("store_id", store.id)
      .order("issued_at", { ascending: false });
    data = (fallback.data || []).map((item) => ({
      ...item,
      taxable_amount: item.subtotal,
      tax_rate: 0,
      tax_behavior: "exclusive",
      status: "issued",
      metadata_json: {},
    }));
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    orderId: item.order_id,
    orderNumber: item.orders?.order_number || "-",
    invoiceNumber: item.invoice_number,
    subtotal: Number(item.subtotal || 0),
    taxableAmount: Number(item.taxable_amount || item.subtotal || 0),
    taxRate: Number(item.tax_rate || 0),
    taxBehavior: normalizeTaxBehavior(item.tax_behavior),
    taxAmount: Number(item.tax_amount || 0),
    discountAmount: Number(item.discount_amount || 0),
    total: Number(item.total || 0),
    status: item.status || "issued",
    metadata: item.metadata_json || {},
    issuedAt: item.issued_at,
  }));
}