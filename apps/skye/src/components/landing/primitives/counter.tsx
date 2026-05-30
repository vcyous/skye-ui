"use client";

import { useEffect, useRef, useState } from "react";

interface CounterProps {
  target: number;
  suffix?: string;
  className?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function Counter({ target, suffix = "", className }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const triggered = useRef(false);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !triggered.current) {
            triggered.current = true;
            observer.unobserve(entry.target);

            const duration = 1800;
            const startTime = performance.now();

            const tick = (now: number) => {
              const elapsed = now - startTime;
              const t = Math.min(elapsed / duration, 1);
              const eased = easeOutCubic(t);
              const current = Math.round(eased * target);
              setDisplay(new Intl.NumberFormat("id-ID").format(current));
              if (t < 1) requestAnimationFrame(tick);
              else setDisplay(new Intl.NumberFormat("id-ID").format(target));
            };

            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}
