import { App, Button, InputNumber, Space, Typography } from "antd";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import type { CartItemDetails } from "../../services/cartService";

function formatPrice(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function StorefrontCartPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { cart, isLoading, refreshCart, updateItemQuantity, removeItem } =
    useCart();

  useEffect(() => {
    refreshCart().catch(() => null);
  }, [refreshCart]);

  async function handleQuantityChange(
    item: CartItemDetails,
    value: number | null,
  ) {
    try {
      await updateItemQuantity(item.id, value ?? 0);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Could not update quantity.";
      message.error(msg);
    }
  }

  async function handleRemove(item: CartItemDetails) {
    try {
      await removeItem(item.id);
      message.success("Item removed.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not remove item.";
      message.error(msg);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 32 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Typography.Title level={2} style={{ margin: 0 }}>
          Your Cart
        </Typography.Title>
        <Button
          type="link"
          onClick={() => navigate("/storefront")}
          style={{ padding: 0 }}
        >
          ← Continue Shopping
        </Button>
      </div>

      {isLoading && <Typography.Text>Loading cart...</Typography.Text>}

      {!isLoading && cart.items.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <Typography.Title level={4} type="secondary">
            Your cart is empty
          </Typography.Title>
          <Button type="primary" onClick={() => navigate("/storefront")}>
            Browse Products
          </Button>
        </div>
      )}

      {!isLoading && cart.items.length > 0 && (
        <>
          <div style={{ display: "grid", gap: 12 }}>
            {cart.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto",
                  gap: 16,
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid #E5E7EB",
                }}
              >
                <div>
                  <Typography.Text strong>{item.productName}</Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    SKU: {item.sku}
                  </Typography.Text>
                </div>
                <Typography.Text>{formatPrice(item.unitPrice)}</Typography.Text>
                <InputNumber
                  min={1}
                  max={item.stock}
                  value={item.quantity}
                  onChange={(val) => handleQuantityChange(item, val)}
                  size="small"
                  style={{ width: 70 }}
                />
                <Space direction="vertical" size={4} align="end">
                  <Typography.Text strong>
                    {formatPrice(item.lineTotal)}
                  </Typography.Text>
                  <Button
                    danger
                    size="small"
                    type="text"
                    onClick={() => handleRemove(item)}
                  >
                    Remove
                  </Button>
                </Space>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <Typography.Text type="secondary">Subtotal</Typography.Text>
              <Typography.Title level={3} style={{ margin: 0 }}>
                {formatPrice(cart.subtotal)}
              </Typography.Title>
            </div>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate("/storefront/checkout")}
            >
              Proceed to Checkout →
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
