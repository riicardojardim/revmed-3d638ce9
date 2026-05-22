import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";

/**
 * Bloqueia o conteúdo de rotas pagas para usuários sem plano ativo.
 * Admin / Professor / Mentor passam direto (isPrivileged).
 * Carregamento mostra um esqueleto suave para evitar flash de conteúdo.
 */
export function PaywallGate({ children, feature }: { children: React.ReactNode; feature?: string }) {
  const { hasAccess, loading, plan } = useSubscription();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-mint/30 border-t-mint" />
      </div>
    );
  }

  if (hasAccess) return <>{children}</>;

  const title = plan?.expired
    ? "Sua assinatura expirou"
    : "Conteúdo exclusivo para assinantes";

  const body = plan?.expired
    ? "Renove seu plano para continuar acessando o conteúdo premium da REVMED."
    : `Para acessar ${feature ?? "este conteúdo"} você precisa de uma assinatura ativa do REVMED.`;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl border border-mint/20 bg-card/60 p-8 text-center shadow-xl backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-mint/15 text-mint">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
        <div className="mt-7 flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="bg-mint text-background hover:bg-mint/90">
            <Link to="/app/perfil">
              <Sparkles className="mr-2 h-4 w-4" />
              Ver planos
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/app">Voltar ao início</Link>
          </Button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Dúvidas? Fale com a gente em{" "}
          <Link to="/app/suporte" className="text-mint underline-offset-4 hover:underline">
            Suporte
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
