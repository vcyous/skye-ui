interface TemplateConfig { texts: Record<string, string>; colors: Record<string, string> }
export default function ModernMinimalTemplate({ config }: { config: TemplateConfig }) {
  const { texts, colors } = config;

  const cssVars = {
    "--tpl-primary": colors.primary || "#0D5C53",
    "--tpl-secondary": colors.secondary || "#073A33",
    "--tpl-bg": colors.background || "#FAFAFA",
    "--tpl-accent": colors.accent || "#E8F3F1",
    "--tpl-text": colors.textPrimary || "#111827",
    "--tpl-text-muted": colors.textSecondary || "#6B7280",
  };

  return (
    <div className="tpl-modern" style={{ ...cssVars, background: cssVars["--tpl-bg"], color: cssVars["--tpl-text"], fontFamily: "'Manrope', sans-serif", minHeight: "100%" }}>
      {/* ── Navigation ── */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: `1px solid ${colors.accent}` }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: colors.primary, letterSpacing: "-0.02em" }}>
          STORE
        </span>
        <div style={{ display: "flex", gap: 28, fontSize: 14, fontWeight: 600, color: colors.textSecondary }}>
          <span>Shop</span>
          <span>About</span>
          <span>Contact</span>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 13, color: colors.textSecondary }}>
          <span>Search</span>
          <span>Cart (0)</span>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: "80px 40px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 700, lineHeight: 1.1, color: colors.primary, margin: "0 0 20px" }}>
          {texts.heroTitle}
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.6, color: colors.textSecondary, margin: "0 0 36px" }}>
          {texts.heroSubtitle}
        </p>
        <button style={{ background: colors.primary, color: "#fff", border: "none", padding: "14px 40px", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.02em", boxShadow: `0 4px 14px ${colors.primary}33` }}>
          {texts.ctaButton}
        </button>
      </section>

      {/* ── Divider ── */}
      <div style={{ width: 60, height: 2, background: colors.accent, margin: "0 auto 40px" }} />

      {/* ── Featured Products ── */}
      <section style={{ padding: "0 40px 60px" }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, textAlign: "center", margin: "0 0 40px", color: colors.secondary }}>
          {texts.featuredHeading}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 960, margin: "0 auto" }}>
          {[
            { name: "Essential Tee", price: "$42", bg: `${colors.primary}11` },
            { name: "Canvas Bag", price: "$68", bg: `${colors.accent}` },
            { name: "Ceramic Mug", price: "$24", bg: `${colors.primary}0A` },
          ].map((product, i) => (
            <div key={i} style={{ borderRadius: 12, overflow: "hidden", background: "#fff", border: `1px solid ${colors.accent}`, transition: "box-shadow 0.2s" }}>
              <div style={{ height: 200, background: product.bg, display: "grid", placeItems: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${colors.primary}22`, display: "grid", placeItems: "center", fontSize: 24 }}>
                  ✦
                </div>
              </div>
              <div style={{ padding: "16px 20px" }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{product.name}</div>
                <div style={{ color: colors.primary, fontWeight: 600, fontSize: 14 }}>{product.price}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "28px 40px", borderTop: `1px solid ${colors.accent}`, textAlign: "center", fontSize: 13, color: colors.textSecondary }}>
        © 2026 Store. All rights reserved.
      </footer>
    </div>
  );
}
