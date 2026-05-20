import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  id: string;
  site_name: string;
  tagline: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  colors: Record<string, string>;
  fb_pixel_id: string | null;
  tiktok_pixel_id: string | null;
  ga4_id: string | null;
  gtm_id: string | null;
  meta_capi_token: string | null;
  custom_head_html: string | null;
  custom_body_html: string | null;
  terms_md: string | null;
  privacy_md: string | null;
  contact_email: string | null;
  intro_animation_variant: "classic" | "door" | "corridor" | null;
};

let cache: SiteSettings | null = null;
const listeners = new Set<(s: SiteSettings | null) => void>();

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    const fn = (s: SiteSettings | null) => setSettings(s);
    listeners.add(fn);
    if (!cache) {
      void (async () => {
        const { data } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
        if (data) {
          cache = {
            ...data,
            colors: (data.colors as Record<string, string>) ?? {},
          } as SiteSettings;
          listeners.forEach((l) => l(cache));
        }
        setLoading(false);
      })();
    }
    return () => { listeners.delete(fn); };
  }, []);

  return { settings, loading, refresh: refreshSiteSettings };
}

export async function refreshSiteSettings() {
  const { data } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
  if (data) {
    cache = { ...data, colors: (data.colors as Record<string, string>) ?? {} } as SiteSettings;
    listeners.forEach((l) => l(cache));
  }
  return cache;
}
