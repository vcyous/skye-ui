import BoldCommerceTemplate from "./templates/BoldCommerceTemplate.jsx";
import ElegantBoutiqueTemplate from "./templates/ElegantBoutiqueTemplate.jsx";
import ModernMinimalTemplate from "./templates/ModernMinimalTemplate.jsx";

export const templateRegistry = [
  {
    id: "modern-minimal",
    name: "Boutique",
    description: "Clean lines, spacious layout, typography-focused design.",
    tag: "CLEAN & MINIMAL",
    category: "clean-minimal",
    gradientFrom: "#0D5C53",
    gradientTo: "#15803D",
    swatches: ["#0D5C53", "#FAFAFA", "#111827"],
    component: ModernMinimalTemplate,
    defaultConfig: {
      texts: {
        heroLayout: "split",
        heroEyebrow: "New this week",
        heroTitle: "Quiet things, made well.",
        heroSubtitle:
          "Small-batch goods from our studio to your home. We've been making these by hand since 2018 — nothing flashy, just lasting.",
        ctaButton: "Shop the collection",
        heroSecondaryButton: "Read our story",
        featuredHeading: "New arrivals",
      },
      colors: {
        primary: "#0D5C53",
        secondary: "#073A33",
        background: "#FAFAFA",
        accent: "#E8F3F1",
        textPrimary: "#111827",
        textSecondary: "#6B7280",
      },
      images: {
        logoUrl: "",
        heroImageUrl: "",
      },
      catalog: {
        collectionId: null,
        displayCount: 6,
        layout: "grid-3",
      },
    },
  },
  {
    id: "bold-commerce",
    name: "Maker",
    description:
      "Vibrant, high-contrast layout with bold typography and gradients.",
    tag: "BOLD & JOYFUL",
    category: "bold-joyful",
    gradientFrom: "#6C2BD9",
    gradientTo: "#D946EF",
    swatches: ["#6C2BD9", "#D946EF", "#0F0F14", "#FACC15"],
    component: BoldCommerceTemplate,
    defaultConfig: {
      texts: {
        heroLayout: "split",
        heroEyebrow: "Latest drop",
        heroTitle: "Unleash Your Style",
        heroSubtitle: "Bold pieces for those who dare to stand out",
        ctaButton: "Shop the Drop",
        heroSecondaryButton: "",
        featuredHeading: "Trending Now",
        newsletterHeading: "Join the Movement",
      },
      colors: {
        primary: "#6C2BD9",
        secondary: "#4C1D95",
        background: "#0F0F14",
        accent: "#FACC15",
        textPrimary: "#F8F8F2",
        textSecondary: "#A1A1AA",
      },
      images: {
        logoUrl: "",
        heroImageUrl: "",
      },
      catalog: {
        collectionId: null,
        displayCount: 6,
        layout: "grid-3",
      },
    },
  },
  {
    id: "elegant-boutique",
    name: "Atelier",
    description: "Sophisticated serif typography with muted, editorial tones.",
    tag: "EDITORIAL & DARK",
    category: "editorial-dark",
    gradientFrom: "#92400E",
    gradientTo: "#D97706",
    swatches: ["#78350F", "#FAF8F5", "#2D2A26", "#F3EDE4"],
    component: ElegantBoutiqueTemplate,
    defaultConfig: {
      texts: {
        heroLayout: "split",
        heroEyebrow: "Editor's pick",
        heroTitle: "Timeless Elegance, Reimagined",
        heroSubtitle: "Handpicked pieces that celebrate the art of living well",
        ctaButton: "Explore Collection",
        heroSecondaryButton: "Our story",
        collectionHeading: "Curated for You",
        testimonialQuote:
          "Every piece tells a story. This is where beauty meets intention.",
      },
      colors: {
        primary: "#78350F",
        secondary: "#92400E",
        background: "#FAF8F5",
        accent: "#F3EDE4",
        textPrimary: "#2D2A26",
        textSecondary: "#8C8579",
      },
      images: {
        logoUrl: "",
        heroImageUrl: "",
      },
      catalog: {
        collectionId: null,
        displayCount: 6,
        layout: "grid-3",
      },
    },
  },
];
