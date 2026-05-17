import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Clock, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATIONS, SPECIALTIES, type Specialty, type Station } from "@/data/stations";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/estacoes")({
  component: StationsPage,
  head: () => ({ meta: [{ title: "Estações — Estação Revalida" }] }),
});

const difficulties = ["Todas", "Fácil", "Médio", "Difícil"] as const;

function normalizeDifficulty(d: string): Station["difficulty"] {
  if (d === "Intermediário") return "Médio";
  if (d === "Avançado") return "Difícil";
  if (d === "Fácil" || d === "Médio" || d === "Difícil") return d;
  return "Médio";
}

type ListStation = Pick<Station, "id" | "title" | "specialty" | "difficulty" | "durationMinutes" | "clinicalCase" | "tag"> & { checklistCount: number };

function StationsPage() {
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState<Specialty | "Todas">("Todas");
  const [diff, setDiff] = useState<(typeof difficulties)[number]>("Todas");
  const [dbStations, setDbStations] = useState<ListStation[]>([]);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("custom_stations")
        .select("id, title, specialty, difficulty, duration_minutes, clinical_case, published")
        .eq("published", true)
        .order("updated_at", { ascending: false });
      if (!rows) return;
      const ids = rows.map((r) => r.id);
      const counts: Record<string, number> = {};
      if (ids.length) {
        const { data: items } = await supabase
          .from("station_checklist_items")
          .select("station_id")
          .in("station_id", ids);
        (items ?? []).forEach((it) => { counts[it.station_id] = (counts[it.station_id] ?? 0) + 1; });
      }
      setDbStations(rows.map((r) => ({
        id: r.id,
        title: r.title,
        specialty: r.specialty as Specialty,
        difficulty: normalizeDifficulty(r.difficulty),
        durationMinutes: r.duration_minutes ?? 10,
        clinicalCase: r.clinical_case ?? "",
        checklistCount: counts[r.id] ?? 0,
      })));
    })();
  }, []);

  const staticList: ListStation[] = STATIONS.map((s) => ({
    id: s.id, title: s.title, specialty: s.specialty, difficulty: s.difficulty,
    durationMinutes: s.durationMinutes, clinicalCase: s.clinicalCase, tag: s.tag,
    checklistCount: s.checklist.length,
  }));

  // DB stations first, then any static demos not duplicated by title
  const dbTitles = new Set(dbStations.map((s) => s.title.toLowerCase().trim()));
  const all: ListStation[] = [
    ...dbStations,
    ...staticList.filter((s) => !dbTitles.has(s.title.toLowerCase().trim())),
  ];

  const filtered = all.filter(
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
        {filtered.map((s) => {
          const meta = getSpecialtyMeta(s.specialty);
          return (
          <div
            key={s.id}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-elegant ${meta.card}`}
          >
            <div className={`absolute inset-x-0 top-0 h-1 ${meta.solid}`} aria-hidden />
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
              <span>· {s.checklistCount} itens</span>
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
          );
        })}
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
  accentClass,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
  /** Cor de destaque quando ativo (ex.: "bg-sky-500"). Se omitido, usa mint. */
  accentClass?: string;
}) {
  const base = `inline-flex items-center gap-1.5 rounded-full border px-3.5 ${small ? "py-1 text-xs" : "py-1.5 text-sm"} font-medium transition-all`;
  if (active && accentClass) {
    return (
      <button onClick={onClick} className={`${base} border-foreground/20 bg-card text-foreground shadow-sm`}>
        {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`${base} ${
        active
          ? "border-mint bg-mint/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:border-mint/40"
      }`}
    >
      {children}
    </button>
  );
}
