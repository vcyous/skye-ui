import { useCart } from "../../../context/CartContext";
import type { TemplateProps } from "../../../types";

const PLACEHOLDER_PRODUCTS = [
  {
    id: "ph1",
    name: "Product One",
    handle: "product-one",
    price: 150000,
    currency: "IDR",
    imageUrl: null,
    status: "active",
    variantId: null,
    stock: 10,
  },
  {
    id: "ph2",
    name: "Product Two",
    handle: "product-two",
    price: 200000,
    currency: "IDR",
    imageUrl: null,
    status: "active",
    variantId: null,
    stock: 10,
  },
  {
    id: "ph3",
    name: "Product Three",
    handle: "product-three",
    price: 175000,
    currency: "IDR",
    imageUrl: null,
    status: "active",
    variantId: null,
    stock: 10,
  },
];

export default function ModernMinimalTemplate({
  config,
  storeName,
  products = [],
  storeSlug,
  onAddToCart,
}: TemplateProps) {
  const { texts, colors, images, catalog } = config;
  const { itemCount } = useCart();
  const displayProducts = products.length > 0 ? products : PLACEHOLDER_PRODUCTS;
  const layoutColMap: Record<string, number> = {
    "grid-2": 2,
    "grid-3": 3,
    "grid-4": 4,
  };
  const cols = layoutColMap[catalog?.layout ?? "grid-3"] ?? 3;

  const cssVars = {
    "--tpl-primary": colors.primary || "#0D5C53",
    "--tpl-secondary": colors.secondary || "#073A33",
    "--tpl-bg": colors.background || "#FAFAFA",
    "--tpl-accent": colors.accent || "#E8F3F1",
    "--tpl-text": colors.textPrimary || "#111827",
    "--tpl-text-muted": colors.textSecondary || "#6B7280",
  };

  return (
    <div
      className="tpl-modern"
      style={{
        ...cssVars,
        background: cssVars["--tpl-bg"],
        color: cssVars["--tpl-text"],
        fontFamily: "'Manrope', sans-serif",
        minHeight: "100%",
      }}
    >
      {/* ── Navigation ── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 40px",
          borderBottom: `1px solid ${colors.accent}`,
        }}
      >
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 22,
            color: colors.primary,
            letterSpacing: "-0.02em",
          }}
        >
          {images.logoUrl ? (
            <img
              src={images.logoUrl}
              alt={storeName}
              style={{ height: 36, objectFit: "contain", display: "block" }}
            />
          ) : (
            <span style={{ fontWeight: 700, fontSize: 20 }}>{storeName}</span>
          )}
        </span>
        <div
          style={{
            display: "flex",
            gap: 28,
            fontSize: 14,
            fontWeight: 600,
            color: colors.textSecondary,
          }}
        >
          <span>Shop</span>
          <span>About</span>
          <span>Contact</span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 13,
            color: colors.textSecondary,
          }}
        >
          <span>Search</span>
          {storeSlug ? (
            <a
              href={`/storefront/${storeSlug}/cart`}
              style={{
                color: colors.textSecondary,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 16 }}>🛒</span>
              {itemCount > 0 && (
                <span
                  style={{
                    background: colors.primary,
                    color: "#fff",
                    borderRadius: "50%",
                    fontSize: 11,
                    minWidth: 18,
                    height: 18,
                    padding: "0 4px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {itemCount}
                </span>
              )}
            </a>
          ) : (
            <span>Cart</span>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        style={{
          padding: "80px 40px",
          textAlign: "center",
          maxWidth: 720,
          margin: "0 auto",
          ...(images.heroImageUrl
            ? {
                backgroundImage: `url(${images.heroImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}),
        }}
      >
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 48,
            fontWeight: 700,
            lineHeight: 1.1,
            color: colors.primary,
            margin: "0 0 20px",
          }}
        >
          {texts.heroTitle}
        </h1>
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.6,
            color: colors.textSecondary,
            margin: "0 0 36px",
          }}
        >
          {texts.heroSubtitle}
        </p>
        <button
          style={{
            background: colors.primary,
            color: "#fff",
            border: "none",
            padding: "14px 40px",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "0.02em",
            boxShadow: `0 4px 14px ${colors.primary}33`,
          }}
        >
          {texts.ctaButton}
        </button>
      </section>

      {/* ── Divider ── */}
      <div
        style={{
          width: 60,
          height: 2,
          background: colors.accent,
          margin: "0 auto 40px",
        }}
      />

      {/* ── Featured Products ── */}
      <section style={{ padding: "0 40px 60px" }}>
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 28,
            fontWeight: 700,
            textAlign: "center",
            margin: "0 0 40px",
            color: colors.secondary,
          }}
        >
          {texts.featuredHeading}
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 24,
            maxWidth: 960,
            margin: "0 auto",
          }}
        >
          {displayProducts.map((product) => (
            <div
              key={product.id}
              style={{
                borderRadius: 12,
                overflow: "hidden",
                background: "#fff",
                border: `1px solid ${colors.accent}`,
              }}
            >
              <div
                style={{
                  height: 200,
                  background: product.imageUrl
                    ? `url(${product.imageUrl}) center/cover no-repeat`
                    : `${colors.primary}11`,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {!product.imageUrl && (
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: `${colors.primary}22`,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 24,
                    }}
                  >
                    ✦
                  </div>
                )}
              </div>
              <div style={{ padding: "16px 20px" }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                  {product.name}
                </div>
                <div
                  style={{
                    color: colors.primary,
                    fontWeight: 600,
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: product.currency ?? "IDR",
                    maximumFractionDigits: 0,
                  }).format(product.price)}
                </div>
                {onAddToCart && (
                  <button
                    onClick={() => onAddToCart(product)}
                    style={{
                      width: "100%",
                      background: colors.primary,
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 0",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          padding: "28px 40px",
          borderTop: `1px solid ${colors.accent}`,
          textAlign: "center",
          fontSize: 13,
          color: colors.textSecondary,
        }}
      >
        © 2026 Store. All rights reserved.
      </footer>
    </div>
  );
}
