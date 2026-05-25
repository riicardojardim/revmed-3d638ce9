import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Retorna quais secrets do servidor estão presentes para cada provedor,
 * para o admin saber se há fallback ativo (ex: LiveKit usando LIVEKIT_* env vars).
 */
export const getProviderEnvStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("forbidden");

    return {
      livekit: {
        api_key: !!process.env.LIVEKIT_API_KEY,
        api_secret: !!process.env.LIVEKIT_API_SECRET,
        api_url: !!process.env.LIVEKIT_URL,
      },
    };
  });

/**
 * Copia os secrets do servidor (LIVEKIT_*) para a linha do provedor na tabela
 * e ativa-o, para o painel admin refletir o estado real.
 */
export const importLivekitFromEnv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({}).parse(i ?? {}))
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("forbidden");

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const apiUrl = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !apiUrl) {
      return { ok: false, error: "Secrets LIVEKIT_* não estão configurados no servidor." };
    }

    // desativa outros provedores da categoria
    await supabaseAdmin
      .from("provider_settings")
      .update({ is_active: false })
      .eq("category", "live_video");

    const { error } = await supabaseAdmin
      .from("provider_settings")
      .update({
        api_key: apiKey,
        api_secret: apiSecret,
        api_url: apiUrl,
        is_active: true,
      })
      .eq("category", "live_video")
      .eq("provider_key", "livekit");

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
