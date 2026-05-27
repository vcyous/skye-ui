import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { SHIPMENT_STATUS_OPTIONS } from "../constants";

export default function CreateShipmentModal({
  open,
  orders,
  methods,
  isSaving,
  fetchFulfillmentItems,
  onSubmit,
  onCancel,
}) {
  const { register, handleSubmit, control, reset, setValue } = useForm({
    defaultValues: {
      orderId: "",
      shippingMethodId: "",
      carrier: "",
      trackingNumber: "",
      status: "pending",
    },
  });
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [fulfillmentItems, setFulfillmentItems] = useState([]);
  const [shipmentItemQty, setShipmentItemQty] = useState({});

  useEffect(() => {
    if (!open) {
      reset();
      setSelectedOrderId("");
      setFulfillmentItems([]);
      setShipmentItemQty({});
    }
  }, [open, reset]);

  async function handleSelectOrder(orderId) {
    setSelectedOrderId(orderId);
    setValue("orderId", orderId);
    if (!orderId) {
      setFulfillmentItems([]);
      setShipmentItemQty({});
      return;
    }
    const items = await fetchFulfillmentItems(orderId);
    setFulfillmentItems(items);
    setShipmentItemQty(
      items.reduce((acc, item) => {
        acc[item.id] = 0;
        return acc;
      }, {}),
    );
  }

  async function handleFinish(values) {
    const selectedItems = Object.entries(shipmentItemQty)
      .map(([orderItemId, quantity]) => ({
        orderItemId,
        quantity: Number(quantity || 0),
      }))
      .filter((item) => item.quantity > 0);

    if (!selectedItems.length) {
      toast.warning("Select at least one item quantity for shipment");
      return;
    }

    const ok = await onSubmit({ ...values, items: selectedItems });
    if (ok) {
      reset();
      setSelectedOrderId("");
      setFulfillmentItems([]);
      setShipmentItemQty({});
    }
  }

  const activeMethodOptions = methods.filter((item) => item.isActive);
  const orderOptions = orders;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create Shipment</DialogTitle>
        </DialogHeader>

        <form
          id="create-shipment-form"
          onSubmit={handleSubmit(handleFinish)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label>Order</Label>
            <Controller
              name="orderId"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    handleSelectOrder(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select order" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderOptions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.orderNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Shipping Method</Label>
            <Controller
              name="shippingMethodId"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMethodOptions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Carrier</Label>
            <Input {...register("carrier")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tracking Number</Label>
            <Input {...register("trackingNumber")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPMENT_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {selectedOrderId && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Split Shipment Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Ordered</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Ship Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fulfillmentItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          No fulfillable items for this order.
                        </TableCell>
                      </TableRow>
                    ) : (
                      fulfillmentItems.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {record.productTitle}
                            {record.variantTitle
                              ? ` - ${record.variantTitle}`
                              : ""}
                          </TableCell>
                          <TableCell>{record.sku}</TableCell>
                          <TableCell>{record.orderedQty}</TableCell>
                          <TableCell>{record.remainingQty}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={record.remainingQty}
                              value={shipmentItemQty[record.id] ?? 0}
                              onChange={(e) =>
                                setShipmentItemQty((prev) => ({
                                  ...prev,
                                  [record.id]: Number(e.target.value || 0),
                                }))
                              }
                              className="w-20"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-shipment-form"
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
