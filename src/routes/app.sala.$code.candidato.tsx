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
import {
  ArrowLeft, Square, MessageSquare, ListChecks, Inbox, FileText, StickyNote,
  Lock, Sparkles, ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/sala/$code/candidato")({
  component: CandidateView,
  head: () => ({ meta: [{ title: "Estação — Candidato" }] }),
});

type Room = { id: string; code: string; station_id: string; station_title: string; status: string; started_at: string | null };
type Delivery = {
  id: string;
  material_id: string;
  material_name: string;
  material_type: string | null;
  material_description: string | null;
  material_content: string | null;
  delivered_at: string;
};

function CandidateView() {
  const { code } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [station, setStation] = useState<LoadedStation | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [notes, setNotes] = useState("");
  const [remaining, setRemaining] = useState(600);
  const [finished, setFinished] = useState(false);
  const [evaluation, setEvaluation] = useState<{ final_score: number | null; status: string; final_feedback: string | null } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: r } = await supabase.from("training_rooms")
        .select("id, code, station_id, station_title, status, started_at")
        .eq("code", code).maybeSingle();
      if (!r) return;
      setRoom(r as Room);
      const st = await loadStation((r as Room).station_id);
      setStation(st);
      if (st) setRemaining(st.durationMinutes * 60);

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
    const { data } = await supabase.from("room_evaluations")
      .select("final_score, status, final_feedback")
      .eq("room_id", roomId).maybeSingle();
    if (data) setEvaluation(data);
  }

  // Timer sync
  useEffect(() => {
    if (!room || !station) return;
    if (room.status === "running" && room.started_at && !finished) {
      const totalSec = station.durationMinutes * 60;
      const tick = () => {
        const elapsed = Math.floor((Date.now() - new Date(room.started_at!).getTime()) / 1000);
        const left = Math.max(0, totalSec - elapsed);
        setRemaining(left);
        if (left <= 0) {
          setFinished(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
    if (room.status === "finished") {
      setFinished(true);
      loadEvaluation(room.id);
    }
  }, [room?.status, room?.started_at, station?.id, finished]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const total = (station?.durationMinutes ?? 10) * 60;

  async function finish() {
    if (!station || !user || !room) return;
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
      toast.success("Estação finalizada. Aguarde a correção do avaliador.");
    } catch (e) { console.error(e); }
  }

  const visibleDeliveries = useMemo(() => {
    const autos = (station?.deliverableMaterials ?? [])
      .filter((m) => m.autoDeliver)
      .map((m): Delivery => ({
        id: `auto-${m.id}`,
        material_id: m.id,
        material_name: m.name,
        material_type: m.type,
        material_description: m.description ?? null,
        material_content: m.content,
        delivered_at: "",
      }));
    const seen = new Set(deliveries.map((d) => d.material_id));
    return [...autos.filter((a) => !seen.has(a.material_id)), ...deliveries];
  }, [deliveries, station]);

  if (!station || !room) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  const isWaiting = room.status !== "running" && !finished;
  const isRunning = room.status === "running" && !finished;
  const isFinished = finished || room.status === "finished";
  const correctionReady = !!evaluation && evaluation.status !== "em_andamento";
  const pct = evaluation?.final_score != null ? evaluation.final_score * 10 : 0;

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

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex h-7 items-center rounded-md bg-emerald-500/15 px-2 text-xs font-bold text-emerald-400">PE</span>
              <h1 className="truncate font-display text-lg font-bold text-emerald-300 md:text-xl">
                {room.station_title ?? station.title}
              </h1>
            </div>
            <span className="rounded-md border border-border bg-background px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
              {code}
            </span>
          </div>

          <PRBlock icon={MessageSquare} title="Cenário de atuação" tone="violet">
            <p className="whitespace-pre-wrap leading-relaxed">{station.clinicalCase}</p>
          </PRBlock>

          <PRBlock icon={ListChecks} title={`Nos ${station.durationMinutes} minutos de duração da estação, você deverá executar as seguintes tarefas`} tone="emerald">
            <p className="whitespace-pre-wrap leading-relaxed">{station.candidateTask}</p>
          </PRBlock>

          <PRBlock
            icon={Inbox}
            title="Materiais recebidos"
            tone="sky"
            right={<Badge variant="outline">{visibleDeliveries.length}</Badge>}
          >
            {visibleDeliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum material ainda. Solicite exames e o avaliador entregará durante a estação.
              </p>
            ) : (
              <div className="space-y-3">
                {visibleDeliveries.map((d) => (
                  <div key={d.id} className="rounded-xl border border-mint/40 bg-mint/5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                          <FileText className="h-4 w-4 text-mint" /> {d.material_name}
                        </div>
                        {d.material_type && <div className="text-xs text-muted-foreground">{d.material_type}</div>}
                      </div>
                      <Sparkles className="h-4 w-4 text-mint" />
                    </div>
                    {d.material_description && (
                      <div className="mt-2 text-xs text-muted-foreground">{d.material_description}</div>
                    )}
                    {d.material_content && (
                      <div className="mt-3 whitespace-pre-wrap rounded-lg bg-background/60 p-3 text-sm">{d.material_content}</div>
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

          {/* PEP — só aparece quando avaliador finalizar correção */}
          {isFinished && (
            <PRBlock icon={ClipboardCheck} title="PEP — Resultado da estação" tone="emerald">
              {correctionReady ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-background/60 p-4 text-center">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sua nota</div>
                    <div className="mt-1 font-display text-3xl font-bold text-emerald-300 tabular-nums">
                      {evaluation!.final_score?.toFixed(2) ?? "—"} / {pct.toFixed(0)}%
                    </div>
                    <Badge className="mt-2" variant="outline">
                      {evaluation!.status === "aprovado" ? "Aprovado" : evaluation!.status === "reprovado" ? "Reprovado" : "Pedir repetição"}
                    </Badge>
                  </div>
                  {evaluation!.final_feedback && (
                    <div className="rounded-xl border border-border bg-background/40 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Feedback do avaliador</div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{evaluation!.final_feedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 px-4 py-6 text-sm text-amber-300">
                  <Lock className="h-4 w-4" /> Aguardando o avaliador finalizar a correção...
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
              isRunning ? "bg-emerald-500/15" : isFinished ? "bg-rose-500/15" : "bg-violet-500/20",
            )}>
              <div className="font-display text-5xl font-bold tabular-nums text-white">
                {mm}:{ss}
              </div>
            </div>

            {isWaiting && (
              <div className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-300">
                Aguardando o avaliador iniciar a estação...
              </div>
            )}
            {isRunning && (
              <Button variant="outline" className="mt-3 w-full" onClick={finish}>
                <Square className="mr-1 h-4 w-4" /> Finalizar estação
              </Button>
            )}
            {isFinished && (
              <div className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-center text-xs text-rose-300">
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
                <div className="font-display text-xl font-bold tabular-nums text-emerald-300">
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
