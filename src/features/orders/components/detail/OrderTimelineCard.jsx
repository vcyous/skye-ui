import { Button, Card, Divider, Input, Space, Timeline, Typography } from "antd";
import { useState } from "react";
import { formatDateTime } from "../../../../shared/format";
import { TIMELINE_COLOR_BY_STATUS } from "../../constants";

export default function OrderTimelineCard({
  events,
  isSaving,
  onSubmitNote,
}) {
  const [note, setNote] = useState("");

  async function handleSubmit() {
    const ok = await onSubmitNote(note);
    if (ok) setNote("");
  }

  return (
    <Card title="Order timeline">
      {events.length === 0 ? (
        <Typography.Text type="secondary">No events yet.</Typography.Text>
      ) : (
        <Timeline
          items={events.map((event) => ({
            color: TIMELINE_COLOR_BY_STATUS[event.status] ?? "gray",
            children: (
              <div>
                <Typography.Text
                  strong
                  style={{ textTransform: "capitalize", fontSize: 13 }}
                >
                  {event.status.replace(/_/g, " ")}
                </Typography.Text>
                {event.note && (
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {" "}
                    — {event.note}
                  </Typography.Text>
                )}
                <br />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {formatDateTime(event.createdAt)}
                </Typography.Text>
              </div>
            ),
          }))}
        />
      )}
      <Divider style={{ marginBottom: 12 }} />
      <Space.Compact style={{ width: "100%" }}>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Leave a comment..."
          onPressEnter={handleSubmit}
        />
        <Button onClick={handleSubmit} loading={isSaving}>
          Post
        </Button>
      </Space.Compact>
    </Card>
  );
}
