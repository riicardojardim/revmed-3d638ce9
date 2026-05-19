import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, BookOpen, Brain, ListChecks, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSimulado } from "@/lib/simulado";
import { toast } from "sonner";

type Props = {
  specialty: string;
  title: string;
  stationId?: string | null;
  show?: { resumo?: boolean; checklist?: boolean; flashcard?: boolean };
  variant?: "section" | "compact";
  heading?: string;
  excludeResumoId?: string;
  excludeDeckId?: string;
  excludeStationId?: string;
  className?: string;
};

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

function pickBest<T extends { title: string; specialty: string }>(items: T[], title: string, specialty: string): T | null {
  if (!items.length) return null;
  const target = new Set(tokenize(title));
  const scored = items.map((it) => {
    const toks = tokenize(it.title);
    let overlap = 0;
    for (const t of toks) if (target.has(t)) overlap += 1;
    const specBoost = it.specialty === specialty ? 1 : 0;
    return { it, score: overlap * 2 + specBoost };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].it;
}

export function RelatedResources({
  specialty,
  title,
  stationId,
  show = { resumo: true, checklist: true, flashcard: true },
  variant = "section",
  heading = "Continue estudando",
  excludeResumoId,
  excludeDeckId,
  excludeStationId,
  className,
}: Props) {
  const nav = useNavigate();
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["related-resources", specialty, title, stationId ?? null, !!show.resumo, !!show.checklist, !!show.flashcard],
    staleTime: 60_000,
    queryFn: async () => {
      const [resumosRes, decksRes, stationsRes] = await Promise.all([
        show.resumo
          ? supabase
              .from("summaries")
              .select("id, title, specialty, topic, read_time_minutes, high_yield, station_id")
              .eq("published", true)
              .eq("specialty", specialty)
              .limit(20)
          : Promise.resolve({ data: [] as Array<{ id: string; title: string; specialty: string; topic: string | null; read_time_minutes: number; high_yield: boolean; station_id: string | null }> }),
        show.flashcard
          ? supabase
              .from("flashcard_decks")
              .select("id, title, specialty, topic, station_id")
              .eq("published", true)
              .eq("specialty", specialty)
              .limit(20)
          : Promise.resolve({ data: [] as Array<{ id: string; title: string; specialty: string; topic: string | null; station_id: string | null }> }),
        show.checklist
          ? supabase
              .from("custom_stations")
              .select("id, title, specialty")
              .eq("published", true)
              .eq("specialty", specialty)
              .limit(20)
          : Promise.resolve({ data: [] as Array<{ id: string; title: string; specialty: string }> }),
      ]);

      const resumos = (resumosRes.data ?? []).filter((r) => r.id !== excludeResumoId);
      const decksAll = (decksRes.data ?? []).filter((d) => d.id !== excludeDeckId);
      const stations = (stationsRes.data ?? []).filter((s) => s.id !== excludeStationId);

      // Prefer items explicitly linked to this station
      let bestDeck = stationId ? decksAll.find((d) => d.station_id === stationId) ?? null : null;
      if (!bestDeck) bestDeck = pickBest(decksAll, title, specialty);

      let bestResumo = stationId ? resumos.find((r) => r.station_id === stationId) ?? null : null;
      if (!bestResumo) bestResumo = pickBest(resumos, title, specialty);

      const bestStation = pickBest(stations, title, specialty);
      const bestStation = pickBest(stations, title, specialty);

      let checklistCount = 0;
      if (bestStation) {
        const { count } = await supabase
          .from("station_checklist_items")
          .select("id", { count: "exact", head: true })
          .eq("station_id", bestStation.id);
        checklistCount = count ?? 0;
      }

      return { bestResumo, bestDeck, bestStation, checklistCount };
    },
  });

  const bestResumo = data?.bestResumo ?? null;
  const bestDeck = data?.bestDeck ?? null;
  const bestStation = data?.bestStation ?? null;

  const hasAny = !!(
    (show.resumo && bestResumo) ||
    (show.flashcard && bestDeck) ||
    (show.checklist && bestStation)
  );
  if (!hasAny) return null;

  function startStation() {
    if (!bestStation) return;
    if (!user) { toast.error("Faça login para iniciar."); return; }
    const sim = createSimulado(user.id, bestStation.title, [
      { id: bestStation.id, title: bestStation.title, specialty: bestStation.specialty },
    ]);
    nav({ to: "/app/sala/$code", params: { code: sim.id } });
  }

  return (
    <section
      className={cn(
        variant === "section"
          ? "rounded-2xl border border-mint/25 bg-gradient-to-br from-mint/[0.04] to-transparent p-5 shadow-card"
          : "rounded-2xl border border-border bg-card p-4 shadow-card",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-mint" />
        <h3 className="font-display text-sm font-bold uppercase tracking-wide">{heading}</h3>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {show.checklist && bestStation && (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-medical">
              <ListChecks className="h-3.5 w-3.5" /> Checklist sugerido
            </div>
            <div className="line-clamp-2 font-display text-sm font-bold leading-snug">{bestStation.title}</div>
            <div className="text-[11px] text-muted-foreground">
              {bestStation.specialty} · {data?.checklistCount ?? 0} {(data?.checklistCount ?? 0) === 1 ? "item" : "itens"}
            </div>
            <Button size="sm" variant="hero" className="mt-1" onClick={startStation}>
              Treinar checklist <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {show.resumo && bestResumo && (
          <Link
            to="/app/resumos/$id"
            params={{ id: bestResumo.id }}
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:border-mint/40"
          >
            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-medical">
              <BookOpen className="h-3.5 w-3.5" /> Resumo sugerido
            </div>
            <div className="line-clamp-2 font-display text-sm font-bold leading-snug group-hover:text-mint">
              {bestResumo.title}
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" /> {bestResumo.read_time_minutes} min
              {bestResumo.high_yield && (
                <span className="ml-1 rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600 ring-1 ring-amber-400/30">
                  Alta inc.
                </span>
              )}
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-mint">
              Abrir resumo <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        )}
        {show.flashcard && bestDeck && (
          <Link
            to="/app/flashcards"
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:border-mint/40"
          >
            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-medical">
              <Brain className="h-3.5 w-3.5" /> Flashcard sugerido
            </div>
            <div className="line-clamp-2 font-display text-sm font-bold leading-snug group-hover:text-mint">
              {bestDeck.title}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {bestDeck.specialty}{bestDeck.topic ? ` · ${bestDeck.topic}` : ""}
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-mint">
              Treinar flashcards <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
