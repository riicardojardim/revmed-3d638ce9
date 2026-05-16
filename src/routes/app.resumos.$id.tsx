import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Clock } from "lucide-react";

export const Route = createFileRoute("/app/resumos/$id")({
  component: ResumoPage,
});

type Summary = {
  id: string; title: string; specialty: string; topic: string | null;
  content_md: string; read_time_minutes: number;
};

function ResumoPage() {
  const { id } = Route.useParams();
  const [s, setS] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("summaries").select("*").eq("id", id).maybeSingle();
      setS(data as Summary | null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  if (!s) return <div className="text-sm text-muted-foreground">Resumo não encontrado.</div>;

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link to="/app/resumos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <header>
        <div className="text-xs text-muted-foreground">{s.specialty}{s.topic ? ` · ${s.topic}` : ""}</div>
        <h1 className="mt-1 font-display text-3xl font-bold">{s.title}</h1>
        <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> {s.read_time_minutes} min
        </div>
      </header>
      <div className="prose prose-sm max-w-none whitespace-pre-wrap rounded-2xl border border-border bg-card p-6 leading-relaxed">
        {s.content_md}
      </div>
    </article>
  );
}
