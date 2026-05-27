import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "../../../../shared/format";

export default function OrderTransactionsCard({ transactions }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Transactions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <div className="grid place-items-center p-8 text-muted-foreground text-sm">
            No transactions yet
          </div>
        ) : (
          <ul className="divide-y">
            {transactions.map((item) => (
              <li key={item.id} className="px-4 py-2.5">
                <p className="text-sm font-medium">
                  {item.paymentMethodName} · {formatCurrency(item.amount)}
                </p>
                <Badge variant={item.status === "success" ? "default" : "outline"}>
                  {item.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
