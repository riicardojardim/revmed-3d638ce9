import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, Upload, Loader2 } from "lucide-react";
import { refreshSiteSettings, useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/app/admin/aparencia")({ component: AdminAppearance });

function AdminAppearance() {
  const { settings, loading } = useSiteSettings();
  const [draft, setDraft] = useState<typeof settings>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (settings) setDraft(settings); }, [settings]);

  async function uploadAsset(file: File, key: "logo_url" | "favicon_url") {
    if (!draft) return;
    const path = `${key}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
    setDraft({ ...draft, [key]: data.publicUrl });
    toast.success("Imagem enviada — clique em Salvar");
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase.from("site_settings").update({
      site_name: draft.site_name,
      tagline: draft.tagline,
      logo_url: draft.logo_url,
      favicon_url: draft.favicon_url,
      colors: draft.colors,
      contact_email: draft.contact_email,
      urgency_banner_text: draft.urgency_banner_text,
    }).eq("id", draft.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshSiteSettings();
    toast.success("Aparência salva");
  }

  if (loading || !draft) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-mint" />
        <h2 className="font-display text-xl font-bold">Aparência</h2>
      </div>
      <div className="grid gap-4 rounded-2xl border border-border bg-card p-5">
        <label className="text-sm">Nome do site
          <input value={draft.site_name} onChange={(e) => setDraft({ ...draft, site_name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <label className="text-sm">Tagline
          <input value={draft.tagline ?? ""} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <label className="text-sm">E-mail de contato
          <input type="email" value={draft.contact_email ?? ""} onChange={(e) => setDraft({ ...draft, contact_email: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
        </label>
        <label className="text-sm">Barra superior (texto de urgência)
          <input
            value={draft.urgency_banner_text ?? ""}
            onChange={(e) => setDraft({ ...draft, urgency_banner_text: e.target.value })}
            placeholder="Entre numa sessão na plataforma mais completa para revalidação"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
          <p className="mt-1 text-[11px] text-muted-foreground">Texto exibido na barra laranja no topo da landing page.</p>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          {(["logo_url", "favicon_url"] as const).map((k) => (
            <div key={k} className="rounded-xl border border-border bg-background p-3">
              <div className="text-xs font-semibold text-muted-foreground">{k === "logo_url" ? "Logo" : "Favicon"}</div>
              {draft[k] && <img src={draft[k]!} alt={k} className="my-2 max-h-20" />}
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-mint">
                <Upload className="h-4 w-4" /> Enviar imagem
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadAsset(e.target.files[0], k)} />
              </label>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold">Cores principais</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {["primary", "mint", "accent", "background"].map((key) => (
              <label key={key} className="text-xs text-muted-foreground">{key}
                <input type="text" placeholder="oklch(...) ou #hex"
                  value={draft.colors?.[key] ?? ""}
                  onChange={(e) => setDraft({ ...draft, colors: { ...(draft.colors ?? {}), [key]: e.target.value } })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs" />
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">As cores serão aplicadas via CSS variables no próximo carregamento.</p>
        </div>
      </div>
      <Button variant="hero" onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Salvar</Button>
    </div>
  );
}
