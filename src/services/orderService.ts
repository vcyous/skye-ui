/**
 * orderService — Order lifecycle, status machine, detail retrieval, and order creation from cart
 *
 * Domain: Orders
 * Feature: 08
 * Depends on: supabaseClient, utils/errorUtils, storeService, taxService, shippingService, discountService, paymentService, inventoryService
 */

import { invalidateAnalyticsReportCache } from "./analyticsService";
import { ensureActiveCart, getCart } from "./cartService";
import {
  revalidateCheckout,
  saveCheckoutRecoveryState,
} from "./checkoutService";
import { getCurrencyConversionQuote } from "./currencyService";
import {
  calculateDiscountAmount,
  listDiscountRows,
  normalizeCodeList,
  resolveApplicableDiscounts,
} from "./discountService";
import { sendEmail } from "./emailService";
import {
  recordStockMovement,
  syncInventoryLevelSnapshot,
} from "./inventoryService";
import {
  createTransactionEvent,
  getPaymentMethods,
  loadTransactionEventsByTransactionIds,
} from "./paymentService";
import { normalizeReturnStatus } from "./returnsService";
import { getShippingMethods } from "./shippingService";
import {
  createInvoiceNumber,
  createOrderNumber,
  getStoreContext,
} from "./storeService";
import { supabase } from "./supabaseClient";
import {
  getTaxRules,
  normalizeTaxBehavior,
  resolveMatchingTaxRule,
  resolveTaxPricing,
} from "./taxService";
import { tableExists } from "./utils/dbUtils";
import {
  isMissingColumnError,
  isMissingTableError,
  normalizeError,
} from "./utils/errorUtils";

export interface OrderSummary {
  id: string;
  orderNumber: string;
  order_number: string;
  status: string;
  lifecycleState: string | null;
  totalAmount: number;
  total: number;
  total_price: number;
  displayTotal: number;
  displayCurrencyCode: string | null;
  currencyCode: string | null;
  customerName: string | null;
  customer_name: string | null;
  customerEmail: string | null;
  paymentStatus: string;
  fulfillmentStatus: string;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  isSubscriptionRenewal: boolean;
  subscriptionLabel: string | null;
  createdAt: string;
  created_at: string;
  updatedAt: string | null;
  updated_at: string | null;
}

