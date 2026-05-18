import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { STATIONS } from "@/data/stations";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SpecialtyMedals, NOTA_DE_CORTE, NOTA_DE_CORTE_EDICAO, NOTA_DE_CORTE_ESCALA10, MEDAL_SPECIALTIES, getSpecAvg } from "@/components/SpecialtyMedals";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";

export const Route = createFileRoute("/app/progresso")({
  component: ProgressPage,
  head: () => ({ meta: [{ title: "Progresso — Estação Revalida" }] }),
});

interface DbAttempt {
  id: string;
  station_id: string;
  station_title: string | null;
  specialty: string | null;
  score: number;
  status: string;
  created_at: string;
  professor_score: number | null;
  reviewed_at: string | null;
  professor_feedback: string | null;
}

function ProgressPage() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<DbAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("attempts")
      .select("id, station_id, station_title, specialty, score, status, created_at, professor_score, reviewed_at, professor_feedback")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setAttempts((data ?? []) as DbAttempt[]);
        setLoading(false);
      });
  }, [user]);

  const specStats = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    attempts.forEach((a) => {
      const k = a.specialty ?? "Outras";
      const cur = m.get(k) ?? { sum: 0, n: 0 };
      cur.sum += Number(a.score) || 0;
      cur.n += 1;
      m.set(k, cur);
    });
    return m;
  }, [attempts]);

  const avg =
    attempts.length > 0
      ? attempts.reduce((s, a) => s + Number(a.score), 0) / attempts.length
      : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Sua evolução</h1>
        <p className="mt-1 text-muted-foreground">
          Acompanhe seu desempenho por competência e histórico de estações.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Tentativas</div>
          <div className="mt-2 font-display text-3xl font-bold">{attempts.length}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Nota média</div>
          <div className="mt-2 font-display text-3xl font-bold text-medical">
            {avg.toFixed(1)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Nota de corte INEP</div>
          <div className="mt-2 font-display text-3xl font-bold text-mint">
            {NOTA_DE_CORTE.toFixed(3)}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {NOTA_DE_CORTE_EDICAO} · equivale a {NOTA_DE_CORTE_ESCALA10.toFixed(2)} na escala 0–10
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <SpecialtyMedals stats={specStats} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="font-semibold">Histórico recente</h3>
        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
        ) : attempts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Você ainda não realizou nenhuma estação. Vá em "Estações" e comece pela primeira.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {attempts.map((a) => {
              const st = STATIONS.find((s) => s.id === a.station_id);
              const title = a.station_title || st?.title || a.station_id;
              const specialty = a.specialty || st?.specialty || "—";
              const date = new Date(a.created_at).toLocaleDateString("pt-BR");
              return (
                <div key={a.id} className="py-3">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mint/10 font-display font-bold text-medical">
                      {Number(a.score).toFixed(1)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{title}</div>
                      <div className="text-xs text-muted-foreground">{specialty} · {date}</div>
                    </div>
                    {a.reviewed_at ? (
                      <Badge className="bg-success/15 text-success hover:bg-success/15">
                        Prof: {a.professor_score?.toFixed(1) ?? "—"}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{a.status}</Badge>
                    )}
                  </div>
                  {a.professor_feedback && (
                    <div className="mt-2 ml-16 rounded-xl border border-mint/30 bg-mint/5 p-3 text-sm">
                      <div className="text-xs font-semibold uppercase tracking-wider text-medical">Feedback do professor</div>
                      <p className="mt-1 text-foreground/90 whitespace-pre-wrap">{a.professor_feedback}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
