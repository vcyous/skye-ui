import { invalidateAnalyticsReportCache } from "../analyticsService";
import { ensureActiveCart, getCart } from "../cartService";
import {
  revalidateCheckout,
  saveCheckoutRecoveryState,
} from "../checkoutService";
import { getCurrencyConversionQuote } from "../currencyService";
import {
  calculateDiscountAmount,
  listDiscountRows,
  normalizeCodeList,
  resolveApplicableDiscounts,
} from "../discountService";
import { sendEmail } from "../emailService";
import {
  recordStockMovement,
  syncInventoryLevelSnapshot,
} from "../inventoryService";
import {
  createTransactionEvent,
  getPaymentMethods,
} from "../paymentService";
import { getShippingMethods } from "../shippingService";
import {
  createInvoiceNumber,
  createOrderNumber,
  getStoreContext,
} from "../storeService";
import { supabase } from "../supabaseClient";
import {
  getTaxRules,
  resolveMatchingTaxRule,
  resolveTaxPricing,
} from "../taxService";
import { tableExists } from "../utils/dbUtils";
import {
  isMissingColumnError,
  isMissingTableError,
  normalizeError,
} from "../utils/errorUtils";

async function failRecoveryAndThrow(payload, lastError, note, code) {
  await saveCheckoutRecoveryState({
    state: "failed",
    status: "failed",
    formData: payload.formData || payload,
    lastError,
    note,
  });
  const err = new Error(lastError);
  if (code) err.code = code;
  throw err;
}

async function findOrCreateCustomer(payload, storeId) {
  if (!payload.customerEmail && !payload.customerName) return null;

  const [firstName, ...rest] = String(
    payload.customerName || "Guest Customer",
  ).split(" ");
  const lastName = rest.join(" ") || null;

  const { data: existing, error: lookupError } = await supabase
    .from("customers")
    .select("id")
    .eq("store_id", storeId)
    .eq("email", payload.customerEmail || "")
    .maybeSingle();
  if (lookupError) throw normalizeError(lookupError);
  if (existing?.id) return existing.id;

  const { data: inserted, error: insertError } = await supabase
    .from("customers")
    .insert({
      store_id: storeId,
      email: payload.customerEmail || null,
      first_name: firstName || "Guest",
      last_name: lastName,
      phone: payload.customerPhone || null,
    })
    .select("id")
    .single();
  if (insertError) throw normalizeError(insertError);
  return inserted.id;
}

async function resolveDiscounts(payload, storeId, cart) {
  if (!payload.discountCode) return { applied: [], appliedPrimary: null };
  const discounts = await listDiscountRows(storeId, "active");
  const resolution = resolveApplicableDiscounts(discounts, {
    subtotal: Number(cart.subtotal || 0),
    cartItemCount: Array.isArray(cart.items) ? cart.items.length : 0,
    codes: normalizeCodeList(payload.discountCode),
  });
  if (!resolution.applied.length) {
    throw new Error("Discount code not found, inactive, or ineligible");
  }
  return {
    applied: resolution.applied,
    appliedPrimary: resolution.applied[0],
  };
}

function computeDiscountAmount(subtotalAmount, cart, applied, primary) {
  if (applied.length) {
    const itemCount = Array.isArray(cart.items) ? cart.items.length : 0;
    return Number(
      applied
        .reduce(
          (sum, discount) =>
            sum +
            calculateDiscountAmount(subtotalAmount, {
              ...discount,
              applicable_item_count: itemCount,
              average_item_amount:
                itemCount ? Number(subtotalAmount) / Number(itemCount) : 0,
            }),
          0,
        )
        .toFixed(2),
    );
  }
  return calculateDiscountAmount(subtotalAmount, primary);
}

async function resolvePricing(payload, cart) {
  const subtotalAmount = Number(cart.subtotal || 0);

  const { applied, appliedPrimary } = await resolveDiscounts(
    payload,
    (await getStoreContext()).store.id,
    cart,
  );
  const discountAmount = computeDiscountAmount(
    subtotalAmount,
    cart,
    applied,
    appliedPrimary,
  );

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

  return {
    appliedDiscounts: applied,
    selectedPaymentMethod,
    subtotalAmount,
    discountAmount,
    shippingAmount,
    taxAmount: pricing.taxAmount,
    totalAmount: pricing.totalAmount,
    taxableAmount: pricing.taxableAmount,
    taxRate: pricing.taxRate,
    taxBehavior: pricing.taxBehavior,
    taxRuleId: pricing.taxRuleId,
  };
}

function ensureSufficientStock(cart) {
  for (const item of cart.items) {
    if (item.quantity > item.stock) {
      throw new Error(`Insufficient stock for ${item.productName}`);
    }
  }
}

