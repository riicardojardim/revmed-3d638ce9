import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Clock, Search } from "lucide-react";
import { SummaryCover } from "@/components/SummaryCover";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/resumos")({
  component: ResumosPage,
  head: () => ({ meta: [{ title: "Resumos — Estação Revalida" }] }),
});

type Summary = {
  id: string;
  title: string;
  specialty: string;
  topic: string | null;
  read_time_minutes: number;
  difficulty: string;
  high_yield: boolean;
  cover_image_url: string | null;
  definition: string | null;
  created_at: string;
};

function ResumosPage() {
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState<string>("Todas");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["resumos", "published"],
    staleTime: 60_000,
    queryFn: async (): Promise<Summary[]> => {
      const { data } = await supabase
        .from("summaries")
        .select("id, title, specialty, topic, read_time_minutes, difficulty, high_yield, cover_image_url, definition, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false });
      return (data ?? []) as Summary[];
    },
  });

  const specialties = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.specialty));
    return ["Todas", ...Array.from(set).sort()];
  }, [items]);

  const visible = items.filter((i) => {
    if (specialty !== "Todas" && i.specialty !== specialty) return false;
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      i.title.toLowerCase().includes(needle) ||
      i.specialty.toLowerCase().includes(needle) ||
      (i.topic ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3 py-1 text-xs font-medium text-medical">
          <BookOpen className="h-3.5 w-3.5" /> Resumos clínicos
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold md:text-3xl">Resumos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conteúdo estruturado pelos professores — direto ao ponto para a prova prática.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por tema, título ou especialidade..."
            className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {specialties.map((s) => {
          const active = specialty === s;
          const meta = s === "Todas" ? null : getSpecialtyMeta(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSpecialty(s)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? meta
                    ? cn("border-transparent text-white", meta.solid)
                    : "border-transparent bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {s === "Todas" ? "Todas" : meta?.code ?? s}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-mint" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum resumo encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <Link
              key={s.id}
              to="/app/resumos/$id"
              params={{ id: s.id }}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-card transition-all hover:-translate-y-0.5 hover:border-mint/40"
            >
              <SummaryCover
                title={s.title}
                specialty={s.specialty}
                topic={s.topic}
                imageUrl={s.cover_image_url}
                highYield={s.high_yield}
              />
              <div className="flex flex-col gap-2 px-1 pb-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <SpecialtyBadge specialty={s.specialty} />
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {s.difficulty}
                  </span>
                  {s.high_yield && (
                    <span className="rounded-md bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 ring-1 ring-amber-400/30">
                      Alta incidência
                    </span>
                  )}
                </div>
                <h3 className="font-display text-base font-bold leading-snug line-clamp-2 group-hover:text-mint">
                  {s.title}
                </h3>
                {s.definition && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{s.definition}</p>
                )}
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> {s.read_time_minutes} min de leitura
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
