import { loadTransactionEventsByTransactionIds } from "../paymentService";
import { normalizeReturnStatus } from "../returnsService";
import { getStoreContext } from "../storeService";
import { supabase } from "../supabaseClient";
import { normalizeTaxBehavior } from "../taxService";
import { tableExists } from "../utils/dbUtils";
import { isMissingColumnError, normalizeError } from "../utils/errorUtils";

function legacyFulfillmentFromStatus(status) {
  if (status === "receive") return "delivered";
  if (status === "ongoing_shipped") return "shipped";
  if (status === "cancelled") return "cancelled";
  return "unfulfilled";
}

async function fetchOrderRow(storeId, orderId) {
  let response = await supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, fulfillment_status, subtotal_amount, discount_amount, tax_amount, shipping_amount, total_amount, currency_code, note, shipping_address, billing_address, created_at, updated_at, customers(first_name, last_name, email, phone)",
    )
    .eq("store_id", storeId)
    .eq("id", orderId)
    .maybeSingle();

  if (response.error && isMissingColumnError(response.error, "fulfillment_status")) {
    const fallback = await supabase
      .from("orders")
      .select(
        "id, order_number, status, payment_status, subtotal_amount, discount_amount, tax_amount, shipping_amount, total_amount, currency_code, note, shipping_address, billing_address, created_at, updated_at, customers(first_name, last_name, email, phone)",
      )
      .eq("store_id", storeId)
      .eq("id", orderId)
      .maybeSingle();

    response = {
      data: fallback.data
        ? {
            ...fallback.data,
            fulfillment_status: legacyFulfillmentFromStatus(fallback.data.status),
          }
        : fallback.data,
      error: fallback.error,
    };
  }
  return response;
}