export interface OrderDetail extends OrderSummary {
  items: Array<{
    id: string;
    productTitle: string;
    productName?: string;
    variantTitle: string | null;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  shippingAddress: {
    fullName?: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    [key: string]: unknown;
  } | null;
  billingAddress: Record<string, unknown> | null;
  note: string | null;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  currencyCode: string;
  displayCurrencyCode: string;
  displaySubtotalAmount: number;
  displayDiscountAmount: number;
  displayShippingAmount: number;
  displayTaxAmount: number;
  displayTotalAmount: number;
  currencySnapshot: {
    baseCurrency: string;
    displayCurrency: string;
    fxRate: number;
    fxSource: string;
    fxConfidence: number;
    fxAsOf: string | null;
    usedFallback: boolean;
  } | null;
  subscriptionContext: {
    subscriptionId: string;
    status: string;
    nextBillingAt: string | null;
    planId: string | null;
    planName: string;
    isRenewal: boolean;
    cycleIndex: number | null;
    context: Record<string, unknown>;
  } | null;
  customerPhone: string | null;
  updatedAt: string;
  timeline: Array<{
    id: string;
    status: string;
    note: string;
    actorType: string | null;
    createdAt: string;
  }>;
  internalNotes: Array<{
    id: string;
    note: string;
    createdAt: string;
  }>;
  transactions: Array<Record<string, unknown>>;
  shipments: Array<Record<string, unknown>>;
  invoice: Record<string, unknown> | null;
  returns: Array<Record<string, unknown>>;
  refunds: Array<Record<string, unknown>>;
}

export interface CreateOrderPayload {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  shippingMethodId?: string;
  paymentMethodId?: string;
  discountCode?: string | string[];
  note?: string;
  displayCurrency?: string;
  checkoutState?: string;
  formData?: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export async function createOrderFromCart(
  payload: CreateOrderPayload,
): Promise<{ id: string; orderNumber: string; currencyQuote: unknown }> {
  const { authUser, store } = await getStoreContext();
  const activeState = String(payload.checkoutState || "review")
    .trim()
    .toLowerCase();

  await saveCheckoutRecoveryState({
    state: activeState,
    status: "in_progress",
    formData: payload.formData || payload,
    note: "Checkout submit attempt",
  });

  const precheck = await revalidateCheckout(payload);
  if (!precheck.ok) {
    await saveCheckoutRecoveryState({
      state: "failed",
      status: "failed",
      formData: payload.formData || payload,
      revalidation: precheck,
      lastError: precheck.issues.map((item) => item.message).join("; "),
      note: "Revalidation failed before order creation",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err: any = new Error(
      `Checkout revalidation failed: ${precheck.issues
        .map((item) => item.message)
        .join("; ")}`,
    );
    err.code = "CHECKOUT_REVALIDATION_FAILED";
    throw err;
  }

  const cart = await getCart();

  if (!cart.items.length) {
    await saveCheckoutRecoveryState({
      state: "failed",
      status: "failed",
      formData: payload.formData || payload,
      lastError: "Cart is empty",
      note: "Cart empty during submit",
    });
    throw new Error("Cart is empty");
  }

  let customerId: string | null = null;
  if (payload.customerEmail || payload.customerName) {
    const [firstName, ...rest] = String(
      payload.customerName || "Guest Customer",
    ).split(" ");
    const lastName = rest.join(" ") || null;
    const { data: existingCustomer, error: customerLookupError } =
      await supabase
        .from("customers")
        .select("id")
        .eq("store_id", store.id)
        .eq("email", payload.customerEmail || "")
        .maybeSingle();

    if (customerLookupError) {
      throw normalizeError(customerLookupError);
    }

    if (existingCustomer?.id) {
      customerId = existingCustomer.id;
    } else {
      const { data: insertedCustomer, error: customerInsertError } =
        await supabase
          .from("customers")
          .insert({
            store_id: store.id,
            email: payload.customerEmail || null,
            first_name: firstName || "Guest",
            last_name: lastName,
            phone: payload.customerPhone || null,
          })
          .select("id")
          .single();

      if (customerInsertError) {
        throw normalizeError(customerInsertError);
      }

      customerId = insertedCustomer.id;
    }
  }

  let appliedDiscount: unknown = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let appliedDiscounts: any[] = [];
  if (payload.discountCode) {
    const discounts = await listDiscountRows(store.id, "active");
    const codes = normalizeCodeList(payload.discountCode);
    const resolution = resolveApplicableDiscounts(discounts, {
      subtotal: Number(cart.subtotal || 0),
      cartItemCount: Array.isArray(cart.items) ? cart.items.length : 0,
      codes,
    });

    if (!resolution.applied.length) {
      throw new Error("Discount code not found, inactive, or ineligible");
    }

    appliedDiscounts = resolution.applied;
    appliedDiscount = resolution.applied[0];
  }

  const subtotalAmount = Number(cart.subtotal || 0);
  const discountAmount = appliedDiscounts.length
    ? Number(
        appliedDiscounts
          .reduce(
            (sum, discount) =>
              sum +
              calculateDiscountAmount(subtotalAmount, {
                ...discount,
                applicable_item_count: Array.isArray(cart.items)
                  ? cart.items.length
                  : 0,
                average_item_amount:
                  Array.isArray(cart.items) && cart.items.length
                    ? Number(subtotalAmount) / Number(cart.items.length)
                    : 0,
              }),
            0,
          )
          .toFixed(2),
      )
    : calculateDiscountAmount(subtotalAmount, appliedDiscount);
  const activeShippingMethods = await getShippingMethods();
  const selectedShippingMethod = activeShippingMethods.find(
    (item) => item.id === payload.shippingMethodId,
  );
  const paymentMethods = await getPaymentMethods();
  const selectedPaymentMethod = paymentMethods.find(
    (item) => item.id === payload.paymentMethodId,
  );
  const taxRules = await getTaxRules();
  const matchingTaxRule = resolveMatchingTaxRule(taxRules, payload.country);

  const shippingAmount = Number(
    selectedShippingMethod?.baseRate ?? payload.shippingAmount ?? 0,
  );
  const pricing = resolveTaxPricing({
    subtotalAmount,
    discountAmount,
    shippingAmount,
    taxRule: matchingTaxRule,
    manualTaxAmount: Number(payload.taxAmount || 0),
  });
  const taxAmount = pricing.taxAmount;
  const totalAmount = pricing.totalAmount;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currencyQuote: any = await getCurrencyConversionQuote({
    baseCurrency: store.currency || store.currency_code || "USD",
    displayCurrency:
      payload.displayCurrency || store.currency || store.currency_code || "USD",
    subtotal: subtotalAmount,
    discountAmount,
    shippingAmount,
    taxableAmount: pricing.taxableAmount,
    taxAmount,
    totalAmount,
  });

  for (const item of cart.items) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((item as any).quantity > (item as any).stock) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new Error(`Insufficient stock for ${(item as any).productName}`);
    }
  }

  const shippingAddress = {
    fullName: payload.customerName || "Guest Customer",
    email: payload.customerEmail || null,
    phone: payload.customerPhone || null,
    addressLine1: payload.addressLine1 || "",
    city: payload.city || "",
    postalCode: payload.postalCode || "",
    country: payload.country || "",
  };

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      store_id: store.id,
      customer_id: customerId,
      order_number: createOrderNumber(),
      status: "not_paid",
      payment_status: "pending",
      subtotal_amount: subtotalAmount,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      shipping_amount: shippingAmount,
      total_amount: totalAmount,
      currency_code: store.currency || store.currency_code || "USD",
      note: payload.note || null,
      shipping_address: shippingAddress,
      billing_address: shippingAddress,
    })
    .select("id, order_number")
    .single();

  if (orderError) {
    throw normalizeError(orderError);
  }

  const { error: orderItemsError } = await supabase.from("order_items").insert(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cart.items.map((item: any) => ({
      order_id: order.id,
      product_variant_id: item.variantId,
      product_title: item.productName,
      variant_title: item.variantTitle,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: Number((item.quantity * item.unitPrice).toFixed(2)),
    })),
  );

  if (orderItemsError) {
    throw normalizeError(orderItemsError);
  }

  if (selectedPaymentMethod) {
    const transactionStatus =
      selectedPaymentMethod.provider === "manual" ? "authorized" : "pending";

    const { data: insertedTransaction, error: transactionError } =
      await supabase
        .from("transactions")
        .insert({
          store_id: store.id,
          order_id: order.id,
          payment_method_id: selectedPaymentMethod.id,
          amount: totalAmount,
          currency_code: store.currency || store.currency_code || "USD",
          status: transactionStatus,
          gateway_transaction_id: `txn-${Date.now().toString(36)}`,
          gateway_response: { provider: selectedPaymentMethod.provider },
        })
        .select("id, gateway_transaction_id")
        .single();

    if (transactionError) {
      throw normalizeError(transactionError);
    }

    if (insertedTransaction?.id) {
      await createTransactionEvent({
        transactionId: insertedTransaction.id,
        orderId: order.id,
        eventType:
          transactionStatus === "authorized" ? "authorization" : "attempt",
        status: transactionStatus,
        providerStatus: transactionStatus,
        amount: totalAmount,
        referenceId: insertedTransaction.gateway_transaction_id,
        note: `Checkout initiated payment via ${selectedPaymentMethod.provider}`,
        metadata: { provider: selectedPaymentMethod.provider },
      });
    }
  }

