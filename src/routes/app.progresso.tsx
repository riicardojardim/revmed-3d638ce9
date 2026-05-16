import { createFileRoute } from "@tanstack/react-router";
import { COMPETENCIES, RECENT_ATTEMPTS, STATIONS } from "@/data/stations";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/progresso")({
  component: ProgressPage,
  head: () => ({ meta: [{ title: "Progresso — Estação Revalida" }] }),
});

function ProgressPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Sua evolução</h1>
        <p className="mt-1 text-muted-foreground">Acompanhe seu desempenho por competência e histórico de estações.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="font-semibold">Competências</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {COMPETENCIES.map((c) => (
            <div key={c.name}>
              <div className="flex justify-between text-sm">
                <span>{c.name}</span>
                <span className="font-medium text-medical">{c.value}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-mint" style={{ width: `${c.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="font-semibold">Histórico recente</h3>
        <div className="mt-4 divide-y divide-border">
          {RECENT_ATTEMPTS.map((a) => {
            const st = STATIONS.find((s) => s.id === a.stationId)!;
            return (
              <div key={a.id} className="flex items-center gap-4 py-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mint/10 font-display font-bold text-medical">
                  {a.score.toFixed(1)}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{st.title}</div>
                  <div className="text-xs text-muted-foreground">{st.specialty} · {a.date}</div>
                </div>
                <Badge variant="outline">{a.status}</Badge>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
