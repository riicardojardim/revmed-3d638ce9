import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { GraduationCap, ClipboardEdit, BookPlus, LayoutDashboard, Brain, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/professor")({
  component: ProfessorLayout,
  head: () => ({ meta: [{ title: "Área do Professor — Estação Revalida" }] }),
});

const tabs = [
  { to: "/app/professor", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/app/professor/estacoes", label: "Estações", icon: BookPlus, exact: false },
  { to: "/app/professor/flashcards", label: "Flashcards", icon: Brain, exact: false },
  { to: "/app/professor/resumos", label: "Resumos", icon: BookOpen, exact: false },
  { to: "/app/professor/correcoes", label: "Correções", icon: ClipboardEdit, exact: false },
] as const;

function ProfessorLayout() {
  const { roles, loading } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const allowed = roles.includes("professor") || roles.includes("admin");

  useEffect(() => {
    if (!loading && !allowed) nav({ to: "/app" });
  }, [loading, allowed, nav]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }
  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 text-center">
        <GraduationCap className="mx-auto h-8 w-8 text-mint" />
        <h2 className="mt-3 font-display text-xl font-bold">Área exclusiva para professores</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua conta não tem permissão. Solicite acesso ao administrador.
        </p>
      </div>
    );
  }

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3 py-1 text-xs font-medium text-medical">
            <GraduationCap className="h-3.5 w-3.5" /> Painel do Professor
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">
            Construa estações e corrija seus alunos
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-2xl border border-border bg-card p-1">
        {tabs.map((t) => {
          const active = isActive(t.to, t.exact);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-mint/10 text-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <t.icon className={cn("h-4 w-4", active && "text-mint")} /> {t.label}
            </Link>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
}
