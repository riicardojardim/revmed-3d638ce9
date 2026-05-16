import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { loadStation, type LoadedStation } from "@/lib/stationLoader";
import { ArrowLeft, ClipboardCheck, Send, CheckCircle2, XCircle, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/sala/$code/banca")({
  component: EvaluatorView,
  head: () => ({ meta: [{ title: "Banca avaliadora — Estação Revalida" }] }),
});

type Room = { id: string; code: string; station_id: string; station_title: string };

function EvaluatorView() {
  const { code } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [station, setStation] = useState<LoadedStation | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState<"em_andamento" | "aprovado" | "reprovado" | "repetir">("em_andamento");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: r } = await supabase.from("training_rooms").select("id, code, station_id, station_title").eq("code", code).maybeSingle();
      if (!r) return;
      setRoom(r as Room);
      setStation(await loadStation((r as Room).station_id));
      const { data: parts } = await supabase.from("training_room_participants").select("user_id, role").eq("room_id", (r as Room).id);
      const cand = (parts ?? []).find((p: { role: string }) => p.role === "candidato");
      setCandidateId(cand?.user_id ?? null);
      if (user) {
        const { data: ev } = await supabase.from("room_evaluations")
          .select("*").eq("room_id", (r as Room).id).eq("evaluator_id", user.id).maybeSingle();
        if (ev) {
          setChecks((ev.checks ?? {}) as Record<string, boolean>);
          setComments((ev.item_comments ?? {}) as Record<string, string>);
          setFeedback(ev.final_feedback ?? "");
          setStatus(ev.status as typeof status);
        }
      }
    })();
  }, [code, user?.id]);

  const totals = useMemo(() => {
    if (!station) return { total: 0, earned: 0 };
    const total = station.checklist.reduce((s, i) => s + i.points, 0);
    const earned = station.checklist.reduce((s, i) => s + (checks[i.id] ? i.points : 0), 0);
    return { total, earned };
  }, [station, checks]);
  const score = totals.total > 0 ? (totals.earned / totals.total) * 10 : 0;

  async function save(submit = false) {
    if (!room || !user) return;
    setSaving(true);
    const payload = {
      room_id: room.id,
      evaluator_id: user.id,
      candidate_id: candidateId,
      station_id: room.station_id,
      checks,
      item_comments: comments,
      final_feedback: feedback,
      final_score: Number(score.toFixed(2)),
      status: submit ? status : "em_andamento",
      submitted_at: submit ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from("room_evaluations")
      .upsert(payload, { onConflict: "room_id,evaluator_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(submit ? "Correção enviada" : "Rascunho salvo");
    if (submit) nav({ to: "/app/sala/$code", params: { code } });
  }

  if (!station || !room) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/app/sala/$code" params={{ code }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar à sala
      </Link>

      <div className="rounded-3xl border border-indigo-200/40 bg-gradient-to-br from-indigo-50/60 to-mint/5 p-6 dark:from-indigo-900/10 dark:to-mint/5">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/40 bg-indigo-100/40 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
          <ClipboardCheck className="h-3.5 w-3.5" /> Banca avaliadora
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">{room.station_title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Marque os itens realizados pelo candidato. Pontuação é calculada automaticamente.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3">
          {station.checklist.map((it) => (
            <div key={it.id} className={`rounded-2xl border p-4 ${checks[it.id] ? "border-mint/50 bg-mint/5" : "border-border bg-card"}`}>
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox checked={!!checks[it.id]}
                  onCheckedChange={(v) => setChecks((c) => ({ ...c, [it.id]: v === true }))}
                  className="mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm">{it.description}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{it.category}</Badge>
                    <span>{it.points} pts</span>
                  </div>
                </div>
              </label>
              <Textarea
                value={comments[it.id] ?? ""}
                onChange={(e) => setComments((c) => ({ ...c, [it.id]: e.target.value }))}
                placeholder="Comentário para este item (opcional)"
                rows={2}
                className="mt-3"
              />
            </div>
          ))}

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Feedback final</div>
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={5}
              placeholder="Pontos fortes, pontos a melhorar, recomendação..." className="mt-2" />
            <div className="mt-4 flex flex-wrap gap-2">
              {([
                { v: "aprovado", l: "Aprovar", icon: CheckCircle2, cls: "border-emerald-300 text-emerald-700" },
                { v: "reprovado", l: "Reprovar", icon: XCircle, cls: "border-rose-300 text-rose-700" },
                { v: "repetir", l: "Pedir repetição", icon: RotateCw, cls: "border-amber-300 text-amber-700" },
              ] as const).map((b) => (
                <Button key={b.v} variant={status === b.v ? "secondary" : "outline"}
                  className={status === b.v ? "" : b.cls}
                  onClick={() => setStatus(b.v)}>
                  <b.icon className="mr-1 h-4 w-4" /> {b.l}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-3xl border bg-gradient-hero p-6 text-white shadow-elegant">
            <div className="text-xs font-medium uppercase tracking-wider text-mint">Pontuação</div>
            <div className="mt-2 font-display text-5xl font-bold tabular-nums">{score.toFixed(1)}</div>
            <div className="mt-1 text-sm text-white/70">{totals.earned} / {totals.total} pts</div>

            {station.evaluatorNotes && (
              <div className="mt-5 rounded-xl border border-white/15 bg-white/5 p-3 text-xs text-white/80">
                <div className="font-medium text-mint">Observações para a banca</div>
                <div className="mt-1 whitespace-pre-wrap">{station.evaluatorNotes}</div>
              </div>
            )}

            <div className="mt-6 space-y-2">
              <Button variant="outline" className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => save(false)} disabled={saving}>
                Salvar rascunho
              </Button>
              <Button variant="hero" className="w-full" onClick={() => save(true)} disabled={saving || status === "em_andamento"}>
                <Send className="mr-1 h-4 w-4" /> Finalizar correção
              </Button>
            </div>
            {status === "em_andamento" && (
              <div className="mt-2 text-center text-[11px] text-white/60">Escolha aprovar, reprovar ou repetir antes de finalizar.</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
