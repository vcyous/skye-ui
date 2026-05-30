import type React from "react";
import "../../app/landing.css";
import { LANDING_CONFIG } from "./landing-config";
import { LANDING_REGISTRY } from "./landing-registry";

export function LandingPage() {
  return (
    <>
      {LANDING_CONFIG.sections.map((section, i) => {
        const Component = LANDING_REGISTRY[section.type] as React.ComponentType<
          typeof section
        >;
        return <Component key={`${section.type}-${i}`} {...section} />;
      })}
    </>
  );
}
