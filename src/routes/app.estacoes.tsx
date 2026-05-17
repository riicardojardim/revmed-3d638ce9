import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Clock, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATIONS, SPECIALTIES, type Specialty } from "@/data/stations";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";

export const Route = createFileRoute("/app/estacoes")({
  component: StationsPage,
  head: () => ({ meta: [{ title: "Estações — Estação Revalida" }] }),
});

const difficulties = ["Todas", "Fácil", "Médio", "Difícil"] as const;

function StationsPage() {
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState<Specialty | "Todas">("Todas");
  const [diff, setDiff] = useState<(typeof difficulties)[number]>("Todas");

  const filtered = STATIONS.filter(
    (s) =>
      (spec === "Todas" || s.specialty === spec) &&
      (diff === "Todas" || s.difficulty === diff) &&
      s.title.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Biblioteca de estações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha por área, dificuldade e tempo. Treine por estação. Evolua por competência.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar estação..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip active={spec === "Todas"} onClick={() => setSpec("Todas")}>
            Todas as áreas
          </FilterChip>
          {SPECIALTIES.map((s) => {
            const meta = getSpecialtyMeta(s);
            return (
              <FilterChip
                key={s}
                active={spec === s}
                onClick={() => setSpec(s)}
                accentClass={meta.solid}
              >
                <span className={`inline-block h-2 w-2 rounded-full ${meta.solid}`} />
                {s}
              </FilterChip>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {difficulties.map((d) => (
            <FilterChip key={d} active={diff === d} onClick={() => setDiff(d)} small>
              {d}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s) => (
          <div
            key={s.id}
            className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-elegant"
          >
            <div className="flex items-start justify-between gap-3">
              <SpecialtyBadge specialty={s.specialty} />
              {s.tag && (
                <Badge className="bg-mint/15 text-foreground hover:bg-mint/15">{s.tag}</Badge>
              )}
            </div>
            <h3 className="mt-4 font-display text-lg font-bold leading-tight">{s.title}</h3>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {s.durationMinutes} min
              </span>
              <span>· {s.difficulty}</span>
              <span>· {s.checklist.length} itens</span>
            </div>
            <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted-foreground">
              {s.clinicalCase}
            </p>
            <Link to="/app/simulacao/$id" params={{ id: s.id }} className="mt-5">
              <Button variant="hero" className="w-full">
                Iniciar estação <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Nenhuma estação encontrada com esses filtros.
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  small,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 ${small ? "py-1 text-xs" : "py-1.5 text-sm"} font-medium transition-all ${
        active
          ? "border-mint bg-mint/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:border-mint/40"
      }`}
    >
      {children}
    </button>
  );
}
