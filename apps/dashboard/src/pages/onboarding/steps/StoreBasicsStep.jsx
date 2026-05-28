import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CURRENCY_OPTIONS = [
  { value: "IDR", label: "IDR — Indonesian Rupiah" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "MYR", label: "MYR — Malaysian Ringgit" },
];

const TIMEZONE_OPTIONS = [
  { value: "Asia/Jakarta", label: "Asia/Jakarta (WIB)" },
  { value: "Asia/Makassar", label: "Asia/Makassar (WITA)" },
  { value: "Asia/Jayapura", label: "Asia/Jayapura (WIT)" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
  { value: "UTC", label: "UTC" },
];

export default function StoreBasicsStep({ onNext }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { storeName: "", currency: "IDR", timezone: "Asia/Jakarta" },
  });

  return (
    <>
      <h3 className="text-xl font-semibold">Tell us about your store</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        You can change these settings later from your dashboard.
      </p>
      <form
        onSubmit={handleSubmit(onNext)}
        className="mt-6 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="storeName">Store name</Label>
          <Input
            id="storeName"
            placeholder="e.g. Batik Nusantara"
            aria-invalid={!!errors.storeName}
            {...register("storeName", {
              required: "Store name is required",
              minLength: { value: 3, message: "Minimum 3 characters" },
              maxLength: { value: 100, message: "Maximum 100 characters" },
            })}
          />
          {errors.storeName && (
            <p className="text-xs text-destructive">
              {errors.storeName.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="currency">Currency</Label>
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Controller
            control={control}
            name="timezone"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <Button type="submit" size="lg" className="w-full">
          Continue
        </Button>
      </form>
    </>
  );
}
