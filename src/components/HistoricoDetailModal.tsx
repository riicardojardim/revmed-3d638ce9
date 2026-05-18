import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { loadStation, type LoadedStation } from "@/lib/stationLoader";
import { ClipboardCheck, Lock, Clock, Package, NotebookPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPepHeading, parseSubItems, levelTone } from "@/components/station/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

  useEffect(() => {
    if (!open || !attemptId || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setAttempt(null);
      setStation(null);
      setEvaluation(null);
      setDeliveries([]);
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
            .maybeSingle(),
          supabase
            .from("room_material_deliveries")
            .select("id, material_id, material_name, material_type, material_description, material_content, material_image_url, delivered_at")
            .eq("room_id", att.room_id)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="font-display text-xl">
              {attempt?.station_title ?? "Detalhe da estação"}
            </DialogTitle>
            <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Somente leitura</Badge>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : !attempt ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Tentativa não encontrada.</div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-gradient-hero p-5 text-white shadow-elegant">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Estação concluída</div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/80">
                {attempt.specialty && <span>{attempt.specialty}</span>}
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {Math.round(attempt.used_seconds / 60)} min</span>
                <span>•</span>
                <span>{new Date(attempt.created_at).toLocaleString("pt-BR")}</span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-5 text-center md:col-span-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nota final</div>
                <div className="mt-2 font-display text-4xl font-bold text-mint tabular-nums">
                  {reviewed ? `${evaluation!.final_score?.toFixed(2) ?? "—"}` : "—"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{pct.toFixed(0)}%</div>
                {reviewed && (
                  <Badge className="mt-3" variant="outline">
                    {evaluation!.status === "aprovado" ? "Aprovado" : evaluation!.status === "reprovado" ? "Reprovado" : "Repetição"}
                  </Badge>
                )}
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 md:col-span-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Comentário final do ator</div>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {reviewed && evaluation!.final_feedback
                    ? evaluation!.final_feedback
                    : attempt.professor_feedback || <span className="text-muted-foreground">Sem comentários.</span>}
                </p>
              </div>
            </div>

            {deliveries.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-mint" />
                  <h2 className="font-display text-base font-bold">Impressos entregues pelo ator</h2>
                </div>
                <ul className="space-y-2">
                  {deliveries.map((d) => (
                    <li key={d.id} className="rounded-xl border border-border bg-background/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{d.material_name}</div>
                          {d.material_type && (
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.material_type}</div>
                          )}
                        </div>
                        <div className="shrink-0 text-[10px] text-muted-foreground">
                          {new Date(d.delivered_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      {d.material_description && (
                        <p className="mt-2 text-xs text-muted-foreground">{d.material_description}</p>
                      )}
                      {d.material_content && (
                        <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-xs">{d.material_content}</pre>
                      )}
                      {d.material_image_url && (
                        <img src={d.material_image_url} alt={d.material_name} className="mt-2 max-h-72 rounded-md object-contain" />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {station && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-mint" />
                  <h2 className="font-display text-base font-bold">CHECKLIST ( PEP )</h2>
                </div>

                {!reviewed ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" /> Esta estação ainda não foi corrigida.
                  </div>
                ) : (
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
                )}
              </div>
            )}

            {attempt.notes && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <NotebookPen className="h-4 w-4 text-mint" />
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Suas anotações</div>
                </div>
                <p className="whitespace-pre-wrap text-sm">{attempt.notes}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
