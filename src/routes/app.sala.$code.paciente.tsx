import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { loadStation, type LoadedStation } from "@/lib/stationLoader";
import { getServerOffset, serverNow } from "@/lib/serverClock";
import {
  ArrowLeft, MessageSquare, ListChecks, Theater, Inbox, Copy, Link2,
  Play, UserPlus, CheckCheck, ClipboardCheck, Send, FileText, PackageCheck,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/sala/$code/paciente")({
  component: ActorView,
  head: () => ({ meta: [{ title: "Estação — Ator/Avaliador" }] }),
});

type Room = { id: string; code: string; station_id: string; station_title: string; status: string; started_at: string | null };
type Delivery = { id: string; material_id: string; material_name: string };

function ActorView() {
  const { code } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [station, setStation] = useState<LoadedStation | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [evalStatus, setEvalStatus] = useState<"em_andamento" | "aprovado" | "reprovado" | "repetir">("em_andamento");
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showPEP, setShowPEP] = useState(false);

  // Timer state (synced with room.started_at)
  const [remaining, setRemaining] = useState(0);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refreshCandidate(roomId: string) {
    const { data: parts } = await supabase.from("training_room_participants")
      .select("user_id, role").eq("room_id", roomId);
    const cand = (parts ?? []).find((p: { role: string }) => p.role === "candidato");
    setCandidateId(cand?.user_id ?? null);
    if (cand?.user_id) {
      const { data: prof } = await supabase.from("profiles")
        .select("full_name").eq("id", cand.user_id).maybeSingle();
      setCandidateName(prof?.full_name ?? "Candidato");
    } else {
      setCandidateName(null);
    }
  }

  useEffect(() => {
    (async () => {
      const { data: r } = await supabase.from("training_rooms")
        .select("id, code, station_id, station_title, status, started_at").eq("code", code).maybeSingle();
      if (!r) return;
      setRoom(r as Room);
      const st = await loadStation((r as Room).station_id);
      setStation(st);
      if (st) setRemaining(st.durationMinutes * 60);

      await refreshCandidate((r as Room).id);

      const { data: dels } = await supabase.from("room_material_deliveries")
        .select("id, material_id, material_name").eq("room_id", (r as Room).id);
      setDeliveries((dels ?? []) as Delivery[]);

      if (user) {
        const { data: ev } = await supabase.from("room_evaluations")
          .select("*").eq("room_id", (r as Room).id).eq("evaluator_id", user.id).maybeSingle();
        if (ev) {
          setChecks((ev.checks ?? {}) as Record<string, boolean>);
          setComments((ev.item_comments ?? {}) as Record<string, string>);
          setFeedback(ev.final_feedback ?? "");
          setEvalStatus(ev.status as typeof evalStatus);
        }
      }
    })();
  }, [code, user?.id]);

  useEffect(() => {
    if (!room) return;
    const ch = supabase
      .channel(`actor-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_material_deliveries", filter: `room_id=eq.${room.id}` }, async () => {
        const { data: dels } = await supabase.from("room_material_deliveries")
          .select("id, material_id, material_name").eq("room_id", room.id);
        setDeliveries((dels ?? []) as Delivery[]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "training_room_participants", filter: `room_id=eq.${room.id}` }, async (payload) => {
        const row = payload.new as { user_id: string; role: string };
        if (row.role === "candidato") {
          setCandidateId(row.user_id);
          const { data: prof } = await supabase.from("profiles")
            .select("full_name").eq("id", row.user_id).maybeSingle();
          const name = prof?.full_name ?? "Candidato";
          setCandidateName(name);
          toast.success(`${name} entrou na sala`, { description: "Você já pode iniciar o cronômetro." });
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "training_room_participants", filter: `room_id=eq.${room.id}` }, async () => {
        await refreshCandidate(room.id);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "training_rooms", filter: `id=eq.${room.id}` }, (payload) => {
        setRoom((prev) => prev ? { ...prev, ...(payload.new as Room) } : prev);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [room?.id]);

  // Sync timer with room.started_at
  useEffect(() => {
    if (!room || !station) return;
    if (room.status === "running" && room.started_at && !finished) {
      const totalSec = station.durationMinutes * 60;
      const startedMs = new Date(room.started_at).getTime();
      let cancelled = false;

      const tick = () => {
        const elapsed = Math.floor((serverNow() - startedMs) / 1000);
        const left = Math.max(0, totalSec - elapsed);
        setRemaining(left);
        if (left <= 0) {
          setFinished(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      };

      const onVisible = () => {
        if (document.visibilityState === "visible") {
          getServerOffset(true).then(() => { if (!cancelled) tick(); });
        }
      };

      getServerOffset().then(() => { if (!cancelled) tick(); });
      intervalRef.current = setInterval(tick, 1000);
      document.addEventListener("visibilitychange", onVisible);

      return () => {
        cancelled = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        document.removeEventListener("visibilitychange", onVisible);
      };
    }
  }, [room?.status, room?.started_at, station?.id, finished]);

  const totals = useMemo(() => {
    if (!station) return { total: 0, earned: 0 };
    const total = station.checklist.reduce((s, i) => s + i.points, 0);
    const earned = station.checklist.reduce((s, i) => s + (checks[i.id] ? i.points : 0), 0);
    return { total, earned };
  }, [station, checks]);
  const score = totals.total > 0 ? (totals.earned / totals.total) * 10 : 0;
  const pct = totals.total > 0 ? (totals.earned / totals.total) * 100 : 0;

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
    toast.success(`Entregue: ${m.name}`);
  }

  async function save(submit = false) {
    if (!room || !user) return;
    setSaving(true);
    const payload = {
      room_id: room.id,
      evaluator_id: user.id,
      candidate_id: candidateId,
      station_id: room.station_id,
      checks,
      item_comments: comments,
      final_feedback: feedback,
      final_score: Number(score.toFixed(2)),
      status: submit ? evalStatus : "em_andamento",
      submitted_at: submit ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from("room_evaluations")
      .upsert(payload, { onConflict: "room_id,evaluator_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(submit ? "Correção enviada" : "Rascunho salvo");
    if (submit) nav({ to: "/app/sala/$code", params: { code } });
  }

  async function startStation() {
    if (!room) return;
    if (!candidateId) return toast.error("Aguarde o candidato entrar pelo link.");
    setStarting(true);
    const { error } = await supabase.from("training_rooms")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", room.id);
    setStarting(false);
    if (error) return toast.error(error.message);
    toast.success("Cronômetro iniciado para o candidato.");
  }

  async function finishStation() {
    if (!room) return;
    await supabase.from("training_rooms")
      .update({ status: "finished", finished_at: new Date().toISOString() })
      .eq("id", room.id);
    setFinished(true);
    setShowPEP(true);
    toast.success("Estação finalizada. Agora preencha o PEP.");
  }

  function copyInviteLink() {
    const link = `${window.location.origin}/app/entrar/${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado.");
  }

  if (!station || !room) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  const delivered = new Set(deliveries.map((d) => d.material_id));
  const materials = station.deliverableMaterials ?? [];
  const p = station.patientProfile;
  const isRunning = room.status === "running" && !finished;
  const isFinished = finished || room.status === "finished";
  const isWaiting = !isRunning && !isFinished;
  const inviteLink = typeof window !== "undefined" ? `${window.location.origin}/app/entrar/${code}` : `/app/entrar/${code}`;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/treinar" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-1 font-medium text-violet-300">
            <Theater className="h-3 w-3" /> Painel do Ator
          </span>
          <span>•</span>
          <span>{station.specialty}</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* LEFT: station content */}
        <div className="space-y-4">
          {/* Title bar like Pense Revalida */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex h-7 items-center rounded-md bg-emerald-500/15 px-2 text-xs font-bold text-emerald-400">PE</span>
              <h1 className="truncate font-display text-lg font-bold text-emerald-300 md:text-xl">
                {room.station_title ?? station.title}
              </h1>
            </div>
            <button
              onClick={copyInviteLink}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:border-mint/40 hover:text-foreground"
              title="Copiar link de convite"
            >
              <span className="truncate max-w-[160px]">{code}</span>
              <Copy className="h-3 w-3" />
            </button>
          </div>

          {/* Content blocks (Pense Revalida-style colored cards) */}
          <PRBlock icon={MessageSquare} title="Cenário de atuação" tone="violet">
            <p className="whitespace-pre-wrap leading-relaxed">{station.clinicalCase}</p>
          </PRBlock>

          <PRBlock icon={ListChecks} title={`Nos ${station.durationMinutes} minutos de duração da estação, você deverá executar as seguintes tarefas`} tone="emerald">
            <p className="whitespace-pre-wrap leading-relaxed">{station.candidateTask}</p>
          </PRBlock>

          <PRBlock icon={Theater} title="Orientações do Ator/Atriz" tone="amber">
            {station.patientScript && (
              <p className="whitespace-pre-wrap leading-relaxed">{station.patientScript}</p>
            )}
            {p && (
              <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {patientFields(p).map(([label, value]) => value && (
                  <div key={label} className="rounded-lg bg-background/50 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
                    <dd className="mt-0.5 text-sm">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {p?.spontaneous && (
              <SubBlock label="O que falar espontaneamente">{p.spontaneous}</SubBlock>
            )}
            {p?.onlyIfAsked && (
              <SubBlock label="Revelar APENAS se perguntado">{p.onlyIfAsked}</SubBlock>
            )}
            {p?.doNotReveal && (
              <SubBlock label="Nunca revelar" tone="rose">{p.doNotReveal}</SubBlock>
            )}
            {(p?.emotionalTone || p?.actingTips) && (
              <SubBlock label="Tom emocional e atuação">
                {p?.emotionalTone && <p><span className="font-medium">Tom:</span> {p.emotionalTone}</p>}
                {p?.actingTips && <p className="mt-1"><span className="font-medium">Dicas:</span> {p.actingTips}</p>}
              </SubBlock>
            )}
          </PRBlock>

          <PRBlock
            icon={Inbox}
            title="Materiais para entregar ao candidato"
            tone="sky"
            right={<Badge variant="outline">{deliveries.length}/{materials.length}</Badge>}
          >
            {materials.length === 0 ? (
              <p className="text-sm text-muted-foreground">Esta estação não possui materiais cadastrados.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {materials.map((m) => {
                  const isDelivered = delivered.has(m.id);
                  return (
                    <div key={m.id} className={cn(
                      "rounded-xl border p-3 transition-all",
                      isDelivered ? "border-mint/50 bg-mint/5" : "border-border bg-background/40 hover:border-mint/40",
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-semibold">
                            <FileText className="h-4 w-4 text-mint" /> {m.name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">{m.type}</div>
                          {m.description && <div className="mt-2 text-xs text-muted-foreground">{m.description}</div>}
                        </div>
                        {m.autoDeliver && <Badge variant="outline" className="shrink-0 text-[10px]">Auto</Badge>}
                      </div>
                      <Button
                        size="sm"
                        variant={isDelivered ? "outline" : "hero"}
                        className="mt-3 w-full"
                        disabled={isDelivered || !isRunning}
                        onClick={() => deliver(m.id)}
                      >
                        {isDelivered ? <><PackageCheck className="mr-1 h-4 w-4" /> Entregue</> : <><Send className="mr-1 h-4 w-4" /> Entregar</>}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </PRBlock>
        </div>

        {/* RIGHT: sticky control panel (Pense Revalida-style) */}
        <aside className="lg:sticky lg:top-20 lg:self-start space-y-3">
          {/* Timer */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className={cn(
              "rounded-xl px-5 py-6 text-center transition-colors",
              isRunning ? "bg-emerald-500/15" : isFinished ? "bg-rose-500/15" : "bg-violet-500/20",
            )}>
              <div className="font-display text-5xl font-bold tabular-nums text-white">
                {mm}:{ss}
              </div>
            </div>

            {isWaiting && (
              <Button
                variant="hero"
                className="mt-3 w-full"
                onClick={startStation}
                disabled={starting || !candidateId}
              >
                <Play className="mr-1 h-4 w-4" />
                {candidateId ? "Iniciar cronômetro" : "Aguardando candidato..."}
              </Button>
            )}
            {isRunning && (
              <Button variant="outline" className="mt-3 w-full" onClick={finishStation}>
                <Square className="mr-1 h-4 w-4" /> Encerrar estação
              </Button>
            )}
            {isFinished && (
              <Button variant="hero" className="mt-3 w-full" onClick={() => setShowPEP(true)}>
                <ClipboardCheck className="mr-1 h-4 w-4" /> Preencher PEP
              </Button>
            )}
          </div>

          {/* Resultado */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Resultado
            </div>
            <div className="mt-2 rounded-xl bg-background/60 px-4 py-3 text-center">
              <div className="font-display text-xl font-bold tabular-nums text-emerald-300">
                {score.toFixed(2)} / {pct.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Avaliado */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Avaliado
            </div>
            <Select value={evalStatus} onValueChange={(v) => setEvalStatus(v as typeof evalStatus)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="em_andamento">Aguardando...</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="reprovado">Reprovado</SelectItem>
                <SelectItem value="repetir">Pedir repetição</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Participantes */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Participantes
            </div>
            {candidateId ? (
              <div className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">
                <CheckCheck className="h-4 w-4" />
                {candidateName ?? "Candidato"}
                <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                <UserPlus className="h-4 w-4" />
                Aguardando participante.
              </div>
            )}
          </div>

          {/* Link de convite */}
          <div className="rounded-2xl border border-dashed border-border bg-card p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Link do candidato
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex flex-1 items-center gap-1.5 truncate rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[10px]">
                <Link2 className="h-3 w-3 shrink-0 text-mint" />
                <span className="truncate">{inviteLink}</span>
              </div>
              <Button variant="outline" size="sm" className="h-7 px-2" onClick={copyInviteLink}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* PEP — modal/overlay aberto somente após encerramento */}
      {showPEP && isFinished && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-elegant">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                  PEP — Padrão Esperado de Procedimento
                </div>
                <h2 className="mt-1 font-display text-2xl font-bold">Avaliação do candidato</h2>
              </div>
              <button
                onClick={() => setShowPEP(false)}
                className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {station.checklist.map((it) => (
                <div key={it.id} className={cn("rounded-xl border p-3", checks[it.id] ? "border-mint/50 bg-mint/5" : "border-border bg-background/30")}>
                  <div className="flex items-start gap-3">
                    <Checkbox checked={!!checks[it.id]} onCheckedChange={(v) => setChecks((c) => ({ ...c, [it.id]: v === true }))} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm">{it.description}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{it.category}</Badge>
                        <span>{it.points} pts</span>
                      </div>
                    </div>
                  </div>
                  <Textarea
                    value={comments[it.id] ?? ""}
                    onChange={(e) => setComments((c) => ({ ...c, [it.id]: e.target.value }))}
                    placeholder="Comentário (opcional)"
                    rows={2}
                    className="mt-2"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-border bg-background/40 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Comentário final ao candidato
              </div>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                placeholder="Pontos fortes, pontos a melhorar..."
                className="mt-2"
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Nota parcial:</span>{" "}
                <span className="font-bold text-emerald-300">{score.toFixed(2)} / {pct.toFixed(0)}%</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => save(false)} disabled={saving}>Salvar rascunho</Button>
                <Button variant="hero" onClick={() => save(true)} disabled={saving || evalStatus === "em_andamento"}>
                  <Send className="mr-1 h-4 w-4" /> Enviar correção
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PRBlock({
  icon: Icon, title, tone, right, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone: "violet" | "emerald" | "amber" | "sky";
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const tones = {
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/20",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/20",
    sky: "bg-sky-500/15 text-sky-300 border-sky-500/20",
  };
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className={cn("flex items-center justify-between gap-2 border-b px-4 py-2.5 text-sm font-medium", tones[tone])}>
        <span className="inline-flex items-center gap-2">
          <Icon className="h-4 w-4" /> {title}
        </span>
        {right}
      </header>
      <div className="p-5 text-sm">{children}</div>
    </section>
  );
}

function SubBlock({ label, tone, children }: { label: string; tone?: "rose"; children: React.ReactNode }) {
  return (
    <div className={cn(
      "mt-3 rounded-lg border bg-background/40 px-3 py-2",
      tone === "rose" ? "border-rose-500/30" : "border-border",
    )}>
      <div className={cn("text-[10px] font-semibold uppercase tracking-wider", tone === "rose" ? "text-rose-400" : "text-muted-foreground")}>{label}</div>
      <div className={cn("mt-1 whitespace-pre-wrap text-sm", tone === "rose" && "text-rose-300")}>{children}</div>
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
  ];
}
