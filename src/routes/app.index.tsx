import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Clock,
  Flame,
  Target,
  Trophy,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATIONS, RECENT_ATTEMPTS, COMPETENCIES } from "@/data/stations";
import { useSubscription } from "@/hooks/use-subscription";
import { AtorDashboard } from "@/components/AtorDashboard";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Estação Revalida" }] }),
});

const indicators = [
  { icon: Target, label: "Estações concluídas", value: "24" },
  { icon: TrendingUp, label: "Média geral", value: "7,8" },
  { icon: Trophy, label: "Melhor área", value: "Comunicação" },
  { icon: Flame, label: "Sequência", value: "5 dias" },
];

function Dashboard() {
  const { plan, isPrivileged, loading } = useSubscription();
  const recommended = STATIONS[0];

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!isPrivileged && plan?.slug === "ator") {
    return <AtorDashboard />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Bem-vinda de volta</p>
        <h1 className="font-display text-2xl font-bold md:text-3xl">
          Olá, Marina. Pronto para treinar hoje?
        </h1>
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {indicators.map((i) => (
          <div key={i.label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <i.icon className="h-4 w-4 text-mint" />
              {i.label}
            </div>
            <div className="mt-2 font-display text-2xl font-bold">{i.value}</div>
          </div>
        ))}
      </div>

      {/* Recommended station */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-hero p-6 text-white shadow-elegant md:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-mint/30 blur-3xl" />
        <Badge className="border-mint/40 bg-mint/15 text-mint hover:bg-mint/15">Recomendada para você</Badge>
        <h2 className="mt-4 font-display text-2xl font-bold md:text-3xl">{recommended.title}</h2>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-white/70">
          <span>{recommended.specialty}</span>
          <span>·</span>
          <span>{recommended.difficulty}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {recommended.durationMinutes} min
          </span>
        </div>
        <p className="mt-4 max-w-2xl text-sm text-white/80">{recommended.clinicalCase}</p>
        <Link to="/app/simulacao/$id" params={{ id: recommended.id }} className="mt-6 inline-block">
          <Button variant="hero" size="lg">
            Iniciar treino <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Competencies */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Competências</h3>
            <span className="text-xs text-muted-foreground">últimos 30 dias</span>
          </div>
          <div className="mt-5 space-y-4">
            {COMPETENCIES.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="font-medium text-medical">{c.value}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-mint"
                    style={{ width: `${c.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent attempts */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Últimas estações</h3>
            <Link to="/app/progresso" className="text-xs font-medium text-mint hover:underline">
              Ver tudo
            </Link>
          </div>
          <div className="mt-5 divide-y divide-border">
            {RECENT_ATTEMPTS.map((a) => {
              const st = STATIONS.find((s) => s.id === a.stationId)!;
              return (
                <div key={a.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint/10 font-display text-sm font-bold text-medical">
                    {a.score.toFixed(1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{st.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {st.specialty} · {a.date}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      a.status === "Corrigida"
                        ? "border-success/40 text-success"
                        : a.status === "Em revisão"
                          ? "border-warning/40 text-warning"
                          : "border-border"
                    }
                  >
                    {a.status}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
