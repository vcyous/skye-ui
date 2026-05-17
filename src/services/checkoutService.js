/**
 * checkoutService — Checkout session management, validation, and recovery state
 *
 * Domain: Checkout
 * Feature: 07
 * Depends on: supabaseClient, utils/errorUtils, storeService, cartService, discountService, taxService, shippingService
 */

import { supabase } from "./supabaseClient.js";
import { normalizeError } from "./utils/errorUtils.js";
import { tableExists } from "./utils/dbUtils.js";
import { getStoreContext, mapStoreSummary } from "./storeService.js";
import { ensureActiveCart, getCart } from "./cartService.js";
import { getDiscounts, listDiscountRows, resolveApplicableDiscounts, calculateDiscountAmount, normalizeCodeList } from "./discountService.js";
import { getPaymentMethods } from "./paymentService.js";
import { getShippingMethods } from "./shippingService.js";
import { getTaxRules, resolveMatchingTaxRule, resolveTaxPricing } from "./taxService.js";
import { getCurrencyConversionQuote, getCurrencySettings } from "./currencyService.js";

const CHECKOUT_STEP_ORDER = [
  "cart_review",
  "customer_info",
  "shipping",
  "payment",
  "review",
  "confirmed",
  "failed",
];

function normalizeCheckoutStep(value) {
  const step = String(value || "cart_review")
    .trim()
    .toLowerCase();
  return CHECKOUT_STEP_ORDER.includes(step) ? step : "cart_review";
}

function isValidCheckoutTransition(currentStep, nextStep) {
  const current = normalizeCheckoutStep(currentStep);
  const next = normalizeCheckoutStep(nextStep);

  if (next === current) {
    return true;
  }

  if (next === "failed") {
    return true;
  }

  if (current === "failed" && next === "cart_review") {
    return true;
  }

  if (current === "confirmed") {
    return false;
  }

  const currentIndex = CHECKOUT_STEP_ORDER.indexOf(current);
  const nextIndex = CHECKOUT_STEP_ORDER.indexOf(next);
  return nextIndex === currentIndex + 1;
}

async function resolveCheckoutSessionTable() {
  if (await tableExists("checkout_sessions")) {
    return "checkout_sessions";
  }

  return null;
}

async function saveCheckoutSessionEvent(payload) {
  if (!(await tableExists("checkout_state_events"))) {
    return;
  }

  const { error } = await supabase.from("checkout_state_events").insert({
    session_id: payload.sessionId,
    from_state: payload.fromState,
    to_state: payload.toState,
    status: payload.status || "ok",
    note: payload.note || null,
    metadata: payload.metadata || {},
  });

  if (error) {
    throw normalizeError(error);
  }
}

