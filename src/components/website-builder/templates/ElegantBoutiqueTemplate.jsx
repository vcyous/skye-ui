import { useCart } from "../../../context/CartContext";

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

export default function ElegantBoutiqueTemplate({
  config,
  storeName,
  products = [],
  storeSlug,
  onAddToCart,
}) {
  const { texts, colors, images, catalog } = config;
  const { itemCount } = useCart();
  const displayProducts = products.length > 0 ? products : PLACEHOLDER_PRODUCTS;
  const layoutColMap = {
    "grid-2": 2,
    "grid-3": 3,
    "grid-4": 4,
  };
  const cols = layoutColMap[catalog?.layout ?? "grid-3"] ?? 3;

  return (
    <div
      style={{
        background: colors.background || "#FAF8F5",
        color: colors.textPrimary || "#2D2A26",
        fontFamily: "'Manrope', sans-serif",
        minHeight: "100%",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 40px",
          borderBottom: `1px solid ${colors.accent}`,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 24,
            fontSize: 13,
            fontWeight: 500,
            color: colors.textSecondary,
            letterSpacing: "0.04em",
          }}
        >
          <span>Shop</span>
          <span>Story</span>
        </div>
        <span
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontWeight: 400,
            fontSize: 26,
            color: colors.primary,
            letterSpacing: "0.06em",
            fontStyle: "italic",
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
            gap: 24,
            fontSize: 13,
            fontWeight: 500,
            color: colors.textSecondary,
            letterSpacing: "0.04em",
          }}
        >
          <span>Journal</span>
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
              <span>Cart</span>
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
      </header>

      {/* ── Hero (Split Layout) ── */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: 380,
        }}
      >
        {/* Left: Text */}
        <div
          style={{
            padding: "60px 40px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: colors.secondary,
              marginBottom: 16,
            }}
          >
            ✦ Curated With Care
          </div>
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 42,
              fontWeight: 400,
              lineHeight: 1.15,
              color: colors.primary,
              margin: "0 0 18px",
              fontStyle: "italic",
            }}
          >
            {texts.heroTitle}
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.7,
              color: colors.textSecondary,
              margin: "0 0 28px",
              maxWidth: 380,
            }}
          >
            {texts.heroSubtitle}
          </p>
          <button
            style={{
              alignSelf: "flex-start",
              background: colors.primary,
              color: "#fff",
              border: "none",
              padding: "13px 34px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {texts.ctaButton}
          </button>
        </div>
        {/* Right: Image placeholder */}
        <div
          style={{
            background: `linear-gradient(160deg, ${colors.accent}, ${colors.primary}18)`,
            display: "grid",
            placeItems: "center",
            position: "relative",
            ...(images.heroImageUrl
              ? {
                  backgroundImage: `url(${images.heroImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {}),
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              border: `2px solid ${colors.primary}33`,
              display: "grid",
              placeItems: "center",
              background: `${colors.primary}0D`,
            }}
          >
            <div
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 40,
                color: colors.primary,
                opacity: 0.6,
              }}
            >
              ✿
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 20,
              right: 24,
              fontSize: 11,
              color: colors.textSecondary,
              fontStyle: "italic",
            }}
          >
            Seasonal Collection 2026
          </div>
        </div>
      </section>

      {/* ── Trust Badges ── */}
      <section
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 40,
          padding: "32px 40px",
          borderTop: `1px solid ${colors.accent}`,
          borderBottom: `1px solid ${colors.accent}`,
          flexWrap: "wrap",
        }}
      >
        {[
          { icon: "♡", label: "Handpicked" },
          { icon: "✦", label: "Ethically Made" },
          { icon: "◇", label: "Free Shipping" },
          { icon: "☆", label: "Easy Returns" },
        ].map((badge, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: colors.textSecondary,
            }}
          >
            <span style={{ color: colors.primary, fontSize: 16 }}>
              {badge.icon}
            </span>
            <span style={{ fontWeight: 600, letterSpacing: "0.02em" }}>
              {badge.label}
            </span>
          </div>
        ))}
      </section>

      {/* ── Curated Collection ── */}
      <section style={{ padding: "56px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 30,
              fontWeight: 400,
              margin: "0 0 8px",
              color: colors.primary,
              fontStyle: "italic",
            }}
          >
            {texts.collectionHeading}
          </h2>
          <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0 }}>
            Pieces chosen for their craft and character
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 20,
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          {displayProducts.map((item) => (
            <div
              key={item.id}
              style={{
                borderRadius: 10,
                overflow: "hidden",
                border: `1px solid ${colors.accent}`,
                background: "#fff",
              }}
            >
              <div
                style={{
                  height: 200,
                  background: item.imageUrl
                    ? `url(${item.imageUrl}) center/cover no-repeat`
                    : `${colors.primary}0D`,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {!item.imageUrl && (
                  <div
                    style={{
                      fontFamily: "Georgia, serif",
                      fontSize: 28,
                      color: colors.primary,
                      opacity: 0.35,
                    }}
                  >
                    ✦
                  </div>
                )}
              </div>
              <div style={{ padding: "16px 18px" }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    marginBottom: 4,
                    color: colors.textPrimary,
                  }}
                >
                  {item.name}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: colors.secondary,
                    fontWeight: 500,
                    marginBottom: onAddToCart ? 10 : 0,
                  }}
                >
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: item.currency ?? "IDR",
                    maximumFractionDigits: 0,
                  }).format(item.price)}
                </div>
                {onAddToCart && (
                  <button
                    onClick={() => onAddToCart(item)}
                    style={{
                      width: "100%",
                      background: "transparent",
                      color: colors.primary,
                      border: `1px solid ${colors.primary}`,
                      borderRadius: 4,
                      padding: "6px 0",
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                      letterSpacing: "0.05em",
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

      {/* ── Testimonial ── */}
      <section
        style={{
          padding: "48px 40px",
          background: `${colors.primary}08`,
          textAlign: "center",
          borderTop: `1px solid ${colors.accent}`,
        }}
      >
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 48,
            color: colors.primary,
            opacity: 0.2,
            lineHeight: 1,
            marginBottom: 8,
          }}
        >
          "
        </div>
        <p
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 20,
            fontStyle: "italic",
            lineHeight: 1.6,
            maxWidth: 520,
            margin: "0 auto 16px",
            color: colors.textPrimary,
          }}
        >
          {texts.testimonialQuote}
        </p>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: colors.textSecondary,
            letterSpacing: "0.04em",
          }}
        >
          — A Happy Customer
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          padding: "28px 40px",
          borderTop: `1px solid ${colors.accent}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          color: colors.textSecondary,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span>© 2026 Boutique. All rights reserved.</span>
        <div
          style={{ display: "flex", gap: 20, fontSize: 12, fontWeight: 500 }}
        >
          <span>Privacy</span>
          <span>Terms</span>
          <span>Contact</span>
        </div>
      </footer>
    </div>
  );
}
