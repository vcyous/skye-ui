import { ChicoraShell } from "@/components/chicora/chicora-shell";
import { StorefrontShell } from "@/components/storefront-shell";
import { CartProvider } from "@/lib/cart";
import {
  getCollectionsByStore,
  getStoreBySlug,
  getThemeByStore,
} from "@/lib/store";
import { buildThemeVars } from "@/lib/theme";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Skye Storefront",
  description: "Multi-tenant merchant storefront on Skye.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const h = await headers();
  const slug = h.get("x-store-slug");
  const store = slug ? await getStoreBySlug(slug) : null;
  const theme = store ? await getThemeByStore(store.id, store.slug) : null;
  const themeVars = buildThemeVars(theme?.config_json);

  const isChicora = theme?.template_slug === "chicora";
  const collections =
    store && isChicora ? await getCollectionsByStore(store.id, store.slug) : [];

  return (
    <html
      lang="id"
      {...(isChicora ? { "data-template": "chicora" } : {})}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        style={themeVars}
        className={`min-h-full bg-white text-zinc-900${isChicora ? "" : " dark:bg-zinc-950 dark:text-zinc-100"}`}
      >
        {store ? (
          <CartProvider storeSlug={store.slug}>
            {isChicora ? (
              <ChicoraShell
                store={store}
                theme={theme}
                collections={collections}
              >
                {children}
              </ChicoraShell>
            ) : (
              <StorefrontShell store={store} theme={theme}>
                {children}
              </StorefrontShell>
            )}
          </CartProvider>
        ) : (
          <div className="flex min-h-screen flex-col">{children}</div>
        )}
      </body>
    </html>
  );
}
