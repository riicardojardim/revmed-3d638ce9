import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Brain, ChevronRight, Target, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AnimatedNumber } from "@/components/AnimatedNumber";

type Row = {
  card_id: string;
  reviews_count: number;
  last_quality: number | null;
  total_time_seconds: number;
  flashcards: { specialty: string } | null;
};

function fmtSec(s: number) {
  if (!s) return "0s";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

export function FlashcardsPerformanceCard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("flashcard_reviews")
      .select(
        "card_id, reviews_count, last_quality, total_time_seconds, flashcards!inner(specialty)",
      )
      .eq("user_id", user.id)
      .then(({ data }) => {
        setRows(((data as any) ?? []) as Row[]);
        setLoading(false);
      });
  }, [user]);

  const stats = useMemo(() => {
    const totalCards = rows.length;
    const totalReviews = rows.reduce((s, r) => s + (r.reviews_count || 0), 0);
    const totalTime = rows.reduce((s, r) => s + (r.total_time_seconds || 0), 0);
    const hits = rows.filter((r) => (r.last_quality ?? 0) >= 3).length;
    const acc = totalCards ? Math.round((hits / totalCards) * 100) : 0;

    const bySpec = new Map<string, { cards: number; hits: number }>();
    for (const r of rows) {
      const sp = r.flashcards?.specialty ?? "Outros";
      const cur = bySpec.get(sp) ?? { cards: 0, hits: 0 };
      cur.cards += 1;
      if ((r.last_quality ?? 0) >= 3) cur.hits += 1;
      bySpec.set(sp, cur);
    }
    const topSpec = Array.from(bySpec.entries())
      .map(([spec, v]) => ({ spec, cards: v.cards, accuracy: v.cards ? Math.round((v.hits / v.cards) * 100) : 0 }))
      .sort((a, b) => b.accuracy - a.accuracy || b.cards - a.cards)[0];

    return { totalCards, totalReviews, totalTime, acc, topSpec };
  }, [rows]);

  return (
    <Link
      to="/app/flashcards/desempenho"
      className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-colors hover:border-mint/60"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-mint" />
          <h3 className="font-display text-lg font-bold">Flashcards</h3>
        </div>
        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors group-hover:text-mint">
          <span className="hidden sm:inline">Ver detalhes</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>

      {loading ? (
        <div className="mt-4 flex flex-1 flex-col gap-2">
          <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
          <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
        </div>
      ) : stats.totalCards === 0 ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center text-center">
          <Brain className="h-8 w-8 text-mint/60" />
          <p className="mt-2 text-sm font-medium">Nenhum flashcard estudado</p>
          <p className="mt-1 text-xs text-muted-foreground">Comece a estudar para ver seu desempenho aqui.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border/60 bg-background p-3">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Target className="h-3 w-3 text-mint" /> Acertos
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-mint">
                <AnimatedNumber value={stats.acc} />%
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background p-3">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-medical" /> Cards
              </div>
              <div className="mt-1 font-display text-2xl font-bold">
                <AnimatedNumber value={stats.totalCards} />
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background p-3">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-medical" /> Revisões
              </div>
              <div className="mt-1 font-display text-2xl font-bold">
                <AnimatedNumber value={stats.totalReviews} />
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background p-3">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3 text-amber-500" /> Tempo
              </div>
              <div className="mt-1 font-display text-2xl font-bold">{fmtSec(stats.totalTime)}</div>
            </div>
          </div>

          {stats.topSpec && (
            <div className="mt-3 rounded-xl border border-border/60 bg-gradient-to-br from-mint/5 to-background p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sua melhor área</div>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold">{stats.topSpec.spec}</span>
                <span className="font-display text-base font-bold text-mint">{stats.topSpec.accuracy}%</span>
              </div>
            </div>
          )}
        </>
      )}
    </Link>
  );
}
