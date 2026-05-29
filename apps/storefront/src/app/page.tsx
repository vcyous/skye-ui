import { formatPrice } from "@/lib/format";
import {
  getProductsByStore,
  getStoreBySlug,
  getThemeByStore,
} from "@/lib/store";
import { getHeroLayout } from "@/lib/theme";
import type { Product } from "@/lib/types";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function StoreHomePage() {
  const h = await headers();
  const slug = h.get("x-store-slug");
  if (!slug) notFound();

  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  const [products, theme] = await Promise.all([
    getProductsByStore(store.id, store.slug, { sort: "newest", limit: 8 }),
    getThemeByStore(store.id, store.slug),
  ]);

  const heroLayout = getHeroLayout(theme?.config_json);
  const heroImage = (store.settings as Record<string, unknown> | null)
    ?.heroImageUrl as string | undefined;

  return (
    <>
      <HeroSection
        name={store.name}
        description={store.description}
        heroLayout={heroLayout}
        heroImage={heroImage ?? null}
      />

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-semibold">Terbaru</h2>
          {products.length > 0 && (
            <Link
              href="/katalog"
              className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Semua produk →
            </Link>
          )}
        </div>

        {products.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Belum ada produk. Cek kembali nanti.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hero variants                                                        */
/* ------------------------------------------------------------------ */

function HeroSection({
  name,
  description,
  heroLayout,
  heroImage,
}: {
  name: string;
  description: string | null;
  heroLayout: "split" | "full-bleed" | "centered";
  heroImage: string | null;
}) {
  if (heroLayout === "split") {
    return (
      <section className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto grid max-w-5xl items-center gap-8 px-4 py-16 md:grid-cols-2">
          <div>
            <h1
              className="text-3xl font-semibold leading-tight sm:text-4xl"
              style={{
                color: "var(--theme-primary)",
                fontFamily: "var(--theme-font-heading)",
              }}
            >
              {name}
            </h1>
            {description && (
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
                {description}
              </p>
            )}
            <div className="mt-6">
              <Link
                href="/katalog"
                className="inline-flex h-10 items-center rounded-full px-5 text-sm font-medium text-white"
                style={{
                  backgroundColor: "var(--theme-primary)",
                  borderRadius: "var(--theme-radius)",
                }}
              >
                Lihat katalog
              </Link>
            </div>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
            {heroImage ? (
              <Image src={heroImage} alt={name} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                Hero image
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (heroLayout === "full-bleed") {
    return (
      <section className="relative h-[420px] overflow-hidden sm:h-[500px]">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "var(--theme-primary)" }}
          />
        )}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative flex h-full flex-col items-center justify-center px-4 text-center text-white">
          <h1
            className="text-4xl font-bold sm:text-5xl"
            style={{ fontFamily: "var(--theme-font-heading)" }}
          >
            {name}
          </h1>
          {description && (
            <p className="mx-auto mt-3 max-w-xl text-sm opacity-90 sm:text-base">
              {description}
            </p>
          )}
          <div className="mt-6">
            <Link
              href="/katalog"
              className="inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold"
              style={{
                backgroundColor: "var(--theme-accent)",
                color: "#fff",
                borderRadius: "var(--theme-radius)",
              }}
            >
              Lihat katalog
            </Link>
          </div>
        </div>
      </section>
    );
  }

  /* default: "centered" */
  return (
    <section className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1
          className="text-3xl font-semibold sm:text-4xl"
          style={{
            color: "var(--theme-primary)",
            fontFamily: "var(--theme-font-heading)",
          }}
        >
          {name}
        </h1>
        {description && (
          <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
            {description}
          </p>
        )}
        <div className="mt-6">
          <Link
            href="/katalog"
            className="inline-flex h-10 items-center px-5 text-sm font-medium text-white"
            style={{
              backgroundColor: "var(--theme-primary)",
              borderRadius: "var(--theme-radius)",
            }}
          >
            Lihat katalog
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Product card                                                         */
/* ------------------------------------------------------------------ */

function ProductCard({
  product,
}: {
  product: Pick<
    Product,
    "id" | "name" | "slug" | "price" | "compare_at_price" | "media_urls"
  >;
}) {
  const image = product.media_urls?.[0] ?? null;
  const onSale =
    product.compare_at_price !== null &&
    product.compare_at_price > product.price;

  return (
    <Link href={`/p/${product.slug}`} className="group flex flex-col gap-2">
      <div
        className="relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800"
        style={{ borderRadius: "var(--theme-radius)" }}
      >
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-400">
            no image
          </div>
        )}
      </div>
      <div className="px-1">
        <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--theme-primary)" }}
          >
            {formatPrice(product.price)}
          </span>
          {onSale && (
            <span className="text-xs text-zinc-400 line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
