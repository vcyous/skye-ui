import { ArrowLeftOutlined, CarOutlined } from "@ant-design/icons";
import { Badge, Button, Space, Typography } from "antd";
import { Link } from "react-router-dom";
import { formatDateTime } from "../../../../shared/format";
import { FULFILLMENT_STATUS_BADGE } from "../../constants";

export default function OrderHeader({ order, hasUnshipped, onCreateShipment }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Link to="/orders">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          style={{ padding: "0 8px" }}
        />
      </Link>
      <div style={{ flex: 1 }}>
        <Space align="center">
          <Typography.Title level={4} style={{ margin: 0 }}>
            Order #{order?.orderNumber}
          </Typography.Title>
          <Badge
            status={order?.paymentStatus === "paid" ? "success" : "warning"}
            text={
              <Typography.Text
                style={{ fontSize: 13, textTransform: "capitalize" }}
              >
                {order?.paymentStatus || "pending"}
              </Typography.Text>
            }
          />
          <Badge
            status={
              FULFILLMENT_STATUS_BADGE[
                order?.fulfillmentStatus || "unfulfilled"
              ] ?? "default"
            }
            text={
              <Typography.Text
                style={{ fontSize: 13, textTransform: "capitalize" }}
              >
                {order?.fulfillmentStatus || "unfulfilled"}
              </Typography.Text>
            }
          />
        </Space>
        {order?.createdAt && (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {formatDateTime(order.createdAt, {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </Typography.Text>
        )}
      </div>
      {hasUnshipped && (
        <Button
          type="primary"
          icon={<CarOutlined />}
          onClick={onCreateShipment}
        >
          Create shipment
        </Button>
      )}
    </div>
  );
}
