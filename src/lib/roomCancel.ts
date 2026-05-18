import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/**
 * Cancel a training room. Safe to call multiple times — server only updates
 * rooms that are still in waiting/starting/running.
 */
export async function cancelRoom(roomId: string): Promise<void> {
  try {
    await supabase
      .from("training_rooms")
      .update({ status: "cancelled", finished_at: new Date().toISOString() })
      .eq("id", roomId)
      .in("status", ["waiting", "starting", "running"]);
  } catch {
    /* noop */
  }
}

/**
 * Best-effort synchronous cancel for `beforeunload` / tab-close.
 * Uses fetch with `keepalive: true` so the request survives page teardown.
 * Requires the access token to be passed in (must be captured ahead of time
 * because `getSession()` is async).
 */
export function cancelRoomBeacon(roomId: string, accessToken: string | null): void {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    const url = `${SUPABASE_URL}/rest/v1/training_rooms?id=eq.${roomId}&status=in.(waiting,starting,running)`;
    fetch(url, {
      method: "PATCH",
      keepalive: true,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${accessToken ?? SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status: "cancelled",
        finished_at: new Date().toISOString(),
      }),
    }).catch(() => {});
  } catch {
    /* noop */
  }
}
