import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { SHIPPING_TYPE_OPTIONS } from "../constants";

function toFormValues(method) {
  if (!method) return {};
  return {
    name: method.name,
    shippingType: method.shippingType,
    baseRate: method.baseRate,
    isActive: method.isActive,
    zoneIds: (method.zones || []).map((zone) => zone.id),
  };
}

export default function MethodFormModal({
  mode,
  open,
  method,
  zones,
  onSubmit,
  onCancel,
  isSaving,
}) {
  const isEdit = mode === "edit";

  const { register, handleSubmit, control, reset, setValue } = useForm({
    defaultValues: {
      name: "",
      shippingType: "flat_rate",
      baseRate: 0,
      isActive: true,
      zoneIds: [],
    },
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && method) {
      const vals = toFormValues(method);
      Object.entries(vals).forEach(([k, v]) => setValue(k, v));
    } else {
      reset({
        name: "",
        shippingType: "flat_rate",
        baseRate: 0,
        isActive: true,
        zoneIds: [],
      });
    }
  }, [open, isEdit, method, reset, setValue]);

  async function handleFinish(values) {
    const ok = await onSubmit(values);
    if (ok) reset();
  }

  function handleCancel() {
    reset();
    onCancel();
  }

  const activeZones = zones.filter((item) => item.isActive);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Shipping Method" : "Add Shipping Method"}
          </DialogTitle>
        </DialogHeader>

        <form
          id="method-form"
          onSubmit={handleSubmit(handleFinish)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input {...register("name", { required: true })} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Controller
              name="shippingType"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPPING_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Base Rate</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              {...register("baseRate", { valueAsNumber: true })}
            />
          </div>

          <div className="flex items-center gap-3">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label>Active</Label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Zones</Label>
            <Controller
              name="zoneIds"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-1">
                  {activeZones.map((zone) => (
                    <label
                      key={zone.id}
                      className="flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={(field.value || []).includes(zone.id)}
                        onChange={(e) => {
                          const current = field.value || [];
                          if (e.target.checked) {
                            field.onChange([...current, zone.id]);
                          } else {
                            field.onChange(
                              current.filter((id) => id !== zone.id),
                            );
                          }
                        }}
                        className="accent-primary"
                      />
                      {zone.name}
                    </label>
                  ))}
                  {activeZones.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      {isEdit ? "No active zones" : "All zones when empty"}
                    </span>
                  )}
                </div>
              )}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form="method-form" disabled={isSaving}>
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
