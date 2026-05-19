import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Clock, Search, ArrowRight, Stethoscope, Microscope, ClipboardCheck, Star, AlertTriangle, FileText, X } from "lucide-react";
import { SummaryCover } from "@/components/SummaryCover";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { getSpecialtyMeta, sortSpecialties } from "@/lib/specialtyMeta";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
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

  const { data: items = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["resumos", "published"],
    staleTime: 60_000,
    queryFn: async (): Promise<Summary[]> => {
      const { data, error } = await supabase
        .from("summaries")
        .select("id, title, specialty, topic, content_md, read_time_minutes, difficulty, high_yield, cover_image_url, definition, clinical_picture, diagnosis, conduct, key_points, pitfalls, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
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

      <div className="grid gap-6">
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
              className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
            >
              {filtered.slice(0, 4).map((s) => (
                <motion.div key={s.id} variants={staggerItem} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className="group flex h-full w-full min-w-0 flex-col gap-2 overflow-hidden rounded-2xl border border-border bg-card/80 p-2 text-left shadow-card backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-elegant sm:gap-3 sm:p-3"
                  >
                    <SummaryCover
                      title={s.title}
                      specialty={s.specialty}
                      topic={s.topic}
                      imageUrl={s.cover_image_url}
                      highYield={s.high_yield}
                    />
                    <div className="flex min-w-0 flex-col gap-1.5 px-0.5 pb-1">
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

      <Dialog open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="flex max-h-[calc(100dvh-1.25rem)] w-[calc(100vw-1.25rem)] max-w-3xl flex-col overflow-hidden rounded-3xl border-0 p-0 shadow-2xl [&>button:last-child]:hidden">
          <DialogClose className="absolute right-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg ring-1 ring-white/50 backdrop-blur-md transition-all hover:bg-background focus:outline-none focus:ring-2 focus:ring-white">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
          {!selectedSummary ? (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              {error ? (
                <>
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                  <p className="text-sm font-medium text-foreground">Não foi possível carregar o resumo</p>
                  <p className="text-xs text-muted-foreground">{(error as Error)?.message ?? "Erro inesperado."}</p>
                  <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
                    {isFetching ? "Tentando..." : "Tentar novamente"}
                  </Button>
                </>
              ) : isLoading || isFetching ? (
                <>
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Carregando resumo...</p>
                </>
              ) : (
                <>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Resumo indisponível</p>
                  <p className="text-xs text-muted-foreground">Este resumo pode ter sido despublicado. Atualize a lista e tente novamente.</p>
                  <Button size="sm" variant="outline" onClick={() => { setSelectedId(null); refetch(); }}>
                    Atualizar lista
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="relative shrink-0 overflow-hidden bg-gradient-hero px-5 pb-5 pt-7 text-white sm:px-6 sm:pb-6">
                {selectedSummary.cover_image_url && (
                  <>
                    <img
                      src={selectedSummary.cover_image_url}
                      alt=""
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                  </>
                )}
                <div className="relative pr-16">
                  <div className="flex flex-wrap items-center gap-2">
                    <SpecialtyBadge specialty={selectedSummary.specialty} short />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                      {selectedSummary.specialty}
                    </span>
                  </div>
                  <DialogTitle className="mt-2 font-display text-xl font-bold leading-tight text-white sm:text-2xl">
                    {selectedSummary.title || "Resumo clínico"}
                  </DialogTitle>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {selectedSummary.high_yield && (
                      <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200 ring-1 ring-amber-300/40">
                        Alta incidência
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-white/80">
                      <Clock className="h-3.5 w-3.5" /> {selectedSummary.read_time_minutes} min
                    </span>
                    {selectedSummary.topic && <span className="text-xs text-white/70">· {selectedSummary.topic}</span>}
                  </div>
                </div>
              </div>



              <div className="space-y-4 p-5 sm:p-6">
                {selectedSections.length > 0 ? (
                  selectedSections.map((section, index) => (
                    <section
                      key={section.title}
                      className={cn(
                        "rounded-2xl border bg-card p-5 shadow-card",
                        section.tone === "highlight" && "border-mint/30 bg-mint/[0.04]",
                        section.tone === "warn" && "border-amber-400/30 bg-amber-400/[0.04]",
                        section.tone === "default" && "border-border",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
                            section.tone === "highlight" && "bg-mint/15 text-mint",
                            section.tone === "warn" && "bg-amber-400/15 text-amber-600",
                            section.tone === "default" && "bg-muted text-muted-foreground",
                          )}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <div className="flex items-center gap-2">
                          <section.icon
                            className={cn(
                              "h-4 w-4",
                              section.tone === "highlight" ? "text-mint" : section.tone === "warn" ? "text-amber-500" : "text-muted-foreground",
                            )}
                          />
                          <h3 className="font-display text-sm font-bold uppercase tracking-wide">{section.title}</h3>
                        </div>
                      </div>
                      <div className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/90">{section.text}</div>
                    </section>
                  ))
                ) : selectedNotes ? (
                  <div className="whitespace-pre-wrap rounded-2xl border border-border bg-card p-5 text-[14px] leading-relaxed text-foreground/90 shadow-card">
                    {selectedNotes}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Este resumo ainda não tem conteúdo estruturado.</p>
                )}

                {selectedSources.length > 0 && (
                  <section className="rounded-2xl border border-border bg-muted/30 p-5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-display text-sm font-bold uppercase tracking-wide">Referências</h3>
                    </div>
                    <ul className="mt-3 space-y-1.5 text-sm text-foreground/80">
                      {selectedSources.map((source, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="text-muted-foreground">·</span>
                          <span>{source}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </div>

          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
