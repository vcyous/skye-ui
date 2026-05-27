import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_TABS } from "../constants";

export default function CollectionsFilterBar({
  statusTab,
  onStatusTabChange,
  tabCounts,
  search,
  onSearchChange,
}) {
  return (
    <>
      <div className="border-b px-4">
        <Tabs value={statusTab} onValueChange={onStatusTabChange}>
          <TabsList className="h-auto bg-transparent p-0 gap-0 rounded-none">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-sm"
              >
                {tab.label}
                {tabCounts[tab.key] != null && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {tabCounts[tab.key]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="px-4 py-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search collections"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 w-72"
          />
        </div>
      </div>
    </>
  );
}
