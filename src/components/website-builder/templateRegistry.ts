import ModernMinimalTemplate from "./templates/ModernMinimalTemplate.jsx";
import BoldCommerceTemplate from "./templates/BoldCommerceTemplate.jsx";
import ElegantBoutiqueTemplate from "./templates/ElegantBoutiqueTemplate.jsx";

/**
 * Template Registry
 *
 * To add a new template:
 *   1. Create a component in ./templates/ that accepts { config } props
 *   2. Add an entry to this array
 *
 * @typedef {Object} TemplateEntry
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} gradientFrom  — gradient start color for the thumbnail card
 * @property {string} gradientTo    — gradient end color for the thumbnail card
 * @property {React.ComponentType<{ config: { texts: Record<string, string>, colors: Record<string, string> } }>} component
 * @property {{ texts: Record<string, string>, colors: Record<string, string> }} defaultConfig
 */

/** @type {TemplateEntry[]} */
export const templateRegistry = [
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Clean lines, spacious layout, typography-focused design.",
    gradientFrom: "#0D5C53",
    gradientTo: "#15803D",
    component: ModernMinimalTemplate,
    defaultConfig: {
      texts: {
        heroTitle: "Discover Our Collection",
        heroSubtitle: "Curated essentials for modern living",
        ctaButton: "Shop Now",
        featuredHeading: "Featured Products",
      },
      colors: {
        primary: "#0D5C53",
        secondary: "#073A33",
        background: "#FAFAFA",
        accent: "#E8F3F1",
        textPrimary: "#111827",
        textSecondary: "#6B7280",
      },
    },
  },
  {
    id: "bold-commerce",
    name: "Bold Commerce",
    description: "Vibrant, high-contrast layout with bold typography and gradients.",
    gradientFrom: "#6C2BD9",
    gradientTo: "#D946EF",
    component: BoldCommerceTemplate,
    defaultConfig: {
      texts: {
        heroTitle: "Unleash Your Style",
        heroSubtitle: "Bold pieces for those who dare to stand out",
        ctaButton: "Shop the Drop",
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
    },
  },
  {
    id: "elegant-boutique",
    name: "Elegant Boutique",
    description: "Sophisticated serif typography with muted, editorial tones.",
    gradientFrom: "#92400E",
    gradientTo: "#D97706",
    component: ElegantBoutiqueTemplate,
    defaultConfig: {
      texts: {
        heroTitle: "Timeless Elegance, Reimagined",
        heroSubtitle: "Handpicked pieces that celebrate the art of living well",
        ctaButton: "Explore Collection",
        collectionHeading: "Curated for You",
        testimonialQuote: "Every piece tells a story. This is where beauty meets intention.",
      },
      colors: {
        primary: "#78350F",
        secondary: "#92400E",
        background: "#FAF8F5",
        accent: "#F3EDE4",
        textPrimary: "#2D2A26",
        textSecondary: "#8C8579",
      },
    },
  },
];
