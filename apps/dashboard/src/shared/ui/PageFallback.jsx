import { Loader2 } from "lucide-react";

export default function PageFallback() {
  return (
    <div className="flex min-h-[200px] items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      <span className="text-sm">Loading page...</span>
    </div>
  );
}
