import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { loadStation, type LoadedStation } from "@/lib/stationLoader";
import { getServerOffset, serverNow } from "@/lib/serverClock";
import { cn } from "@/lib/utils";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import {
  ArrowLeft, Square, MessageSquare, ListChecks, Inbox, FileText, StickyNote,
  Lock, Sparkles, ClipboardCheck, Hourglass, CheckCheck, Play, ShieldCheck, Clock, Eye, EyeOff, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { ScriptText, formatPepHeading, parseSubItems, levelTone } from "@/components/station/shared";
import { StationIntroOverlay, type IntroRole } from "@/components/room/StationIntroOverlay";
import { formatDoctorName } from "@/lib/doctorName";

export const Route = createFileRoute("/app/sala/$code/candidato")({
  component: CandidateView,
  head: () => ({ meta: [{ title: "Estação — Candidato" }] }),
});

type Room = { id: string; code: string; station_id: string; station_title: string; status: string; started_at: string | null; duration_minutes: number | null; evaluated_candidate_id: string | null };
type Delivery = {
  id: string;
  material_id: string;
  material_name: string;
  material_type: string | null;
  material_description: string | null;
  material_content: string | null;
  material_image_url: string | null;
  delivered_at: string;
};

function CandidateView() {
  const { code } = Route.useParams();
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [station, setStation] = useState<LoadedStation | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [notes, setNotes] = useState("");
  const [remaining, setRemaining] = useState(600);
  const [finished, setFinished] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [evaluation, setEvaluation] = useState<{ final_score: number | null; status: string; final_feedback: string | null; checks: Record<string, number>; item_comments: Record<string, string>; preview_for_candidate: boolean } | null>(null);
  const [hideTimer, setHideTimer] = useState(false);
  const [openDeliveries, setOpenDeliveries] = useState<Record<string, boolean>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const savedAttemptRef = useRef<string | null>(null);
  const displayName =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    (user?.user_metadata?.name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    null;

  useEffect(() => {
    (async () => {
      const { data: r } = await supabase.from("training_rooms")
        .select("id, code, station_id, station_title, status, started_at, duration_minutes, evaluated_candidate_id")
        .eq("code", code).maybeSingle();
      if (!r) return;
      setRoom(r as Room);
      const st = await loadStation((r as Room).station_id);
      setStation(st);
      const effMin = (r as Room).duration_minutes ?? st?.durationMinutes ?? 10;
      setRemaining(effMin * 60);

      const { data: dels } = await supabase.from("room_material_deliveries")
        .select("*").eq("room_id", (r as Room).id).order("delivered_at");
      const list = (dels ?? []) as Delivery[];
      list.forEach((d) => seenIds.current.add(d.id));
      setDeliveries(list);
    })();
  }, [code]);

  useEffect(() => {
    if (!room) return;
    void loadEvaluation(room.id);

    const ch = supabase
      .channel(`candidate-${room.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_material_deliveries", filter: `room_id=eq.${room.id}` }, (payload) => {
        const d = payload.new as Delivery;
        if (seenIds.current.has(d.id)) return;
        seenIds.current.add(d.id);
        setDeliveries((prev) => [...prev, d]);
        toast.success(`Material recebido: ${d.material_name}`);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "training_rooms", filter: `id=eq.${room.id}` }, (payload) => {
        setRoom((prev) => prev ? { ...prev, ...(payload.new as Room) } : prev);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_evaluations", filter: `room_id=eq.${room.id}` }, async () => {
        await loadEvaluation(room.id);
      })
      .subscribe();
    // Fallback: polling a cada 2s para garantir sincronia mesmo se realtime atrasar
    const pollId = setInterval(async () => {
      const { data: r } = await supabase.from("training_rooms")
        .select("id, code, station_id, station_title, status, started_at, duration_minutes, evaluated_candidate_id")
        .eq("id", room.id).maybeSingle();
      if (r) setRoom((prev) => prev ? { ...prev, ...(r as Room) } : (r as Room));
      await loadEvaluation(room.id);
    }, 2000);
    return () => { supabase.removeChannel(ch); clearInterval(pollId); };
  }, [room?.id, user?.id]);

  useEffect(() => {
    if (!room || !user || !displayName) return;
    supabase
      .from("training_room_participants")
      .update({ display_name: displayName })
      .eq("room_id", room.id)
      .eq("user_id", user.id)
      .then(() => {});
  }, [room?.id, user?.id, displayName]);

  async function loadEvaluation(roomId: string) {
    if (!user) return;
    const { data } = await supabase.from("room_evaluations")
      .select("final_score, status, final_feedback, checks, item_comments, preview_for_candidate")
      .eq("room_id", roomId)
      .eq("candidate_id", user.id)
      .maybeSingle();
    if (data) setEvaluation({
      final_score: data.final_score,
      status: data.status,
      final_feedback: data.final_feedback,
      checks: (data.checks ?? {}) as Record<string, number>,
      item_comments: (data.item_comments ?? {}) as Record<string, string>,
      preview_for_candidate: !!(data as { preview_for_candidate?: boolean }).preview_for_candidate,
    });
  }

  // Timer sync
  useEffect(() => {
    if (!room || !station) return;
    if (room.status === "running" && room.started_at && !finished) {
      const totalSec = (room.duration_minutes ?? station.durationMinutes) * 60;
      const startedMs = new Date(room.started_at).getTime();
      let cancelled = false;

      const tick = () => {
        const elapsed = Math.floor((serverNow() - startedMs) / 1000);
        // Clamp: se started_at está no futuro (ex: aguardando intro terminar), mantém total.
        const left = Math.max(0, Math.min(totalSec, totalSec - elapsed));
        setRemaining(left);
        if (left <= 0 && elapsed >= 0) {
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
    if (room.status === "finished") {
      setFinished(true);
      loadEvaluation(room.id);
    }
  }, [room?.status, room?.started_at, room?.duration_minutes, station?.id, finished]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const total = ((room?.duration_minutes ?? station?.durationMinutes ?? 10)) * 60;

  async function finish() {
    if (!station || !user || !room) return;
    if (room.status !== "running") {
      toast.error("A estação ainda não foi iniciada pelo ator.");
      return;
    }
    if (room.evaluated_candidate_id && room.evaluated_candidate_id !== user.id) {
      toast.error("Apenas o avaliado da vez pode finalizar a estação.");
      return;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setFinished(true);
    try {
      await supabase.from("attempts").insert({
        user_id: user.id,
        station_id: station.id,
        station_title: station.title,
        specialty: station.specialty,
        score: 0,
        earned: 0,
        total_points: station.checklist.reduce((s, i) => s + i.points, 0),
        used_seconds: total - remaining,
        checked_items: [],
        notes: notes || null,
        status: "aguardando_correcao",
        room_id: room.id,
      } as never);
      toast.success("Estação finalizada. Aguarde a correção do ator.");
    } catch (e) { console.error(e); }
  }

  const visibleDeliveries = useMemo(() => {
    // Ordena pelo número do impresso (posição em station.deliverableMaterials).
    // Fallback: número extraído do nome. Itens desconhecidos vão para o fim.
    const mats = station?.deliverableMaterials ?? [];
    const indexById = new Map(mats.map((m, i) => [m.id, i]));
    const extractNum = (name: string): number => {
      const m = (name || "").match(/\d+/);
      return m ? parseInt(m[0], 10) : Number.POSITIVE_INFINITY;
    };
    const orderOf = (d: Delivery): number => {
      const i = indexById.get(d.material_id);
      if (i !== undefined) return i;
      return extractNum(d.material_name);
    };
    return [...deliveries].sort((a, b) => {
      const na = orderOf(a);
      const nb = orderOf(b);
      if (na !== nb) return na - nb;
      return (a.delivered_at || "").localeCompare(b.delivered_at || "");
    });
  }, [deliveries, station]);

  // Dispara o overlay institucional quando o ator inicia a estação
  useEffect(() => {
    if (room?.status === "starting" && !introDone) setShowIntro(true);
  }, [room?.status, introDone]);

  // Persiste a tentativa em Desempenho/Histórico assim que o ator finalizar a correção
  // (status = aprovado/reprovado e todos os itens pontuados). Atualiza se já existir.
  useEffect(() => {
    if (!station || !user || !room) return;
    if (!evaluation) return;
    const isFinalized = evaluation.status === "aprovado" || evaluation.status === "reprovado";
    if (!isFinalized) return;
    const allItemsScored = station.checklist.length > 0 && station.checklist.every((it) => typeof evaluation.checks[it.id] === "number");
    if (!allItemsScored) return;
    const fingerprint = `${room.id}:${evaluation.final_score ?? 0}:${evaluation.status}`;
    if (savedAttemptRef.current === fingerprint) return;
    savedAttemptRef.current = fingerprint;

    (async () => {
      try {
        const totalPoints = station.checklist.reduce((s, it) => s + Number(it.points || 0), 0);
        const earned = station.checklist.reduce((s, it) => {
          const v = evaluation.checks[it.id];
          return s + (typeof v === "number" ? v : 0);
        }, 0);
        const checkedItems = station.checklist
          .filter((it) => typeof evaluation.checks[it.id] === "number" && evaluation.checks[it.id] > 0)
          .map((it) => it.id);
        const score = Number(evaluation.final_score ?? earned);
        const used = Math.max(0, ((room.duration_minutes ?? station.durationMinutes) * 60) - remaining);

        const { data: existing } = await supabase
          .from("attempts")
          .select("id")
          .eq("user_id", user.id)
          .eq("room_id", room.id)
          .maybeSingle();

        const r = room as unknown as { simulado_id?: string | null; simulado_name?: string | null; simulado_index?: number | null; simulado_total?: number | null };
        const payload = {
          score,
          earned: Math.round(earned),
          total_points: Math.round(totalPoints),
          checked_items: checkedItems,
          notes: notes || evaluation.final_feedback || null,
          status: evaluation.status,
          simulado_id: r.simulado_id ?? null,
          simulado_name: r.simulado_name ?? null,
          simulado_station_index: r.simulado_index ?? null,
          simulado_total_stations: r.simulado_total ?? null,
        };

        if (existing?.id) {
          await supabase.from("attempts").update(payload).eq("id", existing.id);
        } else {
          await supabase.from("attempts").insert({
            user_id: user.id,
            station_id: station.id,
            station_title: station.title,
            specialty: station.specialty,
            used_seconds: used,
            room_id: room.id,
            ...payload,
          } as never);
        }
      } catch (e) {
        console.error("Falha ao salvar tentativa:", e);
        savedAttemptRef.current = null; // permite nova tentativa
      }
    })();
  }, [evaluation, station, user, room, remaining, notes]);

  if (!station || !room) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  // Overlay institucional de entrada (3..2..1). Bloqueia toda a tela.
  if (showIntro && user) {
    return (
      <StationIntroOverlay
        role={"candidato" as IntroRole}
        stationTitle={room.station_title ?? station.title}
        specialty={station.specialty}
        displayName={formatDoctorName(profile?.full_name, profile?.title, "Candidato")}
        avatarUrl={profile?.avatar_url}
        onComplete={() => { setShowIntro(false); setIntroDone(true); }}
      />
    );
  }

  const isWaiting = room.status !== "running" && room.status !== "starting" && room.status !== "finished" && !finished;
  const isRunning = room.status === "running" && !finished;
  const isFinished = finished || room.status === "finished";
  const correctionReady = !!evaluation && (isFinished || evaluation.preview_for_candidate);
  const pct = evaluation?.final_score != null ? evaluation.final_score * 10 : 0;
  const allScored = !!evaluation && station.checklist.length > 0 && station.checklist.every((it) => typeof evaluation.checks[it.id] === "number");
  const resultSaved = !!evaluation && (evaluation.status === "aprovado" || evaluation.status === "reprovado");
  const showSavingBanner = correctionReady && allScored;

  // Lobby de espera — tela cheia, transita sozinha quando room.status virar "running"
  if (isWaiting) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <button
          type="button"
          onClick={() => { if (typeof window !== "undefined" && window.history.length > 1) window.history.back(); else nav({ to: "/app" }); }}
          className="absolute left-6 top-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Sair
        </button>

        <div className="relative">
          <span className="absolute inset-0 -m-4 animate-ping rounded-full bg-mint/20" />
          <span className="absolute inset-0 -m-2 animate-pulse rounded-full bg-mint/30" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-mint/15 ring-2 ring-mint/40">
            <Hourglass className="h-10 w-10 text-mint" />
          </div>
        </div>

        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-mint/15 px-3 py-1 text-xs font-medium text-mint">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" />
          Conectado à sala {code}
        </div>

        <h1 className="mt-6 font-display text-3xl font-bold md:text-4xl">
          Aguardando o ator iniciar...
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground md:text-base">
          Você já está dentro da estação de <span className="font-semibold text-foreground">{station.specialty}</span>.
          Assim que o ator iniciar o cronômetro, a tela vai abrir automaticamente — não precisa atualizar a página.
        </p>

        <div className="mt-8 grid w-full max-w-md grid-cols-3 gap-2 text-xs">
          <LobbyStep icon={CheckCheck} label="Entrou na sala" done />
          <LobbyStep icon={Hourglass} label="Aguardando início" active />
          <LobbyStep icon={Play} label="Estação inicia" />
        </div>

        <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 px-4 py-3 text-[11px] text-muted-foreground">
          💡 Dica: respire fundo, organize seu raciocínio. O cronômetro só começa quando o ator clicar em iniciar.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => { if (typeof window !== "undefined" && window.history.length > 1) window.history.back(); else nav({ to: "/app" }); }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Sair
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-mint/15 px-2.5 py-1 font-medium text-mint">Candidato</span>
          <span>•</span>
          <span>{station.specialty}</span>
        </div>
      </div>

      {/* Banner gradient institucional (igual ao painel do ator) */}
      <div className="relative overflow-hidden rounded-3xl border border-mint/20 bg-gradient-hero p-6 text-white shadow-elegant md:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(hsl(160 60% 60%) 1px, transparent 1px), linear-gradient(90deg, hsl(160 60% 60%) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-mint">
            <ShieldCheck className="h-3 w-3" /> Estação em andamento
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">
            Estação de {station.specialty}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-white/70">
            {(() => {
              const meta = getSpecialtyMeta(station.specialty);
              return (
                <span className={cn("inline-flex h-6 items-center rounded-md px-2 text-[11px] font-bold", meta.badge)}>
                  {meta.code}
                </span>
              );
            })()}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" /> {station.specialty}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {room.duration_minutes ?? station.durationMinutes} min
            </span>
            <span className="ml-auto rounded-md border border-white/20 bg-white/5 px-2.5 py-1 font-mono text-[11px] tracking-wider">
              {code}
            </span>
          </div>
        </div>
      </div>

      {showSavingBanner && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-elegant",
            resultSaved ? "border-mint/30 bg-mint/10" : "border-mint/30 bg-mint/5",
          )}
        >
          {resultSaved ? (
            <CheckCheck className="h-5 w-5 shrink-0 text-mint" />
          ) : (
            <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-mint border-t-transparent" />
          )}
          <div className="leading-tight">
            {resultSaved ? (
              <>
                <span className="font-semibold text-foreground">Resultado salvo!</span>{" "}
                <span className="text-muted-foreground">Disponível em <span className="font-medium text-foreground">Desempenho</span> e a estação no <span className="font-medium text-foreground">Histórico</span>.</span>
              </>
            ) : (
              <>
                <span className="font-semibold text-foreground">Salvando seu resultado...</span>{" "}
                <span className="text-muted-foreground">Em instantes ficará disponível em <span className="font-medium text-foreground">Desempenho</span> e a estação no <span className="font-medium text-foreground">Histórico</span>.</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div className="space-y-4">

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

          <PRBlock
            icon={Inbox}
            title="Materiais recebidos"
            tone="sky"
            right={<Badge variant="outline" className="text-white border-white/30">{visibleDeliveries.length}</Badge>}
          >
            {visibleDeliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum material ainda. Solicite exames e o ator entregará durante a estação.
              </p>
            ) : (
              <div className="space-y-3">
                {visibleDeliveries.map((d) => {
                  const isOpen = openDeliveries[d.id] ?? false;
                  return (
                    <div key={d.id} className="rounded-xl border border-mint/40 bg-mint/5">
                      <button
                        type="button"
                        onClick={() => setOpenDeliveries((s) => ({ ...s, [d.id]: !isOpen }))}
                        className="flex w-full items-start justify-between gap-2 p-4 text-left"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 text-sm font-semibold">
                            <FileText className="h-4 w-4 text-mint" /> {(() => { const n = (d.material_name || "").trim(); return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : n; })()}
                          </div>
                          {d.material_type && <div className="text-xs text-muted-foreground">{d.material_type}</div>}
                          {!isOpen && <div className="mt-1 text-[11px] text-muted-foreground">clique para ver o conteúdo</div>}
                        </div>
                        {isOpen ? <ChevronUp className="h-4 w-4 text-mint" /> : <ChevronDown className="h-4 w-4 text-mint" />}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4">
                          {d.material_description && (
                            <div className="text-xs text-muted-foreground">{d.material_description}</div>
                          )}
                          {d.material_content && (
                            <div className="mt-3 rounded-lg bg-background/60 p-3 text-sm">
                              <ScriptText text={d.material_content} />
                            </div>
                          )}
                          {d.material_image_url && (
                            <img
                              src={d.material_image_url}
                              alt={d.material_name || "Material"}
                              className="mt-3 w-full rounded-lg border border-border object-contain"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </PRBlock>


          {/* PEP — só aparece quando ator liberar a correção */}
          {correctionReady && (
            <PRBlock icon={ClipboardCheck} title="CHECKLIST ( PEP )" tone="emerald">
              {correctionReady ? (
                <div className="space-y-4">
                  <ol className="space-y-3">
                    {station.checklist.map((it, idx) => {
                      const levels = [...(it.levels ?? [{ label: "Inadequado", points: 0 }, { label: "Adequado", points: it.points }])].sort((a, b) => a.points - b.points);
                      const current = evaluation!.checks[it.id];
                      const parts = parseSubItems(it.description);
                      const comment = evaluation!.item_comments[it.id];
                      return (
                        <li
                          key={it.id}
                          className={cn(
                            "grid grid-cols-[1fr_auto] gap-x-4 rounded-xl border px-4 py-3",
                            typeof current === "number" ? "border-mint/30 bg-mint/5" : "border-border bg-background/30",
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                              <span>{formatPepHeading(idx, it.category, it.description)}</span>
                            </div>
                            {parts.subs.length > 0 && (
                              <ul className="mt-2 space-y-0.5">
                                {parts.subs.map((sub, si) => (
                                  <li key={si} className="rounded-md px-2 py-1 text-sm text-foreground/85">{sub}</li>
                                ))}
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
                            {comment && (
                              <div className="mt-3 rounded-md border border-border bg-background/40 px-3 py-2 text-xs">
                                <span className="font-semibold text-muted-foreground">Comentário do ator:</span> {comment}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-center gap-1 tabular-nums">
                            {(() => {
                              const sorted = [...levels].sort((a, b) => a.points - b.points);
                              const maxPts = Math.max(...sorted.map((l) => l.points));
                              return sorted.map((lv) => {
                                const selected = current === lv.points;
                                const tone = levelTone(lv.points, maxPts);
                                return (
                                  <div
                                    key={lv.label}
                                    className={cn(
                                      "flex h-7 w-9 items-center justify-center rounded-md text-sm font-bold",
                                      selected ? tone.active : tone.idle,
                                      !selected && "opacity-40",
                                    )}
                                  >
                                    {lv.points}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </li>
                      );
                    })}
                  </ol>

                  {evaluation!.final_feedback && (
                    <div className="rounded-xl border border-border bg-background/40 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Comentário final do ator</div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{evaluation!.final_feedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" /> Aguardando o ator abrir o PEP...
                </div>
              )}
            </PRBlock>
          )}
        </div>

        {/* RIGHT */}
        <aside className="lg:sticky lg:top-20 lg:self-start space-y-3">
          {/* Timer */}
          <div className="rounded-2xl border border-border bg-gradient-hero p-4 text-white shadow-elegant">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                {isRunning ? "Em andamento" : isFinished ? "Encerrada" : "Aguardando"}
              </div>
              <button
                type="button"
                onClick={() => setHideTimer((v) => !v)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white/80 hover:text-white"
                title={hideTimer ? "Mostrar cronômetro" : "Ocultar cronômetro"}
              >
                {hideTimer ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className={cn(
              "mt-2 rounded-xl px-5 py-6 text-center transition-colors",
              isRunning ? "bg-mint/15" : "bg-white/5",
            )}>
              <div className="font-display text-5xl font-bold tabular-nums text-white">
                {hideTimer ? "— —" : `${mm}:${ss}`}
              </div>
            </div>

            {isWaiting && (
              <div className="mt-3 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-center text-sm font-medium text-white/90">
                Aguardando o ator iniciar a estação...
              </div>
            )}
            {isRunning && null}
            {isFinished && (
              <div className="mt-3 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-center text-sm font-semibold text-white">
                Estação encerrada.
              </div>
            )}
          </div>

          {/* Resultado */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Resultado
            </div>
            <div className="mt-2 rounded-xl bg-background/60 px-4 py-3 text-center">
              {correctionReady ? (
                <div className="font-display text-xl font-bold tabular-nums text-mint">
                  {evaluation!.final_score?.toFixed(2)} / {pct.toFixed(0)}%
                </div>
              ) : (
                <div className="font-display text-base font-semibold text-muted-foreground">
                  Aguardando...
                </div>
              )}
            </div>
          </div>

          {/* PEP locked card */}
          <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-center">
            <Lock className="mx-auto h-4 w-4 text-muted-foreground" />
            <div className="mt-2 text-[11px] text-muted-foreground">
              {correctionReady ? "PEP disponível abaixo" : "PEP liberado ao final da estação"}
            </div>
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
  tone?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
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

function LobbyStep({
  icon: Icon, label, done, active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-colors",
      done && "border-mint/40 bg-mint/10 text-mint",
      active && "border-mint/40 bg-mint/10 text-mint",
      !done && !active && "border-border bg-card/50 text-muted-foreground",
    )}>
      <Icon className={cn("h-4 w-4", active && "animate-pulse")} />
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </div>
  );
}
