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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function CollectionsTable({
  collections,
  onEdit,
  onAssign,
  onPreview,
  onDelete,
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Products</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-44" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {collections.map((record) => (
          <TableRow key={record.id}>
            <TableCell>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{record.name}</span>
                {record.urlHandle && (
                  <span className="text-xs text-muted-foreground">
                    /{record.urlHandle}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <span className="text-sm">{record.productCount ?? 0}</span>
            </TableCell>
            <TableCell>
              {record.collectionType === "smart" ? (
                <Badge variant="secondary" className="text-purple-700 bg-purple-100">
                  Smart
                </Badge>
              ) : (
                <Badge variant="outline">Manual</Badge>
              )}
            </TableCell>
            <TableCell>
              <Badge
                variant={record.status === "active" ? "default" : "secondary"}
              >
                <span className="capitalize">{record.status}</span>
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {record.collectionType === "manual" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAssign(record)}
                  >
                    Assign products
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPreview(record)}
                  >
                    Preview
                  </Button>
                )}

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
                      <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
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
        ))}
      </TableBody>
    </Table>
  );
}
