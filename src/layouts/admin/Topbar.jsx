import { Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLocalization } from "../../context/LocalizationContext.jsx";

export default function Topbar({
  isMobile,
  currentRouteLabel,
  onOpenMobileNav,
}) {
  const { user, store } = useAuth();
  const { t, activeLocale, settings, setLocale } = useLocalization();

  const initial = String(user?.email || "U").slice(0, 1).toUpperCase();
  const locales = settings?.enabledLocales || ["id", "en"];

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2.5 shadow-sm">
      <div className="flex items-center gap-2.5">
        {isMobile ? (
          <Button size="icon" variant="outline" onClick={onOpenMobileNav}>
            <Menu className="size-4" />
          </Button>
        ) : null}
        <div className="flex items-center gap-1.5">
          <div className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground text-[0.7rem] font-bold">
            SK
          </div>
          <span className="text-sm font-semibold">
            {isMobile ? currentRouteLabel : store?.name || "Skye"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary">{t("app.liveOps", "Live Ops")}</Badge>
        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">
            {t("app.realtimeSync", "Realtime sync")}
          </span>
        </div>

        <Select value={activeLocale} onValueChange={(v) => setLocale(v, true)}>
          <SelectTrigger className="h-8 w-[88px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locales.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Avatar className="size-8">
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
