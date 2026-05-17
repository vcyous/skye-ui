/**
 * inventoryService — Inventory levels, stock movements, adjustments, and CSV operations
 *
 * Domain: Inventory
 * Feature: 05
 * Depends on: supabaseClient, utils/errorUtils, utils/dbUtils, utils/csvUtils, storeService
 */

import { getStoreContext } from "./storeService.js";
import { supabase } from "./supabaseClient.js";
import { parseSimpleCsv, toCsvValue } from "./utils/csvUtils.js";
import { tableExists } from "./utils/dbUtils.js";
import { normalizeError } from "./utils/errorUtils.js";

const INVENTORY_REASON_CODES = new Set([
  "manual_adjustment",
  "purchase",
  "sale",
  "return",
  "stock_take",
  "damage",
  "transfer",
  "import",
]);

async function resolveInventoryMovementTable() {
  if (await tableExists("stock_movements")) {
    return "stock_movements";
  }

  if (await tableExists("inventory_movements")) {
    return "inventory_movements";
  }

  throw new Error(
    "No stock movement table found. Run Feature 05 inventory migration.",
  );
}

function normalizeInventoryReasonCode(value) {
  const normalized = String(value || "manual_adjustment")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (!INVENTORY_REASON_CODES.has(normalized)) {
    throw new Error(
      `Invalid reason code: ${value}. Allowed: ${[
        ...INVENTORY_REASON_CODES,
      ].join(", ")}`,
    );
  }

  return normalized;
}

export async function getInventoryItems(filters = {}) {
  const { store } = await getStoreContext();

  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "id, sku, title, price, quantity_in_stock, reorder_level, updated_at, products!inner(id, title, store_id)",
    )
    .eq("products.store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  let rows = (data || []).map((item) => {
    const stock = Number(item.quantity_in_stock || 0);
    const reorderLevel = Number(item.reorder_level || 0);
    const lowStockThreshold = Math.max(1, reorderLevel);
    return {
      id: item.id,
      sku: item.sku,
      variantTitle: item.title,
      price: Number(item.price || 0),
      stock,
      reorderLevel,
      lowStockThreshold,
      isLowStock: stock <= lowStockThreshold,
      productId: item.products?.id,
      productName: item.products?.title || "-",
      updatedAt: item.updated_at,
    };
  });

  if (filters.search) {
    const keyword = String(filters.search).trim().toLowerCase();
    rows = rows.filter((item) =>
      [item.productName, item.variantTitle, item.sku]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }

  if (filters.alertOnly) {
    rows = rows.filter((item) => item.isLowStock);
  }

  return rows;
}

