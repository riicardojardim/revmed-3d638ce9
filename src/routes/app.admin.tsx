import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ShieldCheck, Users, CreditCard, LayoutDashboard, Stethoscope, FileStack, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Admin — Estação Revalida" }] }),
});

const tabs = [
  { to: "/app/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/app/admin/estacoes", label: "Checklists", icon: Stethoscope, exact: false },
  { to: "/app/admin/flashcards", label: "Flashcards", icon: Brain, exact: false },
  { to: "/app/admin/usuarios", label: "Usuários", icon: Users, exact: false },
  { to: "/app/admin/conteudo", label: "Conteúdo", icon: FileStack, exact: false },
  { to: "/app/admin/planos", label: "Planos", icon: CreditCard, exact: false },
] as const;

function AdminLayout() {
  const { roles, loading } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const allowed = roles.includes("admin");

  useEffect(() => {
    if (!loading && !allowed) nav({ to: "/app" });
  }, [loading, allowed, nav]);

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-mint" />
        <h2 className="mt-3 font-display text-xl font-bold">Área administrativa</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sua conta não tem permissão.</p>
      </div>
    );
  }

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3 py-1 text-xs font-medium text-medical">
          <ShieldCheck className="h-3.5 w-3.5" /> Painel administrativo
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">Gestão da plataforma</h1>
      </div>
      <nav className="flex flex-wrap gap-1 rounded-2xl border border-border bg-card p-1">
        {tabs.map((t) => {
          const active = isActive(t.to, t.exact);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition",
                active ? "bg-mint/15 text-mint" : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
