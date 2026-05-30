"use client";
import type { FeaturesSection } from "../landing-types";
import { Reveal } from "../primitives/reveal";

export function Features({
  eyebrow,
  heading,
  subtext,
  items,
}: FeaturesSection) {
  return (
    <section style={{ padding: "120px 0" }} id="features">
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 40px" }}>
        <Reveal>
          <div style={{ maxWidth: 600, marginBottom: 56 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".8px",
                color: "var(--accent)",
                marginBottom: 12,
              }}
            >
              {eyebrow}
            </p>
            <h2
              style={{
                fontSize: "clamp(32px, 4vw, 48px)",
                fontWeight: 900,
                letterSpacing: "-1.5px",
                lineHeight: 1.1,
                color: "var(--ink)",
                marginBottom: 16,
                whiteSpace: "pre-line",
              }}
            >
              {heading}
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "var(--muted)",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {subtext}
            </p>
          </div>
        </Reveal>

        <div
          className="features-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {items.map((item, i) => (
            <Reveal key={item.title} delay={i * 90}>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-card)",
                  padding: 28,
                  transition:
                    "transform 0.22s var(--ease), box-shadow 0.22s var(--ease)",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "translateY(-4px)";
                  el.style.boxShadow = "0 8px 32px rgba(0,0,0,.08)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "translateY(0)";
                  el.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: item.iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    marginBottom: 16,
                  }}
                >
                  {item.icon}
                </div>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--ink)",
                    marginBottom: 8,
                    letterSpacing: "-.2px",
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {item.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .features-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
