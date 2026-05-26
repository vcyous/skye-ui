import { supabase } from "../supabaseClient";
import { tableExists } from "../utils/dbUtils";
import { normalizeError } from "../utils/errorUtils";

export async function logOrderTimelineEvent(orderId, status, authUserId, note) {
  const { error } = await supabase.from("order_timeline").insert({
    order_id: orderId,
    status,
    actor_type: "user",
    actor_id: authUserId,
    note: note || null,
  });
  if (error) throw normalizeError(error);
}

export async function logOrderStateEvent(payload) {
  if (!(await tableExists("order_state_events"))) return;
  const { error } = await supabase.from("order_state_events").insert({
    order_id: payload.orderId,
    actor_id: payload.actorId,
    event_type: payload.eventType,
    from_value: payload.fromValue || null,
    to_value: payload.toValue || null,
    note: payload.note || null,
    metadata: payload.metadata || {},
  });
  if (error) throw normalizeError(error);
}
