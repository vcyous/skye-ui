"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartItem } from "./types";

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  isHydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(slug: string) {
  return `skye:cart:${slug}`;
}

function clampQuantity(quantity: number, stock: number | null | undefined) {
  const q = Math.max(1, Math.floor(quantity));
  if (typeof stock === "number" && stock > 0) return Math.min(q, stock);
  return q;
}

export function CartProvider({
  storeSlug,
  children,
}: {
  storeSlug: string;
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey(storeSlug));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed as CartItem[]);
      }
    } catch {
      // ignore malformed
    } finally {
      setIsHydrated(true);
    }
  }, [storeSlug]);

  // Persist on change
  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey(storeSlug), JSON.stringify(items));
    } catch {
      // quota exceeded — silent fail
    }
  }, [items, storeSlug, isHydrated]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.productId === item.productId);
        if (idx === -1) {
          return [
            ...prev,
            { ...item, quantity: clampQuantity(quantity, item.stock) },
          ];
        }
        const next = [...prev];
        const target = next[idx];
        next[idx] = {
          ...target,
          quantity: clampQuantity(target.quantity + quantity, item.stock),
        };
        return next;
      });
    },
    [],
  );

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.productId === productId
            ? { ...i, quantity: clampQuantity(quantity, i.stock) }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return {
      items,
      itemCount,
      subtotal,
      addItem,
      updateQuantity,
      removeItem,
      clear,
      isHydrated,
    };
  }, [items, addItem, updateQuantity, removeItem, clear, isHydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
