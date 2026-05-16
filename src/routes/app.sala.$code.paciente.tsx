import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

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
  Square, Check, Share2, Mail, MessageCircle, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";

export const Route = createFileRoute("/app/sala/$code/paciente")({
  component: ActorView,
  head: () => ({ meta: [{ title: "Estação — Ator/Avaliador" }] }),
});

type Room = { id: string; code: string; station_id: string; station_title: string; status: string; started_at: string | null; duration_minutes: number | null; evaluated_candidate_id: string | null };
type Delivery = { id: string; material_id: string; material_name: string };
type Candidate = { id: string; name: string };

// Migrate legacy checks (boolean) to new shape (number = chosen level points).
// `true` → full points, `false`/missing → unscored.
function migrateChecks(raw: unknown, checklist: { id: string; points: number }[]): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  const map = new Map(checklist.map((i) => [i.id, i.points]));
  for (const [id, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === "number") out[id] = val;
    else if (val === true) out[id] = map.get(id) ?? 0;
  }
  return out;
}

function ActorView() {
  const { code } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [station, setStation] = useState<LoadedStation | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [checks, setChecks] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [evalStatus, setEvalStatus] = useState<"em_andamento" | "aprovado" | "reprovado" | "repetir">("em_andamento");
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Timer state (synced with room.started_at)
  const [remaining, setRemaining] = useState(0);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refreshCandidates(roomId: string): Promise<Candidate[]> {
    const { data: parts } = await supabase.from("training_room_participants")
      .select("user_id, role").eq("room_id", roomId);
    const candUsers = (parts ?? []).filter((p: { role: string }) => p.role === "candidato");
    if (candUsers.length === 0) {
      setCandidates([]);
      return [];
    }
    const ids = candUsers.map((c: { user_id: string }) => c.user_id);
    const { data: profs } = await supabase.from("profiles")
      .select("id, full_name").in("id", ids);
    const map = new Map((profs ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]));
    const list: Candidate[] = ids.map((id: string) => ({ id, name: map.get(id) ?? "Candidato" }));
    setCandidates(list);
    return list;
  }

  useEffect(() => {
    (async () => {
      const { data: r } = await supabase.from("training_rooms")
        .select("id, code, station_id, station_title, status, started_at, duration_minutes, evaluated_candidate_id").eq("code", code).maybeSingle();
      if (!r) return;
      setRoom(r as Room);
      const st = await loadStation((r as Room).station_id);
      setStation(st);
      const effMin = (r as Room).duration_minutes ?? st?.durationMinutes ?? 10;
      setRemaining(effMin * 60);

      const list = await refreshCandidates((r as Room).id);
      // Auto-select first candidate as the evaluated if none chosen yet
      if (!(r as Room).evaluated_candidate_id && list.length > 0) {
        await supabase.from("training_rooms").update({ evaluated_candidate_id: list[0].id }).eq("id", (r as Room).id);
        setRoom((prev) => prev ? { ...prev, evaluated_candidate_id: list[0].id } : prev);
      }

      const { data: dels } = await supabase.from("room_material_deliveries")
        .select("id, material_id, material_name").eq("room_id", (r as Room).id);
      setDeliveries((dels ?? []) as Delivery[]);

      if (user && (r as Room).evaluated_candidate_id) {
        const { data: ev } = await supabase.from("room_evaluations")
          .select("*").eq("room_id", (r as Room).id).eq("evaluator_id", user.id)
          .eq("candidate_id", (r as Room).evaluated_candidate_id!).maybeSingle();
        if (ev) {
          setChecks(migrateChecks(ev.checks, st?.checklist ?? []));
          setComments((ev.item_comments ?? {}) as Record<string, string>);
          setFeedback(ev.final_feedback ?? "");
          setEvalStatus(ev.status as typeof evalStatus);
        }
      }
    })();
  }, [code, user?.id]);

  // When the evaluated candidate changes, reload draft for that candidate (or reset)
  useEffect(() => {
    if (!room || !user || !room.evaluated_candidate_id) {
      setChecks({}); setComments({}); setFeedback(""); setEvalStatus("em_andamento");
      return;
    }
    (async () => {
      const { data: ev } = await supabase.from("room_evaluations")
        .select("*").eq("room_id", room.id).eq("evaluator_id", user.id)
        .eq("candidate_id", room.evaluated_candidate_id!).maybeSingle();
      if (ev) {
        setChecks(migrateChecks(ev.checks, station?.checklist ?? []));
        setComments((ev.item_comments ?? {}) as Record<string, string>);
        setFeedback(ev.final_feedback ?? "");
        setEvalStatus(ev.status as typeof evalStatus);
      } else {
        setChecks({}); setComments({}); setFeedback(""); setEvalStatus("em_andamento");
      }
    })();
  }, [room?.evaluated_candidate_id, room?.id, user?.id]);

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
          const { data: prof } = await supabase.from("profiles")
            .select("full_name").eq("id", row.user_id).maybeSingle();
          const name = prof?.full_name ?? "Candidato";
          setCandidates((prev) => prev.some((c) => c.id === row.user_id) ? prev : [...prev, { id: row.user_id, name }]);
          toast.success(`${name} entrou na sala`);
          if (!room.evaluated_candidate_id) {
            await supabase.from("training_rooms").update({ evaluated_candidate_id: row.user_id }).eq("id", room.id);
          }
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "training_room_participants", filter: `room_id=eq.${room.id}` }, async () => {
        await refreshCandidates(room.id);
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
      const totalSec = (room.duration_minutes ?? station.durationMinutes) * 60;
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
  }, [room?.status, room?.started_at, room?.duration_minutes, station?.id, finished]);

  // Keep displayed remaining in sync with chosen duration while waiting
  useEffect(() => {
    if (!room || !station) return;
    if (room.status !== "running") {
      const effMin = room.duration_minutes ?? station.durationMinutes;
      setRemaining(effMin * 60);
    }
  }, [room?.duration_minutes, room?.status, station?.id]);

  async function changeDuration(min: number) {
    if (!room) return;
    if (room.status === "running") return toast.error("A estação já está em andamento.");
    const { error } = await supabase.from("training_rooms")
      .update({ duration_minutes: min }).eq("id", room.id);
    if (error) return toast.error(error.message);
    setRoom((prev) => prev ? { ...prev, duration_minutes: min } : prev);
    toast.success(`Tempo da estação: ${min} min`);
  }

  const totals = useMemo(() => {
    if (!station) return { total: 0, earned: 0, scored: 0, count: 0 };
    const total = station.checklist.reduce((s, i) => s + i.points, 0);
    let earned = 0;
    let scored = 0;
    for (const i of station.checklist) {
      const v = checks[i.id];
      if (typeof v === "number") { earned += v; scored += 1; }
    }
    return { total, earned, scored, count: station.checklist.length };
  }, [station, checks]);
  const allScored = totals.scored === totals.count && totals.count > 0;
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
    if (!room.evaluated_candidate_id) return toast.error("Selecione um candidato avaliado antes de salvar.");
    setSaving(true);
    const payload = {
      room_id: room.id,
      evaluator_id: user.id,
      candidate_id: room.evaluated_candidate_id,
      station_id: room.station_id,
      checks,
      item_comments: comments,
      final_feedback: feedback,
      final_score: Number(score.toFixed(2)),
      status: submit ? evalStatus : "em_andamento",
      submitted_at: submit ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from("room_evaluations")
      .upsert(payload, { onConflict: "room_id,evaluator_id,candidate_id" });
    setSaving(false);
    if (error) return toast.error(error.message);

    if (submit) {
      // Atualiza a tentativa do candidato avaliado com a nota do PEP (vai para o histórico dele)
      const totalPts = totals.total;
      const earnedPts = totals.earned;
      const { data: lastAttempt } = await supabase.from("attempts")
        .select("id")
        .eq("user_id", room.evaluated_candidate_id)
        .eq("station_id", room.station_id)
        .order("created_at", { ascending: false })
        .limit(1).maybeSingle();
      if (lastAttempt?.id) {
        await supabase.from("attempts").update({
          score: Number(score.toFixed(2)),
          earned: Math.round(earnedPts),
          total_points: totalPts,
          professor_score: Number(score.toFixed(2)),
          professor_feedback: feedback || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          status: "corrigida",
        }).eq("id", lastAttempt.id);
      }
    }

    toast.success(submit ? "Correção enviada" : "Rascunho salvo");
    if (submit) nav({ to: "/app/sala/$code", params: { code } });
  }

  async function setEvaluatedCandidate(id: string) {
    if (!room) return;
    if (room.status === "running") return toast.error("Encerre a estação atual antes de trocar o avaliado.");
    const { error } = await supabase.from("training_rooms")
      .update({ evaluated_candidate_id: id }).eq("id", room.id);
    if (error) return toast.error(error.message);
    setRoom((prev) => prev ? { ...prev, evaluated_candidate_id: id } : prev);
    const name = candidates.find((c) => c.id === id)?.name ?? "Candidato";
    toast.success(`Avaliado da vez: ${name}`);
  }

  async function startStation() {
    if (!room) return;
    if (!room.evaluated_candidate_id) return toast.error("Selecione o candidato que será avaliado.");
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
    toast.success("Estação finalizada. Preencha o PEP abaixo.");
  }

  async function copyInviteLink() {
    const link = inviteLink;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente.");
    }
  }

  function shareWhatsApp() {
    const text = `Olá! Vamos treinar uma estação no Estação Revalida 🩺\nEntre pelo link: ${inviteLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  function shareEmail() {
    const subject = "Convite para treinar estação — Estação Revalida";
    const body = `Olá!\n\nVocê foi convidado(a) para treinar uma estação clínica.\nEntre pelo link abaixo:\n\n${inviteLink}\n\nCódigo da sala: ${code}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function shareNative() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "Estação Revalida",
          text: "Vamos treinar uma estação? Entre na sala:",
          url: inviteLink,
        });
        return;
      } catch { /* user cancelled */ }
    }
    copyInviteLink();
  }

  if (!station || !room) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  const delivered = new Set(deliveries.map((d) => d.material_id));
  const materials = station.deliverableMaterials ?? [];
  const p = station.patientProfile;
  const isRunning = room.status === "running" && !finished;
  const isFinished = finished || room.status === "finished";
  const isWaiting = !isRunning && !isFinished;
  const inviteHost = "estacaorevalida.lovable.app";
  const inviteLink = `https://${inviteHost}/e/${code}`;
  const inviteLinkDisplay = `${inviteHost}/e/${code}`;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/treinar" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">
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
              {(() => {
                const meta = getSpecialtyMeta(station.specialty);
                return (
                  <span className={cn("inline-flex h-7 items-center rounded-md px-2 text-xs font-bold", meta.badge)}>
                    {meta.code}
                  </span>
                );
              })()}
              <h1 className="truncate font-display text-lg font-bold text-foreground md:text-xl">
                {room.station_title ?? station.title}
              </h1>
            </div>
            <button
              onClick={copyInviteLink}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:border-mint/40 hover:text-foreground"
              title="Copiar link de convite"
            >
              <span className="truncate max-w-[160px]">{code}</span>
              {copied ? <Check className="h-3 w-3 text-mint" /> : <Copy className="h-3 w-3" />}
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
            right={<Badge variant="outline" className="text-white border-white/30">{deliveries.length}/{materials.length}</Badge>}
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

          {/* CHECKLIST (PEP) inline — só editável após encerrar */}
          <PRBlock
            icon={ClipboardCheck}
            title="CHECKLIST ( PEP )"
            right={<Badge variant="outline" className="text-white border-white/30">{totals.scored}/{totals.count}</Badge>}
          >
            {!isFinished && (
              <div className="mb-4 rounded-lg border border-mint/30 bg-mint/5 px-3 py-2 text-xs text-mint">
                <Lock className="mr-1 inline h-3.5 w-3.5" />
                Disponível para preenchimento após encerrar a estação.
              </div>
            )}

            <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-border pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Item</span>
              <span className="text-right">Avaliação</span>
            </div>

            <ol className="divide-y divide-border">
              {station.checklist.map((it, idx) => {
                const levels = it.levels ?? [{ label: "Inadequado", points: 0 }, { label: "Adequado", points: it.points }];
                const current = checks[it.id];
                // Parse sub-items: split on ";" or by "(N)" markers so the ator can highlight each one
                const parts = parseSubItems(it.description);
                return (
                  <li key={it.id} className="grid grid-cols-[1fr_auto] gap-x-4 py-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {idx + 1}. {parts.lead}
                      </div>
                      {parts.subs.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {parts.subs.map((sub, si) => {
                            const key = `${it.id}::${si}`;
                            const active = !!highlights[key];
                            return (
                              <li key={key}>
                                <button
                                  type="button"
                                  onClick={() => setHighlights((h) => ({ ...h, [key]: !h[key] }))}
                                  className={cn(
                                    "w-full rounded-md px-2 py-1 text-left text-sm transition-colors",
                                    active
                                      ? "bg-amber-500/30 text-amber-100 ring-1 ring-amber-500/50"
                                      : "text-foreground/80 hover:bg-white/5",
                                  )}
                                >
                                  {sub}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        {levels.map((lv) => (
                          <div key={lv.label}>
                            <span className="font-medium text-foreground">{lv.label}:</span>{" "}
                            <span>{lv.points} pt{lv.points === 1 ? "" : "s"}</span>
                          </div>
                        ))}
                      </div>
                      {it.helperText && (
                        <div className="mt-2 rounded-md border border-border bg-background/40 px-3 py-1.5 text-[11px] text-muted-foreground">
                          {it.helperText}
                        </div>
                      )}
                      <Textarea
                        value={comments[it.id] ?? ""}
                        onChange={(e) => setComments((c) => ({ ...c, [it.id]: e.target.value }))}
                        placeholder="Comentário (opcional)"
                        rows={2}
                        className="mt-3"
                        disabled={!isFinished}
                      />
                    </div>
                    <div className="flex flex-col items-end gap-1.5 tabular-nums">
                      {levels.map((lv, li) => {
                        const selected = current === lv.points;
                        const tone = levelTone(li, levels.length);
                        return (
                          <button
                            key={lv.label}
                            type="button"
                            disabled={!isFinished}
                            onClick={() =>
                              setChecks((c) => ({ ...c, [it.id]: lv.points }))
                            }
                            className={cn(
                              "min-w-[3rem] rounded-md border px-2.5 py-1 text-xs font-bold transition-colors",
                              selected ? tone.active : tone.idle,
                              !isFinished && "cursor-not-allowed opacity-50",
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

            {/* Final feedback + save */}
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
                disabled={!isFinished}
              />
            </div>

            {isFinished && !allScored && (
              <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                <span className="font-bold">Atenção:</span> este checklist ainda não foi salvo. Só será salvo uma vez que todos os itens do PEP forem selecionados.
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Nota parcial:</span>{" "}
                <span className="font-bold text-mint">{score.toFixed(2)} / {pct.toFixed(0)}%</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={evalStatus} onValueChange={(v) => setEvalStatus(v as typeof evalStatus)} disabled={!isFinished}>
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="reprovado">Reprovado</SelectItem>
                    <SelectItem value="repetir">Pedir repetição</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => save(false)} disabled={saving || !isFinished}>
                  Salvar rascunho
                </Button>
                <Button
                  variant="hero"
                  onClick={() => save(true)}
                  disabled={saving || !isFinished || !allScored || evalStatus === "em_andamento"}
                >
                  <Send className="mr-1 h-4 w-4" /> Enviar correção
                </Button>
              </div>
            </div>

            {isFinished && !allScored && (
              <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <span className="font-semibold">Atenção:</span> este checklist ainda não foi salvo. Só será salvo uma vez que todos os itens do PEP forem selecionados ({totals.scored}/{totals.count}).
              </div>
            )}
          </PRBlock>
        </div>

        {/* RIGHT: sticky control panel (Pense Revalida-style) */}
        <aside className="lg:sticky lg:top-20 lg:self-start space-y-3">
          {/* Timer */}
          <div className="rounded-2xl border border-border bg-gradient-hero p-4 text-white shadow-elegant">
            <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-white/70">
              {isRunning ? "Em andamento" : isFinished ? "Encerrada" : "Aguardando início"}
            </div>
            <div className={cn(
              "mt-2 rounded-xl px-5 py-6 text-center transition-colors",
              isRunning ? "bg-mint/15" : "bg-white/5",
            )}>
              <div className="font-display text-5xl font-bold tabular-nums text-white">
                {mm}:{ss}
              </div>
              {isWaiting && (
                <div className="mt-3">
                  <Select
                    value={String(room.duration_minutes ?? station.durationMinutes)}
                    onValueChange={(v) => changeDuration(Number(v))}
                  >
                    <SelectTrigger className="mx-auto h-8 w-auto gap-1 border-white/20 bg-white/10 px-3 text-xs text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 6, 7, 8, 9, 10].map((m) => (
                        <SelectItem key={m} value={String(m)}>{m} minutos</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-1 text-[10px] text-white/60">Tempo da estação</div>
                </div>
              )}
            </div>

            {isWaiting && (
              <Button
                variant="hero"
                className="mt-3 w-full"
                onClick={startStation}
                disabled={starting || !room.evaluated_candidate_id}
              >
                <Play className="mr-1 h-4 w-4" />
                {room.evaluated_candidate_id ? "Iniciar cronômetro" : "Aguardando candidato..."}
              </Button>
            )}
            {isRunning && (
              <Button variant="outline" className="mt-3 w-full" onClick={finishStation}>
                <Square className="mr-1 h-4 w-4" /> Encerrar estação
              </Button>
            )}
            {isFinished && (
              <div className="mt-3 rounded-lg bg-mint/10 px-3 py-2 text-center text-xs text-mint">
                Estação encerrada — preencha o PEP abaixo.
              </div>
            )}
          </div>

          {/* Resultado */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Resultado
            </div>
            <div className="mt-2 rounded-xl bg-background/60 px-4 py-3 text-center">
              <div className="font-display text-xl font-bold tabular-nums text-mint">
                {score.toFixed(2)} / {pct.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Status da avaliação */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Status da avaliação
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

          {/* Participantes + escolha do avaliado da vez */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Participantes ({candidates.length})
              </div>
              <span className="text-[10px] text-muted-foreground">avaliado da vez</span>
            </div>

            {candidates.length === 0 ? (
              <div className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <UserPlus className="h-4 w-4" />
                Aguardando participantes.
              </div>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {candidates.map((c) => {
                  const isEvaluated = c.id === room.evaluated_candidate_id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setEvaluatedCandidate(c.id)}
                        disabled={isRunning && !isEvaluated}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                          isEvaluated
                            ? "border-mint/50 bg-mint/10 text-foreground"
                            : "border-border bg-background/40 text-foreground hover:border-mint/40",
                          isRunning && !isEvaluated && "opacity-50 cursor-not-allowed",
                        )}
                        title={isRunning && !isEvaluated ? "Encerre a estação atual para trocar o avaliado" : "Marcar como avaliado da vez"}
                      >
                        <span className={cn(
                          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                          isEvaluated ? "border-mint bg-mint/20" : "border-muted-foreground/40",
                        )}>
                          {isEvaluated && <CheckCheck className="h-3 w-3 text-mint" />}
                        </span>
                        <span className="flex-1 truncate font-medium">{c.name}</span>
                        {isEvaluated && (
                          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-mint" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {candidates.length > 1 && (
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                Vários alunos podem entrar pela mesma sala. Apenas o avaliado da vez é corrigido — os demais assistem.
              </p>
            )}
          </div>

          {/* Link de convite */}
          <div className="rounded-2xl border border-dashed border-mint/30 bg-gradient-to-br from-mint/5 to-transparent p-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-mint">
                Convite do candidato
              </div>
              <span className="rounded-full bg-mint/15 px-2 py-0.5 font-mono text-[10px] font-bold text-mint">
                {code}
              </span>
            </div>

            <button
              onClick={copyInviteLink}
              className="mt-2 flex w-full items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-left transition hover:border-mint/50"
              title="Clique para copiar"
            >
              <Link2 className="h-3.5 w-3.5 shrink-0 text-mint" />
              <span className="flex-1 truncate font-mono text-[11px] text-foreground">
                {inviteLinkDisplay}
              </span>
              {copied ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-mint">
                  <Check className="h-3 w-3" /> Copiado
                </span>
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>

            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 px-2 text-[11px]"
                onClick={shareWhatsApp}
                title="Enviar pelo WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5 text-mint" />
                WhatsApp
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 px-2 text-[11px]"
                onClick={shareEmail}
                title="Enviar por e-mail"
              >
                <Mail className="h-3.5 w-3.5 text-mint" />
                E-mail
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1 px-2 text-[11px]"
                onClick={shareNative}
                title="Compartilhar / Reenviar"
              >
                <Share2 className="h-3.5 w-3.5 text-mint" />
                Reenviar
              </Button>
            </div>

            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              O candidato entra direto pelo link. Mesmo se já enviou, pode reenviar a qualquer momento.
            </p>
          </div>
        </aside>
      </div>

    </div>
  );
}

function PRBlock({
  icon: Icon, title, right, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  // tone kept for API compat but ignored — we keep the page to 2 colors (neutral + mint)
  tone?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <header className="flex items-center justify-between gap-3 bg-gradient-hero px-4 py-3 text-sm font-medium text-white shadow-elegant">
        <span className="inline-flex items-center gap-2">
          <Icon className="h-4 w-4 text-mint" /> {title}
        </span>
        {right}
      </header>
      <div className="p-5 text-sm">{children}</div>
    </section>
  );
}

function SubBlock({ label, children }: { label: string; tone?: "rose"; children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border border-border bg-background/40 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm">{children}</div>
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
