import { createFileRoute } from "@tanstack/react-router";
import { Headphones, MessageCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/suporte")({
  component: Suporte,
  head: () => ({ meta: [{ title: "Suporte — REVMED" }] }),
});

function Suporte() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3 py-1 text-xs font-medium text-medical">
          <Headphones className="h-3.5 w-3.5" /> Estamos aqui
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold md:text-3xl">Suporte</h1>
        <p className="text-sm text-muted-foreground">Fale com nossa equipe.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <MessageCircle className="h-6 w-6 text-mint" />
          <h3 className="mt-3 font-display text-lg font-bold">WhatsApp</h3>
          <p className="mt-1 text-sm text-muted-foreground">Resposta rápida em horário comercial.</p>
          <a href="https://wa.me/5500000000000" target="_blank" rel="noreferrer" className="mt-4 inline-block">
            <Button variant="hero">Abrir WhatsApp</Button>
          </a>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <Mail className="h-6 w-6 text-mint" />
          <h3 className="mt-3 font-display text-lg font-bold">E-mail</h3>
          <p className="mt-1 text-sm text-muted-foreground">suporte@estacaorevalida.com.br</p>
          <a href="mailto:suporte@estacaorevalida.com.br" className="mt-4 inline-block">
            <Button variant="outline">Enviar e-mail</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