  const invoiceInsertPayload = {
    store_id: store.id,
    order_id: order.id,
    invoice_number: createInvoiceNumber(),
    subtotal: subtotalAmount,
    taxable_amount: pricing.taxableAmount,
    tax_rate: pricing.taxRate,
    tax_behavior: pricing.taxBehavior,
    tax_rule_id: pricing.taxRuleId,
    tax_amount: taxAmount,
    discount_amount: discountAmount,
    total: totalAmount,
    metadata_json: {
      source: "checkout",
      country: payload.country || null,
      shippingMethodId: payload.shippingMethodId || null,
      paymentMethodId: payload.paymentMethodId || null,
      taxRuleId: pricing.taxRuleId,
    },
  };

  let { error: invoiceError } = await supabase
    .from("invoices")
    .insert(invoiceInsertPayload);

  if (invoiceError && isMissingColumnError(invoiceError, "taxable_amount")) {
    const fallbackInvoice = await supabase.from("invoices").insert({
      store_id: store.id,
      order_id: order.id,
      invoice_number: createInvoiceNumber(),
      subtotal: subtotalAmount,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total: totalAmount,
    });
    invoiceError = fallbackInvoice.error;
  }

  if (invoiceError) {
    throw normalizeError(invoiceError);
  }

  if (await tableExists("order_currency_snapshots")) {
    const { error: snapshotError } = await supabase
      .from("order_currency_snapshots")
      .insert({
        store_id: store.id,
        order_id: order.id,
        base_currency: currencyQuote.baseCurrency,
        display_currency: currencyQuote.displayCurrency,
        fx_rate: currencyQuote.rate,
        fx_source: currencyQuote.source,
        fx_confidence: currencyQuote.confidence,
        fx_as_of: currencyQuote.asOf,
        used_fallback: currencyQuote.usedFallback,
        rounding_policy: currencyQuote.roundingPolicy,
        subtotal_display: currencyQuote.converted.subtotal,
        discount_display: currencyQuote.converted.discountAmount,
        shipping_display: currencyQuote.converted.shippingAmount,
        tax_display: currencyQuote.converted.taxAmount,
        total_display: currencyQuote.converted.totalAmount,
      });

    if (
      snapshotError &&
      !isMissingTableError(snapshotError, "order_currency_snapshots")
    ) {
      throw normalizeError(snapshotError);
    }
  }

  if (
    payload.subscriptionId &&
    (await tableExists("order_subscription_context"))
  ) {
    const { error: subscriptionContextError } = await supabase
      .from("order_subscription_context")
      .insert({
        store_id: store.id,
        order_id: order.id,
        subscription_id: payload.subscriptionId,
        is_renewal: Boolean(payload.isSubscriptionRenewal),
        cycle_index: payload.subscriptionCycleIndex || null,
        context_json: payload.subscriptionContext || {},
      });

    if (
      subscriptionContextError &&
      !isMissingTableError(
        subscriptionContextError,
        "order_subscription_context",
      )
    ) {
      throw normalizeError(subscriptionContextError);
    }
  }

  const { error: timelineError } = await supabase
    .from("order_timeline")
    .insert({
      order_id: order.id,
      status: "not_paid",
      actor_type: "user",
      actor_id: authUser.id,
      note: "Order created from checkout",
    });

  if (timelineError) {
    throw normalizeError(timelineError);
  }

  for (const item of cart.items) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cartItem = item as any;
    const quantityBefore = Number(cartItem.stock || 0);
    const quantityAfter = quantityBefore - Number(cartItem.quantity || 0);

    if (quantityAfter < 0) {
      throw new Error(
        `Insufficient stock for SKU ${cartItem.sku || cartItem.variantId}`,
      );
    }

    const { data: stockRows, error: stockError } = await supabase
      .from("product_variants")
      .update({
        quantity_in_stock: quantityAfter,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cartItem.variantId)
      .eq("quantity_in_stock", quantityBefore)
      .select("id");

    if (stockError) {
      throw normalizeError(stockError);
    }

    if (!(stockRows || []).length) {
      throw new Error(
        `Stock for SKU ${cartItem.sku || cartItem.variantId} changed during checkout. Please retry.`,
      );
    }

    await recordStockMovement({
      storeId: store.id,
      variantId: cartItem.variantId,
      quantityBefore,
      quantityAfter,
      quantityDelta: -Number(cartItem.quantity || 0),
      reasonCode: "sale",
      note: `Order ${order.order_number}`,
      metadata: { orderId: order.id, orderNumber: order.order_number },
    });

    await syncInventoryLevelSnapshot({
      storeId: store.id,
      variantId: cartItem.variantId,
      sku: cartItem.sku,
      variantTitle: cartItem.variantName || cartItem.variantTitle,
      quantityAfter,
      reorderLevel: Number(cartItem.reorderLevel || 0),
    });
  }