export async function revalidateCheckout(payload = {}) {
  const { store } = await getStoreContext();
  const cart = await getCart();

  if (!cart.items.length) {
    return {
      ok: false,
      issues: [{ code: "CART_EMPTY", message: "Cart is empty" }],
      cart,
      pricing: {
        subtotal: 0,
        discountAmount: 0,
        shippingAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
      },
      appliedDiscounts: [],
    };
  }

  const issues = [];

  const variantIds = cart.items.map((item) => item.variantId).filter(Boolean);
  const { data: liveVariants, error: liveVariantError } = await supabase
    .from("product_variants")
    .select(
      "id, price, quantity_in_stock, products!inner(id, title, store_id, status)",
    )
    .in("id", variantIds)
    .eq("products.store_id", store.id);

  if (liveVariantError) {
    throw normalizeError(liveVariantError);
  }

  const liveById = new Map((liveVariants || []).map((row) => [row.id, row]));

  for (const cartItem of cart.items) {
    const live = liveById.get(cartItem.variantId);
    if (!live) {
      issues.push({
        code: "VARIANT_MISSING",
        message: `${cartItem.productName} is no longer available`,
      });
      continue;
    }

    if (live.products?.status !== "active") {
      issues.push({
        code: "PRODUCT_INACTIVE",
        message: `${cartItem.productName} is not active`,
      });
    }

    if (Number(cartItem.quantity || 0) > Number(live.quantity_in_stock || 0)) {
      issues.push({
        code: "INSUFFICIENT_STOCK",
        message: `Insufficient stock for ${cartItem.productName}`,
      });
    }

    if (Number(cartItem.unitPrice || 0) !== Number(live.price || 0)) {
      issues.push({
        code: "PRICE_CHANGED",
        message: `Price changed for ${cartItem.productName}`,
      });
    }
  }

  const shippingMethods = (await getShippingMethods()).filter(
    (item) => item.isActive,
  );
  if (payload.shippingMethodId) {
    const selectedShipping = shippingMethods.find(
      (item) => item.id === payload.shippingMethodId,
    );
    if (!selectedShipping) {
      issues.push({
        code: "SHIPPING_INVALID",
        message: "Selected shipping method is unavailable",
      });
    }
  }

  const paymentMethods = (await getPaymentMethods()).filter(
    (item) => item.isActive,
  );
  if (payload.paymentMethodId) {
    const selectedPayment = paymentMethods.find(
      (item) => item.id === payload.paymentMethodId,
    );
    if (!selectedPayment) {
      issues.push({
        code: "PAYMENT_INVALID",
        message: "Selected payment method is unavailable",
      });
    }
  }

  const subtotalAmount = Number(cart.subtotal || 0);
  let appliedDiscounts = [];
  if (payload.discountCode) {
    const activeDiscounts = await listDiscountRows(store.id, "active");
    const discountResolution = resolveApplicableDiscounts(activeDiscounts, {
      subtotal: subtotalAmount,
      cartItemCount: cart.items.length,
      codes: payload.discountCode,
    });

    if (!discountResolution.applied.length) {
      issues.push({
        code: "DISCOUNT_INVALID",
        message: "Discount is inactive, expired, or not eligible",
      });
    } else {
      appliedDiscounts = discountResolution.applied;
      for (const rejected of discountResolution.rejected) {
        issues.push({
          code: "DISCOUNT_REJECTED",
          message: `${rejected.code}: ${rejected.reason}`,
        });
      }
    }
  }

  const discountAmount = Number(
    appliedDiscounts
      .reduce(
        (sum, discount) =>
          sum +
          calculateDiscountAmount(subtotalAmount, {
            ...discount,
            applicable_item_count: cart.items.length,
            average_item_amount:
              cart.items.length > 0
                ? Number(subtotalAmount) / Number(cart.items.length)
                : 0,
          }),
        0,
      )
      .toFixed(2),
  );

  const selectedShippingMethod = shippingMethods.find(
    (item) => item.id === payload.shippingMethodId,
  );
  const shippingAmount = Number(selectedShippingMethod?.baseRate || 0);

  const taxRules = await getTaxRules();
  const matchingTaxRule = resolveMatchingTaxRule(taxRules, payload.country);
  const pricing = resolveTaxPricing({
    subtotalAmount,
    discountAmount,
    shippingAmount,
    taxRule: matchingTaxRule,
    manualTaxAmount: 0,
  });

  const currencyQuote = await getCurrencyConversionQuote({
    baseCurrency: store.currency || store.currency_code || "USD",
    displayCurrency: payload.displayCurrency || store.currency || "USD",
    subtotal: subtotalAmount,
    discountAmount,
    shippingAmount,
    taxableAmount: pricing.taxableAmount,
    taxAmount: pricing.taxAmount,
    totalAmount: pricing.totalAmount,
  });

  return {
    ok: issues.length === 0,
    issues,
    cart,
    appliedDiscounts: appliedDiscounts.map((item) => ({
      id: item.id,
      code: item.code,
      title: item.title,
      amount: Number(item.calculated_amount || 0),
    })),
    pricing: {
      subtotal: subtotalAmount,
      discountAmount,
      shippingAmount,
      taxableAmount: pricing.taxableAmount,
      taxAmount: pricing.taxAmount,
      totalAmount: pricing.totalAmount,
      taxBehavior: pricing.taxBehavior,
      taxRate: pricing.taxRate,
    },
    currencyQuote,
  };
}

