import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { loadStation, type LoadedStation } from "@/lib/stationLoader";
import { getSimulado, saveSimulado, type Simulado, type SimuladoStationState } from "@/lib/simulado";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import {
  ArrowLeft, ArrowRight, ClipboardCheck, Lock, Trophy, Eye, EyeOff,
  MessageSquare, ListChecks, Theater, Inbox, FileText, PackageCheck, Send,
  Play, Square, ChevronDown, BookOpen, Link2, BarChart3, MessageSquareWarning, MessageCircle, UserPlus, CheckCheck, Copy, Check, Share2, Mail, SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PRBlock, SubBlock, ScriptText, parseSubItems, levelTone, formatPatientProfile, formatPepHeading, Highlightable } from "@/components/station/shared";
import { supabase } from "@/integrations/supabase/client";
import { cancelRoom, cancelRoomBeacon } from "@/lib/roomCancel";
import { useAuth } from "@/hooks/use-auth";
import { IntroOverlay, INTRO_DURATION_MS, type IntroRole } from "@/components/room/IntroOverlay";
import { InviteUserDialog } from "@/components/InviteUserDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { NOTA_DE_CORTE } from "@/components/SpecialtyMedals";
import { serverNow, getServerOffset } from "@/lib/serverClock";
import ecgRitmoSinusal from "@/assets/ecg-ritmo-sinusal.jpg";
import aranhaArmadeira from "@/assets/aranha-armadeira.jpeg";
import { RelatedResources } from "@/components/RelatedResources";
import { RoomVideoCall } from "@/components/room/RoomVideoCall";
import { syncLivekitPermissions } from "@/lib/livekit.functions";
import { useServerFn } from "@tanstack/react-start";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RoomEventLog } from "@/components/room/RoomEventLog";
import { logRoomEvent } from "@/lib/roomEvents";

export const Route = createFileRoute("/app/sala/$code")({
  component: SalaDispatcher,
  head: () => ({ meta: [{ title: "Sala — REVMED" }] }),
});

function SalaDispatcher() {
  const { code } = Route.useParams();
  const { user, loading } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [hasSimulado, setHasSimulado] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasSimulado(false);
      setHydrated(true);
      return;
    }

    setHasSimulado(!!getSimulado(user.id, code));
    setHydrated(true);
  }, [code, user?.id]);

  if (loading || !hydrated) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  }
  if (hasSimulado) return <SimuladoRunner id={code} />;
  // Não é simulado do usuário atual → fluxo normal de sala (lobby/candidato/paciente/banca)
  return <Outlet />;
}

type Candidate = { id: string; name: string; avatarUrl: string | null };

function formatCandidateName(
  rawName: string | null | undefined,
  title: string | null | undefined,
  userId?: string,
): string {
  const raw = (rawName ?? "").trim();
  const t = (title ?? "").trim();
  const prefix = t && t !== "Sem título" ? t : "Dr.";
  const fallback = userId ? `${prefix} ${userId.slice(0, 8).toUpperCase()}` : prefix;
  const name = raw || fallback;
  const lower = name.toLowerCase();
  if (lower.startsWith("dr.") || lower.startsWith("dra.") || lower.startsWith("dr ") || lower.startsWith("dra ")) return name;
  return `${prefix} ${name}`;
}


