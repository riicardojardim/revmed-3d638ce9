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
  Lock, Sparkles, ClipboardCheck, Hourglass, CheckCheck, Play, ShieldCheck, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { ScriptText } from "@/components/station/shared";
import { StationIntroOverlay, type IntroRole } from "@/components/room/StationIntroOverlay";

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
  const [evaluation, setEvaluation] = useState<{ final_score: number | null; status: string; final_feedback: string | null } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

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
    return () => { supabase.removeChannel(ch); };
  }, [room?.id]);

  async function loadEvaluation(roomId: string) {
    if (!user) return;
    const { data } = await supabase.from("room_evaluations")
      .select("final_score, status, final_feedback")
      .eq("room_id", roomId)
      .eq("candidate_id", user.id)
      .maybeSingle();
    if (data) setEvaluation(data);
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
      });
      toast.success("Estação finalizada. Aguarde a correção do ator.");
    } catch (e) { console.error(e); }
  }

  const visibleDeliveries = useMemo(() => deliveries, [deliveries]);

  // Dispara o overlay institucional quando o ator inicia a estação
  useEffect(() => {
    if (room?.status === "starting" && !introDone) setShowIntro(true);
  }, [room?.status, introDone]);

  if (!station || !room) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  // Overlay institucional de entrada (3..2..1). Bloqueia toda a tela.
  if (showIntro && user) {
    return (
      <StationIntroOverlay
        role={"candidato" as IntroRole}
        stationTitle={room.station_title ?? station.title}
        specialty={station.specialty}
        displayName={profile?.full_name ?? "Candidato"}
        onComplete={() => { setShowIntro(false); setIntroDone(true); }}
      />
    );
  }

  const isWaiting = room.status !== "running" && room.status !== "starting" && !finished;
  const isRunning = room.status === "running" && !finished;
  const isFinished = finished || room.status === "finished";
  const correctionReady = !!evaluation && evaluation.status !== "em_andamento";
  const pct = evaluation?.final_score != null ? evaluation.final_score * 10 : 0;

  // Lobby de espera — tela cheia, transita sozinha quando room.status virar "running"
  if (isWaiting) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <Link to="/app/sala/$code" params={{ code }} className="absolute left-6 top-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

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

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <Badge variant="outline">{station.specialty}</Badge>
          <Badge variant="outline">{station.difficulty}</Badge>
          <Badge variant="outline">{station.durationMinutes} min</Badge>
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
        <Link to="/app/sala/$code" params={{ code }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
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
            {room.station_title ?? station.title}
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

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div className="space-y-4">
              {code}
            </span>
          </div>

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
            right={<Badge variant="outline">{visibleDeliveries.length}</Badge>}
          >
            {visibleDeliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum material ainda. Solicite exames e o ator entregará durante a estação.
              </p>
            ) : (
              <div className="space-y-3">
                {visibleDeliveries.map((d) => (
                  <div key={d.id} className="rounded-xl border border-mint/40 bg-mint/5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                          <FileText className="h-4 w-4 text-mint" /> {(() => { const n = (d.material_name || "").trim(); return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : n; })()}
                        </div>
                        {d.material_type && <div className="text-xs text-muted-foreground">{d.material_type}</div>}
                      </div>
                      <Sparkles className="h-4 w-4 text-mint" />
                    </div>
                    {d.material_description && (
                      <div className="mt-2 text-xs text-muted-foreground">{d.material_description}</div>
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
                ))}
              </div>
            )}
          </PRBlock>

          <PRBlock icon={StickyNote} title="Anotações" tone="amber">
            <Textarea
              placeholder="Anote raciocínio, hipóteses, conduta…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              disabled={!isRunning}
            />
          </PRBlock>

          {/* PEP — só aparece quando ator finalizar correção */}
          {isFinished && (
            <PRBlock icon={ClipboardCheck} title="PEP — Resultado da estação" tone="emerald">
              {correctionReady ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-background/60 p-4 text-center">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sua nota</div>
                    <div className="mt-1 font-display text-3xl font-bold text-mint tabular-nums">
                      {evaluation!.final_score?.toFixed(2) ?? "—"} / {pct.toFixed(0)}%
                    </div>
                    <Badge className="mt-2" variant="outline">
                      {evaluation!.status === "aprovado" ? "Aprovado" : evaluation!.status === "reprovado" ? "Reprovado" : "Pedir repetição"}
                    </Badge>
                  </div>
                  {evaluation!.final_feedback && (
                    <div className="rounded-xl border border-border bg-background/40 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Feedback do ator</div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{evaluation!.final_feedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" /> Aguardando o ator finalizar a correção...
                </div>
              )}
            </PRBlock>
          )}
        </div>

        {/* RIGHT */}
        <aside className="lg:sticky lg:top-20 lg:self-start space-y-3">
          {/* Timer */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className={cn(
              "rounded-xl px-5 py-6 text-center transition-colors",
              isRunning ? "bg-mint/15" : "bg-muted/40",
            )}>
              <div className="font-display text-5xl font-bold tabular-nums text-foreground">
                {mm}:{ss}
              </div>
            </div>

            {isWaiting && (
              <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-center text-xs text-muted-foreground">
                Aguardando o ator iniciar a estação...
              </div>
            )}
            {isRunning && (
              <Button variant="outline" className="mt-3 w-full" onClick={finish}>
                <Square className="mr-1 h-4 w-4" /> Finalizar estação
              </Button>
            )}
            {isFinished && (
              <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-center text-xs text-muted-foreground">
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
                <div className="font-display text-xl font-bold tabular-nums text-muted-foreground">
                  0.00 / 0%
                </div>
              )}
            </div>
          </div>

          {/* Avaliado */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Avaliado
            </div>
            <div className="mt-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-center text-sm">
              {correctionReady
                ? (evaluation!.status === "aprovado" ? "Aprovado" : evaluation!.status === "reprovado" ? "Reprovado" : "Pedir repetição")
                : "Aguardando..."}
            </div>
          </div>

          {/* PEP locked card */}
          <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-center">
            <Lock className="mx-auto h-4 w-4 text-muted-foreground" />
            <div className="mt-2 text-[11px] text-muted-foreground">
              {isFinished ? "PEP disponível abaixo" : "PEP liberado ao final da estação"}
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
      <header className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2.5 text-sm font-medium text-muted-foreground">
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
