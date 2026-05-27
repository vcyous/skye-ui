import { NavLink } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLocalization } from "../../context/LocalizationContext.jsx";
import { flatNavItems, navSections } from "./navConfig";

export default function Sidebar({
  activeMenuKey,
  openKeys,
  onOpenChange,
  onLogout,
}) {
  const { user, store } = useAuth();
  const { t } = useLocalization();

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3 px-2">
        <div className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
          SK
        </div>
        <div className="flex-1">
          <h4 className="text-base font-semibold">{store?.name || "Skye"}</h4>
          <div className="flex items-center gap-1.5">
            <span
              className={`size-2 rounded-full ${
                store?.isPublished ? "bg-emerald-500" : "bg-muted-foreground"
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {store?.isPublished ? "Published" : "Draft"}
            </span>
          </div>
        </div>
      </div>

      <Accordion
        type="multiple"
        value={openKeys}
        onValueChange={onOpenChange}
        className="flex-1 overflow-y-auto"
      >
        {navSections.map((section) => (
          <AccordionItem
            key={section.key}
            value={section.key}
            className="border-none"
          >
            <AccordionTrigger className="px-2 py-2 text-sm font-semibold hover:no-underline">
              <span className="flex items-center gap-2">
                {section.icon}
                {section.label}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-1">
              <div className="flex flex-col gap-0.5 pl-2">
                {section.children.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/dashboard"}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                        isActive || activeMenuKey === link.to
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`
                    }
                  >
                    {link.icon}
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="border-t pt-3 px-2">
        <p className="mb-3 break-all text-xs text-muted-foreground">
          {user?.email || ""}
        </p>
        <Button variant="outline" className="w-full" onClick={onLogout}>
          {t("app.logout", "Logout")}
        </Button>
      </div>
    </div>
  );
}

export { flatNavItems };
