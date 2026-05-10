import { Card, Table, Typography } from "antd";

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AnalyticsBreakdownTableCard({
  title,
  rows = [],
  rowKey,
  columns = [],
  emptyText,
}) {
  const resolvedColumns = columns.map((column) => {
    if (column.type === "currency") {
      return {
        ...column,
        render: (value) => formatCurrency(value),
      };
    }

    if (column.type === "percent") {
      return {
        ...column,
        render: (value) => `${Number(value || 0).toFixed(2)}%`,
      };
    }

    return column;
  });

  return (
    <Card title={title} style={{ height: "100%" }}>
      <Table
        rowKey={rowKey}
        dataSource={rows}
        columns={resolvedColumns}
        pagination={false}
        locale={{
          emptyText: (
            <Typography.Text type="secondary">
              {emptyText || "No rows available for this period."}
            </Typography.Text>
          ),
        }}
        scroll={{ x: 580 }}
      />
    </Card>
  );
}
