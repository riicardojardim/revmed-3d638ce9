import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { loadStation, type LoadedStation } from "@/lib/stationLoader";
import {
  ArrowLeft, ClipboardCheck, Send, CheckCircle2, XCircle, RotateCw,
  Play, Pause, TimerReset, Sparkles, BookOpen, AlertTriangle, Target,
  ChevronDown, Theater, FileText, UserRound, Inbox, PackageCheck,
  ScrollText, Lock, Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/sala/$code/banca")({
  component: EvaluatorView,
  head: () => ({ meta: [{ title: "Painel do Avaliador — Estação Revalida" }] }),
});

type Room = { id: string; code: string; station_id: string; station_title: string };
type Delivery = { id: string; material_id: string; material_name: string };
type Tab = "cenario" | "roteiro" | "impressos" | "checklist" | "feedback";

const TABS: { k: Tab; l: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { k: "cenario",   l: "Cenário",      icon: ScrollText },
  { k: "roteiro",   l: "Roteiro",      icon: Theater },
  { k: "impressos", l: "Impressos",    icon: Inbox },
  { k: "checklist", l: "Checklist",    icon: ClipboardCheck },
  { k: "feedback",  l: "Resultado",    icon: Send },
];

// Stores the points awarded per item (matches the level's `points`)
type Level = number;

