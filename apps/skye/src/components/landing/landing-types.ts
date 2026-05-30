export type NavbarSection = {
  type: "navbar";
  logoText: string;
  links: { label: string; href: string }[];
  ghostCta: { label: string; href: string };
  primaryCta: { label: string; href: string };
};

export type HeroSection = {
  type: "hero";
  eyebrow: string;
  headline: string[];
  subtext: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
};

export type MarqueeSection = {
  type: "marquee";
  label: string;
  logoIds: string[];
};

export type HowItWorksSection = {
  type: "how-it-works";
  eyebrow: string;
  heading: string;
  steps: { number: number; title: string; description: string }[];
};

export type FeaturesSection = {
  type: "features";
  eyebrow: string;
  heading: string;
  subtext: string;
  items: { icon: string; iconBg: string; title: string; description: string }[];
};

export type StatsSection = {
  type: "stats";
  items: {
    value: string;
    animateTo?: number;
    suffix?: string;
    unit: string;
    label: string;
  }[];
};

export type TemplatesSection = {
  type: "templates";
  eyebrow: string;
  heading: string;
  items: {
    name: string;
    primary: string;
    accent: string;
    style: string;
    isNew?: boolean;
  }[];
};

export type PricingSection = {
  type: "pricing";
  eyebrow: string;
  heading: string;
  planName: string;
  priceLabel: string;
  note: string;
  features: string[];
  cta: { label: string; href: string };
  upgradeNote: string;
};

export type TestimonialsSection = {
  type: "testimonials";
  eyebrow: string;
  heading: string;
  items: {
    initial: string;
    avatarFrom: string;
    avatarTo: string;
    name: string;
    handle: string;
    quote: string;
  }[];
};

export type ClosingCtaSection = {
  type: "closing-cta";
  headline: string[];
  subtext: string;
  cta: { label: string; href: string };
  note: string;
};

export type FooterSection = {
  type: "footer";
  tagline: string;
  url: string;
  socials: { label: string; href: string }[];
  columns: { title: string; links: { label: string; href: string }[] }[];
  copyright: string;
  madeIn: string;
};

export type LandingSection =
  | NavbarSection
  | HeroSection
  | MarqueeSection
  | HowItWorksSection
  | FeaturesSection
  | StatsSection
  | TemplatesSection
  | PricingSection
  | TestimonialsSection
  | ClosingCtaSection
  | FooterSection;

export type LandingConfig = { sections: LandingSection[] };