export async function syncInventoryLevelSnapshot({
  storeId,
  variantId,
  sku,
  variantTitle,
  quantityAfter,
  reorderLevel,
}) {
  const hasItems = await tableExists("inventory_items");
  const hasLevels = await tableExists("inventory_levels");

  if (!hasItems || !hasLevels) {
    return;
  }

  const { data: item, error: itemError } = await supabase
    .from("inventory_items")
    .upsert(
      {
        store_id: storeId,
        product_variant_id: variantId,
        sku,
        title: variantTitle || sku,
        total_available: Number(quantityAfter || 0),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_variant_id" },
    )
    .select("id")
    .single();

  if (itemError) {
    throw normalizeError(itemError);
  }

  const { error: levelError } = await supabase.from("inventory_levels").upsert(
    {
      inventory_item_id: item.id,
      location_code: "MAIN",
      available_quantity: Number(quantityAfter || 0),
      reserved_quantity: 0,
      reorder_point: Number(reorderLevel || 0),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "inventory_item_id,location_code" },
  );

  if (levelError) {
    throw normalizeError(levelError);
  }
}

export async function recordStockMovement({
  storeId,
  variantId,
  quantityBefore,
  quantityAfter,
  quantityDelta,
  reasonCode,
  note,
  metadata,
}) {
  const movementTable = await resolveInventoryMovementTable();

  if (movementTable === "stock_movements") {
    const hasInventoryItems = await tableExists("inventory_items");
    let inventoryItemId = null;

    if (hasInventoryItems) {
      const { data: inventoryItem, error: inventoryItemError } = await supabase
        .from("inventory_items")
        .select("id")
        .eq("product_variant_id", variantId)
        .eq("store_id", storeId)
        .maybeSingle();

      if (inventoryItemError) {
        throw normalizeError(inventoryItemError);
      }

      inventoryItemId = inventoryItem?.id || null;
    }

    const { error: movementError } = await supabase
      .from("stock_movements")
      .insert({
        store_id: storeId,
        inventory_item_id: inventoryItemId,
        product_variant_id: variantId,
        event_type: quantityDelta >= 0 ? "increase" : "decrease",
        reason_code: reasonCode,
        quantity_delta: quantityDelta,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        note: note || "Stock movement",
        metadata: metadata || {},
      });

    if (movementError) {
      throw normalizeError(movementError);
    }

    return;
  }

  const { error: movementError } = await supabase
    .from("inventory_movements")
    .insert({
      store_id: storeId,
      product_variant_id: variantId,
      movement_type: quantityDelta >= 0 ? "adjustment" : "sale",
      quantity_change: quantityDelta,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      reason: `${reasonCode}: ${note || "Stock movement"}`,
    });

  if (movementError) {
    throw normalizeError(movementError);
  }
}

export async function adjustInventory(payload) {
  const { store } = await getStoreContext();
  const amount = Number(payload.adjustment || 0);

  if (!amount) {
    throw new Error("Adjustment value is required");
  }

  const reasonCode = normalizeInventoryReasonCode(payload.reasonCode);
  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select(
      "id, sku, title, quantity_in_stock, reorder_level, products!inner(id, title, store_id)",
    )
    .eq("id", payload.variantId)
    .eq("products.store_id", store.id)
    .maybeSingle();

  if (variantError) {
    throw normalizeError(variantError);
  }

  if (!variant) {
    throw new Error("Variant not found");
  }

  const quantityBefore = Number(variant.quantity_in_stock || 0);
  const quantityAfter = quantityBefore + amount;

  if (quantityAfter < 0) {
    throw new Error("Stock cannot be negative");
  }

  const nextReorderLevel =
    payload.reorderLevel === undefined || payload.reorderLevel === null
      ? Number(variant.reorder_level || 0)
      : Number(payload.reorderLevel);

  const { data: updatedRows, error: updateError } = await supabase
    .from("product_variants")
    .update({
      quantity_in_stock: quantityAfter,
      reorder_level: nextReorderLevel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", variant.id)
    .eq("quantity_in_stock", quantityBefore)
    .select("id");

  if (updateError) {
    throw normalizeError(updateError);
  }

  if (!(updatedRows || []).length) {
    const conflictError = new Error(
      "Inventory was updated by another process. Please retry your adjustment.",
    );
    conflictError.code = "INVENTORY_CONFLICT";
    throw conflictError;
  }

  await recordStockMovement({
    storeId: store.id,
    variantId: variant.id,
    quantityBefore,
    quantityAfter,
    quantityDelta: amount,
    reasonCode,
    note: payload.reason || "Manual adjustment",
    metadata: payload.metadata || {},
  });

  await syncInventoryLevelSnapshot({
    storeId: store.id,
    variantId: variant.id,
    sku: variant.sku,
    variantTitle: variant.title,
    quantityAfter,
    reorderLevel: nextReorderLevel,
  });

  return {
    ok: true,
    quantityBefore,
    quantityAfter,
    reasonCode,
    isLowStock: quantityAfter <= Math.max(1, nextReorderLevel),
  };
}

export async function getInventoryMovements(limit = 40, filters = {}) {
  const { store } = await getStoreContext();
  const movementTable = await resolveInventoryMovementTable();

  if (movementTable === "stock_movements") {
    let query = supabase
      .from("stock_movements")
      .select(
        "id, event_type, reason_code, quantity_delta, quantity_before, quantity_after, note, created_at, product_variants(sku, title)",
      )
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filters.reasonCode && filters.reasonCode !== "all") {
      query = query.eq("reason_code", filters.reasonCode);
    }

    const { data, error } = await query;
    if (error) {
      throw normalizeError(error);
    }

    return (data || []).map((item) => ({
      id: item.id,
      movementType: item.event_type,
      reasonCode: item.reason_code || "manual_adjustment",
      quantityChange: Number(item.quantity_delta || 0),
      quantityBefore: Number(item.quantity_before || 0),
      quantityAfter: Number(item.quantity_after || 0),
      reason: item.note || "-",
      createdAt: item.created_at,
      sku: item.product_variants?.sku || "-",
      variantTitle: item.product_variants?.title || "-",
    }));
  }

  let fallbackQuery = supabase
    .from("inventory_movements")
    .select(
      "id, movement_type, quantity_change, quantity_before, quantity_after, reason, created_at, product_variants(sku, title)",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.reasonCode && filters.reasonCode !== "all") {
    fallbackQuery = fallbackQuery.ilike("reason", `%${filters.reasonCode}%`);
  }

  const { data, error } = await fallbackQuery;

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    movementType: item.movement_type,
    reasonCode: String(item.reason || "manual_adjustment").split(":")[0],
    quantityChange: Number(item.quantity_change || 0),
    quantityBefore: Number(item.quantity_before || 0),
    quantityAfter: Number(item.quantity_after || 0),
    reason: item.reason || "-",
    createdAt: item.created_at,
    sku: item.product_variants?.sku || "-",
    variantTitle: item.product_variants?.title || "-",
  }));
}

