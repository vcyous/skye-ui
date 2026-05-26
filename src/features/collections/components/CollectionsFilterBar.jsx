import { SearchOutlined } from "@ant-design/icons";
import { Input, Tabs } from "antd";
import { STATUS_TABS } from "../constants";

export default function CollectionsFilterBar({
  statusTab,
  onStatusTabChange,
  tabCounts,
  search,
  onSearchChange,
}) {
  return (
    <>
      <div style={{ borderBottom: "1px solid var(--line)", paddingLeft: 16 }}>
        <Tabs
          activeKey={statusTab}
          onChange={onStatusTabChange}
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

      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
        <Input
          prefix={<SearchOutlined style={{ color: "var(--ink-3)" }} />}
          placeholder="Search collections"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          allowClear
          style={{ width: 280 }}
        />
      </div>
    </>
  );
}
