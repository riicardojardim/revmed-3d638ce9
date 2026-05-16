import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { loadStation, type LoadedStation } from "@/lib/stationLoader";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Play, Square, AlertTriangle, FileText, StickyNote, Inbox, Sparkles, Stethoscope,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/sala/$code/candidato")({
  component: CandidateView,
  head: () => ({ meta: [{ title: "Tela do Candidato — Estação Revalida" }] }),
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
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(600);
  const [finished, setFinished] = useState(false);
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
        toast.success(`Material recebido: ${d.material_name}`, { description: "O ator entregou um novo material." });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "training_rooms", filter: `id=eq.${room.id}` }, (payload) => {
        setRoom((prev) => prev ? { ...prev, ...(payload.new as Room) } : prev);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [room?.id]);

  // Auto-start quando o ator inicia o cronômetro (room.status === "running")
  useEffect(() => {
    if (!room || !station) return;
    if (room.status === "running" && room.started_at && !finished) {
      const elapsed = Math.floor((Date.now() - new Date(room.started_at).getTime()) / 1000);
      const totalSec = station.durationMinutes * 60;
      const left = Math.max(0, totalSec - elapsed);
      setRemaining(left);
      if (left > 0) setRunning(true);
      else { setRunning(false); setFinished(true); }
    }
  }, [room?.status, room?.started_at, station?.id]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { setRunning(false); setFinished(true); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const total = (station?.durationMinutes ?? 10) * 60;
  const pct = (remaining / total) * 100;
  const lastMinute = remaining > 0 && remaining <= 60;

  async function finish() {
    if (!station || !user || !room) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
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
    } catch (e) {
      console.error(e);
    }
    nav({ to: "/app/sala/$code", params: { code } });
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
    const merged = [...autos.filter((a) => !seen.has(a.material_id)), ...deliveries];
    return merged;
  }, [deliveries, station]);

  if (!station || !room) return <div className="text-sm text-muted-foreground">Carregando estação...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/app/sala/$code" params={{ code }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar à sala
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-mint/30 bg-gradient-to-br from-mint/10 to-medical/5 p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint/10 px-3 py-1 text-xs font-medium text-mint">
              <Stethoscope className="h-3.5 w-3.5" /> Tela do Candidato
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-medical/30 text-medical">{station.specialty}</Badge>
              <Badge variant="outline">{station.difficulty}</Badge>
              <Badge variant="outline">{station.durationMinutes} min</Badge>
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">{station.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Você está em uma unidade de saúde. Atenda o paciente, realize a abordagem adequada e explique sua conduta.
            </p>
          </div>

          <Card title="Caso clínico" icon={FileText}>
            <p className="leading-relaxed text-foreground/90">{station.clinicalCase}</p>
          </Card>

          <Card title="Tarefa do candidato">
            <p className="leading-relaxed text-foreground/90">{station.candidateTask}</p>
          </Card>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Inbox className="h-4 w-4 text-mint" /> Materiais recebidos
              </div>
              <Badge variant="outline">{visibleDeliveries.length}</Badge>
            </div>
            {visibleDeliveries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
                Nenhum material recebido ainda. Solicite exames e o ator entregará durante a estação.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleDeliveries.map((d) => (
                  <div key={d.id} className="rounded-2xl border border-mint/40 bg-mint/5 p-4 shadow-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">{d.material_name}</div>
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
          </section>

          <Card title="Anotações" icon={StickyNote}>
            <Textarea placeholder="Anote raciocínio, hipóteses, conduta…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} />
          </Card>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className={cn(
            "overflow-hidden rounded-3xl border bg-gradient-hero p-6 text-white shadow-elegant",
            lastMinute && "border-warning/60",
            finished && "border-destructive/60",
          )}>
            <div className="text-xs font-medium uppercase tracking-wider text-mint">Cronômetro</div>
            <div className="mt-2 font-display text-6xl font-bold tabular-nums leading-none">{mm}:{ss}</div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
              <div className={cn("h-full rounded-full transition-all", finished ? "bg-destructive" : lastMinute ? "bg-warning" : "bg-gradient-mint")} style={{ width: `${pct}%` }} />
            </div>
            {lastMinute && !finished && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-warning/15 px-3 py-2 text-sm text-warning">
                <AlertTriangle className="h-4 w-4" /> Falta 1 minuto.
              </div>
            )}
            {finished && (
              <div className="mt-4 rounded-xl bg-destructive/15 px-3 py-2 text-sm text-white">
                Tempo encerrado. Finalize a estação para receber a correção.
              </div>
            )}
            <div className="mt-5 flex gap-2">
              {!running ? (
                <Button variant="hero" className="flex-1" onClick={() => setRunning(true)} disabled={finished}>
                  <Play className="h-4 w-4" /> {remaining === total ? "Iniciar estação" : "Retomar"}
                </Button>
              ) : (
                <Button variant="hero" className="flex-1" onClick={() => setRunning(false)}>Pausar</Button>
              )}
              <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={finish}>
                <Square className="h-4 w-4" /> Finalizar
              </Button>
            </div>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
              Você não vê o checklist nem a pontuação até o avaliador finalizar a correção.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-4 w-4 text-mint" />}
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
