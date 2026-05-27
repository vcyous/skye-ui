import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { formatDateTime } from "../../../../shared/format";
import { TIMELINE_COLOR_BY_STATUS } from "../../constants";

const DOT_CLASS = {
  green: "bg-green-500",
  blue: "bg-blue-500",
  red: "bg-red-500",
  gray: "bg-muted-foreground",
};

export default function OrderTimelineCard({ events, isSaving, onSubmitNote }) {
  const [note, setNote] = useState("");

  async function handleSubmit() {
    const ok = await onSubmitNote(note);
    if (ok) setNote("");
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Order timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <ul className="relative flex flex-col gap-4 pl-5 before:absolute before:left-1.5 before:top-1 before:bottom-1 before:w-px before:bg-border mb-4">
            {events.map((event, idx) => {
              const dotColor =
                DOT_CLASS[TIMELINE_COLOR_BY_STATUS[event.status]] ??
                DOT_CLASS.gray;
              return (
                <li key={idx} className="relative">
                  <span
                    className={`absolute -left-4 mt-1 size-2.5 rounded-full ${dotColor}`}
                  />
                  <p className="text-sm font-medium capitalize">
                    {event.status.replace(/_/g, " ")}
                    {event.note && (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        — {event.note}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(event.createdAt)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex gap-2 pt-3 border-t">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Leave a comment..."
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="h-8 text-sm"
          />
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            size="sm"
            variant="outline"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : "Post"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
