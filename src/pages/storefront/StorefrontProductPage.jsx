import { Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useCart } from "../../context/CartContext";
import { useStorefront } from "./StorefrontLayout";

function formatRp(v) {
  return `Rp ${Number(v || 0).toLocaleString("id-ID")}`;
}

export default function StorefrontProductPage() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const { products, slug, theme } = useStorefront();
  const { addItem } = useCart();

  const headingFont = theme?.config_json?.fontHeading || "Inter";

  const product = useMemo(
    () => products.find((p) => p.slug === handle),
    [products, handle],
  );

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2
          className="text-xl md:text-2xl font-semibold mb-3"
          style={{ fontFamily: headingFont }}
        >
          Produk tidak ditemukan
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Produk yang Anda cari mungkin sudah tidak tersedia.
        </p>
        <Link to={`/s/${slug}/katalog`}>
          <Button
            className="text-white"
            style={{
              background: "var(--st-primary)",
              borderRadius: "var(--st-radius)",
            }}
          >
            Kembali ke Katalog
          </Button>
        </Link>
      </div>
    );
  }

  const media = Array.isArray(product.media_urls) ? product.media_urls : [];
  const mainImage = media[selectedIdx] || media[0];

  const stock = Number(product.stock || 0);
  const isOutOfStock = stock === 0;
  const isLimited = stock > 0 && stock <= 3;

  const discount =
    product.compare_at_price && Number(product.compare_at_price) > Number(product.price)
      ? Math.round(
          ((Number(product.compare_at_price) - Number(product.price)) /
            Number(product.compare_at_price)) *
            100,
        )
      : 0;

  function handleQtyChange(delta) {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (stock > 0 && next > stock) return stock;
      return next;
    });
  }

  function handleAddToCart() {
    if (isOutOfStock) return;
    addItem({
      productId: product.id,
      variantId: null,
      name: product.name,
      price: product.price,
      imageUrl: media[0] || null,
      quantity,
    });
    toast.success("Ditambahkan ke keranjang");
  }

  function handleBuyNow() {
    if (isOutOfStock) return;
    addItem({
      productId: product.id,
      variantId: null,
      name: product.name,
      price: product.price,
      imageUrl: media[0] || null,
      quantity,
    });
    navigate(`/s/${slug}/keranjang`);
  }

  return (
    <div className="pb-12">
      <div className="md:hidden">
        <div className="relative w-full h-[280px] bg-muted">
          {mainImage ? (
            <img
              src={mainImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              Tanpa Gambar
            </div>
          )}
        </div>
        {media.length > 1 && (
          <div className="px-4 mt-3 flex gap-2 overflow-x-auto">
            {media.slice(0, 5).map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                className="shrink-0 size-[60px] overflow-hidden bg-muted"
                style={{
                  border:
                    selectedIdx === idx
                      ? "2px solid var(--st-primary)"
                      : "1px solid #e5e5e5",
                  borderRadius: "calc(var(--st-radius) - 4px)",
                }}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-4 md:pt-10">
        <div className="grid md:grid-cols-[520px_1fr] gap-6 md:gap-12 items-start">
          <div className="hidden md:block">
            <div
              className="w-full bg-muted overflow-hidden"
              style={{
                borderRadius: "var(--st-radius)",
                aspectRatio: "1 / 1",
              }}
            >
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  Tanpa Gambar
                </div>
              )}
            </div>
            {media.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {media.slice(0, 5).map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedIdx(idx)}
                    className="shrink-0 size-[60px] overflow-hidden bg-muted"
                    style={{
                      border:
                        selectedIdx === idx
                          ? "2px solid var(--st-primary)"
                          : "1px solid #e5e5e5",
                      borderRadius: "calc(var(--st-radius) - 4px)",
                    }}
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {product.category && (
              <Link
                to={`/s/${slug}/katalog?kategori=${encodeURIComponent(product.category)}`}
                className="text-[11px] md:text-xs uppercase tracking-[0.18em] text-muted-foreground hover:underline self-start"
              >
                {product.category}
              </Link>
            )}

            <h1
              className="text-[20px] md:text-[32px] font-bold md:font-semibold leading-tight"
              style={{
                fontFamily: headingFont,
                color: "var(--st-primary)",
              }}
            >
              {product.name}
            </h1>

            <div className="flex items-baseline gap-3 flex-wrap">
              <span
                className="text-2xl md:text-3xl font-bold"
                style={{ color: "var(--st-primary)" }}
              >
                {formatRp(product.price)}
              </span>
              {product.compare_at_price &&
                Number(product.compare_at_price) > Number(product.price) && (
                  <>
                    <span className="text-sm md:text-base text-muted-foreground line-through">
                      {formatRp(product.compare_at_price)}
                    </span>
                    <span className="text-[11px] md:text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded">
                      HEMAT {discount}%
                    </span>
                  </>
                )}
            </div>

            <div>
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                  <span className="size-2 rounded-full bg-red-600" /> Habis
                </span>
              ) : isLimited ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
                  <span className="size-2 rounded-full bg-amber-500" /> Stok
                  terbatas ({stock} tersisa)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                  <span className="size-2 rounded-full bg-green-500" /> Tersedia
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm font-medium">Jumlah:</span>
              <div
                className="inline-flex items-center border"
                style={{ borderRadius: "var(--st-radius)" }}
              >
                <button
                  type="button"
                  onClick={() => handleQtyChange(-1)}
                  disabled={quantity <= 1}
                  className="size-8 md:size-10 flex items-center justify-center hover:bg-muted disabled:opacity-40"
                  aria-label="Kurangi"
                >
                  <Minus className="size-3.5 md:size-4" />
                </button>
                <span className="w-10 md:w-12 text-center text-sm md:text-base font-medium">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleQtyChange(1)}
                  disabled={stock > 0 && quantity >= stock}
                  className="size-8 md:size-10 flex items-center justify-center hover:bg-muted disabled:opacity-40"
                  aria-label="Tambah"
                >
                  <Plus className="size-3.5 md:size-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mt-2">
              <Button
                size="lg"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="w-full md:flex-1 text-white"
                style={{
                  background: "var(--st-primary)",
                  borderRadius: "var(--st-radius)",
                }}
              >
                {isOutOfStock ? "Stok Habis" : "Tambah ke Keranjang"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className="hidden md:inline-flex md:flex-1"
                style={{
                  borderColor: "var(--st-primary)",
                  color: "var(--st-primary)",
                  borderRadius: "var(--st-radius)",
                }}
              >
                Beli Sekarang
              </Button>
            </div>

            <div className="mt-4">
              <Accordion
                type="single"
                collapsible
                defaultValue="desc"
                className="w-full"
              >
                <AccordionItem value="desc">
                  <AccordionTrigger>Deskripsi Produk</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm whitespace-pre-line leading-relaxed text-muted-foreground">
                      {product.description ||
                        "Belum ada deskripsi untuk produk ini."}
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="shipping">
                  <AccordionTrigger>Info Pengiriman</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Pengiriman dilakukan dalam 1-3 hari kerja setelah
                      pembayaran dikonfirmasi. Kami mendukung berbagai kurir
                      lokal seperti JNE, J&T, dan SiCepat. Ongkos kirim dihitung
                      otomatis saat checkout berdasarkan alamat tujuan.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="size">
                  <AccordionTrigger>Panduan Ukuran</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Silakan rujuk tabel ukuran kami untuk memastikan kecocokan
                      terbaik. Jika ragu antara dua ukuran, kami menyarankan
                      memilih ukuran yang lebih besar. Hubungi tim kami untuk
                      bantuan ukuran khusus.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
