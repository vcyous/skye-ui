import { Filter, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "../../context/CartContext";
import { useStorefront } from "./StorefrontLayout";

function formatRp(v) {
  return `Rp ${Number(v || 0).toLocaleString("id-ID")}`;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Terbaru" },
  { value: "price-asc", label: "Harga terendah" },
  { value: "price-desc", label: "Harga tertinggi" },
  { value: "name-asc", label: "Nama A-Z" },
];

export default function StorefrontCatalogPage() {
  const { products, slug, theme } = useStorefront();
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const headingFont = theme?.config_json?.fontHeading || "Inter";

  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sort, setSort] = useState("newest");
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const cat = searchParams.get("kategori");
    if (cat) setSelectedCategories([cat]);
  }, [searchParams]);

  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }
    if (selectedCategories.length > 0) {
      list = list.filter((p) => selectedCategories.includes(p.category));
    }
    const min = Number(priceMin);
    const max = Number(priceMax);
    if (priceMin && !Number.isNaN(min)) {
      list = list.filter((p) => Number(p.price) >= min);
    }
    if (priceMax && !Number.isNaN(max)) {
      list = list.filter((p) => Number(p.price) <= max);
    }

    switch (sort) {
      case "price-asc":
        list.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-desc":
        list.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }
    return list;
  }, [products, search, selectedCategories, priceMin, priceMax, sort]);

  function toggleCategory(cat) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  function clearFilters() {
    setSelectedCategories([]);
    setPriceMin("");
    setPriceMax("");
    setSearch("");
    setSearchParams({});
  }

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

  const activeChips = [
    ...selectedCategories.map((c) => ({
      key: `cat-${c}`,
      label: c,
      remove: () => toggleCategory(c),
    })),
    priceMin && {
      key: "min",
      label: `Min ${formatRp(priceMin)}`,
      remove: () => setPriceMin(""),
    },
    priceMax && {
      key: "max",
      label: `Max ${formatRp(priceMax)}`,
      remove: () => setPriceMax(""),
    },
  ].filter(Boolean);

  const filterPanel = (
    <FilterPanel
      categories={categories}
      selectedCategories={selectedCategories}
      onToggleCategory={toggleCategory}
      priceMin={priceMin}
      priceMax={priceMax}
      setPriceMin={setPriceMin}
      setPriceMax={setPriceMax}
      onClear={clearFilters}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <div className="mb-4 md:mb-6">
        <h1
          className="text-2xl md:text-3xl font-semibold"
          style={{ fontFamily: headingFont, color: "var(--st-primary)" }}
        >
          Katalog
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Jelajahi semua produk kami
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="md:hidden flex-1">
                <Filter className="size-4 mr-2" />
                Filter
                {activeChips.length > 0 && (
                  <span
                    className="ml-2 size-5 rounded-full text-[10px] flex items-center justify-center text-white"
                    style={{ background: "var(--st-primary)" }}
                  >
                    {activeChips.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0 overflow-y-auto">
              <SheetHeader className="border-b p-4">
                <SheetTitle>Filter</SheetTitle>
              </SheetHeader>
              <div className="p-4">{filterPanel}</div>
            </SheetContent>
          </Sheet>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="flex-1 md:w-[180px]">
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeChips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="pl-3 pr-1 py-1 gap-1 capitalize"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.remove}
                className="ml-1 hover:bg-background rounded-full p-0.5"
                aria-label="Hapus filter"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs underline text-muted-foreground hover:text-foreground"
          >
            Hapus semua
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-[240px_1fr] gap-6 md:gap-8">
        <aside className="hidden md:block">
          <div className="sticky top-20">{filterPanel}</div>
        </aside>

        <div>
          <p className="text-xs md:text-sm text-muted-foreground mb-3">
            Menampilkan {filtered.length} produk
          </p>

          {filtered.length === 0 ? (
            <div className="py-16 text-center border rounded-lg">
              <p className="text-sm font-medium">Tidak ada produk ditemukan</p>
              <p className="text-xs text-muted-foreground mt-1">
                Coba ubah filter atau kata kunci pencarian.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={clearFilters}
              >
                Hapus filter
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
              {filtered.map((p) => (
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
      </div>
    </div>
  );
}

function FilterPanel({
  categories,
  selectedCategories,
  onToggleCategory,
  priceMin,
  priceMax,
  setPriceMin,
  setPriceMax,
  onClear,
}) {
  return (
    <div className="flex flex-col gap-5">
      <section>
        <h3 className="text-sm font-semibold mb-3">Kategori</h3>
        {categories.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada kategori</p>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map((cat) => {
              const id = `cat-${cat}`;
              return (
                <label
                  key={cat}
                  htmlFor={id}
                  className="flex items-center gap-2 text-sm cursor-pointer capitalize"
                >
                  <Checkbox
                    id={id}
                    checked={selectedCategories.includes(cat)}
                    onCheckedChange={() => onToggleCategory(cat)}
                  />
                  {cat}
                </label>
              );
            })}
          </div>
        )}
      </section>

      <Separator />

      <section>
        <h3 className="text-sm font-semibold mb-3">Harga (Rp)</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Label htmlFor="price-min" className="text-[11px] text-muted-foreground">
              Min
            </Label>
            <Input
              id="price-min"
              type="number"
              min={0}
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="price-max" className="text-[11px] text-muted-foreground">
              Max
            </Label>
            <Input
              id="price-max"
              type="number"
              min={0}
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="∞"
            />
          </div>
        </div>
      </section>

      <Separator />

      <Button variant="outline" size="sm" onClick={onClear}>
        Hapus semua filter
      </Button>
    </div>
  );
}

function ProductCard({ product, slug, onQuickAdd }) {
  const img = product.media_urls?.[0];
  const isLimited = product.stock > 0 && product.stock <= 3;
  const discount =
    product.compare_at_price && Number(product.compare_at_price) > Number(product.price)
      ? Math.round(
          ((Number(product.compare_at_price) - Number(product.price)) /
            Number(product.compare_at_price)) *
            100,
        )
      : 0;

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
        <div className="aspect-square bg-muted overflow-hidden relative">
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
          {isLimited && (
            <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
              Terbatas
            </span>
          )}
          {discount > 0 && (
            <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
              -{discount}%
            </span>
          )}
          {product.stock === 0 && (
            <span className="absolute top-2 left-2 bg-gray-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
              Habis
            </span>
          )}
        </div>
      </Link>
      <div className="p-2.5 md:p-3 flex flex-col gap-1">
        {product.category && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {product.category}
          </span>
        )}
        <Link
          to={`/s/${slug}/produk/${product.slug}`}
          className="text-[12px] md:text-sm line-clamp-2 leading-snug hover:underline"
        >
          {product.name}
        </Link>
        <div className="flex items-center justify-between gap-2 mt-1">
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
            disabled={product.stock === 0}
            aria-label="Tambah ke keranjang"
            className="shrink-0 size-7 md:size-8 rounded-full flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--st-primary)" }}
          >
            <Plus className="size-3.5 md:size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
