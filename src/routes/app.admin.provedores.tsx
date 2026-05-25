import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Video, Upload, Loader2, KeyRound, Copy, Check } from "lucide-react";

export const Route = createFileRoute("/app/admin/provedores")({
  component: AdminProviders,
  head: () => ({ meta: [{ title: "Provedores — Admin" }] }),
});

type Category = "payment" | "live_video" | "video_upload";

interface ProviderRow {
  id: string;
  category: Category;
  provider_key: string;
  provider_label: string;
  is_active: boolean;
  api_key: string | null;
  api_url: string | null;
  webhook_secret: string | null;
  webhook_url: string | null;
}

const CATEGORIES: { key: Category; label: string; icon: typeof CreditCard; description: string; webhookPath: (k: string) => string }[] = [
  {
    key: "payment",
    label: "Pagamento",
    icon: CreditCard,
    description: "Provedor que processa as assinaturas e cobranças.",
    webhookPath: (k) => `/api/public/webhooks/payment/${k}`,
  },
  {
    key: "live_video",
    label: "Vídeo ao vivo",
    icon: Video,
    description: "Provedor de chamadas ao vivo nas salas de estação.",
    webhookPath: (k) => `/api/public/webhooks/live/${k}`,
  },
  {
    key: "video_upload",
    label: "Upload de vídeo",
    icon: Upload,
    description: "Onde os vídeos de aulas são hospedados e entregues.",
    webhookPath: (k) => `/api/public/webhooks/video/${k}`,
  },
];

function AdminProviders() {
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("provider_settings")
      .select("*")
      .order("category")
      .order("provider_label");
    if (error) toast.error("Erro ao carregar", { description: error.message });
    setRows((data ?? []) as ProviderRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function patchLocal(id: string, patch: Partial<ProviderRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function save(row: ProviderRow) {
    setSavingId(row.id);
    const { error } = await supabase
      .from("provider_settings")
      .update({
        api_key: row.api_key,
        api_url: row.api_url,
        webhook_secret: row.webhook_secret,
        webhook_url: row.webhook_url,
      })
      .eq("id", row.id);
    setSavingId(null);
    if (error) return toast.error("Erro ao salvar", { description: error.message });
    toast.success(`${row.provider_label} atualizado`);
  }

  async function activate(row: ProviderRow) {
    setSavingId(row.id);
    // Deactivate others in this category, then activate this one
    const { error: e1 } = await supabase
      .from("provider_settings")
      .update({ is_active: false })
      .eq("category", row.category)
      .neq("id", row.id);
    if (e1) { setSavingId(null); return toast.error(e1.message); }
    const { error: e2 } = await supabase
      .from("provider_settings")
      .update({ is_active: true })
      .eq("id", row.id);
    setSavingId(null);
    if (e2) return toast.error(e2.message);
    toast.success(`${row.provider_label} ativado em ${row.category === "payment" ? "Pagamento" : row.category === "live_video" ? "Vídeo ao vivo" : "Upload de vídeo"}`);
    load();
  }

  async function deactivate(row: ProviderRow) {
    setSavingId(row.id);
    const { error } = await supabase
      .from("provider_settings")
      .update({ is_active: false })
      .eq("id", row.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success(`${row.provider_label} desativado`);
    load();
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando provedores...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-mint" />
          <h2 className="font-display text-xl font-bold">Provedores & API Keys</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Coloque as chaves de API, URLs e segredos de webhook de cada provedor.
          Apenas <strong>um</strong> provedor pode estar ativo por categoria.
        </p>
      </div>

      {CATEGORIES.map((cat) => {
        const providers = rows.filter((r) => r.category === cat.key);
        const active = providers.find((p) => p.is_active);
        const Icon = cat.icon;
        return (
          <section key={cat.key} className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-medical" />
                <h3 className="font-display text-lg font-semibold">{cat.label}</h3>
                {active ? (
                  <Badge className="bg-mint/15 text-mint hover:bg-mint/15">Ativo: {active.provider_label}</Badge>
                ) : (
                  <Badge variant="outline">Nenhum ativo</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{cat.description}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {providers.map((row) => {
                const webhookUrl = origin + cat.webhookPath(row.provider_key);
                return (
                  <div key={row.id} className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-card">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-semibold">{row.provider_label}</h4>
                        {row.is_active && (
                          <Badge className="bg-mint/15 text-mint hover:bg-mint/15">Ativo</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={row.is_active}
                          disabled={savingId === row.id}
                          onCheckedChange={(v) => (v ? activate(row) : deactivate(row))}
                        />
                        <Label className="text-xs">{row.is_active ? "Ativo" : "Inativo"}</Label>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div>
                        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">API Key / Token</Label>
                        <Input
                          type="password"
                          value={row.api_key ?? ""}
                          onChange={(e) => patchLocal(row.id, { api_key: e.target.value })}
                          placeholder="Cole a chave secreta aqui"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">URL da API</Label>
                        <Input
                          value={row.api_url ?? ""}
                          onChange={(e) => patchLocal(row.id, { api_url: e.target.value })}
                          placeholder="https://api.provedor.com"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Webhook Secret</Label>
                        <Input
                          type="password"
                          value={row.webhook_secret ?? ""}
                          onChange={(e) => patchLocal(row.id, { webhook_secret: e.target.value })}
                          placeholder="Segredo usado para validar webhooks recebidos"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          URL de Webhook (cole isto no painel do {row.provider_label})
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            readOnly
                            value={webhookUrl}
                            className="font-mono text-xs bg-muted/40"
                            onFocus={(e) => e.currentTarget.select()}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => copy(webhookUrl, row.id)}
                            title="Copiar"
                          >
                            {copiedKey === row.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Endpoint estará disponível após a integração do provedor ser implementada.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1 border-t border-border">
                      <Button onClick={() => save(row)} disabled={savingId === row.id}>
                        {savingId === row.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Salvar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="rounded-2xl border border-warning/40 bg-warning/5 p-4 text-sm">
        <p className="font-semibold mb-1">Importante</p>
        <p className="text-muted-foreground">
          Estes campos guardam as credenciais com segurança (acesso restrito a admins via RLS).
          A integração de cada provedor com a plataforma — checkout, sala ao vivo, player de vídeo —
          é implementada uma por vez. Ao decidir qual provedor usar de fato, peça a integração
          completa dele.
        </p>
      </div>
    </div>
  );
}