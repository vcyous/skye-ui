import { Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ComingSoonPage() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Rocket className="size-10" />
        </div>
        <h2 className="text-2xl font-semibold">Feature Under Development</h2>
        <div className="max-w-md space-y-1">
          <p className="text-sm text-muted-foreground">
            This feature is part of our upcoming roadmap and will be available
            in a future release.
          </p>
          <p className="text-xs text-muted-foreground">
            We're focusing on the core commerce experience for now — store
            setup, products, and orders.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 pt-2">
          <Badge variant="secondary">Coming Soon</Badge>
          <Button size="lg" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
