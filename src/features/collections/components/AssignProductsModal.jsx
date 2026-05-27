import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search } from "lucide-react";

export default function AssignProductsModal({
  collection,
  products,
  isSaving,
  onSubmit,
  onCancel,
}) {
  const open = Boolean(collection);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open && collection) {
      setSelected(collection.productIds || []);
      setQuery("");
    }
  }, [open, collection]);

  async function handleSave() {
    const ok = await onSubmit(collection.id, selected);
    if (ok) {
      setSelected([]);
      setQuery("");
    }
  }

  function toggleProduct(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const filtered = products.filter((p) => {
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Assign products — {collection?.name ?? ""}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Label>Products</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search and select products"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto rounded border divide-y">
            {filtered.length === 0 ? (
              <div className="grid place-items-center p-8 text-muted-foreground text-sm">
                No products found
              </div>
            ) : (
              filtered.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(item.id)}
                    onChange={() => toggleProduct(item.id)}
                    className="accent-primary"
                  />
                  <span>
                    {item.name}
                    <span className="text-muted-foreground ml-1">
                      ({item.sku})
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {selected.length} product{selected.length !== 1 ? "s" : ""} selected
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
