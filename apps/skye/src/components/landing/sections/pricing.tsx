"use client";
import type { PricingSection } from "../landing-types";
import { Reveal } from "../primitives/reveal";

export function Pricing({
  eyebrow,
  heading,
  planName,
  priceLabel,
  note,
  features,
  cta,
  upgradeNote,
}: PricingSection) {
  return (
    <section style={{ padding: "120px 0" }} id="pricing">
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 40px" }}>
        <Reveal>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
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
                margin: 0,
              }}
            >
              {heading}
            </h2>
          </div>
        </Reveal>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <Reveal>
            <div
              style={{
                border: "2px solid var(--ink)",
                borderRadius: 20,
                padding: 40,
                maxWidth: 480,
                width: "100%",
                boxShadow: "0 16px 48px rgba(0,0,0,.1)",
                background: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{ fontSize: 20, fontWeight: 900, color: "var(--ink)" }}
                >
                  {planName}
                </span>
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 900,
                    color: "var(--ink)",
                    letterSpacing: "-1px",
                  }}
                >
                  {priceLabel}
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  marginBottom: 28,
                }}
              >
                {note}
              </p>

              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid var(--border)",
                  margin: "24px 0",
                }}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 32,
                }}
              >
                {features.map((feat) => (
                  <div
                    key={feat}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "var(--ink)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      ✓
                    </span>
                    <span style={{ fontSize: 14, color: "var(--ink)" }}>
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              <a
                href={cta.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: 52,
                  background: "var(--ink)",
                  color: "#fff",
                  borderRadius: "var(--r-pill)",
                  fontSize: 16,
                  fontWeight: 700,
                  textDecoration: "none",
                  transition: "background .15s, transform .15s",
                  marginBottom: 16,
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "#2a2a28";
                  el.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "var(--ink)";
                  el.style.transform = "translateY(0)";
                }}
              >
                {cta.label}
              </a>

              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                <a
                  href="#"
                  style={{
                    color: "var(--accent)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  {upgradeNote}
                </a>
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
