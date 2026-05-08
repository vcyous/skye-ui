import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  addToCart,
  getCart,
  removeCartItem,
  updateCartItemQuantity,
} from "../services/api.js";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState({
    id: null,
    items: [],
    subtotal: 0,
    status: "active",
  });
  const [isLoading, setIsLoading] = useState(false);

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

  const addItem = useCallback(async (payload) => {
    const nextCart = await addToCart(payload);
    setCart(nextCart);
    return nextCart;
  }, []);

  const updateItemQuantity = useCallback(async (cartItemId, quantity) => {
    const nextCart = await updateCartItemQuantity(cartItemId, quantity);
    setCart(nextCart);
    return nextCart;
  }, []);

  const removeItem = useCallback(async (cartItemId) => {
    const nextCart = await removeCartItem(cartItemId);
    setCart(nextCart);
    return nextCart;
  }, []);

  const value = useMemo(
    () => ({
      cart,
      isLoading,
      refreshCart,
      addItem,
      updateItemQuantity,
      removeItem,
      itemCount: cart.items.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
      ),
    }),
    [cart, isLoading, refreshCart, addItem, updateItemQuantity, removeItem],
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
