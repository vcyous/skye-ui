import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../context/AuthContext.jsx";
import { navItems } from "./navConfig";

export default function Sidebar({ onLogout }) {
  const { user, store } = useAuth();

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3 px-2 pt-1">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
          SK
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {store?.name || "Toko Saya"}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`size-1.5 rounded-full shrink-0 ${
                store?.isPublished ? "bg-emerald-500" : "bg-muted-foreground"
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {store?.isPublished ? "Published" : "Draft"}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t pt-3 px-2 pb-1">
        <p className="mb-2 truncate text-xs text-muted-foreground">
          {user?.email || ""}
        </p>
        <Button variant="outline" className="w-full" onClick={onLogout}>
          Keluar
        </Button>
      </div>
    </div>
  );
}
