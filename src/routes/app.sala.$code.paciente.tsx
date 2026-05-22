import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { RoomVideoCall } from "@/components/room/RoomVideoCall";
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
  Square, Check, Share2, Mail, MessageCircle, Lock, Unlock, ChevronDown, BookOpen, BarChart3, MessageSquareWarning, ShieldCheck, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import ecgRitmoSinusal from "@/assets/ecg-ritmo-sinusal.jpg";
import aranhaArmadeira from "@/assets/aranha-armadeira.jpeg";
import { UserAvatar } from "@/components/UserAvatar";
import { InviteUserDialog } from "@/components/InviteUserDialog";
import { cancelRoom, cancelRoomBeacon } from "@/lib/roomCancel";
import { NOTA_DE_CORTE } from "@/components/SpecialtyMedals";
import { StationSummaryDialog } from "@/components/StationSummaryDialog";
import { RelatedResources } from "@/components/RelatedResources";

export const Route = createFileRoute("/app/sala/$code/paciente")({
  component: ActorView,
  head: () => ({ meta: [{ title: "Estação — Ator" }] }),
});

type Room = { id: string; code: string; station_id: string; station_title: string; status: string; started_at: string | null; duration_minutes: number | null; evaluated_candidate_id: string | null };
type Delivery = { id: string; material_id: string; material_name: string };
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

function formatPepHeading(index: number, category: string | null | undefined, description: string): string {
  const cleanCategory = (category ?? "").replace(/^\s*\d+\s*[.)\-–—]\s*/, "").trim();
  if (cleanCategory) {
    const needsPunctuation = !/[:.;!?]$/.test(cleanCategory);
    const punctuation = needsPunctuation ? (/\(\d+\)\s*/.test(description) ? ":" : ".") : "";
    return `${index + 1}. ${cleanCategory}${punctuation}`;
  }
  return `${index + 1}. ${description.replace(/^\s*\d+\s*[.)\-–—]\s*/, "").trim()}`;
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