function SimuladoRunner({ id }: { id: string }) {
  const nav = useNavigate();
  const { user, profile } = useAuth();
  const [sim, setSim] = useState<Simulado | null>(null);
  const [station, setStation] = useState<LoadedStation | null>(null);
  const [loading, setLoading] = useState(true);

  // Per-station UI/run state (resets when index changes)
  const [running, setRunning] = useState(false);
  const [finishedStation, setFinishedStation] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [duration, setDuration] = useState(10);
  const [delivered, setDelivered] = useState<Set<string>>(new Set());
  const [inviteOpen, setInviteOpen] = useState(false);
  const [previewMaterialId, setPreviewMaterialId] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<{ src: string; alt: string } | null>(null);
  const [highlights, setHighlights] = useState<Record<string, boolean>>({});
  const [struckWords, setStruckWords] = useState<Set<string>>(new Set());
  const toggleStruck = (id: string) => setStruckWords((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const [comments, setComments] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [evalStatus, setEvalStatus] = useState<"em_andamento" | "aprovado" | "reprovado" | "repetir">("em_andamento");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const tickRef = useRef<number | null>(null);

  // Room / participants state
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [evaluatedCandidateId, setEvaluatedCandidateId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [introStartAt, setIntroStartAt] = useState<number | null>(null);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [roomStatus, setRoomStatus] = useState("waiting");
  const [roomStartedAtMs, setRoomStartedAtMs] = useState<number | null>(null);
  const [selectCandidateOpen, setSelectCandidateOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [callIdentities, setCallIdentities] = useState<string[]>([]);
  const handleCallIdentities = useCallback((ids: string[]) => {
    setCallIdentities(ids);
  }, []);

  // Sincroniza permissões de áudio/vídeo no LiveKit a partir do estado da sala
  // (host = ator, evaluated_candidate = candidato avaliado, status finished = todos).
  const syncCallPerms = useServerFn(syncLivekitPermissions);

  // Log entries into the call (actor logs itself, actor also logs candidate join).
  const loggedJoinsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!sim?.roomId || !user?.id) return;
    const roomId = sim.roomId;
    if (callIdentities.includes(user.id)) {
      const key = `actor:${roomId}:${user.id}`;
      if (!loggedJoinsRef.current.has(key)) {
        loggedJoinsRef.current.add(key);
        void logRoomEvent(roomId, user.id, "actor_joined_call", {}, key);
      }
    }
    if (evaluatedCandidateId && callIdentities.includes(evaluatedCandidateId)) {
      const key = `cand:${roomId}:${evaluatedCandidateId}`;
      if (!loggedJoinsRef.current.has(key)) {
        loggedJoinsRef.current.add(key);
        const name = candidates.find((c) => c.id === evaluatedCandidateId)?.name ?? "";
        void logRoomEvent(roomId, user.id, "candidate_joined_call", {
          candidate_id: evaluatedCandidateId,
          name,
        }, key);
      }
    }
  }, [callIdentities, evaluatedCandidateId, candidates, sim?.roomId, user?.id]);




  // Load simulado
  useEffect(() => {
    if (!user) return;
    const s = getSimulado(user.id, id);
    if (!s) { toast.error("Simulado não encontrado."); nav({ to: "/app/checklists" }); return; }
    setSim(s);
  }, [id, nav, user]);

  // Load current station, reset per-station state
  useEffect(() => {
    if (!sim || sim.finished) return;
    setLoading(true);
    const cur = sim.stations[sim.currentIndex];
    if (!cur) return;
    loadStation(cur.id).then((st) => {
      setStation(st);
      setLoading(false);
      if (st) {
        const d = st.durationMinutes ?? 10;
        setDuration(d);
        setRemaining(d * 60);
        setRunning(false);
        setFinishedStation(false);
        setDelivered(new Set());
        setPreviewMaterialId(null);
        setHighlights({});
        setComments({});
        setFeedback("");
        setEvalStatus("em_andamento");
        setShowAnalysis(false);
        setPreviewEnabled(false);
        setRoomStatus("waiting");
      }
    });
  }, [sim?.currentIndex, sim?.id, sim?.finished]);

  // Ensure a training_room exists for this simulado (created lazily, reused across stations).
  useEffect(() => {
    if (!sim || sim.finished || !user || !station) return;
    let cancelled = false;
    (async () => {
      // If we already have a room, just sync its station to the current one.
      if (sim.roomId) {
        const cur = sim.stations[sim.currentIndex];
        const { data: r } = await supabase.from("training_rooms")
          .select("station_id, status, evaluated_candidate_id, duration_minutes, started_at").eq("id", sim.roomId).maybeSingle();
        if (r?.station_id === cur.id && r.status === "finished") {
          if (!cancelled) {
            setRoomStatus("finished");
            setFinishedStation(true);
            setPreviewEnabled(true);
            setRunning(false);
            setRemaining(0);
            setDuration((r.duration_minutes as number | null) ?? station.durationMinutes ?? 10);
            setRoomStartedAtMs(r?.started_at ? new Date(r.started_at as string).getTime() : null);
          }
        } else {
          await supabase.from("training_rooms")
            .update({
              station_id: cur.id,
              station_title: cur.title,
              status: "waiting",
              started_at: null,
              starting_at: null,
              finished_at: null,
              simulado_id: sim.id,
              simulado_name: sim.name,
              simulado_index: sim.currentIndex,
              simulado_total: sim.stations.length,
            })
            .eq("id", sim.roomId);
          if (!cancelled) {
            setRoomStatus("waiting");
            setRoomStartedAtMs(null);
          }
        }
        if (!cancelled) setEvaluatedCandidateId((r?.evaluated_candidate_id as string | null) ?? null);
        await refreshCandidates(sim.roomId);
        return;
      }
      // Usa o próprio ID do simulado como código da sala, para que a URL do ator e o link de
      // convite tenham exatamente o mesmo código. Se já existir uma sala com esse código
      // (de outro host, conflito raro), gera um código aleatório como fallback.
      const cur = sim.stations[sim.currentIndex];
      const baseRow = {
        host_id: user.id,
        station_id: cur.id,
        station_title: cur.title,
        mode: "simulado",
        status: "waiting",
        duration_minutes: station.durationMinutes ?? 10,
        simulado_id: sim.id,
        simulado_name: sim.name,
        simulado_index: sim.currentIndex,
        simulado_total: sim.stations.length,
      };
      let { data: created, error } = await supabase.from("training_rooms")
        .insert({ ...baseRow, code: sim.id })
        .select("id, code").single();
      if (error && (error.code === "23505" || /duplicate|unique/i.test(error.message))) {
        const fallbackCode = Math.random().toString(36).slice(2, 8).toUpperCase();
        ({ data: created, error } = await supabase.from("training_rooms")
          .insert({ ...baseRow, code: fallbackCode })
          .select("id, code").single());
      }
      if (error || !created) { console.error(error); return; }
      if (!cancelled) setRoomStatus("waiting");
      setSim((prev) => {
        if (!prev) return prev;
        const next = { ...prev, roomId: created.id as string, roomCode: created.code as string };
        saveSimulado(user!.id, next);
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [sim?.id, sim?.currentIndex, sim?.finished, user?.id, station?.id]);

  // Expose the active simulado as the sidebar "Sala" sub-item (mirrors actor's flow)
  useEffect(() => {
    if (!sim || sim.finished || !sim.roomCode) return;
    try {
      localStorage.setItem("ator:activeRoom", JSON.stringify({
        code: sim.roomCode,
        title: sim.name,
        path: `/app/sala/${sim.id}`,
        parent: (sim.stations?.length ?? 0) >= 2 ? "treinar" : "estacoes",
      }));
      window.dispatchEvent(new Event("ator:activeRoom"));
    } catch {}
    return () => {
      // Only clear if this simulado is the one currently stored
      try {
        const raw = localStorage.getItem("ator:activeRoom");
        const cur = raw ? JSON.parse(raw) : null;
        if (cur?.code === sim.roomCode) {
          localStorage.removeItem("ator:activeRoom");
          window.dispatchEvent(new Event("ator:activeRoom"));
        }
      } catch {}
    };
  }, [sim?.id, sim?.roomCode, sim?.name, sim?.finished]);

  async function refreshCandidates(roomId: string) {
    const { data: parts } = await supabase.from("training_room_participants")
      .select("user_id, role, display_name").eq("room_id", roomId);
    const candUsers = (parts ?? []).filter((p: { role: string }) => p.role === "candidato");
    if (candUsers.length === 0) { setCandidates([]); return; }
    const ids = candUsers.map((c: { user_id: string }) => c.user_id);
    // Tenta enriquecer com profiles (caso o usuário logado consiga ler — owner/admin).
    const { data: profs } = await supabase.from("profiles")
      .select("id, full_name, title, avatar_url").in("id", ids);
    const profMap = new Map((profs ?? []).map((p: { id: string; full_name: string | null; title: string | null; avatar_url: string | null }) => [p.id, p]));
    // Fallback de nome via display_name salvo no participante (visível para todos).
    const dispMap = new Map(candUsers.map((c: { user_id: string; display_name: string | null }) => [c.user_id, c.display_name]));
    const list: Candidate[] = ids.map((uid: string) => {
      const prof = profMap.get(uid);
      const raw = (prof?.full_name ?? dispMap.get(uid)) as string | null | undefined;
      return { id: uid, name: formatCandidateName(raw, prof?.title, uid), avatarUrl: prof?.avatar_url ?? null };
    });
    setCandidates(list);
    // Sem auto-seleção: o ator escolhe conscientemente o candidato a ser avaliado.
  }

  // Realtime: participants + room updates
  useEffect(() => {
    if (!sim?.roomId) return;
    const roomId = sim.roomId;
    const ch = supabase.channel(`simulado-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "training_room_participants", filter: `room_id=eq.${roomId}` }, async (payload) => {
        await refreshCandidates(roomId);
        if (payload.eventType === "INSERT") {
          const row = payload.new as { user_id: string; role: string; display_name: string | null };
          if (row.role === "candidato") {
            const { data: prof } = await supabase.from("profiles").select("full_name, title").eq("id", row.user_id).maybeSingle();
            toast.success(`${formatCandidateName(prof?.full_name ?? row.display_name, prof?.title, row.user_id)} entrou no simulado`);
            setInviteOpen(false);
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "training_rooms", filter: `id=eq.${roomId}` }, (payload) => {
        const row = payload.new as {
          evaluated_candidate_id: string | null;
          status?: string | null;
          started_at?: string | null;
          duration_minutes?: number | null;
        };
        setEvaluatedCandidateId(row.evaluated_candidate_id ?? null);
        if (row.status) setRoomStatus(row.status);
        if ("started_at" in row) {
          setRoomStartedAtMs(row.started_at ? new Date(row.started_at).getTime() : null);
        }
        if (typeof row.duration_minutes === "number") {
          setDuration(row.duration_minutes);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sim?.roomId]);

  // Se a sala for cancelada (candidato saiu / fechou aba), retorna o ator ao dashboard.
  const actorCancelledHandledRef = useRef(false);
  useEffect(() => {
    if (roomStatus === "cancelled" && !actorCancelledHandledRef.current) {
      actorCancelledHandledRef.current = true;
      toast.error("A sessão foi encerrada — o candidato saiu da sala.");
      nav({ to: "/app" });
    }
  }, [roomStatus, nav]);

  // Auto-cancela a sala se o ator sair (fechar aba, navegar, perder energia, etc.).
  const actorCancelRef = useRef<{ roomId: string | null; status: string; token: string | null }>({ roomId: null, status: "", token: null });
  useEffect(() => {
    actorCancelRef.current.roomId = sim?.roomId ?? null;
    actorCancelRef.current.status = roomStatus;
  }, [sim?.roomId, roomStatus]);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) actorCancelRef.current.token = data.session?.access_token ?? null;
    });
    const onBeforeUnload = () => {
      const s = actorCancelRef.current;
      if (!s.roomId) return;
      if (s.status === "finished" || s.status === "cancelled") return;
      cancelRoomBeacon(s.roomId, s.token);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      mounted = false;
      window.removeEventListener("beforeunload", onBeforeUnload);
      const s = actorCancelRef.current;
      if (s.roomId && s.status !== "finished" && s.status !== "cancelled") {
        void cancelRoom(s.roomId);
      }
    };
  }, []);



  async function setEvaluatedCandidate(candId: string) {
    if (!sim?.roomId) return;
    if (running) return toast.error("Estação em andamento — o candidato avaliado não pode ser alterado.");
    if (finishedStation) return toast.error("Estação encerrada — não é possível trocar o candidato avaliado.");
    const { error } = await supabase.from("training_rooms")
      .update({ evaluated_candidate_id: candId }).eq("id", sim.roomId);
    if (error) return toast.error(error.message);
    setEvaluatedCandidateId(candId);
    const name = candidates.find((c) => c.id === candId)?.name ?? "Candidato";
    toast.success(`Avaliado: ${name}`);
    void logRoomEvent(sim.roomId, user?.id ?? null, "candidate_selected", {
      candidate_id: candId,
      name,
    }, `cand:${candId}`);
    if (sim.roomCode) {
      try { await syncCallPerms({ data: { roomCode: sim.roomCode } }); } catch { /* noop */ }
    }
  }

  async function copyInviteLink() {
    const link = `https://revmed.app.br/convite/${sim?.roomCode ?? ""}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success("Link copiado");
    } catch { toast.error("Não foi possível copiar."); }
  }
  async function copyInviteCode() {
    const code = sim?.roomCode ?? "";
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1800);
      toast.success("Código copiado");
    } catch { toast.error("Não foi possível copiar."); }
  }
  function shareWhatsApp() {
    const link = `https://revmed.app.br/convite/${sim?.roomCode ?? ""}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Vamos treinar um simulado no REVMED 🩺\nEntre: ${link}`)}`, "_blank", "noopener,noreferrer");
  }
  function shareEmail() {
    const link = `https://revmed.app.br/convite/${sim?.roomCode ?? ""}`;
    window.location.href = `mailto:?subject=${encodeURIComponent("Convite — Simulado REVMED")}&body=${encodeURIComponent(`Entre pelo link: ${link}\n\nCódigo: ${sim?.roomCode ?? ""}`)}`;
  }
  async function shareNative() {
    const link = `https://revmed.app.br/convite/${sim?.roomCode ?? ""}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try { await navigator.share({ title: "REVMED", text: "Entre no simulado:", url: link }); return; } catch {}
    }
    copyInviteLink();
  }

  // Timer sincronizado: deriva o tempo restante de started_at + duration_minutes
  // do servidor, para que ator e candidato vejam exatamente o mesmo cronômetro.
  useEffect(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (!running || !roomStartedAtMs) return;
    const startedMs = roomStartedAtMs;
    const totalSec = Math.max(1, Math.round(duration * 60));
    const compute = () => {
      const elapsed = Math.floor((serverNow() - startedMs) / 1000);
      const left = Math.max(0, totalSec - elapsed);
      setRemaining(left);
      if (left <= 0) {
        if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
        void finishTimer(true);
      }
    };
    compute();
    tickRef.current = window.setInterval(compute, 250);
    return () => { if (tickRef.current) clearInterval(tickRef.current); tickRef.current = null; };
  }, [running, roomStartedAtMs, duration]);

  // Mantém running em sincronia com o status da sala (e dispara o overlay
  // de intro no ator caso ele recarregue a página durante o "starting").
  useEffect(() => {
    if (roomStatus === "running" && !running && !finishedStation) {
      setRunning(true);
    } else if (roomStatus === "finished" && running) {
      setRunning(false);
    }
  }, [roomStatus, running, finishedStation]);

  const current: SimuladoStationState | undefined = sim?.stations[sim.currentIndex];

  const checks = current?.checks ?? {};

  const totals = useMemo(() => {
    if (!station) return { count: 0, scored: 0, earned: 0, total: 0 };
    const count = station.checklist.length;
    let scored = 0, earned = 0, total = 0;
    for (const it of station.checklist) {
      total += it.points;
      const v = checks[it.id];
      if (typeof v === "number") { scored++; earned += v; }
    }
    return { count, scored, earned, total };
  }, [station, checks]);

  const allScored = totals.count > 0 && totals.scored === totals.count;
  const isStationFinished = finishedStation || roomStatus === "finished";

  function computeEvaluationTotals(sourceChecks: Record<string, number>) {
    if (!station) return { count: 0, scored: 0, earned: 0, total: 0 };
    let scored = 0, earned = 0, total = 0;
    for (const it of station.checklist) {
      total += it.points;
      const value = sourceChecks[it.id];
      if (typeof value === "number") {
        scored++;
        earned += value;
      }
    }
    return { count: station.checklist.length, scored, earned, total };
  }

  async function syncEvaluationToCandidate(
    sourceChecks = checks,
    sourceComments = comments,
    sourceFeedback = feedback,
  ) {
    if (!(previewEnabled || isStationFinished) || !sim?.roomId || !user || !evaluatedCandidateId) return;
    const stationId = sim.stations[sim.currentIndex]?.id;
    if (!stationId) return;
    const nextTotals = computeEvaluationTotals(sourceChecks);
    const nextAllScored = nextTotals.count > 0 && nextTotals.scored === nextTotals.count;
    const pct = nextTotals.total > 0 ? (nextTotals.earned / nextTotals.total) * 100 : 0;
    const resolvedStatus = isStationFinished && nextAllScored
      ? (pct >= NOTA_DE_CORTE ? "aprovado" : "reprovado")
      : "em_andamento";

    const { error } = await supabase.from("room_evaluations").upsert({
      room_id: sim.roomId,
      evaluator_id: user.id,
      candidate_id: evaluatedCandidateId,
      station_id: stationId,
      checks: sourceChecks,
      item_comments: sourceComments,
      final_feedback: sourceFeedback,
      final_score: Number(nextTotals.earned.toFixed(2)),
      status: resolvedStatus,
      preview_for_candidate: true,
    }, { onConflict: "room_id,evaluator_id,candidate_id,station_id" });
    if (error) console.error(error);
  }

  // Auto-sincroniza a prévia do PEP enquanto estiver habilitada OU após o encerramento
  useEffect(() => {
    if (!(previewEnabled || isStationFinished) || !sim?.roomId || !user || !evaluatedCandidateId) return;
    const t = setTimeout(() => {
      void syncEvaluationToCandidate(checks, comments, feedback);
    }, 400);
    return () => clearTimeout(t);
  }, [previewEnabled, isStationFinished, checks, comments, feedback, sim?.roomId, sim?.currentIndex, evaluatedCandidateId, user?.id]);

  async function togglePreview() {
    if (!sim?.roomId || !user) return;
    if (!evaluatedCandidateId) return toast.error("Selecione o candidato que será avaliado.");
    const stationId = sim.stations[sim.currentIndex]?.id;
    if (!stationId) return;
    const next = !previewEnabled;
    if (next) {
      const ok = window.confirm("Deseja realmente liberar o PEP para o candidato? Ele verá o preenchimento em tempo real.");
      if (!ok) return;
    }
    setPreviewEnabled(next);
    const { error } = await supabase.from("room_evaluations").upsert({
      room_id: sim.roomId!,
      evaluator_id: user.id,
      candidate_id: evaluatedCandidateId,
      station_id: stationId,
      checks,
      item_comments: comments,
      final_feedback: feedback,
      final_score: Number(totals.earned.toFixed(2)),
      status: "em_andamento",
      preview_for_candidate: next,
    }, { onConflict: "room_id,evaluator_id,candidate_id,station_id" });
    if (error) {
      setPreviewEnabled(!next);
      return toast.error(error.message);
    }
    toast.success(next ? "PEP liberado para o candidato em tempo real." : "Prévia do PEP ocultada.");
  }

  function updateCurrent(updater: (s: SimuladoStationState) => SimuladoStationState) {
    setSim((prev) => {
      if (!prev) return prev;
      const stations = prev.stations.map((s, i) => (i === prev.currentIndex ? updater(s) : s));
      const next = { ...prev, stations };
      saveSimulado(user!.id, next);
      return next;
    });
  }

  function pickLevel(itemId: string, points: number) {
    const nextChecks = { ...checks };
    if (nextChecks[itemId] === points) delete nextChecks[itemId];
    else nextChecks[itemId] = points;
    updateCurrent((s) => {
      const earned = Object.values(nextChecks).reduce((a, b) => a + b, 0);
      const maxScore = station ? station.checklist.reduce((a, it) => a + it.points, 0) : s.maxScore;
      const completed = station ? Object.keys(nextChecks).length === station.checklist.length : false;
      return { ...s, checks: nextChecks, score: earned, maxScore, completed };
    });
    void syncEvaluationToCandidate(nextChecks, comments, feedback);
  }

  async function startTimer() {
    // Sincroniza ator e candidato: grava primeiro no servidor (starting_at é o
    // âncora compartilhado) e só então liga a animação local — assim ambos os
    // lados disparam o overlay no mesmo instante, independente da latência.
    setFinishedStation(false);
    if (sim?.roomId) {
      try {
        await getServerOffset(true);
        const anchorMs = serverNow();
        const startsAtIso = new Date(anchorMs + INTRO_DURATION_MS).toISOString();
        await supabase.from("training_rooms").update({
          status: "starting",
          starting_at: new Date(anchorMs).toISOString(),
          started_at: startsAtIso,
          duration_minutes: duration,
        }).eq("id", sim.roomId);
        setRoomStatus("starting");
        setIntroStartAt(anchorMs);
        setShowIntro(true);
      } catch (e) {
        console.error(e);
        // Fallback: se a gravação falhar, ainda exibe a animação localmente
        setIntroStartAt(serverNow());
        setShowIntro(true);
      }
    } else {
      setIntroStartAt(serverNow());
      setShowIntro(true);
    }
  }
  async function onIntroComplete() {
    setShowIntro(false);
    setRunning(true);
    if (sim?.roomId) {
      await supabase.from("training_rooms")
        .update({ status: "running" })
        .eq("id", sim.roomId)
        .eq("status", "starting");
      setRoomStatus("running");
      void logRoomEvent(sim.roomId, user?.id ?? null, "station_started", {
        duration_minutes: duration,
      }, `start:${sim.roomId}:${sim.currentIndex}`);
      if (sim.roomCode) {
        try { await syncCallPerms({ data: { roomCode: sim.roomCode } }); } catch { /* noop */ }
      }
    }
  }
  async function finishTimer(auto = false) {
    setRunning(false);
    setFinishedStation(true);
    setPreviewEnabled(true);
    if (sim?.roomId) {
      const finishedAt = new Date().toISOString();
      const resolvedStatus = allScored
        ? (evalStatus === "em_andamento" ? ((totals.total > 0 ? (totals.earned / totals.total) * 100 : 0) >= NOTA_DE_CORTE ? "aprovado" : "reprovado") : evalStatus)
        : "em_andamento";

      if (user && evaluatedCandidateId) {
        const stationId = sim.stations[sim.currentIndex]?.id;
        if (stationId) {
          const { error: evalError } = await supabase.from("room_evaluations").upsert({
            room_id: sim.roomId,
            evaluator_id: user.id,
            candidate_id: evaluatedCandidateId,
            station_id: stationId,
            checks,
            item_comments: comments,
            final_feedback: feedback,
            final_score: Number(totals.earned.toFixed(2)),
            status: resolvedStatus,
            submitted_at: resolvedStatus === "em_andamento" ? null : finishedAt,
            preview_for_candidate: true,
          }, { onConflict: "room_id,evaluator_id,candidate_id,station_id" });
          if (evalError) {
            toast.error(evalError.message);
            return;
          }
        }
      }

      const { error: roomError } = await supabase.from("training_rooms")
        .update({ status: "finished", finished_at: finishedAt })
        .eq("id", sim.roomId);
      if (roomError) {
        toast.error(roomError.message);
        return;
      }
      setRoomStatus("finished");
      void logRoomEvent(sim.roomId, user?.id ?? null, "station_finished", {
        auto,
      }, `finish:${sim.roomId}:${sim.currentIndex}`);
      if (sim.roomCode) {
        try { await syncCallPerms({ data: { roomCode: sim.roomCode } }); } catch { /* noop */ }
      }
    }
    toast.success(auto ? "Tempo encerrado. PEP liberado para o candidato." : "Estação encerrada. PEP liberado para o candidato.");
  }
  async function deliverMat(matId: string) {
    if (!station || !user) return;
    const m = (station.deliverableMaterials ?? []).find((x) => x.id === matId);
    if (!m) return;
    if (!sim?.roomId) {
      toast.error("Sala ainda não está pronta. Tente novamente em instantes.");
      return;
    }
    const currentStationId = sim.stations[sim.currentIndex]?.id;
    // Fallback para imagens hardcoded (estações antigas sem imageUrl no banco)
    const nameLc = (m.name || "").toLowerCase();
    const fallbackImage = !m.imageUrl
      ? (/aranha/.test(nameLc) ? aranhaArmadeira
        : /ritmo/.test(nameLc) ? ecgRitmoSinusal
        : null)
      : null;
    const effectiveImageUrl = m.imageUrl ?? fallbackImage ?? null;
    const { error } = await supabase.from("room_material_deliveries").insert({
      room_id: sim.roomId,
      station_id: currentStationId,
      material_id: m.id,
      material_name: m.name,
      material_type: m.type,
      material_description: m.description ?? null,
      material_content: m.content,
      material_image_url: effectiveImageUrl,
      delivered_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    setDelivered((d) => { const n = new Set(d); n.add(matId); return n; });
    toast.success(`Entregue: ${m.name}`);
  }

  async function goNext() {
    if (!sim || !allScored) return;
    if (sim.currentIndex < sim.stations.length - 1) {
      // Limpa o candidato avaliado da sala antes de avançar — a próxima estação
      // pode ter outro "candidato da vez". Se restar só 1 participante, será re-selecionado automaticamente.
      if (sim.roomId) {
        await supabase.from("training_rooms")
          .update({ evaluated_candidate_id: null, status: "waiting", started_at: null, starting_at: null, finished_at: null })
          .eq("id", sim.roomId);
        setEvaluatedCandidateId(null);
        setRoomStatus("waiting");
        if (sim.roomCode) {
          try { await syncCallPerms({ data: { roomCode: sim.roomCode } }); } catch { /* noop */ }
        }
      }
      const next = { ...sim, currentIndex: sim.currentIndex + 1 };
      saveSimulado(user!.id, next);
      setSim(next);
      setStation(null);
      // Reset timer + per-station UI immediately (load effect also resets after fetch)
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      setRunning(false);
      setFinishedStation(false);
      setRemaining(0);
      setDuration(10);
      setDelivered(new Set());
      setPreviewMaterialId(null);
      setHighlights({});
      setComments({});
      setFeedback("");
      setEvalStatus("em_andamento");
      setShowAnalysis(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const next = { ...sim, finished: true };
      saveSimulado(user!.id, next);
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
          <Button asChild variant="outline"><Link to={(sim?.stations?.length ?? 0) >= 2 ? "/app/checklists" : "/app/checklists"}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link></Button>
        </div>
      </div>
    );
  }

  if (loading || !station || !current) {
    return <div className="mx-auto max-w-4xl py-20 text-center text-sm text-muted-foreground">Carregando estação...</div>;
  }

  const meta = getSpecialtyMeta(station.specialty);
  const materials = station.deliverableMaterials ?? [];
  const p = station.patientProfile;
  const isWaiting = !running && !finishedStation;
  const actorInCall = !!user?.id && callIdentities.includes(user.id);
  const candidateInCall = !!evaluatedCandidateId && callIdentities.includes(evaluatedCandidateId);
  const hasEvaluated = !!evaluatedCandidateId;
  const allReadyToStart = hasEvaluated && actorInCall && candidateInCall;
  const totalSec = Math.max(0, Math.floor(remaining));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  const progress = ((sim.currentIndex + (allScored ? 1 : 0)) / sim.stations.length) * 100;

  return (
    <>
      {showIntro && (
        <IntroOverlay
          role={"paciente" as IntroRole}
          stationTitle={station?.title ?? sim.name}
          specialty={station?.specialty ?? null}
          displayName={(profile?.full_name?.trim()) || "Ator"}
          avatarUrl={profile?.avatar_url}
          startAtMs={introStartAt ?? undefined}
          nowMs={serverNow}
          onComplete={onIntroComplete}
        />
      )}
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-4 overflow-x-hidden">
      {/* Progress header */}
      {sim.stations.length >= 2 && (
        <div className="rounded-2xl border border-border bg-card/60 px-4 py-3 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm font-semibold">{sim.name}</div>
            <Badge variant="outline" className="ml-auto">
              Estação {sim.currentIndex + 1} de {sim.stations.length}
            </Badge>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gradient-mint transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5">
        {/* LEFT */}
        <div className="min-w-0 space-y-4">
          {/* Title bar — gradient institucional (igual ao painel do candidato) */}
          <div className="relative min-w-0 overflow-hidden rounded-2xl border border-mint/20 bg-gradient-hero px-4 py-4 text-white shadow-elegant sm:px-5">
            <div
              className="pointer-events-none absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "linear-gradient(hsl(160 60% 60%) 1px, transparent 1px), linear-gradient(90deg, hsl(160 60% 60%) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="relative flex min-w-0 flex-wrap items-center justify-between gap-2 sm:gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Link to="/app/checklists" className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-medium text-white/90 transition hover:bg-white/20 hover:text-white">
                  <ArrowLeft className="h-3 w-3" /> Sair
                </Link>
                <span className="h-5 w-px bg-white/20" />
                <span className={cn("inline-flex h-7 items-center rounded-md px-2 text-xs font-bold", meta.badge)}>{meta.code}</span>
                <h1 className="min-w-0 truncate font-display text-base font-bold text-white sm:text-lg md:text-xl">{station.title}</h1>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" /> {station.specialty}
              </span>
            </div>
          </div>

          <PRBlock icon={MessageSquare} title="Cenário de atuação">
            <ScriptText text={station.clinicalCase} />
          </PRBlock>

          {station.caseDescription && (
            <PRBlock icon={MessageSquare} title="Descrição do caso">
              <ScriptText text={station.caseDescription} />
            </PRBlock>
          )}

          <PRBlock icon={ListChecks} title={`Nos ${duration} minutos de duração da estação, você deverá executar as seguintes tarefas`}>
            <ScriptText text={station.candidateTask} />
          </PRBlock>

          <PRBlock icon={Theater} title="Orientações do Ator/Atriz">
            <p className="mb-3 text-[11px] text-muted-foreground italic">
              Dica: clique nas partes em <strong className="font-semibold">negrito</strong> para riscá-las. Selecione qualquer texto para marcá-lo; selecione de novo a mesma área para desmarcar.
            </p>
            <Highlightable>
              {station.patientScript ? (
                <ScriptText text={station.patientScript} strikeable prefix="ps" struck={struckWords} toggle={toggleStruck} />
              ) : p ? (
                <ScriptText text={formatPatientProfile(p)} strikeable prefix="pp" struck={struckWords} toggle={toggleStruck} />
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma orientação preenchida.</p>
              )}
              {p?.spontaneous && <SubBlock label="O que falar espontaneamente"><ScriptText text={p.spontaneous} strikeable prefix="sp" struck={struckWords} toggle={toggleStruck} /></SubBlock>}
              {p?.doNotReveal && <SubBlock label="Nunca revelar" tone="rose"><ScriptText text={p.doNotReveal} strikeable prefix="dnr" struck={struckWords} toggle={toggleStruck} /></SubBlock>}
              {(p?.emotionalTone || p?.actingTips) && (
                <SubBlock label="Tom emocional e atuação">
                  {p?.emotionalTone && <p><span className="font-medium">Tom:</span> {p.emotionalTone}</p>}
                  {p?.actingTips && <p className="mt-1"><span className="font-medium">Dicas:</span> {p.actingTips}</p>}
                </SubBlock>
              )}
            </Highlightable>
          </PRBlock>

          {/* Materiais */}
          <PRBlock
            icon={Inbox}
            title="Materiais para entregar ao candidato"
            right={<Badge variant="outline" className="text-white border-white/30">{delivered.size}/{materials.length}</Badge>}
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
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-semibold group-hover:text-mint">
                            <FileText className="h-4 w-4 text-mint" /> Impresso {idx + 1} <span className="text-muted-foreground font-normal">{(() => { const clean = (m.name || "").replace(/^\s*impresso\s*\d+\s*[:\-–—()]*\s*/i, "").replace(/^\(\s*|\s*\)$/g, "").trim(); return clean ? `( ${clean} )` : ""; })()}</span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">{isOpen ? "clique para recolher" : "clique para ver o conteúdo"}</div>
                          {m.description && <div className="mt-2 text-xs text-muted-foreground">{m.description}</div>}
                        </div>
                        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform mt-1", isOpen && "rotate-180")} />
                      </button>
                      {isOpen && (
                        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed">
                          {isRhythm && (
                            <button type="button" onClick={() => setZoomImage({ src: ecgRitmoSinusal, alt: "Traçado de ECG" })} className="mb-3 block w-full group relative">
                              <img src={ecgRitmoSinusal} alt="Traçado de ECG" className="block w-full h-auto rounded-md border border-border transition-opacity group-hover:opacity-90" />
                              <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">🔍 ampliar</span>
                            </button>
                          )}
                          {isSpider && (
                            <button type="button" onClick={() => setZoomImage({ src: aranhaArmadeira, alt: "Aranha" })} className="mb-3 block w-full group relative">
                              <img src={aranhaArmadeira} alt="Aranha" className="block w-full h-auto rounded-md border border-border transition-opacity group-hover:opacity-90" />
                              <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">🔍 ampliar</span>
                            </button>
                          )}
                          {m.imageUrl && (
                            <button
                              type="button"
                              onClick={() => setZoomImage({ src: m.imageUrl!, alt: m.name || "Material" })}
                              className="mb-3 block w-full group relative"
                              title="Clique para ampliar"
                            >
                              <img src={m.imageUrl} alt={m.name || "Material"} className="block w-full h-auto rounded-md border border-border transition-opacity group-hover:opacity-90" />
                              <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">🔍 ampliar</span>
                            </button>
                          )}
                          {m.content
                            ? <ScriptText text={m.content} />
                            : (!isRhythm && !isSpider && !m.imageUrl && <span className="italic text-muted-foreground">Sem conteúdo cadastrado.</span>)}
                        </div>
                      )}
                      <div className="mt-auto pt-3">
                        <Button size="sm" variant={isDelivered ? "outline" : "hero"} className="w-full" disabled={isDelivered || !running} onClick={() => deliverMat(m.id)}>
                          {isDelivered ? <><PackageCheck className="mr-1 h-4 w-4" /> Entregue</> : <><Send className="mr-1 h-4 w-4" /> Entregar</>}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </PRBlock>

          {/* CHECKLIST PEP */}
          <PRBlock
            icon={ClipboardCheck}
            title="CHECKLIST ( PEP )"
            right={
              <Badge variant="outline" className="text-white border-white/30">{totals.scored}/{totals.count}</Badge>
            }
          >
            <ol className="space-y-3">
              {station.checklist.map((it, idx) => {
                const levels = it.levels ?? [{ label: "Inadequado", points: 0 }, { label: "Adequado", points: it.points }];
                const cur = checks[it.id];
                const parts = parseSubItems(it.description);
                const isBlocked = !finishedStation && typeof cur !== "number" && totals.scored >= totals.count - 1;
                return (
                  <li
                    key={it.id}
                    onClick={() => { if (isBlocked) toast.error("Você tem que terminar o checklist primeiro.."); }}
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 rounded-xl border px-3 py-3 transition-colors sm:gap-x-4 sm:px-4",
                      typeof cur === "number" ? "border-mint/30 bg-mint/5" : "border-border bg-background/30",
                      isBlocked && "cursor-not-allowed",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {formatPepHeading(idx, (it as { category?: string | null }).category, it.description)}
                      </div>
                      {parts.subs.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {parts.subs.map((sub, si) => {
                            const key = `${it.id}::${si}`;
                            const active = !!highlights[key];
                            return (
                              <li key={key}>
                                <button type="button" onClick={() => setHighlights((h) => ({ ...h, [key]: !h[key] }))}
                                  className={cn(
                                    "w-full rounded-md px-2 py-1 text-left text-sm transition-colors",
                                    active ? "bg-mint/40 text-night ring-1 ring-mint/60" : "text-foreground/85 hover:bg-white/5",
                                  )}>
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
                        onChange={(e) => {
                          const nextComments = { ...comments, [it.id]: e.target.value };
                          setComments(nextComments);
                          void syncEvaluationToCandidate(checks, nextComments, feedback);
                        }}
                        placeholder="Comentário (opcional)"
                        rows={2}
                        className="mt-3"
                        disabled={!finishedStation}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1 tabular-nums">
                      {(() => { const sorted = [...levels].sort((a, b) => a.points - b.points); const maxPts = Math.max(...sorted.map((l) => l.points)); return sorted.map((lv) => {
                        const sel = cur === lv.points;
                        const tone = levelTone(lv.points, maxPts);
                        return (
                          <button
                            key={lv.label}
                            type="button"
                            onClick={() => {
                              if (isBlocked) { toast.error("Você tem que terminar o checklist primeiro.."); return; }
                              pickLevel(it.id, lv.points);
                            }}
                            className={cn(
                              "flex h-7 w-9 items-center justify-center rounded-md text-sm font-bold transition-colors",
                              sel ? tone.active : tone.idle,
                              isBlocked && "cursor-not-allowed opacity-40",
                            )}
                            title={isBlocked ? "Aguarde o término da estação" : lv.label}
                          >
                            {lv.points}
                          </button>
                        );
                      }); })()}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-5 rounded-xl border border-border bg-background/40 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Comentário final ao candidato
              </div>
              <Textarea
                value={feedback}
                onChange={(e) => {
                  const nextFeedback = e.target.value;
                  setFeedback(nextFeedback);
                  void syncEvaluationToCandidate(checks, comments, nextFeedback);
                }}
                rows={4}
                placeholder="Pontos fortes, pontos a melhorar..."
                className="mt-2"
              />
            </div>

            {!allScored && (
              <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <span className="font-bold">Atenção:</span> preencha todos os itens do PEP ({totals.scored}/{totals.count}) para avançar.
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Nota parcial:</span>{" "}
                <span className="font-bold text-mint">{totals.earned.toFixed(2)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {sim.currentIndex < sim.stations.length - 1 && (
                  <Button
                    variant="hero"
                    disabled={!allScored}
                    onClick={goNext}
                  >
                    Próxima estação <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </PRBlock>

          {/* Análise expansível */}
          {(station.educationalGoal || station.expectedConduct || station.commonMistakes) && (
            <div>
              <button
                type="button"
                onClick={() => setShowAnalysis((v) => !v)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-gradient-hero px-4 py-3 text-sm font-medium text-white shadow-elegant transition-opacity hover:opacity-90"
              >
                <BarChart3 className="h-4 w-4" /> Análise de resultados
                <ChevronDown className={cn("h-4 w-4 transition-transform", showAnalysis && "rotate-180")} />
              </button>
              {showAnalysis && (
                <div className="mt-3 space-y-3">
                  {station.educationalGoal && <SubBlock label="Objetivo educacional">{station.educationalGoal}</SubBlock>}
                  {station.expectedConduct && <SubBlock label="Conduta esperada">{station.expectedConduct}</SubBlock>}
                  {station.commonMistakes && <SubBlock label="Erros comuns" tone="rose">{station.commonMistakes}</SubBlock>}
                </div>
              )}
            </div>
          )}

          {/* Referências */}
          {station.references && station.references.length > 0 && (
            <PRBlock icon={BookOpen} title="Referências bibliográficas">
              <ul className="space-y-2">
                {station.references.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-mint underline-offset-2 hover:underline break-all">
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

          <PRBlock icon={MessageSquareWarning} title="Feedback | Erro, Dúvida ou Sugestão">
            <p className="text-sm text-muted-foreground">Encontrou algum problema ou tem sugestões sobre esta estação? Envie um feedback para a equipe.</p>
            <Button variant="hero" className="mt-3" onClick={() => toast.success("Obrigado! Seu feedback foi registrado.")}>
              <MessageCircle className="mr-1 h-4 w-4" /> Enviar feedback
            </Button>
          </PRBlock>
        </div>

        {/* RIGHT: control panel */}
        <aside className="hidden min-w-0 space-y-3 lg:sticky lg:top-20 lg:block lg:self-start">
          {/* Timer (desktop) */}
          <div className="rounded-2xl border border-border bg-gradient-hero p-4 text-white shadow-elegant">
            <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-white/70">
              {running ? "Em andamento" : finishedStation ? "Encerrada" : "Aguardando início"}
            </div>
            <div className={cn("mt-2 rounded-xl px-5 py-6 text-center transition-colors", running ? "bg-mint/15" : "bg-white/5")}>
              <div className="font-display text-4xl font-bold tabular-nums text-white sm:text-5xl">{mm}:{ss}</div>
              {isWaiting && (
                <div className="mt-3">
                  <Select value={String(duration)} onValueChange={(v) => { const n = Number(v); setDuration(n); setRemaining(Math.round(n * 60)); if (sim?.roomId) { void supabase.from("training_rooms").update({ duration_minutes: n }).eq("id", sim.roomId); } }}>
                    <SelectTrigger className="mx-auto h-8 w-auto gap-1 border-white/20 bg-white/10 px-3 text-xs text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.0833">5 segundos (teste)</SelectItem>
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
              <button
                type="button"
                onClick={() => {
                  if (!hasEvaluated) {
                    toast.error("Selecione primeiro o candidato avaliado.");
                    setSelectCandidateOpen(true);
                    return;
                  }
                  if (!actorInCall) {
                    toast.error("Entre na chamada de voz para poder iniciar.");
                    return;
                  }
                  if (!candidateInCall) {
                    toast.error("Aguardando o candidato selecionado entrar na chamada de voz.");
                    return;
                  }
                  startTimer();
                }}
                style={allReadyToStart ? { color: "var(--medical)" } : undefined}
                className={cn(
                  "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition active:scale-[0.98]",
                  allReadyToStart
                    ? "bg-white hover:bg-white/90 hover:shadow"
                    : "bg-white/30 text-white/70 hover:bg-white/40",
                )}
              >
                <Play className="h-4 w-4" /> Iniciar cronômetro
              </button>
            )}
            {isWaiting && (
              <div className="mt-2 rounded-xl border border-medical/25 bg-medical/5 p-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-medical">
                  Para iniciar o cronômetro
                </div>
                <ul className="space-y-1.5">
                  {[
                    { ok: hasEvaluated, label: "Selecionar o candidato avaliado" },
                    { ok: actorInCall, label: "Você (ator) precisa entrar na chamada de voz" },
                    { ok: candidateInCall, label: hasEvaluated ? "O candidato selecionado precisa entrar na chamada" : "Após selecionar, o candidato entra na chamada" },
                  ].map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11.5px] leading-snug">
                      <span
                        className={cn(
                          "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                          r.ok
                            ? "border-mint bg-mint/20 text-mint"
                            : "border-medical/50 text-medical/70",
                        )}
                      >
                        {r.ok ? "✓" : "•"}
                      </span>
                      <span className={r.ok ? "text-white/85 line-through decoration-mint/40" : "text-white/80"}>
                        {r.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {running && (
              <button
                type="button"
                onClick={() => { void finishTimer(); }}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-[0.98]"
              >
                Encerrar estação
              </button>
            )}
            {finishedStation && (
              <div className="mt-3 rounded-lg bg-mint/10 px-3 py-2 text-center text-xs text-mint">
                Estação encerrada — preencha o PEP abaixo.
              </div>
            )}
          </div>

          {/* Live score (visible to actor from the start) */}
          {station && (
            <div className="rounded-2xl border border-mint/30 bg-gradient-to-br from-night via-night to-night/80 p-4 text-white shadow-elegant">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                  Resultado (ao vivo)
                </div>
                <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-semibold text-mint">
                  {totals.scored}/{totals.count} itens
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-center gap-1">
                <span className="font-display text-4xl font-bold tabular-nums text-mint">
                  {((totals.total > 0 ? (totals.earned / totals.total) * 10 : 0)).toFixed(2)}
                </span>
                <span className="text-sm text-white/60">/ 10</span>
              </div>
              <div className="mt-1 text-center text-[11px] text-white/60">
                {totals.earned.toFixed(2)} de {totals.total.toFixed(2)} pts
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-mint transition-all"
                  style={{ width: `${totals.count > 0 ? (totals.scored / totals.count) * 100 : 0}%` }}
                />
              </div>
              <div className="mt-2 text-center text-[10px] text-white/50">
                Visível só para você — atualiza conforme preenche o PEP
              </div>
            </div>
          )}

          {/* Participantes — separados: candidato avaliado + espectadores */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Participantes ({candidates.length})
              </div>
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-mint/40 bg-mint/10 px-2 py-0.5 text-[10px] font-semibold text-mint transition hover:bg-mint/20"
              >
                <UserPlus className="h-3 w-3" /> Convidar amigo
              </button>
            </div>

            {!evaluatedCandidateId && candidates.length >= 2 && !running && (
              <div className="mt-2 rounded-xl border border-mint/40 bg-mint/10 px-3 py-2 text-xs font-medium text-mint">
                👇 Selecione o próximo candidato a ser avaliado
              </div>
            )}

            {candidates.length === 0 ? (
              <div className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <UserPlus className="h-4 w-4" />
                Aguardando participantes.
              </div>
            ) : (
              <div className="mt-2 space-y-3">
                {/* Candidato avaliado */}
                {evaluatedCandidateId && (
                  <div>
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-mint">
                      Candidato avaliado
                    </div>
                    <ul className="space-y-1.5">
                      {candidates
                        .filter((c) => c.id === evaluatedCandidateId)
                        .map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => setEvaluatedCandidate(c.id)}
                              disabled={!isWaiting}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                                "border-mint/50 bg-mint/10 text-foreground",
                                !isWaiting && "cursor-default",
                              )}
                              title={!isWaiting ? "Candidato travado após o início da estação" : undefined}
                            >
                              <UserAvatar avatarUrl={c.avatarUrl} name={c.name} size="sm" />
                              <span className="flex-1 truncate font-medium">{c.name}</span>
                              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-mint bg-mint/20">
                                <CheckCheck className="h-3 w-3 text-mint" />
                              </span>
                              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-mint" />
                            </button>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Espectadores */}
                {candidates.filter((c) => c.id !== evaluatedCandidateId).length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Espectadores
                    </div>
                    <ul className="space-y-1.5">
                      {candidates
                        .filter((c) => c.id !== evaluatedCandidateId)
                        .map((c) => {
                          const isEvaluated = c.id === evaluatedCandidateId;
                          return (
                            <li key={c.id}>
                              <button
                                type="button"
                                onClick={() => setEvaluatedCandidate(c.id)}
                                disabled={!isWaiting}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                                  "border-border bg-background/40 text-foreground hover:border-mint/40",
                                  !isWaiting && !isEvaluated && "opacity-50 cursor-not-allowed",
                                )}
                                title={!isWaiting ? "Candidato travado após o início da estação" : undefined}
                              >
                                <UserAvatar avatarUrl={c.avatarUrl} name={c.name} size="sm" />
                                <span className="flex-1 truncate font-medium">{c.name}</span>
                                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/40" />
                              </button>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Convite do candidato */}
          {sim.roomCode && (
            <div className="rounded-2xl border border-dashed border-mint/30 bg-gradient-to-br from-mint/5 to-transparent p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-mint">Convite do candidato</div>
                <button
                  type="button"
                  onClick={copyInviteCode}
                  title="Copiar código"
                  className="inline-flex items-center gap-1 rounded-full bg-mint/15 px-2 py-0.5 font-mono text-[10px] font-bold text-mint transition hover:bg-mint/25"
                >
                  {sim.roomCode}
                  {codeCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>

              <button
                onClick={copyInviteLink}
                className="mt-2 flex w-full items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-left transition hover:border-mint/50"
              >
                <Link2 className="h-3.5 w-3.5 shrink-0 text-mint" />
                <span className="flex-1 truncate font-mono text-[11px] text-foreground">revmed.app.br/convite/{sim.roomCode}</span>
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
          )}

          <RelatedResources
            specialty={station.specialty}
            title={station.title}
            stationId={station.id}
            show={{ flashcard: true, resumo: true }}
            excludeStationId={station.id}
            heading="Sugestões para este tema"
            className="p-3"
          />

          {/* Progresso do simulado — só faz sentido com 2+ estações */}
          {sim.stations.length >= 2 && (
            <div className="rounded-2xl border border-dashed border-mint/30 bg-gradient-to-br from-mint/5 to-transparent p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-mint">Progresso do simulado</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Estação <span className="font-bold text-foreground">{sim.currentIndex + 1}</span> de <span className="font-bold text-foreground">{sim.stations.length}</span>
              </div>
              <div className="mt-2 flex gap-1">
                {sim.stations.map((_, i) => (
                  <div key={i} className={cn(
                    "h-1.5 flex-1 rounded-full",
                    i < sim.currentIndex ? "bg-mint" : i === sim.currentIndex ? "bg-mint/60" : "bg-muted",
                  )} />
                ))}
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground/70 italic">
                Os títulos das próximas estações ficam ocultos para não revelar o conteúdo ao candidato.
              </div>
            </div>
          )}
        </aside>

      </div>

      <Sheet open={controlsOpen} onOpenChange={setControlsOpen}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto p-4 sm:max-w-lg">
          <SheetHeader className="mb-3">
            <SheetTitle className="text-base">Controles da estação</SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            {/* Timer */}
            <div className="rounded-2xl border border-border bg-gradient-hero p-4 text-white shadow-elegant">
              <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-white/70">
                {running ? "Em andamento" : finishedStation ? "Encerrada" : "Aguardando início"}
              </div>
              <div className={cn("mt-2 rounded-xl px-5 py-6 text-center transition-colors", running ? "bg-mint/15" : "bg-white/5")}>
                <div className="font-display text-4xl font-bold tabular-nums text-white sm:text-5xl">{mm}:{ss}</div>
                {isWaiting && (
                  <div className="mt-3">
                    <Select value={String(duration)} onValueChange={(v) => { const n = Number(v); setDuration(n); setRemaining(Math.round(n * 60)); if (sim?.roomId) { void supabase.from("training_rooms").update({ duration_minutes: n }).eq("id", sim.roomId); } }}>
                      <SelectTrigger className="mx-auto h-8 w-auto gap-1 border-white/20 bg-white/10 px-3 text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.0833">5 segundos (teste)</SelectItem>
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
                <button
                  type="button"
                  onClick={() => {
                    if (!hasEvaluated) {
                      toast.error("Selecione primeiro o candidato avaliado.");
                      setSelectCandidateOpen(true);
                      return;
                    }
                    if (!actorInCall) {
                      toast.error("Entre na chamada de voz para poder iniciar.");
                      return;
                    }
                    if (!candidateInCall) {
                      toast.error("Aguardando o candidato selecionado entrar na chamada de voz.");
                      return;
                    }
                    startTimer();
                    setControlsOpen(false);
                  }}
                  style={allReadyToStart ? { color: "var(--medical)" } : undefined}
                  className={cn(
                    "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition active:scale-[0.98]",
                    allReadyToStart
                      ? "bg-white hover:bg-white/90 hover:shadow"
                      : "bg-white/30 text-white/70 hover:bg-white/40",
                  )}
                  title={
                    !hasEvaluated
                      ? "Selecione o candidato avaliado"
                      : !actorInCall
                        ? "Entre na chamada de voz"
                        : !candidateInCall
                          ? "Aguardando o candidato entrar na chamada"
                          : undefined
                  }
                >
                  <Play className="h-4 w-4" /> Iniciar cronômetro
                </button>
              )}
              {isWaiting && (
                <div className="mt-2 rounded-xl border border-medical/25 bg-medical/5 p-3">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-medical">
                    Para iniciar o cronômetro
                  </div>
                  <ul className="space-y-1.5">
                    {[
                      { ok: hasEvaluated, label: "Selecionar o candidato avaliado" },
                      { ok: actorInCall, label: "Você (ator) precisa entrar na chamada de voz" },
                      { ok: candidateInCall, label: hasEvaluated ? "O candidato selecionado precisa entrar na chamada" : "Após selecionar, o candidato entra na chamada" },
                    ].map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11.5px] leading-snug">
                        <span
                          className={cn(
                            "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                            r.ok
                              ? "border-mint bg-mint/20 text-mint"
                              : "border-medical/50 text-medical/70",
                          )}
                        >
                          {r.ok ? "✓" : "•"}
                        </span>
                        <span className={r.ok ? "text-white/85 line-through decoration-mint/40" : "text-white/80"}>
                          {r.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {running && (
                <button
                  type="button"
                  onClick={() => { void finishTimer(); setControlsOpen(false); }}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-[0.98]"
                >
                  Encerrar estação
                </button>
              )}
              {finishedStation && (
                <div className="mt-3 rounded-lg bg-mint/10 px-3 py-2 text-center text-xs text-mint">
                  Estação encerrada — preencha o PEP abaixo.
                </div>
              )}
            </div>

            {station && (
              <div className="rounded-2xl border border-mint/30 bg-gradient-to-br from-night via-night to-night/80 p-4 text-white shadow-elegant">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                    Resultado (ao vivo)
                  </div>
                  <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-semibold text-mint">
                    {totals.scored}/{totals.count} itens
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-center gap-1">
                  <span className="font-display text-4xl font-bold tabular-nums text-mint">
                    {((totals.total > 0 ? (totals.earned / totals.total) * 10 : 0)).toFixed(2)}
                  </span>
                  <span className="text-sm text-white/60">/ 10</span>
                </div>
                <div className="mt-1 text-center text-[11px] text-white/60">
                  {totals.earned.toFixed(2)} de {totals.total.toFixed(2)} pts
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-mint transition-all" style={{ width: `${totals.count > 0 ? (totals.scored / totals.count) * 100 : 0}%` }} />
                </div>
                <div className="mt-2 text-center text-[10px] text-white/50">
                  Visível só para você — atualiza conforme preenche o PEP
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Participantes ({candidates.length})
                </div>
                <button
                  type="button"
                  onClick={() => { setInviteOpen(true); setControlsOpen(false); }}
                  className="inline-flex items-center gap-1 rounded-full border border-mint/40 bg-mint/10 px-2 py-0.5 text-[10px] font-semibold text-mint transition hover:bg-mint/20"
                >
                  <UserPlus className="h-3 w-3" /> Convidar amigo
                </button>
              </div>
              {!evaluatedCandidateId && candidates.length >= 2 && !running && (
                <div className="mt-2 rounded-xl border border-mint/40 bg-mint/10 px-3 py-2 text-xs font-medium text-mint">
                  👇 Selecione o próximo candidato a ser avaliado
                </div>
              )}
              {candidates.length === 0 ? (
                <div className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  <UserPlus className="h-4 w-4" />
                  Aguardando participantes.
                </div>
              ) : (
                <div className="mt-2 space-y-3">
                  {/* Candidato avaliado */}
                  {evaluatedCandidateId && (
                    <div>
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-mint">
                        Candidato avaliado
                      </div>
                      <ul className="space-y-1.5">
                        {candidates
                          .filter((c) => c.id === evaluatedCandidateId)
                          .map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                onClick={() => setEvaluatedCandidate(c.id)}
                                disabled={!isWaiting}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                                  "border-mint/50 bg-mint/10 text-foreground",
                                  !isWaiting && "cursor-default",
                                )}
                                title={!isWaiting ? "Candidato travado após o início da estação" : undefined}
                              >
                                <UserAvatar avatarUrl={c.avatarUrl} name={c.name} size="sm" />
                                <span className="flex-1 truncate font-medium">{c.name}</span>
                                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-mint bg-mint/20">
                                  <CheckCheck className="h-3 w-3 text-mint" />
                                </span>
                                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-mint" />
                              </button>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {/* Espectadores */}
                  {candidates.filter((c) => c.id !== evaluatedCandidateId).length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Espectadores
                      </div>
                      <ul className="space-y-1.5">
                        {candidates
                          .filter((c) => c.id !== evaluatedCandidateId)
                          .map((c) => {
                            const isEvaluated = c.id === evaluatedCandidateId;
                            return (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  onClick={() => setEvaluatedCandidate(c.id)}
                                  disabled={!isWaiting}
                                  className={cn(
                                    "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                                    "border-border bg-background/40 text-foreground hover:border-mint/40",
                                    !isWaiting && !isEvaluated && "opacity-50 cursor-not-allowed",
                                  )}
                                  title={!isWaiting ? "Candidato travado após o início da estação" : undefined}
                                >
                                  <UserAvatar avatarUrl={c.avatarUrl} name={c.name} size="sm" />
                                  <span className="flex-1 truncate font-medium">{c.name}</span>
                                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/40" />
                                </button>
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {sim.roomCode && (
              <div className="rounded-2xl border border-dashed border-mint/30 bg-gradient-to-br from-mint/5 to-transparent p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-mint">Convite do candidato</div>
                  <button
                    type="button"
                    onClick={copyInviteCode}
                    title="Copiar código"
                    className="inline-flex items-center gap-1 rounded-full bg-mint/15 px-2 py-0.5 font-mono text-[10px] font-bold text-mint transition hover:bg-mint/25"
                  >
                    {sim.roomCode}
                    {codeCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>

                <button
                  onClick={copyInviteLink}
                  className="mt-2 flex w-full items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-left transition hover:border-mint/50"
                >
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-mint" />
                  <span className="flex-1 truncate font-mono text-[11px] text-foreground">revmed.app.br/convite/{sim.roomCode}</span>
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
            )}

            <RelatedResources
              specialty={station.specialty}
              title={station.title}
              stationId={station.id}
              show={{ flashcard: true, resumo: true }}
              excludeStationId={station.id}
              heading="Sugestões para este tema"
              className="p-3"
            />

            {sim.stations.length >= 2 && (
              <div className="rounded-2xl border border-dashed border-mint/30 bg-gradient-to-br from-mint/5 to-transparent p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-mint">Progresso do simulado</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Estação <span className="font-bold text-foreground">{sim.currentIndex + 1}</span> de <span className="font-bold text-foreground">{sim.stations.length}</span>
                </div>
                <div className="mt-2 flex gap-1">
                  {sim.stations.map((_, i) => (
                    <div key={i} className={cn(
                      "h-1.5 flex-1 rounded-full",
                      i < sim.currentIndex ? "bg-mint" : i === sim.currentIndex ? "bg-mint/60" : "bg-muted",
                    )} />
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground/70 italic">
                  Os títulos das próximas estações ficam ocultos para não revelar o conteúdo ao candidato.
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {zoomImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 cursor-zoom-out animate-in fade-in" onClick={() => setZoomImage(null)}>
          <button type="button" onClick={(e) => { e.stopPropagation(); setZoomImage(null); }}
            className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 text-white h-10 w-10 flex items-center justify-center text-xl">×</button>
          <img src={zoomImage.src} alt={zoomImage.alt} onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full object-contain rounded-md shadow-2xl cursor-zoom-in"
            style={{ touchAction: 'pan-x pan-y pinch-zoom' }} />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
            Clique fora ou pressione × para fechar
          </div>
        </div>
      )}
      {sim?.roomId && current?.id && (
        <InviteUserDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          roomId={sim.roomId}
          stationId={current.id}
        />
      )}
      <Dialog open={selectCandidateOpen} onOpenChange={setSelectCandidateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecione o candidato</DialogTitle>
            <DialogDescription>
              Escolha quem será avaliado nesta estação antes de iniciar o cronômetro.
            </DialogDescription>
          </DialogHeader>
          {candidates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum participante na sala ainda. Compartilhe o link de convite.
            </div>
          ) : (
            <ul className="space-y-2">
              {candidates.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={async () => {
                      await setEvaluatedCandidate(c.id);
                      setSelectCandidateOpen(false);
                      setTimeout(() => { void startTimer(); }, 50);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-2.5 text-left text-sm transition hover:border-mint/50 hover:bg-mint/5"
                  >
                    <UserAvatar avatarUrl={c.avatarUrl} name={c.name} size="sm" />
                    <span className="flex-1 truncate font-medium">{c.name}</span>
                    <ArrowRight className="h-4 w-4 text-mint" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
    {sim?.roomCode && (
      <RoomVideoCall
        roomCode={sim.roomCode}
        displayName={(profile?.full_name?.trim()) || user?.email || "Ator"}
        role="ator"
        allowedIdentities={[user?.id, evaluatedCandidateId]}
        onIdentitiesChange={handleCallIdentities}
        permissionsKey={`${evaluatedCandidateId ?? "none"}:${roomStatus}`}
      />
    )}
    <button
      type="button"
      onClick={() => setControlsOpen(true)}
      className="fixed bottom-20 right-5 z-[65] inline-flex h-12 items-center gap-2 rounded-full bg-gradient-hero px-4 text-sm font-semibold text-white shadow-elegant ring-1 ring-mint/30 transition hover:scale-[1.02] active:scale-[0.98] lg:hidden"
      aria-label="Abrir controles da estação"
    >
      <SlidersHorizontal className="h-4 w-4" />
      <span className="hidden sm:inline">Controles</span>
      <span className="font-mono text-[11px] text-white/80">{mm}:{ss}</span>
    </button>
    </>
  );
}
