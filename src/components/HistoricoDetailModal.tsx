import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { loadStation, type LoadedStation } from "@/lib/stationLoader";
import {
  ClipboardCheck, Lock, Clock, Inbox, FileText, MessageSquare, ListChecks,
  NotebookPen, ShieldCheck, ChevronDown, ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScriptText, formatPepHeading, parseSubItems, levelTone } from "@/components/station/shared";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type Attempt = {
  id: string;
  station_id: string;
  station_title: string | null;
  specialty: string | null;
  score: number;
  earned: number;
  total_points: number;
  used_seconds: number;
  notes: string | null;
  status: string;
  created_at: string;
  room_id: string | null;
  professor_feedback: string | null;
};

type Evaluation = {
  final_score: number | null;
  status: string;
  final_feedback: string | null;
  checks: Record<string, number>;
  item_comments: Record<string, string>;
};

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

export function HistoricoDetailModal({
  attemptId,
  open,
  onOpenChange,
}: {
  attemptId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [station, setStation] = useState<LoadedStation | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDeliveries, setOpenDeliveries] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open || !attemptId || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setAttempt(null);
      setStation(null);
      setEvaluation(null);
      setDeliveries([]);
      setOpenDeliveries({});
      const { data: a } = await supabase
        .from("attempts")
        .select("*")
        .eq("id", attemptId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!a) { setLoading(false); return; }
      const att = a as unknown as Attempt;
      setAttempt(att);
      const st = await loadStation(att.station_id);
      if (cancelled) return;
      setStation(st);
      if (att.room_id) {
        const [{ data: ev }, { data: dels }] = await Promise.all([
          supabase
            .from("room_evaluations")
            .select("final_score, status, final_feedback, checks, item_comments")
            .eq("room_id", att.room_id)
            .eq("candidate_id", user.id)
            .eq("station_id", att.station_id)
            .maybeSingle(),
          supabase
            .from("room_material_deliveries")
            .select("id, material_id, material_name, material_type, material_description, material_content, material_image_url, delivered_at")
            .eq("room_id", att.room_id)
            .eq("station_id", att.station_id)
            .order("delivered_at", { ascending: true }),
        ]);
        if (cancelled) return;
        if (ev) {
          setEvaluation({
            final_score: ev.final_score as number | null,
            status: ev.status as string,
            final_feedback: (ev.final_feedback as string | null) ?? null,
            checks: (ev.checks as Record<string, number>) ?? {},
            item_comments: (ev.item_comments as Record<string, string>) ?? {},
          });
        }
        setDeliveries((dels ?? []) as Delivery[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, attemptId, user?.id]);

  const reviewed = evaluation && evaluation.status !== "em_andamento";
  const pct = evaluation?.final_score != null ? evaluation.final_score * 10 : (attempt?.score ?? 0) * 10;
  const durationMin = station ? station.durationMinutes : null;
  const specialtyMeta = station ? getSpecialtyMeta(station.specialty) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : !attempt || !station ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Tentativa não encontrada.</div>
        ) : (
          <div className="space-y-5 p-6">
            {/* Banner hero institucional */}
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
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-mint">
                    <ShieldCheck className="h-3 w-3" /> Estação concluída
                  </div>
                  <Badge variant="outline" className="gap-1 border-white/30 bg-white/10 text-white">
                    <Lock className="h-3 w-3" /> Somente leitura
                  </Badge>
                </div>
                <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">
                  {attempt.station_title ?? `Estação de ${station.specialty}`}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-white/70">
                  {specialtyMeta && (
                    <span className={cn("inline-flex h-6 items-center rounded-md px-2 text-[11px] font-bold", specialtyMeta.badge)}>
                      {specialtyMeta.code}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-mint" /> {station.specialty}
                  </span>
                  {durationMin && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> {durationMin} min
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Usados {Math.round(attempt.used_seconds / 60)} min
                  </span>
                  <span className="ml-auto text-[11px] text-white/70">
                    {new Date(attempt.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5">
              {/* LEFT */}
              <div className="min-w-0 space-y-4">
                <PRBlock icon={MessageSquare} title="Cenário de atuação">
                  <ScriptText text={station.clinicalCase} />
                </PRBlock>

                {station.caseDescription && (
                  <PRBlock icon={MessageSquare} title="Descrição do caso">
                    <ScriptText text={station.caseDescription} />
                  </PRBlock>
                )}

                <PRBlock
                  icon={ListChecks}
                  title={`Nos ${durationMin ?? 10} minutos de duração da estação, você deveria executar as seguintes tarefas`}
                >
                  <ScriptText text={station.candidateTask} />
                </PRBlock>

                <PRBlock
                  icon={Inbox}
                  title="Impressos entregues pelo ator"
                  right={<Badge variant="outline" className="text-white border-white/30">{deliveries.length}</Badge>}
                >
                  {deliveries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum impresso entregue nesta estação.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 items-start">
                      {deliveries.map((d) => {
                        const isOpen = openDeliveries[d.id] ?? false;
                        const name = (d.material_name || "").trim();
                        const niceName = name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : name;
                        return (
                          <div key={d.id} className="rounded-xl border border-mint/40 bg-mint/5">
                            <button
                              type="button"
                              onClick={() => setOpenDeliveries((s) => ({ ...s, [d.id]: !isOpen }))}
                              className="flex w-full items-start justify-between gap-2 p-4 text-left"
                            >
                              <div>
                                <div className="flex items-center gap-1.5 text-sm font-semibold">
                                  <FileText className="h-4 w-4 text-mint" /> {niceName}
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

                <PRBlock icon={ClipboardCheck} title="CHECKLIST ( PEP )">
                  {!reviewed ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4" /> Esta estação ainda não foi corrigida.
                    </div>
                  ) : (
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
                                "grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 rounded-xl border px-3 py-3 sm:gap-x-4 sm:px-4",
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

                      {(evaluation!.final_feedback || attempt.professor_feedback) && (
                        <div className="rounded-xl border border-border bg-background/40 p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Comentário final do ator</div>
                          <p className="mt-1 whitespace-pre-wrap text-sm">
                            {evaluation!.final_feedback || attempt.professor_feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </PRBlock>

                {attempt.notes && (
                  <PRBlock icon={NotebookPen} title="Suas anotações">
                    <p className="whitespace-pre-wrap text-sm">{attempt.notes}</p>
                  </PRBlock>
                )}
              </div>

              {/* RIGHT */}
              <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
                <div className="rounded-2xl border border-border bg-gradient-hero p-4 text-white shadow-elegant">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Encerrada</div>
                  <div className="mt-2 rounded-xl bg-white/5 px-5 py-6 text-center">
                    <div className="font-display text-4xl font-bold tabular-nums text-white">
                      {Math.floor(attempt.used_seconds / 60).toString().padStart(2, "0")}:
                      {(attempt.used_seconds % 60).toString().padStart(2, "0")}
                    </div>
                    <div className="mt-1 text-[11px] text-white/70">tempo utilizado</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Resultado
                  </div>
                  <div className="mt-2 rounded-xl bg-background/60 px-4 py-4 text-center">
                    {reviewed ? (
                      <>
                        <div className="font-display text-2xl font-bold tabular-nums text-mint">
                          {evaluation!.final_score?.toFixed(2) ?? "—"} / {pct.toFixed(0)}%
                        </div>
                        <Badge className="mt-3" variant="outline">
                          {evaluation!.status === "aprovado"
                            ? "Aprovado"
                            : evaluation!.status === "reprovado"
                              ? "Reprovado"
                              : "Repetição"}
                        </Badge>
                      </>
                    ) : (
                      <div className="font-display text-base font-semibold text-muted-foreground">
                        Aguardando correção
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-center">
                  <Lock className="mx-auto h-4 w-4 text-muted-foreground" />
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Visualização somente leitura
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PRBlock({
  icon: Icon, title, right, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
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
