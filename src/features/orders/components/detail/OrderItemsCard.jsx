import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Clock } from "lucide-react";
import { formatCurrency } from "../../../../shared/format";

export default function OrderItemsCard({ order, fulfillmentItems, hasUnshipped }) {
  const currency = order?.displayCurrencyCode || order?.currencyCode || "USD";
  const totalsRows = [
    {
      label: "Subtotal",
      value: order?.displaySubtotalAmount ?? order?.subtotalAmount ?? 0,
    },
    {
      label: "Shipping",
      value: order?.displayShippingAmount ?? order?.shippingAmount ?? 0,
    },
    {
      label: "Discount",
      value: -(order?.displayDiscountAmount ?? order?.discountAmount ?? 0),
    },
    {
      label: "Tax",
      value: order?.displayTaxAmount ?? order?.taxAmount ?? 0,
    },
  ];

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Items</CardTitle>
          {!hasUnshipped && (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="size-3" />
              Fully shipped
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="w-14">Qty</TableHead>
              <TableHead className="w-24">Price</TableHead>
              <TableHead className="w-28">Total</TableHead>
              <TableHead className="w-32">Fulfillment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(order?.items ?? []).map((record) => {
              const fi = fulfillmentItems.find((item) => item.id === record.id);
              return (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0">
                      <span className="text-sm font-medium">
                        {record.productTitle}
                      </span>
                      {record.variantTitle && (
                        <span className="text-xs text-muted-foreground">
                          {record.variantTitle}
                        </span>
                      )}
                      {record.sku && (
                        <span className="text-xs text-muted-foreground">
                          SKU: {record.sku}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{record.quantity}</TableCell>
                  <TableCell className="text-sm">
                    {formatCurrency(record.unitPrice)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatCurrency(record.lineTotal)}
                  </TableCell>
                  <TableCell>
                    {!fi ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : fi.remainingQty === 0 ? (
                      <Badge variant="default" className="gap-1 text-xs">
                        <CheckCircle2 className="size-3" />
                        Fulfilled
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Clock className="size-3" />
                        {fi.allocatedQty}/{fi.orderedQty} shipped
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="px-4 py-3 border-t">
          {totalsRows.map((row) => (
            <div
              key={row.label}
              className="flex justify-between py-1 text-sm"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span>{formatCurrency(Math.abs(row.value), { currency })}</span>
            </div>
          ))}
          <Separator className="my-2" />
          <div className="flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span className="text-base">
              {formatCurrency(
                order?.displayTotalAmount ?? order?.totalAmount ?? 0,
                { currency },
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
