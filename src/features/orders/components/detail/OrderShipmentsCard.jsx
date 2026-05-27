import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrderShipmentsCard({ shipments }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Shipments</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {shipments.length === 0 ? (
          <div className="grid place-items-center p-8 text-muted-foreground text-sm">
            No shipments yet
          </div>
        ) : (
          <ul className="divide-y">
            {shipments.map((item) => (
              <li key={item.id} className="px-4 py-2.5">
                <p className="text-sm font-medium">
                  {item.carrier || "Unknown"} · {item.status}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tracking: {item.trackingNumber || "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
