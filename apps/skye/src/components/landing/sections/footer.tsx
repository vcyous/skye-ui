"use client";
import type { FooterSection } from "../landing-types";

export function Footer({
  tagline,
  url,
  socials,
  columns,
  copyright,
  madeIn,
}: FooterSection) {
  return (
    <footer
      style={{
        background: "var(--surface-2)",
        borderTop: "1px solid var(--border)",
        padding: "60px 40px 32px",
      }}
    >
      <div
        className="footer-grid"
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 48,
          marginBottom: 48,
        }}
      >
        {/* Brand col */}
        <div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: "var(--accent)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
              }}
            >
              ◈
            </span>
            Skye
          </div>
          <p
            style={{
              fontSize: 14,
              color: "var(--muted)",
              lineHeight: 1.7,
              maxWidth: 220,
              marginBottom: 8,
            }}
          >
            {tagline}
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
            {url}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--muted)",
                  textDecoration: "none",
                  transition: "border-color .15s, color .15s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.borderColor = "var(--ink)";
                  el.style.color = "var(--ink)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.borderColor = "var(--border)";
                  el.style.color = "var(--muted)";
                }}
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        {/* Link cols */}
        {columns.map((col) => (
          <div key={col.title}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".6px",
                color: "var(--muted)",
                marginBottom: 16,
              }}
            >
              {col.title}
            </p>
            <ul
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: 0,
                margin: 0,
              }}
            >
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    style={{
                      fontSize: 14,
                      color: "var(--muted)",
                      textDecoration: "none",
                      transition: "color .15s",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.color =
                        "var(--ink)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.color =
                        "var(--muted)")
                    }
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          borderTop: "1px solid var(--border)",
          paddingTop: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{copyright}</span>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{madeIn}</span>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}
