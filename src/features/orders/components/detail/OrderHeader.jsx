import { Button } from "@/components/ui/button";
import { ChevronLeft, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDateTime } from "../../../../shared/format";
import { FULFILLMENT_STATUS_BADGE } from "../../constants";

const BADGE_CLASS = {
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  default: "bg-muted text-muted-foreground",
};

export default function OrderHeader({ order, hasUnshipped, onCreateShipment }) {
  const paymentBadgeClass =
    order?.paymentStatus === "paid" ? BADGE_CLASS.success : BADGE_CLASS.warning;
  const fulfillmentBadgeClass =
    BADGE_CLASS[FULFILLMENT_STATUS_BADGE[order?.fulfillmentStatus || "unfulfilled"]] ??
    BADGE_CLASS.default;

  return (
    <div className="flex items-center gap-3">
      <Link to="/orders">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronLeft className="size-4" />
        </Button>
      </Link>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-lg font-semibold">Order #{order?.orderNumber}</h4>
          <span
            className={`rounded-full px-2 py-0.5 text-xs capitalize ${paymentBadgeClass}`}
          >
            {order?.paymentStatus || "pending"}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs capitalize ${fulfillmentBadgeClass}`}
          >
            {order?.fulfillmentStatus || "unfulfilled"}
          </span>
        </div>
        {order?.createdAt && (
          <p className="text-xs text-muted-foreground">
            {formatDateTime(order.createdAt, {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </p>
        )}
      </div>
      {hasUnshipped && (
        <Button onClick={onCreateShipment}>
          <Truck className="size-4 mr-2" />
          Create shipment
        </Button>
      )}
    </div>
  );
}
