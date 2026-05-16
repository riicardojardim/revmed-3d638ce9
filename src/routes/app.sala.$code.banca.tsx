import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { loadStation, type LoadedStation } from "@/lib/stationLoader";
import {
  ArrowLeft,
  ClipboardCheck,
  Send,
  CheckCircle2,
  XCircle,
  RotateCw,
  Play,
  Pause,
  TimerReset,
  Sparkles,
  BookOpen,
  AlertTriangle,
  Target,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/sala/$code/banca")({
  component: EvaluatorView,
  head: () => ({ meta: [{ title: "Painel do Avaliador — Estação Revalida" }] }),
});

type Room = { id: string; code: string; station_id: string; station_title: string };

// 1 = Adequado · 0.5 = Parcialmente adequado · 0 = Inadequado · undefined = não avaliado
type Level = 1 | 0.5 | 0;
const LEVELS: { v: Level; label: string; short: string; cls: string; activeCls: string }[] = [
  { v: 1,   label: "Adequado",               short: "ADQ", cls: "border-emerald-400/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10", activeCls: "border-emerald-500 bg-emerald-500 text-white shadow-[0_8px_24px_-8px_rgba(16,185,129,.6)]" },
  { v: 0.5, label: "Parcialmente adequado",  short: "PAR", cls: "border-amber-400/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10",      activeCls: "border-amber-500 bg-amber-500 text-white shadow-[0_8px_24px_-8px_rgba(245,158,11,.6)]" },
  { v: 0,   label: "Inadequado",             short: "INA", cls: "border-rose-400/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10",          activeCls: "border-rose-500 bg-rose-500 text-white shadow-[0_8px_24px_-8px_rgba(244,63,94,.6)]" },
];

