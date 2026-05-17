import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/flashcards/revisao")({
  component: Revisao,
  head: () => ({ meta: [{ title: "Revisão — Flashcards" }] }),
});

function Revisao() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/app/flashcards" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Flashcards
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Revisão de Flashcards</h1>
        <p className="text-sm text-muted-foreground">Sistema de repetição espaçada.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
        <Brain className="mx-auto h-10 w-10 text-mint" />
        <h2 className="mt-4 font-display text-xl font-bold">Nenhum card para revisar</h2>
        <p className="mt-2 text-sm text-muted-foreground">Estude cards novos primeiro para começar a revisão.</p>
        <Link to="/app/flashcards" className="mt-5 inline-block">
          <Button variant="hero">Ver flashcards</Button>
        </Link>
      </div>
    </div>
  );
}
