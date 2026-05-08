import {
  Alert,
  Button,
  Card,
  InputNumber,
  Space,
  Table,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { getProducts } from "../services/api.js";

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CartPage() {
  const navigate = useNavigate();
  const {
    cart,
    refreshCart,
    addItem,
    updateItemQuantity,
    removeItem,
    isLoading,
  } = useCart();
  const [products, setProducts] = useState([]);
  const [notice, setNotice] = useState({ type: "", message: "" });

  useEffect(() => {
    Promise.all([refreshCart(), getProducts("active")])
      .then(([, productRows]) => setProducts(productRows))
      .catch((err) => {
        setNotice({
          type: "error",
          message: err.message || "Failed to load cart.",
        });
      });
  }, [refreshCart]);

  async function handleAdd(product) {
    setNotice({ type: "", message: "" });
    try {
      await addItem({ variantId: product.variantId, quantity: 1 });
      setNotice({ type: "success", message: `${product.name} added to cart.` });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Unable to add item.",
      });
    }
  }

  async function handleQuantityChange(record, value) {
    setNotice({ type: "", message: "" });
    try {
      await updateItemQuantity(record.id, value);
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Unable to update quantity.",
      });
    }
  }

  async function handleRemove(record) {
    setNotice({ type: "", message: "" });
    try {
      await removeItem(record.id);
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Unable to remove item.",
      });
    }
  }

  const productColumns = [
    { title: "Product", dataIndex: "name", key: "name" },
    { title: "SKU", dataIndex: "sku", key: "sku" },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      render: (value) => formatCurrency(value),
    },
    { title: "Stock", dataIndex: "stock", key: "stock" },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button type="primary" onClick={() => handleAdd(record)}>
          Add to cart
        </Button>
      ),
    },
  ];

  const cartColumns = [
    { title: "Product", dataIndex: "productName", key: "productName" },
    { title: "Variant", dataIndex: "variantTitle", key: "variantTitle" },
    { title: "SKU", dataIndex: "sku", key: "sku" },
    {
      title: "Unit Price",
      dataIndex: "unitPrice",
      key: "unitPrice",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Quantity",
      key: "quantity",
      render: (_, record) => (
        <InputNumber
          min={1}
          max={record.stock}
          value={record.quantity}
          onChange={(value) => handleQuantityChange(record, value)}
        />
      ),
    },
    {
      title: "Line Total",
      dataIndex: "lineTotal",
      key: "lineTotal",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button danger onClick={() => handleRemove(record)}>
          Remove
        </Button>
      ),
    },
  ];

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Cart
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Build an order from active products, then continue to checkout.
        </Typography.Text>
      </header>

      {notice.message ? (
        <Alert type={notice.type || "info"} message={notice.message} showIcon />
      ) : null}

      <Card title="Available Products">
        <Table
          rowKey="id"
          columns={productColumns}
          dataSource={products}
          loading={isLoading}
          pagination={{ pageSize: 6 }}
        />
      </Card>

      <Card
        title={`Current Cart (${cart.items.length} items)`}
        extra={
          <Space>
            <Typography.Text strong>
              Subtotal: {formatCurrency(cart.subtotal)}
            </Typography.Text>
            <Button
              type="primary"
              disabled={!cart.items.length}
              onClick={() => navigate("/checkout")}
            >
              Proceed to Checkout
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={cartColumns}
          dataSource={cart.items}
          loading={isLoading}
          pagination={false}
        />
      </Card>
    </section>
  );
}
