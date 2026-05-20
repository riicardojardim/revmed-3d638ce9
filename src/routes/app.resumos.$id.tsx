import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BookOpen, Stethoscope, Microscope, ClipboardCheck, Star, AlertTriangle, FileText } from "lucide-react";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/app/resumos/$id")({
  component: ResumoPage,
});

type Summary = {
  id: string;
  title: string;
  specialty: string;
  topic: string | null;
  content_md: string | null;
  difficulty: string;
  cover_image_url: string | null;
  definition: string | null;
  clinical_picture: string | null;
  diagnosis: string | null;
  conduct: string | null;
  key_points: string | null;
  pitfalls: string | null;
};

function Section({
  index,
  icon: Icon,
  title,
  text,
  tone = "default",
}: {
  index: number;
  icon: typeof BookOpen;
  title: string;
  text?: string | null;
  tone?: "default" | "highlight" | "warn";
}) {
  if (!text || !text.trim()) return null;
  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-card transition-colors",
        tone === "highlight" && "border-mint/30 bg-mint/[0.04]",
        tone === "warn" && "border-amber-400/30 bg-amber-400/[0.04]",
        tone === "default" && "border-border",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums",
            tone === "highlight" && "bg-mint/15 text-mint",
            tone === "warn" && "bg-amber-400/15 text-amber-600",
            tone === "default" && "bg-muted text-muted-foreground",
          )}
        >
          {String(index).padStart(2, "0")}
        </div>
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "h-4 w-4",
              tone === "highlight" ? "text-mint" : tone === "warn" ? "text-amber-500" : "text-muted-foreground",
            )}
          />
          <h2 className="font-display text-sm font-bold uppercase tracking-wide">{title}</h2>
        </div>
      </div>
      <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">{text}</div>
    </section>
  );
}

function ResumoPage() {
  const { id } = Route.useParams();

  const { data: s, isLoading } = useQuery({
    queryKey: ["resumo", id],
    staleTime: 60_000,
    queryFn: async (): Promise<Summary | null> => {
      const { data } = await supabase.from("summaries").select("*").eq("id", id).maybeSingle();
      return (data as Summary | null) ?? null;
    },
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  if (!s) return <div className="text-sm text-muted-foreground">Resumo não encontrado.</div>;

  const hasStructured = s.definition || s.clinical_picture || s.diagnosis || s.conduct || s.key_points || s.pitfalls;

  // Extrai bloco "Fontes utilizadas:" do content_md para renderizar como Referências
  const raw = s.content_md ?? "";
  const marker = "Fontes utilizadas:";
  const markerIdx = raw.indexOf(marker);
  const sourcesBlock = markerIdx >= 0 ? raw.slice(markerIdx + marker.length).trim() : "";
  const notes = markerIdx >= 0 ? raw.slice(0, markerIdx).trim() : raw.trim();
  const sources = sourcesBlock
    ? sourcesBlock.split("\n").map((l) => l.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean)
    : [];

  const sections = [
    { icon: BookOpen, title: "Definição", text: s.definition, tone: "default" as const },
    { icon: Stethoscope, title: "Quadro clínico", text: s.clinical_picture, tone: "default" as const },
    { icon: Microscope, title: "Diagnóstico", text: s.diagnosis, tone: "default" as const },
    { icon: ClipboardCheck, title: "Conduta", text: s.conduct, tone: "default" as const },
    { icon: Star, title: "Pontos-chave da prova", text: s.key_points, tone: "highlight" as const },
    { icon: AlertTriangle, title: "Armadilhas e erros comuns", text: s.pitfalls, tone: "warn" as const },
  ].filter((sec) => sec.text && sec.text.trim());

  return (
    <article className="mx-auto max-w-4xl space-y-6">
      <Link to="/app/resumos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para Resumos
      </Link>

      {/* Hero banner gradient — mesmo padrão do app */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-hero p-6 text-white shadow-elegant md:p-8">
        {s.cover_image_url && (
          <>
            <img
              src={s.cover_image_url}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
          </>
        )}
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Resumo clínico</div>
          <h1 className="mt-1 font-display text-2xl font-bold leading-tight md:text-4xl">{s.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SpecialtyBadge specialty={s.specialty} />
            {s.topic && <span className="text-xs text-white/70">{s.topic}</span>}
          </div>
        </div>
      </div>

      {hasStructured ? (
        <div className="space-y-4">
          {/* Índice rápido tipo checklist */}
          {sections.length > 1 && (
            <nav className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Neste resumo
              </div>
              <ol className="grid gap-1.5 sm:grid-cols-2">
                {sections.map((sec, i) => (
                  <li key={sec.title} className="flex items-center gap-2 text-sm text-foreground/80">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-bold tabular-nums text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate">{sec.title}</span>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {sections.map((sec, i) => (
            <Section
              key={sec.title}
              index={i + 1}
              icon={sec.icon}
              title={sec.title}
              text={sec.text}
              tone={sec.tone}
            />
          ))}

          {notes && (
            <Section
              index={sections.length + 1}
              icon={FileText}
              title="Notas adicionais"
              text={notes}
            />
          )}

          {sources.length > 0 && (
            <section className="rounded-2xl border border-border bg-muted/30 p-5 shadow-card">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-display text-sm font-bold uppercase tracking-wide">Referências</h2>
              </div>
              <ol className="mt-3 space-y-1.5 text-sm leading-relaxed text-foreground/90">
                {sources.map((src, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">[{i + 1}]</span>
                    <span>{src}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Resumo gerado por IA com base em fontes oficiais brasileiras (MS, ANVISA, PCDTs, diretrizes das sociedades e matriz INEP/Revalida). Sempre confirme condutas e doses na fonte original.
              </p>
            </section>
          )}
        </div>
      ) : (
        <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded-2xl border border-border bg-card p-6 leading-relaxed shadow-card">
          {s.content_md}
        </div>
      )}



    </article>
  );
}