function fmt(t: number) {
  const m = Math.floor(t / 60).toString().padStart(2, "0");
  const s = Math.floor(t % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function EvaluatorView() {
  const { code } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [station, setStation] = useState<LoadedStation | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState<"em_andamento" | "aprovado" | "reprovado" | "repetir">("em_andamento");
  const [saving, setSaving] = useState(false);
  const [openAnalysis, setOpenAnalysis] = useState(false);

  // Timer (regressivo a partir da duração da estação)
  const [seconds, setSeconds] = useState(600);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: r } = await supabase.from("training_rooms").select("id, code, station_id, station_title").eq("code", code).maybeSingle();
      if (!r) return;
      setRoom(r as Room);
      const st = await loadStation((r as Room).station_id);
      setStation(st);
      if (st) setSeconds((st.durationMinutes ?? 10) * 60);
      const { data: parts } = await supabase.from("training_room_participants").select("user_id, role").eq("room_id", (r as Room).id);
      const cand = (parts ?? []).find((p: { role: string }) => p.role === "candidato");
      setCandidateId(cand?.user_id ?? null);
      if (user) {
        const { data: ev } = await supabase.from("room_evaluations")
          .select("*").eq("room_id", (r as Room).id).eq("evaluator_id", user.id).maybeSingle();
        if (ev) {
          // back-compat: campo `checks` era boolean; converte para Level
          const raw = (ev.checks ?? {}) as Record<string, unknown>;
          const converted: Record<string, Level> = {};
          for (const [k, v] of Object.entries(raw)) {
            if (typeof v === "boolean") converted[k] = v ? 1 : 0;
            else if (v === 1 || v === 0.5 || v === 0) converted[k] = v as Level;
          }
          setLevels(converted);
          setComments((ev.item_comments ?? {}) as Record<string, string>);
          setFeedback(ev.final_feedback ?? "");
          setStatus(ev.status as typeof status);
        }
      }
    })();
  }, [code, user?.id]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [running]);

  useEffect(() => { if (seconds === 0) setRunning(false); }, [seconds]);

  const grouped = useMemo(() => {
    const map = new Map<string, LoadedStation["checklist"]>();
    station?.checklist.forEach((it) => {
      const arr = map.get(it.category) ?? [];
      arr.push(it);
      map.set(it.category, arr);
    });
    return Array.from(map.entries());
  }, [station]);

  const totals = useMemo(() => {
    if (!station) return { total: 0, earned: 0, done: 0 };
    const total = station.checklist.reduce((s, i) => s + i.points, 0);
    const earned = station.checklist.reduce((s, i) => s + (levels[i.id] !== undefined ? i.points * levels[i.id] : 0), 0);
    const done = station.checklist.filter((i) => levels[i.id] !== undefined).length;
    return { total, earned, done };
  }, [station, levels]);
  const score = totals.total > 0 ? (totals.earned / totals.total) * 10 : 0;
  const progress = station ? (totals.done / station.checklist.length) * 100 : 0;
  const allEvaluated = station ? totals.done === station.checklist.length : false;

  async function save(submit = false) {
    if (!room || !user) return;
    if (submit && !allEvaluated) {
      toast.error("Avalie todos os itens antes de finalizar.");
      return;
    }
    setSaving(true);
    const payload = {
      room_id: room.id,
      evaluator_id: user.id,
      candidate_id: candidateId,
      station_id: room.station_id,
      checks: levels,
      item_comments: comments,
      final_feedback: feedback,
      final_score: Number(score.toFixed(2)),
      status: submit ? status : "em_andamento",
      submitted_at: submit ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from("room_evaluations")
      .upsert(payload, { onConflict: "room_id,evaluator_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(submit ? "Correção enviada com sucesso" : "Rascunho salvo");
    if (submit) nav({ to: "/app/sala/$code", params: { code } });
  }

  if (!station || !room) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Carregando painel do avaliador...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24">
      <Link to="/app/sala/$code" params={{ code }} className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar à sala
      </Link>

      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-300/20 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-6 text-white shadow-elegant md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-mint/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <ClipboardCheck className="h-3.5 w-3.5 text-mint" /> Painel do Avaliador
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{room.station_title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge className="border-0 bg-white/15 text-white">{station.specialty}</Badge>
              <Badge className="border-0 bg-white/15 text-white">{station.difficulty}</Badge>
              <Badge className="border-0 bg-mint/20 text-mint">Sala #{code}</Badge>
              {candidateId && <Badge className="border-0 bg-emerald-400/20 text-emerald-200">Candidato conectado</Badge>}
            </div>
          </div>

          {/* Timer card */}
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md">
            <div className="text-center">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Cronômetro</div>
              <div className="font-display text-3xl font-bold tabular-nums">{fmt(seconds)}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/20" onClick={() => setRunning((r) => !r)}>
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/20"
                onClick={() => { setRunning(false); setSeconds((station.durationMinutes ?? 10) * 60); }}>
                <TimerReset className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* CHECKLIST */}
        <section className="space-y-6">
          {grouped.map(([cat, items]) => (
            <div key={cat} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-indigo-50/60 to-transparent px-5 py-3 dark:from-indigo-950/30">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-[11px] font-bold text-indigo-600 dark:text-indigo-300">
                    {items.length}
                  </span>
                  <h3 className="text-sm font-semibold tracking-wide">{cat}</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {items.reduce((s, i) => s + i.points, 0)} pts
                </span>
              </div>
              <ul className="divide-y divide-border/50">
                {items.map((it, idx) => {
                  const lvl = levels[it.id];
                  return (
                    <li key={it.id} className="p-5 transition hover:bg-muted/30">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-relaxed">{it.description}</p>
                          <div className="mt-1 text-xs text-muted-foreground">Vale {it.points} pts</div>

                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {LEVELS.map((L) => {
                              const active = lvl === L.v;
                              return (
                                <button
                                  key={L.v}
                                  type="button"
                                  onClick={() => setLevels((s) => ({ ...s, [it.id]: L.v }))}
                                  className={`group relative rounded-xl border-2 px-2 py-2 text-left text-xs font-medium transition-all ${active ? L.activeCls : `bg-card ${L.cls}`}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="hidden md:inline">{L.label}</span>
                                    <span className="md:hidden">{L.short}</span>
                                    <span className={`tabular-nums ${active ? "text-white/90" : "opacity-60"}`}>
                                      {(it.points * L.v).toFixed(L.v === 0.5 ? 1 : 0)}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          <Textarea
                            value={comments[it.id] ?? ""}
                            onChange={(e) => setComments((c) => ({ ...c, [it.id]: e.target.value }))}
                            placeholder="Observação para este item (opcional)"
                            rows={2}
                            className="mt-3 resize-none bg-background/50 text-sm"
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Análise da estação */}
          {(station.expectedConduct || station.commonMistakes || station.scoringCriteria || station.evaluatorNotes) && (
            <div className="overflow-hidden rounded-2xl border border-indigo-200/40 bg-gradient-to-br from-indigo-50/40 to-mint/5 dark:from-indigo-950/20 dark:to-mint/5">
              <button
                type="button"
                onClick={() => setOpenAnalysis((o) => !o)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  <span className="font-semibold">Análise da estação</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${openAnalysis ? "rotate-180" : ""}`} />
              </button>
              {openAnalysis && (
                <div className="space-y-4 border-t border-indigo-200/30 px-5 py-5 text-sm">
                  {station.expectedConduct && (
                    <div className="rounded-xl border border-emerald-200/40 bg-emerald-50/40 p-4 dark:bg-emerald-950/20">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        <Target className="h-3.5 w-3.5" /> Conduta esperada
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{station.expectedConduct}</p>
                    </div>
                  )}
                  {station.commonMistakes && (
                    <div className="rounded-xl border border-amber-200/40 bg-amber-50/40 p-4 dark:bg-amber-950/20">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5" /> Erros comuns
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{station.commonMistakes}</p>
                    </div>
                  )}
                  {(station.scoringCriteria || station.evaluatorNotes) && (
                    <div className="rounded-xl border border-border/60 bg-card p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" /> Observações para a banca
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                        {station.scoringCriteria ?? station.evaluatorNotes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Feedback final */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-mint" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Feedback final ao candidato</h3>
            </div>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={6}
              placeholder="Pontos fortes, oportunidades de melhoria, recomendações para o próximo treino..."
              className="mt-3 resize-none"
            />

            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resultado final</div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {([
                  { v: "aprovado", l: "Aprovado", icon: CheckCircle2, cls: "border-emerald-400/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10", active: "border-emerald-500 bg-emerald-500 text-white" },
                  { v: "repetir",  l: "Repetir",  icon: RotateCw,     cls: "border-amber-400/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10",       active: "border-amber-500 bg-amber-500 text-white" },
                  { v: "reprovado", l: "Reprovado", icon: XCircle,    cls: "border-rose-400/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10",          active: "border-rose-500 bg-rose-500 text-white" },
                ] as const).map((b) => {
                  const active = status === b.v;
                  return (
                    <button key={b.v} type="button" onClick={() => setStatus(b.v)}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all ${active ? b.active : `bg-card ${b.cls}`}`}>
                      <b.icon className="h-4 w-4" /> {b.l}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* SIDEBAR */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-4">
            {/* Score card */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-elegant">
              <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-mint/20 blur-3xl" />
              <div className="relative">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-mint/90">Pontuação atual</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-6xl font-bold tabular-nums">{score.toFixed(2)}</span>
                  <span className="text-lg text-white/50">/ 10</span>
                </div>
                <div className="mt-1 text-xs text-white/60">
                  {totals.earned.toFixed(1)} de {totals.total} pts · {totals.done}/{station.checklist.length} itens
                </div>

                {/* Progress */}
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-mint via-emerald-400 to-mint transition-all"
                       style={{ width: `${progress}%` }} />
                </div>

                {/* Mini legend */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    { c: "bg-emerald-500", n: Object.values(levels).filter((v) => v === 1).length, l: "Adq." },
                    { c: "bg-amber-500",   n: Object.values(levels).filter((v) => v === 0.5).length, l: "Parc." },
                    { c: "bg-rose-500",    n: Object.values(levels).filter((v) => v === 0).length, l: "Inad." },
                  ].map((x, i) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                      <div className={`mx-auto h-1.5 w-6 rounded-full ${x.c}`} />
                      <div className="mt-1 font-display text-xl font-bold tabular-nums">{x.n}</div>
                      <div className="text-[10px] uppercase tracking-wider text-white/60">{x.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
              <Button variant="hero" className="w-full" size="lg"
                onClick={() => save(true)}
                disabled={saving || status === "em_andamento" || !allEvaluated}>
                <Send className="mr-2 h-4 w-4" /> Finalizar correção
              </Button>
              <Button variant="outline" className="mt-2 w-full" onClick={() => save(false)} disabled={saving}>
                Salvar rascunho
              </Button>
              {(!allEvaluated || status === "em_andamento") && (
                <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
                  {!allEvaluated ? "Avalie todos os itens" : "Escolha o resultado final"} antes de finalizar.
                </p>
              )}
            </div>

            {/* Quick legend */}
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-xs">
              <div className="font-semibold text-foreground">Como pontuar</div>
              <ul className="mt-2 space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> <b className="text-emerald-700 dark:text-emerald-300">Adequado</b> — executou completamente</li>
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" /> <b className="text-amber-700 dark:text-amber-300">Parcial</b> — executou de forma incompleta</li>
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-500" /> <b className="text-rose-700 dark:text-rose-300">Inadequado</b> — não executou</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
