import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrderCustomerCard({ order }) {
  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Customer</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5 text-sm">
        <span className="font-medium">{order?.customerName || "Guest"}</span>
        {order?.customerEmail && (
          <span className="text-muted-foreground">{order.customerEmail}</span>
        )}
        {order?.customerPhone && (
          <span className="text-muted-foreground">{order.customerPhone}</span>
        )}
      </CardContent>
    </Card>
  );
}
