import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { loadStation, type LoadedStation } from "@/lib/stationLoader";
import { getSimulado, saveSimulado, type Simulado, type SimuladoStationState } from "@/lib/simulado";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, Lock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/simulado/$id")({
  component: SimuladoRunner,
  head: () => ({ meta: [{ title: "Simulado — Estação Revalida" }] }),
});

function levelTone(index: number, total: number): { idle: string; active: string } {
  const base = "text-muted-foreground hover:text-foreground";
  if (index === 0) return { idle: base, active: "bg-rose-500/85 text-white ring-1 ring-rose-400/60" };
  if (index === total - 1) return { idle: base, active: "bg-emerald-500/85 text-white ring-1 ring-emerald-400/60" };
  return { idle: base, active: "bg-amber-500/85 text-white ring-1 ring-amber-400/60" };
}

function SimuladoRunner() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [sim, setSim] = useState<Simulado | null>(null);
  const [station, setStation] = useState<LoadedStation | null>(null);
  const [loading, setLoading] = useState(true);

  // Load simulado from localStorage
  useEffect(() => {
    const s = getSimulado(id);
    if (!s) {
      toast.error("Simulado não encontrado.");
      nav({ to: "/app/treinar" });
      return;
    }
    setSim(s);
  }, [id, nav]);

  // Load current station data
  useEffect(() => {
    if (!sim || sim.finished) return;
    setLoading(true);
    const cur = sim.stations[sim.currentIndex];
    if (!cur) return;
    loadStation(cur.id).then((st) => {
      setStation(st);
      setLoading(false);
    });
  }, [sim?.currentIndex, sim?.id, sim?.finished]);

  const current: SimuladoStationState | undefined = sim?.stations[sim.currentIndex];

  const totals = useMemo(() => {
    if (!station) return { count: 0, scored: 0, earned: 0, max: 0 };
    const count = station.checklist.length;
    let scored = 0, earned = 0, max = 0;
    for (const it of station.checklist) {
      max += it.points;
      const v = current?.checks[it.id];
      if (typeof v === "number") {
        scored++;
        earned += v;
      }
    }
    return { count, scored, earned, max };
  }, [station, current?.checks]);

  const allScored = totals.count > 0 && totals.scored === totals.count;

  function updateCurrent(updater: (s: SimuladoStationState) => SimuladoStationState) {
    setSim((prev) => {
      if (!prev) return prev;
      const stations = prev.stations.map((s, i) => (i === prev.currentIndex ? updater(s) : s));
      const next = { ...prev, stations };
      saveSimulado(next);
      return next;
    });
  }

  function pickLevel(itemId: string, points: number) {
    updateCurrent((s) => {
      const checks = { ...s.checks };
      if (checks[itemId] === points) delete checks[itemId];
      else checks[itemId] = points;
      const earned = Object.values(checks).reduce((a, b) => a + b, 0);
      const total = station ? station.checklist.length : 0;
      const completed = total > 0 && Object.keys(checks).length === total;
      const maxScore = station ? station.checklist.reduce((a, it) => a + it.points, 0) : s.maxScore;
      return { ...s, checks, score: earned, maxScore, completed };
    });
  }

  function goNext() {
    if (!sim || !allScored) return;
    if (sim.currentIndex < sim.stations.length - 1) {
      const next = { ...sim, currentIndex: sim.currentIndex + 1 };
      saveSimulado(next);
      setSim(next);
      setStation(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const next = { ...sim, finished: true };
      saveSimulado(next);
      setSim(next);
    }
  }

  if (!sim) return null;

  // FINISHED — Summary
  if (sim.finished) {
    const total = sim.stations.reduce((a, s) => a + s.score, 0);
    const maxTotal = sim.stations.reduce((a, s) => a + s.maxScore, 0);
    const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl border border-mint/30 bg-gradient-to-br from-mint/15 via-medical/10 to-transparent p-8 text-center shadow-elegant">
          <Trophy className="mx-auto h-12 w-12 text-mint" />
          <h1 className="mt-3 font-display text-3xl font-bold">Simulado concluído</h1>
          <div className="mt-1 text-sm text-muted-foreground">{sim.name}</div>
          <div className="mt-5 inline-flex items-baseline gap-2">
            <span className="font-display text-5xl font-bold text-mint">{total.toFixed(2)}</span>
            <span className="text-lg text-muted-foreground">/ {maxTotal.toFixed(2)}</span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{pct.toFixed(0)}% de aproveitamento</div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div className="border-b border-border bg-muted/30 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Notas por estação
          </div>
          <ul className="divide-y divide-border">
            {sim.stations.map((s, i) => {
              const m = getSpecialtyMeta(s.specialty);
              return (
                <li key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-3">
                  <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 font-mono text-xs font-bold ${m.badge}`}>{m.code}</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.specialty}</div>
                  </div>
                  <div className="text-right font-bold tabular-nums text-mint">
                    {s.score.toFixed(2)} <span className="text-muted-foreground font-normal">/ {s.maxScore.toFixed(2)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex justify-center gap-3">
          <Button asChild variant="outline"><Link to="/app/treinar"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link></Button>
        </div>
      </div>
    );
  }

  if (loading || !station || !current) {
    return <div className="mx-auto max-w-4xl py-20 text-center text-sm text-muted-foreground">Carregando estação...</div>;
  }

  const meta = getSpecialtyMeta(station.specialty);
  const progress = ((sim.currentIndex + (allScored ? 1 : 0)) / sim.stations.length) * 100;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Progress header */}
      <div className="sticky top-16 z-20 -mx-4 border-y border-border bg-background/95 px-4 py-3 backdrop-blur-xl lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <Link to="/app/treinar" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Sair
          </Link>
          <div className="text-sm font-semibold">{sim.name}</div>
          <Badge variant="outline" className="ml-auto">
            Estação {sim.currentIndex + 1} de {sim.stations.length}
          </Badge>
        </div>
        <div className="mx-auto mt-2 h-1.5 max-w-5xl overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-mint transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Station header */}
      <div className="rounded-3xl border border-border bg-gradient-hero p-6 text-white shadow-elegant">
        <div className="flex items-center gap-3">
          <span className={`inline-flex h-7 items-center justify-center rounded-md border px-2 font-mono text-xs font-bold ${meta.badge}`}>{meta.code}</span>
          <span className="text-xs uppercase tracking-wider text-white/70">{station.specialty}</span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold">{station.title}</h1>
        {station.clinicalCase && <p className="mt-3 text-sm text-white/85">{station.clinicalCase}</p>}
        {station.candidateTask && (
          <div className="mt-4 rounded-xl bg-white/10 p-3 text-sm text-white/90">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Tarefa</div>
            <div className="mt-1">{station.candidateTask}</div>
          </div>
        )}
      </div>

      {/* Checklist (PEP) */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-mint" />
          <h2 className="font-semibold">CHECKLIST (PEP)</h2>
          <Badge variant="outline" className="ml-auto">{totals.scored}/{totals.count}</Badge>
        </div>

        <ol className="mt-4 space-y-3">
          {station.checklist.map((it, idx) => {
            const levels = it.levels ?? [{ label: "Inadequado", points: 0 }, { label: "Adequado", points: it.points }];
            const cur = current.checks[it.id];
            return (
              <li
                key={it.id}
                className={cn(
                  "grid grid-cols-[1fr_auto] gap-x-4 rounded-xl border px-4 py-3 transition-colors",
                  typeof cur === "number" ? "border-mint/30 bg-mint/5" : "border-border bg-background/30",
                )}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{idx + 1}. {it.description}</div>
                  <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    {levels.map((lv) => (
                      <div key={lv.label}>
                        <span className="font-medium text-foreground">{lv.label}:</span>{" "}
                        <span>{lv.description ?? `${lv.points} pt${lv.points === 1 ? "" : "s"}`}</span>
                      </div>
                    ))}
                  </div>
                  {it.helperText && (
                    <div className="mt-2 rounded-md border border-border bg-background/40 px-3 py-1.5 text-[11px] text-muted-foreground">
                      {it.helperText}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1 tabular-nums">
                  {levels.map((lv, li) => {
                    const sel = cur === lv.points;
                    const tone = levelTone(li, levels.length);
                    return (
                      <button
                        key={lv.label}
                        type="button"
                        onClick={() => pickLevel(it.id, lv.points)}
                        className={cn(
                          "flex h-7 w-9 items-center justify-center rounded-md text-sm font-bold transition-colors",
                          sel ? tone.active : tone.idle,
                        )}
                        title={lv.label}
                      >
                        {lv.points}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Nota:</span>{" "}
            <span className="font-bold text-mint">{totals.earned.toFixed(2)}</span>
            <span className="text-muted-foreground"> / {totals.max.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            {!allScored && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Preencha todos os itens do PEP para avançar
              </div>
            )}
            <Button
              variant="hero"
              disabled={!allScored}
              onClick={goNext}
            >
              {sim.currentIndex < sim.stations.length - 1 ? (
                <>Próxima estação <ArrowRight className="ml-1 h-4 w-4" /></>
              ) : (
                <>Concluir simulado <CheckCircle2 className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
