import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface ActiveProvider {
  provider_key: string;
  provider_label: string;
  api_key: string | null;
  api_secret: string | null;
  api_url: string | null;
  webhook_secret: string | null;
  webhook_url: string | null;
  extra: Record<string, unknown>;
}

export async function getActiveProvider(category: "payment" | "live_video" | "video_upload"): Promise<ActiveProvider | null> {
  const { data, error } = await supabaseAdmin
    .from("provider_settings")
    .select("provider_key, provider_label, api_key, api_secret, api_url, webhook_secret, webhook_url, extra")
    .eq("category", category)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    provider_key: data.provider_key as string,
    provider_label: data.provider_label as string,
    api_key: data.api_key as string | null,
    api_secret: data.api_secret as string | null,
    api_url: data.api_url as string | null,
    webhook_secret: data.webhook_secret as string | null,
    webhook_url: data.webhook_url as string | null,
    extra: (data.extra ?? {}) as Record<string, unknown>,
  };
}

export async function getProviderByKey(category: "payment" | "live_video" | "video_upload", provider_key: string): Promise<ActiveProvider | null> {
  const { data, error } = await supabaseAdmin
    .from("provider_settings")
    .select("provider_key, provider_label, api_key, api_secret, api_url, webhook_secret, webhook_url, extra")
    .eq("category", category)
    .eq("provider_key", provider_key)
    .maybeSingle();

  if (error || !data) return null;

  return {
    provider_key: data.provider_key as string,
    provider_label: data.provider_label as string,
    api_key: data.api_key as string | null,
    api_secret: data.api_secret as string | null,
    api_url: data.api_url as string | null,
    webhook_secret: data.webhook_secret as string | null,
    webhook_url: data.webhook_url as string | null,
    extra: (data.extra ?? {}) as Record<string, unknown>,
  };
}
