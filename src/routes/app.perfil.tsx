import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/perfil")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Perfil — Estação Revalida" }] }),
});

function ProfilePage() {
  const { user, profile, roles, signOut } = useAuth();
  const nav = useNavigate();
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "—";
  const initial = displayName.charAt(0).toUpperCase();
  const roleLabel = roles.includes("admin")
    ? "Admin"
    : roles.includes("professor")
      ? "Professor"
      : "Aluno";

  async function handleLogout() {
    await signOut();
    nav({ to: "/login" });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-mint text-xl font-bold text-night">
            {initial}
          </div>
          <div>
            <div className="font-display text-xl font-bold">{displayName}</div>
            <div className="text-sm text-muted-foreground">
              {user?.email} · {roleLabel}
            </div>
            {profile?.exam_year && (
              <div className="mt-1 text-xs text-muted-foreground">
                Ano da prova: {profile.exam_year}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="font-semibold">Minha assinatura</h3>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-display text-2xl font-bold">Plano Free</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Atualize para desbloquear todas as estações e correção do professor.
            </div>
          </div>
          <Badge className="bg-mint/15 text-medical hover:bg-mint/15">Ativo</Badge>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="hero">Fazer upgrade</Button>
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

      <Button variant="ghost" className="text-muted-foreground" onClick={handleLogout}>
        <LogOut className="h-4 w-4" /> Sair da conta
      </Button>
    </div>
  );
}
