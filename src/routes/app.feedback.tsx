import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/feedback")({
  component: Feedback,
  head: () => ({ meta: [{ title: "Feedback — Estação Revalida" }] }),
});

function Feedback() {
  const [text, setText] = useState("");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3 py-1 text-xs font-medium text-medical">
          <MessageSquare className="h-3.5 w-3.5" /> Sua opinião importa
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold md:text-3xl">Feedback</h1>
        <p className="text-sm text-muted-foreground">Conte o que podemos melhorar.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Escreva seu feedback..."
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-mint"
        />
        <Button
          variant="hero"
          className="mt-4"
          onClick={() => {
            if (!text.trim()) return toast.error("Escreva algo primeiro.");
            toast.success("Feedback enviado! Obrigado.");
            setText("");
          }}
        >
          <Send className="h-4 w-4" /> Enviar
        </Button>
      </div>
    </div>
  );
}
