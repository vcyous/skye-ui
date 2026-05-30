"use client";

import { useEffect, useState } from "react";
import type { HeroSection } from "../landing-types";

function BrowserMockup() {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="hero-animate mockup" style={{ perspective: 1200 }}>
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          border: "1px solid var(--border)",
          boxShadow: "0 24px 80px rgba(0,0,0,.12), 0 4px 20px rgba(0,0,0,.06)",
          transform: hovered
            ? "perspective(1200px) rotateY(-2deg) rotateX(1deg)"
            : "perspective(1200px) rotateY(-6deg) rotateX(2deg)",
          transition: "transform 0.3s var(--ease)",
          overflow: "hidden",
          position: "relative",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Browser bar */}
        <div
          style={{
            background: "var(--surface-2)",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#ff5f57",
                display: "block",
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#febc2e",
                display: "block",
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#28c840",
                display: "block",
              }}
            />
          </div>
          <div
            style={{
              flex: 1,
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "4px 10px",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span style={{ color: "var(--accent)", fontSize: 11 }}>◈</span>
            <span
              style={{
                fontSize: 11,
                color: "var(--muted)",
                fontFamily: "monospace",
              }}
            >
              skye.studio/toko-cantik
            </span>
          </div>
        </div>

        {/* Mini storefront */}
        <div
          style={{
            background: "#111",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>
            TOKO·CANTIK
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,.45)" }}>
            Koleksi
          </span>
          <span
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,.45)",
              marginLeft: 8,
            }}
          >
            Tentang
          </span>
          <span
            style={{
              background: "var(--accent)",
              width: 24,
              height: 24,
              borderRadius: 6,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              marginLeft: 10,
              position: "relative",
            }}
          >
            🛒
            <span
              style={{
                position: "absolute",
                top: -3,
                right: -3,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#22c55e",
                border: "1.5px solid #111",
              }}
            />
          </span>
        </div>

        <div
          style={{
            background: "linear-gradient(135deg, #1a1a2e, #0f3460)",
            padding: "14px 16px",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 8,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "rgba(255,255,255,.5)",
                marginBottom: 5,
              }}
            >
              KOLEKSI TERBARU
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: "#fff",
                lineHeight: 1.15,
                letterSpacing: "-.5px",
              }}
            >
              Batik Modern
              <br />
              2025
            </div>
            <a
              href="#"
              style={{
                display: "inline-block",
                marginTop: 10,
                background: "var(--accent)",
                color: "#fff",
                fontSize: 9,
                fontWeight: 700,
                padding: "5px 12px",
                borderRadius: 9999,
                textDecoration: "none",
              }}
            >
              Belanja Sekarang
            </a>
          </div>
          <div
            style={{
              width: 76,
              height: 68,
              borderRadius: 8,
              background: "linear-gradient(145deg, #533483, #e94560)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 6,
                background: "rgba(255,255,255,.2)",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            padding: "12px 16px",
            background: "var(--surface-2)",
          }}
        >
          {[
            { bg: "#c97b63", label: "Terracotta" },
            { bg: "#9caa8e", label: "Sage" },
            { bg: "#d4b896", label: "Sand" },
            { bg: "#7a8fa6", label: "Steel" },
          ].map((p) => (
            <div
              key={p.label}
              style={{
                background: "#fff",
                borderRadius: 6,
                overflow: "hidden",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{ height: 50, background: p.bg, position: "relative" }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: 3,
                    background: "#dc2626",
                    color: "#fff",
                    fontSize: 6,
                    fontWeight: 700,
                    padding: "1px 4px",
                    borderRadius: 3,
                  }}
                >
                  NEW
                </span>
              </div>
              <div style={{ padding: "5px 6px" }}>
                <div
                  style={{
                    fontSize: 8,
                    color: "var(--muted)",
                    marginBottom: 2,
                  }}
                >
                  {p.label}
                </div>
                <div
                  style={{ fontSize: 9, fontWeight: 800, color: "var(--ink)" }}
                >
                  Rp 185k
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Live badge */}
        <div
          style={{
            position: "absolute",
            bottom: 14,
            right: -12,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 9999,
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "var(--shadow-md)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--ink)",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22c55e",
              animation: "live-pulse 2s infinite",
              flexShrink: 0,
            }}
          />
          Live
        </div>
      </div>
    </div>
  );
}

export function Hero({
  eyebrow,
  headline,
  subtext,
  primaryCta,
  secondaryCta,
}: HeroSection) {
  const [landed, setLanded] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);

  useEffect(() => {
    const delays = [100, 220, 340, 460, 600];
    delays.forEach((delay, i) => {
      setTimeout(() => {
        setLanded((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, delay);
    });
  }, []);

  return (
    <section
      style={{
        minHeight: "calc(100vh - 60px)",
        display: "flex",
        alignItems: "center",
        padding: "80px 0 60px",
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          padding: "0 40px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "center",
          }}
          className="hero-grid"
        >
          {/* Left */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div
              className={`hero-animate${landed[0] ? " landed" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 9999,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--muted)",
                boxShadow: "var(--shadow-sm)",
                alignSelf: "flex-start",
              }}
            >
              <span style={{ color: "var(--accent)" }}>✦</span>
              {eyebrow.replace("✦ ", "")}
            </div>

            <h1
              className={`hero-animate${landed[1] ? " landed" : ""}`}
              style={{
                fontSize: "clamp(44px, 5.5vw, 68px)",
                fontWeight: 900,
                letterSpacing: "-2.5px",
                lineHeight: 1.05,
                color: "var(--ink)",
                margin: 0,
              }}
            >
              {headline.map((line, i) => (
                <span key={i}>
                  {line}
                  {i < headline.length - 1 && <br />}
                </span>
              ))}
            </h1>

            <p
              className={`hero-animate${landed[2] ? " landed" : ""}`}
              style={{
                fontSize: 18,
                fontWeight: 400,
                color: "var(--muted)",
                lineHeight: 1.7,
                maxWidth: 460,
                margin: 0,
              }}
            >
              {subtext}
            </p>

            <div
              className={`hero-animate${landed[3] ? " landed" : ""}`}
              style={{
                display: "flex",
                gap: 4,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <a
                href={primaryCta.href}
                style={{
                  background: "var(--ink)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  padding: "14px 28px",
                  borderRadius: "var(--r-pill)",
                  textDecoration: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,.15)",
                  transition:
                    "background .15s, transform .15s, box-shadow .15s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "#2a2a28";
                  el.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "var(--ink)";
                  el.style.transform = "translateY(0)";
                }}
              >
                {primaryCta.label}
              </a>
              <a
                href={secondaryCta.href}
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: "var(--muted)",
                  textDecoration: "none",
                  padding: "14px 16px",
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
                {secondaryCta.label}
              </a>
            </div>
          </div>

          {/* Right — Browser Mockup */}
          <div
            className={`hero-animate mockup${landed[4] ? " landed" : ""}`}
            style={{ display: "flex", justifyContent: "center" }}
          >
            <BrowserMockup />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
