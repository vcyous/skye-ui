import { Plus, Search } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BULK_STATUS_ACTIONS, STATUS_TABS } from "../constants";

const CATEGORY_OPTIONS = [
  { value: "all", label: "Semua kategori" },
  { value: "Atasan", label: "Atasan" },
  { value: "Bawahan", label: "Bawahan" },
  { value: "Dress", label: "Dress" },
  { value: "Outer", label: "Outer" },
  { value: "Aksesoris", label: "Aksesoris" },
];

export default function ProductsFilterBar({
  status,
  onStatusChange,
  tabCounts,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  selectedCount,
  isBulkBusy,
  onBulkStatusChange,
  onBulkDelete,
  onAdd,
}) {
  return (
    <>
      <div className="border-b px-4">
        <Tabs value={status} onValueChange={onStatusChange}>
          <TabsList className="h-auto bg-transparent p-0 gap-0 rounded-none">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2.5 text-sm"
              >
                {tab.label}
                {tabCounts[tab.key] != null && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({tabCounts[tab.key]})
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b">
        <div className="relative w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={category || "all"} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          {selectedCount > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedCount} dipilih
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" disabled={isBulkBusy}>
                    Aksi massal
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {BULK_STATUS_ACTIONS.map((action) => (
                    <DropdownMenuItem
                      key={action.key}
                      onClick={() => onBulkStatusChange(action.status)}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" disabled={isBulkBusy}>
                    Hapus
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus {selectedCount} produk?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tindakan ini tidak dapat dibatalkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={onBulkDelete}>Hapus</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          <Button size="sm" onClick={onAdd}>
            <Plus className="size-4 mr-1" />
            Tambah Produk
          </Button>
        </div>
      </div>
    </>
  );
}
