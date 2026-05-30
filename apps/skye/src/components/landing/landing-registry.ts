import type React from "react";
import type { LandingSection } from "./landing-types";
import { ClosingCta } from "./sections/closing-cta";
import { Features } from "./sections/features";
import { Footer } from "./sections/footer";
import { Hero } from "./sections/hero";
import { HowItWorks } from "./sections/how-it-works";
import { Marquee } from "./sections/marquee";
import { Navbar } from "./sections/navbar";
import { Pricing } from "./sections/pricing";
import { Stats } from "./sections/stats";
import { Templates } from "./sections/templates";
import { Testimonials } from "./sections/testimonials";

type AnyComponent = React.ComponentType<any>;

export const LANDING_REGISTRY: Record<LandingSection["type"], AnyComponent> = {
  navbar: Navbar,
  hero: Hero,
  marquee: Marquee,
  "how-it-works": HowItWorks,
  features: Features,
  stats: Stats,
  templates: Templates,
  pricing: Pricing,
  testimonials: Testimonials,
  "closing-cta": ClosingCta,
  footer: Footer,
};
