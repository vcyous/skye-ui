import { CheckCircle2, Copy, ExternalLink, XCircle } from "lucide-react";
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

const TABS = [
  { id: "profil", label: "Profil Toko" },
  { id: "subdomain", label: "Subdomain" },
  { id: "publikasi", label: "Publikasi" },
  { id: "pembayaran", label: "Pembayaran" },
  { id: "notifikasi", label: "Notifikasi" },
];

const COMING_SOON_TABS = ["pembayaran", "notifikasi"];

const STOREFRONT_BASE = "skyeseller.online";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
      if (onStoreUpdated) onStoreUpdated();
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

function SubdomainTab({ store, onStoreUpdated }) {
  const currentSlug = store?.slug ?? "";
  const [slug, setSlug] = useState(currentSlug);
  const [availability, setAvailability] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    setSlug(store?.slug ?? "");
    setAvailability(null);
    setValidationError("");
  }, [store]);

  function validateSlug(value) {
    if (!value) return "Subdomain tidak boleh kosong.";
    if (value.length < 3) return "Subdomain minimal 3 karakter.";
    if (value.length > 63) return "Subdomain maksimal 63 karakter.";
    if (!SLUG_REGEX.test(value))
      return "Hanya huruf kecil, angka, dan tanda hubung. Tidak boleh diawali atau diakhiri tanda hubung.";
    return "";
  }

  function handleSlugChange(e) {
    const value = e.target.value;
    setSlug(value);
    setAvailability(null);

    const err = validateSlug(value);
    setValidationError(err);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!err && value !== currentSlug && store?.id) {
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

  async function handleSave(e) {
    e.preventDefault();
    if (!store?.id) return;

    const err = validateSlug(slug);
    if (err) {
      setValidationError(err);
      return;
    }

    if (availability === "taken") return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({ slug })
        .eq("id", store.id);

      if (error) throw error;

      toast.success("Subdomain aktif ±5 menit");
      if (onStoreUpdated) onStoreUpdated();
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan subdomain.");
    } finally {
      setIsSaving(false);
    }
  }

  const canSave =
    !validationError &&
    !isChecking &&
    slug !== currentSlug &&
    availability !== "taken" &&
    slug.length > 0;

  const liveUrl = `https://${currentSlug}.skye.shop`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Subdomain</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label>URL Toko</Label>
          <div className="flex items-center">
            <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none whitespace-nowrap">
              https://
            </span>
            <Input
              className="rounded-none focus-visible:z-10"
              value={slug}
              onChange={handleSlugChange}
              placeholder="nama-toko"
              aria-label="Subdomain"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <span className="inline-flex h-9 items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none whitespace-nowrap">
              .skye.shop
            </span>
          </div>

          {validationError && (
            <p className="text-xs text-destructive mt-1">{validationError}</p>
          )}

          {!validationError && isChecking && (
            <div className="flex items-center gap-2 mt-1">
              <Skeleton className="h-4 w-24" />
            </div>
          )}

          {!validationError && !isChecking && availability === "available" && (
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="size-4 text-green-600" />
              <Badge
                variant="outline"
                className="text-green-700 border-green-400 bg-green-50"
              >
                Tersedia
              </Badge>
            </div>
          )}

          {!validationError && !isChecking && availability === "taken" && (
            <div className="flex items-center gap-1.5 mt-1">
              <XCircle className="size-4 text-destructive" />
              <span className="text-xs text-destructive">
                Sudah dipakai toko lain
              </span>
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave || isSaving}
          className="w-fit"
        >
          {isSaving ? "Menyimpan..." : "Simpan Subdomain"}
        </Button>

        {currentSlug && (
          <>
            <Separator />
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                URL Aktif
              </p>
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline underline-offset-2 break-all"
              >
                {liveUrl}
              </a>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PublikasiTab({ store, onStoreUpdated }) {
  const isPublished = Boolean(store?.is_published);
  const slug = store?.slug ?? "";
  const [isSaving, setIsSaving] = useState(false);
  const storefrontUrl = slug ? `https://${slug}.${STOREFRONT_BASE}` : "";

  async function togglePublish(nextValue) {
    if (!store?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("stores")
        .update({ is_published: nextValue })
        .eq("id", store.id);

      if (error) throw error;

      toast.success(
        nextValue
          ? "Toko dipublikasikan. Perubahan tampil di publik dalam ~60 detik."
          : "Toko di-unpublish. Pengunjung baru akan melihat halaman 404.",
      );
      if (onStoreUpdated) onStoreUpdated();
    } catch (err) {
      toast.error(err.message || "Gagal mengubah status publikasi.");
    } finally {
      setIsSaving(false);
    }
  }

  async function copyUrl() {
    if (!storefrontUrl) return;
    try {
      await navigator.clipboard.writeText(storefrontUrl);
      toast.success("URL tersalin");
    } catch {
      toast.error("Tidak bisa menyalin URL");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Publikasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="publish-switch" className="text-sm font-medium">
                Publikasikan toko ke publik
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Saat aktif, siapa pun dapat mengakses toko di subdomain di
                bawah. Saat nonaktif, pengunjung akan melihat halaman 404.
              </p>
            </div>
            <Switch
              id="publish-switch"
              checked={isPublished}
              onCheckedChange={togglePublish}
              disabled={isSaving || !store?.id}
            />
          </div>

          <Separator className="my-4" />

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">URL Toko</Label>
            <div className="flex items-center gap-2">
              <Input
                value={storefrontUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyUrl}
                disabled={!storefrontUrl}
                aria-label="Salin URL"
              >
                <Copy className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                asChild
                disabled={!storefrontUrl}
                aria-label="Buka toko di tab baru"
              >
                <a
                  href={storefrontUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isPublished ? (
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="size-3.5 text-green-600" />
                  Toko aktif. Perubahan data di-cache ~60 detik.
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <XCircle className="size-3.5 text-muted-foreground" />
                  Toko belum dipublikasikan. URL ini akan menampilkan 404.
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { store, refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState("profil");

  async function handleStoreUpdated() {
    if (refreshSession) {
      await refreshSession().catch(() => null);
    }
  }

  const isLoading = store === undefined;

  return (
    <section className="grid gap-4">
      <header>
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Kelola profil toko dan konfigurasi subdomain kamu.
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
          ) : activeTab === "subdomain" ? (
            <SubdomainTab store={store} onStoreUpdated={handleStoreUpdated} />
          ) : activeTab === "publikasi" ? (
            <PublikasiTab store={store} onStoreUpdated={handleStoreUpdated} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
