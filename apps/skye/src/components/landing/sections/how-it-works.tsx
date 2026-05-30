import type { HowItWorksSection } from "../landing-types";
import { Reveal } from "../primitives/reveal";

export function HowItWorks({ eyebrow, heading, steps }: HowItWorksSection) {
  return (
    <section style={{ padding: "120px 0" }} id="how">
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 40px" }}>
        <Reveal>
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
              whiteSpace: "pre-line",
            }}
          >
            {heading}
          </h2>
        </Reveal>

        <div style={{ marginTop: 56 }}>
          <div
            className="steps-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 64px 1fr 64px 1fr",
              alignItems: "start",
            }}
          >
            {steps.map((step, i) => (
              <>
                <Reveal key={step.number} delay={i * 90}>
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r-card)",
                      padding: 32,
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        border: "2px solid var(--border)",
                        background: "var(--bg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                        fontWeight: 900,
                        color: "var(--ink)",
                        marginBottom: 20,
                      }}
                    >
                      {step.number}
                    </div>
                    <h3
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: "var(--ink)",
                        marginBottom: 10,
                        letterSpacing: "-.3px",
                      }}
                    >
                      {step.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 14,
                        color: "var(--muted)",
                        lineHeight: 1.7,
                        margin: 0,
                      }}
                    >
                      {step.description}
                    </p>
                  </div>
                </Reveal>
                {i < steps.length - 1 && (
                  <div
                    key={`connector-${i}`}
                    className="step-connector"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      paddingTop: 63,
                    }}
                  >
                    <div
                      style={{
                        height: 1,
                        width: "100%",
                        background:
                          "repeating-linear-gradient(90deg, var(--border) 0, var(--border) 5px, transparent 5px, transparent 11px)",
                      }}
                    />
                  </div>
                )}
              </>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .steps-grid {
            grid-template-columns: 1fr !important;
          }
          .step-connector {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}
