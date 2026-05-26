/**
 * cartService — Active cart management: items, quantities, and cart bootstrapping
 *
 * Domain: Cart
 * Feature: 07
 * Depends on: supabaseClient, utils/errorUtils, storeService
 */

import { supabase } from "./supabaseClient";
import { normalizeError } from "./utils/errorUtils";
import { getStoreContext } from "./storeService";

export async function ensureActiveCart(storeId) {
  const { data: carts, error: cartError } = await supabase
    .from("carts")
    .select("id, store_id, status, note, created_at, updated_at")
    .eq("store_id", storeId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  if (cartError) {
    throw normalizeError(cartError);
  }

  if (carts?.[0]) {
    return carts[0];
  }

  const { data: inserted, error: insertError } = await supabase
    .from("carts")
    .insert({
      store_id: storeId,
      status: "active",
    })
    .select("id, store_id, status, note, created_at, updated_at")
    .single();

  if (insertError) {
    throw normalizeError(insertError);
  }

  return inserted;
}

export async function getCart() {
  const { store } = await getStoreContext();
  const cart = await ensureActiveCart(store.id);

  const { data: items, error } = await supabase
    .from("cart_items")
    .select(
      "id, quantity, unit_price, product_variants(id, sku, title, price, quantity_in_stock, products!inner(id, title, store_id, status))",
    )
    .eq("cart_id", cart.id)
    .eq("product_variants.products.store_id", store.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw normalizeError(error);
  }

  const normalizedItems = (items || []).map((item) => ({
    id: item.id,
    variantId: item.product_variants?.id,
    productId: item.product_variants?.products?.id,
    productName: item.product_variants?.products?.title || "-",
    variantTitle: item.product_variants?.title || "-",
    sku: item.product_variants?.sku || "-",
    quantity: Number(item.quantity || 0),
    unitPrice: Number(item.unit_price || item.product_variants?.price || 0),
    stock: Number(item.product_variants?.quantity_in_stock || 0),
    lineTotal:
      Number(item.quantity || 0) *
      Number(item.unit_price || item.product_variants?.price || 0),
  }));

  const subtotal = normalizedItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0,
  );

  return {
    id: cart.id,
    status: cart.status,
    items: normalizedItems,
    subtotal: Number(subtotal.toFixed(2)),
  };
}

export async function addToCart(payload) {
  const { store } = await getStoreContext();
  const cart = await ensureActiveCart(store.id);

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select(
      "id, sku, title, price, quantity_in_stock, products!inner(id, title, store_id, status)",
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

  if (variant.products?.status !== "active") {
    throw new Error("Only active products can be added to cart");
  }

  const quantityToAdd = Math.max(1, Number(payload.quantity || 1));
  const { data: existing, error: existingError } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cart.id)
    .eq("product_variant_id", variant.id)
    .maybeSingle();

  if (existingError) {
    throw normalizeError(existingError);
  }

  const nextQuantity = Number(existing?.quantity || 0) + quantityToAdd;
  if (nextQuantity > Number(variant.quantity_in_stock || 0)) {
    throw new Error("Requested quantity exceeds current stock");
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("cart_items")
      .update({
        quantity: nextQuantity,
        unit_price: Number(variant.price || 0),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("cart_id", cart.id);

    if (updateError) {
      throw normalizeError(updateError);
    }
  } else {
    const { error: insertError } = await supabase.from("cart_items").insert({
      cart_id: cart.id,
      product_variant_id: variant.id,
      quantity: quantityToAdd,
      unit_price: Number(variant.price || 0),
    });

    if (insertError) {
      throw normalizeError(insertError);
    }
  }

  return getCart();
}

export async function updateCartItemQuantity(cartItemId, quantity) {
  const { store } = await getStoreContext();
  const nextQuantity = Number(quantity || 0);
  if (nextQuantity <= 0) {
    return removeCartItem(cartItemId);
  }

  const { data: item, error: itemError } = await supabase
    .from("cart_items")
    .select(
      "id, cart_id, product_variant_id, product_variants(quantity_in_stock), carts!inner(store_id)",
    )
    .eq("id", cartItemId)
    .eq("carts.store_id", store.id)
    .maybeSingle();

  if (itemError) {
    throw normalizeError(itemError);
  }

  if (!item) {
    throw new Error("Cart item not found");
  }

  if (nextQuantity > Number(item.product_variants?.quantity_in_stock || 0)) {
    throw new Error("Requested quantity exceeds current stock");
  }

  const { error: updateError } = await supabase
    .from("cart_items")
    .update({
      quantity: nextQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cartItemId);

  if (updateError) {
    throw normalizeError(updateError);
  }

  return getCart();
}

export async function removeCartItem(cartItemId) {
  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", cartItemId)
    .in(
      "cart_id",
      (await supabase
        .from("carts")
        .select("id")
        .eq("store_id", store.id)
        .then((result) => (result.data || []).map((row) => row.id))) || [],
    );

  if (error) {
    throw normalizeError(error);
  }

  return getCart();
}
