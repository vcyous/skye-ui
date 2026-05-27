import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrderAddressCard({ address }) {
  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Shipping address</CardTitle>
      </CardHeader>
      <CardContent>
        {address ? (
          <div className="flex flex-col gap-0.5 text-sm">
            <span className="font-medium">{address.fullName}</span>
            <span>{address.addressLine1}</span>
            {Boolean(address.addressLine2) && (
              <span>{String(address.addressLine2)}</span>
            )}
            <span>
              {[address.city, address.postalCode].filter(Boolean).join(", ")}
            </span>
            <span>{address.country}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No address provided.</p>
        )}
      </CardContent>
    </Card>
  );
}
