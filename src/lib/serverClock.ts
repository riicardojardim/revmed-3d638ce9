import { supabase } from "@/integrations/supabase/client";

// Offset = serverNow - clientNow, em ms.
// Soma a Date.now() pra obter o "tempo do servidor" no cliente.
let cachedOffset: number | null = null;
let pending: Promise<number> | null = null;

export async function getServerOffset(force = false): Promise<number> {
  if (!force && cachedOffset !== null) return cachedOffset;
  if (pending) return pending;
  pending = (async () => {
    try {
      const t0 = Date.now();
      const { data, error } = await supabase.rpc("now_ms" as never).maybeSingle?.() ?? { data: null, error: null };
      // Fallback: usar header Date do response do REST se RPC não existir
      let serverMs: number | null = null;
      if (!error && data && typeof (data as { now_ms?: number }).now_ms === "number") {
        serverMs = (data as { now_ms: number }).now_ms;
      } else {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, { method: "HEAD" });
        const dh = res.headers.get("date");
        if (dh) serverMs = new Date(dh).getTime();
      }
      const t1 = Date.now();
      if (serverMs == null) { cachedOffset = 0; return 0; }
      // Compensa metade do RTT
      const rtt = t1 - t0;
      cachedOffset = serverMs - (t0 + rtt / 2);
      return cachedOffset;
    } catch {
      cachedOffset = 0;
      return 0;
    } finally {
      pending = null;
    }
  })();
  return pending;
}

export function serverNow(): number {
  return Date.now() + (cachedOffset ?? 0);
}
