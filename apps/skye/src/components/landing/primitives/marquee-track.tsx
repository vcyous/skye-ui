"use client";

interface MarqueeTrackProps {
  children: React.ReactNode;
}

export function MarqueeTrack({ children }: MarqueeTrackProps) {
  return (
    <div
      style={{
        overflow: "hidden",
        flex: 1,
        maskImage:
          "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
      }}
    >
      <div className="landing-marquee-track">
        {children}
        {children}
      </div>
    </div>
  );
}
