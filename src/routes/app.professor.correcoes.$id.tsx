import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { STATIONS } from "@/data/stations";
import { z } from "zod";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";

export const Route = createFileRoute("/app/professor/correcoes/$id")({
  component: ReviewPage,
});

interface Attempt {
  id: string;
  user_id: string;
  station_id: string;
  station_title: string | null;
  specialty: string | null;
  score: number;
  earned: number;
  total_points: number;
  used_seconds: number;
  checked_items: string[];
  notes: string | null;
  status: string;
  created_at: string;
  professor_feedback: string | null;
  professor_score: number | null;
  reviewed_at: string | null;
}

const reviewSchema = z.object({
  professor_score: z.number().min(0).max(10),
  professor_feedback: z.string().trim().min(10, "Escreva ao menos 10 caracteres").max(4000),
});

function ReviewPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [studentName, setStudentName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("attempts").select("*").eq("id", id).maybeSingle();
      const a = (data as Attempt) ?? null;
      setAttempt(a);
      if (a) {
        setFeedback(a.professor_feedback ?? "");
        setScore(Number(a.professor_score ?? a.score));
        const { data: p } = await supabase.from("profiles").select("full_name").eq("id", a.user_id).maybeSingle();
        setStudentName((p as { full_name: string | null } | null)?.full_name ?? "Aluno");
      }
    })();
  }, [id]);

  async function submit() {
    if (!attempt || !user) return;
    const parsed = reviewSchema.safeParse({ professor_score: score, professor_feedback: feedback });
    if (!parsed.success) return toast.error("Dados inválidos", { description: parsed.error.issues[0]?.message });
    setSaving(true);
    const { error } = await supabase
      .from("attempts")
      .update({
        professor_feedback: parsed.data.professor_feedback,
        professor_score: parsed.data.professor_score,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar", { description: error.message });
    toast.success("Correção enviada");
    nav({ to: "/app/professor/correcoes" });
  }

  if (!attempt) return <div className="text-sm text-muted-foreground">Carregando...</div>;

  const stationRef = STATIONS.find((s) => s.id === attempt.station_id);
  const checkedSet = new Set(attempt.checked_items);
  const usedMin = Math.floor(attempt.used_seconds / 60);
  const usedSec = attempt.used_seconds % 60;

  return (
    <div className="space-y-6">
      <Link to="/app/professor/correcoes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar à fila
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-medical/30 text-medical">{attempt.specialty ?? "—"}</Badge>
          {attempt.reviewed_at && <Badge className="bg-success/15 text-success">Corrigida</Badge>}
        </div>
        <h2 className="mt-2 font-display text-2xl font-bold">{attempt.station_title ?? "Estação"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enviada por <strong>{studentName}</strong> em {new Date(attempt.created_at).toLocaleString("pt-BR")}
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Metric label="Nota automática" value={Number(attempt.score).toFixed(1)} />
          <Metric label="Pontos" value={`${attempt.earned}/${attempt.total_points}`} />
          <Metric label="Tempo" value={`${usedMin}:${String(usedSec).padStart(2, "0")}`} icon={Clock} />
        </div>
      </div>

      {stationRef && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-semibold">Checklist do aluno</h3>
          <div className="mt-3 space-y-2">
            {stationRef.checklist.map((item) => {
              const done = checkedSet.has(item.id);
              return (
                <div key={item.id} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${done ? "border-success/30 bg-success/5" : "border-border"}`}>
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${done ? "text-success" : "text-muted-foreground/40"}`} />
                  <div className="flex-1">
                    <div>{item.description}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.category} · {item.points} pts</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {attempt.notes && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-semibold">Anotações do candidato</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{attempt.notes}</p>
        </div>
      )}

      <div className="rounded-2xl border border-mint/30 bg-gradient-card p-6 shadow-card">
        <h3 className="font-display text-lg font-semibold">Sua avaliação</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-[160px,1fr]">
          <div>
            <Label htmlFor="score">Nota (0–10)</Label>
            <Input id="score" type="number" step="0.1" min={0} max={10} value={score} onChange={(e) => setScore(Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="fb">Feedback ao aluno</Label>
            <Textarea id="fb" rows={6} placeholder="Pontos fortes, pontos a melhorar, sugestões de estudo..." value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="hero" onClick={submit} disabled={saving}>
            <Send className="h-4 w-4" /> {saving ? "Enviando..." : attempt.reviewed_at ? "Atualizar correção" : "Enviar correção"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 text-mint" />} {label}
      </div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
