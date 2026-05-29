import type { ThemeConfig } from "./types";

/**
 * Default tokens — dipakai saat merchant belum pilih template
 * atau config_json kosong.
 */
export const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#1a1a1a",
  accent: "#3d5af1",
  fontHeading: "Inter",
  fontBody: "Inter",
  borderRadius: 8,
  cardStyle: "flat",
  heroLayout: "split",
};

/**
 * Mengubah ThemeConfig menjadi objek CSS custom properties.
 * Dipakai sebagai `style` prop pada elemen HTML.
 */
export function buildThemeVars(
  config: ThemeConfig | null | undefined,
): React.CSSProperties {
  const t = { ...DEFAULT_THEME, ...config };
  return {
    "--theme-primary": t.primaryColor,
    "--theme-accent": t.accent,
    "--theme-font-heading": t.fontHeading,
    "--theme-font-body": t.fontBody,
    "--theme-radius": `${t.borderRadius ?? 8}px`,
  } as React.CSSProperties;
}

/**
 * Mengambil heroLayout dari config, dengan fallback ke "split".
 */
export function getHeroLayout(
  config: ThemeConfig | null | undefined,
): "split" | "full-bleed" | "centered" {
  return config?.heroLayout ?? "split";
}

/**
 * Mengambil cardStyle dari config, dengan fallback ke "flat".
 */
export function getCardStyle(
  config: ThemeConfig | null | undefined,
): "flat" | "shadow" | "outlined" {
  return config?.cardStyle ?? "flat";
}
