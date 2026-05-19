import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import {
  BookOpen,
  Stethoscope,
  Microscope,
  ClipboardCheck,
  Star,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Summary = {
  id: string;
  title: string;
  specialty: string;
  topic: string | null;
  content_md: string | null;
  read_time_minutes: number;
  difficulty: string;
  high_yield: boolean;
  definition: string | null;
  clinical_picture: string | null;
  diagnosis: string | null;
  conduct: string | null;
  key_points: string | null;
  pitfalls: string | null;
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

function pickBest(items: Summary[], title: string, specialty: string): Summary | null {
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

type Props = {
  specialty: string;
  title: string;
  stationId?: string | null;
  triggerLabel?: string;
  triggerClassName?: string;
};

export function StationSummaryDialog({
  specialty,
  title,
  stationId,
  triggerLabel = "Ver resumo",
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["station-summary-modal", stationId ?? null, specialty, title],
    enabled: open,
    staleTime: 60_000,
    queryFn: async (): Promise<Summary | null> => {
      // 1) Direct link by station_id
      if (stationId) {
        const { data } = await supabase
          .from("summaries")
          .select("*")
          .eq("published", true)
          .eq("station_id", stationId)
          .limit(1)
          .maybeSingle();
        if (data) return data as Summary;
      }
      // 2) Fallback by specialty + title similarity
      const { data: list } = await supabase
        .from("summaries")
        .select("*")
        .eq("published", true)
        .eq("specialty", specialty)
        .limit(30);
      return pickBest((list ?? []) as Summary[], title, specialty);
    },
  });

  const sections = summary
    ? [
        { icon: BookOpen, title: "Definição", text: summary.definition, tone: "default" as const },
        {
          icon: Stethoscope,
          title: "Quadro clínico",
          text: summary.clinical_picture,
          tone: "default" as const,
        },
        {
          icon: Microscope,
          title: "Diagnóstico",
          text: summary.diagnosis,
          tone: "default" as const,
        },
        { icon: ClipboardCheck, title: "Conduta", text: summary.conduct, tone: "default" as const },
        { icon: Star, title: "Pontos-chave", text: summary.key_points, tone: "highlight" as const },
        { icon: AlertTriangle, title: "Armadilhas", text: summary.pitfalls, tone: "warn" as const },
      ].filter((s) => s.text && s.text.trim())
    : [];

  const hasStructured = sections.length > 0;
  const raw = summary?.content_md ?? "";
  const marker = "Fontes utilizadas:";
  const markerIdx = raw.indexOf(marker);
  const notes = markerIdx >= 0 ? raw.slice(0, markerIdx).trim() : raw.trim();
  const sources =
    markerIdx >= 0
      ? raw
          .slice(markerIdx + marker.length)
          .trim()
          .split("\n")
          .map((l) => l.replace(/^[•\-\*]\s*/, "").trim())
          .filter(Boolean)
      : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 px-3 py-2.5 text-left transition hover:border-violet-400/60 hover:from-violet-500/15",
            triggerClassName,
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-200">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
              Material de apoio
            </div>
            <div className="truncate text-[13px] font-semibold text-white">{triggerLabel}</div>
          </div>
          <Sparkles className="h-3.5 w-3.5 text-violet-300/80" />
        </button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[calc(100dvh-1.25rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-[calc(100vw-1.25rem)] max-w-3xl flex-col overflow-hidden rounded-3xl border-0 p-0 shadow-2xl [&>button]:hidden">
        <div
          className="pointer-events-none absolute right-4 z-50"
          style={{ top: "max(1rem, env(safe-area-inset-top))" }}
        >
          <DialogClose className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg ring-1 ring-white/50 backdrop-blur-md transition-all hover:bg-background focus:outline-none focus:ring-2 focus:ring-white">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
        </div>

        {isLoading ? (
          <div className="p-8 text-sm text-muted-foreground">Carregando resumo...</div>
        ) : !summary ? (
          <div className="p-8">
            <DialogHeader>
              <DialogTitle>Nenhum resumo disponível</DialogTitle>
            </DialogHeader>
            <p className="mt-2 text-sm text-muted-foreground">
              Ainda não há um resumo publicado para esta estação.
            </p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="relative shrink-0 overflow-hidden bg-gradient-hero px-5 pb-6 pt-7 text-white sm:px-6 sm:pb-7">
              <div className="space-y-3 pr-14">
                <div className="flex items-start gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <SpecialtyBadge specialty={summary.specialty} short />
                    <span className="min-w-0 text-[11px] font-semibold uppercase tracking-wider text-white/75">
                      {summary.specialty}
                    </span>
                  </div>
                </div>
                <DialogTitle className="font-display text-xl font-bold leading-tight text-white sm:text-2xl">
                  {summary.title || title}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2">
                  {summary.high_yield && (
                    <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200 ring-1 ring-amber-300/40">
                      Alta incidência
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-white/80">
                    <Clock className="h-3.5 w-3.5" /> {summary.read_time_minutes} min
                  </span>
                  {summary.topic && (
                    <span className="text-xs text-white/70">· {summary.topic}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              {hasStructured ? (
                sections.map((sec, i) => (
                  <section
                    key={sec.title}
                    className={cn(
                      "rounded-2xl border bg-card p-5 shadow-card",
                      sec.tone === "highlight" && "border-mint/30 bg-mint/[0.04]",
                      sec.tone === "warn" && "border-amber-400/30 bg-amber-400/[0.04]",
                      sec.tone === "default" && "border-border",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-hero text-xs font-bold tabular-nums text-white shadow-elegant ring-1 ring-white/20">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="flex items-center gap-2">
                        <sec.icon
                          className={cn(
                            "h-4 w-4",
                            sec.tone === "highlight"
                              ? "text-mint"
                              : sec.tone === "warn"
                                ? "text-amber-500"
                                : "text-muted-foreground",
                          )}
                        />
                        <h3 className="font-display text-sm font-bold uppercase tracking-wide">
                          {sec.title}
                        </h3>
                      </div>
                    </div>
                    <div className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/90">
                      {sec.text}
                    </div>
                  </section>
                ))
              ) : notes ? (
                <div className="whitespace-pre-wrap rounded-2xl border border-border bg-card p-5 text-[14px] leading-relaxed text-foreground/90 shadow-card">
                  {notes}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este resumo ainda não tem conteúdo estruturado.
                </p>
              )}

              {sources.length > 0 && (
                <section className="rounded-2xl border border-border bg-muted/30 p-5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-display text-sm font-bold uppercase tracking-wide">
                      Referências
                    </h3>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-sm text-foreground/80">
                    {sources.map((src, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-muted-foreground">·</span>
                        <span>{src}</span>
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
  );
}
