import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Clock } from "lucide-react";

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
  created_at: string;
};

function ResumosPage() {
  const [items, setItems] = useState<Summary[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("summaries")
        .select("id, title, specialty, topic, read_time_minutes, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false });
      setItems((data ?? []) as Summary[]);
    })();
  }, []);

  const visible = items.filter((i) =>
    !q || i.title.toLowerCase().includes(q.toLowerCase()) || i.specialty.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Resumos clínicos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Conteúdo curado pelos professores.</p>
      </div>
      <input
        value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por tema ou especialidade..."
        className="w-full max-w-md rounded-xl border border-border bg-card px-3 py-2 text-sm"
      />
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-mint" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum resumo publicado ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((s) => (
            <Link key={s.id} to="/app/resumos/$id" params={{ id: s.id }}
              className="rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-mint/40">
              <div className="text-xs text-muted-foreground">{s.specialty}{s.topic ? ` · ${s.topic}` : ""}</div>
              <h3 className="mt-1 font-display text-lg font-bold">{s.title}</h3>
              <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {s.read_time_minutes} min de leitura
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
