import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Activity, Loader2 } from "lucide-react";
import { refreshSiteSettings, useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/app/admin/integracoes")({ component: AdminIntegrations });

function AdminIntegrations() {
  const { settings, loading, error } = useSiteSettings({ scope: "admin" });
  const [draft, setDraft] = useState<typeof settings>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (settings) setDraft(settings); }, [settings]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase.from("site_settings").update({
      fb_pixel_id: draft.fb_pixel_id,
      tiktok_pixel_id: draft.tiktok_pixel_id,
      ga4_id: draft.ga4_id,
      gtm_id: draft.gtm_id,
      meta_capi_token: draft.meta_capi_token,
      custom_head_html: draft.custom_head_html,
      custom_body_html: draft.custom_body_html,
    }).eq("id", draft.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshSiteSettings("admin");
    toast.success("Integrações salvas");
  }

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;
  if (error || !draft) return <div className="text-sm text-destructive">Não foi possível carregar as integrações.</div>;

  const field = (label: string, key: keyof NonNullable<typeof draft>, placeholder = "") => (
    <label className="block text-sm">{label}
      <input value={(draft[key] as string) ?? ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs" />
    </label>
  );

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-mint" />
        <h2 className="font-display text-xl font-bold">Integrações & Tracking</h2>
      </div>
      <div className="grid gap-4 rounded-2xl border border-border bg-card p-5">
        {field("Facebook Pixel ID", "fb_pixel_id", "123456789012345")}
        {field("TikTok Pixel ID", "tiktok_pixel_id", "C7XXXXXXXXXXXXXX")}
        {field("Google Analytics 4 (Measurement ID)", "ga4_id", "G-XXXXXXXXXX")}
        {field("Google Tag Manager (Container ID)", "gtm_id", "GTM-XXXXXXX")}
        {field("Meta Conversions API Token (opcional)", "meta_capi_token")}
        <label className="block text-sm">Scripts customizados no &lt;head&gt;
          <textarea value={draft.custom_head_html ?? ""} onChange={(e) => setDraft({ ...draft, custom_head_html: e.target.value })}
            rows={4} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs" />
        </label>
        <label className="block text-sm">Scripts customizados no fim do &lt;body&gt;
          <textarea value={draft.custom_body_html ?? ""} onChange={(e) => setDraft({ ...draft, custom_body_html: e.target.value })}
            rows={4} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs" />
        </label>
      </div>
      <Button variant="hero" onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Salvar</Button>
      <p className="text-xs text-muted-foreground">A injeção automática dos pixels nas páginas será ativada na próxima atualização.</p>
    </div>
  );
}
