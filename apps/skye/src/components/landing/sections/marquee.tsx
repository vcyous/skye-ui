import type { MarqueeSection } from "../landing-types";
import { LOGOS } from "../logos";
import { MarqueeTrack } from "../primitives/marquee-track";

export function Marquee({ label, logoIds }: MarqueeSection) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 32,
        padding: "20px 40px",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--muted)",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <MarqueeTrack>
        {logoIds.map((id) => (
          <span key={id} style={{ display: "flex", alignItems: "center" }}>
            {LOGOS[id]}
          </span>
        ))}
      </MarqueeTrack>
    </div>
  );
}
