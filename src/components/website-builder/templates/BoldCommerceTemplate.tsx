interface TemplateConfig { texts: Record<string, string>; colors: Record<string, string> }
export default function BoldCommerceTemplate({ config }: { config: TemplateConfig }) {
  const { texts, colors } = config;

  return (
    <div style={{ background: colors.background || "#0F0F14", color: colors.textPrimary || "#F8F8F2", fontFamily: "'Manrope', sans-serif", minHeight: "100%" }}>
      {/* ── Header ── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 36px", background: `${colors.primary}18`, backdropFilter: "blur(8px)", borderBottom: `1px solid ${colors.primary}33` }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 20, color: colors.accent, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          BOLD
        </span>
        <div style={{ display: "flex", gap: 24, fontSize: 13, fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <span>New</span>
          <span>Sale</span>
          <span>Collections</span>
          <span>About</span>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 13, color: colors.textSecondary }}>
          <span>🔍</span>
          <span>👤</span>
          <span>🛒</span>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ padding: "80px 36px", background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: `${colors.accent}15` }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: `${colors.accent}10` }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-block", padding: "6px 18px", borderRadius: 20, background: `${colors.accent}22`, color: colors.accent, fontSize: 12, fontWeight: 700, marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            ★ New Season
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 52, fontWeight: 800, lineHeight: 1.05, color: "#fff", margin: "0 0 16px", maxWidth: 600, marginInline: "auto" }}>
            {texts.heroTitle}
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "rgba(255,255,255,0.75)", margin: "0 0 32px", maxWidth: 480, marginInline: "auto" }}>
            {texts.heroSubtitle}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={{ background: colors.accent, color: colors.primary, border: "none", padding: "14px 36px", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {texts.ctaButton}
            </button>
            <button style={{ background: "transparent", color: "#fff", border: "2px solid rgba(255,255,255,0.3)", padding: "14px 36px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
              View Lookbook
            </button>
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section style={{ padding: "40px 36px", display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
        {["Streetwear", "Sneakers", "Accessories", "Limited Edition"].map((cat, i) => (
          <div key={i} style={{ padding: "10px 22px", borderRadius: 24, background: `${colors.primary}22`, color: colors.accent, fontSize: 13, fontWeight: 700, border: `1px solid ${colors.primary}44`, letterSpacing: "0.02em" }}>
            {cat}
          </div>
        ))}
      </section>

      {/* ── Featured Products ── */}
      <section style={{ padding: "20px 36px 60px" }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 800, textAlign: "center", margin: "0 0 36px", color: colors.accent }}>
          {texts.featuredHeading}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 960, margin: "0 auto" }}>
          {[
            { name: "Urban Jacket", price: "$129", tag: "HOT" },
            { name: "Tech Runner", price: "$94", tag: "NEW" },
            { name: "Grip Watch", price: "$210", tag: "LTD" },
          ].map((item, i) => (
            <div key={i} style={{ borderRadius: 14, overflow: "hidden", background: `${colors.primary}15`, border: `1px solid ${colors.primary}33`, position: "relative" }}>
              <div style={{ position: "absolute", top: 12, left: 12, padding: "4px 10px", borderRadius: 6, background: colors.accent, color: colors.primary, fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>
                {item.tag}
              </div>
              <div style={{ height: 190, background: `linear-gradient(145deg, ${colors.primary}22, ${colors.secondary}22)`, display: "grid", placeItems: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: `${colors.accent}22`, display: "grid", placeItems: "center", fontSize: 20, color: colors.accent }}>
                  ◆
                </div>
              </div>
              <div style={{ padding: "14px 18px" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: colors.textPrimary }}>{item.name}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: colors.accent, fontWeight: 800, fontSize: 16 }}>{item.price}</span>
                  <button style={{ background: `${colors.accent}22`, color: colors.accent, border: `1px solid ${colors.accent}44`, padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section style={{ padding: "48px 36px", background: `${colors.primary}18`, textAlign: "center", borderTop: `1px solid ${colors.primary}33` }}>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, margin: "0 0 8px", color: colors.accent }}>
          {texts.newsletterHeading}
        </h3>
        <p style={{ fontSize: 14, color: colors.textSecondary, margin: "0 0 20px" }}>Get early access to drops and exclusive offers.</p>
        <div style={{ display: "flex", gap: 10, maxWidth: 400, margin: "0 auto" }}>
          <div style={{ flex: 1, padding: "10px 16px", borderRadius: 8, background: `${colors.primary}22`, border: `1px solid ${colors.primary}44`, color: colors.textSecondary, fontSize: 13 }}>
            your@email.com
          </div>
          <button style={{ background: colors.accent, color: colors.primary, border: "none", padding: "10px 24px", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
            Subscribe
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "24px 36px", textAlign: "center", fontSize: 12, color: colors.textSecondary, borderTop: `1px solid ${colors.primary}22` }}>
        © 2026 Bold Commerce. All rights reserved.
      </footer>
    </div>
  );
}
