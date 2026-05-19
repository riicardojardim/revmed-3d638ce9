import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ArrowRight, ListChecks, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SPECIALTIES, type Specialty, type Station } from "@/data/stations";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createSimulado } from "@/lib/simulado";
import { SimuladoBuilder } from "@/components/SimuladoBuilder";
import { Reveal } from "@/components/ui/reveal";
import { Shimmer } from "@/components/ui/shimmer";
import { motion } from "framer-motion";

import { Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/checklists")({
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

function StationsPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState<Specialty | "Todas">("Todas");
  const [dbStations, setDbStations] = useState<ListStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [allSearch, setAllSearch] = useState("");
  const [allSpec, setAllSpec] = useState<Specialty | "Todas">("Todas");
  

  function startStation(s: ListStation) {
    if (!user) { toast.error("Faça login para iniciar."); return; }
    const sim = createSimulado(user.id, s.title, [{ id: s.id, title: s.title, specialty: s.specialty }]);
    nav({ to: "/app/sala/$code", params: { code: sim.id } });
  }

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
      (spec === "Todas" || s.specialty === spec) &&
      s.title.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="relative mx-auto max-w-7xl space-y-6">
      <Reveal>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Banco de Checklists</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Busque por tema, escolha uma estação e treine com o checklist oficial.
        </p>
      </Reveal>

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
            <div className="grid gap-4 md:grid-cols-2">
              <Shimmer className="h-36 rounded-2xl" />
              <Shimmer className="h-36 rounded-2xl" />
              <Shimmer className="h-36 rounded-2xl" />
              <Shimmer className="h-36 rounded-2xl" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              Nenhum checklist encontrado{q ? ` para "${q}"` : ""}.
            </div>
          ) : (
            <motion.div
              key={filtered.slice(0, 4).map((s) => s.id).join("|")}
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid gap-4 md:grid-cols-2"
            >
              {filtered.slice(0, 4).map((s) => {
                const meta = getSpecialtyMeta(s.specialty);
                return (
                  <motion.div key={s.id} variants={staggerItem}>
                    <div
                      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card/80 p-5 shadow-card backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-elegant ${meta.card}`}
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
                      <Button variant="hero" className="mt-5 w-full" onClick={() => startStation(s)}>
                        Iniciar estação <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
              {filtered.length > 4 && (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
                  }}
                  className="md:col-span-2 flex justify-center pt-2"
                >
                  <Button variant="outline" onClick={() => { setAllSearch(""); setAllOpen(true); }}>
                    Ver todos os {filtered.length} checklists <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </motion.div>
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
              Explore o catálogo completo de checklists disponíveis.
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold">{dbStations.length}</span>
              <span className="text-xs text-muted-foreground">checklists publicados</span>
            </div>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => { setAllSearch(""); setAllOpen(true); }}
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
              Monte um simulado com 2 ou mais checklists e cronômetro oficial.
            </p>
            <Button variant="hero" className="mt-4 w-full" onClick={() => setBuilderOpen(true)}>
              Montar simulado <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </aside>
      </div>
      <SimuladoBuilder open={builderOpen} onOpenChange={setBuilderOpen} />

      <Dialog open={allOpen} onOpenChange={setAllOpen}>
        <DialogContent className="max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-mint" />
              Todos os checklists
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={allSearch}
                onChange={(e) => setAllSearch(e.target.value)}
                placeholder="Buscar checklist..."
                className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setAllSpec("Todas")}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  allSpec === "Todas"
                    ? "border-mint bg-mint/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-mint/40",
                )}
              >
                Todas
              </button>
              {SPECIALTIES.map((s) => {
                const m = getSpecialtyMeta(s);
                const active = allSpec === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAllSpec(s)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-foreground/20 bg-card text-foreground shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-mint/40",
                    )}
                  >
                    <span className={cn("inline-block h-1.5 w-1.5 rounded-full", m.solid)} />
                    {s}
                  </button>
                );
              })}
            </div>
            <ul className="max-h-[55vh] divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card">
              {dbStations
                .filter((s) => (allSpec === "Todas" || s.specialty === allSpec) && s.title.toLowerCase().includes(allSearch.toLowerCase()))
                .map((s) => {
                  const m = getSpecialtyMeta(s.specialty);
                  return (
                    <li key={s.id} className="flex min-w-0 items-center gap-3 px-3 py-2.5">
                      <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 font-mono text-[10px] font-bold", m.badge)}>{m.code}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{s.title}</div>
                        <div className="truncate text-xs text-muted-foreground">{s.specialty} • {s.checklistCount} itens</div>
                      </div>
                      <Button size="sm" variant="hero" onClick={() => { setAllOpen(false); startStation(s); }}>
                        Iniciar <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  );
                })}
              {dbStations.length === 0 && (
                <li className="px-3 py-10 text-center text-xs text-muted-foreground">Nenhum checklist publicado.</li>
              )}
            </ul>
          </div>
        </DialogContent>
      </Dialog>

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
