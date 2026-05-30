import type { StatsSection } from "../landing-types";
import { Counter } from "../primitives/counter";

export function Stats({ items }: StatsSection) {
  return (
    <div
      className="stats-section-wrap"
      style={{
        maxWidth: 1160,
        margin: "0 auto",
        padding: "0 40px",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        className="stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          padding: "80px 0",
        }}
      >
        {items.map((item, i) => (
          <div
            key={item.unit}
            style={{
              padding: "0 32px",
              borderRight:
                i < items.length - 1 ? "1px solid var(--border)" : "none",
              textAlign: "center",
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: 56,
                fontWeight: 900,
                color: "var(--ink)",
                letterSpacing: "-2px",
                lineHeight: 1,
              }}
            >
              {item.animateTo !== undefined ? (
                <Counter target={item.animateTo} suffix={item.suffix ?? ""} />
              ) : (
                item.value
              )}
            </span>
            <span
              style={{
                display: "block",
                fontSize: 13,
                color: "var(--muted)",
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              {item.unit}
            </span>
            <span
              style={{
                display: "block",
                fontSize: 14,
                color: "var(--muted)",
                marginTop: 10,
                lineHeight: 1.5,
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0;
          }
          .stats-grid > div {
            border-right: none !important;
            border-bottom: 1px solid var(--border);
            padding: 32px !important;
          }
          .stats-grid > div:nth-child(odd) {
            border-right: 1px solid var(--border) !important;
          }
          .stats-grid > div:last-child,
          .stats-grid > div:nth-last-child(2):nth-child(odd) {
            border-bottom: none !important;
          }
        }
        @media (max-width: 520px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
          .stats-grid > div {
            border-right: none !important;
          }
          .stats-grid > div:nth-child(odd) {
            border-right: none !important;
          }
          .stats-grid > div:last-child {
            border-bottom: none !important;
          }
        }
      `}</style>
    </div>
  );
}
