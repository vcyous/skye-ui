import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROWS = [
  {
    label: "Payment status",
    valueKey: "paymentStatus",
    optionsKey: "paymentStatus",
    patchKey: "paymentStatus",
    noteLabel: "Payment status",
  },
  {
    label: "Order status",
    valueKey: "status",
    optionsKey: "status",
    patchKey: "status",
    noteLabel: "Order status",
  },
  {
    label: "Fulfillment status",
    valueKey: "fulfillmentStatus",
    optionsKey: "fulfillmentStatus",
    patchKey: "fulfillmentStatus",
    noteLabel: "Fulfillment",
    fallback: "unfulfilled",
  },
];

export default function OrderPaymentCard({
  order,
  lifecycleOptions,
  isSaving,
  onPatch,
}) {
  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Payment</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {ROWS.map((row) => (
          <div
            key={row.valueKey}
            className="flex items-center justify-between gap-2"
          >
            <span className="text-sm">{row.label}</span>
            <Select
              value={order?.[row.valueKey] || row.fallback}
              disabled={isSaving}
              onValueChange={(value) =>
                onPatch({
                  [row.patchKey]: value,
                  note: `${row.noteLabel} → ${value}`,
                })
              }
            >
              <SelectTrigger className="h-7 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lifecycleOptions[row.optionsKey].map((item) => (
                  <SelectItem key={item} value={item} className="text-xs">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
