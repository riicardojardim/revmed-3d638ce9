import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ArrowRight, ListChecks, Sparkles, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SPECIALTIES, type Specialty, type Station } from "@/data/stations";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/estacoes")({
  component: StationsPage,
  head: () => ({ meta: [{ title: "Banco de Checklists — Estação Revalida" }] }),
});

function normalizeDifficulty(d: string): Station["difficulty"] {
  if (d === "Intermediário") return "Médio";
  if (d === "Avançado") return "Difícil";
  if (d === "Fácil" || d === "Médio" || d === "Difícil") return d;
  return "Médio";
}

type Origin = "revalida" | "parceiros";

type ListStation = Pick<Station, "id" | "title" | "specialty" | "difficulty" | "durationMinutes" | "clinicalCase" | "tag"> & {
  checklistCount: number;
  origin: Origin;
};

const SUGGESTED_TOPICS = [
  "Dor torácica",
  "Pré-natal",
  "Comunicação de más notícias",
  "Sepse",
  "AVC",
  "Asma",
  "Hipertensão",
  "Aleitamento",
];

function StationsPage() {
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState<Specialty | "Todas">("Todas");
  const [dbStations, setDbStations] = useState<ListStation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("custom_stations")
        .select("id, title, specialty, difficulty, duration_minutes, clinical_case, published, created_by")
        .eq("published", true)
        .order("updated_at", { ascending: false });
      if (!rows) { setLoading(false); return; }

      const creatorIds = Array.from(new Set(rows.map((r) => r.created_by)));
      const adminIds = new Set<string>();
      if (creatorIds.length) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", creatorIds)
          .eq("role", "admin");
        (roles ?? []).forEach((r) => adminIds.add(r.user_id));
      }

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
        origin: adminIds.has(r.created_by) ? "revalida" : "parceiros",
      })));
      setLoading(false);
    })();
  }, []);

  const countsByOrigin = useMemo(() => ({
    revalida: dbStations.filter((s) => s.origin === "revalida").length,
    parceiros: dbStations.filter((s) => s.origin === "parceiros").length,
  }), [dbStations]);

  const filtered = dbStations.filter(
    (s) =>
      s.origin === origin &&
      (spec === "Todas" || s.specialty === spec) &&
      s.title.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Banco de Checklists</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Busque por tema, escolha uma estação e treine com o checklist oficial.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main column */}
        <div className="space-y-5">
          {/* Search */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por tema, sintoma ou estação..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-11 pl-9 text-base"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Sugestões:
              </span>
              {SUGGESTED_TOPICS.map((t) => (
                <button
                  key={t}
                  onClick={() => setQ(t)}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:border-mint/50 hover:text-foreground"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Origin sub-tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
            <OriginTab
              active={origin === "revalida"}
              onClick={() => setOrigin("revalida")}
              label="Estação Revalida"
              count={countsByOrigin.revalida}
            />
            <OriginTab
              active={origin === "parceiros"}
              onClick={() => setOrigin("parceiros")}
              label="Parceiros"
              count={countsByOrigin.parceiros}
            />
          </div>

          {/* Specialty filters */}
          <div className="flex flex-wrap gap-2">
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

          {/* Cards */}
          {loading ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Carregando estações...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              Nenhuma estação encontrada{q ? ` para "${q}"` : ""}.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
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
                      <span>{s.checklistCount} itens</span>
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
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-mint/10 to-card p-5 shadow-card">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-mint/20 text-foreground">
              <ListChecks className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-display text-lg font-bold">Todos os Checklists</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Explore o catálogo completo de estações disponíveis.
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold">{dbStations.length}</span>
              <span className="text-xs text-muted-foreground">estações publicadas</span>
            </div>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => { setQ(""); setSpec("Todas"); }}
            >
              Ver todas <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
              <Wand2 className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-display text-lg font-bold">Criar Simulado</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Monte um simulado com várias estações e cronômetro oficial.
            </p>
            <Link to="/app/treinar" className="mt-4 block">
              <Button variant="hero" className="w-full">
                Montar simulado <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function OriginTab({
  active,
  onClick,
  label,
  count,
}: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-foreground text-background shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${active ? "bg-background/15" : "bg-muted"}`}>
        {count}
      </span>
    </button>
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
