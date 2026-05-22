import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  RefreshCw,
  Star,
  BookOpen,
  Send,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { STATIONS } from "@/data/stations";

interface ResultSearch {
  attempt?: string;
}

export const Route = createFileRoute("/app/resultado/$id")({
  validateSearch: (s: Record<string, unknown>): ResultSearch => ({
    attempt: typeof s.attempt === "string" ? s.attempt : undefined,
  }),
  component: ResultPage,
  head: () => ({ meta: [{ title: "Resultado — REVMED" }] }),
});

function ResultPage() {
  const { id } = Route.useParams();
  const search = useSearch({ from: "/app/resultado/$id" }) as ResultSearch;
  const station = STATIONS.find((s) => s.id === id);

  const [attempt, setAttempt] = useState<{
    score: number;
    earned: number;
    total_points: number;
    used_seconds: number;
    checked_items: string[];
  } | null>(null);
  const [loading, setLoading] = useState(!!search.attempt);

  useEffect(() => {
    if (!search.attempt) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("attempts")
        .select("score, earned, total_points, used_seconds, checked_items")
        .eq("id", search.attempt!)
        .maybeSingle();
      if (cancel) return;
      if (data) {
        setAttempt({
          score: Number(data.score),
          earned: data.earned,
          total_points: data.total_points,
          used_seconds: data.used_seconds,
          checked_items: (data.checked_items as string[]) ?? [],
        });
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [search.attempt]);

  if (!station) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="font-display text-xl font-bold">Estação não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">Esta estação não existe ou foi removida.</p>
        <Link to="/app/checklists" className="mt-4 inline-block text-sm text-mint underline">
          Voltar à biblioteca
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando resultado...
      </div>
    );
  }

  const score = attempt?.score ?? 0;
  const earned = attempt?.earned ?? 0;
  const total = attempt?.total_points ?? station.checklist.reduce((s, i) => s + i.points, 0);
  const used = attempt?.used_seconds ?? 0;
  const checkedSet = new Set(attempt?.checked_items ?? []);

  const done = station.checklist.filter((i) => checkedSet.has(i.id));
  const missed = station.checklist.filter((i) => !checkedSet.has(i.id));

  const byCat = (items: typeof station.checklist) =>
    items.reduce<Record<string, number>>((acc, i) => {
      acc[i.category] = (acc[i.category] ?? 0) + i.points;
      return acc;
    }, {});
  const strong = Object.entries(byCat(done)).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const weak = Object.entries(byCat(missed)).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const usedMin = Math.floor(used / 60);
  const usedSec = used % 60;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <SpecialtyBadge specialty={station.specialty} />
        <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">
          Seu desempenho nesta estação
        </h1>
        <p className="mt-1 text-muted-foreground">{station.title}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2 overflow-hidden rounded-3xl border border-border bg-gradient-hero p-6 text-white shadow-elegant">
          <div className="text-xs uppercase tracking-wider text-mint">Nota final</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-6xl font-bold">{score.toFixed(1)}</span>
            <span className="text-lg text-white/60">/ 10</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-mint"
              style={{ width: `${(score / 10) * 100}%` }}
            />
          </div>
          <div className="mt-3 text-sm text-white/70">
            {earned} de {total} pontos · {Math.round((earned / total) * 100)}% de acerto
          </div>
        </div>

        <Metric icon={Clock} label="Tempo usado" value={`${usedMin}:${String(usedSec).padStart(2, "0")}`} />
        <Metric icon={TrendingUp} label="Itens concluídos" value={`${done.length}/${station.checklist.length}`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-success/30 bg-success/5 p-5">
          <div className="flex items-center gap-2 font-semibold text-success">
            <CheckCircle2 className="h-5 w-5" /> Competência mais forte
          </div>
          <div className="mt-2 font-display text-2xl font-bold">{strong}</div>
        </div>
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-5">
          <div className="flex items-center gap-2 font-semibold text-warning">
            <XCircle className="h-5 w-5" /> Competência a melhorar
          </div>
          <div className="mt-2 font-display text-2xl font-bold">{weak}</div>
        </div>
      </div>

      {/* AI feedback */}
      <div className="rounded-2xl border border-mint/30 bg-gradient-card p-6 shadow-card">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-medical">
          <Sparkles className="h-4 w-4 text-mint" /> Feedback inteligente
        </div>
        <p className="mt-3 leading-relaxed text-foreground/90">
          Você teve bom desempenho em <strong>{strong.toLowerCase()}</strong>, demonstrando estrutura
          clara no atendimento. Por outro lado, deixou de pontuar itens importantes de{" "}
          <strong>{weak.toLowerCase()}</strong>. Revise os critérios e pratique estações semelhantes
          dessa área. Lembre-se: cada item do checklist pode fazer diferença na sua aprovação.
        </p>
      </div>

      {/* Items breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <ItemList title="Itens acertados" items={done} positive />
        <ItemList title="Itens perdidos" items={missed} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/app/simulacao/$id" params={{ id: station.id }}>
          <Button variant="hero">
            <RefreshCw className="h-4 w-4" /> Refazer estação
          </Button>
        </Link>
        <Button variant="outline">
          <Star className="h-4 w-4" /> Favoritar
        </Button>
        <Button variant="outline">
          <BookOpen className="h-4 w-4" /> Ver resumo
        </Button>
        <Button variant="outline">
          <Send className="h-4 w-4" /> Enviar para professor
        </Button>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4 text-mint" /> {label}
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function ItemList({
  title,
  items,
  positive,
}: {
  title: string;
  items: { id: string; description: string; category: string; points: number }[];
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="font-semibold">{title}</div>
      <ul className="mt-3 space-y-2">
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground">Nenhum item nesta categoria.</li>
        )}
        {items.map((i) => (
          <li key={i.id} className="flex items-start gap-2 text-sm">
            {positive ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            )}
            <div>
              <div>{i.description}</div>
              <div className="text-xs text-muted-foreground">
                {i.category} · {i.points} pts
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
