import Link from "next/link";
import type { Store } from "@/lib/types";
import { CartBadge } from "./cart-badge";

export function StorefrontShell({
  store,
  children,
}: {
  store: Store;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="truncate text-base font-semibold">
            {store.name}
          </Link>
          <nav className="hidden gap-5 text-sm sm:flex">
            <Link href="/" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              Beranda
            </Link>
            <Link href="/katalog" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
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