// Visual mapping derived from the level label (Pense Revalida style)
function levelStyle(label: string) {
  const k = label.toLowerCase();
  if (k.startsWith("adequado")) return { dot: "bg-emerald-500", cls: "border-emerald-400/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10", activeCls: "border-emerald-500 bg-emerald-500 text-white shadow-[0_8px_24px_-8px_rgba(16,185,129,.6)]", short: "ADQ" };
  if (k.startsWith("parc"))     return { dot: "bg-amber-500",   cls: "border-amber-400/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10",         activeCls: "border-amber-500 bg-amber-500 text-white shadow-[0_8px_24px_-8px_rgba(245,158,11,.6)]", short: "PAR" };
  return                          { dot: "bg-rose-500",    cls: "border-rose-400/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10",             activeCls: "border-rose-500 bg-rose-500 text-white shadow-[0_8px_24px_-8px_rgba(244,63,94,.6)]", short: "INA" };
}

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
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState<"em_andamento" | "aprovado" | "reprovado" | "repetir">("em_andamento");
  const [saving, setSaving] = useState(false);
  const [openAnalysis, setOpenAnalysis] = useState(false);
  const [tab, setTab] = useState<Tab>("cenario");

  // Timer regressivo
  const [seconds, setSeconds] = useState(600);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: r } = await supabase.from("training_rooms")
        .select("id, code, station_id, station_title").eq("code", code).maybeSingle();
      if (!r) return;
      setRoom(r as Room);
      const st = await loadStation((r as Room).station_id);
      setStation(st);
      if (st) setSeconds((st.durationMinutes ?? 10) * 60);

      const { data: parts } = await supabase.from("training_room_participants")
        .select("user_id, role").eq("room_id", (r as Room).id);
      const cand = (parts ?? []).find((p: { role: string }) => p.role === "candidato");
      setCandidateId(cand?.user_id ?? null);

      const { data: dels } = await supabase.from("room_material_deliveries")
        .select("id, material_id, material_name").eq("room_id", (r as Room).id);
      setDeliveries((dels ?? []) as Delivery[]);

      if (user) {
        const { data: ev } = await supabase.from("room_evaluations")
          .select("*").eq("room_id", (r as Room).id).eq("evaluator_id", user.id).maybeSingle();
        if (ev) {
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

  // Realtime deliveries
  useEffect(() => {
    if (!room) return;
    const ch = supabase
      .channel(`banca-${room.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "room_material_deliveries", filter: `room_id=eq.${room.id}` },
        async () => {
          const { data: dels } = await supabase.from("room_material_deliveries")
            .select("id, material_id, material_name").eq("room_id", room.id);
          setDeliveries((dels ?? []) as Delivery[]);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [room?.id]);

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
    const earned = station.checklist.reduce((s, i) => s + (levels[i.id] ?? 0), 0);
    const done = station.checklist.filter((i) => levels[i.id] !== undefined).length;
    return { total, earned, done };
  }, [station, levels]);
  const score = totals.total > 0 ? (totals.earned / totals.total) * 10 : 0;
  const pct = totals.total > 0 ? (totals.earned / totals.total) * 100 : 0;
  const progress = station ? (totals.done / station.checklist.length) * 100 : 0;
  const allEvaluated = station ? totals.done === station.checklist.length : false;

  async function deliver(materialId: string) {
    if (!room || !user || !station) return;
    const m = station.deliverableMaterials?.find((x) => x.id === materialId);
    if (!m) return;
    const { error } = await supabase.from("room_material_deliveries").insert({
      room_id: room.id,
      material_id: m.id,
      material_name: m.name,
      material_type: m.type,
      material_description: m.description ?? null,
      material_content: m.content,
      delivered_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success(`Impresso entregue: ${m.name}`);
  }

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

  const materials = station.deliverableMaterials ?? [];
  const delivered = new Set(deliveries.map((d) => d.material_id));
  const p = station.patientProfile;

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
              <ClipboardCheck className="h-3.5 w-3.5 text-mint" /> Painel da Banca / Ator-Avaliador
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{room.station_title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge className="border-0 bg-white/15 text-white">{station.specialty}</Badge>
              <Badge className="border-0 bg-white/15 text-white">{station.difficulty}</Badge>
              <Badge className="border-0 bg-mint/20 text-mint">Sala #{code}</Badge>
              <Badge className="border-0 bg-white/15 text-white">{station.durationMinutes} min</Badge>
              {candidateId
                ? <Badge className="border-0 bg-emerald-400/20 text-emerald-200">Candidato conectado</Badge>
                : <Badge className="border-0 bg-amber-400/20 text-amber-200">Aguardando candidato</Badge>}
            </div>
          </div>

          {/* Timer */}
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

      {/* TABS */}
      <div className="sticky top-16 z-20 -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-border/60 bg-card/80 p-1.5 shadow-sm backdrop-blur-md no-scrollbar">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.k;
          const badge =
            t.k === "impressos" ? `${deliveries.length}/${materials.length}` :
            t.k === "checklist" ? `${totals.done}/${station.checklist.length}` :
            null;
          return (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={cn(
                "group flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all md:px-4",
                active
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-elegant"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}>
              <Icon className="h-4 w-4" /> {t.l}
              {badge && (
                <span className={cn("ml-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  active ? "bg-white/20" : "bg-muted text-muted-foreground")}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">

          {/* === CENÁRIO === */}
          {tab === "cenario" && (
            <div className="space-y-5">
              <PanelSection icon={ScrollText} title="Cenário de atuação" accent="indigo">
                <div className="space-y-3 leading-relaxed">
                  <p className="whitespace-pre-wrap">{station.clinicalCase}</p>
                </div>
              </PanelSection>

              <PanelSection icon={Target} title={`Tarefas dos ${station.durationMinutes} minutos`} accent="mint">
                <p className="whitespace-pre-wrap leading-relaxed">{station.candidateTask}</p>
              </PanelSection>

              {station.educationalGoal && (
                <PanelSection icon={Sparkles} title="Objetivo educacional" accent="indigo">
                  <p className="whitespace-pre-wrap">{station.educationalGoal}</p>
                </PanelSection>
              )}
            </div>
          )}

          {/* === ROTEIRO DO ATOR === */}
          {tab === "roteiro" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-amber-300/40 bg-amber-50/60 p-4 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-200">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" /> Regras de interpretação
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                  <li>Responda apenas o que for perguntado pelo candidato.</li>
                  <li>Não revele espontaneamente informações sensíveis.</li>
                  <li>Mantenha o comportamento/tom emocional descrito.</li>
                  <li>Não corrija o candidato durante a estação.</li>
                </ul>
              </div>

              {p && (
                <PanelSection icon={UserRound} title="Dados pessoais & queixa" accent="indigo">
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {patientFields(p).map(([k, v]) => v && (
                      <div key={k} className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</dt>
                        <dd className="mt-0.5 text-sm">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </PanelSection>
              )}

              <PanelSection icon={Theater} title="Roteiro detalhado do paciente" accent="mint">
                <p className="whitespace-pre-wrap leading-relaxed">{station.patientScript}</p>
              </PanelSection>

              {p?.spontaneous && (
                <PanelSection icon={Sparkles} title="Falar espontaneamente" accent="emerald">
                  <p className="whitespace-pre-wrap">{p.spontaneous}</p>
                </PanelSection>
              )}
              {p?.onlyIfAsked && (
                <PanelSection icon={BookOpen} title="Revelar apenas se perguntado" accent="indigo">
                  <p className="whitespace-pre-wrap">{p.onlyIfAsked}</p>
                </PanelSection>
              )}
              {p?.doNotReveal && (
                <PanelSection icon={Lock} title="Nunca revelar" accent="rose">
                  <p className="whitespace-pre-wrap">{p.doNotReveal}</p>
                </PanelSection>
              )}
              {(p?.emotionalTone || p?.actingTips) && (
                <PanelSection icon={Theater} title="Tom emocional e dicas de atuação" accent="amber">
                  {p?.emotionalTone && <p><span className="font-semibold">Tom:</span> {p.emotionalTone}</p>}
                  {p?.actingTips && <p className="mt-1"><span className="font-semibold">Dicas:</span> {p.actingTips}</p>}
                </PanelSection>
              )}
            </div>
          )}

          {/* === IMPRESSOS === */}
          {tab === "impressos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold">Impressos para entregar</h2>
                  <p className="text-xs text-muted-foreground">Entregue cada impresso somente quando o candidato solicitar.</p>
                </div>
                <Badge variant="outline" className="text-xs">{deliveries.length}/{materials.length} entregues</Badge>
              </div>

              {materials.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  Esta estação não possui impressos cadastrados.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {materials.map((m, idx) => {
                    const isDelivered = delivered.has(m.id);
                    return (
                      <div key={m.id} className={cn(
                        "group relative overflow-hidden rounded-2xl border p-4 transition-all",
                        isDelivered
                          ? "border-emerald-400/50 bg-gradient-to-br from-emerald-50/60 to-mint/5 dark:from-emerald-950/20"
                          : "border-border bg-card hover:border-indigo-400/40 hover:shadow-md",
                      )}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
                              isDelivered ? "bg-emerald-500 text-white" : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
                            )}>
                              {String(idx + 1).padStart(2, "0")}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-sm font-semibold">
                                {isDelivered ? <Unlock className="h-3.5 w-3.5 text-emerald-600" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                                Impresso {idx + 1} <span className="text-muted-foreground">·</span> {m.name}
                              </div>
                              <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{m.type}</div>
                              {m.description && <div className="mt-1.5 text-xs text-muted-foreground">{m.description}</div>}
                            </div>
                          </div>
                          {m.autoDeliver && <Badge variant="outline" className="shrink-0 text-[10px]">Auto</Badge>}
                        </div>

                        {isDelivered && m.content && (
                          <div className="mt-3 max-h-32 overflow-auto rounded-lg border border-emerald-300/30 bg-background/60 p-2.5 text-xs leading-relaxed">
                            {m.content}
                          </div>
                        )}

                        <Button size="sm" variant={isDelivered ? "outline" : "hero"} className="mt-3 w-full"
                          disabled={isDelivered} onClick={() => deliver(m.id)}>
                          {isDelivered
                            ? <><PackageCheck className="mr-1 h-4 w-4" /> Entregue ao candidato</>
                            : <><Send className="mr-1 h-4 w-4" /> Entregar agora</>}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* === CHECKLIST PEP === */}
          {tab === "checklist" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-indigo-300/30 bg-gradient-to-r from-indigo-50/60 to-mint/5 px-5 py-3 text-xs dark:from-indigo-950/20">
                <div className="flex items-center gap-2 font-semibold text-indigo-700 dark:text-indigo-300">
                  <ClipboardCheck className="h-3.5 w-3.5" /> Checklist (PEP)
                </div>
                <p className="mt-1 text-muted-foreground">
                  Avalie cada item em <b className="text-emerald-700 dark:text-emerald-300">Adequado</b>,
                  {" "}<b className="text-amber-700 dark:text-amber-300">Parcialmente adequado</b> ou
                  {" "}<b className="text-rose-700 dark:text-rose-300">Inadequado</b>. A pontuação é calculada automaticamente.
                </p>
              </div>

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
                        <li key={it.id} className={cn(
                          "p-5 transition",
                          lvl === 1 && "bg-emerald-50/30 dark:bg-emerald-950/10",
                          lvl === 0.5 && "bg-amber-50/30 dark:bg-amber-950/10",
                          lvl === 0 && "bg-rose-50/30 dark:bg-rose-950/10",
                          lvl === undefined && "hover:bg-muted/30",
                        )}>
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              lvl === undefined ? "bg-muted text-muted-foreground" : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md",
                            )}>
                              {idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold leading-relaxed">{it.description}</p>
                              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{it.category}</Badge>
                                <span>Vale <b className="text-foreground tabular-nums">{it.points}</b> pts</span>
                              </div>

                              {/* Pontuação por nível (estilo PR: 3 colunas com pontos) */}
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                {LEVELS.map((L) => {
                                  const active = lvl === L.v;
                                  const pts = it.points * L.v;
                                  return (
                                    <button key={L.v} type="button"
                                      onClick={() => setLevels((s) => ({ ...s, [it.id]: L.v }))}
                                      className={cn(
                                        "group relative rounded-xl border-2 px-2.5 py-2 text-left transition-all",
                                        active ? L.activeCls : `bg-card ${L.cls}`,
                                      )}>
                                      <div className="flex items-center gap-1.5">
                                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", active ? "bg-white" : L.dot)} />
                                        <span className="text-[11px] font-semibold leading-tight">
                                          <span className="hidden md:inline">{L.label}</span>
                                          <span className="md:hidden">{L.short}</span>
                                        </span>
                                      </div>
                                      <div className={cn("mt-1 font-display text-base font-bold tabular-nums", active ? "text-white" : "")}>
                                        {pts === 0 ? "0" : pts % 1 === 0 ? pts.toFixed(0) : pts.toFixed(2)}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>

                              <Textarea value={comments[it.id] ?? ""}
                                onChange={(e) => setComments((c) => ({ ...c, [it.id]: e.target.value }))}
                                placeholder="Observação para este item (opcional)"
                                rows={2}
                                className="mt-3 resize-none bg-background/50 text-sm" />
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
                <div className="overflow-hidden rounded-2xl border border-indigo-200/40 bg-gradient-to-br from-indigo-50/40 to-mint/5 dark:from-indigo-950/20">
                  <button type="button" onClick={() => setOpenAnalysis((o) => !o)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      <span className="font-semibold">Análise da estação (gabarito da banca)</span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", openAnalysis && "rotate-180")} />
                  </button>
                  {openAnalysis && (
                    <div className="space-y-4 border-t border-indigo-200/30 px-5 py-5 text-sm">
                      {station.expectedConduct && (
                        <InfoCard color="emerald" icon={Target} title="Conduta esperada" content={station.expectedConduct} />
                      )}
                      {station.commonMistakes && (
                        <InfoCard color="amber" icon={AlertTriangle} title="Erros comuns" content={station.commonMistakes} />
                      )}
                      {(station.scoringCriteria || station.evaluatorNotes) && (
                        <InfoCard color="slate" icon={BookOpen} title="Observações para a banca" content={station.scoringCriteria ?? station.evaluatorNotes ?? ""} />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* === FEEDBACK / RESULTADO === */}
          {tab === "feedback" && (
            <div className="space-y-5">
              <PanelSection icon={Send} title="Feedback final ao candidato" accent="mint">
                <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={7}
                  placeholder="Pontos fortes, oportunidades de melhoria, recomendações para o próximo treino..."
                  className="resize-none" />
              </PanelSection>

              <PanelSection icon={CheckCircle2} title="Resultado final" accent="indigo">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {([
                    { v: "aprovado",  l: "Aprovado",  icon: CheckCircle2, cls: "border-emerald-400/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10", active: "border-emerald-500 bg-emerald-500 text-white" },
                    { v: "repetir",   l: "Repetir",   icon: RotateCw,     cls: "border-amber-400/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10",       active: "border-amber-500 bg-amber-500 text-white" },
                    { v: "reprovado", l: "Reprovado", icon: XCircle,      cls: "border-rose-400/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10",          active: "border-rose-500 bg-rose-500 text-white" },
                  ] as const).map((b) => {
                    const active = status === b.v;
                    return (
                      <button key={b.v} type="button" onClick={() => setStatus(b.v)}
                        className={cn("flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all",
                          active ? b.active : `bg-card ${b.cls}`)}>
                        <b.icon className="h-4 w-4" /> {b.l}
                      </button>
                    );
                  })}
                </div>
              </PanelSection>
            </div>
          )}
        </section>

        {/* SIDEBAR */}
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="space-y-4">
            {/* Score card */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-elegant">
              <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-mint/20 blur-3xl" />
              <div className="relative">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-mint/90">Resultado ao vivo</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-6xl font-bold tabular-nums">{score.toFixed(2)}</span>
                  <span className="text-lg text-white/50">/ 10</span>
                </div>
                <div className="mt-1 text-xs text-white/60">
                  {totals.earned.toFixed(2)} / {totals.total} pts · {pct.toFixed(0)}%
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-mint via-emerald-400 to-mint transition-all"
                       style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-1 text-[10px] text-white/50">
                  Progresso da avaliação · {totals.done}/{station.checklist.length} itens
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    { c: "bg-emerald-500", n: Object.values(levels).filter((v) => v === 1).length,   l: "Adq." },
                    { c: "bg-amber-500",   n: Object.values(levels).filter((v) => v === 0.5).length, l: "Parc." },
                    { c: "bg-rose-500",    n: Object.values(levels).filter((v) => v === 0).length,   l: "Inad." },
                  ].map((x, i) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                      <div className={cn("mx-auto h-1.5 w-6 rounded-full", x.c)} />
                      <div className="mt-1 font-display text-xl font-bold tabular-nums">{x.n}</div>
                      <div className="text-[10px] uppercase tracking-wider text-white/60">{x.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Participantes */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Participantes</div>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">A</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold">Você (Ator-Avaliador)</div>
                    <div className="text-[10px] text-emerald-600">● Conectado</div>
                  </div>
                </div>
                <div className={cn("flex items-center gap-2.5 rounded-lg border px-3 py-2",
                  candidateId ? "border-emerald-300/40 bg-emerald-50/40 dark:bg-emerald-950/10" : "border-dashed border-border/60 bg-muted/20")}>
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                    candidateId ? "bg-gradient-to-br from-mint to-emerald-500 text-white" : "bg-muted text-muted-foreground")}>
                    C
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold">Candidato</div>
                    <div className={cn("text-[10px]", candidateId ? "text-emerald-600" : "text-muted-foreground")}>
                      {candidateId ? "● Conectado" : "Aguardando..."}
                    </div>
                  </div>
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

            {/* Legenda */}
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-xs">
              <div className="font-semibold text-foreground">Como pontuar</div>
              <ul className="mt-2 space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> <b className="text-emerald-700 dark:text-emerald-300">Adequado</b> — executou completamente (1.0×)</li>
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" /> <b className="text-amber-700 dark:text-amber-300">Parcial</b> — executou de forma incompleta (0.5×)</li>
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-500" /> <b className="text-rose-700 dark:text-rose-300">Inadequado</b> — não executou (0×)</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ===== Helpers ===== */

function PanelSection({
  icon: Icon, title, accent = "indigo", children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  accent?: "indigo" | "mint" | "emerald" | "rose" | "amber";
  children: React.ReactNode;
}) {
  const accents = {
    indigo:  "from-indigo-50/60 to-transparent dark:from-indigo-950/30 text-indigo-600 dark:text-indigo-300",
    mint:    "from-mint/10 to-transparent text-emerald-600 dark:text-mint",
    emerald: "from-emerald-50/60 to-transparent dark:from-emerald-950/30 text-emerald-600 dark:text-emerald-300",
    rose:    "from-rose-50/60 to-transparent dark:from-rose-950/30 text-rose-600 dark:text-rose-300",
    amber:   "from-amber-50/60 to-transparent dark:from-amber-950/30 text-amber-600 dark:text-amber-300",
  }[accent];
  const [bgClass, iconClass] = accents.split(" text-");
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className={cn("flex items-center gap-2 border-b border-border/60 bg-gradient-to-r px-5 py-3", bgClass)}>
        <Icon className={cn("h-4 w-4", `text-${iconClass}`)} />
        <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
      </div>
      <div className="px-5 py-4 text-sm text-foreground/90">{children}</div>
    </div>
  );
}

function InfoCard({
  color, icon: Icon, title, content,
}: {
  color: "emerald" | "amber" | "slate";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  content: string;
}) {
  const cls = {
    emerald: "border-emerald-200/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300",
    amber:   "border-amber-200/40 bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300",
    slate:   "border-border/60 bg-card text-muted-foreground",
  }[color];
  return (
    <div className={cn("rounded-xl border p-4", cls)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{content}</p>
    </div>
  );
}

function patientFields(p: NonNullable<LoadedStation["patientProfile"]>): [string, string | undefined][] {
  return [
    ["Nome", p.name],
    ["Idade", p.age],
    ["Sexo", p.sex],
    ["Profissão", p.profession],
    ["Queixa principal", p.chiefComplaint],
    ["História da doença atual", p.hpi],
    ["Antecedentes pessoais", p.personalHistory],
    ["Medicamentos em uso", p.medications],
    ["Alergias", p.allergies],
    ["História familiar", p.familyHistory],
    ["Hábitos de vida", p.habits],
    ["Sinais e sintomas", p.symptoms],
    ["Sinais vitais", p.vitals],
    ["Exames prévios", p.previousExams],
  ];
}