  const { error: cartStatusError } = await supabase
    .from("carts")
    .update({
      status: "converted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", cart.id)
    .eq("store_id", store.id);

  if (cartStatusError) {
    throw normalizeError(cartStatusError);
  }

  if (appliedDiscounts.length) {
    for (const discount of appliedDiscounts) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: discountUpdateError } = await supabase
        .from("discounts")
        .update({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          uses_count: Number((discount as any).uses_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .eq("id", (discount as any).id)
        .eq("store_id", store.id);

      if (discountUpdateError) {
        throw normalizeError(discountUpdateError);
      }
    }
  }

  await ensureActiveCart(store.id);

  await saveCheckoutRecoveryState({
    state: "confirmed",
    status: "completed",
    formData: payload.formData || payload,
    revalidation: precheck,
    note: `Order ${order.order_number} created`,
    metadata: { orderId: order.id, orderNumber: order.order_number },
  });

  await invalidateAnalyticsReportCache(store.id, "analytics_overview");

  if (payload.customerEmail) {
    sendEmail({
      orderId: order.id,
      recipient: payload.customerEmail,
      subject: `Order #${order.order_number} confirmed — thank you!`,
      template: "order_confirmation",
      data: {
        orderNumber: order.order_number,
        customerName: payload.customerName ?? "Customer",
        totalAmount,
      },
    }).catch(() => null);
  }

  return {
    id: order.id,
    orderNumber: order.order_number,
    currencyQuote,
  };
}

const ORDER_STATUS_FLOW: Record<string, string[]> = {
  pending: ["not_paid", "cancelled"],
  not_paid: ["need_ship", "cancelled", "failed_delivery"],
  need_ship: ["ongoing_shipped", "cancelled", "failed_delivery"],
  ongoing_shipped: ["receive", "failed_delivery"],
  failed_delivery: ["need_ship", "cancelled"],
  receive: [],
  cancelled: [],
};

const PAYMENT_STATUS_FLOW: Record<string, string[]> = {
  pending: ["authorized", "paid", "failed", "cancelled"],
  authorized: ["paid", "failed", "refunded"],
  paid: ["partially_refunded", "refunded"],
  partially_refunded: ["refunded"],
  refunded: [],
  failed: ["pending", "cancelled"],
  cancelled: [],
};

const FULFILLMENT_STATUS_FLOW: Record<string, string[]> = {
  unfulfilled: ["partial", "shipped", "fulfilled", "cancelled"],
  partial: ["shipped", "fulfilled", "cancelled"],
  shipped: ["delivered", "failed"],
  fulfilled: ["delivered"],
  delivered: [],
  failed: ["shipped", "cancelled"],
  cancelled: [],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function canTransition(
  flow: Record<string, string[]>,
  from: unknown,
  to: unknown,
): boolean {
  const fromKey = String(from || "").toLowerCase();
  const toKey = String(to || "").toLowerCase();

  if (!toKey || toKey === fromKey) {
    return true;
  }

  const allowed = flow[fromKey] || [];
  return allowed.includes(toKey);
}

async function logOrderTimelineEvent(
  orderIdValue: string,
  statusValue: string,
  authUserId: string,
  note?: string | null,
): Promise<void> {
  const { error: timelineError } = await supabase
    .from("order_timeline")
    .insert({
      order_id: orderIdValue,
      status: statusValue,
      actor_type: "user",
      actor_id: authUserId,
      note: note || null,
    });

  if (timelineError) {
    throw normalizeError(timelineError);
  }
}

async function logOrderStateEvent(payload: {
  orderId: string;
  actorId: string;
  eventType: string;
  fromValue?: string | null;
  toValue?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!(await tableExists("order_state_events"))) {
    return;
  }

  const { error } = await supabase.from("order_state_events").insert({
    order_id: payload.orderId,
    actor_id: payload.actorId,
    event_type: payload.eventType,
    from_value: payload.fromValue || null,
    to_value: payload.toValue || null,
    note: payload.note || null,
    metadata: payload.metadata || {},
  });

  if (error) {
    throw normalizeError(error);
  }
}

async function fetchOrderLifecycleSnapshot(
  orderIdValue: string,
  storeId: string,
): Promise<{
  id: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
}> {
  let { data, error } = await supabase
    .from("orders")
    .select("id, status, payment_status, fulfillment_status")
    .eq("id", orderIdValue)
    .eq("store_id", storeId)
    .maybeSingle();

  if (error && isMissingColumnError(error, "fulfillment_status")) {
    const fallback = await supabase
      .from("orders")
      .select("id, status, payment_status")
      .eq("id", orderIdValue)
      .eq("store_id", storeId)
      .maybeSingle();

    data = fallback.data
      ? {
          ...fallback.data,
          fulfillment_status:
            fallback.data.status === "receive"
              ? "delivered"
              : fallback.data.status === "ongoing_shipped"
                ? "shipped"
                : fallback.data.status === "cancelled"
                  ? "cancelled"
                  : "unfulfilled",
        }
      : fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  if (!data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err: any = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    throw err;
  }

  return data;
}

async function updateOrderLifecycle(
  orderIdValue: string,
  payload: {
    status?: string;
    paymentStatus?: string;
    fulfillmentStatus?: string;
    note?: string;
    internalNote?: string;
  } = {},
): Promise<unknown> {
  const { authUser, store } = await getStoreContext();
  const current = await fetchOrderLifecycleSnapshot(orderIdValue, store.id);

  const nextStatus = payload.status || current.status;
  const nextPaymentStatus = payload.paymentStatus || current.payment_status;
  const nextFulfillmentStatus =
    payload.fulfillmentStatus || current.fulfillment_status;

  if (!canTransition(ORDER_STATUS_FLOW, current.status, nextStatus)) {
    throw new Error(
      `Invalid order status transition: ${current.status} -> ${nextStatus}`,
    );
  }

  if (
    !canTransition(
      PAYMENT_STATUS_FLOW,
      current.payment_status,
      nextPaymentStatus,
    )
  ) {
    throw new Error(
      `Invalid payment status transition: ${current.payment_status} -> ${nextPaymentStatus}`,
    );
  }

  if (
    !canTransition(
      FULFILLMENT_STATUS_FLOW,
      current.fulfillment_status,
      nextFulfillmentStatus,
    )
  ) {
    throw new Error(
      `Invalid fulfillment status transition: ${current.fulfillment_status} -> ${nextFulfillmentStatus}`,
    );
  }

  const updatePayload = {
    status: nextStatus,
    payment_status: nextPaymentStatus,
    fulfillment_status: nextFulfillmentStatus,
    updated_at: new Date().toISOString(),
  };

  let { data: updatedOrder, error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderIdValue)
    .eq("store_id", store.id)
    .select(
      "id, order_number, status, payment_status, fulfillment_status, total_amount, created_at, updated_at",
    )
    .maybeSingle();

  if (error && isMissingColumnError(error, "fulfillment_status")) {
    const fallback = await supabase
      .from("orders")
      .update({
        status: nextStatus,
        payment_status: nextPaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderIdValue)
      .eq("store_id", store.id)
      .select(
        "id, order_number, status, payment_status, total_amount, created_at, updated_at",
      )
      .maybeSingle();

    updatedOrder = fallback.data
      ? {
          ...fallback.data,
          fulfillment_status: current.fulfillment_status,
        }
      : fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  if (!updatedOrder) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err: any = new Error("Order not found");
    err.code = "ORDER_NOT_FOUND";
    throw err;
  }

  if (nextStatus !== current.status) {
    await logOrderTimelineEvent(
      updatedOrder.id,
      nextStatus,
      authUser.id,
      payload.note || `Order status updated to ${nextStatus}`,
    );
    await logOrderStateEvent({
      orderId: updatedOrder.id,
      actorId: authUser.id,
      eventType: "order_status",
      fromValue: current.status,
      toValue: nextStatus,
      note: payload.note,
    });
  }

  if (nextPaymentStatus !== current.payment_status) {
    await logOrderTimelineEvent(
      updatedOrder.id,
      nextStatus,
      authUser.id,
      payload.note || `Payment status updated to ${nextPaymentStatus}`,
    );
    await logOrderStateEvent({
      orderId: updatedOrder.id,
      actorId: authUser.id,
      eventType: "payment_status",
      fromValue: current.payment_status,
      toValue: nextPaymentStatus,
      note: payload.note,
    });
  }

  if (nextFulfillmentStatus !== current.fulfillment_status) {
    await logOrderTimelineEvent(
      updatedOrder.id,
      nextStatus,
      authUser.id,
      payload.note || `Fulfillment status updated to ${nextFulfillmentStatus}`,
    );
    await logOrderStateEvent({
      orderId: updatedOrder.id,
      actorId: authUser.id,
      eventType: "fulfillment_status",
      fromValue: current.fulfillment_status,
      toValue: nextFulfillmentStatus,
      note: payload.note,
    });
  }

  if (payload.internalNote) {
    await logOrderTimelineEvent(
      updatedOrder.id,
      nextStatus,
      authUser.id,
      `Internal note: ${payload.internalNote}`,
    );
    await logOrderStateEvent({
      orderId: updatedOrder.id,
      actorId: authUser.id,
      eventType: "internal_note",
      fromValue: null,
      toValue: null,
      note: payload.internalNote,
    });
  }

  await invalidateAnalyticsReportCache(store.id, "analytics_overview");

  return {
    id: updatedOrder.id,
    order_number: updatedOrder.order_number,
    orderNumber: updatedOrder.order_number,
    total_price: Number(updatedOrder.total_amount || 0),
    total: Number(updatedOrder.total_amount || 0),
    status: updatedOrder.status,
    paymentStatus: updatedOrder.payment_status,
    fulfillmentStatus:
      updatedOrder.fulfillment_status || current.fulfillment_status,
    created_at: updatedOrder.created_at,
    updated_at: updatedOrder.updated_at,
  };
}

export async function addOrderInternalNote(
  orderId: string,
  note: string,
): Promise<unknown> {
  const text = String(note || "").trim();
  if (!text) {
    throw new Error("Internal note is required");
  }

  return updateOrderLifecycle(orderId, {
    internalNote: text,
    note: "Internal order note added",
  });
}

export async function updateOrderLifecycleState(
  orderId: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  return updateOrderLifecycle(orderId, payload || {});
}

export function getOrderLifecycleOptions(
  current: {
    status?: string;
    paymentStatus?: string;
    fulfillmentStatus?: string;
  } = {},
): {
  status: string[];
  paymentStatus: string[];
  fulfillmentStatus: string[];
} {
  const status = String(current.status || "").toLowerCase();
  const paymentStatus = String(current.paymentStatus || "").toLowerCase();
  const fulfillmentStatus = String(
    current.fulfillmentStatus || "",
  ).toLowerCase();

  const statusOptions = [status, ...(ORDER_STATUS_FLOW[status] || [])].filter(
    Boolean,
  );
  const paymentOptions = [
    paymentStatus,
    ...(PAYMENT_STATUS_FLOW[paymentStatus] || []),
  ].filter(Boolean);
  const fulfillmentOptions = [
    fulfillmentStatus,
    ...(FULFILLMENT_STATUS_FLOW[fulfillmentStatus] || []),
  ].filter(Boolean);

  return {
    status: Array.from(new Set(statusOptions)),
    paymentStatus: Array.from(new Set(paymentOptions)),
    fulfillmentStatus: Array.from(new Set(fulfillmentOptions)),
  };
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail> {
  const { store } = await getStoreContext();
  const hasOrderCurrencySnapshots = await tableExists(
    "order_currency_snapshots",
  );
  const hasOrderSubscriptionContext = await tableExists(
    "order_subscription_context",
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderResponse: any = await supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, fulfillment_status, subtotal_amount, discount_amount, tax_amount, shipping_amount, total_amount, currency_code, note, shipping_address, billing_address, created_at, updated_at, customers(first_name, last_name, email, phone)",
    )
    .eq("store_id", store.id)
    .eq("id", orderId)
    .maybeSingle();

  if (
    orderResponse.error &&
    isMissingColumnError(orderResponse.error, "fulfillment_status")
  ) {
    const fallbackOrderResponse = await supabase
      .from("orders")
      .select(
        "id, order_number, status, payment_status, subtotal_amount, discount_amount, tax_amount, shipping_amount, total_amount, currency_code, note, shipping_address, billing_address, created_at, updated_at, customers(first_name, last_name, email, phone)",
      )
      .eq("store_id", store.id)
      .eq("id", orderId)
      .maybeSingle();

    orderResponse = {
      data: fallbackOrderResponse.data
        ? {
            ...fallbackOrderResponse.data,
            fulfillment_status:
              fallbackOrderResponse.data.status === "receive"
                ? "delivered"
                : fallbackOrderResponse.data.status === "ongoing_shipped"
                  ? "shipped"
                  : fallbackOrderResponse.data.status === "cancelled"
                    ? "cancelled"
                    : "unfulfilled",
          }
        : fallbackOrderResponse.data,
      error: fallbackOrderResponse.error,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [
    itemsResponse,
    timelineResponse,
    transactionsResponse,
    shipmentsResponse,
    invoiceResponse,
    returnsResponse,
    refundsResponse,
    currencySnapshotResponse,
    subscriptionContextResponse,
  ]: any[] = await Promise.all([
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
      .eq("store_id", store.id)
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("shipments")
      .select(
        "id, tracking_number, carrier, status, shipping_cost, shipped_at, delivered_at, shipping_methods(name)",
      )
      .eq("store_id", store.id)
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, subtotal, taxable_amount, tax_rate, tax_behavior, tax_amount, discount_amount, total, status, metadata_json, issued_at",
      )
      .eq("store_id", store.id)
      .eq("order_id", orderId)
      .maybeSingle(),
    supabase
      .from("returns")
      .select(
        "id, rma_number, reason, reason_code, resolution_note, status, requested_at, approved_at, rejected_at, received_at, refunded_at",
      )
      .eq("store_id", store.id)
      .eq("order_id", orderId)
      .order("requested_at", { ascending: true }),
    supabase
      .from("refunds")
      .select(
        "id, amount, status, refund_type, reason_code, note, processed_at, created_at, returns!inner(order_id)",
      )
      .eq("store_id", store.id)
      .eq("returns.order_id", orderId)
      .order("created_at", { ascending: true }),
    hasOrderCurrencySnapshots
      ? supabase
          .from("order_currency_snapshots")
          .select(
            "display_currency, base_currency, fx_rate, fx_source, fx_confidence, fx_as_of, used_fallback, subtotal_display, discount_display, shipping_display, tax_display, total_display",
          )
          .eq("store_id", store.id)
          .eq("order_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    hasOrderSubscriptionContext
      ? supabase
          .from("order_subscription_context")
          .select(
            "subscription_id, is_renewal, cycle_index, context_json, customer_subscriptions(status, next_billing_at, plan_id, subscription_plans(name))",
          )
          .eq("store_id", store.id)
          .eq("order_id", orderId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (orderResponse.error) {
    throw normalizeError(orderResponse.error);
  }
  if (itemsResponse.error) {
    throw normalizeError(itemsResponse.error);
  }
  if (timelineResponse.error) {
    throw normalizeError(timelineResponse.error);
  }
  if (transactionsResponse.error) {
    if (isMissingColumnError(transactionsResponse.error, "captured_amount")) {
      const fallbackTransactions = await supabase
        .from("transactions")
        .select(
          "id, amount, currency_code, status, gateway_transaction_id, created_at, payment_methods(display_name)",
        )
        .eq("store_id", store.id)
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (fallbackTransactions.error) {
        throw normalizeError(fallbackTransactions.error);
      }

      transactionsResponse.data = (fallbackTransactions.data || []).map(
        (item) => ({
          ...item,
          captured_amount:
            item.status === "captured"
              ? Number(item.amount || 0)
              : item.status === "partially_captured"
                ? Number(item.amount || 0) / 2
                : 0,
          provider_status: null,
          failure_code: null,
        }),
      );
    } else {
      throw normalizeError(transactionsResponse.error);
    }
  }
  if (shipmentsResponse.error) {
    throw normalizeError(shipmentsResponse.error);
  }
  if (invoiceResponse.error) {
    if (isMissingColumnError(invoiceResponse.error, "taxable_amount")) {
      const fallbackInvoiceResponse = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, subtotal, tax_amount, discount_amount, total, issued_at",
        )
        .eq("store_id", store.id)
        .eq("order_id", orderId)
        .maybeSingle();

      if (fallbackInvoiceResponse.error) {
        throw normalizeError(fallbackInvoiceResponse.error);
      }

      invoiceResponse.data = fallbackInvoiceResponse.data
        ? {
            ...fallbackInvoiceResponse.data,
            taxable_amount: fallbackInvoiceResponse.data.subtotal,
            tax_rate: 0,
            tax_behavior: "exclusive",
            status: "issued",
            metadata_json: {},
          }
        : fallbackInvoiceResponse.data;
    } else {
      throw normalizeError(invoiceResponse.error);
    }
  }
  if (returnsResponse.error) {
    if (isMissingColumnError(returnsResponse.error, "reason_code")) {
      const fallbackReturns = await supabase
        .from("returns")
        .select("id, rma_number, reason, status, requested_at")
        .eq("store_id", store.id)
        .eq("order_id", orderId)
        .order("requested_at", { ascending: true });

      if (fallbackReturns.error) {
        throw normalizeError(fallbackReturns.error);
      }

      returnsResponse.data = (fallbackReturns.data || []).map((item) => ({
        ...item,
        reason_code: "other",
        resolution_note: null,
        approved_at: null,
        rejected_at: null,
        received_at: null,
        refunded_at: null,
      }));
    } else {
      throw normalizeError(returnsResponse.error);
    }
  }
  if (refundsResponse.error) {
    if (isMissingColumnError(refundsResponse.error, "refund_type")) {
      const fallbackRefunds = await supabase
        .from("refunds")
        .select("id, amount, status, created_at, returns!inner(order_id)")
        .eq("store_id", store.id)
        .eq("returns.order_id", orderId)
        .order("created_at", { ascending: true });

      if (fallbackRefunds.error) {
        throw normalizeError(fallbackRefunds.error);
      }

      refundsResponse.data = (fallbackRefunds.data || []).map((item) => ({
        ...item,
        refund_type: "partial",
        reason_code: "other",
        note: null,
        processed_at: item.created_at,
      }));
    } else {
      throw normalizeError(refundsResponse.error);
    }
  }
  if (currencySnapshotResponse.error) {
    throw normalizeError(currencySnapshotResponse.error);
  }
  if (subscriptionContextResponse.error) {
    throw normalizeError(subscriptionContextResponse.error);
  }

  if (!orderResponse.data) {
    throw new Error("Order not found");
  }

  const currencySnapshot = currencySnapshotResponse.data || null;
  const subscriptionContext = subscriptionContextResponse.data || null;

  const customer = Array.isArray(orderResponse.data.customers)
    ? orderResponse.data.customers[0]
    : orderResponse.data.customers;

  const transactionIds = (transactionsResponse.data || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any) => item.id,
  );
  const transactionEventMap =
    await loadTransactionEventsByTransactionIds(transactionIds);

  return {
    id: orderResponse.data.id,
    orderNumber: orderResponse.data.order_number,
    order_number: orderResponse.data.order_number,
    status: orderResponse.data.status,
    lifecycleState: null,
    paymentStatus: orderResponse.data.payment_status,
    fulfillmentStatus: orderResponse.data.fulfillment_status || "unfulfilled",
    subtotalAmount: Number(orderResponse.data.subtotal_amount || 0),
    discountAmount: Number(orderResponse.data.discount_amount || 0),
    taxAmount: Number(orderResponse.data.tax_amount || 0),
    shippingAmount: Number(orderResponse.data.shipping_amount || 0),
    totalAmount: Number(orderResponse.data.total_amount || 0),
    currencyCode: orderResponse.data.currency_code,
    displayCurrencyCode:
      currencySnapshot?.display_currency || orderResponse.data.currency_code,
    displaySubtotalAmount: Number(
      currencySnapshot?.subtotal_display ||
        orderResponse.data.subtotal_amount ||
        0,
    ),
    displayDiscountAmount: Number(
      currencySnapshot?.discount_display ||
        orderResponse.data.discount_amount ||
        0,
    ),
    displayShippingAmount: Number(
      currencySnapshot?.shipping_display ||
        orderResponse.data.shipping_amount ||
        0,
    ),
    displayTaxAmount: Number(
      currencySnapshot?.tax_display || orderResponse.data.tax_amount || 0,
    ),
    displayTotalAmount: Number(
      currencySnapshot?.total_display || orderResponse.data.total_amount || 0,
    ),
    currencySnapshot: currencySnapshot
      ? {
          baseCurrency: currencySnapshot.base_currency,
          displayCurrency: currencySnapshot.display_currency,
          fxRate: Number(currencySnapshot.fx_rate || 1),
          fxSource: currencySnapshot.fx_source || "manual",
          fxConfidence: Number(currencySnapshot.fx_confidence || 0),
          fxAsOf: currencySnapshot.fx_as_of || null,
          usedFallback: Boolean(currencySnapshot.used_fallback),
        }
      : null,
    subscriptionContext: subscriptionContext
      ? {
          subscriptionId: subscriptionContext.subscription_id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status:
            (subscriptionContext.customer_subscriptions as any)?.status ||
            "active",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nextBillingAt:
            (subscriptionContext.customer_subscriptions as any)
              ?.next_billing_at || null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          planId:
            (subscriptionContext.customer_subscriptions as any)?.plan_id ||
            null,
          planName:
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (subscriptionContext.customer_subscriptions as any)
              ?.subscription_plans?.name ||
            subscriptionContext.context_json?.planName ||
            "Subscription",
          isRenewal: Boolean(subscriptionContext.is_renewal),
          cycleIndex:
            subscriptionContext.cycle_index ??
            subscriptionContext.context_json?.cycleIndex ??
            null,
          context: subscriptionContext.context_json || {},
        }
      : null,
    note: orderResponse.data.note || "",
    shippingAddress: orderResponse.data.shipping_address || {},
    billingAddress: orderResponse.data.billing_address || {},
    customerName:
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      orderResponse.data.shipping_address?.fullName ||
      "Guest Customer",
    customerEmail:
      customer?.email || orderResponse.data.shipping_address?.email || null,
    customerPhone:
      customer?.phone || orderResponse.data.shipping_address?.phone || null,
    createdAt: orderResponse.data.created_at,
    created_at: orderResponse.data.created_at,
    updatedAt: orderResponse.data.updated_at,
    updated_at: orderResponse.data.updated_at,
    // OrderSummary alias fields
    total: Number(orderResponse.data.total_amount || 0),
    total_price: Number(orderResponse.data.total_amount || 0),
    displayTotal: Number(
      currencySnapshot?.total_display || orderResponse.data.total_amount || 0,
    ),
    customer_name:
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      null,
    subscriptionId: null,
    subscriptionStatus: null,
    isSubscriptionRenewal: false,
    subscriptionLabel: null,
    internalNotes: [],
    items: (itemsResponse.data || []).map((item: any) => ({
      id: item.id,
      productTitle: item.product_title,
      productName: item.product_title,
      variantTitle: item.variant_title,
      sku: item.sku,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unit_price || 0),
      lineTotal: Number(item.line_total || 0),
    })),
    timeline: (timelineResponse.data || []).map((item: any) => ({
      id: item.id,
      status: item.status,
      note: item.note || "",
      actorType: item.actor_type,
      createdAt: item.created_at,
    })),
    transactions: (transactionsResponse.data || []).map((item: any) => ({
      id: item.id,
      amount: Number(item.amount || 0),
      capturedAmount: Number(item.captured_amount || 0),
      currencyCode: item.currency_code,
      status: item.status,
      providerStatus: item.provider_status || "",
      failureCode: item.failure_code || "",
      gatewayTransactionId: item.gateway_transaction_id || "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      paymentMethodName: (item.payment_methods as any)?.display_name || "-",
      attempts: transactionEventMap.get(item.id) || [],
      attemptCount: (transactionEventMap.get(item.id) || []).length,
      createdAt: item.created_at,
    })),
    shipments: (shipmentsResponse.data || []).map((item: any) => ({
      id: item.id,
      trackingNumber: item.tracking_number || "",
      carrier: item.carrier || "",
      status: item.status,
      shippingCost: Number(item.shipping_cost || 0),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      shippingMethodName: (item.shipping_methods as any)?.name || "-",
      shippedAt: item.shipped_at,
      deliveredAt: item.delivered_at,
    })),
    invoice: invoiceResponse.data
      ? {
          id: invoiceResponse.data.id,
          invoiceNumber: invoiceResponse.data.invoice_number,
          subtotal: Number(invoiceResponse.data.subtotal || 0),
          taxableAmount: Number(
            invoiceResponse.data.taxable_amount ||
              invoiceResponse.data.subtotal ||
              0,
          ),
          taxRate: Number(invoiceResponse.data.tax_rate || 0),
          taxBehavior: normalizeTaxBehavior(invoiceResponse.data.tax_behavior),
          taxAmount: Number(invoiceResponse.data.tax_amount || 0),
          discountAmount: Number(invoiceResponse.data.discount_amount || 0),
          total: Number(invoiceResponse.data.total || 0),
          status: invoiceResponse.data.status || "issued",
          metadata: invoiceResponse.data.metadata_json || {},
          issuedAt: invoiceResponse.data.issued_at,
        }
      : null,
    returns: (returnsResponse.data || []).map((item: any) => ({
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
    })),
    refunds: (refundsResponse.data || []).map((item: any) => ({
      id: item.id,
      amount: Number(item.amount || 0),
      status: item.status,
      refundType: item.refund_type || "partial",
      reasonCode: item.reason_code || "other",
      note: item.note || "",
      processedAt: item.processed_at || item.created_at,
      createdAt: item.created_at,
    })),
  };
}

export async function getOrders(
  status = "semua_orders",
): Promise<OrderSummary[]> {
  const { store } = await getStoreContext();

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, fulfillment_status, total_amount, currency_code, created_at, updated_at, customers(first_name, last_name)",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  if (status && status !== "semua_orders") {
    query = query.eq("status", status);
  }

  let { data, error } = await query;

  if (error && isMissingColumnError(error, "fulfillment_status")) {
    let fallbackQuery = supabase
      .from("orders")
      .select(
        "id, order_number, status, payment_status, total_amount, currency_code, created_at, updated_at, customers(first_name, last_name)",
      )
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (status && status !== "semua_orders") {
      fallbackQuery = fallbackQuery.eq("status", status);
    }

    const fallback = await fallbackQuery;
    data = (fallback.data || []).map((row) => ({
      ...row,
      fulfillment_status:
        row.status === "receive"
          ? "delivered"
          : row.status === "ongoing_shipped"
            ? "shipped"
            : row.status === "cancelled"
              ? "cancelled"
              : "unfulfilled",
    }));
    error = fallback.error;
  }

  if (error) {
    throw normalizeError(error);
  }

  let snapshotMap = new Map();
  let subscriptionMap = new Map();
  if (await tableExists("order_currency_snapshots")) {
    const orderIds = (data || []).map((row) => row.id);
    if (orderIds.length) {
      const snapshotResponse = await supabase
        .from("order_currency_snapshots")
        .select("order_id, display_currency, total_display")
        .eq("store_id", store.id)
        .in("order_id", orderIds);

      if (snapshotResponse.error) {
        throw normalizeError(snapshotResponse.error);
      }

      snapshotMap = (snapshotResponse.data || []).reduce((acc, row) => {
        acc.set(row.order_id, row);
        return acc;
      }, new Map());
    }
  }

  if (await tableExists("order_subscription_context")) {
    const orderIds = (data || []).map((row) => row.id);
    if (orderIds.length) {
      const subscriptionResponse = await supabase
        .from("order_subscription_context")
        .select(
          "order_id, subscription_id, is_renewal, context_json, customer_subscriptions(status)",
        )
        .eq("store_id", store.id)
        .in("order_id", orderIds);

      if (subscriptionResponse.error) {
        throw normalizeError(subscriptionResponse.error);
      }

      subscriptionMap = (subscriptionResponse.data || []).reduce((acc, row) => {
        acc.set(row.order_id, row);
        return acc;
      }, new Map());
    }
  }

  return (data || []).map((order) => {
    const customer = Array.isArray(order.customers)
      ? order.customers[0]
      : order.customers;
    const customerName =
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      "Guest Customer";

    return {
      id: order.id,
      order_number: order.order_number,
      orderNumber: order.order_number,
      customer_name: customerName,
      customerName,
      customerEmail: null,
      lifecycleState: null,
      paymentStatus: order.payment_status,
      fulfillmentStatus: order.fulfillment_status || "unfulfilled",
      total_price: Number(order.total_amount || 0),
      total: Number(order.total_amount || 0),
      totalAmount: Number(order.total_amount || 0),
      displayCurrencyCode:
        snapshotMap.get(order.id)?.display_currency || order.currency_code,
      currencyCode: order.currency_code || null,
      displayTotal: Number(
        snapshotMap.get(order.id)?.total_display || order.total_amount || 0,
      ),
      subscriptionId: subscriptionMap.get(order.id)?.subscription_id || null,
      subscriptionStatus:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (subscriptionMap.get(order.id) as any)?.customer_subscriptions
          ?.status || null,
      isSubscriptionRenewal: Boolean(subscriptionMap.get(order.id)?.is_renewal),
      subscriptionLabel:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (subscriptionMap.get(order.id) as any)?.context_json?.planName || null,
      status: order.status,
      created_at: order.created_at,
      createdAt: order.created_at,
      updated_at: order.updated_at,
      updatedAt: order.updated_at || null,
    };
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<unknown> {
  return updateOrderLifecycle(orderId, { status });
}
