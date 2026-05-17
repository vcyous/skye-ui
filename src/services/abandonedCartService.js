/**
 * abandonedCartService — Abandoned cart detection, recovery workflow, templates, and performance
 *
 * Domain: Cart Recovery / Retention
 * Feature: 07
 * Depends on: supabaseClient, utils/errorUtils, storeService, cartService
 */

import { supabase } from "./supabaseClient.js";
import { normalizeError, isMissingTableError } from "./utils/errorUtils.js";
import { tableExists } from "./utils/dbUtils.js";
import { getStoreContext } from "./storeService.js";

const ABANDONED_CART_STATUSES = new Set([
  "detected",
  "scheduled",
  "contacted",
  "recovered",
  "dismissed",
]);

const RECOVERY_MESSAGE_STATUSES = new Set([
  "scheduled",
  "sent",
  "opened",
  "converted",
  "failed",
  "cancelled",
]);

function normalizeAbandonedCartStatus(value) {
  const status = String(value || "detected")
    .trim()
    .toLowerCase();
  return ABANDONED_CART_STATUSES.has(status) ? status : "detected";
}

function normalizeRecoveryMessageStatus(value) {
  const status = String(value || "scheduled")
    .trim()
    .toLowerCase();
  return RECOVERY_MESSAGE_STATUSES.has(status) ? status : "scheduled";
}

function renderTemplateString(template, context = {}) {
  return String(template || "").replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_m, key) => String(context[key] ?? ""),
  );
}