function levelTone(points: number, maxPoints: number): { idle: string; active: string } {
  // Idle = apenas o número, sem caixa. Selecionado = pill colorido por magnitude:
  // 0 = vermelho, máximo = verde, intermediário = âmbar.
  const base = "text-muted-foreground hover:text-foreground";
  const ratio = maxPoints > 0 ? points / maxPoints : 0;
  if (ratio <= 0) return { idle: base, active: "bg-rose-500/85 text-white shadow-sm ring-1 ring-rose-400/60" };
  if (ratio >= 1) return { idle: base, active: "bg-emerald-500/85 text-white shadow-sm ring-1 ring-emerald-400/60" };
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);
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
  const finishingRef = useRef(false);
  const latestReviewRef = useRef<{
    checks: Record<string, number>;
    comments: Record<string, string>;
    feedback: string;
    evalStatus: "em_andamento" | "aprovado" | "reprovado" | "repetir";
    allScored: boolean;
    pct: number;
    score: number;
  }>({
    checks: {},
    comments: {},
    feedback: "",
    evalStatus: "em_andamento",
    allScored: false,
    pct: 0,
    score: 0,
  });

  async function refreshCandidates(roomId: string): Promise<Candidate[]> {
    const { data: parts } = await supabase.from("training_room_participants")
      .select("user_id, role, display_name").eq("room_id", roomId);
    const candUsers = (parts ?? []).filter((p: { role: string }) => p.role === "candidato");
    if (candUsers.length === 0) {
      setCandidates([]);
      return [];
    }
    const ids = candUsers.map((c: { user_id: string }) => c.user_id);
    const { data: profs } = await supabase.from("profiles")
      .select("id, full_name, title, avatar_url").in("id", ids);
    const profMap = new Map((profs ?? []).map((p: { id: string; full_name: string | null; title: string | null; avatar_url: string | null }) => [p.id, p]));
    const dispMap = new Map(candUsers.map((c: { user_id: string; display_name: string | null }) => [c.user_id, c.display_name]));
    const list: Candidate[] = ids.map((id: string) => {
      const prof = profMap.get(id);
      const raw = (prof?.full_name ?? dispMap.get(id)) as string | null | undefined;
      return { id, name: formatCandidateName(raw, prof?.title, id), avatarUrl: prof?.avatar_url ?? null };
    });
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
      // Auto-select apenas se houver UM único candidato. Com 2+ o ator escolhe quem é o da vez.
      if (!(r as Room).evaluated_candidate_id && list.length === 1) {
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
          setPreviewEnabled(!!(ev as { preview_for_candidate?: boolean }).preview_for_candidate);
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

  // Auto-cancel the session if the actor leaves (unmount / tab close / reload)
  // while the room is still active. This kicks both sides out cleanly.
  const cancelStateRef = useRef<{ roomId: string | null; status: string; token: string | null }>({ roomId: null, status: "", token: null });
  useEffect(() => {
    cancelStateRef.current.roomId = room?.id ?? null;
    cancelStateRef.current.status = room?.status ?? "";
  }, [room?.id, room?.status]);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) cancelStateRef.current.token = data.session?.access_token ?? null;
    });
    const onBeforeUnload = () => {
      const s = cancelStateRef.current;
      if (!s.roomId) return;
      if (s.status === "finished" || s.status === "cancelled") return;
      cancelRoomBeacon(s.roomId, s.token);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      mounted = false;
      window.removeEventListener("beforeunload", onBeforeUnload);
      const s = cancelStateRef.current;
      if (s.roomId && s.status !== "finished" && s.status !== "cancelled") {
        void cancelRoom(s.roomId);
      }
    };
  }, []);

  // React to room cancellation (e.g. candidate left mid-session)
  const actorCancelledHandledRef = useRef(false);
  useEffect(() => {
    if (room?.status === "cancelled" && !actorCancelledHandledRef.current) {
      actorCancelledHandledRef.current = true;
      try {
        localStorage.removeItem("ator:activeRoom");
        window.dispatchEvent(new Event("ator:activeRoom"));
      } catch {}
      toast.error("A sessão foi encerrada — o candidato saiu da sala. Estação cancelada.");
      nav({ to: "/app" });
    }
  }, [room?.status, nav]);

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
        setPreviewEnabled(!!(ev as { preview_for_candidate?: boolean }).preview_for_candidate);
      } else {
        setChecks({}); setComments({}); setFeedback(""); setEvalStatus("em_andamento"); setPreviewEnabled(false);
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
        const row = payload.new as { user_id: string; role: string; display_name: string | null };
        if (row.role === "candidato") {
          const { data: prof } = await supabase.from("profiles")
            .select("full_name, title, avatar_url").eq("id", row.user_id).maybeSingle();
          const name = formatCandidateName(prof?.full_name ?? row.display_name, prof?.title, row.user_id);
          const avatarUrl = prof?.avatar_url ?? null;
          setCandidates((prev) => prev.some((c) => c.id === row.user_id) ? prev : [...prev, { id: row.user_id, name, avatarUrl }]);
          toast.success(`${name} entrou na sala`);
          if (!room.evaluated_candidate_id) {
            await supabase.from("training_rooms").update({ evaluated_candidate_id: row.user_id }).eq("id", room.id);
          }
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "training_room_participants", filter: `room_id=eq.${room.id}` }, async () => {
        await refreshCandidates(room.id);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "training_room_participants", filter: `room_id=eq.${room.id}` }, async () => {
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
        // Clamp: se started_at está no futuro (intro ainda rodando), mantém total.
        const left = Math.max(0, Math.min(totalSec, totalSec - elapsed));
        setRemaining(left);
        if (left <= 0 && elapsed >= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          void finishStation(true);
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
  latestReviewRef.current = { checks, comments, feedback, evalStatus, allScored, pct, score };

  // Auto-preencher status com base na nota de corte oficial do INEP (NOTA_DE_CORTE)
  useEffect(() => {
    if (!allScored) return;
    const auto = pct >= NOTA_DE_CORTE ? "aprovado" : "reprovado";
    setEvalStatus((prev) => (prev === auto ? prev : auto));
  }, [allScored, pct]);



  async function deliver(materialId: string) {
    if (!room || !user || !station) return;
    const m = station.deliverableMaterials?.find((x) => x.id === materialId);
    if (!m) return;
    const { error } = await supabase.from("room_material_deliveries").insert({
      room_id: room.id,
      station_id: room.station_id,
      material_id: m.id,
      material_name: m.name,
      material_type: m.type,
      material_description: m.description ?? null,
      material_content: m.content,
      material_image_url: m.imageUrl ?? null,
      delivered_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success(`Entregue: ${m.name}`);
  }

  // Auto-sincroniza a prévia do PEP enquanto estiver habilitada
  useEffect(() => {
    if (!previewEnabled || !room || !user || !room.evaluated_candidate_id) return;
    const t = setTimeout(() => {
      void supabase.from("room_evaluations").upsert({
        room_id: room.id,
        evaluator_id: user.id,
        candidate_id: room.evaluated_candidate_id,
        station_id: room.station_id,
        checks,
        item_comments: comments,
        final_feedback: feedback,
        final_score: Number(score.toFixed(2)),
        status: "em_andamento",
        preview_for_candidate: true,
      }, { onConflict: "room_id,evaluator_id,candidate_id,station_id" });
    }, 400);
    return () => clearTimeout(t);
  }, [previewEnabled, checks, comments, feedback, score, room?.id, room?.evaluated_candidate_id, user?.id, room?.station_id]);

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
      .upsert(payload, { onConflict: "room_id,evaluator_id,candidate_id,station_id" });
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

  async function togglePreview() {
    if (!room || !user) return;
    if (!room.evaluated_candidate_id) return toast.error("Selecione o candidato que será avaliado.");
    const next = !previewEnabled;
    if (next) {
      const ok = window.confirm("Deseja realmente liberar o PEP para o candidato? Ele verá o preenchimento em tempo real.");
      if (!ok) return;
    }
    setPreviewEnabled(next);
    const { error } = await supabase.from("room_evaluations").upsert({
      room_id: room.id,
      evaluator_id: user.id,
      candidate_id: room.evaluated_candidate_id,
      station_id: room.station_id,
      checks,
      item_comments: comments,
      final_feedback: feedback,
      final_score: Number(score.toFixed(2)),
      status: "em_andamento",
      preview_for_candidate: next,
    }, { onConflict: "room_id,evaluator_id,candidate_id,station_id" });
    if (error) {
      setPreviewEnabled(!next);
      return toast.error(error.message);
    }
    toast.success(next ? "PEP liberado para o candidato em tempo real." : "Prévia do PEP ocultada.");
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

  async function finishStation(auto = false) {
    if (!room) return;
    if (finishingRef.current) return;
    finishingRef.current = true;
    const finishedAt = new Date().toISOString();
    const review = latestReviewRef.current;
    if (user && room.evaluated_candidate_id) {
      const resolvedStatus = review.allScored
        ? (review.evalStatus === "em_andamento" ? (review.pct >= NOTA_DE_CORTE ? "aprovado" : "reprovado") : review.evalStatus)
        : "em_andamento";
      const { error: evalError } = await supabase.from("room_evaluations")
        .upsert({
          room_id: room.id,
          evaluator_id: user.id,
          candidate_id: room.evaluated_candidate_id,
          station_id: room.station_id,
          checks: review.checks,
          item_comments: review.comments,
          final_feedback: review.feedback,
          final_score: Number(review.score.toFixed(2)),
          status: resolvedStatus,
          submitted_at: resolvedStatus === "em_andamento" ? null : finishedAt,
          preview_for_candidate: true,
        }, { onConflict: "room_id,evaluator_id,candidate_id,station_id" });
      if (evalError) {
        finishingRef.current = false;
        return toast.error(evalError.message);
      }
    }
    const { error } = await supabase.from("training_rooms")
      .update({ status: "finished", finished_at: finishedAt })
      .eq("id", room.id);
    if (error) {
      finishingRef.current = false;
      return toast.error(error.message);
    }
    setPreviewEnabled(true);
    setRoom((prev) => prev ? { ...prev, status: "finished" } : prev);
    setFinished(true);
    toast.success(auto ? "Tempo encerrado. PEP liberado para o candidato." : "Estação finalizada. PEP liberado para o candidato.");
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
    const text = `Olá! Vamos treinar uma estação no REVMED 🩺\nEntre pelo link: ${inviteLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  function shareEmail() {
    const subject = "Convite para treinar estação — REVMED";
    const body = `Olá!\n\nVocê foi convidado(a) para treinar uma estação clínica.\nEntre pelo link abaixo:\n\n${inviteLink}\n\nCódigo da sala: ${code}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function shareNative() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "REVMED",
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
  const savedActorScript = station.patientScript?.trim() ?? "";
  const actorScriptText = savedActorScript || (p ? formatPatientProfile(p) : "");
  const shouldShowProfileExtras = !savedActorScript && !!p;
  const isRunning = room.status === "running" && !finished;
  const isFinished = finished || room.status === "finished";
  const isWaiting = !isRunning && !isFinished;
  const inviteHost = "revmed.app.br";
  const inviteLink = `https://${inviteHost}/convite/${code}`;
  const inviteLinkDisplay = `${inviteHost}/convite/${code}`;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-4 overflow-x-hidden">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:gap-3">
        <Link to="/app/checklists" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">
            <Theater className="h-3 w-3" /> Painel do Ator
          </span>
          <span>•</span>
          <span className="min-w-0 truncate">{station.specialty}</span>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5">
        {/* LEFT: station content */}
        <div className="min-w-0 space-y-4">
          {/* Title bar like Pense Revalida */}
          <div className="relative min-w-0 overflow-hidden rounded-2xl border border-mint/20 bg-gradient-hero p-4 text-white shadow-elegant sm:rounded-3xl sm:p-6 md:p-8">
            <div
              className="pointer-events-none absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "linear-gradient(hsl(160 60% 60%) 1px, transparent 1px), linear-gradient(90deg, hsl(160 60% 60%) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="relative flex min-w-0 flex-wrap items-start justify-between gap-2 sm:gap-3">
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-mint">
                  <ShieldCheck className="h-3 w-3" /> Painel do ator
                </div>
                <h1 className="mt-3 break-words font-display text-xl font-bold leading-tight sm:text-2xl md:text-3xl">
                  {room.station_title ?? station.title}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-white/70">
                  {(() => {
                    const meta = getSpecialtyMeta(station.specialty);
                    return (
                      <span className={cn("inline-flex h-7 items-center rounded-md px-2.5 text-[12px] font-extrabold tracking-wider", meta.badge)}>
                        {meta.code}
                      </span>
                    );
                  })()}
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-mint" /> {station.specialty}
                  </span>
                </div>
              </div>
              <button
                onClick={copyInviteLink}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-[11px] text-white/80 hover:bg-white/10"
                title="Copiar link de convite"
              >
                <span className="truncate max-w-[160px]">{code}</span>
                {copied ? <Check className="h-3 w-3 text-mint" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
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
              {actorScriptText && (
                <ScriptText text={actorScriptText} strikeable prefix="ps" struck={struckWords} toggle={toggleStruck} />
              )}
              {shouldShowProfileExtras && p?.spontaneous && (
                <SubBlock label="O que falar espontaneamente">
                  <ScriptText text={p.spontaneous} strikeable prefix="sp" struck={struckWords} toggle={toggleStruck} />
                </SubBlock>
              )}
              {shouldShowProfileExtras && p?.doNotReveal && (
                <SubBlock label="Nunca revelar" tone="rose">
                  <ScriptText text={p.doNotReveal} strikeable prefix="dnr" struck={struckWords} toggle={toggleStruck} />
                </SubBlock>
              )}
              {shouldShowProfileExtras && (p?.emotionalTone || p?.actingTips) && (
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
                          {m.imageUrl && (
                            <button
                              type="button"
                              onClick={() => setZoomImage({ src: m.imageUrl!, alt: m.name || "Material" })}
                              className="mb-3 block w-full group relative"
                              title="Clique para ampliar"
                            >
                              <img
                                src={m.imageUrl}
                                alt={m.name || "Material"}
                                className="block w-full h-auto rounded-md border border-border transition-opacity group-hover:opacity-90"
                              />
                              <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">🔍 ampliar</span>
                            </button>
                          )}
                          {m.content
                            ? <ScriptText text={m.content} />
                            : (!isRhythm && !isSpider && !m.imageUrl && <span className="italic text-muted-foreground">Sem conteúdo cadastrado.</span>)}
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
            right={
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-white border-white/30">{totals.scored}/{totals.count}</Badge>
                <button
                  type="button"
                  onClick={togglePreview}
                  title={previewEnabled ? "Ocultar PEP do candidato" : "Mostrar PEP para o candidato em tempo real"}
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                    previewEnabled
                      ? "border-mint/60 bg-mint/20 text-mint hover:bg-mint/30"
                      : "border-white/30 text-white/80 hover:bg-white/10",
                  )}
                  aria-label={previewEnabled ? "Ocultar PEP do candidato" : "Mostrar PEP ao candidato"}
                >
                  {previewEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            }
          >


            <ol className="space-y-3">
              {station.checklist.map((it, idx) => {
                const levels = [...(it.levels ?? [{ label: "Inadequado", points: 0 }, { label: "Adequado", points: it.points }])].sort((a, b) => a.points - b.points);
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
                      "grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 rounded-xl border px-3 py-3 transition-colors sm:gap-x-4 sm:px-4",
                      typeof current === "number"
                        ? "border-mint/30 bg-mint/5"
                        : "border-border bg-background/30",
                      isBlocked && "cursor-not-allowed",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                        <span>{formatPepHeading(idx, it.category, it.description)}</span>
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
                      {(() => { const sorted = [...levels].sort((a, b) => a.points - b.points); const maxPts = Math.max(...sorted.map((l) => l.points)); return sorted.map((lv) => {
                        const selected = current === lv.points;
                        const tone = levelTone(lv.points, maxPts);
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
                      }); })()}
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
                {(() => {
                  const released = evalStatus !== "em_andamento";
                  const canRelease = isFinished && allScored && evalStatus !== "em_andamento";
                  return (
                    <Button
                      variant="hero"
                      onClick={() => save(true)}
                      disabled={saving || !canRelease}
                      title={
                        released
                          ? "PEP já liberado para o candidato"
                          : !isFinished
                          ? "Aguarde a estação terminar"
                          : !allScored
                          ? "Preencha todas as questões do PEP"
                          : evalStatus === "em_andamento"
                          ? "Defina o status (Aprovado/Reprovado/Repetir)"
                          : "Liberar PEP para o candidato"
                      }
                    >
                      {released ? (
                        <><Unlock className="mr-1 h-4 w-4" /> PEP liberado</>
                      ) : (
                        <><Lock className="mr-1 h-4 w-4" /> Liberar PEP para o candidato</>
                      )}
                    </Button>
                  );
                })()}
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

          {/* (Resumo movido para a lateral como botão/modal) */}
        </div>



        {/* RIGHT: control panel (timer, participantes, convite) */}
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-20 lg:self-start">
                  {/* Timer */}
                  <div className="rounded-2xl border border-border bg-gradient-hero p-4 text-white shadow-elegant">
                    <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-white/70">
                      {isRunning ? "Em andamento" : isFinished ? "Encerrada" : "Aguardando início"}
                    </div>
                    <div className={cn(
                      "mt-2 rounded-xl px-5 py-6 text-center transition-colors",
                      isRunning ? "bg-mint/15" : "bg-white/5",
                    )}>
                      <div className="font-display text-4xl font-bold tabular-nums text-white sm:text-5xl">
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
                      <>
                        <Button
                          variant="hero"
                          className="mt-3 w-full"
                          onClick={startStation}
                          disabled={starting || !room.evaluated_candidate_id}
                        >
                          <Play className="mr-1 h-4 w-4" />
                          {!room.evaluated_candidate_id
                            ? "Aguardando candidato..."
                            : "Iniciar cronômetro"}
                        </Button>
                      </>
                    )}
                    {isRunning && (
                      <Button variant="outline" className="mt-3 w-full" onClick={() => finishStation()}>
                        <Square className="mr-1 h-4 w-4" /> Encerrar estação
                      </Button>
                    )}
                    {isFinished && (
                      <div className="mt-3 rounded-lg bg-mint/10 px-3 py-2 text-center text-xs text-mint">
                        Estação encerrada — preencha o PEP abaixo.
                      </div>
                    )}
                  </div>

                  {/* Sugestões de estudo vinculadas à estação (visível para o ator durante toda a sessão) */}
                  <RelatedResources
                    specialty={station.specialty}
                    title={station.title}
                    stationId={station.id}
                    show={{ resumo: true, flashcard: true }}
                    excludeStationId={station.id}
                    heading="Material desta estação"
                    variant="compact"
                  />



                  {/* Resultado */}
                  {/* Resultado ao vivo — visível desde o início para o ator. */}
                  <div className="relative overflow-hidden rounded-2xl border border-mint/20 bg-gradient-to-br from-night via-night to-night/80 p-5 text-white shadow-elegant">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-mint/20 blur-3xl" />
                    <div className="relative">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-mint/90">
                        Resultado ao vivo
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="font-display text-5xl font-bold tabular-nums">{score.toFixed(2)}</span>
                        <span className="text-base text-white/50">/ 10</span>
                      </div>
                      <div className="mt-1 text-[11px] text-white/60">
                        {totals.earned.toFixed(2)} / {totals.total} pts · {pct.toFixed(0)}%
                      </div>

                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-mint via-emerald-400 to-mint transition-all"
                          style={{ width: `${totals.count > 0 ? (totals.scored / totals.count) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="mt-1 text-[10px] text-white/50">
                        Progresso do PEP · {totals.scored}/{totals.count} itens
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                        {(() => {
                          let adq = 0, parc = 0, inad = 0;
                          station.checklist.forEach((it) => {
                            const v = checks[it.id];
                            if (typeof v !== "number") return;
                            const max = it.levels && it.levels.length > 0
                              ? Math.max(...it.levels.map((l) => l.points))
                              : it.points;
                            if (v === 0) inad++;
                            else if (v >= max) adq++;
                            else parc++;
                          });
                          return [
                            { c: "bg-emerald-500", n: adq, l: "Adq." },
                            { c: "bg-amber-500", n: parc, l: "Parc." },
                            { c: "bg-rose-500", n: inad, l: "Inad." },
                          ];
                        })().map((x, i) => (
                          <div key={i} className="rounded-lg border border-white/10 bg-white/5 px-1.5 py-1.5">
                            <div className={cn("mx-auto h-1 w-5 rounded-full", x.c)} />
                            <div className="mt-1 font-display text-base font-bold tabular-nums">{x.n}</div>
                            <div className="text-[9px] uppercase tracking-wider text-white/60">{x.l}</div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] text-white/70">
                        {previewEnabled
                          ? "🔓 Candidato está vendo a nota ao vivo."
                          : "🔒 Visível apenas para você. O candidato só verá ao encerrar."}
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
                      <button
                        type="button"
                        onClick={() => setInviteOpen(true)}
                        className="inline-flex items-center gap-1 rounded-full border border-mint/40 bg-mint/10 px-2 py-0.5 text-[10px] font-semibold text-mint transition hover:bg-mint/20"
                      >
                        <UserPlus className="h-3 w-3" /> Convidar amigo
                      </button>
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
                                <UserAvatar avatarUrl={c.avatarUrl} name={c.name} size="sm" />
                                <span className="flex-1 truncate font-medium">{c.name}</span>
                                <span className={cn(
                                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                                  isEvaluated ? "border-mint bg-mint/20" : "border-muted-foreground/40",
                                )}>
                                  {isEvaluated && <CheckCheck className="h-3 w-3 text-mint" />}
                                </span>
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

                  {/* Resumo de apoio (somente ator) */}
                  <StationSummaryDialog
                    specialty={station.specialty}
                    title={room.station_title ?? station.title}
                    stationId={station.id}
                    triggerLabel="Ver resumo da estação"
                  />

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

      {room && (
        <InviteUserDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          roomId={room.id}
          stationId={room.station_id}
        />
      )}


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
      {room && (
        <RoomVideoCall
          roomCode={room.code}
          displayName={user?.user_metadata?.full_name ?? user?.email ?? undefined}
          role="ator"
          allowedIdentities={[user?.id, room.evaluated_candidate_id]}
        />
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
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <header className="flex min-w-0 items-center justify-between gap-2 bg-gradient-hero px-3 py-3 text-sm font-medium text-white shadow-elegant sm:gap-3 sm:px-4">
        <span className="inline-flex min-w-0 items-center gap-2 leading-snug">
          <Icon className="h-4 w-4 text-mint" /> {title}
        </span>
        {right}
      </header>
      <div className="min-w-0 p-4 text-sm sm:p-5">{children}</div>
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
      return <strong className="font-bold text-foreground">{children}</strong>;
    }
    const isStruck = struck.has(id);
    return (
      <strong
        onClick={() => toggle(id)}
        className={cn(
          "font-bold text-foreground cursor-pointer rounded px-0.5 transition-colors select-none",
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