function shippingAddressFrom(payload) {
  return {
    fullName: payload.customerName || "Guest Customer",
    email: payload.customerEmail || null,
    phone: payload.customerPhone || null,
    addressLine1: payload.addressLine1 || "",
    city: payload.city || "",
    postalCode: payload.postalCode || "",
    country: payload.country || "",
  };
}

async function insertOrderRow({
  storeId,
  customerId,
  payload,
  pricing,
  shippingAddress,
  storeCurrency,
}) {
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      store_id: storeId,
      customer_id: customerId,
      order_number: createOrderNumber(),
      status: "not_paid",
      payment_status: "pending",
      subtotal_amount: pricing.subtotalAmount,
      discount_amount: pricing.discountAmount,
      tax_amount: pricing.taxAmount,
      shipping_amount: pricing.shippingAmount,
      total_amount: pricing.totalAmount,
      currency_code: storeCurrency,
      note: payload.note || null,
      shipping_address: shippingAddress,
      billing_address: shippingAddress,
    })
    .select("id, order_number")
    .single();
  if (error) throw normalizeError(error);
  return order;
}

async function insertOrderItems(orderId, cart) {
  const { error } = await supabase.from("order_items").insert(
    cart.items.map((item) => ({
      order_id: orderId,
      product_variant_id: item.variantId,
      product_title: item.productName,
      variant_title: item.variantTitle,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: Number((item.quantity * item.unitPrice).toFixed(2)),
    })),
  );
  if (error) throw normalizeError(error);
}

async function createInitialTransaction({
  storeId,
  orderId,
  paymentMethod,
  totalAmount,
  storeCurrency,
}) {
  if (!paymentMethod) return;
  const status = paymentMethod.provider === "manual" ? "authorized" : "pending";

  const { data: transaction, error } = await supabase
    .from("transactions")
    .insert({
      store_id: storeId,
      order_id: orderId,
      payment_method_id: paymentMethod.id,
      amount: totalAmount,
      currency_code: storeCurrency,
      status,
      gateway_transaction_id: `txn-${Date.now().toString(36)}`,
      gateway_response: { provider: paymentMethod.provider },
    })
    .select("id, gateway_transaction_id")
    .single();
  if (error) throw normalizeError(error);

  if (transaction?.id) {
    await createTransactionEvent({
      transactionId: transaction.id,
      orderId,
      eventType: status === "authorized" ? "authorization" : "attempt",
      status,
      providerStatus: status,
      amount: totalAmount,
      referenceId: transaction.gateway_transaction_id,
      note: `Checkout initiated payment via ${paymentMethod.provider}`,
      metadata: { provider: paymentMethod.provider },
    });
  }
}

async function insertInvoice({ storeId, orderId, payload, pricing }) {
  const invoicePayload = {
    store_id: storeId,
    order_id: orderId,
    invoice_number: createInvoiceNumber(),
    subtotal: pricing.subtotalAmount,
    taxable_amount: pricing.taxableAmount,
    tax_rate: pricing.taxRate,
    tax_behavior: pricing.taxBehavior,
    tax_rule_id: pricing.taxRuleId,
    tax_amount: pricing.taxAmount,
    discount_amount: pricing.discountAmount,
    total: pricing.totalAmount,
    metadata_json: {
      source: "checkout",
      country: payload.country || null,
      shippingMethodId: payload.shippingMethodId || null,
      paymentMethodId: payload.paymentMethodId || null,
      taxRuleId: pricing.taxRuleId,
    },
  };

  let { error } = await supabase.from("invoices").insert(invoicePayload);
  if (error && isMissingColumnError(error, "taxable_amount")) {
    const fallback = await supabase.from("invoices").insert({
      store_id: storeId,
      order_id: orderId,
      invoice_number: createInvoiceNumber(),
      subtotal: pricing.subtotalAmount,
      tax_amount: pricing.taxAmount,
      discount_amount: pricing.discountAmount,
      total: pricing.totalAmount,
    });
    error = fallback.error;
  }
  if (error) throw normalizeError(error);
}

