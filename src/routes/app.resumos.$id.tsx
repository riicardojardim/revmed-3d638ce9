import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Clock, BookOpen, Stethoscope, Microscope, ClipboardCheck, Star, AlertTriangle, FileText } from "lucide-react";
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
};

function Section({ icon: Icon, title, text, tone = "default" }: { icon: typeof BookOpen; title: string; text?: string | null; tone?: "default" | "highlight" | "warn" }) {
  if (!text || !text.trim()) return null;
  return (
    <section
      className={cn(
        "rounded-2xl border p-5",
        tone === "highlight" && "border-mint/30 bg-mint/5",
        tone === "warn" && "border-amber-400/30 bg-amber-400/5",
        tone === "default" && "border-border bg-card",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn(
          "h-4 w-4",
          tone === "highlight" ? "text-mint" : tone === "warn" ? "text-amber-500" : "text-muted-foreground",
        )} />
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">{title}</h2>
      </div>
      <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{text}</div>
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

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link to="/app/resumos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para Resumos
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SpecialtyBadge specialty={s.specialty} />
          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {s.difficulty}
          </span>
          {s.high_yield && (
            <span className="rounded-md bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 ring-1 ring-amber-400/30">
              Alta incidência
            </span>
          )}
          {s.topic && <span className="text-xs text-muted-foreground">· {s.topic}</span>}
        </div>
        <h1 className="font-display text-3xl font-bold leading-tight">{s.title}</h1>
        <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> {s.read_time_minutes} min de leitura
        </div>
      </header>

      {s.cover_image_url && (
        <img src={s.cover_image_url} alt="" className="w-full rounded-2xl border border-border object-cover" />
      )}

      {hasStructured ? (
        <div className="space-y-4">
          <Section icon={BookOpen} title="Definição" text={s.definition} />
          <Section icon={Stethoscope} title="Quadro clínico" text={s.clinical_picture} />
          <Section icon={Microscope} title="Diagnóstico" text={s.diagnosis} />
          <Section icon={ClipboardCheck} title="Conduta" text={s.conduct} />
          <Section icon={Star} title="Pontos-chave da prova" text={s.key_points} tone="highlight" />
          <Section icon={AlertTriangle} title="Armadilhas e erros comuns" text={s.pitfalls} tone="warn" />
          {s.content_md && s.content_md.trim() && (
            <Section icon={FileText} title="Notas adicionais" text={s.content_md} />
          )}
        </div>
      ) : (
        <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded-2xl border border-border bg-card p-6 leading-relaxed">
          {s.content_md}
        </div>
      )}
    </article>
  );
}
