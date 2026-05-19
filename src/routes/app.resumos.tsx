import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Clock, Search, ArrowRight, ListChecks, Brain, Stethoscope, Microscope, ClipboardCheck, Star, AlertTriangle, FileText } from "lucide-react";
import { SummaryCover } from "@/components/SummaryCover";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { getSpecialtyMeta, sortSpecialties } from "@/lib/specialtyMeta";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/stagger";

export const Route = createFileRoute("/app/resumos")({
  component: ResumosPage,
  head: () => ({ meta: [{ title: "Resumos — Estação Revalida" }] }),
});

type Summary = {
  id: string;
  title: string;
  specialty: string;
  topic: string | null;
  content_md: string | null;
  read_time_minutes: number;
  difficulty: string;
  high_yield: boolean;
  cover_image_url: string | null;
  definition: string | null;
  clinical_picture: string | null;
  diagnosis: string | null;
  conduct: string | null;
  key_points: string | null;
  pitfalls: string | null;
  created_at: string;
};

function ResumosPage() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState<string>("Todas");
  const [allOpen, setAllOpen] = useState(false);
  const [allSearch, setAllSearch] = useState("");
  const [allSpec, setAllSpec] = useState<string>("Todas");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["resumos", "published"],
    staleTime: 60_000,
    queryFn: async (): Promise<Summary[]> => {
      const { data } = await supabase
        .from("summaries")
        .select("id, title, specialty, topic, content_md, read_time_minutes, difficulty, high_yield, cover_image_url, definition, clinical_picture, diagnosis, conduct, key_points, pitfalls, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false });
      return (data ?? []) as Summary[];
    },
  });

  const selectedSummary = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const selectedSections = selectedSummary
    ? [
        { icon: BookOpen, title: "Definição", text: selectedSummary.definition, tone: "default" as const },
        { icon: Stethoscope, title: "Quadro clínico", text: selectedSummary.clinical_picture, tone: "default" as const },
        { icon: Microscope, title: "Diagnóstico", text: selectedSummary.diagnosis, tone: "default" as const },
        { icon: ClipboardCheck, title: "Conduta", text: selectedSummary.conduct, tone: "default" as const },
        { icon: Star, title: "Pontos-chave", text: selectedSummary.key_points, tone: "highlight" as const },
        { icon: AlertTriangle, title: "Armadilhas", text: selectedSummary.pitfalls, tone: "warn" as const },
      ].filter((section) => section.text && section.text.trim())
    : [];

  const selectedRaw = selectedSummary?.content_md ?? "";
  const selectedMarker = "Fontes utilizadas:";
  const selectedMarkerIdx = selectedRaw.indexOf(selectedMarker);
  const selectedNotes = selectedMarkerIdx >= 0 ? selectedRaw.slice(0, selectedMarkerIdx).trim() : selectedRaw.trim();
  const selectedSources = selectedMarkerIdx >= 0
    ? selectedRaw
        .slice(selectedMarkerIdx + selectedMarker.length)
        .trim()
        .split("\n")
        .map((line) => line.replace(/^[•\-\*]\s*/, "").trim())
        .filter(Boolean)
    : [];

  const specialties = useMemo(
    () => ["Todas", ...sortSpecialties(Array.from(new Set(items.map((i) => i.specialty))))],
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (specialty !== "Todas" && i.specialty !== specialty) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.specialty.toLowerCase().includes(q) ||
        (i.topic ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, specialty, search]);

  const allFiltered = useMemo(() => {
    const q = allSearch.trim().toLowerCase();
    return items.filter((i) => {
      if (allSpec !== "Todas" && i.specialty !== allSpec) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.specialty.toLowerCase().includes(q) ||
        (i.topic ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, allSpec, allSearch]);

  const order = ["Cirurgia", "Pediatria", "Clínica Médica", "Ginecologia e Obstetrícia", "Medicina de Família e Comunidade"];
  const others = specialties.filter((s) => s !== "Todas");
  const row1 = order.slice(0, 3).filter((s) => others.includes(s));
  const row2 = order.slice(3).filter((s) => others.includes(s));

  const renderChip = (s: string, mobile: boolean) => {
    const meta = getSpecialtyMeta(s);
    const active = specialty === s;
    return (
      <button
        key={s}
        type="button"
        onClick={() => setSpecialty(s)}
        title={s}
        className={cn(
          mobile
            ? "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border px-2 text-[11px] font-medium leading-tight transition-all"
            : "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
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
    <div className="relative mx-auto max-w-7xl space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3 py-1 text-xs font-medium text-medical">
          <BookOpen className="h-3.5 w-3.5" /> Resumos clínicos
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold md:text-3xl">Banco de Resumos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conteúdo estruturado pelos professores — direto ao ponto para a prova prática.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main column */}
        <div className="min-w-0 space-y-5">
          {/* Search */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por tema, título ou especialidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 pl-9 text-base"
              />
            </div>
          </div>

          {/* Specialty filters */}
          <div className="space-y-2 lg:space-y-0">
            {/* Mobile/Tablet */}
            <div className="space-y-2 lg:hidden">
              <button
                type="button"
                onClick={() => setSpecialty("Todas")}
                className={cn(
                  "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-all",
                  specialty === "Todas"
                    ? "border-mint bg-mint/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-mint/40",
                )}
              >
                Todas
              </button>
              {row1.length > 0 && (
                <div className="grid grid-cols-3 gap-2">{row1.map((s) => renderChip(s, true))}</div>
              )}
              {row2.length > 0 && (
                <div className="grid grid-cols-2 gap-2">{row2.map((s) => renderChip(s, true))}</div>
              )}
            </div>
            {/* Desktop */}
            <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-1.5">
              <button
                type="button"
                onClick={() => setSpecialty("Todas")}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  specialty === "Todas"
                    ? "border-mint bg-mint/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-mint/40",
                )}
              >
                Todas
              </button>
              {others.map((s) => renderChip(s, false))}
            </div>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-card" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              Nenhum resumo encontrado{search ? ` para "${search}"` : ""}.
            </div>
          ) : (
            <motion.div
              key={filtered.slice(0, 4).map((s) => s.id).join("|")}
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
            >
              {filtered.slice(0, 4).map((s) => (
                <motion.div key={s.id} variants={staggerItem}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className="group flex h-full flex-col gap-2 rounded-2xl border border-border bg-card/80 p-2 text-left shadow-card backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-elegant sm:gap-3 sm:p-3"
                  >
                    <SummaryCover
                      title={s.title}
                      specialty={s.specialty}
                      topic={s.topic}
                      imageUrl={s.cover_image_url}
                      highYield={s.high_yield}
                    />
                    <div className="flex flex-col gap-1.5 px-0.5 pb-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <SpecialtyBadge specialty={s.specialty} />
                        {s.high_yield && (
                          <span className="rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600 ring-1 ring-amber-400/30">
                            Alta inc.
                          </span>
                        )}
                      </div>
                      <div className="truncate font-display text-xs font-bold leading-tight sm:text-sm">{s.title}</div>
                      <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground sm:text-[11px]">
                        <Clock className="h-3 w-3" /> {s.read_time_minutes} min
                      </div>
                    </div>
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}

          {filtered.length > 4 && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => { setAllSearch(""); setAllSpec("Todas"); setAllOpen(true); }}>
                Ver todos os {filtered.length} resumos <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Link
            to="/app/checklists"
            className="block overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-colors hover:border-mint/60"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
              <ListChecks className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-display text-lg font-bold">Banco de Checklists</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Treine com os checklists oficiais relacionados aos resumos.
            </p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-mint">
              Abrir <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
          <Link
            to="/app/flashcards"
            className="block overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-colors hover:border-mint/60"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
              <Brain className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-display text-lg font-bold">Flashcards</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Fixe o conteúdo do resumo com cards de revisão espaçada.
            </p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-mint">
              Abrir <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </aside>
      </div>

      <Dialog open={allOpen} onOpenChange={setAllOpen}>
        <DialogContent className="flex w-[calc(100vw-2rem)] max-w-3xl max-h-[calc(100dvh-3rem)] flex-col overflow-y-auto rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-mint" />
              Todos os resumos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={allSearch}
                onChange={(e) => setAllSearch(e.target.value)}
                placeholder="Buscar resumo..."
                className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2 lg:space-y-0">
              <button
                type="button"
                onClick={() => setAllSpec("Todas")}
                className={cn(
                  "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors lg:hidden",
                  allSpec === "Todas"
                    ? "border-foreground/20 bg-card text-foreground shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-mint/40",
                )}
              >
                Todas
              </button>
              <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-nowrap lg:items-center lg:gap-1">
                <button
                  type="button"
                  onClick={() => setAllSpec("Todas")}
                  className={cn(
                    "hidden lg:inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors",
                    allSpec === "Todas"
                      ? "border-foreground/20 bg-card text-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-mint/40",
                  )}
                >
                  Todas
                </button>
                {others.map((s) => {
                  const meta = getSpecialtyMeta(s);
                  const active = allSpec === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAllSpec(s)}
                      title={s}
                      className={cn(
                        "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors lg:h-auto lg:w-auto lg:min-w-0 lg:flex-1 lg:px-2 lg:py-1 lg:text-[11px] lg:leading-tight",
                        active
                          ? "border-foreground/20 bg-card text-foreground shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-mint/40",
                      )}
                    >
                      <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full lg:h-1.5 lg:w-1.5", meta.solid)} />
                      <span className="whitespace-nowrap lg:hidden">{meta.code}</span>
                      <span className="hidden truncate lg:inline">{s}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <ul className="max-h-[55vh] divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card">
              {allFiltered.map((s) => {
                const m = getSpecialtyMeta(s.specialty);
                return (
                  <li key={s.id} className="flex min-w-0 items-center gap-3 px-3 py-2.5">
                    <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 font-mono text-[10px] font-bold", m.badge)}>{m.code}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{s.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {s.specialty}{s.topic ? ` • ${s.topic}` : ""} • {s.read_time_minutes} min
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="hero"
                      onClick={() => { setAllOpen(false); setSelectedId(s.id); }}
                    >
                      Abrir <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
              {allFiltered.length === 0 && (
                <li className="px-3 py-10 text-center text-xs text-muted-foreground">Nenhum resumo encontrado.</li>
              )}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
