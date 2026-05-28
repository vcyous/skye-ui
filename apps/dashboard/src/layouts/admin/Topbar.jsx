import { Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Topbar({
  isMobile,
  currentRouteLabel,
  onOpenMobileNav,
}) {
  const { user, store } = useAuth();

  const initial = String(user?.email || "U").slice(0, 1).toUpperCase();

  return (
    <div className="flex items-center justify-between gap-3 border-b bg-card px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        {isMobile ? (
          <Button size="icon" variant="ghost" onClick={onOpenMobileNav}>
            <Menu className="size-4" />
          </Button>
        ) : null}
        <span className="text-sm font-semibold">
          {isMobile ? currentRouteLabel : store?.name || "Skye"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">
            {store?.isPublished ? "Published" : "Draft"}
          </span>
        </div>
        <Avatar className="size-8">
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
