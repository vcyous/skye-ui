/**
 * checkoutService — Checkout session management, validation, and recovery state
 *
 * Domain: Checkout
 * Feature: 07
 * Depends on: supabaseClient, utils/errorUtils, storeService, cartService, discountService, taxService, shippingService
 */

import { ensureActiveCart, getCart } from "./cartService";
import {
  getCurrencyConversionQuote,
  getCurrencySettings,
} from "./currencyService";
import {
  calculateDiscountAmount,
  getDiscounts,
  listDiscountRows,
  resolveApplicableDiscounts,
} from "./discountService";
import { getPaymentMethods } from "./paymentService";
import { getShippingMethods } from "./shippingService";
import { getStoreContext, mapStoreSummary } from "./storeService";
import { supabase } from "./supabaseClient";
import {
  getTaxRules,
  resolveMatchingTaxRule,
  resolveTaxPricing,
} from "./taxService";
import { tableExists } from "./utils/dbUtils";
import { normalizeError } from "./utils/errorUtils";

interface RevalidationIssue {
  code: string;
  message: string;
}

interface AppliedDiscount {
  id: string;
  code: string;
  title: string;
  amount: number;
}

interface CheckoutPricing {
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  taxBehavior?: string;
  taxRate?: number;
}

interface RevalidateResult {
  ok: boolean;
  issues: RevalidationIssue[];
  cart: import("./cartService").CartDetails;
  appliedDiscounts: AppliedDiscount[];
  pricing: CheckoutPricing;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currencyQuote?: any;
}

export interface CheckoutRecoveryState {
  sessionId: string | null;
  state: string;
  status: string;
  formData: Record<string, unknown>;
  revalidation: RevalidateResult | null;
  lastError: string | null;
}

export interface CheckoutSnapshot {
  store: import("../types").StoreSummary;
  cart: import("./cartService").CartDetails;
  discounts: unknown[];
  paymentMethods: unknown[];
  shippingMethods: unknown[];
  taxRules: unknown[];
  recovery: CheckoutRecoveryState;
  currencySettings: unknown;
}

const CHECKOUT_STEP_ORDER = [
  "cart_review",
  "customer_info",
  "shipping",
  "payment",
  "review",
  "confirmed",
  "failed",
];

function normalizeCheckoutStep(value: unknown): string {
  const step = String(value || "cart_review")
    .trim()
    .toLowerCase();
  return CHECKOUT_STEP_ORDER.includes(step) ? step : "cart_review";
}

function isValidCheckoutTransition(
  currentStep: unknown,
  nextStep: unknown,
): boolean {
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

async function resolveCheckoutSessionTable(): Promise<string | null> {
  if (await tableExists("checkout_sessions")) {
    return "checkout_sessions";
  }

  return null;
}

async function saveCheckoutSessionEvent(payload: {
  sessionId: string;
  fromState?: string;
  toState: string;
  status?: string;
  note?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
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

export async function revalidateCheckout(
  payload: Record<string, unknown> = {},
): Promise<RevalidateResult> {
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

  const issues: RevalidationIssue[] = [];

  const variantIds = cart.items.map((item) => item.variantId).filter(Boolean);
  const { data: liveVariants, error: liveVariantError } = await supabase
    .from("product_variants")
    .select(
      "id, price, quantity_in_stock, products!inner(id, title, store_id, status)",
    )
    .in("id", variantIds)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq("products.store_id", (store as any).id);

  if (liveVariantError) {
    throw normalizeError(liveVariantError);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liveById = new Map(
    (liveVariants || []).map((row: any) => [row.id, row]),
  );

  for (const cartItem of cart.items) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const live = liveById.get((cartItem as any).variantId);
    if (!live) {
      issues.push({
        code: "VARIANT_MISSING",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: `${(cartItem as any).productName} is no longer available`,
      });
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((live as any).products?.status !== "active") {
      issues.push({
        code: "PRODUCT_INACTIVE",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: `${(cartItem as any).productName} is not active`,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (
      Number((cartItem as any).quantity || 0) >
      Number((live as any).quantity_in_stock || 0)
    ) {
      issues.push({
        code: "INSUFFICIENT_STOCK",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: `Insufficient stock for ${(cartItem as any).productName}`,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (
      Number((cartItem as any).unitPrice || 0) !==
      Number((live as any).price || 0)
    ) {
      issues.push({
        code: "PRICE_CHANGED",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: `Price changed for ${(cartItem as any).productName}`,
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shippingMethods = ((await getShippingMethods()) as any[]).filter(
    (item) => item.isActive,
  );
  if (payload.shippingMethodId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentMethods = ((await getPaymentMethods()) as any[]).filter(
    (item) => item.isActive,
  );
  if (payload.paymentMethodId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  let appliedDiscounts: AppliedDiscount[] = [];
  if (payload.discountCode) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeDiscounts = await listDiscountRows((store as any).id, "active");
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          message: `${(rejected as any).code}: ${(rejected as any).reason}`,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedShippingMethod = shippingMethods.find(
    (item) => item.id === payload.shippingMethodId,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shippingAmount = Number((selectedShippingMethod as any)?.baseRate || 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taxRules = (await getTaxRules()) as any[];
  const matchingTaxRule = resolveMatchingTaxRule(taxRules, payload.country);
  const pricing = resolveTaxPricing({
    subtotalAmount,
    discountAmount,
    shippingAmount,
    taxRule: matchingTaxRule,
    manualTaxAmount: 0,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storeAny = store as any;
  const currencyQuote = await getCurrencyConversionQuote({
    baseCurrency: storeAny.currency || storeAny.currency_code || "USD",
    displayCurrency: payload.displayCurrency || storeAny.currency || "USD",
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cart: cart as any,
    appliedDiscounts: appliedDiscounts.map((item) => ({
      id: item.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      code: (item as any).code,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      title: (item as any).title,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      amount: Number((item as any).calculated_amount || 0),
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

export async function getCheckoutRecoveryState(): Promise<CheckoutRecoveryState> {
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

export async function saveCheckoutRecoveryState(
  payload: Partial<CheckoutRecoveryState> & Record<string, unknown> = {},
): Promise<CheckoutRecoveryState> {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transitionError: any = new Error(
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
    formData: dataPayload.form_data_json as Record<string, unknown>,
    revalidation: dataPayload.revalidation_json as RevalidateResult | null,
    lastError: dataPayload.last_error,
  };
}

export async function getCheckoutSnapshot(): Promise<CheckoutSnapshot> {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: mapStoreSummary(store as any),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cart: cart as any,
    discounts,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paymentMethods: (paymentMethods as any[]).filter((item) => item.isActive),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shippingMethods: (shippingMethods as any[]).filter((item) => item.isActive),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    taxRules: (taxRules as any[]).filter((item) => item.isActive),
    recovery,
    currencySettings,
  };
}
