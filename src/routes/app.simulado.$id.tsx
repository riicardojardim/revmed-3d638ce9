import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { loadStation, type LoadedStation } from "@/lib/stationLoader";
import { getSimulado, saveSimulado, type Simulado, type SimuladoStationState } from "@/lib/simulado";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import {
  ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, Lock, Trophy,
  MessageSquare, ListChecks, Theater, Inbox, FileText, PackageCheck, Send,
  Play, Square, ChevronDown, BookOpen, Link2, BarChart3, MessageSquareWarning, MessageCircle, UserPlus, CheckCheck, Copy, Check, Share2, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PRBlock, SubBlock, ScriptText, parseSubItems, levelTone, formatPatientProfile } from "@/components/station/shared";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import ecgRitmoSinusal from "@/assets/ecg-ritmo-sinusal.jpg";
import aranhaArmadeira from "@/assets/aranha-armadeira.jpeg";

export const Route = createFileRoute("/app/simulado/$id")({
  component: SimuladoRunner,
  head: () => ({ meta: [{ title: "Simulado — Estação Revalida" }] }),
});

type Candidate = { id: string; name: string };

function SimuladoRunner() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [sim, setSim] = useState<Simulado | null>(null);
  const [station, setStation] = useState<LoadedStation | null>(null);
  const [loading, setLoading] = useState(true);

  // Per-station UI/run state (resets when index changes)
  const [running, setRunning] = useState(false);
  const [finishedStation, setFinishedStation] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [duration, setDuration] = useState(10);
  const [delivered, setDelivered] = useState<Set<string>>(new Set());
  const [previewMaterialId, setPreviewMaterialId] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<{ src: string; alt: string } | null>(null);
  const [highlights, setHighlights] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [evalStatus, setEvalStatus] = useState<"em_andamento" | "aprovado" | "reprovado" | "repetir">("em_andamento");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const tickRef = useRef<number | null>(null);

  // Room / participants state
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [evaluatedCandidateId, setEvaluatedCandidateId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load simulado
  useEffect(() => {
    if (!user) return;
    const s = getSimulado(user.id, id);
    if (!s) { toast.error("Simulado não encontrado."); nav({ to: "/app/treinar" }); return; }
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
        await supabase.from("training_rooms")
          .update({ station_id: cur.id, station_title: cur.title, status: "waiting", started_at: null })
          .eq("id", sim.roomId);
        const { data: r } = await supabase.from("training_rooms")
          .select("evaluated_candidate_id").eq("id", sim.roomId).maybeSingle();
        if (!cancelled) setEvaluatedCandidateId((r?.evaluated_candidate_id as string | null) ?? null);
        await refreshCandidates(sim.roomId);
        return;
      }
      // Create the room with a short, friendly code.
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const cur = sim.stations[sim.currentIndex];
      const { data: created, error } = await supabase.from("training_rooms").insert({
        code,
        host_id: user.id,
        station_id: cur.id,
        station_title: cur.title,
        mode: "simulado",
        status: "waiting",
        duration_minutes: station.durationMinutes ?? 10,
      }).select("id, code").single();
      if (error || !created) { console.error(error); return; }
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
        path: `/app/simulado/${sim.id}`,
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
      .select("user_id, role").eq("room_id", roomId);
    const candUsers = (parts ?? []).filter((p: { role: string }) => p.role === "candidato");
    if (candUsers.length === 0) { setCandidates([]); return; }
    const ids = candUsers.map((c: { user_id: string }) => c.user_id);
    const { data: profs } = await supabase.from("profiles")
      .select("id, full_name").in("id", ids);
    const map = new Map((profs ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]));
    setCandidates(ids.map((uid: string) => ({ id: uid, name: map.get(uid) ?? "Candidato" })));
  }

  // Realtime: participants + room updates
  useEffect(() => {
    if (!sim?.roomId) return;
    const roomId = sim.roomId;
    const ch = supabase.channel(`simulado-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "training_room_participants", filter: `room_id=eq.${roomId}` }, async (payload) => {
        await refreshCandidates(roomId);
        if (payload.eventType === "INSERT") {
          const row = payload.new as { user_id: string; role: string };
          if (row.role === "candidato") {
            const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", row.user_id).maybeSingle();
            toast.success(`${prof?.full_name ?? "Candidato"} entrou no simulado`);
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "training_rooms", filter: `id=eq.${roomId}` }, (payload) => {
        const row = payload.new as { evaluated_candidate_id: string | null };
        setEvaluatedCandidateId(row.evaluated_candidate_id ?? null);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sim?.roomId]);

  async function setEvaluatedCandidate(candId: string) {
    if (!sim?.roomId) return;
    if (running) return toast.error("Encerre a estação atual antes de trocar o avaliado.");
    const { error } = await supabase.from("training_rooms")
      .update({ evaluated_candidate_id: candId }).eq("id", sim.roomId);
    if (error) return toast.error(error.message);
    setEvaluatedCandidateId(candId);
    const name = candidates.find((c) => c.id === candId)?.name ?? "Candidato";
    toast.success(`Avaliado: ${name}`);
  }

  async function copyInviteLink() {
    const link = `https://estacaorevalida.com.br/e/${sim?.roomCode ?? ""}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success("Link copiado");
    } catch { toast.error("Não foi possível copiar."); }
  }
  function shareWhatsApp() {
    const link = `https://estacaorevalida.com.br/e/${sim?.roomCode ?? ""}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Vamos treinar um simulado no Estação Revalida 🩺\nEntre: ${link}`)}`, "_blank", "noopener,noreferrer");
  }
  function shareEmail() {
    const link = `https://estacaorevalida.com.br/e/${sim?.roomCode ?? ""}`;
    window.location.href = `mailto:?subject=${encodeURIComponent("Convite — Simulado Estação Revalida")}&body=${encodeURIComponent(`Entre pelo link: ${link}\n\nCódigo: ${sim?.roomCode ?? ""}`)}`;
  }
  async function shareNative() {
    const link = `https://estacaorevalida.com.br/e/${sim?.roomCode ?? ""}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try { await navigator.share({ title: "Estação Revalida", text: "Entre no simulado:", url: link }); return; } catch {}
    }
    copyInviteLink();
  }

  // Timer
  useEffect(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          tickRef.current = null;
          setRunning(false);
          setFinishedStation(true);
          toast.success("Tempo encerrado — preencha o PEP.");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [running]);

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
    updateCurrent((s) => {
      const c = { ...s.checks };
      if (c[itemId] === points) delete c[itemId];
      else c[itemId] = points;
      const earned = Object.values(c).reduce((a, b) => a + b, 0);
      const maxScore = station ? station.checklist.reduce((a, it) => a + it.points, 0) : s.maxScore;
      const completed = station ? Object.keys(c).length === station.checklist.length : false;
      return { ...s, checks: c, score: earned, maxScore, completed };
    });
  }

  function startTimer() {
    setRunning(true);
    setFinishedStation(false);
  }
  function finishTimer() {
    setRunning(false);
    setFinishedStation(true);
  }
  function deliverMat(matId: string) {
    setDelivered((d) => { const n = new Set(d); n.add(matId); return n; });
  }

  function goNext() {
    if (!sim || !allScored) return;
    if (sim.currentIndex < sim.stations.length - 1) {
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
          <Button asChild variant="outline"><Link to="/app/treinar"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link></Button>
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
  const totalSec = Math.max(0, Math.floor(remaining));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  const progress = ((sim.currentIndex + (allScored ? 1 : 0)) / sim.stations.length) * 100;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* Progress header */}
      <div className="sticky top-16 z-20 -mx-4 border-y border-border bg-background/95 px-4 py-3 backdrop-blur-xl lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <Link to="/app/treinar" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Sair
          </Link>
          <div className="text-sm font-semibold">{sim.name}</div>
          <Badge variant="outline" className="ml-auto">
            Estação {sim.currentIndex + 1} de {sim.stations.length}
          </Badge>
        </div>
        <div className="mx-auto mt-2 h-1.5 max-w-7xl overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-mint transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div className="space-y-4">
          {/* Title bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("inline-flex h-7 items-center rounded-md px-2 text-xs font-bold", meta.badge)}>{meta.code}</span>
              <h1 className="truncate font-display text-lg font-bold text-foreground md:text-xl">{station.title}</h1>
            </div>
            <span className="text-xs text-muted-foreground">{station.specialty}</span>
          </div>

          <PRBlock icon={MessageSquare} title="Cenário de atuação">
            <ScriptText text={station.clinicalCase} />
          </PRBlock>

          <PRBlock icon={ListChecks} title={`Nos ${duration} minutos de duração da estação, você deverá executar as seguintes tarefas`}>
            <ScriptText text={station.candidateTask} />
          </PRBlock>

          <PRBlock icon={Theater} title="Orientações do Ator/Atriz">
            {station.patientScript && <ScriptText text={station.patientScript} />}
            {p && <div className="mt-4"><ScriptText text={formatPatientProfile(p)} /></div>}
            {p?.spontaneous && <SubBlock label="O que falar espontaneamente"><ScriptText text={p.spontaneous} /></SubBlock>}
            {p?.doNotReveal && <SubBlock label="Nunca revelar" tone="rose"><ScriptText text={p.doNotReveal} /></SubBlock>}
            {(p?.emotionalTone || p?.actingTips) && (
              <SubBlock label="Tom emocional e atuação">
                {p?.emotionalTone && <p><span className="font-medium">Tom:</span> {p.emotionalTone}</p>}
                {p?.actingTips && <p className="mt-1"><span className="font-medium">Dicas:</span> {p.actingTips}</p>}
              </SubBlock>
            )}
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
                        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
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
                          {m.content || (!isRhythm && !isSpider && <span className="italic text-muted-foreground">Sem conteúdo cadastrado.</span>)}
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
            right={<Badge variant="outline" className="text-white border-white/30">{totals.scored}/{totals.count}</Badge>}
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
                      "grid grid-cols-[1fr_auto] gap-x-4 rounded-xl border px-4 py-3 transition-colors",
                      typeof cur === "number" ? "border-mint/30 bg-mint/5" : "border-border bg-background/30",
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
                        onChange={(e) => setComments((c) => ({ ...c, [it.id]: e.target.value }))}
                        placeholder="Comentário (opcional)"
                        rows={2}
                        className="mt-3"
                        disabled={!finishedStation}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1 tabular-nums">
                      {(() => { const maxPts = Math.max(...levels.map((l) => l.points)); return levels.map((lv) => {
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
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                placeholder="Pontos fortes, pontos a melhorar..."
                className="mt-2"
                disabled={!finishedStation}
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
        <aside className="lg:sticky lg:top-32 lg:self-start space-y-3">
          {/* Timer */}
          <div className="rounded-2xl border border-border bg-gradient-hero p-4 text-white shadow-elegant">
            <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-white/70">
              {running ? "Em andamento" : finishedStation ? "Encerrada" : "Aguardando início"}
            </div>
            <div className={cn("mt-2 rounded-xl px-5 py-6 text-center transition-colors", running ? "bg-mint/15" : "bg-white/5")}>
              <div className="font-display text-5xl font-bold tabular-nums text-white">{mm}:{ss}</div>
              {isWaiting && (
                <div className="mt-3">
                  <Select value={String(duration)} onValueChange={(v) => { const n = Number(v); setDuration(n); setRemaining(Math.round(n * 60)); }}>
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
            {isWaiting && (() => {
              const canStart = !!evaluatedCandidateId;
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (!canStart) { toast.error("Selecione o candidato avaliado antes de iniciar."); return; }
                    startTimer();
                  }}
                  disabled={!canStart}
                  style={canStart ? { color: "var(--medical)" } : undefined}
                  className={cn(
                    "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition active:scale-[0.98]",
                    canStart ? "bg-white hover:bg-white/90 hover:shadow" : "bg-white/10 text-white/60 cursor-not-allowed border border-white/20",
                  )}
                >
                  <Play className="h-4 w-4" /> {canStart ? "Iniciar cronômetro" : "Aguardando candidato…"}
                </button>
              );
            })()}
            {running && (
              <button
                type="button"
                onClick={finishTimer}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-[0.98]"
              >
                <Square className="h-4 w-4" /> Encerrar estação
              </button>
            )}
            {finishedStation && (
              <div className="mt-3 rounded-lg bg-mint/10 px-3 py-2 text-center text-xs text-mint">
                Estação encerrada — preencha o PEP abaixo.
              </div>
            )}
          </div>

          {/* Resultado */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Resultado</div>
            <div className="mt-2 rounded-xl bg-background/60 px-4 py-3 text-center">
              <div className="font-display text-xl font-bold tabular-nums text-mint">{totals.earned.toFixed(2)}</div>
            </div>
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
                  const isEvaluated = c.id === evaluatedCandidateId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setEvaluatedCandidate(c.id)}
                        disabled={running && !isEvaluated}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                          isEvaluated
                            ? "border-mint/50 bg-mint/10 text-foreground"
                            : "border-border bg-background/40 text-foreground hover:border-mint/40",
                          running && !isEvaluated && "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <span className={cn(
                          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                          isEvaluated ? "border-mint bg-mint/20" : "border-muted-foreground/40",
                        )}>
                          {isEvaluated && <CheckCheck className="h-3 w-3 text-mint" />}
                        </span>
                        <span className="flex-1 truncate font-medium">{c.name}</span>
                        {isEvaluated && <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-mint" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Convite do candidato */}
          {sim.roomCode && (
            <div className="rounded-2xl border border-dashed border-mint/30 bg-gradient-to-br from-mint/5 to-transparent p-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-mint">Convite do candidato</div>
                <span className="rounded-full bg-mint/15 px-2 py-0.5 font-mono text-[10px] font-bold text-mint">{sim.roomCode}</span>
              </div>
              <button
                onClick={copyInviteLink}
                className="mt-2 flex w-full items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-left transition hover:border-mint/50"
              >
                <Link2 className="h-3.5 w-3.5 shrink-0 text-mint" />
                <span className="flex-1 truncate font-mono text-[11px] text-foreground">estacaorevalida.com.br/e/{sim.roomCode}</span>
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

          {/* Progresso do simulado — sem títulos das próximas estações para não revelar ao candidato */}
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
        </aside>
      </div>

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
    </div>
  );
}
