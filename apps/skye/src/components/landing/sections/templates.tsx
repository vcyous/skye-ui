"use client";
import type { TemplatesSection } from "../landing-types";
import { Reveal } from "../primitives/reveal";

function ModernPreview({ accent }: { accent: string }) {
  return (
    <div
      style={{
        background: "#fff",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #eee",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: "#111",
            letterSpacing: "-.3px",
          }}
        >
          MINIMAL
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{ width: 24, height: 3, background: accent, borderRadius: 2 }}
        />
      </div>
      <div
        style={{
          flex: 1,
          padding: "14px 12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 7,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: "#9ca3af",
            marginBottom: 5,
          }}
        >
          NEW ARRIVAL
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: "#111",
            letterSpacing: "-.5px",
            lineHeight: 1.1,
          }}
        >
          Fresh
          <br />
          Collection
        </div>
        <span
          style={{
            display: "inline-block",
            marginTop: 10,
            background: "#111",
            color: "#fff",
            fontSize: 8,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 4,
          }}
        >
          Shop Now
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 5,
          padding: 10,
          background: "#f5f5f3",
        }}
      >
        {["#e8d5c4", "#c8d8e8", "#d4c8e8"].map((c) => (
          <div key={c} style={{ height: 38, borderRadius: 4, background: c }} />
        ))}
      </div>
    </div>
  );
}

function BoldPreview({ accent }: { accent: string }) {
  return (
    <div
      style={{
        background: "#0f172a",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "9px 12px",
          background: "#1e293b",
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: ".5px",
          }}
        >
          BOLD
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{ width: 20, height: 20, background: accent, borderRadius: 4 }}
        />
      </div>
      <div
        style={{
          flex: 1,
          padding: "14px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: "#fff",
              lineHeight: 1.1,
              letterSpacing: "-.5px",
            }}
          >
            FASHION
            <br />
            BOLD
          </div>
          <span
            style={{
              display: "inline-block",
              marginTop: 8,
              background: accent,
              color: "#fff",
              fontSize: 8,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 9999,
            }}
          >
            Explore
          </span>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 4,
          padding: 10,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 34,
              borderRadius: 3,
              background: "rgba(255,255,255,.07)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ElegantPreview() {
  return (
    <div
      style={{
        background: "#fdf8f4",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "9px 12px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #e8d5bb",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#78350f",
            fontStyle: "italic",
            letterSpacing: ".3px",
          }}
        >
          Maison
        </span>
      </div>
      <div style={{ flex: 1, padding: "14px 12px" }}>
        <div
          style={{
            fontSize: 7,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: "#a8836a",
            marginBottom: 5,
          }}
        >
          KOLEKSI BARU
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#78350f",
            lineHeight: 1.2,
            fontStyle: "italic",
          }}
        >
          Elegance
          <br />
          Defined
        </div>
        <span
          style={{
            display: "inline-block",
            marginTop: 10,
            border: "1px solid #78350f",
            color: "#78350f",
            fontSize: 8,
            fontWeight: 600,
            padding: "3px 9px",
            borderRadius: 2,
          }}
        >
          Lihat Koleksi
        </span>
      </div>
      <div
        style={{ display: "flex", gap: 5, padding: 10, background: "#f5ede4" }}
      >
        {["#c4a882", "#a89070", "#d4b89c"].map((c) => (
          <div
            key={c}
            style={{ flex: 1, height: 42, borderRadius: 4, background: c }}
          />
        ))}
      </div>
    </div>
  );
}

function ChicoraPreview({ accent }: { accent: string }) {
  return (
    <div
      style={{
        background: "#991b1b",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "5px 12px", background: "#7f1d1d" }}>
        <span
          style={{
            fontSize: 8,
            color: "rgba(255,255,255,.6)",
            letterSpacing: 1,
          }}
        >
          GRAND OPENING
        </span>
      </div>
      <div
        style={{
          padding: "7px 12px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,.1)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: "#fff",
            fontFamily: "Georgia, serif",
            letterSpacing: ".3px",
          }}
        >
          CHICORA
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{ background: accent, width: 14, height: 14, borderRadius: 3 }}
        />
      </div>
      <div
        style={{
          flex: 1,
          padding: "14px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: "#fff",
            fontFamily: "Georgia, serif",
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          Premium
          <br />
          Fashion
        </div>
        <span
          style={{
            background: accent,
            color: "#fff",
            fontSize: 8,
            fontWeight: 700,
            padding: "4px 12px",
            borderRadius: 2,
          }}
        >
          Belanja
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 4,
          padding: 8,
          background: "rgba(0,0,0,.2)",
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 30,
              borderRadius: 2,
              background: "rgba(255,255,255,.12)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

const PREVIEW_MAP: Record<
  string,
  (props: { primary: string; accent: string }) => React.ReactNode
> = {
  modern: ({ accent }) => <ModernPreview accent={accent} />,
  bold: ({ accent }) => <BoldPreview accent={accent} />,
  elegant: ({ primary, accent }) => <ElegantPreview />,
  chicora: ({ accent }) => <ChicoraPreview accent={accent} />,
};

export function Templates({ eyebrow, heading, items }: TemplatesSection) {
  return (
    <section style={{ padding: "120px 0" }} id="templates">
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
          className="templates-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}
        >
          {items.map((item, i) => (
            <Reveal key={item.name} delay={i * 90}>
              <div
                style={{
                  borderRadius: "var(--r-card)",
                  overflow: "hidden",
                  border: "1.5px solid var(--border)",
                  transition:
                    "transform 0.22s var(--ease), box-shadow 0.22s var(--ease), border-color 0.22s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "scale(1.03)";
                  el.style.boxShadow = "0 12px 48px rgba(0,0,0,.1)";
                  el.style.borderColor = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = "scale(1)";
                  el.style.boxShadow = "none";
                  el.style.borderColor = "var(--border)";
                }}
              >
                <div
                  style={{
                    height: 200,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {PREVIEW_MAP[item.style]?.({
                    primary: item.primary,
                    accent: item.accent,
                  })}
                </div>
                <div style={{ padding: "14px 16px", background: "#fff" }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--ink)",
                      marginBottom: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {item.name}
                    {item.isNew && (
                      <span
                        style={{
                          background: "var(--accent)",
                          color: "#fff",
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 9999,
                        }}
                      >
                        Baru
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {item.style}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .templates-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 520px) {
          .templates-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
