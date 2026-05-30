"use client";
import type { ClosingCtaSection } from "../landing-types";
import { Reveal } from "../primitives/reveal";

export function ClosingCta({
  headline,
  subtext,
  cta,
  note,
}: ClosingCtaSection) {
  return (
    <section
      style={{
        padding: "100px 40px",
        borderTop: "1px solid var(--border)",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Reveal>
          <h2
            style={{
              fontSize: "clamp(36px, 5vw, 56px)",
              fontWeight: 900,
              letterSpacing: "-2px",
              lineHeight: 1.08,
              color: "var(--ink)",
              marginBottom: 20,
            }}
          >
            {headline.map((line, i) => (
              <span key={i}>
                {line}
                {i < headline.length - 1 && <br />}
              </span>
            ))}
          </h2>
        </Reveal>

        <Reveal delay={90}>
          <p
            style={{
              fontSize: 18,
              color: "var(--muted)",
              lineHeight: 1.7,
              maxWidth: 480,
              margin: "0 auto 32px",
              whiteSpace: "pre-line",
            }}
          >
            {subtext}
          </p>
        </Reveal>

        <Reveal delay={180}>
          <a
            href={cta.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 56,
              padding: "0 36px",
              background: "var(--ink)",
              color: "#fff",
              borderRadius: "var(--r-pill)",
              fontSize: 16,
              fontWeight: 700,
              textDecoration: "none",
              transition: "background .15s, transform .15s, box-shadow .15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "#2a2a28";
              el.style.transform = "translateY(-2px)";
              el.style.boxShadow = "0 10px 36px rgba(0,0,0,.2)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "var(--ink)";
              el.style.transform = "translateY(0)";
              el.style.boxShadow = "none";
            }}
          >
            {cta.label}
          </a>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 16 }}>
            {note}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
