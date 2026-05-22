import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pause,
  Play,
  Square,
  ClipboardList,
  FileText,
  StickyNote,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { STATIONS } from "@/data/stations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/simulacao/$id")({
  component: SimulationPage,
  head: () => ({ meta: [{ title: "Estação — REVMED" }] }),
});

function SimulationPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const station = STATIONS.find((s) => s.id === id);
  const total = (station?.durationMinutes ?? 10) * 60;

  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [tab, setTab] = useState<"caso" | "checklist" | "notas">("caso");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = (remaining / total) * 100;
  const lastMinute = remaining > 0 && remaining <= 60;
  const finished = remaining === 0;

  const totalPoints = useMemo(
    () => station.checklist.reduce((s, i) => s + i.points, 0),
    [station],
  );
  const earned = useMemo(
    () =>
      station.checklist.reduce(
        (s, i) => s + (checked[i.id] ? i.points : 0),
        0,
      ),
    [checked, station],
  );

  async function finish() {
    if (!station) return;
    const score = (earned / totalPoints) * 10;
    const checkedIds = Object.entries(checked).filter(([, v]) => v).map(([k]) => k);
    const used = total - remaining;

    // Persist attempt
    let attemptId: string | null = null;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("attempts").insert({
          user_id: user.id,
          station_id: station.id,
          station_title: station.title,
          specialty: station.specialty,
          score: Number(score.toFixed(2)),
          earned,
          total_points: totalPoints,
          used_seconds: used,
          checked_items: checkedIds,
          notes: notes || null,
          status: "concluida",
        }).select("id").single();
        attemptId = data?.id ?? null;
      }
    } catch (e) {
      console.error("Falha ao salvar tentativa", e);
    }

    if (attemptId) {
      nav({ to: `/app/resultado/${station.id}?attempt=${attemptId}` });
    } else {
      nav({ to: `/app/resultado/${station.id}` });
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        to="/app/checklists"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à biblioteca
      </Link>

      <div className="grid gap-6 xl:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card md:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <SpecialtyBadge specialty={station.specialty} />
              <Badge variant="outline">{station.difficulty}</Badge>
              <Badge variant="outline">{station.durationMinutes} min</Badge>
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">{station.title}</h1>
          </div>

          {/* Tabs (mobile) / sections (desktop) */}
          <div className="flex gap-1 rounded-xl border border-border bg-card p-1 lg:hidden">
            {[
              { k: "caso", l: "Caso", i: FileText },
              { k: "checklist", l: "Checklist", i: ClipboardList },
              { k: "notas", l: "Notas", i: StickyNote },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k as typeof tab)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
                  tab === t.k ? "bg-mint/10 text-foreground" : "text-muted-foreground",
                )}
              >
                <t.i className="h-4 w-4" /> {t.l}
              </button>
            ))}
          </div>

          {/* Case */}
          <section className={cn("space-y-4", tab !== "caso" && "hidden lg:block")}>
            <Card title="Caso clínico" icon={FileText}>
              <p className="leading-relaxed text-foreground/90">{station.clinicalCase}</p>
            </Card>
            <Card title="Tarefa do candidato">
              <p className="leading-relaxed text-foreground/90">{station.candidateTask}</p>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Card title="Dados do paciente">
                <p className="text-sm">{station.patientInfo}</p>
              </Card>
              <Card title="Materiais disponíveis">
                <p className="text-sm">{station.supportMaterials}</p>
              </Card>
            </div>
          </section>

          {/* Checklist */}
          <section className={cn(tab !== "checklist" && "hidden lg:block")}>
            <Card title="Checklist avaliativo" icon={ClipboardList}>
              <div className="space-y-2">
                {station.checklist.map((item) => (
                  <label
                    key={item.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all",
                      checked[item.id]
                        ? "border-mint/50 bg-mint/5"
                        : "border-border hover:border-mint/30",
                    )}
                  >
                    <Checkbox
                      checked={!!checked[item.id]}
                      onCheckedChange={(v) =>
                        setChecked((c) => ({ ...c, [item.id]: v === true }))
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="text-sm">{item.description}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                          {item.category}
                        </Badge>
                        <span>{item.points} pts</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </Card>
          </section>

          {/* Notes */}
          <section className={cn(tab !== "notas" && "hidden lg:block")}>
            <Card title="Anotações do candidato" icon={StickyNote}>
              <Textarea
                placeholder="Anote raciocínio, hipóteses, conduta…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
              />
            </Card>
          </section>
        </div>

        {/* Sidebar: timer */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div
            className={cn(
              "overflow-hidden rounded-3xl border bg-gradient-hero p-6 text-white shadow-elegant",
              lastMinute && "border-warning/60",
              finished && "border-destructive/60",
            )}
          >
            <div className="text-xs font-medium uppercase tracking-wider text-mint">Cronômetro</div>
            <div className="mt-2 font-display text-6xl font-bold tabular-nums leading-none">
              {mm}:{ss}
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  finished
                    ? "bg-destructive"
                    : lastMinute
                      ? "bg-warning"
                      : "bg-gradient-mint",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>

            {lastMinute && !finished && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-warning/15 px-3 py-2 text-sm text-warning">
                <AlertTriangle className="h-4 w-4" /> Falta 1 minuto. Finalize a estação.
              </div>
            )}
            {finished && (
              <div className="mt-4 rounded-xl bg-destructive/15 px-3 py-2 text-sm text-white">
                Tempo encerrado. Finalize sua resposta ou envie para correção.
              </div>
            )}

            <div className="mt-5 flex gap-2">
              {!running ? (
                <Button
                  variant="hero"
                  className="flex-1"
                  onClick={() => setRunning(true)}
                  disabled={finished}
                >
                  <Play className="h-4 w-4" /> {remaining === total ? "Iniciar" : "Retomar"}
                </Button>
              ) : (
                <Button variant="hero" className="flex-1" onClick={() => setRunning(false)}>
                  <Pause className="h-4 w-4" /> Pausar
                </Button>
              )}
              <Button
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                onClick={finish}
              >
                <Square className="h-4 w-4" /> Finalizar
              </Button>
            </div>

            <div className="mt-6 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between text-white/70">
                <span>Pontos marcados</span>
                <span className="font-medium text-white">
                  {earned} / {totalPoints}
                </span>
              </div>
              <div className="mt-2 flex justify-between text-white/70">
                <span>Nota estimada</span>
                <span className="font-display text-xl font-bold text-mint">
                  {((earned / totalPoints) * 10).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
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
