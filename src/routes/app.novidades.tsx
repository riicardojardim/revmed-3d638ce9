import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/novidades")({
  component: Novidades,
  head: () => ({ meta: [{ title: "Novidades — Estação Revalida" }] }),
});

const news = [
  { date: "2026-05-15", title: "Novo painel do plano Completo", body: "Dashboard reformulado com estatísticas detalhadas." },
  { date: "2026-05-10", title: "Pense Resumos", body: "Mais de 570 resumos atualizados disponíveis." },
  { date: "2026-05-01", title: "Cronograma personalizado", body: "Em breve: gere seu cronograma automático." },
];

function Novidades() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3 py-1 text-xs font-medium text-medical">
          <Sparkles className="h-3.5 w-3.5" /> O que há de novo
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold md:text-3xl">Novidades</h1>
      </div>

      <div className="space-y-3">
        {news.map((n) => (
          <div key={n.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="text-xs text-muted-foreground">{new Date(n.date).toLocaleDateString("pt-BR")}</div>
            <h3 className="mt-1 font-display text-lg font-bold">{n.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
