import { ArrowUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function KpiCard({ title, value, delta, icon, color }) {
  return (
    <Card>
      <CardContent className="px-5 py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-1.5 text-sm text-muted-foreground">{title}</p>
            <div className="text-2xl font-bold">{value}</div>
            {delta && (
              <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                <ArrowUp className="size-3" />
                <span>{delta} vs last period</span>
              </div>
            )}
          </div>
          {icon ? (
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white"
              style={color ? { background: color } : undefined}
            >
              {icon}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
