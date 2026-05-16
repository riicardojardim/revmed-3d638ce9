import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, ClipboardList, Layers, CheckCircle2, FileText, AlertCircle, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/admin/")({
  component: AdminOverview,
});

interface PlanBucket { plan: string; count: number }
interface TopStation { station_id: string; station_title: string; count: number }

function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    attempts: 0,
    attempts7: 0,
    attempts30: 0,
    stationsPublished: 0,
    stationsDraft: 0,
    flashcards: 0,
    summaries: 0,
    pendingReviews: 0,
  });
  const [planBuckets, setPlanBuckets] = useState<PlanBucket[]>([]);
  const [topStations, setTopStations] = useState<TopStation[]>([]);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        u, aAll, a7, a30, sPub, sDraft, fc, sum, pend,
        subs, plans, recentAttempts,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("attempts").select("id", { count: "exact", head: true }),
        supabase.from("attempts").select("id", { count: "exact", head: true }).gte("created_at", d7),
        supabase.from("attempts").select("id", { count: "exact", head: true }).gte("created_at", d30),
        supabase.from("custom_stations").select("id", { count: "exact", head: true }).eq("published", true),
        supabase.from("custom_stations").select("id", { count: "exact", head: true }).eq("published", false),
        supabase.from("flashcards").select("id", { count: "exact", head: true }),
        supabase.from("summaries").select("id", { count: "exact", head: true }),
        supabase.from("attempts").select("id", { count: "exact", head: true }).eq("status", "aguardando_correcao"),
        supabase.from("user_subscriptions").select("plan_id, status").eq("status", "active"),
        supabase.from("plans").select("id, name"),
        supabase.from("attempts").select("station_id, station_title").gte("created_at", d30).limit(2000),
      ]);

      setStats({
        users: u.count ?? 0,
        attempts: aAll.count ?? 0,
        attempts7: a7.count ?? 0,
        attempts30: a30.count ?? 0,
        stationsPublished: sPub.count ?? 0,
        stationsDraft: sDraft.count ?? 0,
        flashcards: fc.count ?? 0,
        summaries: sum.count ?? 0,
        pendingReviews: pend.count ?? 0,
      });

      // plan buckets
      const planMap = new Map<string, string>();
      (plans.data ?? []).forEach((p) => planMap.set(p.id, p.name));
      const buckets = new Map<string, number>();
      (subs.data ?? []).forEach((s) => {
        const name = planMap.get(s.plan_id as string) ?? "Sem plano";
        buckets.set(name, (buckets.get(name) ?? 0) + 1);
      });
      setPlanBuckets(Array.from(buckets, ([plan, count]) => ({ plan, count })).sort((a, b) => b.count - a.count));

      // top stations
      const tops = new Map<string, { title: string; count: number }>();
      (recentAttempts.data ?? []).forEach((a) => {
        const key = a.station_id as string;
        const prev = tops.get(key);
        tops.set(key, { title: (a.station_title as string) ?? key, count: (prev?.count ?? 0) + 1 });
      });
      setTopStations(
        Array.from(tops, ([station_id, v]) => ({ station_id, station_title: v.title, count: v.count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      );

      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: "Usuários", value: stats.users, icon: Users, color: "text-medical" },
    { label: "Tentativas (total)", value: stats.attempts, icon: ClipboardList, color: "text-mint" },
    { label: "Tentativas — 7 dias", value: stats.attempts7, icon: ClipboardList, color: "text-mint" },
    { label: "Tentativas — 30 dias", value: stats.attempts30, icon: ClipboardList, color: "text-mint" },
    { label: "Estações publicadas", value: stats.stationsPublished, icon: CheckCircle2, color: "text-success" },
    { label: "Estações rascunho", value: stats.stationsDraft, icon: Layers, color: "text-warning" },
    { label: "Flashcards", value: stats.flashcards, icon: BookOpen, color: "text-mint" },
    { label: "Resumos", value: stats.summaries, icon: FileText, color: "text-mint" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <c.icon className={`h-5 w-5 ${c.color}`} />
            <div className="mt-3 text-3xl font-bold font-display">{loading ? "—" : c.value}</div>
            <div className="text-sm text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      {stats.pendingReviews > 0 && (
        <Link to="/app/professor/correcoes" className="block">
          <div className="flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/5 p-5">
            <AlertCircle className="h-6 w-6 text-warning" />
            <div className="flex-1">
              <div className="font-semibold">{stats.pendingReviews} tentativa(s) aguardando correção</div>
              <div className="text-xs text-muted-foreground">Clique para abrir a fila de correções.</div>
            </div>
          </div>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="font-display font-semibold">Assinantes ativos por plano</h3>
          {loading ? (
            <p className="mt-3 text-sm text-muted-foreground">Carregando...</p>
          ) : planBuckets.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nenhum assinante ativo ainda.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {planBuckets.map((b) => (
                <li key={b.plan} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2">
                  <span className="text-sm">{b.plan}</span>
                  <Badge className="bg-mint/15 text-mint hover:bg-mint/15">{b.count}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-mint" /> Top 5 estações (30 dias)
          </h3>
          {loading ? (
            <p className="mt-3 text-sm text-muted-foreground">Carregando...</p>
          ) : topStations.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Sem tentativas registradas no período.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {topStations.map((s, i) => (
                <li key={s.station_id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2">
                  <span className="text-sm">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">#{i + 1}</span>
                    {s.station_title}
                  </span>
                  <Badge variant="outline">{s.count}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
