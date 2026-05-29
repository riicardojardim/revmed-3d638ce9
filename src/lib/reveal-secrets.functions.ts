import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const revealSecrets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("forbidden");

    const names = [
      "MERCADOPAGO_ACCESS_TOKEN",
      "MERCADOPAGO_PUBLIC_KEY",
      "MERCADOPAGO_WEBHOOK_SECRET",
      "LIVEKIT_API_KEY",
      "LIVEKIT_API_SECRET",
      "LIVEKIT_URL",
      "VAPID_PUBLIC_KEY",
      "VAPID_PRIVATE_KEY",
    ];
    const out: Record<string, string | null> = {};
    for (const n of names) out[n] = process.env[n] ?? null;
    return out;
  });