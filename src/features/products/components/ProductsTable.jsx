import { Pencil, Trash2 } from "lucide-react";
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
import { STATUS_LABEL } from "../constants";

function formatRp(value) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function StatusBadge({ status }) {
  const classes = {
    active: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
    draft: "bg-muted text-muted-foreground",
    archived: "bg-red-100 text-red-800 hover:bg-red-100",
  };
  return (
    <Badge className={classes[status] ?? classes.draft}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

function StockCell({ stock }) {
  const qty = Number(stock ?? 0);
  const cls =
    qty === 0
      ? "text-destructive font-medium"
      : qty <= 3
        ? "text-amber-600 font-medium"
        : "";
  return <span className={`text-sm ${cls}`}>{qty}</span>;
}

function ProductRow({ record, isSelected, onSelect, onEdit, onDelete }) {
  return (
    <TableRow data-state={isSelected ? "selected" : undefined}>
      <TableCell className="w-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          aria-label={`Pilih ${record.name}`}
        />
      </TableCell>
      <TableCell className="w-12">
        <Avatar className="size-10 rounded-md">
          <AvatarImage
            src={record.media_urls?.[0]}
            className="object-cover"
          />
          <AvatarFallback className="rounded-md text-xs">
            {String(record.name || "?")[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium leading-tight">{record.name}</span>
          {record.category && (
            <span className="text-xs text-muted-foreground">{record.category}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-sm">{formatRp(record.price)}</TableCell>
      <TableCell>
        <StockCell stock={record.stock} />
      </TableCell>
      <TableCell>
        <StatusBadge status={record.status} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => onEdit(record)}
            aria-label="Edit"
          >
            <Pencil className="size-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive hover:text-destructive"
                aria-label="Hapus"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus produk?</AlertDialogTitle>
                <AlertDialogDescription>
                  Produk "{record.name}" akan dihapus permanen.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(record)}>
                  Hapus
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
  selectedRowKeys,
  onSelectRow,
  onSelectAll,
  onEdit,
  onDelete,
}) {
  const allSelected =
    products.length > 0 && products.every((p) => selectedRowKeys.includes(p.id));
  const someSelected = selectedRowKeys.length > 0 && !allSelected;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={() =>
                onSelectAll(allSelected ? [] : products.map((p) => p.id))
              }
              aria-label="Pilih semua"
            />
          </TableHead>
          <TableHead className="w-12">Foto</TableHead>
          <TableHead>Nama Produk</TableHead>
          <TableHead>Harga</TableHead>
          <TableHead>Stok</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-20">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
              Belum ada produk
            </TableCell>
          </TableRow>
        ) : (
          products.map((product) => (
            <ProductRow
              key={product.id}
              record={product}
              isSelected={selectedRowKeys.includes(product.id)}
              onSelect={(checked) => {
                if (checked) {
                  onSelectRow([...selectedRowKeys, product.id]);
                } else {
                  onSelectRow(selectedRowKeys.filter((k) => k !== product.id));
                }
              }}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}
