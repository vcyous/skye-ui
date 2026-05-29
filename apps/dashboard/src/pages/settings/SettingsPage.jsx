import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/api";

const STOREFRONT_BASE = "skyeseller.online";
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const TABS = [
  { id: "profil",     label: "Profil Toko" },
  { id: "publikasi",  label: "Publikasi" },
  { id: "pembayaran", label: "Pembayaran" },
  { id: "notifikasi", label: "Notifikasi" },
];

const COMING_SOON_TABS = ["pembayaran", "notifikasi"];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function storeUrl(slug) {
  return slug ? `https://${slug}.${STOREFRONT_BASE}` : "";
}

function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
      <p className="text-lg font-semibold text-muted-foreground">Segera Hadir</p>
      <p className="text-sm text-muted-foreground">Fitur ini sedang dalam pengembangan.</p>
    </div>
  );
}

function SettingsNav({ activeTab, onSelect }) {
  return (
    <nav className="flex flex-col gap-1">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={[
              "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            ].join(" ")}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

// ─────────────────────────────────────────────
// Tab: Profil Toko
// ─────────────────────────────────────────────

function ProfilTokoTab({ store, onStoreUpdated }) {
  const [form, setForm] = useState({
    name: store?.name ?? "",
    description: store?.description ?? "",
    contact_email: store?.contact_email ?? "",
    contact_phone: store?.contact_phone ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const initialForm = useRef(form);

  useEffect(() => {
    const next = {
      name: store?.name ?? "",
      description: store?.description ?? "",
      contact_email: store?.contact_email ?? "",
      contact_phone: store?.contact_phone ?? "",
    };
    setForm(next);
    initialForm.current = next;
  }, [store]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCancel() {
    setForm(initialForm.current);
  }

  const isDirty =
    form.name !== initialForm.current.name ||
    form.description !== initialForm.current.description ||
    form.contact_email !== initialForm.current.contact_email ||
    form.contact_phone !== initialForm.current.contact_phone;

  async function handleSave(e) {
    e.preventDefault();
    if (!store?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({
          name: form.name,
          description: form.description,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
        })
        .eq("id", store.id);

      if (error) throw error;
      initialForm.current = { ...form };
      toast.success("Profil toko diperbarui");
      onStoreUpdated?.();
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan profil toko.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profil Toko</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nama Toko</Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Nama toko kamu"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Ceritakan sedikit tentang toko kamu"
              rows={3}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_email">Email Kontak</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                value={form.contact_email}
                onChange={handleChange}
                placeholder="toko@email.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_phone">No HP</Label>
              <Input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                value={form.contact_phone}
                onChange={handleChange}
                placeholder="+62..."
              />
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <Button type="submit" disabled={isSaving || !isDirty}>
              {isSaving ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving || !isDirty}
            >
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Tab: Publikasi (gabungan subdomain + publish)
// ─────────────────────────────────────────────

function PublikasiTab({ store, onStoreUpdated }) {
  const isPublished     = Boolean(store?.isPublished ?? store?.is_published);
  const savedSlug       = store?.slug ?? "";

  // Subdomain state
  const [slug, setSlug]               = useState(savedSlug);
  const [slugError, setSlugError]     = useState("");
  const [availability, setAvailability] = useState(null); // "available" | "taken" | null
  const [isChecking, setIsChecking]   = useState(false);
  const [isSavingSlug, setIsSavingSlug] = useState(false);
  const debounceRef = useRef(null);

  // Publish state
  const [isSavingPublish, setIsSavingPublish] = useState(false);

  // Keep slug input in sync when store loads
  useEffect(() => {
    setSlug(store?.slug ?? "");
    setSlugError("");
    setAvailability(null);
  }, [store?.slug]);

  // ── Slug ──────────────────────────────────

  function validateSlug(value) {
    if (!value) return "Subdomain tidak boleh kosong.";
    if (value.length < 3) return "Minimal 3 karakter.";
    if (value.length > 63) return "Maksimal 63 karakter.";
    if (!SLUG_REGEX.test(value))
      return "Hanya huruf kecil, angka, dan tanda hubung. Tidak boleh diawali/diakhiri tanda hubung.";
    return "";
  }

  function handleSlugChange(e) {
    const value = e.target.value.toLowerCase();
    setSlug(value);
    setAvailability(null);

    const err = validateSlug(value);
    setSlugError(err);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!err && value !== savedSlug && store?.id) {
      setIsChecking(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .from("stores")
            .select("id")
            .eq("slug", value)
            .neq("id", store.id);

          if (error) throw error;
          setAvailability(data.length === 0 ? "available" : "taken");
        } catch {
          setAvailability(null);
        } finally {
          setIsChecking(false);
        }
      }, 500);
    } else {
      setIsChecking(false);
    }
  }

  async function handleSaveSlug(e) {
    e.preventDefault();
    if (!store?.id) return;

    const err = validateSlug(slug);
    if (err) { setSlugError(err); return; }
    if (availability === "taken") return;

    setIsSavingSlug(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({ slug })
        .eq("id", store.id);

      if (error) throw error;
      toast.success("Subdomain disimpan. Perubahan aktif dalam ~5 menit.");
      onStoreUpdated?.();
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan subdomain.");
    } finally {
      setIsSavingSlug(false);
    }
  }

  const slugDirty   = slug !== savedSlug && slug.length > 0;
  const slugCanSave = slugDirty && !slugError && !isChecking && availability !== "taken";

  // ── Publish ───────────────────────────────

  async function togglePublish(nextValue) {
    if (!store?.id) return;
    setIsSavingPublish(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({ is_published: nextValue })
        .eq("id", store.id);

      if (error) throw error;
      toast.success(
        nextValue
          ? "Toko dipublikasikan. Tampil di publik dalam ~60 detik."
          : "Toko di-unpublish. Pengunjung akan melihat halaman 404.",
      );
      onStoreUpdated?.();
    } catch (err) {
      toast.error(err.message || "Gagal mengubah status publikasi.");
    } finally {
      setIsSavingPublish(false);
    }
  }

  async function copyUrl() {
    const url = storeUrl(savedSlug);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL tersalin");
    } catch {
      toast.error("Tidak bisa menyalin URL");
    }
  }

  // URL yang ditampilkan: pakai slug yang sedang diketik untuk preview,
  // tapi URL aktif tetap berdasarkan savedSlug
  const previewUrl = storeUrl(slug || savedSlug);
  const liveUrl    = storeUrl(savedSlug);

  return (
    <div className="flex flex-col gap-4">

      {/* ── Subdomain ─────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subdomain Toko</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSlug} className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Alamat unik toko kamu di platform. Ubah dengan hati-hati — link lama tidak akan bekerja.
            </p>

            {/* Input subdomain */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slug-input">Subdomain</Label>
              <div className="flex items-center">
                <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none whitespace-nowrap">
                  https://
                </span>
                <Input
                  id="slug-input"
                  className="rounded-none focus-visible:z-10"
                  value={slug}
                  onChange={handleSlugChange}
                  placeholder="nama-toko"
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <span className="inline-flex h-9 items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none whitespace-nowrap">
                  .{STOREFRONT_BASE}
                </span>
              </div>

              {/* Feedback validation */}
              {slugError && (
                <p className="text-xs text-destructive">{slugError}</p>
              )}
              {!slugError && isChecking && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Memeriksa ketersediaan...
                </div>
              )}
              {!slugError && !isChecking && availability === "available" && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-green-600" />
                  <Badge variant="outline" className="text-green-700 border-green-400 bg-green-50">
                    Tersedia
                  </Badge>
                </div>
              )}
              {!slugError && !isChecking && availability === "taken" && (
                <div className="flex items-center gap-1.5">
                  <XCircle className="size-4 text-destructive" />
                  <span className="text-xs text-destructive">Sudah dipakai toko lain</span>
                </div>
              )}
            </div>

            {/* Preview URL */}
            {previewUrl && (
              <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Preview:{" "}
                <span className={`font-mono ${slugDirty ? "text-amber-600" : "text-foreground"}`}>
                  {previewUrl}
                </span>
                {slugDirty && (
                  <span className="ml-2 text-amber-600">(belum disimpan)</span>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-fit"
              disabled={!slugCanSave || isSavingSlug}
            >
              {isSavingSlug ? (
                <><Loader2 className="size-4 mr-2 animate-spin" />Menyimpan...</>
              ) : (
                "Simpan Subdomain"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Status Publikasi ──────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Publikasi</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">

          {/* Toggle */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="publish-switch" className="text-sm font-medium">
                Publikasikan toko ke publik
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Saat aktif, siapa pun dapat mengakses toko di subdomain kamu.
                Saat nonaktif, pengunjung akan melihat halaman 404.
              </p>
            </div>
            <Switch
              id="publish-switch"
              checked={isPublished}
              onCheckedChange={togglePublish}
              disabled={isSavingPublish || !store?.id || !savedSlug}
            />
          </div>

          {/* Peringatan jika subdomain belum diset */}
          {!savedSlug && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Atur subdomain terlebih dahulu sebelum bisa publish toko.
            </div>
          )}

          <Separator />

          {/* URL aktif */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">URL Toko</Label>
            <div className="flex items-center gap-2">
              <Input
                value={liveUrl}
                readOnly
                className="font-mono text-sm bg-muted"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyUrl}
                disabled={!liveUrl}
                aria-label="Salin URL"
              >
                <Copy className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!liveUrl}
                aria-label="Buka toko"
                asChild
              >
                <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>

            {/* Status indicator */}
            <p className="text-xs text-muted-foreground">
              {isPublished ? (
                <span className="inline-flex items-center gap-1 text-green-700">
                  <CheckCircle2 className="size-3.5 text-green-600" />
                  Toko aktif dan dapat diakses publik.
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <XCircle className="size-3.5 text-muted-foreground" />
                  Toko belum dipublikasikan.
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function SettingsPage() {
  const { store, refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState("profil");

  async function handleStoreUpdated() {
    if (refreshSession) await refreshSession().catch(() => null);
  }

  const isLoading = store === undefined;

  return (
    <section className="grid gap-4">
      <header>
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Kelola profil toko, subdomain, dan status publikasi.
        </p>
      </header>

      <div className="flex gap-6">
        <aside className="w-44 shrink-0">
          {isLoading ? (
            <div className="flex flex-col gap-1">
              {TABS.map((tab) => (
                <Skeleton key={tab.id} className="h-9 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <SettingsNav activeTab={activeTab} onSelect={setActiveTab} />
          )}
        </aside>

        <div className="flex-1 min-w-0">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6 flex flex-col gap-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-9 w-24" />
              </CardContent>
            </Card>
          ) : COMING_SOON_TABS.includes(activeTab) ? (
            <ComingSoon />
          ) : activeTab === "profil" ? (
            <ProfilTokoTab store={store} onStoreUpdated={handleStoreUpdated} />
          ) : activeTab === "publikasi" ? (
            <PublikasiTab store={store} onStoreUpdated={handleStoreUpdated} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
