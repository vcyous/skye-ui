import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const CART_KEY = "skye-cart";
const CartContext = createContext(null);

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function calcSubtotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readCart());

  const addItem = useCallback((payload) => {
    setItems((prev) => {
      const key = payload.variantId || payload.productId;
      const existing = prev.find(
        (i) => (i.variantId || i.productId) === key,
      );
      const next = existing
        ? prev.map((i) =>
            (i.variantId || i.productId) === key
              ? { ...i, quantity: i.quantity + (payload.quantity || 1) }
              : i,
          )
        : [
            ...prev,
            {
              id: `${key}-${Date.now()}`,
              productId: payload.productId,
              variantId: payload.variantId || null,
              name: payload.name || "",
              price: Number(payload.price || 0),
              quantity: Number(payload.quantity || 1),
              imageUrl: payload.imageUrl || null,
            },
          ];
      writeCart(next);
      return next;
    });
  }, []);

  const updateItemQuantity = useCallback((itemId, quantity) => {
    setItems((prev) => {
      const next =
        quantity <= 0
          ? prev.filter((i) => i.id !== itemId)
          : prev.map((i) =>
              i.id === itemId ? { ...i, quantity: Number(quantity) } : i,
            );
      writeCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((itemId) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== itemId);
      writeCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    writeCart([]);
    setItems([]);
  }, []);

  const value = useMemo(
    () => ({
      items,
      subtotal: calcSubtotal(items),
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
      addItem,
      updateItemQuantity,
      removeItem,
      clearCart,
    }),
    [items, addItem, updateItemQuantity, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
