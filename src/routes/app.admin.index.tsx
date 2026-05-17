import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, ClipboardList, Layers, CheckCircle2, FileText, AlertCircle, Stethoscope, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StationIntroOverlay, type IntroRole } from "@/components/room/StationIntroOverlay";

export const Route = createFileRoute("/app/admin/")({
  component: AdminOverview,
});

interface PlanBucket { plan: string; count: number }
interface TopStation { station_id: string; station_title: string; count: number }

function AdminOverview() {
  const [testRole, setTestRole] = useState<IntroRole | null>(null);
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
    { label: "Usuários", value: stats.users, icon: Users },
    { label: "Tentativas · total", value: stats.attempts, icon: ClipboardList },
    { label: "Tentativas · 7d", value: stats.attempts7, icon: ClipboardList },
    { label: "Tentativas · 30d", value: stats.attempts30, icon: ClipboardList },
    { label: "Estações publicadas", value: stats.stationsPublished, icon: CheckCircle2 },
    { label: "Estações rascunho", value: stats.stationsDraft, icon: Layers },
    { label: "Flashcards", value: stats.flashcards, icon: BookOpen },
    { label: "Resumos", value: stats.summaries, icon: FileText },
  ];

  return (
    <div className="space-y-10">
      {/* Editorial header */}
      <header className="flex flex-col gap-4 border-b hairline pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-eyebrow flex items-center gap-2">
            <span className="h-px w-8 bg-mint" />
            Painel administrativo · Edição diária
          </div>
          <h1 className="mt-3 font-editorial text-[44px] leading-[0.95] tracking-[-0.03em] md:text-[56px]">
            <span className="italic font-light">A operação,</span>{" "}
            <span className="font-medium">em números.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Uma visão calma da plataforma — usuários, conteúdo e ritmo de uso, lado a lado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setTestRole("candidato")}>
            <Play className="h-3.5 w-3.5" /> Ver como Candidato
          </Button>
          <Button size="sm" variant="outline" onClick={() => setTestRole("paciente")}>
            <Play className="h-3.5 w-3.5" /> Ver como Ator
          </Button>
        </div>
      </header>

      {testRole && (
        <StationIntroOverlay
          role={testRole}
          stationTitle="Estação de Teste — Dor Torácica Aguda"
          specialty="Clínica Médica"
          displayName="Dr. Teste"
          onComplete={() => setTestRole(null)}
        />
      )}

      {/* Bento KPI grid */}
      <section className="grid grid-cols-12 gap-4">
        {/* Hero KPI — Usuários */}
        <div className="col-span-12 card-premium hover:card-premium-hover p-7 md:col-span-6 lg:col-span-5">
          <div className="flex items-start justify-between">
            <div className="text-eyebrow">Comunidade</div>
            <Users className="h-4 w-4 text-mint" strokeWidth={1.7} />
          </div>
          <div className="mt-6 flex items-end gap-4">
            <span className="editorial-number text-[96px] md:text-[120px] text-foreground">
              {loading ? "—" : stats.users}
            </span>
            <span className="mb-3 text-eyebrow-serif">Usuários totais</span>
          </div>
          <div className="mt-6 flex items-center gap-6 border-t hairline pt-4 text-[13px]">
            <div>
              <div className="text-muted-foreground text-xs">Ativos 7d</div>
              <div className="font-editorial text-lg">{loading ? "—" : stats.attempts7}</div>
            </div>
            <div className="h-8 w-px bg-foreground/10" />
            <div>
              <div className="text-muted-foreground text-xs">Ativos 30d</div>
              <div className="font-editorial text-lg">{loading ? "—" : stats.attempts30}</div>
            </div>
          </div>
        </div>

        {/* Tentativas total */}
        <div className="col-span-12 card-premium hover:card-premium-hover p-6 md:col-span-6 lg:col-span-4">
          <div className="text-eyebrow">Atividade</div>
          <div className="mt-4 editorial-number text-[72px] text-foreground">
            {loading ? "—" : stats.attempts}
          </div>
          <div className="text-eyebrow-serif mt-1">Tentativas registradas</div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t hairline pt-4">
            {cards.slice(2, 4).map((c) => (
              <div key={c.label}>
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{c.label}</div>
                <div className="mt-1 font-editorial text-2xl">{loading ? "—" : c.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Estações */}
        <div className="col-span-12 card-premium hover:card-premium-hover p-6 md:col-span-6 lg:col-span-3">
          <div className="text-eyebrow">Catálogo</div>
          <div className="mt-4 editorial-number text-[64px] text-mint">
            {loading ? "—" : stats.stationsPublished}
          </div>
          <div className="text-eyebrow-serif mt-1">Estações publicadas</div>
          <div className="mt-5 border-t hairline pt-4 text-[13px] text-muted-foreground">
            + <span className="font-editorial text-foreground text-base">{loading ? "—" : stats.stationsDraft}</span> em rascunho
          </div>
        </div>

        {/* Flashcards & Resumos — banda inferior */}
        {[
          { label: "Flashcards", value: stats.flashcards, icon: BookOpen, accent: "text-mint" },
          { label: "Resumos", value: stats.summaries, icon: FileText, accent: "text-medical" },
          { label: "Estações rascunho", value: stats.stationsDraft, icon: Layers, accent: "text-foreground/60" },
          { label: "Tentativas hoje", value: stats.attempts7, icon: ClipboardList, accent: "text-foreground/60" },
        ].map((c) => (
          <div key={c.label} className="col-span-6 card-premium hover:card-premium-hover p-5 md:col-span-3">
            <div className="flex items-center justify-between">
              <div className="text-eyebrow text-[10px]">{c.label}</div>
              <c.icon className={`h-4 w-4 ${c.accent}`} strokeWidth={1.7} />
            </div>
            <div className="mt-3 editorial-number text-4xl">{loading ? "—" : c.value}</div>
          </div>
        ))}
      </section>

      {stats.pendingReviews > 0 && (
        <Link to="/app/professor/correcoes" className="block">
          <div className="flex items-center gap-4 card-premium border-l-4 border-l-warning p-5">
            <AlertCircle className="h-6 w-6 text-warning" />
            <div className="flex-1">
              <div className="text-eyebrow">Atenção</div>
              <div className="mt-1 font-display text-lg">{stats.pendingReviews} tentativa(s) aguardando correção</div>
              <div className="text-xs text-muted-foreground">Toque para abrir a fila.</div>
            </div>
            <ChevronRightIcon />
          </div>
        </Link>
      )}

      {/* Editorial pair: plans + top stations */}
      <section className="grid gap-5 lg:grid-cols-12">
        <div className="card-premium p-6 lg:col-span-5">
          <div className="text-eyebrow">Distribuição</div>
          <h3 className="mt-2 font-editorial text-2xl italic font-light">Assinantes por plano</h3>
          {loading ? (
            <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
          ) : planBuckets.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhum assinante ativo ainda.</p>
          ) : (
            <ul className="mt-5 divide-y hairline border-y hairline">
              {planBuckets.map((b) => (
                <li key={b.plan} className="flex items-center justify-between py-3">
                  <span className="text-sm">{b.plan}</span>
                  <span className="font-editorial text-2xl">{b.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-premium p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-eyebrow">Mais treinadas · 30d</div>
              <h3 className="mt-2 font-editorial text-2xl italic font-light">Top 5 estações</h3>
            </div>
            <Stethoscope className="h-5 w-5 text-mint" strokeWidth={1.7} />
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
          ) : topStations.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Sem tentativas registradas no período.</p>
          ) : (
            <ol className="mt-5 space-y-2">
              {topStations.map((s, i) => (
                <li key={s.station_id} className="flex items-center gap-4 rounded-lg px-2 py-3 hover:bg-foreground/[0.03] transition-colors">
                  <span className="font-editorial text-3xl text-mint/70 tabular-nums w-10">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-sm font-medium">{s.station_title}</span>
                  <Badge variant="outline" className="font-mono text-[11px]">{s.count}</Badge>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}

function ChevronRightIcon() {
  return <span className="font-editorial text-2xl text-muted-foreground">→</span>;
}
