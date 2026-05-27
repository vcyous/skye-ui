import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "../../../shared/format";
import { STATUS_COLOR } from "../constants";

const STATUS_BADGE_VARIANT = {
  active: "default",
  draft: "secondary",
  inactive: "outline",
  archived: "secondary",
};

function ProductRow({ record, isSelected, onSelect, onEdit, onAddToCart, onDelete }) {
  const qty = record.quantity_in_stock ?? record.stock ?? 0;
  const isOutOfStock = Number(qty) === 0;

  return (
    <TableRow data-state={isSelected ? "selected" : undefined}>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          aria-label={`Select ${record.name}`}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="size-10 rounded-md">
            <AvatarImage src={record.mediaUrls?.[0]} className="object-cover" />
            <AvatarFallback className="rounded-md text-xs">
              {record.name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{record.name}</span>
            {record.vendor && (
              <span className="text-xs text-muted-foreground">{record.vendor}</span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_BADGE_VARIANT[record.status] ?? "secondary"}>
          <span className="capitalize">{record.status}</span>
        </Badge>
      </TableCell>
      <TableCell>
        <span
          className={`text-sm ${isOutOfStock ? "text-destructive" : ""}`}
        >
          {isOutOfStock ? "Out of stock" : `${qty} in stock`}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{formatCurrency(Number(record.price))}</span>
          {record.compareAtPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatCurrency(Number(record.compareAtPrice))}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {record.productType || "—"}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onEdit(record)}
              >
                <Pencil className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onAddToCart(record)}
              >
                <Plus className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add to cart</TooltipContent>
          </Tooltip>

          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(record)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function ProductsTable({
  products,
  isLoading,
  selectedRowKeys,
  onSelectionChange,
  onEdit,
  onAddToCart,
  onDelete,
}) {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const totalPages = Math.ceil(products.length / pageSize);
  const paged = products.slice((page - 1) * pageSize, page * pageSize);

  const allSelected =
    paged.length > 0 && paged.every((r) => selectedRowKeys.includes(r.id));
  const someSelected = paged.some((r) => selectedRowKeys.includes(r.id));

  function toggleAll(checked) {
    if (checked) {
      const merged = Array.from(new Set([...selectedRowKeys, ...paged.map((r) => r.id)]));
      onSelectionChange(merged);
    } else {
      onSelectionChange(selectedRowKeys.filter((k) => !paged.find((r) => r.id === k)));
    }
  }

  function toggleRow(id, checked) {
    if (checked) {
      onSelectionChange([...selectedRowKeys, id]);
    } else {
      onSelectionChange(selectedRowKeys.filter((k) => k !== id));
    }
  }

  if (isLoading) {
    return (
      <div className="grid place-items-center p-12 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onCheckedChange={toggleAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Inventory</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {paged.map((record) => (
            <ProductRow
              key={record.id}
              record={record}
              isSelected={selectedRowKeys.includes(record.id)}
              onSelect={(checked) => toggleRow(record.id, checked)}
              onEdit={onEdit}
              onAddToCart={onAddToCart}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
          <span>{products.length} products</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span>
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
