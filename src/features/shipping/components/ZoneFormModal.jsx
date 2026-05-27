import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

function toFormValues(zone) {
  if (!zone) return { name: "", countryCode: "", regionCode: "", postalCodePattern: "", isActive: true };
  return {
    name: zone.name,
    countryCode: zone.countryCode,
    regionCode: zone.regionCode,
    postalCodePattern: zone.postalCodePattern,
    isActive: zone.isActive,
  };
}

export default function ZoneFormModal({ mode, open, zone, onSubmit, onCancel }) {
  const isEdit = mode === "edit";

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: toFormValues(zone),
  });

  useEffect(() => {
    if (!open) return;
    reset(isEdit && zone ? toFormValues(zone) : toFormValues(null));
  }, [open, isEdit, zone, reset]);

  async function onFormSubmit(values) {
    const ok = await onSubmit(values);
    if (ok) reset(toFormValues(null));
  }

  function handleCancel() {
    reset(toFormValues(null));
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Shipping Zone" : "Add Shipping Zone"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Zone Name</Label>
            <Input
              id="name"
              placeholder={isEdit ? undefined : "Jakarta Metro"}
              {...register("name", { required: "Zone name is required" })}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="countryCode">Country</Label>
            <Input
              id="countryCode"
              placeholder={isEdit ? undefined : "ID"}
              {...register("countryCode")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="regionCode">Region</Label>
            <Input
              id="regionCode"
              placeholder={isEdit ? undefined : "JK"}
              {...register("regionCode")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="postalCodePattern">Postal Pattern</Label>
            <Input
              id="postalCodePattern"
              placeholder={isEdit ? undefined : "10*"}
              {...register("postalCodePattern")}
            />
          </div>

          <div className="flex items-center gap-3">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Save Changes" : "Add Zone"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
