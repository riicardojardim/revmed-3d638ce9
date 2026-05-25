import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Video, Upload, Loader2, KeyRound, Copy, Check, BookOpen } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  api_secret: string | null;
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

// Passo-a-passo de configuração por provedor.
// As chaves correspondem a `provider_key` no banco.
const PROVIDER_GUIDES: Record<string, { docsUrl?: string; steps: string[]; extraExample?: string }> = {
  mercado_pago: {
    docsUrl: "https://www.mercadopago.com.br/developers/pt/docs",
    steps: [
      "Acesse mercadopago.com.br/developers e faça login.",
      "Vá em 'Suas integrações' → 'Criar aplicação' (tipo: Pagamentos online).",
      "Em 'Credenciais de produção', copie o Access Token e cole no campo API Key acima.",
      "Em 'Webhooks', adicione um novo webhook colando a URL de Webhook gerada abaixo. Eventos: payment.",
      "Copie a 'Chave secreta' do webhook e cole no campo Webhook Secret.",
      "No campo Extra (JSON) coloque: {\"checkout_url\":\"https://link.mercadopago.com.br/SEUUSUARIO\"} — link do produto/assinatura.",
      "Ative o provedor no botão acima e teste com uma compra real em modo de produção.",
    ],
    extraExample: '{"checkout_url":"https://link.mercadopago.com.br/seuusuario"}',
  },
  hotmart: {
    docsUrl: "https://developers.hotmart.com/",
    steps: [
      "Entre na sua conta Hotmart e acesse 'Ferramentas' → 'Hotmart Webhook'.",
      "Cadastre uma nova integração colando a URL de Webhook abaixo. Marque os eventos: PURCHASE_APPROVED, PURCHASE_CANCELED, PURCHASE_REFUNDED.",
      "Copie o 'HotTok' (token de segurança) e cole no campo Webhook Secret.",
      "Em 'Ferramentas' → 'API Hotmart', gere uma credencial e cole o Client Secret no campo API Key.",
      "Pegue o ID do produto em 'Produtos' → seu produto → 'Configurações'. Cole no Extra (JSON) como product_id.",
      "No campo Extra (JSON) coloque: {\"product_id\":\"SEU_ID\",\"checkout_base_url\":\"https://pay.hotmart.com/SEU_ID\"}.",
      "Ative o provedor e teste com uma compra de teste.",
    ],
    extraExample: '{"product_id":"X1234567Y","checkout_base_url":"https://pay.hotmart.com/X1234567Y"}',
  },
  stripe: {
    docsUrl: "https://stripe.com/docs",
    steps: [
      "Acesse dashboard.stripe.com e copie a 'Secret key' (sk_live_... ou sk_test_...) em 'Developers' → 'API keys'. Cole no campo API Key.",
      "Crie um produto e preço em 'Products'. Copie o price_id (price_xxx).",
      "Crie um Payment Link em 'Payment Links' usando esse preço. Copie a URL.",
      "Em 'Developers' → 'Webhooks' adicione um endpoint com a URL de Webhook abaixo. Eventos: checkout.session.completed, invoice.paid, customer.subscription.deleted.",
      "Copie o 'Signing secret' (whsec_...) e cole no campo Webhook Secret.",
      "No campo Extra (JSON) coloque: {\"price_id\":\"price_xxx\",\"checkout_base_url\":\"https://buy.stripe.com/SEU_LINK\"}.",
      "Ative o provedor e teste com cartão de teste 4242 4242 4242 4242.",
    ],
    extraExample: '{"price_id":"price_1AbcDef","checkout_base_url":"https://buy.stripe.com/test_xxx"}',
  },
  herospark: {
    docsUrl: "https://herospark.com/ajuda",
    steps: [
      "Entre na Herospark e acesse 'Configurações' → 'Integrações' → 'API e Webhooks'.",
      "Clique em 'Nova Integração via Webhook' e cole a URL de Webhook gerada abaixo.",
      "Marque os eventos: Compra Aprovada, Compra Cancelada, Reembolso.",
      "A Herospark vai gerar um Token de segurança — copie e cole no campo Webhook Secret.",
      "Em 'Configurações' → 'API', gere uma chave de API e cole no campo API Key.",
      "No produto que você quer vender, copie a URL do checkout (botão 'Compartilhar' → 'Link de checkout').",
      "No campo Extra (JSON) coloque: {\"checkout_url\":\"https://pay.herospark.com/SEU-PRODUTO\"}.",
      "Ative o provedor e faça uma compra de teste para confirmar que o webhook chega e a assinatura é ativada.",
    ],
    extraExample: '{"checkout_url":"https://pay.herospark.com/seu-produto-12345"}',
  },
  livekit: {
    docsUrl: "https://docs.livekit.io/home/cloud/keys-and-tokens/",
    steps: [
      "Acesse cloud.livekit.io e crie um projeto (ou abra um existente).",
      "Em 'Settings' → 'Keys', clique em 'Create Key'. Copie o API Key e o API Secret.",
      "Cole o API Key no campo API Key e o API Secret no campo API Secret acima.",
      "Em 'Settings' → 'Project', copie a 'WebSocket URL' (wss://seu-projeto.livekit.cloud) e cole no campo URL da API.",
      "Ative o provedor. As salas ao vivo passarão a usar esta conta automaticamente.",
    ],
    extraExample: undefined,
  },
  boonstream: {
    docsUrl: "https://boonstream.com/",
    steps: [
      "Crie uma conta em boonstream.com e acesse o painel.",
      "Em 'API' ou 'Integrações', gere uma chave de API e cole no campo API Key.",
      "Copie a URL base da API (ex: https://api.boonstream.com) e cole no campo URL da API.",
      "Ative o provedor. (Integração completa será implementada quando você decidir usar.)",
    ],
  },
  bunny: {
    docsUrl: "https://docs.bunny.net/reference/bunnynet-api-overview",
    steps: [
      "Acesse dash.bunny.net e crie uma 'Stream Video Library'.",
      "Em 'API' → 'Account API Key', copie a chave e cole no campo API Key.",
      "Em 'Stream' → sua Library → 'API', copie a 'Library ID' e a 'API Key' da library.",
      "No campo URL da API coloque: https://video.bunnycdn.com/library/SUA_LIBRARY_ID",
      "No campo Extra (JSON) coloque: {\"library_id\":\"123456\",\"cdn_hostname\":\"vz-xxxxxxxx.b-cdn.net\"}.",
      "Ative o provedor para usar como host de vídeos das aulas.",
    ],
    extraExample: '{"library_id":"123456","cdn_hostname":"vz-xxxxxxxx.b-cdn.net"}',
  },
  cloudflare_stream: {
    docsUrl: "https://developers.cloudflare.com/stream/",
    steps: [
      "Acesse dash.cloudflare.com, vá em 'Stream' e ative o serviço.",
      "Em 'My Profile' → 'API Tokens', crie um token com permissão 'Stream: Edit'. Cole no campo API Key.",
      "Copie o Account ID (canto direito do dashboard) e cole no campo Extra (JSON) como account_id.",
      "No campo URL da API coloque: https://api.cloudflare.com/client/v4/accounts/SEU_ACCOUNT_ID/stream",
      "Extra (JSON): {\"account_id\":\"SEU_ACCOUNT_ID\",\"customer_subdomain\":\"customer-xxxx.cloudflarestream.com\"}.",
      "Ative o provedor.",
    ],
    extraExample: '{"account_id":"abc123","customer_subdomain":"customer-xxxx.cloudflarestream.com"}',
  },
  mux: {
    docsUrl: "https://docs.mux.com/",
    steps: [
      "Acesse dashboard.mux.com e crie um Access Token em 'Settings' → 'Access Tokens'.",
      "Marque as permissões 'Mux Video' (Read + Write). Copie o Token ID e Token Secret.",
      "Cole o Token ID no campo API Key e o Token Secret no campo API Secret.",
      "Em 'Settings' → 'Webhooks', adicione um webhook com a URL gerada abaixo.",
      "Copie o 'Signing Secret' do webhook e cole no campo Webhook Secret.",
      "Ative o provedor.",
    ],
    extraExample: undefined,
  },
};

