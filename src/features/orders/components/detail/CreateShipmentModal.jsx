import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { CARRIER_OPTIONS } from "../../constants";

export default function CreateShipmentModal({
  open,
  isShipping,
  onSubmit,
  onCancel,
}) {
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  async function handleFinish(values) {
    const ok = await onSubmit(values);
    if (ok) reset();
  }

  function handleCancel() {
    reset();
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create shipment</DialogTitle>
        </DialogHeader>

        <form id="shipment-form" onSubmit={handleSubmit(handleFinish)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Carrier <span className="text-destructive">*</span></Label>
            <Select onValueChange={(v) => setValue("carrier", v, { shouldValidate: true })}>
              <SelectTrigger>
                <SelectValue placeholder="Select carrier" />
              </SelectTrigger>
              <SelectContent>
                {CARRIER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" {...register("carrier", { required: true })} />
            {errors.carrier && (
              <span className="text-xs text-destructive">Carrier is required.</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tracking number <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g. JNE1234567890"
              {...register("trackingNumber", { required: true })}
            />
            {errors.trackingNumber && (
              <span className="text-xs text-destructive">Tracking number is required.</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Note (optional)</Label>
            <Textarea
              rows={2}
              placeholder="Handling instructions, etc."
              {...register("note")}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isShipping}>
            Cancel
          </Button>
          <Button type="submit" form="shipment-form" disabled={isShipping}>
            {isShipping && <Loader2 className="size-4 animate-spin mr-2" />}
            Create shipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