async function fetchRelated(storeId, orderId, hasSnapshots, hasSubscription) {
  return Promise.all([
    supabase
      .from("order_items")
      .select(
        "id, product_title, variant_title, sku, quantity, unit_price, line_total",
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("order_timeline")
      .select("id, status, note, actor_type, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select(
        "id, amount, captured_amount, currency_code, status, provider_status, gateway_transaction_id, failure_code, created_at, payment_methods(display_name)",
      )
      .eq("store_id", storeId)
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("shipments")
      .select(
        "id, tracking_number, carrier, status, shipping_cost, shipped_at, delivered_at, shipping_methods(name)",
      )
      .eq("store_id", storeId)
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, subtotal, taxable_amount, tax_rate, tax_behavior, tax_amount, discount_amount, total, status, metadata_json, issued_at",
      )
      .eq("store_id", storeId)
      .eq("order_id", orderId)
      .maybeSingle(),
    supabase
      .from("returns")
      .select(
        "id, rma_number, reason, reason_code, resolution_note, status, requested_at, approved_at, rejected_at, received_at, refunded_at",
      )
      .eq("store_id", storeId)
      .eq("order_id", orderId)
      .order("requested_at", { ascending: true }),
    supabase
      .from("refunds")
      .select(
        "id, amount, status, refund_type, reason_code, note, processed_at, created_at, returns!inner(order_id)",
      )
      .eq("store_id", storeId)
      .eq("returns.order_id", orderId)
      .order("created_at", { ascending: true }),
    hasSnapshots
      ? supabase
          .from("order_currency_snapshots")
          .select(
            "display_currency, base_currency, fx_rate, fx_source, fx_confidence, fx_as_of, used_fallback, subtotal_display, discount_display, shipping_display, tax_display, total_display",
          )
          .eq("store_id", storeId)
          .eq("order_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    hasSubscription
      ? supabase
          .from("order_subscription_context")
          .select(
            "subscription_id, is_renewal, cycle_index, context_json, customer_subscriptions(status, next_billing_at, plan_id, subscription_plans(name))",
          )
          .eq("store_id", storeId)
          .eq("order_id", orderId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
}

async function reconcileTransactions(storeId, orderId, response) {
  if (!response.error) return response;
  if (!isMissingColumnError(response.error, "captured_amount")) {
    throw normalizeError(response.error);
  }
  const fallback = await supabase
    .from("transactions")
    .select(
      "id, amount, currency_code, status, gateway_transaction_id, created_at, payment_methods(display_name)",
    )
    .eq("store_id", storeId)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (fallback.error) throw normalizeError(fallback.error);
  return {
    data: (fallback.data || []).map((item) => ({
      ...item,
      captured_amount:
        item.status === "captured"
          ? Number(item.amount || 0)
          : item.status === "partially_captured"
            ? Number(item.amount || 0) / 2
            : 0,
      provider_status: null,
      failure_code: null,
    })),
    error: null,
  };
}

async function reconcileInvoice(storeId, orderId, response) {
  if (!response.error) return response;
  if (!isMissingColumnError(response.error, "taxable_amount")) {
    throw normalizeError(response.error);
  }
  const fallback = await supabase
    .from("invoices")
    .select("id, invoice_number, subtotal, tax_amount, discount_amount, total, issued_at")
    .eq("store_id", storeId)
    .eq("order_id", orderId)
    .maybeSingle();
  if (fallback.error) throw normalizeError(fallback.error);
  return {
    data: fallback.data
      ? {
          ...fallback.data,
          taxable_amount: fallback.data.subtotal,
          tax_rate: 0,
          tax_behavior: "exclusive",
          status: "issued",
          metadata_json: {},
        }
      : fallback.data,
    error: null,
  };
}

async function reconcileReturns(storeId, orderId, response) {
  if (!response.error) return response;
  if (!isMissingColumnError(response.error, "reason_code")) {
    throw normalizeError(response.error);
  }
  const fallback = await supabase
    .from("returns")
    .select("id, rma_number, reason, status, requested_at")
    .eq("store_id", storeId)
    .eq("order_id", orderId)
    .order("requested_at", { ascending: true });
  if (fallback.error) throw normalizeError(fallback.error);
  return {
    data: (fallback.data || []).map((item) => ({
      ...item,
      reason_code: "other",
      resolution_note: null,
      approved_at: null,
      rejected_at: null,
      received_at: null,
      refunded_at: null,
    })),
    error: null,
  };
}

async function reconcileRefunds(storeId, orderId, response) {
  if (!response.error) return response;
  if (!isMissingColumnError(response.error, "refund_type")) {
    throw normalizeError(response.error);
  }
  const fallback = await supabase
    .from("refunds")
    .select("id, amount, status, created_at, returns!inner(order_id)")
    .eq("store_id", storeId)
    .eq("returns.order_id", orderId)
    .order("created_at", { ascending: true });
  if (fallback.error) throw normalizeError(fallback.error);
  return {
    data: (fallback.data || []).map((item) => ({
      ...item,
      refund_type: "partial",
      reason_code: "other",
      note: null,
      processed_at: item.created_at,
    })),
    error: null,
  };
}

function mapItems(rows) {
  return (rows || []).map((item) => ({
    id: item.id,
    productTitle: item.product_title,
    productName: item.product_title,
    variantTitle: item.variant_title,
    sku: item.sku,
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unit_price || 0),
    lineTotal: Number(item.line_total || 0),
  }));
}

function mapTimeline(rows) {
  return (rows || []).map((item) => ({
    id: item.id,
    status: item.status,
    note: item.note || "",
    actorType: item.actor_type,
    createdAt: item.created_at,
  }));
}

function mapTransactions(rows, eventMap) {
  return (rows || []).map((item) => ({
    id: item.id,
    amount: Number(item.amount || 0),
    capturedAmount: Number(item.captured_amount || 0),
    currencyCode: item.currency_code,
    status: item.status,
    providerStatus: item.provider_status || "",
    failureCode: item.failure_code || "",
    gatewayTransactionId: item.gateway_transaction_id || "",
    paymentMethodName: item.payment_methods?.display_name || "-",
    attempts: eventMap.get(item.id) || [],
    attemptCount: (eventMap.get(item.id) || []).length,
    createdAt: item.created_at,
  }));
}

function mapShipments(rows) {
  return (rows || []).map((item) => ({
    id: item.id,
    trackingNumber: item.tracking_number || "",
    carrier: item.carrier || "",
    status: item.status,
    shippingCost: Number(item.shipping_cost || 0),
    shippingMethodName: item.shipping_methods?.name || "-",
    shippedAt: item.shipped_at,
    deliveredAt: item.delivered_at,
  }));
}

function mapInvoice(row) {
  if (!row) return null;
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    subtotal: Number(row.subtotal || 0),
    taxableAmount: Number(row.taxable_amount || row.subtotal || 0),
    taxRate: Number(row.tax_rate || 0),
    taxBehavior: normalizeTaxBehavior(row.tax_behavior),
    taxAmount: Number(row.tax_amount || 0),
    discountAmount: Number(row.discount_amount || 0),
    total: Number(row.total || 0),
    status: row.status || "issued",
    metadata: row.metadata_json || {},
    issuedAt: row.issued_at,
  };
}

function mapReturns(rows) {
  return (rows || []).map((item) => ({
    id: item.id,
    rmaNumber: item.rma_number,
    reason: item.reason || "",
    reasonCode: item.reason_code || "other",
    resolutionNote: item.resolution_note || "",
    status: normalizeReturnStatus(item.status),
    requestedAt: item.requested_at,
    approvedAt: item.approved_at,
    rejectedAt: item.rejected_at,
    receivedAt: item.received_at,
    refundedAt: item.refunded_at,
  }));
}

function mapRefunds(rows) {
  return (rows || []).map((item) => ({
    id: item.id,
    amount: Number(item.amount || 0),
    status: item.status,
    refundType: item.refund_type || "partial",
    reasonCode: item.reason_code || "other",
    note: item.note || "",
    processedAt: item.processed_at || item.created_at,
    createdAt: item.created_at,
  }));
}

function mapCurrencySnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    baseCurrency: snapshot.base_currency,
    displayCurrency: snapshot.display_currency,
    fxRate: Number(snapshot.fx_rate || 1),
    fxSource: snapshot.fx_source || "manual",
    fxConfidence: Number(snapshot.fx_confidence || 0),
    fxAsOf: snapshot.fx_as_of || null,
    usedFallback: Boolean(snapshot.used_fallback),
  };
}

