import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/app/perfil")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Perfil — Estação Revalida" }] }),
});

function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-mint text-xl font-bold text-night">
            M
          </div>
          <div>
            <div className="font-display text-xl font-bold">Marina Lopes</div>
            <div className="text-sm text-muted-foreground">marina@email.com · Aluna</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="font-semibold">Minha assinatura</h3>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-display text-2xl font-bold">Plano Pro</div>
            <div className="mt-1 text-sm text-muted-foreground">Vence em 12/06/2026</div>
          </div>
          <Badge className="bg-success/15 text-success hover:bg-success/15">Ativo</Badge>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="hero">Renovar</Button>
          <a
            href="https://wa.me/5500000000000?text=Ol%C3%A1%2C%20quero%20ativar%20minha%20assinatura%20na%20Esta%C3%A7%C3%A3o%20Revalida."
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="outline">
              <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
            </Button>
          </a>
        </div>
      </div>

      <Link to="/">
        <Button variant="ghost" className="text-muted-foreground">
          <LogOut className="h-4 w-4" /> Sair da conta
        </Button>
      </Link>
    </div>
  );
}
