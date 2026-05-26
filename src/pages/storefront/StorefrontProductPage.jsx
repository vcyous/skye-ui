import { App, Button, InputNumber, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { supabase } from "../../services/supabaseClient";

async function fetchProductByHandle(handle) {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id, title, description, media_urls, handle,
      product_variants(id, price, quantity_in_stock),
      stores!inner(id, name, is_published)
    `,
    )
    .eq("handle", handle)
    .eq("status", "active")
    .eq("stores.is_published", true)
    .maybeSingle();

  if (error || !data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variant = Array.isArray(data.product_variants)
    ? data.product_variants[0]
    : null;
  return {
    id: data.id,
    name: data.title,
    handle: data.handle,
    price: Number(variant?.price ?? 0),
    imageUrl:
      Array.isArray(data.media_urls) && data.media_urls.length > 0
        ? data.media_urls[0]
        : null,
    description: data.description ?? "",
    variantId: variant?.id ?? null,
    stock: Number(variant?.quantity_in_stock ?? 0),
  };
}

export default function StorefrontProductPage() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!handle) return;
    setIsLoading(true);
    fetchProductByHandle(handle)
      .then((result) => setProduct(result))
      .finally(() => setIsLoading(false));
  }, [handle]);

  async function handleAddToCart() {
    if (!product?.variantId) return;
    setIsAdding(true);
    try {
      await addItem({ variantId: product.variantId, quantity });
      message.success(`${product.name} added to cart!`);
      navigate("/storefront/cart");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not add to cart.";
      message.error(msg);
    } finally {
      setIsAdding(false);
    }
  }

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

  if (!product) {
    return (
      <div style={{ minHeight: "100vh", padding: 40, textAlign: "center" }}>
        <Typography.Title level={3}>Product not found</Typography.Title>
        <Button onClick={() => navigate("/storefront")}>← Back to Store</Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 32 }}>
      <Button
        type="link"
        onClick={() => navigate("/storefront")}
        style={{ marginBottom: 16, padding: 0 }}
      >
        ← Back to Store
      </Button>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 48,
          alignItems: "start",
        }}
      >
        {/* Product image */}
        <div>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              style={{
                width: "100%",
                borderRadius: 12,
                objectFit: "cover",
                aspectRatio: "1",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                aspectRatio: "1",
                borderRadius: 12,
                background: "#F3F4F6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography.Text type="secondary">No image</Typography.Text>
            </div>
          )}
        </div>

        {/* Product details */}
        <div style={{ display: "grid", gap: 16 }}>
          <Typography.Title level={2} style={{ margin: 0 }}>
            {product.name}
          </Typography.Title>
          <Typography.Title level={3} style={{ margin: 0, color: "#0D5C53" }}>
            Rp {product.price.toLocaleString("id-ID")}
          </Typography.Title>
          {product.description && (
            <Typography.Paragraph style={{ color: "#374151" }}>
              {product.description}
            </Typography.Paragraph>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Typography.Text>Quantity:</Typography.Text>
            <InputNumber
              min={1}
              max={Math.max(1, product.stock)}
              value={quantity}
              onChange={(val) => setQuantity(val ?? 1)}
            />
          </div>
          {product.stock === 0 && (
            <Typography.Text type="danger">Out of stock</Typography.Text>
          )}
          <Button
            type="primary"
            size="large"
            disabled={product.stock === 0 || !product.variantId}
            loading={isAdding}
            onClick={handleAddToCart}
            style={{ maxWidth: 240 }}
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
