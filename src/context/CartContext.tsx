import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  addToCart,
  getCart,
  getCheckoutRecoveryState,
  removeCartItem,
  saveCheckoutRecoveryState,
  updateCartItemQuantity,
} from "../services/api";

export interface CartContextType {
  cart: {
    id: string | null;
    items: any[];
    subtotal: number;
    status: string;
  };
  isLoading: boolean;
  refreshCart: () => Promise<any>;
  addItem: (payload: { variantId: string; quantity?: number }) => Promise<any>;
  updateItemQuantity: (cartItemId: string, quantity: number) => Promise<any>;
  removeItem: (cartItemId: string) => Promise<any>;
  checkoutRecovery: any;
  checkoutRecoveryError: string;
  refreshCheckoutRecovery: () => Promise<any>;
  saveCheckoutRecovery: (payload: any) => Promise<any>;
  clearCheckoutRecovery: () => Promise<any>;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<{
    id: string | null;
    items: any[];
    subtotal: number;
    status: string;
  }>({
    id: null,
    items: [],
    subtotal: 0,
    status: "active",
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [checkoutRecovery, setCheckoutRecovery] = useState<any>({
    sessionId: null,
    state: "cart_review",
    status: "in_progress",
    formData: {},
    revalidation: null,
    lastError: null,
  });
  const [checkoutRecoveryError, setCheckoutRecoveryError] = useState<string>("");

  const refreshCart = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextCart = await getCart();
      setCart(nextCart);
      return nextCart;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addItem = useCallback(async (payload: { variantId: string; quantity?: number }) => {
    const nextCart = await addToCart(payload);
    setCart(nextCart);
    return nextCart;
  }, []);

  const updateItemQuantity = useCallback(async (cartItemId: string, quantity: number) => {
    const nextCart = await updateCartItemQuantity(cartItemId, quantity);
    setCart(nextCart);
    return nextCart;
  }, []);

  const removeItem = useCallback(async (cartItemId: string) => {
    const nextCart = await removeCartItem(cartItemId);
    setCart(nextCart);
    return nextCart;
  }, []);

  const refreshCheckoutRecovery = useCallback(async () => {
    setCheckoutRecoveryError("");
    try {
      const nextRecovery = await getCheckoutRecoveryState();
      setCheckoutRecovery(nextRecovery);
      return nextRecovery;
    } catch (error: any) {
      const message =
        error?.message || "Failed to load checkout recovery state.";
      setCheckoutRecoveryError(message);
      throw error;
    }
  }, []);

  const saveCheckoutRecovery = useCallback(async (payload: any) => {
    setCheckoutRecoveryError("");
    const nextRecovery = await saveCheckoutRecoveryState(payload || {});
    setCheckoutRecovery(nextRecovery);
    return nextRecovery;
  }, []);

  const clearCheckoutRecovery = useCallback(async () => {
    const nextRecovery = await saveCheckoutRecoveryState({
      state: "cart_review",
      status: "in_progress",
      formData: {},
      revalidation: null,
      lastError: null,
      note: "Checkout recovery cleared",
    });
    setCheckoutRecovery(nextRecovery);
    return nextRecovery;
  }, []);

  useEffect(() => {
    refreshCart().catch(() => null);
    refreshCheckoutRecovery().catch(() => null);
  }, [refreshCart, refreshCheckoutRecovery]);

  const value = useMemo(
    () => ({
      cart,
      isLoading,
      refreshCart,
      addItem,
      updateItemQuantity,
      removeItem,
      checkoutRecovery,
      checkoutRecoveryError,
      refreshCheckoutRecovery,
      saveCheckoutRecovery,
      clearCheckoutRecovery,
      itemCount: cart.items.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
      ),
    }),
    [
      cart,
      isLoading,
      refreshCart,
      addItem,
      updateItemQuantity,
      removeItem,
      checkoutRecovery,
      checkoutRecoveryError,
      refreshCheckoutRecovery,
      saveCheckoutRecovery,
      clearCheckoutRecovery,
    ],
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
