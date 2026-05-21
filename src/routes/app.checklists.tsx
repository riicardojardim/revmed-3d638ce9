import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowRight, ListChecks, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SPECIALTIES, type Specialty, type Station } from "@/data/stations";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createSimulado } from "@/lib/simulado";
import { SimuladoBuilder } from "@/components/SimuladoBuilder";
import { Reveal } from "@/components/ui/reveal";
import { Shimmer } from "@/components/ui/shimmer";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/stagger";
import { toast } from "sonner";
import { StationPDFButton } from "@/components/station/StationPDFButton";


export const Route = createFileRoute("/app/checklists")({
  component: StationsPage,
  head: () => ({ meta: [{ title: "Banco de Checklists — REVMED" }] }),
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
  const [builderOpen, setBuilderOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [allSearch, setAllSearch] = useState("");
  const [allSpec, setAllSpec] = useState<Specialty | "Todas">("Todas");

  const { data: dbStations = [], isLoading: loading } = useQuery({
    queryKey: ["checklists", "published"],
    staleTime: 60_000,
    queryFn: async (): Promise<ListStation[]> => {
      const { data: rows } = await supabase
        .from("custom_stations")
        .select("id, title, specialty, difficulty, duration_minutes, clinical_case, published, created_by")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (!rows) return [];

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

      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        specialty: r.specialty as Specialty,
        difficulty: normalizeDifficulty(r.difficulty),
        durationMinutes: r.duration_minutes ?? 10,
        clinicalCase: r.clinical_case ?? "",
        checklistCount: counts[r.id] ?? 0,
        origin: adminIds.has(r.created_by) ? "revalida" : "parceiros",
      }));
    },
  });

  function startStation(s: ListStation) {
    if (!user) { toast.error("Faça login para iniciar."); return; }
    const sim = createSimulado(user.id, s.title, [{ id: s.id, title: s.title, specialty: s.specialty }]);
    nav({ to: "/app/sala/$code", params: { code: sim.id } });
  }





  const filtered = dbStations.filter((s) => {
    if (spec !== "Todas" && s.specialty !== spec) return false;
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return s.title.toLowerCase().includes(term) || s.specialty.toLowerCase().includes(term);
  });

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
        <div className="min-w-0 space-y-5">
          {/* Search */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por tema ou especialidade..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-11 pl-9 text-base"
              />
            </div>
          </div>


          {/* Specialty filters */}
          {(() => {
            const order: Specialty[] = ["Cirurgia", "Pediatria", "Clínica Médica", "Ginecologia e Obstetrícia", "Medicina de Família e Comunidade"];
            const row1 = order.slice(0, 3);
            const row2 = order.slice(3);
            const renderMobile = (s: Specialty) => {
              const meta = getSpecialtyMeta(s);
              const active = spec === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpec(s)}
                  title={s}
                  className={cn(
                    "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border px-2 text-[11px] font-medium leading-tight transition-all",
                    active
                      ? "border-foreground/20 bg-card text-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-mint/40",
                  )}
                >
                  <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", meta.solid)} />
                  <span className="truncate text-center">{s}</span>
                </button>
              );
            };
            return (
              <div className="space-y-2 lg:space-y-0">
                {/* Mobile/Tablet */}
                <div className="space-y-2 lg:hidden">
                  <FilterChip active={spec === "Todas"} onClick={() => setSpec("Todas")} small className="h-10 w-full justify-center">
                    Todas
                  </FilterChip>
                  <div className="grid grid-cols-3 gap-2">{row1.map(renderMobile)}</div>
                  <div className="grid grid-cols-2 gap-2">{row2.map(renderMobile)}</div>
                </div>
                {/* Desktop */}
                <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-1.5">
                  <FilterChip active={spec === "Todas"} onClick={() => setSpec("Todas")} small>
                    Todas
                  </FilterChip>
                  {SPECIALTIES.map((s) => {
                    const meta = getSpecialtyMeta(s);
                    return (
                      <FilterChip key={s} active={spec === s} onClick={() => setSpec(s)} accentClass={meta.solid} small>
                        <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${meta.solid}`} />
                        <span className="whitespace-nowrap">{s}</span>
                      </FilterChip>
                    );
                  })}
                </div>
              </div>
            );
          })()}




          {/* List */}
          {loading ? (
            <div className="space-y-2">
              <Shimmer className="h-14 rounded-xl" />
              <Shimmer className="h-14 rounded-xl" />
              <Shimmer className="h-14 rounded-xl" />
              <Shimmer className="h-14 rounded-xl" />
              <Shimmer className="h-14 rounded-xl" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              Nenhum checklist encontrado{q ? ` para "${q}"` : ""}.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ListChecks className="h-4 w-4 text-mint" />
                    Checklists
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
                  </span>
                </div>
                <motion.ul
                  key={filtered.slice(0, 5).map((s) => s.id).join("|")}
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="divide-y divide-border"
                >
                  {filtered.slice(0, 5).map((s) => {
                    const m = getSpecialtyMeta(s.specialty);
                    return (
                      <motion.li
                        key={s.id}
                        variants={staggerItem}
                        className="flex min-w-0 items-center gap-2 px-3 py-3 transition-colors hover:bg-muted/40 sm:gap-3 sm:px-4"
                      >
                        <span className={cn("inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-1.5 font-mono text-[10px] font-bold", m.badge)}>
                          {m.code}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{s.title}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {s.specialty} • {s.checklistCount} itens
                          </div>
                        </div>
                        <StationPDFButton stationId={s.id} iconOnly />
                        <Button size="sm" variant="hero" onClick={() => startStation(s)} className="shrink-0 px-2.5 sm:px-3">
                          <span className="hidden sm:inline">Iniciar</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              </div>
              {filtered.length > 5 && (
                <div className="flex justify-center pt-1">
                  <Button
                    variant="outline"
                    onClick={() => { setAllSearch(""); setAllSpec("Todas"); setAllOpen(true); }}
                  >
                    Ver todos os {filtered.length} checklists <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>


        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">

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
        <DialogContent className="flex w-[calc(100vw-2rem)] max-w-3xl max-h-[calc(100dvh-3rem)] flex-col overflow-y-auto rounded-2xl p-4 sm:p-6">
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
                placeholder="Buscar por tema ou especialidade..."
                className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
              />
            </div>
            {(() => {
              const order: Specialty[] = ["Cirurgia", "Pediatria", "Clínica Médica", "Ginecologia e Obstetrícia", "Medicina de Família e Comunidade"];
              const row1 = order.slice(0, 3);
              const row2 = order.slice(3);
              const renderMobile = (s: Specialty) => {
                const m = getSpecialtyMeta(s);
                const active = allSpec === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAllSpec(s)}
                    title={s}
                    className={cn(
                      "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border px-2 text-[11px] font-medium leading-tight transition-colors",
                      active
                        ? "border-foreground/20 bg-card text-foreground shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-mint/40",
                    )}
                  >
                    <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", m.solid)} />
                    <span className="truncate text-center">{m.code}</span>
                  </button>
                );
              };
              return (
                <div className="space-y-2 lg:space-y-0">
                  <div className="space-y-2 lg:hidden">
                    <button
                      type="button"
                      onClick={() => setAllSpec("Todas")}
                      className={cn(
                        "inline-flex h-10 w-full items-center justify-center rounded-full border px-3 text-sm font-medium transition-colors",
                        allSpec === "Todas"
                          ? "border-mint bg-mint/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-mint/40",
                      )}
                    >
                      Todas
                    </button>
                    <div className="grid grid-cols-3 gap-2">{row1.map(renderMobile)}</div>
                    <div className="grid grid-cols-2 gap-2">{row2.map(renderMobile)}</div>
                  </div>
                  <div className="hidden lg:flex lg:flex-nowrap lg:items-center lg:gap-1">
                    <button
                      type="button"
                      onClick={() => setAllSpec("Todas")}
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors",
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
                          title={s}
                          className={cn(
                            "inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium leading-tight transition-colors",
                            active
                              ? "border-foreground/20 bg-card text-foreground shadow-sm"
                              : "border-border bg-background text-muted-foreground hover:border-mint/40",
                          )}
                        >
                          <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", m.solid)} />
                          <span className="truncate">{s}</span>
                        </button>
                      );
                    })}
                  </div>

                </div>
              );
            })()}


            <ul className="max-h-[55vh] divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card">
              {dbStations
                .filter((s) => {
                  if (allSpec !== "Todas" && s.specialty !== allSpec) return false;
                  const term = allSearch.trim().toLowerCase();
                  if (!term) return true;
                  return s.title.toLowerCase().includes(term) || s.specialty.toLowerCase().includes(term);
                })
                .map((s) => {
                  const m = getSpecialtyMeta(s.specialty);
                  return (
                    <li key={s.id} className="flex min-w-0 items-center gap-3 px-3 py-2.5">
                      <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 font-mono text-[10px] font-bold", m.badge)}>{m.code}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{s.title}</div>
                        <div className="truncate text-xs text-muted-foreground">{s.specialty} • {s.checklistCount} itens</div>
                      </div>
                      <StationPDFButton stationId={s.id} iconOnly />
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


function FilterChip({
  active,
  onClick,
  children,
  small,
  accentClass,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
  accentClass?: string;
  className?: string;
}) {
  const base = `inline-flex items-center gap-1.5 rounded-full border px-3.5 ${small ? "py-1 text-xs" : "py-1.5 text-sm"} font-medium transition-all`;
  if (active && accentClass) {
    return (
      <button onClick={onClick} className={cn(base, "border-foreground/20 bg-card text-foreground shadow-sm", className)}>
        {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        base,
        active
          ? "border-mint bg-mint/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:border-mint/40",
        className,
      )}
    >
      {children}
    </button>
  );
}
