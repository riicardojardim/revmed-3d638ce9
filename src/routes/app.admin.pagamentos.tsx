import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { listInternalUserIdsAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DollarSign, Search, TrendingUp, Users as UsersIcon, CreditCard } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin/pagamentos")({
  component: AdminPayments,
  head: () => ({ meta: [{ title: "Pagamentos — Admin" }] }),
});

interface PlanRow { id: string; name: string; slug: string; price_cents: number }
interface SubRow {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_end: string | null;
  created_at: string;
  profile?: { full_name: string | null; username: string | null; avatar_url: string | null };
}

const fmtBRL = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function AdminPayments() {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [internalIds, setInternalIds] = useState<Set<string>>(new Set());
  const fetchInternalIds = useServerFn(listInternalUserIdsAdmin);

  const load = async () => {
    setLoading(true);
    const [{ data: subData }, { data: planData }, internalRes] = await Promise.all([
      supabase.from("user_subscriptions").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("plans").select("id, name, slug, price_cents").order("price_cents"),
      fetchInternalIds().catch(() => ({ ids: [] as string[] })),
    ]);
    setInternalIds(new Set(internalRes?.ids ?? []));
    const ids = Array.from(new Set((subData ?? []).map((s: any) => s.user_id)));
    let profileMap = new Map<string, any>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", ids);
      profileMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    }
    setSubs(((subData ?? []) as any[]).map((s) => ({ ...s, profile: profileMap.get(s.user_id) })));
    setPlans((planData ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const planById = new Map(plans.map((p) => [p.id, p]));

  // Métricas: ignoram contas internas (admin / professor / mentor)
  const externalSubs = subs.filter((s) => !internalIds.has(s.user_id));
  const activeSubs = externalSubs.filter((s) => s.status === "active" || s.status === "trialing");
  const mrr = activeSubs
    .filter((s) => (planById.get(s.plan_id)?.price_cents ?? 0) > 0)
    .reduce((acc, s) => acc + (planById.get(s.plan_id)?.price_cents ?? 0), 0);
  const paidActive = activeSubs.filter((s) => (planById.get(s.plan_id)?.price_cents ?? 0) > 0).length;

  const filtered = subs.filter((s) => {
    if (!q) return true;
    const name = (s.profile?.full_name || s.profile?.username || "").toLowerCase();
    return name.includes(q.toLowerCase()) || s.id.includes(q);
  });

  const changePlan = async (sub: SubRow, planId: string) => {
    const { error } = await supabase.from("user_subscriptions").update({ plan_id: planId, status: "active" }).eq("id", sub.id);
    if (error) { toast.error("Falha ao atualizar plano"); return; }
    toast.success("Plano atualizado");
    load();
  };

  const changeStatus = async (sub: SubRow, status: string) => {
    const { error } = await supabase.from("user_subscriptions").update({ status }).eq("id", sub.id);
    if (error) { toast.error("Falha ao atualizar"); return; }
    toast.success("Status atualizado");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Pagamentos & Assinaturas</h2>
        <p className="text-sm text-muted-foreground">Visualize receita, gerencie assinaturas e atribua planos manualmente.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <DollarSign className="h-5 w-5 text-success" />
          <div className="mt-3 text-2xl font-bold font-display">{fmtBRL(mrr)}</div>
          <div className="text-sm text-muted-foreground">MRR estimado</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <UsersIcon className="h-5 w-5 text-mint" />
          <div className="mt-3 text-2xl font-bold font-display">{paidActive}</div>
          <div className="text-sm text-muted-foreground">Assinantes pagantes</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <TrendingUp className="h-5 w-5 text-medical" />
          <div className="mt-3 text-2xl font-bold font-display">{activeSubs.length}</div>
          <div className="text-sm text-muted-foreground">Assinaturas ativas (incl. trial)</div>
        </div>
      </div>

      <div className="rounded-2xl border border-mint/30 bg-mint/5 p-5">
        <div className="flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-mint shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">Quer aceitar pagamentos online?</div>
            <p className="text-muted-foreground mt-1">
              Conecte um provedor de pagamento (Stripe ou Paddle) para começar a cobrar com checkout próprio,
              renovação automática e webhooks de assinatura. Diga aqui no chat "ativar pagamentos" que eu configuro.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <h3 className="font-display font-semibold">Assinaturas ({filtered.length})</h3>
          <div className="relative w-72 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome" className="pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Renova em</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhuma assinatura.</td></tr>
              ) : filtered.map((s) => {
                const plan = planById.get(s.plan_id);
                return (
                  <tr key={s.id} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.profile?.full_name || s.profile?.username || "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{s.user_id.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={s.plan_id}
                        onChange={(e) => changePlan(s, e.target.value)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                      >
                        {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === "active" ? "default" : "outline"}
                        className={s.status === "active" ? "bg-mint/15 text-mint hover:bg-mint/15" : ""}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">{fmtBRL(plan?.price_cents ?? 0)}</td>
                    <td className="px-4 py-3 text-right">
                      {s.status === "active" ? (
                        <Button size="sm" variant="outline" onClick={() => changeStatus(s, "canceled")}>Cancelar</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => changeStatus(s, "active")}>Reativar</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