function AdminProviders() {
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [openGuide, setOpenGuide] = useState<string | null>(null);

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
        api_secret: row.api_secret,
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
                        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">API Secret</Label>
                        <Input
                          type="password"
                          value={row.api_secret ?? ""}
                          onChange={(e) => patchLocal(row.id, { api_secret: e.target.value })}
                          placeholder="Segredo da API (ex: LiveKit API Secret)"
                          className="font-mono text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Usado por provedores com par key+secret (ex: LiveKit).
                        </p>
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

                    {PROVIDER_GUIDES[row.provider_key] && (
                      <Collapsible
                        open={openGuide === row.id}
                        onOpenChange={(o) => setOpenGuide(o ? row.id : null)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                            <BookOpen className="h-4 w-4" />
                            {openGuide === row.id ? "Ocultar" : "Ver"} passo a passo para configurar {row.provider_label}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3 space-y-3 rounded-xl bg-muted/30 p-4 text-sm">
                          <ol className="list-decimal pl-5 space-y-1.5 text-foreground/90">
                            {PROVIDER_GUIDES[row.provider_key].steps.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ol>
                          {PROVIDER_GUIDES[row.provider_key].extraExample && (
                            <div>
                              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                Exemplo do campo Extra (JSON)
                              </Label>
                              <code className="block mt-1 rounded-lg bg-background border border-border p-2 font-mono text-[11px] break-all">
                                {PROVIDER_GUIDES[row.provider_key].extraExample}
                              </code>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                (Este campo ainda não tem editor visual — cole o JSON via SQL ou peça a Lovable
                                para adicionar editor de Extra.)
                              </p>
                            </div>
                          )}
                          {PROVIDER_GUIDES[row.provider_key].docsUrl && (
                            <a
                              href={PROVIDER_GUIDES[row.provider_key].docsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block text-xs text-medical underline"
                            >
                              Documentação oficial do {row.provider_label} ↗
                            </a>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
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