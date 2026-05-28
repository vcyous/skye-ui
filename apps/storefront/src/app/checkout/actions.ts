"use server";

import { headers } from "next/headers";
import { supabase } from "@/lib/supabase";
import { getStoreBySlug } from "@/lib/store";
import type { CartItem } from "@/lib/types";

export type CheckoutInput = {
  buyer: {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
  };
  shipping: { name: string; price: number } | null;
  payment_method: string;
  items: CartItem[];
};

export type CheckoutResult =
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; error: string };

export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const h = await headers();
  const slug = h.get("x-store-slug");
  if (!slug) return { ok: false, error: "Tidak ada konteks toko" };

  const store = await getStoreBySlug(slug);
  if (!store) return { ok: false, error: "Toko tidak ditemukan" };

  if (!input.items.length) return { ok: false, error: "Keranjang kosong" };
  if (!input.buyer.name || !input.buyer.phone || !input.buyer.email) {
    return { ok: false, error: "Data pembeli tidak lengkap" };
  }

  const subtotal = input.items.reduce(
    (sum, it) => sum + it.price * it.quantity,
    0,
  );
  const shippingCost = input.shipping?.price ?? 0;
  const total = subtotal + shippingCost;

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      store_id: store.id,
      buyer_name: input.buyer.name,
      buyer_phone: input.buyer.phone,
      buyer_email: input.buyer.email,
      status: "baru",
      subtotal,
      shipping_cost: shippingCost,
      discount_amount: 0,
      total,
      shipping_method: input.shipping?.name ?? null,
      shipping_address: {
        name: input.buyer.name,
        phone: input.buyer.phone,
        address: input.buyer.address,
        city: input.buyer.city,
        province: input.buyer.province,
        postal_code: input.buyer.postal_code,
      },
      payment_method: input.payment_method,
      payment_status: "pending",
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) {
    return { ok: false, error: orderErr?.message ?? "Gagal membuat pesanan" };
  }

  const itemsInsert = input.items.map((it) => ({
    order_id: order.id,
    product_id: it.productId,
    product_name: it.name,
    variant_name: null,
    price: it.price,
    quantity: it.quantity,
  }));

  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(itemsInsert);

  if (itemsErr) {
    return { ok: false, error: itemsErr.message };
  }

  return { ok: true, orderId: order.id, orderNumber: order.order_number };
}
