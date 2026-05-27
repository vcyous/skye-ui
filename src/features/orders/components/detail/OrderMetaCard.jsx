import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrderMetaCard({ order }) {
  const currency = order?.displayCurrencyCode || order?.currencyCode || "USD";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Order details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {order?.subscriptionContext && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Subscription</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {order.subscriptionContext.planName || "Subscription"}
              </Badge>
              <Badge variant="outline">
                {order.subscriptionContext.isRenewal ? "Renewal" : "First charge"}
              </Badge>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Currency</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{currency}</Badge>
            {order?.currencySnapshot && (
              <span className="text-xs text-muted-foreground">
                FX: {order.currencySnapshot.fxRate}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
