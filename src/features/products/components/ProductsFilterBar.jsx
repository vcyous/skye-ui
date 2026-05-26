import { SearchOutlined } from "@ant-design/icons";
import {
  Button,
  Dropdown,
  Input,
  Popconfirm,
  Select,
  Space,
  Tabs,
  Typography,
} from "antd";
import { BULK_STATUS_ACTIONS, SORT_OPTIONS, STATUS_TABS } from "../constants";

export default function ProductsFilterBar({
  status,
  onStatusChange,
  tabCounts,
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  selectedCount,
  isBulkBusy,
  onBulkStatusChange,
  onBulkDelete,
}) {
  const bulkMenuItems = BULK_STATUS_ACTIONS.map((action) => ({
    key: action.key,
    label: action.label,
    onClick: () => onBulkStatusChange(action.status),
  }));

  return (
    <>
      <div style={{ borderBottom: "1px solid var(--line)", paddingLeft: 16 }}>
        <Tabs
          activeKey={status}
          onChange={onStatusChange}
          size="small"
          items={STATUS_TABS.map((tab) => ({
            key: tab.key,
            label: (
              <span>
                {tab.label}
                {tabCounts[tab.key] != null && (
                  <span
                    style={{
                      marginLeft: 6,
                      color: "var(--ink-3)",
                      fontSize: 12,
                    }}
                  >
                    {tabCounts[tab.key]}
                  </span>
                )}
              </span>
            ),
          }))}
        />
      </div>

      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Input
          prefix={<SearchOutlined style={{ color: "var(--ink-3)" }} />}
          placeholder="Search products"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          allowClear
          style={{ width: 260 }}
        />

        <Select
          value={sortBy}
          onChange={onSortByChange}
          options={SORT_OPTIONS}
          style={{ width: 160 }}
        />

        {selectedCount > 0 && (
          <Space style={{ marginLeft: "auto" }}>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {selectedCount} selected
            </Typography.Text>
            <Dropdown menu={{ items: bulkMenuItems }}>
              <Button size="small" loading={isBulkBusy}>
                Actions
              </Button>
            </Dropdown>
            <Popconfirm
              title={`Delete ${selectedCount} selected products?`}
              onConfirm={onBulkDelete}
              okText="Delete"
              cancelText="Cancel"
            >
              <Button size="small" danger loading={isBulkBusy}>
                Delete selected
              </Button>
            </Popconfirm>
          </Space>
        )}
      </div>
    </>
  );
}
