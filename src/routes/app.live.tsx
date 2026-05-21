import { createFileRoute } from "@tanstack/react-router";
import { Video } from "lucide-react";

export const Route = createFileRoute("/app/live")({
  component: Live,
  head: () => ({ meta: [{ title: "Live - Parceiros — REVMED" }] }),
});

function Live() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Live - Parceiros</h1>
        <p className="text-sm text-muted-foreground">Transmissões ao vivo e gravações dos nossos parceiros.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
        <Video className="mx-auto h-10 w-10 text-mint" />
        <h2 className="mt-4 font-display text-xl font-bold">Nenhuma live agendada no momento</h2>
        <p className="mt-2 text-sm text-muted-foreground">Volte em breve para conferir as próximas transmissões.</p>
      </div>
    </div>
  );
}
