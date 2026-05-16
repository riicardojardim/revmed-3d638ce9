import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Square, Check, Share2, Mail, MessageCircle, Lock, ChevronDown, BookOpen, BarChart3, MessageSquareWarning,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import ecgRitmoSinusal from "@/assets/ecg-ritmo-sinusal.jpg";
import aranhaArmadeira from "@/assets/aranha-armadeira.jpeg";

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

function parseSubItems(description: string): { lead: string; subs: string[] } {
  // Detect "(1) ... (2) ..." numbered sub-items inside the description
  const numbered = description.match(/\(\d+\)\s*[^()]+/g);
  if (numbered && numbered.length >= 2) {
    const firstIdx = description.indexOf(numbered[0]);
    const lead = description.slice(0, firstIdx).trim().replace(/[:;]\s*$/, "") || description.split(/[(:]/)[0].trim();
    return { lead, subs: numbered.map((s) => s.trim().replace(/[;.]$/, "")) };
  }
  // Detect parenthesized comma-list e.g. "Caracteriza dor (início, qualidade, irradiação)"
  const paren = description.match(/^(.*?)\(([^()]+,[^()]+)\)\s*$/);
  if (paren) {
    const subs = paren[2].split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    if (subs.length >= 2) return { lead: paren[1].trim(), subs };
  }
  // Fallback: split on ";" if multiple clauses
  const parts = description.split(";").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { lead: parts[0], subs: parts.slice(1) };
  return { lead: description, subs: [] };
}

function levelTone(index: number, total: number): { idle: string; active: string } {
  // Idle = apenas o número, sem caixa. Selecionado = pill colorido (vermelho/âmbar/verde).
  const base = "text-muted-foreground hover:text-foreground";
  if (index === 0) {
    return { idle: base, active: "bg-rose-500/85 text-white shadow-sm ring-1 ring-rose-400/60" };
  }
  if (index === total - 1) {
    return { idle: base, active: "bg-emerald-500/85 text-white shadow-sm ring-1 ring-emerald-400/60" };
  }
  return { idle: base, active: "bg-amber-500/85 text-white shadow-sm ring-1 ring-amber-400/60" };
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
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [highlights, setHighlights] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState("");
  const [evalStatus, setEvalStatus] = useState<"em_andamento" | "aprovado" | "reprovado" | "repetir">("em_andamento");
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewMaterialId, setPreviewMaterialId] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<{ src: string; alt: string } | null>(null);
  const [struckWords, setStruckWords] = useState<Set<string>>(new Set());
  const toggleStruck = (id: string) => setStruckWords((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  

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

      try {
        localStorage.setItem("ator:activeRoom", JSON.stringify({ code, title: (r as Room).station_title ?? st?.title ?? "Treinamento" }));
        window.dispatchEvent(new Event("ator:activeRoom"));
      } catch {}

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
    return () => {
      try {
        localStorage.removeItem("ator:activeRoom");
        window.dispatchEvent(new Event("ator:activeRoom"));
      } catch {}
    };
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

  const totals = (() => {
    if (!station) return { total: 0, earned: 0, scored: 0, count: 0 };
    const total = station.checklist.reduce((s, i) => {
      const maxFromLevels = i.levels && i.levels.length > 0
        ? Math.max(...i.levels.map((l) => l.points))
        : 0;
      return s + Math.max(i.points || 0, maxFromLevels);
    }, 0);
    let earned = 0;
    let scored = 0;
    for (const i of station.checklist) {
      const v = checks[i.id];
      if (typeof v === "number") { earned += v; scored += 1; }
    }
    return { total, earned, scored, count: station.checklist.length };
  })();
  const allScored = totals.scored === totals.count && totals.count > 0;
  const score = totals.total > 0 ? (totals.earned / totals.total) * 10 : 0;
  const pct = totals.total > 0 ? (totals.earned / totals.total) * 100 : 0;

  // Auto-preencher status: >=61.17% aprovado, <61.17% reprovado (apenas quando o checklist está completo)
  useEffect(() => {
    if (!allScored) return;
    const auto = pct >= 61.17 ? "aprovado" : "reprovado";
    setEvalStatus((prev) => (prev === auto ? prev : auto));
  }, [allScored, pct]);



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
    if (submit) {
      try {
        localStorage.removeItem("ator:activeRoom");
        window.dispatchEvent(new Event("ator:activeRoom"));
      } catch {}
      nav({ to: "/app/sala/$code", params: { code } });
    }
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
    try {
      localStorage.setItem("ator:activeRoom", JSON.stringify({ code, title: room.station_title ?? station?.title ?? "Treinamento" }));
      window.dispatchEvent(new Event("ator:activeRoom"));
    } catch {}
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
  const inviteHost = "estacaorevalida.com.br";
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
            <ScriptText text={station.clinicalCase} />
          </PRBlock>

          {station.caseDescription && (
            <PRBlock icon={MessageSquare} title="Descrição do caso" tone="violet">
              <ScriptText text={station.caseDescription} />
            </PRBlock>
          )}

          <PRBlock icon={ListChecks} title={`Nos ${room.duration_minutes ?? station.durationMinutes} minutos de duração da estação, você deverá executar as seguintes tarefas`} tone="emerald">
            <ScriptText text={station.candidateTask} />
          </PRBlock>

          <PRBlock icon={Theater} title="Orientações do Ator/Atriz" tone="amber">
            <p className="mb-3 text-[11px] text-muted-foreground italic">Dica: clique nas partes em <strong className="font-semibold">negrito</strong> para riscá-las. Selecione qualquer texto para marcá-lo; selecione de novo a mesma área para desmarcar.</p>
            <Highlightable>
              {station.patientScript && (
                <ScriptText text={station.patientScript} strikeable prefix="ps" struck={struckWords} toggle={toggleStruck} />
              )}
              {p && (
                <div className="mt-4">
                  <ScriptText text={formatPatientProfile(p)} strikeable prefix="pp" struck={struckWords} toggle={toggleStruck} />
                </div>
              )}
              {p?.spontaneous && (
                <SubBlock label="O que falar espontaneamente">
                  <ScriptText text={p.spontaneous} strikeable prefix="sp" struck={struckWords} toggle={toggleStruck} />
                </SubBlock>
              )}
              {p?.doNotReveal && (
                <SubBlock label="Nunca revelar" tone="rose">
                  <ScriptText text={p.doNotReveal} strikeable prefix="dnr" struck={struckWords} toggle={toggleStruck} />
                </SubBlock>
              )}
              {(p?.emotionalTone || p?.actingTips) && (
                <SubBlock label="Tom emocional e atuação">
                  {p?.emotionalTone && <p><span className="font-medium">Tom:</span> {p.emotionalTone}</p>}
                  {p?.actingTips && <p className="mt-1"><span className="font-medium">Dicas:</span> {p.actingTips}</p>}
                </SubBlock>
              )}
            </Highlightable>
          </PRBlock>



          <PRBlock
            icon={Inbox}
            title="Materiais para entregar ao candidato"
            right={<Badge variant="outline" className="text-white border-white/30">{deliveries.length}/{materials.length}</Badge>}
          >
            {materials.length === 0 ? (
              <p className="text-sm text-muted-foreground">Esta estação não possui materiais cadastrados.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {materials.map((m, idx) => {
                  const isDelivered = delivered.has(m.id);
                  const isOpen = previewMaterialId === m.id;
                    const isRhythm = /ritmo/i.test(m.name);
                    const isSpider = /aranha/i.test(m.name);
                  return (
                    <div key={m.id} className={cn(
                      "rounded-xl border p-3 transition-all flex flex-col h-full",
                      isDelivered ? "border-mint/50 bg-mint/5" : "border-border bg-background/40 hover:border-mint/40",
                    )}>
                      <button
                        type="button"
                        onClick={() => setPreviewMaterialId(isOpen ? null : m.id)}
                        className="flex w-full items-start justify-between gap-2 text-left group"
                        title="Clique para expandir / recolher"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-semibold group-hover:text-mint">
                            <FileText className="h-4 w-4 text-mint" /> Impresso {idx + 1} <span className="text-muted-foreground font-normal">{(() => { const clean = (m.name || "").replace(/^\s*impresso\s*\d+\s*[:\-–—()]*\s*/i, "").replace(/^\(\s*|\s*\)$/g, "").trim(); if (!clean) return ""; const sentence = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase(); return `( ${sentence} )`; })()}</span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">{isOpen ? "clique para recolher" : "clique para ver o conteúdo"}</div>
                          {m.description && <div className="mt-2 text-xs text-muted-foreground">{m.description}</div>}
                        </div>
                        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform mt-1", isOpen && "rotate-180")} />
                      </button>
                      {isOpen && (
                        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                          {isRhythm && (
                            <button
                              type="button"
                              onClick={() => setZoomImage({ src: ecgRitmoSinusal, alt: "Traçado de ECG do paciente" })}
                              className="mb-3 block w-full group relative"
                              title="Clique para ampliar"
                            >
                              <img
                                src={ecgRitmoSinusal}
                                alt="Traçado de ECG do paciente"
                                className="block w-full h-auto rounded-md border border-border transition-opacity group-hover:opacity-90"
                              />
                              <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">🔍 ampliar</span>
                            </button>
                          )}
                          {isSpider && (
                            <button
                              type="button"
                              onClick={() => setZoomImage({ src: aranhaArmadeira, alt: "Aranha responsável pelo acidente" })}
                              className="mb-3 block w-full group relative"
                              title="Clique para ampliar"
                            >
                              <img
                                src={aranhaArmadeira}
                                alt="Aranha responsável pelo acidente"
                                className="block w-full h-auto rounded-md border border-border transition-opacity group-hover:opacity-90"
                              />
                              <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">🔍 ampliar</span>
                            </button>
                          )}
                          {m.content
                            ? <ScriptText text={m.content} />
                            : (!isRhythm && !isSpider && <span className="italic text-muted-foreground">Sem conteúdo cadastrado.</span>)}
                        </div>
                      )}
                      <div className="mt-auto pt-3">
                        <Button
                          size="sm"
                          variant={isDelivered ? "outline" : "hero"}
                          className="w-full"
                          disabled={isDelivered || !isRunning}
                          onClick={() => deliver(m.id)}
                        >
                          {isDelivered ? <><PackageCheck className="mr-1 h-4 w-4" /> Entregue</> : <><Send className="mr-1 h-4 w-4" /> Entregar</>}
                        </Button>
                      </div>
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
                Você pode pontuar durante a estação, mas 1 item será liberado apenas após encerrar.
              </div>
            )}


            <ol className="space-y-3">
              {station.checklist.map((it, idx) => {
                const levels = it.levels ?? [{ label: "Inadequado", points: 0 }, { label: "Adequado", points: it.points }];
                const current = checks[it.id];
                const parts = parseSubItems(it.description);
                const isBlocked =
                  !isFinished &&
                  typeof current !== "number" &&
                  totals.scored >= totals.count - 1;
                return (
                  <li
                    key={it.id}
                    onClick={() => {
                      if (isBlocked) toast.error("Você tem que terminar o checklist primeiro..");
                    }}
                    className={cn(
                      "grid grid-cols-[1fr_auto] gap-x-4 rounded-xl border px-4 py-3 transition-colors",
                      typeof current === "number"
                        ? "border-mint/30 bg-mint/5"
                        : "border-border bg-background/30",
                      isBlocked && "cursor-not-allowed",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {idx + 1}. {parts.lead.replace(/^\s*\d+\.\s*/, "")}
                      </div>
                      {parts.subs.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
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
                                      ? "bg-mint/40 text-night ring-1 ring-mint/60"
                                      : "text-foreground/85 hover:bg-white/5",
                                  )}
                                >
                                  {sub}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                        {levels.map((lv) => {
                          const m = lv.label.match(/^([^:]+):\s*(.*)$/);
                          const head = m ? m[1] : lv.label;
                          const rest = m ? m[2] : "";
                          return (
                            <div key={lv.label}>
                              <span className="font-bold text-foreground">{head}</span>
                              {(rest || lv.description) && <span>: </span>}
                              {rest && <span>{rest}</span>}
                              {lv.description && <span>{rest ? " " : ""}{lv.description}</span>}
                            </div>
                          );
                        })}
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
                    <div className="flex flex-col items-center gap-1 tabular-nums">
                      {levels.map((lv, li) => {
                        const selected = current === lv.points;
                        const tone = levelTone(li, levels.length);
                        
                        return (
                          <button
                            key={lv.label}
                            type="button"
                            onClick={() => {
                              if (isBlocked) {
                                toast.error("Você tem que terminar o checklist primeiro..");
                                return;
                              }
                              setChecks((c) => {
                                if (c[it.id] === lv.points) {
                                  const { [it.id]: _, ...rest } = c;
                                  return rest;
                                }
                                return { ...c, [it.id]: lv.points };
                              });
                            }}
                            className={cn(
                              "flex h-7 w-9 items-center justify-center rounded-md text-sm font-bold transition-colors",
                              selected ? tone.active : tone.idle,
                              isBlocked && "cursor-not-allowed opacity-40",
                            )}
                            title={isBlocked ? "Aguarde o término da estação" : lv.label}
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

            {!allScored && (
              <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <span className="font-bold">Atenção:</span> este checklist ainda não foi salvo. Só será salvo uma vez que todos os itens do PEP forem selecionados ({totals.scored}/{totals.count}).
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Nota parcial:</span>{" "}
                <span className="font-bold text-mint">{totals.earned.toFixed(2)}</span>
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
          </PRBlock>

          {/* Análise de resultados — botão expansível (estilo Pense Revalida) */}
          {(station.educationalGoal || station.expectedConduct || station.commonMistakes) && (
            <div>
              <button
                type="button"
                onClick={() => setShowAnalysis((v) => !v)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-gradient-hero px-4 py-3 text-sm font-medium text-white shadow-elegant transition-opacity hover:opacity-90"
              >
                <BarChart3 className="h-4 w-4" />
                Análise de resultados
                <ChevronDown className={cn("h-4 w-4 transition-transform", showAnalysis && "rotate-180")} />
              </button>
              {showAnalysis && (
                <div className="mt-3 space-y-3">
                  {station.educationalGoal && (
                    <SubBlock label="Objetivo educacional">{station.educationalGoal}</SubBlock>
                  )}
                  {station.expectedConduct && (
                    <SubBlock label="Conduta esperada">{station.expectedConduct}</SubBlock>
                  )}
                  {station.commonMistakes && (
                    <SubBlock label="Erros comuns" tone="rose">{station.commonMistakes}</SubBlock>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Referências bibliográficas */}
          {station.references && station.references.length > 0 && (
            <PRBlock icon={BookOpen} title="Referências bibliográficas">
              <ul className="space-y-2">
                {station.references.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-mint underline-offset-2 hover:underline break-all"
                      >
                        {r.label || r.url}
                      </a>
                    ) : (
                      <span className="text-foreground/90">{r.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </PRBlock>
          )}

          {/* Feedback */}
          <PRBlock icon={MessageSquareWarning} title="Feedback | Erro, Dúvida ou Sugestão">
            <p className="text-sm text-muted-foreground">
              Encontrou algum problema ou tem sugestões sobre esta estação? Envie um feedback para a equipe.
            </p>
            <Button
              variant="hero"
              className="mt-3"
              onClick={() => toast.success("Obrigado! Seu feedback foi registrado.")}
            >
              <MessageCircle className="mr-1 h-4 w-4" /> Enviar feedback
            </Button>
          </PRBlock>
        </div>

        {/* RIGHT: control panel (timer, participantes, convite) */}
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
                        {totals.earned.toFixed(2)}
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

                  {/* Participantes */}
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
                    >
                      <Link2 className="h-3.5 w-3.5 shrink-0 text-mint" />
                      <span className="flex-1 truncate font-mono text-[11px] text-foreground">{inviteLinkDisplay}</span>
                      {copied ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-mint">
                          <Check className="h-3 w-3" /> Copiado
                        </span>
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2 text-[11px]" onClick={shareWhatsApp}>
                        <MessageCircle className="h-3.5 w-3.5 text-mint" /> WhatsApp
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2 text-[11px]" onClick={shareEmail}>
                        <Mail className="h-3.5 w-3.5 text-mint" /> E-mail
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-8 gap-1 px-2 text-[11px]" onClick={shareNative}>
                        <Share2 className="h-3.5 w-3.5 text-mint" /> Reenviar
                      </Button>
                    </div>
                  </div>
        </aside>
      </div>


      {zoomImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 cursor-zoom-out animate-in fade-in"
          onClick={() => setZoomImage(null)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setZoomImage(null); }}
            className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 text-white h-10 w-10 flex items-center justify-center text-xl"
            aria-label="Fechar"
          >
            ×
          </button>
          <img
            src={zoomImage.src}
            alt={zoomImage.alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full object-contain rounded-md shadow-2xl cursor-zoom-in"
            style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
            Clique fora ou pressione × para fechar
          </div>
        </div>
      )}
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

/** Marca-texto persistente: selecionar destaca; selecionar de novo na mesma área remove. */
function Highlightable({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ranges, setRanges] = useState<Array<[number, number]>>([]);

  function getOffsetIn(root: HTMLElement, node: Node, offset: number): number {
    let total = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n = walker.nextNode();
    while (n) {
      if (n === node) return total + offset;
      total += (n as Text).length;
      n = walker.nextNode();
    }
    // node not a text node (e.g. element). Fall back: count text up to it.
    if (node.nodeType !== 3) {
      const w2 = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      total = 0;
      let m = w2.nextNode();
      while (m) {
        // stop when text node is after `node` in document order
        const pos = node.compareDocumentPosition(m);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) break;
        total += (m as Text).length;
        m = w2.nextNode();
      }
    }
    return total;
  }

  // Re-apply highlight spans after every render
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // Unwrap existing
    root.querySelectorAll('.user-highlight').forEach((el) => {
      const parent = el.parentNode!;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    });
    root.normalize();
    // Apply each range
    for (const [start, end] of ranges) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const pieces: Array<{ node: Text; s: number; e: number }> = [];
      let pos = 0;
      let n = walker.nextNode() as Text | null;
      while (n) {
        const len = n.length;
        const s = Math.max(start, pos);
        const e = Math.min(end, pos + len);
        if (s < e) pieces.push({ node: n, s: s - pos, e: e - pos });
        pos += len;
        if (pos >= end) break;
        n = walker.nextNode() as Text | null;
      }
      // wrap in reverse so splits don't invalidate refs
      for (let i = pieces.length - 1; i >= 0; i--) {
        const { node, s, e } = pieces[i];
        let target = node;
        if (s > 0) target = target.splitText(s);
        if (e - s < target.length) target.splitText(e - s);
        const span = document.createElement('span');
        span.className = 'user-highlight';
        target.parentNode!.insertBefore(span, target);
        span.appendChild(target);
      }
    }
  }, [ranges]);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const root = ref.current;
    if (!root || !root.contains(range.commonAncestorContainer)) return;
    const a = getOffsetIn(root, range.startContainer, range.startOffset);
    const b = getOffsetIn(root, range.endContainer, range.endOffset);
    const [s, e] = a < b ? [a, b] : [b, a];
    if (s === e) return;
    setRanges((prev) => {
      const overlapping = prev.filter(([x, y]) => !(y <= s || x >= e));
      if (overlapping.length > 0) {
        // toggle off: remove any overlapping highlights
        return prev.filter((r) => !overlapping.includes(r));
      }
      return [...prev, [s, e] as [number, number]];
    });
    sel.removeAllRanges();
  };

  const handleClick = (e: React.MouseEvent) => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const target = e.target as HTMLElement;
    const hl = target.closest('.user-highlight') as HTMLElement | null;
    const root = ref.current;
    if (!hl || !root || !root.contains(hl)) return;
    const start = getOffsetIn(root, hl.firstChild ?? hl, 0);
    const end = start + (hl.textContent?.length ?? 0);
    setRanges((prev) => prev.filter(([x, y]) => !(x < end && y > start)));
  };

  return (
    <div ref={ref} className="highlightable" onMouseUp={handleMouseUp} onClick={handleClick}>
      {children}
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

/**
 * Format patient profile into Pense Revalida-style script:
 * section headers in ALL CAPS + bullet lines with **Label:** bolded.
 */
function formatPatientProfile(p: NonNullable<LoadedStation["patientProfile"]>): string {
  const out: string[] = [];

  const boldLabelLines = (raw?: string): string[] => {
    if (!raw) return [];
    return raw.split("\n").map((ln) => {
      const t = ln.trim();
      if (!t) return "";
      const m = t.match(/^([^:]{1,60}):\s*(.*)$/);
      if (m) return `- **${m[1].trim()}:** ${m[2].trim()}`;
      return `- ${t}`;
    }).filter(Boolean);
  };

  // DADOS PESSOAIS — linha resumo (Nome, idade, profissão)
  const dadosParts: string[] = [];
  if (p.name) dadosParts.push(p.name);
  if (p.age) dadosParts.push(`${p.age} de idade`);
  if (p.profession) dadosParts.push(String(p.profession).toLowerCase());
  if (dadosParts.length) {
    out.push("DADOS PESSOAIS:");
    out.push(`- ${dadosParts.join(", ")}.`);
    out.push("");
  }

  if (p.chiefComplaint) {
    out.push("MOTIVO DE CONSULTA:");
    out.push(`- ${p.chiefComplaint}`);
    out.push("");
  }

  if (p.hpi) {
    out.push("CARACTERÍSTICAS DO ACIDENTE:");
    out.push(...boldLabelLines(p.hpi));
    out.push("");
  }

  if (p.symptoms) {
    out.push("SINTOMAS ASSOCIADOS:");
    out.push(...boldLabelLines(p.symptoms));
    out.push("");
  }

  if (p.onlyIfAsked) {
    out.push("SE PERGUNTADO POR LIMPEZA OU ANTISSEPSIA DO LOCAL:");
    out.push(`- ${p.onlyIfAsked.replace(/^Se perguntado[^:]*:\s*/i, "")}`);
    out.push("");
  }

  const antecedentes: string[] = [];
  if (p.personalHistory) antecedentes.push(...boldLabelLines(p.personalHistory));
  if (p.medications) antecedentes.push(`- **Medicamentos:** ${p.medications}`);
  if (p.allergies) antecedentes.push(`- **Alergias:** ${p.allergies}`);
  if (p.familyHistory) antecedentes.push(`- **História familiar:** ${p.familyHistory}`);
  if (antecedentes.length) {
    out.push("ANTECEDENTES PESSOAIS:");
    out.push(...antecedentes);
    out.push("");
  }

  if (p.habits) {
    out.push("HÁBITOS:");
    out.push(...boldLabelLines(p.habits));
    out.push("");
  }

  return out.join("\n").trimEnd();
}

/**
 * Render plain script text with auto-bold for "trigger" lines.
 * Bolds:
 *  - explicit **markdown** segments
 *  - lines in ALL CAPS ending with ":" (typical PR-style cues like "SE PERGUNTADO ... :")
 */
function ScriptText({ text, className, strikeable, prefix, struck, toggle }: { text: unknown; className?: string; strikeable?: boolean; prefix?: string; struck?: Set<string>; toggle?: (id: string) => void }) {
  const safe = typeof text === "string" ? text : text == null ? "" : String(text);

  const Bold = ({ id, children }: { id: string; children: React.ReactNode }) => {
    if (!strikeable || !struck || !toggle) {
      return <strong className="font-semibold text-foreground">{children}</strong>;
    }
    const isStruck = struck.has(id);
    return (
      <strong
        onClick={() => toggle(id)}
        className={cn(
          "font-semibold text-foreground cursor-pointer rounded px-0.5 transition-colors select-none",
          isStruck ? "line-through opacity-50 hover:opacity-70" : "hover:bg-amber-500/20"
        )}
      >
        {children}
      </strong>
    );
  };

  const renderLine = (ln: string, lineIdx: number) => {
    const idx = ln.indexOf(":");
    if (idx < 0) return <span>{ln}</span>;
    const before = ln.slice(0, idx + 1);
    const after = ln.slice(idx + 1);
    const m = before.match(/^(\s*[-•—–]\s*)(.*)$/);
    const marker = m ? m[1] : "";
    const boldText = m ? m[2] : before;
    return (
      <span>
        {marker}
        <Bold id={`${prefix ?? "st"}-line-${lineIdx}`}>{boldText}</Bold>
        {after}
      </span>
    );
  };

  const lines = safe.split("\n");
  return (
    <div className={cn("whitespace-pre-wrap leading-relaxed", className)}>
      {lines.map((ln, i) => {
        if (ln.trim() === "") return <div key={i} className="h-4" aria-hidden />;
        return <div key={i}>{renderLine(ln, i)}</div>;
      })}
    </div>
  );
}



function StrikeText({ text, prefix, struck, toggle, className, inline }: { text: unknown; prefix: string; struck: Set<string>; toggle: (id: string) => void; className?: string; inline?: boolean }) {
  const safe = typeof text === "string" ? text : text == null ? "" : String(text);
  const lines = safe.split("\n");
  const Wrapper: React.ElementType = inline ? "span" : "div";
  return (
    <Wrapper className={cn(!inline && "whitespace-pre-wrap leading-relaxed", className)}>
      {lines.map((line, li) => {
        const tokens = line.split(/(\s+)/);
        const content = tokens.map((tok, wi) => {
          if (!tok) return null;
          if (/^\s+$/.test(tok)) return <span key={wi}>{tok}</span>;
          const id = `${prefix}-${li}-${wi}`;
          const isStruck = struck.has(id);
          return (
            <span
              key={wi}
              onClick={() => toggle(id)}
              className={cn(
                "cursor-pointer rounded px-0.5 transition-colors select-none",
                isStruck ? "line-through opacity-50" : "hover:bg-amber-500/20"
              )}
            >
              {tok}
            </span>
          );
        });
        if (inline) return <span key={li}>{content}{li < lines.length - 1 && "\n"}</span>;
        return <div key={li}>{line === "" ? <br /> : content}</div>;
      })}
    </Wrapper>
  );
}
