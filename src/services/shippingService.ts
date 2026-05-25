/**
 * shippingService — Shipping methods, zones, shipment lifecycle, and fulfillment
 *
 * Domain: Shipping / Fulfillment
 * Feature: 10
 * Depends on: supabaseClient, utils/errorUtils, storeService
 */

import { sendEmail } from "./emailService";
import { getStoreContext } from "./storeService";
import { supabase } from "./supabaseClient";
import { tableExists } from "./utils/dbUtils";
import { isMissingColumnError, normalizeError } from "./utils/errorUtils";

export interface ShippingZone {
  id: string;
  name: string;
  countryCode: string;
  regionCode: string;
  postalCodePattern: string;
  isActive: boolean;
  createdAt?: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  shippingType: string;
  baseRate: number;
  config: Record<string, unknown>;
  isActive: boolean;
  zones: ShippingZone[];
  createdAt: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  orderNumber: string;
  shippingMethodId: string | null;
  shippingMethodName: string;
  carrier: string | null;
  trackingNumber: string | null;
  status: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface FulfillmentItem {
  id: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string;
  orderedQty: number;
  allocatedQty: number;
  remainingQty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CreateShipmentPayload {
  orderId: string;
  carrier?: string;
  trackingNumber?: string;
  note?: string;
  shippingMethodId?: string;
  status?: string;
  items: Array<{ orderItemId: string; quantity: number }>;
}

export async function getShippingMethods(): Promise<ShippingMethod[]> {
  const { store } = await getStoreContext();
  const { data, error } = await supabase
    .from("shipping_methods")
    .select(
      "id, name, shipping_type, base_rate, config_json, is_active, created_at",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  const rows = data || [];
  let zonesByMethod = new Map();

  if (
    rows.length &&
    (await tableExists("shipping_method_zones")) &&
    (await tableExists("shipping_zones"))
  ) {
    const methodIds = rows.map((item) => item.id);
    const { data: links, error: linksError } = await supabase
      .from("shipping_method_zones")
      .select(
        "shipping_method_id, shipping_zones(id, zone_name, country_code, region_code, postal_code_pattern, is_active)",
      )
      .in("shipping_method_id", methodIds);

    if (linksError) {
      throw normalizeError(linksError);
    }

    zonesByMethod = (links || []).reduce((acc, link) => {
      const bucket = acc.get(link.shipping_method_id) || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sz = link.shipping_zones as any;
      if (sz) {
        bucket.push({
          id: sz.id,
          name: sz.zone_name,
          countryCode: sz.country_code || "",
          regionCode: sz.region_code || "",
          postalCodePattern: sz.postal_code_pattern || "",
          isActive: Boolean(sz.is_active),
        });
      }
      acc.set(link.shipping_method_id, bucket);
      return acc;
    }, new Map());
  }

  return rows.map((item) => ({
    id: item.id,
    name: item.name,
    shippingType: item.shipping_type,
    baseRate: Number(item.base_rate || 0),
    config: item.config_json || {},
    isActive: Boolean(item.is_active),
    zones: zonesByMethod.get(item.id) || [],
    createdAt: item.created_at,
  }));
}

export async function getShippingZones(): Promise<ShippingZone[]> {
  const { store } = await getStoreContext();
  if (!(await tableExists("shipping_zones"))) {
    return [];
  }

  const { data, error } = await supabase
    .from("shipping_zones")
    .select(
      "id, zone_name, country_code, region_code, postal_code_pattern, is_active, created_at",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item) => ({
    id: item.id,
    name: item.zone_name,
    countryCode: item.country_code || "",
    regionCode: item.region_code || "",
    postalCodePattern: item.postal_code_pattern || "",
    isActive: Boolean(item.is_active),
    createdAt: item.created_at,
  }));
}

export async function createShippingZone(
  payload: Partial<ShippingZone> & { name: string },
): Promise<{ ok: boolean }> {
  const { store } = await getStoreContext();
  if (!(await tableExists("shipping_zones"))) {
    throw new Error(
      "Shipping zones table is missing. Run Feature 10 migration first.",
    );
  }

  const { error } = await supabase.from("shipping_zones").insert({
    store_id: store.id,
    zone_name: payload.name,
    country_code: payload.countryCode || null,
    region_code: payload.regionCode || null,
    postal_code_pattern: payload.postalCodePattern || null,
    is_active: payload.isActive ?? true,
  });

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function updateShippingZone(
  zoneId: string,
  payload: Partial<ShippingZone>,
): Promise<{ ok: boolean }> {
  const { store } = await getStoreContext();
  if (!(await tableExists("shipping_zones"))) {
    throw new Error(
      "Shipping zones table is missing. Run Feature 10 migration first.",
    );
  }

  const { error } = await supabase
    .from("shipping_zones")
    .update({
      zone_name: payload.name,
      country_code: payload.countryCode || null,
      region_code: payload.regionCode || null,
      postal_code_pattern: payload.postalCodePattern || null,
      is_active: payload.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", zoneId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function deleteShippingZone(
  zoneId: string,
): Promise<{ ok: boolean }> {
  const { store } = await getStoreContext();
  if (!(await tableExists("shipping_zones"))) {
    return { ok: true };
  }

  const { error } = await supabase
    .from("shipping_zones")
    .delete()
    .eq("id", zoneId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function createShippingMethod(
  payload: Partial<ShippingMethod> & {
    name: string;
    shippingType: string;
    zoneIds?: string[];
  },
): Promise<{ ok: boolean }> {
  const { store } = await getStoreContext();
  const { data: method, error } = await supabase
    .from("shipping_methods")
    .insert({
      store_id: store.id,
      name: payload.name,
      shipping_type: payload.shippingType,
      base_rate: Number(payload.baseRate || 0),
      config_json: payload.config || {},
      is_active: payload.isActive ?? true,
    })
    .select("id")
    .single();

  if (error) {
    throw normalizeError(error);
  }

  if (
    method?.id &&
    Array.isArray(payload.zoneIds) &&
    payload.zoneIds.length &&
    (await tableExists("shipping_method_zones"))
  ) {
    const { error: linkError } = await supabase
      .from("shipping_method_zones")
      .insert(
        payload.zoneIds.map((zoneId) => ({
          shipping_method_id: method.id,
          shipping_zone_id: zoneId,
        })),
      );

    if (linkError) {
      throw normalizeError(linkError);
    }
  }

  return { ok: true };
}

export async function updateShippingMethod(
  shippingMethodId: string,
  payload: Partial<ShippingMethod> & { zoneIds?: string[] },
): Promise<{ ok: boolean }> {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("shipping_methods")
    .update({
      name: payload.name,
      shipping_type: payload.shippingType,
      base_rate: Number(payload.baseRate || 0),
      config_json: payload.config || {},
      is_active: payload.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shippingMethodId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  if (await tableExists("shipping_method_zones")) {
    const { error: deleteLinkError } = await supabase
      .from("shipping_method_zones")
      .delete()
      .eq("shipping_method_id", shippingMethodId);

    if (deleteLinkError) {
      throw normalizeError(deleteLinkError);
    }

    if (Array.isArray(payload.zoneIds) && payload.zoneIds.length) {
      const { error: insertLinkError } = await supabase
        .from("shipping_method_zones")
        .insert(
          payload.zoneIds.map((zoneId) => ({
            shipping_method_id: shippingMethodId,
            shipping_zone_id: zoneId,
          })),
        );

      if (insertLinkError) {
        throw normalizeError(insertLinkError);
      }
    }
  }

  return { ok: true };
}

export async function getOrderFulfillmentItems(
  orderId: string,
): Promise<FulfillmentItem[]> {
  const { store } = await getStoreContext();
  const [orderItemsResult, shipmentItemsResult] = await Promise.all([
    supabase
      .from("order_items")
      .select(
        "id, product_title, variant_title, sku, quantity, unit_price, line_total, orders!inner(id, store_id)",
      )
      .eq("order_id", orderId)
      .eq("orders.store_id", store.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("shipment_items")
      .select("order_item_id, quantity, shipments!inner(order_id, status)")
      .eq("shipments.order_id", orderId),
  ]);

  if (orderItemsResult.error) {
    throw normalizeError(orderItemsResult.error);
  }
  if (shipmentItemsResult.error) {
    throw normalizeError(shipmentItemsResult.error);
  }

  const allocatedMap = (shipmentItemsResult.data || []).reduce((acc, row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (row.shipments as any)?.status;
    if (status === "failed") {
      return acc;
    }

    const key = row.order_item_id;
    acc.set(key, Number(acc.get(key) || 0) + Number(row.quantity || 0));
    return acc;
  }, new Map());

  return (orderItemsResult.data || []).map((item) => {
    const orderedQty = Number(item.quantity || 0);
    const allocatedQty = Number(allocatedMap.get(item.id) || 0);
    const remainingQty = Math.max(orderedQty - allocatedQty, 0);
    return {
      id: item.id,
      productTitle: item.product_title,
      variantTitle: item.variant_title,
      sku: item.sku,
      orderedQty,
      allocatedQty,
      remainingQty,
      unitPrice: Number(item.unit_price || 0),
      lineTotal: Number(item.line_total || 0),
    };
  });
}

async function syncOrderFulfillmentFromShipments(
  orderId: string,
  storeId: string,
): Promise<{ fulfillmentStatus: string; orderStatus: string }> {
  const [orderItemsResult, shipmentItemsResult] = await Promise.all([
    supabase.from("order_items").select("id, quantity").eq("order_id", orderId),
    supabase
      .from("shipment_items")
      .select("order_item_id, quantity, shipments!inner(order_id, status)")
      .eq("shipments.order_id", orderId),
  ]);

  if (orderItemsResult.error) {
    throw normalizeError(orderItemsResult.error);
  }
  if (shipmentItemsResult.error) {
    throw normalizeError(shipmentItemsResult.error);
  }

  const totalOrdered = (orderItemsResult.data || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

  let totalDelivered = 0;
  let totalShipped = 0;
  for (const row of shipmentItemsResult.data || []) {
    const qty = Number(row.quantity || 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (row.shipments as any)?.status;
    if (status === "delivered") {
      totalDelivered += qty;
      totalShipped += qty;
    } else if (status === "shipped") {
      totalShipped += qty;
    }
  }

  let fulfillmentStatus = "unfulfilled";
  let orderStatus = "need_ship";
  if (totalOrdered > 0 && totalDelivered >= totalOrdered) {
    fulfillmentStatus = "delivered";
    orderStatus = "receive";
  } else if (totalShipped > 0 && totalShipped >= totalOrdered) {
    fulfillmentStatus = "shipped";
    orderStatus = "ongoing_shipped";
  } else if (totalShipped > 0) {
    fulfillmentStatus = "partial";
    orderStatus = "ongoing_shipped";
  }

  let orderUpdate = await supabase
    .from("orders")
    .update({
      status: orderStatus,
      fulfillment_status: fulfillmentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("store_id", storeId);

  if (
    orderUpdate.error &&
    isMissingColumnError(orderUpdate.error, "fulfillment_status")
  ) {
    orderUpdate = await supabase
      .from("orders")
      .update({
        status: orderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("store_id", storeId);
  }

  if (orderUpdate.error) {
    throw normalizeError(orderUpdate.error);
  }

  return { fulfillmentStatus, orderStatus };
}

export async function getShipments(): Promise<Shipment[]> {
  const { store } = await getStoreContext();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any, error: any;
  ({ data, error } = await supabase
    .from("shipments")
    .select(
      "id, order_id, shipping_method_id, tracking_number, carrier, status, shipped_at, delivered_at, created_at, orders!inner(id, store_id, order_number), shipping_methods(id, name)",
    )
    .eq("orders.store_id", store.id)
    .order("created_at", { ascending: false }));

  if (error && isMissingColumnError(error, "shipped_at")) {
    const fallback = await supabase
      .from("shipments")
      .select(
        "id, order_id, shipping_method_id, tracking_number, carrier, status, created_at, orders!inner(id, store_id, order_number), shipping_methods(id, name)",
      )
      .eq("orders.store_id", store.id)
      .order("created_at", { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    orderId: item.order_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orderNumber: (item.orders as any)?.order_number || item.order_id,
    shippingMethodId: item.shipping_method_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shippingMethodName: (item.shipping_methods as any)?.name || "-",
    trackingNumber: item.tracking_number || "-",
    carrier: item.carrier || "-",
    status: item.status || "pending",
    shippedAt: item.shipped_at || null,
    deliveredAt: item.delivered_at || null,
    createdAt: item.created_at,
  }));
}

export async function createShipment(
  payload: CreateShipmentPayload,
): Promise<{ id: string; ok: boolean }> {
  const { store } = await getStoreContext();

  const orderId = payload.orderId;
  const shippingMethodId = payload.shippingMethodId;
  const items = Array.isArray(payload.items)
    ? payload.items
        .map((item) => ({
          orderItemId: item.orderItemId,
          quantity: Number(item.quantity || 0),
        }))
        .filter((item) => item.orderItemId && item.quantity > 0)
    : [];

  if (!orderId) {
    throw new Error("Order is required");
  }

  if (!items.length) {
    throw new Error("Shipment requires at least one item");
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (orderError) {
    throw normalizeError(orderError);
  }

  if (!order) {
    throw new Error("Order not found");
  }

  if (shippingMethodId) {
    const { data: shippingMethod, error: methodError } = await supabase
      .from("shipping_methods")
      .select("id")
      .eq("id", shippingMethodId)
      .eq("store_id", store.id)
      .maybeSingle();

    if (methodError) {
      throw normalizeError(methodError);
    }

    if (!shippingMethod) {
      throw new Error("Shipping method not found");
    }
  }

  const nextStatus = payload.status || "pending";
  const nowIso = new Date().toISOString();
  const shipmentInsert = {
    order_id: orderId,
    shipping_method_id: shippingMethodId || null,
    tracking_number: payload.trackingNumber || null,
    carrier: payload.carrier || null,
    status: nextStatus,
    shipped_at:
      nextStatus === "shipped" || nextStatus === "delivered" ? nowIso : null,
    delivered_at: nextStatus === "delivered" ? nowIso : null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data: shipment, error } = (await supabase
    .from("shipments")
    .insert(shipmentInsert)
    .select("id, order_id")
    .single()) as any;

  if (error && isMissingColumnError(error, "shipped_at")) {
    const fallback = await supabase
      .from("shipments")
      .insert({
        order_id: orderId,
        shipping_method_id: shippingMethodId || null,
        tracking_number: payload.trackingNumber || null,
        carrier: payload.carrier || null,
        status: nextStatus,
      })
      .select("id, order_id")
      .single();
    shipment = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  const { error: shipmentItemsError } = await supabase
    .from("shipment_items")
    .insert(
      items.map((item) => ({
        shipment_id: shipment.id,
        order_item_id: item.orderItemId,
        quantity: item.quantity,
      })),
    );

  if (shipmentItemsError) {
    throw normalizeError(shipmentItemsError);
  }

  await syncOrderFulfillmentFromShipments(orderId, store.id);

  // Send shipping notification email (non-blocking)
  try {
    const { data: orderRow } = await supabase
      .from("orders")
      .select("order_number, customers(email)")
      .eq("id", orderId)
      .single();

    const orderNumber = orderRow?.order_number ?? "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customerEmail = (orderRow?.customers as any)?.email ?? null;

    if (customerEmail) {
      sendEmail({
        orderId,
        recipient: customerEmail,
        subject: `Your order #${orderNumber} has shipped`,
        template: "shipping_notification",
        data: {
          orderNumber,
          trackingNumber: payload.trackingNumber,
          carrier: payload.carrier,
        },
      }).catch(() => null);
    }
  } catch {
    // Non-blocking — don't fail shipment creation
  }

  return { id: shipment.id, ok: true };
}

export async function updateShipmentStatus(
  shipmentId: string,
  status: string,
): Promise<{ ok: boolean }> {
  const { store } = await getStoreContext();
  const nextStatus = String(status || "pending")
    .trim()
    .toLowerCase();
  const nowIso = new Date().toISOString();

  const { data: shipment, error: shipmentError } = await supabase
    .from("shipments")
    .select("id, order_id, orders!inner(id, store_id)")
    .eq("id", shipmentId)
    .eq("orders.store_id", store.id)
    .maybeSingle();

  if (shipmentError) {
    throw normalizeError(shipmentError);
  }

  if (!shipment) {
    throw new Error("Shipment not found");
  }

  let updateResult = await supabase
    .from("shipments")
    .update({
      status: nextStatus,
      shipped_at:
        nextStatus === "shipped" || nextStatus === "delivered" ? nowIso : null,
      delivered_at: nextStatus === "delivered" ? nowIso : null,
      updated_at: nowIso,
    })
    .eq("id", shipmentId);

  if (
    updateResult.error &&
    isMissingColumnError(updateResult.error, "shipped_at")
  ) {
    updateResult = await supabase
      .from("shipments")
      .update({
        status: nextStatus,
        updated_at: nowIso,
      })
      .eq("id", shipmentId);
  }

  if (updateResult.error) {
    throw normalizeError(updateResult.error);
  }

  await syncOrderFulfillmentFromShipments(shipment.order_id, store.id);

  return { ok: true };
}

export async function deleteShippingMethod(
  shippingMethodId: string,
): Promise<{ ok: boolean }> {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("shipping_methods")
    .delete()
    .eq("id", shippingMethodId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}