export async function getLowStockAlerts(filters = {}) {
  const items = await getInventoryItems({
    search: filters.search || "",
    alertOnly: true,
  });

  return items.map((item) => ({
    variantId: item.id,
    sku: item.sku,
    productName: item.productName,
    variantTitle: item.variantTitle,
    stock: item.stock,
    threshold: item.lowStockThreshold,
    severity:
      item.stock <= 0
        ? "critical"
        : item.stock <= Math.ceil(item.lowStockThreshold / 2)
          ? "high"
          : "medium",
  }));
}

export async function exportInventoryCsv() {
  const rows = await getInventoryItems();
  const headers = [
    "sku",
    "product_name",
    "variant_title",
    "stock",
    "reorder_level",
    "price",
  ];

  const body = rows.map((item) =>
    [
      item.sku,
      item.productName,
      item.variantTitle,
      item.stock,
      item.reorderLevel,
      item.price,
    ]
      .map(toCsvValue)
      .join(","),
  );

  return [headers.join(","), ...body].join("\n");
}

export async function importInventoryCsv(csvContent) {
  const { store } = await getStoreContext();
  const hasImportRuns = await tableExists("inventory_import_runs");
  let importRunId = null;

  if (hasImportRuns) {
    const { data: importRun, error: importRunError } = await supabase
      .from("inventory_import_runs")
      .insert({
        store_id: store.id,
        file_name: "inventory-import.csv",
        status: "running",
      })
      .select("id")
      .single();

    if (importRunError) {
      throw normalizeError(importRunError);
    }

    importRunId = importRun.id;
  }

  const parsed = parseSimpleCsv(csvContent);
  if (!parsed.records.length) {
    throw new Error("CSV is empty");
  }

  const requiredHeader = "sku";
  if (!parsed.headers.includes(requiredHeader)) {
    throw new Error("CSV must contain sku column");
  }

  const items = await getInventoryItems();
  const bySku = new Map(
    items.map((item) => [String(item.sku).toLowerCase(), item]),
  );

  const results = [];

  for (let index = 0; index < parsed.records.length; index += 1) {
    const row = parsed.records[index];
    const sku = String(row.sku || "").trim();
    const target = bySku.get(sku.toLowerCase());

    if (!sku || !target) {
      results.push({
        row: index + 2,
        sku,
        status: "failed",
        error: "SKU not found",
      });
      continue;
    }

    const adjustmentRaw = row.adjustment || row.quantity_change;
    const stockRaw = row.stock || row.quantity;
    const reorderRaw = row.reorder_level;

    let adjustment = Number(adjustmentRaw || 0);
    if (!adjustmentRaw && stockRaw !== "" && stockRaw !== undefined) {
      adjustment = Number(stockRaw) - Number(target.stock || 0);
    }

    if (!Number.isFinite(adjustment) || adjustment === 0) {
      results.push({
        row: index + 2,
        sku,
        status: "failed",
        error:
          "Provide adjustment or a stock value different from current stock",
      });
      continue;
    }

    try {
      await adjustInventory({
        variantId: target.id,
        adjustment,
        reorderLevel:
          reorderRaw === "" || reorderRaw === undefined
            ? undefined
            : Number(reorderRaw),
        reasonCode: row.reason_code || "import",
        reason: row.reason || "CSV import",
      });

      results.push({ row: index + 2, sku, status: "success" });
    } catch (err) {
      results.push({
        row: index + 2,
        sku,
        status: "failed",
        error: err.message || "Import row failed",
      });
    }
  }

  const summary = {
    total: results.length,
    successCount: results.filter((item) => item.status === "success").length,
    failedCount: results.filter((item) => item.status === "failed").length,
    rows: results,
  };

  if (hasImportRuns && importRunId) {
    const { error: updateImportRunError } = await supabase
      .from("inventory_import_runs")
      .update({
        status: summary.failedCount > 0 ? "failed" : "completed",
        total_rows: summary.total,
        success_rows: summary.successCount,
        failed_rows: summary.failedCount,
        error_report_json:
          summary.failedCount > 0
            ? summary.rows.filter((row) => row.status === "failed")
            : null,
      })
      .eq("id", importRunId)
      .eq("store_id", store.id);

    if (updateImportRunError) {
      throw normalizeError(updateImportRunError);
    }
  }

  return summary;
}