export async function getCheckoutRecoveryState() {
  const { authUser, store } = await getStoreContext();
  const cart = await ensureActiveCart(store.id);
  const checkoutSessionTable = await resolveCheckoutSessionTable();

  if (!checkoutSessionTable) {
    return {
      sessionId: null,
      state: "cart_review",
      status: "in_progress",
      formData: {},
      revalidation: null,
      lastError: null,
    };
  }

  const { data, error } = await supabase
    .from(checkoutSessionTable)
    .select(
      "id, current_state, status, form_data_json, revalidation_json, last_error, updated_at",
    )
    .eq("store_id", store.id)
    .eq("cart_id", cart.id)
    .eq("user_id", authUser.id)
    .in("status", ["in_progress", "failed"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw normalizeError(error);
  }

  if (!data) {
    return {
      sessionId: null,
      state: "cart_review",
      status: "in_progress",
      formData: {},
      revalidation: null,
      lastError: null,
    };
  }

  return {
    sessionId: data.id,
    state: normalizeCheckoutStep(data.current_state),
    status: data.status,
    formData: data.form_data_json || {},
    revalidation: data.revalidation_json || null,
    lastError: data.last_error || null,
  };
}

export async function saveCheckoutRecoveryState(payload = {}) {
  const { authUser, store } = await getStoreContext();
  const cart = await ensureActiveCart(store.id);
  const checkoutSessionTable = await resolveCheckoutSessionTable();

  if (!checkoutSessionTable) {
    return {
      sessionId: null,
      state: normalizeCheckoutStep(payload.state),
      status: "in_progress",
      formData: payload.formData || {},
      revalidation: payload.revalidation || null,
      lastError: payload.lastError || null,
    };
  }

  const existing = await getCheckoutRecoveryState();
  const nextState = normalizeCheckoutStep(payload.state || existing.state);
  if (!isValidCheckoutTransition(existing.state, nextState)) {
    const transitionError = new Error(
      `Invalid checkout transition from ${existing.state} to ${nextState}`,
    );
    transitionError.code = "CHECKOUT_TRANSITION_INVALID";
    throw transitionError;
  }

  const nextStatus =
    payload.status ||
    (nextState === "confirmed"
      ? "completed"
      : nextState === "failed"
        ? "failed"
        : "in_progress");

  const dataPayload = {
    store_id: store.id,
    cart_id: cart.id,
    user_id: authUser.id,
    current_state: nextState,
    status: nextStatus,
    form_data_json: payload.formData || existing.formData || {},
    revalidation_json: payload.revalidation || existing.revalidation || null,
    last_error: payload.lastError || null,
    last_attempted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let sessionId = existing.sessionId;

  if (sessionId) {
    const { error: updateError } = await supabase
      .from(checkoutSessionTable)
      .update(dataPayload)
      .eq("id", sessionId)
      .eq("store_id", store.id)
      .eq("user_id", authUser.id);

    if (updateError) {
      throw normalizeError(updateError);
    }
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from(checkoutSessionTable)
      .insert(dataPayload)
      .select("id")
      .single();

    if (insertError) {
      throw normalizeError(insertError);
    }

    sessionId = inserted.id;
  }

  await saveCheckoutSessionEvent({
    sessionId,
    fromState: existing.state || "cart_review",
    toState: nextState,
    status: nextStatus === "failed" ? "error" : "ok",
    note: payload.note || null,
    metadata: payload.metadata || {},
  });

  return {
    sessionId,
    state: nextState,
    status: nextStatus,
    formData: dataPayload.form_data_json,
    revalidation: dataPayload.revalidation_json,
    lastError: dataPayload.last_error,
  };
}

export async function getCheckoutSnapshot() {
  const { store } = await getStoreContext();
  const [
    cart,
    discounts,
    paymentMethods,
    shippingMethods,
    taxRules,
    recovery,
    currencySettings,
  ] = await Promise.all([
    getCart(),
    getDiscounts("active"),
    getPaymentMethods(),
    getShippingMethods(),
    getTaxRules(),
    getCheckoutRecoveryState(),
    getCurrencySettings(),
  ]);

  return {
    store: mapStoreSummary(store),
    cart,
    discounts,
    paymentMethods: paymentMethods.filter((item) => item.isActive),
    shippingMethods: shippingMethods.filter((item) => item.isActive),
    taxRules: taxRules.filter((item) => item.isActive),
    recovery,
    currencySettings,
  };
}