function mapSubscriptionContext(context) {
  if (!context) return null;
  const subscription = context.customer_subscriptions;
  return {
    subscriptionId: context.subscription_id,
    status: subscription?.status || "active",
    nextBillingAt: subscription?.next_billing_at || null,
    planId: subscription?.plan_id || null,
    planName:
      subscription?.subscription_plans?.name ||
      context.context_json?.planName ||
      "Subscription",
    isRenewal: Boolean(context.is_renewal),
    cycleIndex:
      context.cycle_index ?? context.context_json?.cycleIndex ?? null,
    context: context.context_json || {},
  };
}

function customerNameOf(orderRow, customer) {
  return (
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
    orderRow.shipping_address?.fullName ||
    "Guest Customer"
  );
}

export async function getOrderDetail(orderId) {
  const { store } = await getStoreContext();
  const [hasSnapshots, hasSubscription] = await Promise.all([
    tableExists("order_currency_snapshots"),
    tableExists("order_subscription_context"),
  ]);

  const orderResponse = await fetchOrderRow(store.id, orderId);

  let [
    itemsResponse,
    timelineResponse,
    transactionsResponse,
    shipmentsResponse,
    invoiceResponse,
    returnsResponse,
    refundsResponse,
    currencySnapshotResponse,
    subscriptionContextResponse,
  ] = await fetchRelated(store.id, orderId, hasSnapshots, hasSubscription);

  if (orderResponse.error) throw normalizeError(orderResponse.error);
  if (itemsResponse.error) throw normalizeError(itemsResponse.error);
  if (timelineResponse.error) throw normalizeError(timelineResponse.error);

  transactionsResponse = await reconcileTransactions(
    store.id,
    orderId,
    transactionsResponse,
  );
  if (shipmentsResponse.error) throw normalizeError(shipmentsResponse.error);
  invoiceResponse = await reconcileInvoice(store.id, orderId, invoiceResponse);
  returnsResponse = await reconcileReturns(store.id, orderId, returnsResponse);
  refundsResponse = await reconcileRefunds(store.id, orderId, refundsResponse);
  if (currencySnapshotResponse.error)
    throw normalizeError(currencySnapshotResponse.error);
  if (subscriptionContextResponse.error)
    throw normalizeError(subscriptionContextResponse.error);

  if (!orderResponse.data) throw new Error("Order not found");

  const orderRow = orderResponse.data;
  const customer = Array.isArray(orderRow.customers)
    ? orderRow.customers[0]
    : orderRow.customers;
  const currencySnapshot = currencySnapshotResponse.data || null;
  const subscriptionContext = subscriptionContextResponse.data || null;

  const transactionIds = (transactionsResponse.data || []).map((row) => row.id);
  const eventMap = await loadTransactionEventsByTransactionIds(transactionIds);

  const customerName = customerNameOf(orderRow, customer);

  return {
    id: orderRow.id,
    orderNumber: orderRow.order_number,
    order_number: orderRow.order_number,
    status: orderRow.status,
    lifecycleState: null,
    paymentStatus: orderRow.payment_status,
    fulfillmentStatus: orderRow.fulfillment_status || "unfulfilled",
    subtotalAmount: Number(orderRow.subtotal_amount || 0),
    discountAmount: Number(orderRow.discount_amount || 0),
    taxAmount: Number(orderRow.tax_amount || 0),
    shippingAmount: Number(orderRow.shipping_amount || 0),
    totalAmount: Number(orderRow.total_amount || 0),
    currencyCode: orderRow.currency_code,
    displayCurrencyCode:
      currencySnapshot?.display_currency || orderRow.currency_code,
    displaySubtotalAmount: Number(
      currencySnapshot?.subtotal_display || orderRow.subtotal_amount || 0,
    ),
    displayDiscountAmount: Number(
      currencySnapshot?.discount_display || orderRow.discount_amount || 0,
    ),
    displayShippingAmount: Number(
      currencySnapshot?.shipping_display || orderRow.shipping_amount || 0,
    ),
    displayTaxAmount: Number(
      currencySnapshot?.tax_display || orderRow.tax_amount || 0,
    ),
    displayTotalAmount: Number(
      currencySnapshot?.total_display || orderRow.total_amount || 0,
    ),
    currencySnapshot: mapCurrencySnapshot(currencySnapshot),
    subscriptionContext: mapSubscriptionContext(subscriptionContext),
    note: orderRow.note || "",
    shippingAddress: orderRow.shipping_address || {},
    billingAddress: orderRow.billing_address || {},
    customerName,
    customerEmail: customer?.email || orderRow.shipping_address?.email || null,
    customerPhone: customer?.phone || orderRow.shipping_address?.phone || null,
    createdAt: orderRow.created_at,
    created_at: orderRow.created_at,
    updatedAt: orderRow.updated_at,
    updated_at: orderRow.updated_at,
    total: Number(orderRow.total_amount || 0),
    total_price: Number(orderRow.total_amount || 0),
    displayTotal: Number(
      currencySnapshot?.total_display || orderRow.total_amount || 0,
    ),
    customer_name:
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      null,
    subscriptionId: null,
    subscriptionStatus: null,
    isSubscriptionRenewal: false,
    subscriptionLabel: null,
    internalNotes: [],
    items: mapItems(itemsResponse.data),
    timeline: mapTimeline(timelineResponse.data),
    transactions: mapTransactions(transactionsResponse.data, eventMap),
    shipments: mapShipments(shipmentsResponse.data),
    invoice: mapInvoice(invoiceResponse.data),
    returns: mapReturns(returnsResponse.data),
    refunds: mapRefunds(refundsResponse.data),
  };
}
