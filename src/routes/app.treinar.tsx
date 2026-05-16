import { createFileRoute, Link } from "@tanstack/react-router";
import { STATIONS } from "@/data/stations";
import { Button } from "@/components/ui/button";
import { Users, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/app/treinar")({
  component: TrainPage,
  head: () => ({ meta: [{ title: "Treinar — Estação Revalida" }] }),
});

function TrainPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Modos de treino</h1>
        <p className="mt-1 text-muted-foreground">Escolha como quer treinar hoje.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/app/simulacao/$id" params={{ id: STATIONS[0].id }} className="group">
          <div className="h-full rounded-3xl border border-border bg-gradient-hero p-6 text-white shadow-elegant transition-all group-hover:-translate-y-1">
            <Sparkles className="h-7 w-7 text-mint" />
            <h3 className="mt-4 font-display text-xl font-bold">Treino individual</h3>
            <p className="mt-2 text-sm text-white/70">
              Inicie a estação recomendada agora e simule com cronômetro e checklist.
            </p>
            <div className="mt-6 inline-flex items-center gap-1 font-medium text-mint">
              Começar <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </Link>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <Users className="h-7 w-7 text-medical" />
          <h3 className="mt-4 font-display text-xl font-bold">Sala de treino em dupla</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie uma sala e treine com um colega no papel de avaliador ou candidato.
          </p>
          <div className="mt-5 flex gap-2">
            <Button variant="hero" className="flex-1">Criar sala</Button>
            <Button variant="outline" className="flex-1">Entrar com código</Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Videochamada em breve.</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold">Estações populares</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {STATIONS.slice(0, 4).map((s) => (
            <Link
              key={s.id}
              to="/app/simulacao/$id"
              params={{ id: s.id }}
              className="rounded-2xl border border-border bg-card p-4 transition-all hover:border-mint/40 hover:shadow-card"
            >
              <div className="text-xs text-muted-foreground">{s.specialty}</div>
              <div className="mt-1 font-medium">{s.title}</div>
              <div className="mt-2 text-xs text-muted-foreground">{s.durationMinutes} min · {s.difficulty}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
