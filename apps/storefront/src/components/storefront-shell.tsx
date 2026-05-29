import Link from "next/link";
import type { Store, Theme } from "@/lib/types";
import { CartBadge } from "./cart-badge";

export function StorefrontShell({
  store,
  theme,
  children,
}: {
  store: Store;
  theme: Theme | null;
  children: React.ReactNode;
}) {
  const headingFont = theme?.config_json?.fontHeading ?? "Inter";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/"
            className="truncate text-base font-semibold"
            style={{ color: "var(--theme-primary)", fontFamily: headingFont }}
          >
            {store.name}
          </Link>
          <nav className="hidden gap-5 text-sm sm:flex">
            <Link
              href="/"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Beranda
            </Link>
            <Link
              href="/katalog"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Katalog
            </Link>
          </nav>
          <CartBadge />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} {store.name}. Powered by Skye.
          {store.contact_email && (
            <span className="ml-2 hidden sm:inline">· {store.contact_email}</span>
          )}
        </div>
      </footer>
    </div>
  );
}
