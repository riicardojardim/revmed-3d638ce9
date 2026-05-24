import { supabase } from "@/integrations/supabase/client";

export type RoomEventType =
  | "candidate_selected"
  | "actor_joined_call"
  | "candidate_joined_call"
  | "station_started"
  | "station_finished";

export type RoomEvent = {
  id: string;
  room_id: string;
  type: RoomEventType | string;
  actor_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export async function fetchRoomEvents(roomId: string): Promise<RoomEvent[]> {
  const { data, error } = await supabase
    .from("room_events")
    .select("id, room_id, type, actor_id, payload, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[roomEvents] fetch failed", error);
    return [];
  }
  return (data ?? []) as RoomEvent[];
}

/** Insert an event, skipping if the latest event of the same type already matches the dedupe key. */
export async function logRoomEvent(
  roomId: string,
  actorId: string | null,
  type: RoomEventType,
  payload: Record<string, unknown> = {},
  dedupeKey?: string,
): Promise<void> {
  try {
    if (dedupeKey) {
      const { data: last } = await supabase
        .from("room_events")
        .select("payload")
        .eq("room_id", roomId)
        .eq("type", type)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const lastKey = last?.payload && typeof last.payload === "object"
        ? (last.payload as Record<string, unknown>).dedupe_key
        : undefined;
      if (lastKey === dedupeKey) return;
    }
    await supabase.from("room_events").insert({
      room_id: roomId,
      type,
      actor_id: actorId,
      payload: dedupeKey ? { ...payload, dedupe_key: dedupeKey } : payload,
    });
  } catch (err) {
    console.warn("[roomEvents] insert failed", err);
  }
}

export function subscribeRoomEvents(
  roomId: string,
  onInsert: (evt: RoomEvent) => void,
) {
  const channel = supabase
    .channel(`room_events:${roomId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "room_events", filter: `room_id=eq.${roomId}` },
      (payload) => onInsert(payload.new as RoomEvent),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}