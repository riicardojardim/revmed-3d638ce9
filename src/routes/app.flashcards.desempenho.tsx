import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Trophy, Clock, Target, Brain, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ResetStatsButton } from "@/components/ResetStatsButton";

export const Route = createFileRoute("/app/flashcards/desempenho")({
  component: Desempenho,
  head: () => ({ meta: [{ title: "Desempenho — Flashcards" }] }),
});

type ReviewRow = {
  card_id: string;
  reviews_count: number;
  last_quality: number | null;
  last_time_seconds: number;
  total_time_seconds: number;
  ease: number;
  flashcards: { id: string; specialty: string; front: string; deck: string | null } | null;
};

function fmtSec(s: number) {
  if (!s) return "0s";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

function Desempenho() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("flashcard_reviews")
      .select("card_id, reviews_count, last_quality, last_time_seconds, total_time_seconds, ease, flashcards!inner(id, specialty, front, deck)")
      .eq("user_id", user.id);
    setRows((data as any) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const stats = useMemo(() => {
    const totalCards = rows.length;
    const totalReviews = rows.reduce((s, r) => s + (r.reviews_count || 0), 0);
    const totalTime = rows.reduce((s, r) => s + (r.total_time_seconds || 0), 0);
    const hits = rows.filter((r) => (r.last_quality ?? 0) >= 3).length;
    const acc = totalCards ? Math.round((hits / totalCards) * 100) : 0;
    const avgPerCard = totalReviews ? Math.round(totalTime / totalReviews) : 0;

    const bySpec = new Map<string, { spec: string; cards: number; reviews: number; time: number; hits: number }>();
    for (const r of rows) {
      const sp = r.flashcards?.specialty ?? "Outros";
      const cur = bySpec.get(sp) ?? { spec: sp, cards: 0, reviews: 0, time: 0, hits: 0 };
      cur.cards += 1;
      cur.reviews += r.reviews_count || 0;
      cur.time += r.total_time_seconds || 0;
      if ((r.last_quality ?? 0) >= 3) cur.hits += 1;
      bySpec.set(sp, cur);
    }
    const specialties = Array.from(bySpec.values()).map((s) => ({
      ...s,
      accuracy: s.cards ? Math.round((s.hits / s.cards) * 100) : 0,
      avgTime: s.reviews ? Math.round(s.time / s.reviews) : 0,
    }));
    const ranking = [...specialties].sort((a, b) => b.accuracy - a.accuracy || b.cards - a.cards);

    const topCards = [...rows]
      .sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0))
      .slice(0, 8);

    return { totalCards, totalReviews, totalTime, acc, avgPerCard, specialties, ranking, topCards };
  }, [rows]);

  if (loading) {
    return <div className="mx-auto max-w-5xl p-8 text-center text-muted-foreground">Carregando desempenho…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/app/flashcards" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Flashcards
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Meu Desempenho</h1>
          <p className="text-sm text-muted-foreground">Acompanhe sua evolução nos flashcards.</p>
        </div>
        <ResetStatsButton scope="flashcards" onDone={load} />
      </div>

      {stats.totalCards === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <Brain className="mx-auto h-10 w-10 text-mint" />
          <h2 className="mt-4 font-display text-xl font-bold">Nenhum desempenho ainda</h2>
          <p className="mt-2 text-sm text-muted-foreground">Estude alguns flashcards para ver suas estatísticas aqui.</p>
          <Link to="/app/flashcards" className="mt-5 inline-block">
            <Button variant="hero">Começar agora</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Cards de visão geral */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
            <StatCard icon={Target} label="Acertos" value={`${stats.acc}%`} sub={`${stats.totalCards} cards estudados`} />
            <StatCard icon={TrendingUp} label="Revisões" value={String(stats.totalReviews)} sub="total realizadas" />
            <StatCard icon={Clock} label="Tempo médio" value={fmtSec(stats.avgPerCard)} sub="por card" />
            <StatCard icon={Brain} label="Tempo total" value={fmtSec(stats.totalTime)} sub="de estudo" />
          </div>

          {/* Ranking por especialidade */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h2 className="font-display text-lg font-bold">Ranking por especialidade</h2>
            </div>
            <div className="space-y-2">
              {stats.ranking.map((s, i) => (
                <div key={s.spec} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full font-bold ${
                    i === 0 ? "bg-amber-100 text-amber-700" :
                    i === 1 ? "bg-slate-200 text-slate-700" :
                    i === 2 ? "bg-orange-100 text-orange-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {i < 3 ? <Award className="h-4 w-4" /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{s.spec}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.cards} cards · {s.reviews} revisões · {fmtSec(s.avgTime)}/card
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg font-bold">{s.accuracy}%</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">acertos</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Detalhe por especialidade */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 font-display text-lg font-bold">Média por especialidade</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {stats.specialties.map((s) => (
                <div key={s.spec} className="rounded-xl border border-border/60 bg-background p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{s.spec}</div>
                    <div className="text-sm font-semibold">{s.accuracy}%</div>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-mint" style={{ width: `${s.accuracy}%` }} />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                    <div><div className="font-semibold text-foreground">{s.cards}</div>cards</div>
                    <div><div className="font-semibold text-foreground">{s.reviews}</div>revisões</div>
                    <div><div className="font-semibold text-foreground">{fmtSec(s.avgTime)}</div>média/card</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Top cards mais revisados */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 font-display text-lg font-bold">Cards que você mais revisou</h2>
            <div className="divide-y divide-border/60">
              {stats.topCards.map((r) => (
                <div key={r.card_id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">{r.flashcards?.front ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.flashcards?.specialty} {r.flashcards?.deck ? `· ${r.flashcards.deck}` : ""}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="font-semibold text-foreground">{r.reviews_count}× revisado</div>
                    <div>{fmtSec(r.last_time_seconds)} última</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
