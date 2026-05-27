import { Loader2, Menu, ShoppingBag, X } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useCart } from "../../context/CartContext";
import { supabase } from "../../services/api";

const StoreContext = createContext(null);

export function useStorefront() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStorefront must be used inside StorefrontLayout");
  return ctx;
}

function applyThemeVars(theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const cfg = theme?.config_json || {};
  root.style.setProperty("--st-primary", cfg.primaryColor || "#1a1a1a");
  root.style.setProperty("--st-accent", cfg.accent || "#3d5af1");
  root.style.setProperty("--st-radius", `${cfg.borderRadius ?? 8}px`);
  root.style.setProperty("--st-font-heading", cfg.fontHeading || "Inter");
  root.style.setProperty("--st-font-body", cfg.fontBody || "Inter");
  root.style.setProperty(
    "--st-card-shadow",
    cfg.cardStyle === "shadow" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
  );
  root.style.setProperty(
    "--st-card-border",
    cfg.cardStyle === "outlined" ? "1px solid #e5e5e5" : "none",
  );
}

export default function StorefrontLayout() {
  const { slug } = useParams();
  const { itemCount } = useCart();
  const [store, setStore] = useState(null);
  const [theme, setTheme] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    loadStorefront(slug);
  }, [slug]);

  async function loadStorefront(storeSlug) {
    setIsLoading(true);
    setError("");
    try {
      const { data: storeData, error: storeErr } = await supabase
        .from("stores")
        .select("id, name, slug, description, settings, is_published, contact_email, contact_phone")
        .eq("slug", storeSlug)
        .maybeSingle();

      if (storeErr) throw storeErr;
      if (!storeData) {
        setError("Toko tidak ditemukan");
        return;
      }
      setStore(storeData);

      const [themeRes, productsRes] = await Promise.all([
        supabase
          .from("themes")
          .select("template_slug, config_json")
          .eq("store_id", storeData.id)
          .maybeSingle(),
        supabase
          .from("products")
          .select("id, name, slug, description, price, compare_at_price, category, media_urls, stock, tags")
          .eq("store_id", storeData.id)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
      ]);

      const themeData = themeRes.data || { config_json: {}, template_slug: "modern-minimal" };
      setTheme(themeData);
      applyThemeVars(themeData);
      setProducts(productsRes.data || []);
    } catch (err) {
      setError(err?.message || "Gagal memuat toko");
    } finally {
      setIsLoading(false);
    }
  }

  const value = useMemo(
    () => ({ store, theme, products, slug, reload: () => loadStorefront(slug) }),
    [store, theme, products, slug],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <h2 className="text-xl font-semibold">Toko tidak tersedia</h2>
        <p className="text-sm text-muted-foreground">{error || "Tidak dapat memuat data toko."}</p>
        <Link to="/" className="text-sm underline">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  const headingFont = theme?.config_json?.fontHeading || "Inter";
  const bodyFont = theme?.config_json?.fontBody || "Inter";

  return (
    <StoreContext.Provider value={value}>
      <div
        className="min-h-screen flex flex-col bg-white text-foreground"
        style={{ fontFamily: bodyFont }}
      >
        <StorefrontHeader
          store={store}
          slug={slug}
          itemCount={itemCount}
          navOpen={navOpen}
          setNavOpen={setNavOpen}
          headingFont={headingFont}
        />

        <main className="flex-1">
          <Outlet />
        </main>

        <StorefrontFooter store={store} />
      </div>
    </StoreContext.Provider>
  );
}

function StorefrontHeader({ store, slug, itemCount, navOpen, setNavOpen, headingFont }) {
  const links = [
    { to: `/s/${slug}`, label: "Beranda", end: true },
    { to: `/s/${slug}/katalog`, label: "Katalog" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3 gap-3">
        <Link
          to={`/s/${slug}`}
          className="font-bold text-lg shrink-0 truncate"
          style={{ fontFamily: headingFont, color: "var(--st-primary)" }}
        >
          {store.name}
        </Link>

        <nav className="hidden md:flex items-center gap-5">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `text-sm transition-colors ${isActive ? "font-semibold" : "text-muted-foreground hover:text-foreground"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Link to={`/s/${slug}/keranjang`} className="relative p-2">
            <ShoppingBag className="size-5" />
            {itemCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 size-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                style={{ background: "var(--st-primary)" }}
              >
                {itemCount}
              </span>
            )}
          </Link>

          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden p-2">
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0">
              <div className="flex items-center justify-between border-b p-4">
                <span className="font-bold" style={{ fontFamily: headingFont }}>
                  {store.name}
                </span>
                <button onClick={() => setNavOpen(false)}>
                  <X className="size-5" />
                </button>
              </div>
              <nav className="flex flex-col p-2">
                {links.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.end}
                    onClick={() => setNavOpen(false)}
                    className={({ isActive }) =>
                      `px-3 py-2.5 rounded text-sm ${isActive ? "bg-accent font-semibold" : "hover:bg-accent/50"}`
                    }
                  >
                    {l.label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function StorefrontFooter({ store }) {
  return (
    <footer className="border-t mt-12 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} {store.name}. Powered by Skye.</p>
        {store.contact_email && (
          <p className="mt-1">{store.contact_email}</p>
        )}
      </div>
    </footer>
  );
}