async function insertCurrencySnapshot({ storeId, orderId, currencyQuote }) {
  if (!(await tableExists("order_currency_snapshots"))) return;
  const { error } = await supabase.from("order_currency_snapshots").insert({
    store_id: storeId,
    order_id: orderId,
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
  if (error && !isMissingTableError(error, "order_currency_snapshots")) {
    throw normalizeError(error);
  }
}

async function insertSubscriptionContext({ storeId, orderId, payload }) {
  if (!payload.subscriptionId) return;
  if (!(await tableExists("order_subscription_context"))) return;
  const { error } = await supabase.from("order_subscription_context").insert({
    store_id: storeId,
    order_id: orderId,
    subscription_id: payload.subscriptionId,
    is_renewal: Boolean(payload.isSubscriptionRenewal),
    cycle_index: payload.subscriptionCycleIndex || null,
    context_json: payload.subscriptionContext || {},
  });
  if (error && !isMissingTableError(error, "order_subscription_context")) {
    throw normalizeError(error);
  }
}

async function insertCreationTimeline({ orderId, authUserId }) {
  const { error } = await supabase.from("order_timeline").insert({
    order_id: orderId,
    status: "not_paid",
    actor_type: "user",
    actor_id: authUserId,
    note: "Order created from checkout",
  });
  if (error) throw normalizeError(error);
}

async function deductStockForCart({ storeId, cart, order }) {
  for (const cartItem of cart.items) {
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

    if (stockError) throw normalizeError(stockError);
    if (!(stockRows || []).length) {
      throw new Error(
        `Stock for SKU ${cartItem.sku || cartItem.variantId} changed during checkout. Please retry.`,
      );
    }

    await recordStockMovement({
      storeId,
      variantId: cartItem.variantId,
      quantityBefore,
      quantityAfter,
      quantityDelta: -Number(cartItem.quantity || 0),
      reasonCode: "sale",
      note: `Order ${order.order_number}`,
      metadata: { orderId: order.id, orderNumber: order.order_number },
    });

    await syncInventoryLevelSnapshot({
      storeId,
      variantId: cartItem.variantId,
      sku: cartItem.sku,
      variantTitle: cartItem.variantName || cartItem.variantTitle,
      quantityAfter,
      reorderLevel: Number(cartItem.reorderLevel || 0),
    });
  }
}

async function flipCartToConverted(cart, storeId) {
  const { error } = await supabase
    .from("carts")
    .update({ status: "converted", updated_at: new Date().toISOString() })
    .eq("id", cart.id)
    .eq("store_id", storeId);
  if (error) throw normalizeError(error);
}

async function incrementDiscountUsage(applied, storeId) {
  for (const discount of applied) {
    const { error } = await supabase
      .from("discounts")
      .update({
        uses_count: Number(discount.uses_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", discount.id)
      .eq("store_id", storeId);
    if (error) throw normalizeError(error);
  }
}

function fireConfirmationEmail({ payload, order, totalAmount }) {
  if (!payload.customerEmail) return;
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

export async function createOrderFromCart(payload) {
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
    const err = new Error(
      `Checkout revalidation failed: ${precheck.issues.map((item) => item.message).join("; ")}`,
    );
    err.code = "CHECKOUT_REVALIDATION_FAILED";
    throw err;
  }

  const cart = await getCart();
  if (!cart.items.length) {
    await failRecoveryAndThrow(
      payload,
      "Cart is empty",
      "Cart empty during submit",
    );
  }

  const customerId = await findOrCreateCustomer(payload, store.id);
  const pricing = await resolvePricing(payload, cart);

  const storeCurrency = store.currency || store.currency_code || "USD";
  const currencyQuote = await getCurrencyConversionQuote({
    baseCurrency: storeCurrency,
    displayCurrency: payload.displayCurrency || storeCurrency,
    subtotal: pricing.subtotalAmount,
    discountAmount: pricing.discountAmount,
    shippingAmount: pricing.shippingAmount,
    taxableAmount: pricing.taxableAmount,
    taxAmount: pricing.taxAmount,
    totalAmount: pricing.totalAmount,
  });

  ensureSufficientStock(cart);
  const shippingAddress = shippingAddressFrom(payload);

  const order = await insertOrderRow({
    storeId: store.id,
    customerId,
    payload,
    pricing,
    shippingAddress,
    storeCurrency,
  });

  await insertOrderItems(order.id, cart);
  await createInitialTransaction({
    storeId: store.id,
    orderId: order.id,
    paymentMethod: pricing.selectedPaymentMethod,
    totalAmount: pricing.totalAmount,
    storeCurrency,
  });
  await insertInvoice({ storeId: store.id, orderId: order.id, payload, pricing });
  await insertCurrencySnapshot({ storeId: store.id, orderId: order.id, currencyQuote });
  await insertSubscriptionContext({ storeId: store.id, orderId: order.id, payload });
  await insertCreationTimeline({ orderId: order.id, authUserId: authUser.id });

  await deductStockForCart({ storeId: store.id, cart, order });
  await flipCartToConverted(cart, store.id);
  await incrementDiscountUsage(pricing.appliedDiscounts, store.id);

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

  fireConfirmationEmail({
    payload,
    order,
    totalAmount: pricing.totalAmount,
  });

  return {
    id: order.id,
    orderNumber: order.order_number,
    currencyQuote,
  };
}
