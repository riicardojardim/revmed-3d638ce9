import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings2, Loader2, Phone, Mail, Instagram, Target } from "lucide-react";
import { refreshSiteSettings, useSiteSettings } from "@/hooks/use-site-settings";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/app/admin/geral")({ component: AdminGeral });

function AdminGeral() {
  const { settings, loading } = useSiteSettings();
  const [draft, setDraft] = useState<typeof settings>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (settings) setDraft(settings); }, [settings]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase.from("site_settings").update({
      exam_edition: draft.exam_edition,
      nota_de_corte: draft.nota_de_corte,
      contact_email: draft.contact_email,
      contact_phone_primary: draft.contact_phone_primary,
      contact_phone_primary_label: draft.contact_phone_primary_label,
      contact_phone_secondary: draft.contact_phone_secondary,
      contact_phone_secondary_label: draft.contact_phone_secondary_label,
      instagram_url: draft.instagram_url,
      instagram_handle: draft.instagram_handle,
      cnpj: draft.cnpj,
      footer_description: draft.footer_description,
    } as never).eq("id", draft.id);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar", { description: error.message });
    await refreshSiteSettings();
    toast.success("Configurações gerais salvas");
  }

  if (loading || !draft) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  const set = <K extends keyof NonNullable<typeof draft>>(k: K, v: NonNullable<typeof draft>[K]) =>
    setDraft({ ...draft, [k]: v });

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-mint" />
        <h2 className="font-display text-xl font-bold">Configurações gerais</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Tudo que aparece em vários cantos do site: edição vigente do Revalida, nota de corte, telefones, e-mail, Instagram e o rodapé.
      </p>

      {/* Edição da prova */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-mint" />
          <h3 className="font-display font-semibold">Edição da prova & nota de corte (INEP)</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">Edição vigente</Label>
            <Input
              value={draft.exam_edition ?? ""}
              onChange={(e) => set("exam_edition", e.target.value)}
              placeholder="Revalida 2026/1"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Aparece na barra superior do app e no painel de progresso.
            </p>
          </div>
          <div>
            <Label className="text-xs">Nota de corte (escala 0–100)</Label>
            <Input
              type="number"
              step="0.001"
              min={0}
              max={100}
              value={draft.nota_de_corte ?? 0}
              onChange={(e) => set("nota_de_corte", Number(e.target.value) as never)}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Ex.: 62,174 — usado para liberar troféus e classificar aprovado/reprovado.
            </p>
          </div>
        </div>
      </section>

      {/* Contatos */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-mint" />
          <h3 className="font-display font-semibold">Contatos exibidos no rodapé</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">Telefone 1 (link tel:)</Label>
            <Input
              value={draft.contact_phone_primary ?? ""}
              onChange={(e) => set("contact_phone_primary", e.target.value)}
              placeholder="+5521987860985"
            />
          </div>
          <div>
            <Label className="text-xs">Texto exibido do telefone 1</Label>
            <Input
              value={draft.contact_phone_primary_label ?? ""}
              onChange={(e) => set("contact_phone_primary_label", e.target.value)}
              placeholder="(21) 98786-0985 — Suporte REVMED"
            />
          </div>
          <div>
            <Label className="text-xs">Telefone 2 (link tel:)</Label>
            <Input
              value={draft.contact_phone_secondary ?? ""}
              onChange={(e) => set("contact_phone_secondary", e.target.value)}
              placeholder="+5521983786198"
            />
          </div>
          <div>
            <Label className="text-xs">Texto exibido do telefone 2</Label>
            <Input
              value={draft.contact_phone_secondary_label ?? ""}
              onChange={(e) => set("contact_phone_secondary_label", e.target.value)}
              placeholder="(21) 98378-6198 — Dr. Anoar Jezini"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> E-mail de contato</Label>
            <Input
              type="email"
              value={draft.contact_email ?? ""}
              onChange={(e) => set("contact_email", e.target.value)}
              placeholder="contato@revmed.app.br"
            />
          </div>
        </div>
      </section>

      {/* Redes & marca */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Instagram className="h-4 w-4 text-mint" />
          <h3 className="font-display font-semibold">Redes & marca (rodapé)</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">URL do Instagram</Label>
            <Input
              value={draft.instagram_url ?? ""}
              onChange={(e) => set("instagram_url", e.target.value)}
              placeholder="https://instagram.com/revmedmentoria"
            />
          </div>
          <div>
            <Label className="text-xs">@handle exibido</Label>
            <Input
              value={draft.instagram_handle ?? ""}
              onChange={(e) => set("instagram_handle", e.target.value)}
              placeholder="@revmedmentoria"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">CNPJ (rodapé legal)</Label>
            <Input
              value={draft.cnpj ?? ""}
              onChange={(e) => set("cnpj", e.target.value)}
              placeholder="CNPJ 48.442.973/0001-07"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Texto descritivo do rodapé</Label>
            <Textarea
              rows={3}
              value={draft.footer_description ?? ""}
              onChange={(e) => set("footer_description", e.target.value)}
              placeholder="A plataforma de prática do candidato Revalida INEP..."
            />
          </div>
        </div>
      </section>

      <Button variant="hero" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Salvar alterações
      </Button>
    </div>
  );
}