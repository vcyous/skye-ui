import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function MethodsSection({
  methods,
  onAdd,
  onCreateShipment,
  onEdit,
  onDelete,
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Shipping Methods</CardTitle>
        <div className="flex items-center gap-2">
          <Button onClick={onAdd}>Add Method</Button>
          <Button variant="outline" onClick={onCreateShipment}>
            Create Shipment
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {methods.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Base Rate</TableHead>
                <TableHead>Zones</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {methods.map((method) => (
                <TableRow key={method.id}>
                  <TableCell>{method.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{method.shippingType}</Badge>
                  </TableCell>
                  <TableCell>{method.baseRate}</TableCell>
                  <TableCell>
                    {method.zones?.length
                      ? method.zones.map((z) => z.name).join(", ")
                      : "All zones"}
                  </TableCell>
                  <TableCell>
                    {method.isActive ? (
                      <Badge variant="default">active</Badge>
                    ) : (
                      <Badge variant="secondary">inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(method)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDelete(method)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="grid place-items-center p-8 text-muted-foreground">
            No shipping methods configured yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
