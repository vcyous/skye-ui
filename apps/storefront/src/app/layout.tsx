import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/lib/cart";
import { getStoreBySlug } from "@/lib/store";
import { StorefrontShell } from "@/components/storefront-shell";
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

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {store ? (
          <CartProvider storeSlug={store.slug}>
            <StorefrontShell store={store}>{children}</StorefrontShell>
          </CartProvider>
        ) : (
          <div className="flex min-h-screen flex-col">{children}</div>
        )}
      </body>
    </html>
  );
}
