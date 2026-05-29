import { CartBadge } from "@/components/cart-badge";
import type { Collection, Store, Theme } from "@/lib/types";
import Link from "next/link";

export function ChicoraShell({
  store,
  theme,
  collections,
  children,
}: {
  store: Store;
  theme: Theme | null;
  collections: Collection[];
  children: React.ReactNode;
}) {
  const primary = theme?.config_json?.primaryColor ?? "#991b1b";
  const accent = theme?.config_json?.accent ?? "#f97316";

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Row 1: Announcement bar ── */}
      <div
        className="w-full px-4 py-1.5 text-center text-xs font-medium text-white"
        style={{ backgroundColor: primary }}
      >
        Pengiriman ke seluruh Indonesia · Gratis ongkir min. Rp200.000
      </div>

      {/* ── Row 2: Main header (logo + search + cart) ── */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link
            href="/"
            className="shrink-0 text-xl font-bold tracking-tight sm:text-2xl"
            style={{ fontFamily: "Georgia, serif", color: primary }}
          >
            {store.name}
          </Link>
          {/* Search bar (visual only — tidak functional di MVP) */}
          <div className="mx-2 hidden flex-1 items-center gap-2 rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 sm:flex">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 shrink-0"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Cari produk...
          </div>
          <div className="ml-auto">
            <CartBadge />
          </div>
        </div>
      </div>

      {/* ── Row 3: Category navigation ── */}
      <nav className="sticky top-0 z-30 border-b border-zinc-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-4 py-2 text-sm">
          <span
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            ☰ Semua Kategori
          </span>
          <Link
            href="/"
            className="shrink-0 font-semibold hover:opacity-75"
            style={{ color: primary }}
          >
            Beranda
          </Link>
          <Link
            href="/katalog"
            className="shrink-0 text-zinc-600 hover:text-zinc-900"
          >
            Katalog
          </Link>
          {collections.slice(0, 6).map((col) => (
            <Link
              key={col.id}
              href={`/katalog?kategori=${col.slug}`}
              className="shrink-0 whitespace-nowrap text-zinc-600 hover:text-zinc-900"
            >
              {col.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4">
          {/* Brand column */}
          <div>
            <p
              className="text-lg font-bold"
              style={{ fontFamily: "Georgia, serif", color: primary }}
            >
              {store.name}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              {store.description ??
                "Toko online terpercaya dengan produk berkualitas."}
            </p>
            {store.contact_email && (
              <p className="mt-2 text-xs text-zinc-500">
                {store.contact_email}
              </p>
            )}
            {store.contact_phone && (
              <p className="mt-1 text-xs text-zinc-500">
                {store.contact_phone}
              </p>
            )}
          </div>
          {/* Link columns */}
          {(
            [
              {
                title: "Belanja",
                links: [
                  { label: "Semua Produk", href: "/katalog" },
                  { label: "Koleksi Baru", href: "/katalog?sort=newest" },
                  { label: "Promo", href: "/katalog?sort=sale" },
                ],
              },
              {
                title: "Bantuan",
                links: [
                  { label: "Cara Pemesanan", href: "#" },
                  { label: "Pengiriman", href: "#" },
                  { label: "Pengembalian", href: "#" },
                ],
              },
              {
                title: "Informasi",
                links: [
                  { label: "Tentang Kami", href: "#" },
                  { label: "Kebijakan Privasi", href: "#" },
                  { label: "Syarat & Ketentuan", href: "#" },
                ],
              },
            ] as const
          ).map(({ title, links }) => (
            <div key={title}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                {title}
              </p>
              <ul className="space-y-2">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-xs text-zinc-600 hover:text-zinc-900"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Footer bottom bar */}
        <div
          className="py-2 text-center text-xs text-white"
          style={{ backgroundColor: primary }}
        >
          © {new Date().getFullYear()} {store.name}. Powered by Skye.
        </div>
      </footer>
    </div>
  );
}
