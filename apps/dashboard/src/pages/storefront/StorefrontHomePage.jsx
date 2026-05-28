import { Plus } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "../../context/CartContext";
import { useStorefront } from "./StorefrontLayout";

function formatRp(v) {
  return `Rp ${Number(v || 0).toLocaleString("id-ID")}`;
}

export default function StorefrontHomePage() {
  const { store, theme, products, slug } = useStorefront();
  const { addItem } = useCart();

  const heroLayout = theme?.config_json?.heroLayout || "split";
  const headingFont = theme?.config_json?.fontHeading || "Inter";

  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const featured = useMemo(() => products.slice(0, 8), [products]);

  const heroImage =
    store?.settings?.branding?.heroImageUrl ||
    products[0]?.media_urls?.[0] ||
    null;

  function handleQuickAdd(product) {
    if (!product || product.stock === 0) {
      toast.error("Stok habis");
      return;
    }
    addItem({
      productId: product.id,
      variantId: null,
      name: product.name,
      price: product.price,
      imageUrl: product.media_urls?.[0] || null,
      quantity: 1,
    });
    toast.success("Ditambahkan ke keranjang");
  }

  return (
    <div className="flex flex-col">
      {heroLayout === "full-bleed" ? (
        <FullBleedHero
          store={store}
          slug={slug}
          heroImage={heroImage}
          headingFont={headingFont}
        />
      ) : (
        <SplitHero
          store={store}
          slug={slug}
          heroImage={heroImage}
          headingFont={headingFont}
        />
      )}

      {categories.length > 0 && (
        <section className="mt-8 md:mt-12">
          <div className="mx-auto max-w-6xl px-4">
            <h2
              className="text-base md:text-lg font-semibold mb-3"
              style={{ fontFamily: headingFont }}
            >
              Kategori
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
              {categories.map((cat) => (
                <Link
                  key={cat}
                  to={`/s/${slug}/katalog?kategori=${encodeURIComponent(cat)}`}
                  className="shrink-0 px-4 py-2 text-xs md:text-sm border rounded-full hover:bg-muted transition-colors capitalize"
                  style={{
                    borderRadius: "999px",
                    fontFamily: "var(--st-font-body)",
                  }}
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mt-8 md:mt-12 mb-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-baseline justify-between mb-4">
            <h2
              className="text-lg md:text-2xl font-semibold"
              style={{ fontFamily: headingFont }}
            >
              Produk Terbaru
            </h2>
            <Link
              to={`/s/${slug}/katalog`}
              className="text-xs md:text-sm underline"
              style={{ color: "var(--st-primary)" }}
            >
              Lihat semua
            </Link>
          </div>

          {featured.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Belum ada produk tersedia.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {featured.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  slug={slug}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function FullBleedHero({ store, slug, heroImage, headingFont }) {
  return (
    <section className="relative w-full h-[260px] md:h-[380px] overflow-hidden">
      {heroImage ? (
        <img
          src={heroImage}
          alt={store?.name || "Hero"}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, var(--st-primary), var(--st-accent))",
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      <div className="relative h-full mx-auto max-w-6xl px-4 flex flex-col justify-end pb-8 md:pb-12">
        <h1
          className="text-white text-2xl md:text-5xl font-bold leading-tight max-w-xl"
          style={{ fontFamily: headingFont }}
        >
          {store?.name}
        </h1>
        {store?.description && (
          <p className="mt-2 text-white/85 text-sm md:text-base max-w-md line-clamp-2">
            {store.description}
          </p>
        )}
        <div className="mt-4">
          <Link to={`/s/${slug}/katalog`}>
            <Button
              size="lg"
              className="text-white"
              style={{
                background: "var(--st-primary)",
                borderRadius: "var(--st-radius)",
              }}
            >
              Lihat Katalog
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function SplitHero({ store, slug, heroImage, headingFont }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-6 md:pt-12 pb-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-center">
        <div className="order-2 md:order-1">
          <p
            className="text-xs md:text-sm uppercase tracking-[0.18em] text-muted-foreground mb-3"
            style={{ fontFamily: "var(--st-font-body)" }}
          >
            Koleksi Terbaru
          </p>
          <h1
            className="text-3xl md:text-5xl font-semibold leading-tight"
            style={{
              fontFamily: headingFont,
              color: "var(--st-primary)",
              fontVariantNumeric: "lining-nums",
            }}
          >
            {store?.name}
          </h1>
          {store?.description && (
            <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-md">
              {store.description}
            </p>
          )}
          <div className="mt-6">
            <Link to={`/s/${slug}/katalog`}>
              <Button
                size="lg"
                className="text-white"
                style={{
                  background: "var(--st-primary)",
                  borderRadius: "var(--st-radius)",
                }}
              >
                Lihat Katalog
              </Button>
            </Link>
          </div>
        </div>
        <div className="order-1 md:order-2">
          <div
            className="w-full aspect-[4/3] md:aspect-square overflow-hidden"
            style={{ borderRadius: "var(--st-radius)" }}
          >
            {heroImage ? (
              <img
                src={heroImage}
                alt={store?.name || "Hero"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background:
                    "linear-gradient(135deg, var(--st-primary), var(--st-accent))",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product, slug, onQuickAdd }) {
  const img = product.media_urls?.[0];
  return (
    <div
      className="group flex flex-col overflow-hidden bg-white"
      style={{
        borderRadius: "var(--st-radius)",
        boxShadow: "var(--st-card-shadow)",
        border: "var(--st-card-border)",
      }}
    >
      <Link
        to={`/s/${slug}/produk/${product.slug}`}
        className="relative block overflow-hidden"
      >
        <div className="aspect-square bg-muted overflow-hidden">
          {img ? (
            <img
              src={img}
              alt={product.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              Tanpa Gambar
            </div>
          )}
        </div>
      </Link>
      <div className="p-2.5 md:p-3 flex flex-col gap-1.5">
        <Link
          to={`/s/${slug}/produk/${product.slug}`}
          className="text-[12px] md:text-sm line-clamp-2 leading-snug hover:underline"
        >
          {product.name}
        </Link>
        <div className="flex items-center justify-between gap-2 mt-auto">
          <div className="flex flex-col">
            <span
              className="text-sm md:text-base font-bold"
              style={{ color: "var(--st-primary)" }}
            >
              {formatRp(product.price)}
            </span>
            {product.compare_at_price &&
              Number(product.compare_at_price) > Number(product.price) && (
                <span className="text-[10px] md:text-xs text-muted-foreground line-through">
                  {formatRp(product.compare_at_price)}
                </span>
              )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onQuickAdd(product);
            }}
            aria-label="Tambah ke keranjang"
            className="shrink-0 size-7 md:size-8 rounded-full flex items-center justify-center text-white hover:opacity-90 transition-opacity"
            style={{ background: "var(--st-primary)" }}
          >
            <Plus className="size-3.5 md:size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