function mapAbandonedRecovery(row = {}) {
  return {
    id: row.id,
    cartId: row.cart_id,
    customerId: row.customer_id,
    customerEmail: row.customer_email || "",
    customerName: row.customer_name || "Guest",
    itemCount: Number(row.item_count || 0),
    cartValue: Number(row.cart_value || 0),
    currencyCode: row.currency_code || "USD",
    status: normalizeAbandonedCartStatus(row.status),
    lastActivityAt: row.last_activity_at,
    detectedAt: row.detected_at,
    lastContactedAt: row.last_contacted_at,
    reminderScheduledAt: row.reminder_scheduled_at,
    recoveredAt: row.recovered_at,
    recoveredOrderId: row.recovered_order_id || null,
    metadata: row.metadata_json || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecoveryTemplate(row = {}) {
  return {
    id: row.id,
    name: row.name,
    channel: row.channel || "email",
    subject: row.subject_template || "",
    body: row.body_template || "",
    isDefault: Boolean(row.is_default),
    placeholders: Array.isArray(row.placeholders) ? row.placeholders : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listCartRowsForRecovery(storeId) {
  const { data: carts, error: cartError } = await supabase
    .from("carts")
    .select(
      "id, customer_id, status, created_at, updated_at, customers(first_name, last_name, email)",
    )
    .eq("store_id", storeId)
    .in("status", ["active", "abandoned"])
    .order("updated_at", { ascending: false })
    .limit(500);

  if (cartError) {
    throw normalizeError(cartError);
  }

  const cartIds = (carts || []).map((item) => item.id);
  if (!cartIds.length) {
    return [];
  }

  const { data: cartItems, error: itemError } = await supabase
    .from("cart_items")
    .select("cart_id, quantity, unit_price")
    .in("cart_id", cartIds);

  if (itemError) {
    throw normalizeError(itemError);
  }

  const totalsByCart = (cartItems || []).reduce((acc, item) => {
    const bucket = acc.get(item.cart_id) || { itemCount: 0, cartValue: 0 };
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || 0);
    bucket.itemCount += quantity;
    bucket.cartValue += quantity * unitPrice;
    acc.set(item.cart_id, bucket);
    return acc;
  }, new Map());

  return (carts || [])
    .map((cart) => {
      const totals = totalsByCart.get(cart.id) || {
        itemCount: 0,
        cartValue: 0,
      };
      const customerFirstName = cart.customers?.first_name || "";
      const customerLastName = cart.customers?.last_name || "";
      const fullName = [customerFirstName, customerLastName]
        .filter(Boolean)
        .join(" ");

      return {
        id: cart.id,
        customerId: cart.customer_id,
        customerEmail: cart.customers?.email || null,
        customerName: fullName || "Guest",
        lastActivityAt: cart.updated_at || cart.created_at,
        itemCount: totals.itemCount,
        cartValue: Number(totals.cartValue.toFixed(2)),
      };
    })
    .filter((item) => item.itemCount > 0 && item.cartValue > 0);
}

async function ensureAbandonedCartTemplateSeed(store) {
  if (!(await tableExists("recovery_message_templates"))) {
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from("recovery_message_templates")
    .select("id")
    .eq("store_id", store.id)
    .limit(1);

  if (existingError) {
    throw normalizeError(existingError);
  }

  if ((existing || []).length > 0) {
    return;
  }

  const now = new Date().toISOString();
  const templates = [
    {
      store_id: store.id,
      name: "Friendly recovery reminder",
      channel: "email",
      subject_template: "You left items in your cart, {{customer_name}}",
      body_template:
        "Hi {{customer_name}},\n\nYou still have {{item_count}} items worth {{cart_value}} in your cart. Complete checkout here: {{checkout_url}}\n\nNeed help? Reply to this email.",
      is_default: true,
      placeholders: [
        "customer_name",
        "item_count",
        "cart_value",
        "checkout_url",
      ],
      created_at: now,
      updated_at: now,
    },
    {
      store_id: store.id,
      name: "Last chance reminder",
      channel: "email",
      subject_template: "Last chance to complete your order",
      body_template:
        "Hi {{customer_name}},\n\nYour cart is still waiting. Items: {{item_count}} | Value: {{cart_value}}. Complete now: {{checkout_url}}",
      is_default: false,
      placeholders: [
        "customer_name",
        "item_count",
        "cart_value",
        "checkout_url",
      ],
      created_at: now,
      updated_at: now,
    },
  ];

  const { error: insertError } = await supabase
    .from("recovery_message_templates")
    .insert(templates);

  if (insertError) {
    throw normalizeError(insertError);
  }
}

export async function detectAbandonedCarts(options = {}) {
  const { store } = await getStoreContext();
  if (!(await tableExists("abandoned_cart_recoveries"))) {
    throw new Error(
      "Abandoned cart recovery schema missing. Run Feature 15 migration first.",
    );
  }

  const ageHours = Math.max(1, Number(options.ageHours || 24));
  const cutoffMs = Date.now() - ageHours * 60 * 60 * 1000;

  const cartRows = await listCartRowsForRecovery(store.id);
  const candidates = cartRows.filter(
    (item) => new Date(item.lastActivityAt).getTime() <= cutoffMs,
  );

  if (!candidates.length) {
    return { detectedCount: 0, rows: [] };
  }

  const now = new Date().toISOString();
  const upsertRows = candidates.map((item) => ({
    store_id: store.id,
    cart_id: item.id,
    customer_id: item.customerId,
    customer_email: item.customerEmail,
    customer_name: item.customerName,
    item_count: item.itemCount,
    cart_value: item.cartValue,
    currency_code: store.currency_code || "USD",
    status: "detected",
    last_activity_at: item.lastActivityAt,
    detected_at: now,
    metadata_json: {
      ageHours,
      source: "cart_activity",
    },
    updated_at: now,
  }));

  const { data, error } = await supabase
    .from("abandoned_cart_recoveries")
    .upsert(upsertRows, { onConflict: "store_id,cart_id" })
    .select(
      "id, cart_id, customer_id, customer_email, customer_name, item_count, cart_value, currency_code, status, last_activity_at, detected_at, last_contacted_at, reminder_scheduled_at, recovered_at, recovered_order_id, metadata_json, created_at, updated_at",
    );

  if (error) {
    throw normalizeError(error);
  }

  return {
    detectedCount: (data || []).length,
    rows: (data || []).map((item) => mapAbandonedRecovery(item)),
  };
}

export async function getAbandonedCartRecoveries(filters = {}) {
  const { store } = await getStoreContext();

  if (filters.autoDetect !== false) {
    await detectAbandonedCarts({ ageHours: filters.ageHours || 24 });
  }

  let query = supabase
    .from("abandoned_cart_recoveries")
    .select(
      "id, cart_id, customer_id, customer_email, customer_name, item_count, cart_value, currency_code, status, last_activity_at, detected_at, last_contacted_at, reminder_scheduled_at, recovered_at, recovered_order_id, metadata_json, created_at, updated_at",
    )
    .eq("store_id", store.id)
    .order("last_activity_at", { ascending: true });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", normalizeAbandonedCartStatus(filters.status));
  }

  let { data, error } = await query;

  if (error) {
    if (isMissingTableError(error, "abandoned_cart_recoveries")) {
      return [];
    }
    throw normalizeError(error);
  }

  let rows = (data || []).map((item) => mapAbandonedRecovery(item));
  const minAgeHours = Number(filters.ageHours || 0);
  if (minAgeHours > 0) {
    const cutoffMs = Date.now() - minAgeHours * 60 * 60 * 1000;
    rows = rows.filter(
      (item) => new Date(item.lastActivityAt).getTime() <= cutoffMs,
    );
  }

  return rows;
}

export async function updateAbandonedCartRecoveryStatus(
  recoveryId,
  status,
  payload = {},
) {
  if (!recoveryId) {
    throw new Error("Recovery id is required");
  }

  const { store } = await getStoreContext();
  const nextStatus = normalizeAbandonedCartStatus(status);
  const now = new Date().toISOString();
  const updatePayload = {
    status: nextStatus,
    updated_at: now,
  };

  if (nextStatus === "recovered") {
    updatePayload.recovered_at = now;
    updatePayload.recovered_order_id = payload.recoveredOrderId || null;
  }

  const { error } = await supabase
    .from("abandoned_cart_recoveries")
    .update(updatePayload)
    .eq("id", recoveryId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function getRecoveryMessageTemplates() {
  const { store } = await getStoreContext();
  await ensureAbandonedCartTemplateSeed(store);

  const { data, error } = await supabase
    .from("recovery_message_templates")
    .select(
      "id, name, channel, subject_template, body_template, is_default, placeholders, created_at, updated_at",
    )
    .eq("store_id", store.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableError(error, "recovery_message_templates")) {
      return [];
    }
    throw normalizeError(error);
  }

  return (data || []).map((item) => mapRecoveryTemplate(item));
}

export async function createRecoveryMessageTemplate(payload = {}) {
  const { store } = await getStoreContext();
  const name = String(payload.name || "").trim();
  if (!name) {
    throw new Error("Template name is required");
  }

  const { error } = await supabase.from("recovery_message_templates").insert({
    store_id: store.id,
    name,
    channel: payload.channel || "email",
    subject_template: payload.subject || "",
    body_template: payload.body || "",
    is_default: Boolean(payload.isDefault),
    placeholders: Array.isArray(payload.placeholders)
      ? payload.placeholders
      : ["customer_name", "item_count", "cart_value", "checkout_url"],
  });

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function updateRecoveryMessageTemplate(templateId, payload = {}) {
  if (!templateId) {
    throw new Error("Template id is required");
  }

  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("recovery_message_templates")
    .update({
      name: String(payload.name || "").trim(),
      channel: payload.channel || "email",
      subject_template: payload.subject || "",
      body_template: payload.body || "",
      is_default: Boolean(payload.isDefault),
      placeholders: Array.isArray(payload.placeholders)
        ? payload.placeholders
        : ["customer_name", "item_count", "cart_value", "checkout_url"],
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function sendAbandonedCartRecoveryMessage(payload = {}) {
  const { store } = await getStoreContext();
  if (!payload.recoveryId) {
    throw new Error("Recovery id is required");
  }
  if (!payload.templateId) {
    throw new Error("Template id is required");
  }

  const { data: recovery, error: recoveryError } = await supabase
    .from("abandoned_cart_recoveries")
    .select(
      "id, customer_email, customer_name, item_count, cart_value, cart_id, currency_code",
    )
    .eq("id", payload.recoveryId)
    .eq("store_id", store.id)
    .single();

  if (recoveryError) {
    throw normalizeError(recoveryError);
  }

  const { data: template, error: templateError } = await supabase
    .from("recovery_message_templates")
    .select("id, channel, subject_template, body_template")
    .eq("id", payload.templateId)
    .eq("store_id", store.id)
    .single();

  if (templateError) {
    throw normalizeError(templateError);
  }

  const context = {
    customer_name: recovery.customer_name || "there",
    item_count: Number(recovery.item_count || 0),
    cart_value: `${Number(recovery.cart_value || 0).toFixed(2)} ${
      recovery.currency_code || "USD"
    }`,
    checkout_url:
      payload.checkoutUrl ||
      `${typeof window !== "undefined" ? window.location.origin : ""}/checkout`,
  };

  const subject = renderTemplateString(template.subject_template, context);
  const body = renderTemplateString(template.body_template, context);
  const status = payload.scheduleAt ? "scheduled" : "sent";
  const now = new Date().toISOString();

  const { error: messageError } = await supabase
    .from("abandoned_cart_messages")
    .insert({
      store_id: store.id,
      recovery_id: recovery.id,
      template_id: template.id,
      channel: payload.channel || template.channel || "email",
      recipient: recovery.customer_email || null,
      subject,
      body,
      status,
      scheduled_at: payload.scheduleAt || null,
      sent_at: status === "sent" ? now : null,
      metadata_json: {
        placeholders: context,
      },
      created_at: now,
      updated_at: now,
    });

  if (messageError) {
    throw normalizeError(messageError);
  }

  const nextRecoveryStatus = status === "scheduled" ? "scheduled" : "contacted";
  const { error: recoveryUpdateError } = await supabase
    .from("abandoned_cart_recoveries")
    .update({
      status: nextRecoveryStatus,
      last_contacted_at: status === "sent" ? now : null,
      reminder_scheduled_at: status === "scheduled" ? payload.scheduleAt : null,
      updated_at: now,
    })
    .eq("id", recovery.id)
    .eq("store_id", store.id);

  if (recoveryUpdateError) {
    throw normalizeError(recoveryUpdateError);
  }

  return { ok: true };
}

export async function updateAbandonedCartMessageStatus(messageId, status) {
  if (!messageId) {
    throw new Error("Message id is required");
  }

  const { store } = await getStoreContext();
  const nextStatus = normalizeRecoveryMessageStatus(status);
  const now = new Date().toISOString();
  const updatePayload = {
    status: nextStatus,
    updated_at: now,
  };

  if (nextStatus === "opened") {
    updatePayload.opened_at = now;
  }

  if (nextStatus === "converted") {
    updatePayload.converted_at = now;
  }

  const { data: updatedMessage, error: updateError } = await supabase
    .from("abandoned_cart_messages")
    .update(updatePayload)
    .eq("id", messageId)
    .eq("store_id", store.id)
    .select("recovery_id")
    .single();

  if (updateError) {
    throw normalizeError(updateError);
  }

  if (nextStatus === "converted") {
    await updateAbandonedCartRecoveryStatus(
      updatedMessage.recovery_id,
      "recovered",
    );
  }

  return { ok: true };
}

export async function getAbandonedCartPerformance(filters = {}) {
  const { store } = await getStoreContext();
  const trendDays = Math.max(7, Number(filters.trendDays || 14));
  const trend = [];
  const trendMap = new Map();

  for (let offset = trendDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    const day = date.toISOString().slice(0, 10);
    const row = {
      day,
      sent: 0,
      opened: 0,
      converted: 0,
    };
    trend.push(row);
    trendMap.set(day, row);
  }

  const fromDate = `${trend[0]?.day || new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;

  const { data: messageRows, error: messageError } = await supabase
    .from("abandoned_cart_messages")
    .select("status, sent_at, opened_at, converted_at, created_at")
    .eq("store_id", store.id)
    .gte("created_at", fromDate)
    .order("created_at", { ascending: true });

  if (messageError) {
    if (isMissingTableError(messageError, "abandoned_cart_messages")) {
      return {
        summary: {
          totalDetected: 0,
          messagesSent: 0,
          openedCount: 0,
          convertedCount: 0,
          openRate: 0,
          conversionRate: 0,
          recoveredRate: 0,
        },
        trend,
      };
    }
    throw normalizeError(messageError);
  }

  let messagesSent = 0;
  let openedCount = 0;
  let convertedCount = 0;

  for (const message of messageRows || []) {
    const sentDay = String(message.sent_at || message.created_at || "").slice(
      0,
      10,
    );
    if (
      sentDay &&
      trendMap.has(sentDay) &&
      ["sent", "opened", "converted"].includes(message.status)
    ) {
      trendMap.get(sentDay).sent += 1;
      messagesSent += 1;
    }

    const openedDay = String(message.opened_at || "").slice(0, 10);
    if (openedDay && trendMap.has(openedDay)) {
      trendMap.get(openedDay).opened += 1;
      openedCount += 1;
    }

    const convertedDay = String(message.converted_at || "").slice(0, 10);
    if (convertedDay && trendMap.has(convertedDay)) {
      trendMap.get(convertedDay).converted += 1;
      convertedCount += 1;
    }
  }

  const { data: recoveries, error: recoveryError } = await supabase
    .from("abandoned_cart_recoveries")
    .select("id, status")
    .eq("store_id", store.id);

  if (recoveryError) {
    throw normalizeError(recoveryError);
  }

  const totalDetected = (recoveries || []).length;
  const recoveredCount = (recoveries || []).filter(
    (item) => item.status === "recovered",
  ).length;

  return {
    summary: {
      totalDetected,
      messagesSent,
      openedCount,
      convertedCount,
      openRate: Number(
        (messagesSent > 0 ? (openedCount / messagesSent) * 100 : 0).toFixed(2),
      ),
      conversionRate: Number(
        (messagesSent > 0 ? (convertedCount / messagesSent) * 100 : 0).toFixed(
          2,
        ),
      ),
      recoveredRate: Number(
        (totalDetected > 0
          ? (recoveredCount / totalDetected) * 100
          : 0
        ).toFixed(2),
      ),
    },
    trend,
  };
}
