import { Globe, Layout, Save, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  getStoreProfile,
  getTemplates,
  updateStoreBranding,
  updateStoreProfile,
} from "../../services/api.js";

const currencyOptions = ["USD", "IDR", "SGD", "EUR", "GBP"].map((code) => ({
  value: code,
  label: code,
}));

const timezoneOptions = [
  "Asia/Jakarta",
  "Asia/Singapore",
  "UTC",
  "Europe/London",
  "America/New_York",
].map((value) => ({ value, label: value }));

const localeOptions = [
  { value: "id", label: "Indonesian (id)" },
  { value: "en", label: "English (en)" },
];

const countryOptions = [
  { value: "ID", label: "Indonesia" },
  { value: "SG", label: "Singapore" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
];

const statusOptions = ["draft", "active", "inactive", "archived"].map(
  (value) => ({ value, label: value }),
);

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
      {children}
    </p>
  );
}

function FieldRow({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function FormField({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ControlledSelect({ control, name, options, rules }) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => (
        <Select value={field.value} onValueChange={field.onChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

export default function StorePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  const settingsForm = useForm({ defaultValues: {} });
  const brandingForm = useForm({ defaultValues: {} });

  const isSettingsDirty = settingsForm.formState.isDirty;
  const isBrandingDirty = brandingForm.formState.isDirty;

  const brandingWatch = brandingForm.watch();

  const activeTemplateName = useMemo(
    () => templates.find((item) => item.active)?.name || "Default branding",
    [templates],
  );

  async function loadStoreData() {
    setLoadError("");
    setIsLoading(true);
    try {
      const [store, list] = await Promise.all([
        getStoreProfile(),
        getTemplates(),
      ]);
      setProfile(store);
      setTemplates(list);

      settingsForm.reset({
        storeName: store.storeName,
        description: store.description || "",
        status: store.status || "active",
        currencyCode: store.currencyCode || "IDR",
        timezone: store.timezone || "Asia/Jakarta",
        locale: store.locale || "id",
        country: store.country || "ID",
        contactEmail: store.contactEmail || store.email || "",
        contactPhone: store.contactPhone || "",
        address: store.address || "",
        city: store.city || "",
        province: store.province || "",
        postalCode: store.postalCode || "",
      });

      brandingForm.reset({
        logoUrl: store.branding?.logoUrl || "",
        primaryColor: store.branding?.primaryColor || "#006c9c",
        accentColor: store.branding?.accentColor || "#ffd566",
        headingFont: store.branding?.headingFont || "Space Grotesk",
        bodyFont: store.branding?.bodyFont || "Manrope",
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load store settings.";
      setLoadError(msg);
      toast.error("Failed to load store settings", { description: msg });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadStoreData();
  }, []);

  async function onSaveSettings(values) {
    setIsSavingSettings(true);
    try {
      const updated = await updateStoreProfile(values);
      setProfile(updated);
      toast.success("Store settings saved.");
      settingsForm.reset(values);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save store settings.",
      );
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function onSaveBranding(values) {
    setIsSavingBranding(true);
    try {
      const result = await updateStoreBranding(values);
      setProfile((prev) =>
        prev
          ? { ...prev, branding: { ...prev.branding, ...result.branding } }
          : prev,
      );
      toast.success(
        result.persistedIn === "stores.settings"
          ? "Branding saved (fallback storage)."
          : "Branding saved to active theme.",
      );
      brandingForm.reset(values);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save branding.",
      );
    } finally {
      setIsSavingBranding(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col gap-3">
          <p className="text-destructive font-medium">
            Unable to load store settings
          </p>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button size="sm" variant="outline" onClick={loadStoreData}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Store profile not found. Please retry or re-login to regenerate your
            store context.
          </p>
        </CardContent>
      </Card>
    );
  }

  const brandingPreview = {
    logoUrl: brandingWatch.logoUrl || profile.branding?.logoUrl || "",
    primaryColor:
      brandingWatch.primaryColor || profile.branding?.primaryColor || "#006c9c",
    accentColor:
      brandingWatch.accentColor || profile.branding?.accentColor || "#ffd566",
    headingFont:
      brandingWatch.headingFont ||
      profile.branding?.headingFont ||
      "Space Grotesk",
    bodyFont:
      brandingWatch.bodyFont || profile.branding?.bodyFont || "Manrope",
  };

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">Settings</h4>
        <Button onClick={() => navigate("/dashboard/store/website-builder")}>
          <Layout className="size-4" />
          Open website builder
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="flex flex-col gap-4">
          {/* Store details */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="size-4" />
                Store details
              </CardTitle>
              {isSettingsDirty && (
                <Button
                  size="sm"
                  disabled={isSavingSettings}
                  onClick={settingsForm.handleSubmit(onSaveSettings)}
                >
                  <Save className="size-3.5" />
                  Save
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={settingsForm.handleSubmit(onSaveSettings)}>
                <SectionLabel>Business information</SectionLabel>
                <FieldRow>
                  <FormField label="Store name">
                    <Input
                      placeholder="My Awesome Store"
                      {...settingsForm.register("storeName", {
                        required: true,
                      })}
                    />
                  </FormField>
                  <FormField label="Status">
                    <ControlledSelect
                      control={settingsForm.control}
                      name="status"
                      options={statusOptions}
                      rules={{ required: true }}
                    />
                  </FormField>
                  <div className="md:col-span-2">
                    <FormField label="Store description">
                      <Textarea
                        rows={2}
                        placeholder="Brief description of your store"
                        {...settingsForm.register("description")}
                      />
                    </FormField>
                  </div>
                </FieldRow>

                <Separator className="my-4" />

                <SectionLabel>Contact information</SectionLabel>
                <FieldRow>
                  <FormField label="Contact email">
                    <Input
                      type="email"
                      placeholder="store@example.com"
                      {...settingsForm.register("contactEmail")}
                    />
                  </FormField>
                  <FormField label="Contact phone">
                    <Input
                      placeholder="+62..."
                      {...settingsForm.register("contactPhone")}
                    />
                  </FormField>
                </FieldRow>

                <Separator className="my-4" />

                <SectionLabel>Store address</SectionLabel>
                <div className="flex flex-col gap-3">
                  <FormField label="Address">
                    <Input
                      placeholder="Street address"
                      {...settingsForm.register("address")}
                    />
                  </FormField>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FormField label="City">
                      <Input {...settingsForm.register("city")} />
                    </FormField>
                    <FormField label="Province / State">
                      <Input {...settingsForm.register("province")} />
                    </FormField>
                    <FormField label="Postal code">
                      <Input {...settingsForm.register("postalCode")} />
                    </FormField>
                  </div>
                </div>

                <Separator className="my-4" />

                <SectionLabel>Store defaults</SectionLabel>
                <FieldRow>
                  <FormField label="Currency">
                    <ControlledSelect
                      control={settingsForm.control}
                      name="currencyCode"
                      options={currencyOptions}
                      rules={{ required: true }}
                    />
                  </FormField>
                  <FormField label="Country">
                    <ControlledSelect
                      control={settingsForm.control}
                      name="country"
                      options={countryOptions}
                      rules={{ required: true }}
                    />
                  </FormField>
                  <FormField label="Timezone">
                    <ControlledSelect
                      control={settingsForm.control}
                      name="timezone"
                      options={timezoneOptions}
                      rules={{ required: true }}
                    />
                  </FormField>
                  <FormField label="Language">
                    <ControlledSelect
                      control={settingsForm.control}
                      name="locale"
                      options={localeOptions}
                      rules={{ required: true }}
                    />
                  </FormField>
                </FieldRow>

                <div className="mt-4">
                  <Button
                    type="submit"
                    disabled={!isSettingsDirty || isSavingSettings}
                  >
                    <Save className="size-4" />
                    Save settings
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Branding card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="size-4" />
                Brand & appearance
              </CardTitle>
              {isBrandingDirty && (
                <Button
                  size="sm"
                  disabled={isSavingBranding}
                  onClick={brandingForm.handleSubmit(onSaveBranding)}
                >
                  <Save className="size-3.5" />
                  Save
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={brandingForm.handleSubmit(onSaveBranding)}>
                <div className="flex flex-col gap-3">
                  <FormField label="Logo URL">
                    <Input
                      placeholder="https://..."
                      {...brandingForm.register("logoUrl")}
                    />
                  </FormField>
                  <FieldRow>
                    <FormField label="Primary color">
                      <div className="flex gap-2">
                        <Input
                          placeholder="#006c9c"
                          {...brandingForm.register("primaryColor")}
                        />
                        <input
                          type="color"
                          className="h-9 w-10 cursor-pointer rounded border border-input p-0.5"
                          value={brandingWatch.primaryColor || "#006c9c"}
                          onChange={(e) =>
                            brandingForm.setValue(
                              "primaryColor",
                              e.target.value,
                              { shouldDirty: true },
                            )
                          }
                        />
                      </div>
                    </FormField>
                    <FormField label="Accent color">
                      <div className="flex gap-2">
                        <Input
                          placeholder="#ffd566"
                          {...brandingForm.register("accentColor")}
                        />
                        <input
                          type="color"
                          className="h-9 w-10 cursor-pointer rounded border border-input p-0.5"
                          value={brandingWatch.accentColor || "#ffd566"}
                          onChange={(e) =>
                            brandingForm.setValue(
                              "accentColor",
                              e.target.value,
                              { shouldDirty: true },
                            )
                          }
                        />
                      </div>
                    </FormField>
                    <FormField label="Heading font">
                      <Input {...brandingForm.register("headingFont")} />
                    </FormField>
                    <FormField label="Body font">
                      <Input {...brandingForm.register("bodyFont")} />
                    </FormField>
                  </FieldRow>
                </div>

                <div className="mt-4">
                  <Button
                    type="submit"
                    disabled={!isBrandingDirty || isSavingBranding}
                  >
                    <Save className="size-4" />
                    Save branding
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-3">
          {/* Store overview */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="size-12 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0"
                  style={{ background: brandingPreview.primaryColor }}
                >
                  {profile.storeName?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{profile.storeName}</p>
                  <Badge
                    variant={
                      profile.status === "active" ? "default" : "secondary"
                    }
                    className="text-xs mt-0.5"
                  >
                    {profile.status || "draft"}
                  </Badge>
                </div>
              </div>
              {profile.description && (
                <p className="text-sm text-muted-foreground">
                  {profile.description}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Brand preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Branding preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="rounded-xl p-4"
                style={{
                  border: `2px solid ${brandingPreview.accentColor}`,
                }}
              >
                {brandingPreview.logoUrl ? (
                  <img
                    src={brandingPreview.logoUrl}
                    alt="Store logo"
                    className="size-11 rounded-lg object-cover"
                  />
                ) : (
                  <div
                    className="size-11 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: brandingPreview.primaryColor }}
                  >
                    {profile.storeName?.[0]?.toUpperCase()}
                  </div>
                )}
                <h5
                  className="mt-2.5 mb-1 font-semibold text-base"
                  style={{
                    color: brandingPreview.primaryColor,
                    fontFamily: brandingPreview.headingFont,
                  }}
                >
                  {profile.storeName}
                </h5>
                <p
                  className="text-sm text-[#666]"
                  style={{ fontFamily: brandingPreview.bodyFont }}
                >
                  {profile.description || "Your store description"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Templates list */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium">Themes</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  navigate("/dashboard/store/website-builder")
                }
              >
                Manage
              </Button>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No themes yet. Default branding is active.
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {templates.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between py-1.5 border-b last:border-0"
                    >
                      <span className="text-sm">{item.name}</span>
                      {item.active && (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                Active theme: {activeTemplateName}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
