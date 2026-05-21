import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { loadStation, type LoadedStation } from "@/lib/stationLoader";
import { ArrowLeft, ClipboardCheck, Lock, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPepHeading, parseSubItems, levelTone, BoldBeforeColon } from "@/components/station/shared";

export const Route = createFileRoute("/app/historico/$id")({
  component: HistoricoDetalhe,
  head: () => ({ meta: [{ title: "Detalhe — Histórico" }] }),
});

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

function HistoricoDetalhe() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [station, setStation] = useState<LoadedStation | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: a } = await supabase
        .from("attempts")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!a) { setLoading(false); return; }
      const att = a as unknown as Attempt;
      setAttempt(att);
      const st = await loadStation(att.station_id);
      setStation(st);
      if (att.room_id) {
        const { data: ev } = await supabase
          .from("room_evaluations")
          .select("final_score, status, final_feedback, checks, item_comments")
          .eq("room_id", att.room_id)
          .eq("candidate_id", user.id)
          .maybeSingle();
        if (ev) {
          setEvaluation({
            final_score: ev.final_score as number | null,
            status: ev.status as string,
            final_feedback: (ev.final_feedback as string | null) ?? null,
            checks: (ev.checks as Record<string, number>) ?? {},
            item_comments: (ev.item_comments as Record<string, string>) ?? {},
          });
        }
      }
      setLoading(false);
    })();
  }, [id, user]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  if (!attempt) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Link to="/app/historico" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <p className="text-sm text-muted-foreground">Tentativa não encontrada.</p>
      </div>
    );
  }

  const pct = evaluation?.final_score != null ? evaluation.final_score * 10 : (attempt.score ?? 0) * 10;
  const reviewed = evaluation && evaluation.status !== "em_andamento";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/app/historico" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao histórico
        </Link>
        <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Somente leitura</Badge>
      </div>

      <div className="rounded-2xl border border-border bg-gradient-hero p-6 text-white shadow-elegant">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Estação concluída</div>
        <h1 className="mt-1 font-display text-2xl font-bold md:text-3xl">{attempt.station_title ?? "—"}</h1>
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

      {station && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-mint" />
            <h2 className="font-display text-lg font-bold">CHECKLIST ( PEP )</h2>
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
                            <li key={si} className="rounded-md px-2 py-1 text-sm text-foreground/85"><BoldBeforeColon text={sub} /></li>
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
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Suas anotações</div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{attempt.notes}</p>
        </div>
      )}
    </div>
  );
}
