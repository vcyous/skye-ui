import type { TestimonialsSection } from "../landing-types";
import { Reveal } from "../primitives/reveal";

export function Testimonials({ eyebrow, heading, items }: TestimonialsSection) {
  return (
    <section style={{ padding: "120px 0" }}>
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
                whiteSpace: "pre-line",
                margin: 0,
              }}
            >
              {heading}
            </h2>
          </div>
        </Reveal>

        <div
          className="testi-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 20,
          }}
        >
          {items.map((item, i) => (
            <Reveal key={item.name} delay={i * 90}>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-card)",
                  padding: 28,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 22,
                    left: 16,
                    fontSize: 64,
                    fontFamily: "Georgia, serif",
                    fontWeight: 900,
                    color: "var(--accent)",
                    opacity: 0.12,
                    lineHeight: 1,
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  "
                </span>
                <p
                  style={{
                    fontSize: 15,
                    color: "var(--ink)",
                    lineHeight: 1.65,
                    marginBottom: 20,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  "{item.quote}"
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    paddingTop: 18,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${item.avatarFrom}, ${item.avatarTo})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {item.initial}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--ink)",
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        marginTop: 1,
                      }}
                    >
                      {item.handle}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .testi-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
