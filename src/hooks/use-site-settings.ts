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
  intro_animation_variant: "pulse" | "badge" | null;
  whatsapp_banner_enabled: boolean | null;
  whatsapp_banner_label: string | null;
  whatsapp_banner_url: string | null;
  urgency_banner_text: string | null;
  // Institutional / editable from admin
  exam_edition: string | null;
  nota_de_corte: number | null;
  contact_phone_primary: string | null;
  contact_phone_primary_label: string | null;
  contact_phone_secondary: string | null;
  contact_phone_secondary_label: string | null;
  instagram_url: string | null;
  instagram_handle: string | null;
  cnpj: string | null;
  footer_description: string | null;
};

type SiteSettingsScope = "public" | "admin";

const caches: Record<SiteSettingsScope, SiteSettings | null> = {
  public: null,
  admin: null,
};

const listeners: Record<SiteSettingsScope, Set<(s: SiteSettings | null) => void>> = {
  public: new Set(),
  admin: new Set(),
};

function normalizeSiteSettings(data: unknown): SiteSettings {
  const value = (data ?? {}) as Record<string, unknown>;

  return {
    ...value,
    colors: (value.colors as Record<string, string>) ?? {},
  } as SiteSettings;
}

async function fetchSiteSettings(scope: SiteSettingsScope) {
  const table = scope === "admin" ? "site_settings" : "site_settings_public";
  const { data, error } = await (supabase as any).from(table).select("*").limit(1).maybeSingle();

  if (error) throw error;
  return data ? normalizeSiteSettings(data) : null;
}

function publishSiteSettings(scope: SiteSettingsScope, settings: SiteSettings | null) {
  caches[scope] = settings;
  listeners[scope].forEach((listener) => listener(settings));
}

export function useSiteSettings(options?: { scope?: SiteSettingsScope }) {
  const scope = options?.scope ?? "public";
  const [settings, setSettings] = useState<SiteSettings | null>(caches[scope]);
  const [loading, setLoading] = useState(!caches[scope]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fn = (value: SiteSettings | null) => setSettings(value);
    listeners[scope].add(fn);

    if (caches[scope]) {
      setLoading(false);
      return () => {
        listeners[scope].delete(fn);
      };
    }

    void (async () => {
      try {
        const data = await fetchSiteSettings(scope);
        publishSiteSettings(scope, data);
        setSettings(data);
        setError(null);
      } catch (err) {
        console.error(`Erro ao carregar configurações (${scope})`, err);
        setSettings(null);
        setError(err instanceof Error ? err.message : "Falha ao carregar configurações.");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      listeners[scope].delete(fn);
    };
  }, [scope]);

  return { settings, loading, error, refresh: () => refreshSiteSettings(scope) };
}

export async function refreshSiteSettings(scope: SiteSettingsScope = "public") {
  try {
    const data = await fetchSiteSettings(scope);
    publishSiteSettings(scope, data);
    return data;
  } catch (err) {
    console.error(`Erro ao atualizar configurações (${scope})`, err);
    return caches[scope];
  }
}
