import { Button, Result, Space, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getOrderDetail } from "../../services/api";
import type { OrderDetail } from "../../services/orderService";

function formatPrice(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function StorefrontOrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    getOrderDetail(orderId)
      .then((data) => setOrder(data as OrderDetail))
      .catch(() => null)
      .finally(() => setIsLoading(false));
  }, [orderId]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 32 }}>
      <Result
        status="success"
        title="Order Confirmed!"
        subTitle={
          order
            ? `Order #${order.orderNumber} — we'll reach out to confirm delivery details.`
            : "Your order has been placed."
        }
        extra={
          <Space>
            <Button type="primary" onClick={() => navigate("/storefront")}>
              Continue Shopping
            </Button>
            <Button onClick={() => navigate("/orders")}>
              View Orders (Admin)
            </Button>
          </Space>
        }
      />

      {order?.items?.length ? (
        <div
          style={{
            background: "#F9FAFB",
            borderRadius: 12,
            padding: 24,
            marginTop: 24,
          }}
        >
          <Typography.Title level={5}>Items Ordered</Typography.Title>
          <Space direction="vertical" style={{ width: "100%" }}>
            {order.items.map((item, i) => (
              <div
                key={i}
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <Typography.Text>
                  {item.productName} × {item.quantity}
                </Typography.Text>
                <Typography.Text strong>
                  {formatPrice(item.lineTotal)}
                </Typography.Text>
              </div>
            ))}
            <div
              style={{
                borderTop: "1px solid #E5E7EB",
                paddingTop: 8,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <Typography.Text strong>Total</Typography.Text>
              <Typography.Text strong>
                {formatPrice(order.totalAmount)}
              </Typography.Text>
            </div>
          </Space>
        </div>
      ) : null}
    </div>
  );
}
