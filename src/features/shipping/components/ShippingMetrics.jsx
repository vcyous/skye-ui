import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const METRIC_CARDS = [
  { key: "methods", title: "Methods" },
  { key: "zones", title: "Zones" },
  { key: "pending", title: "Pending" },
  { key: "activeShipments", title: "Active Shipments" },
];

export default function ShippingMetrics({ metrics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {METRIC_CARDS.map((card) => (
        <Card key={card.key}>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics[card.key]}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
