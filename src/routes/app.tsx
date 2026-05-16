import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import {
  Home,
  ClipboardList,
  Dumbbell,
  TrendingUp,
  User,
  Bell,
  LogOut,
  GraduationCap,
  Brain,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const baseNavItems = [
  { to: "/app", label: "Início", icon: Home, exact: true },
  { to: "/app/estacoes", label: "Estações", icon: ClipboardList, exact: false },
  { to: "/app/treinar", label: "Treinar", icon: Dumbbell, exact: false },
  { to: "/app/progresso", label: "Progresso", icon: TrendingUp, exact: false },
  { to: "/app/perfil", label: "Perfil", icon: User, exact: false },
] as const;

type NavItem = { to: string; label: string; icon: typeof Home; exact: boolean };

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const { user, loading, profile, roles, signOut } = useAuth();

  const isTeacher = roles.includes("professor") || roles.includes("admin");
  const navItems: NavItem[] = isTeacher
    ? [
        ...baseNavItems.slice(0, 4),
        { to: "/app/professor", label: "Professor", icon: GraduationCap, exact: false },
        baseNavItems[4],
      ]
    : [...baseNavItems];

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  async function handleLogout() {
    await signOut();
    nav({ to: "/login" });
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const initial = (profile?.full_name || user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar lg:flex lg:flex-col">
        <div className="px-6 py-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((n) => {
            const active = isActive(n.to, n.exact);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-mint/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <n.icon className={`h-5 w-5 ${active ? "text-mint" : ""}`} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Notificações">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-gradient-mint text-sm font-bold text-night sm:flex">
              {initial}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
            {navItems.map((n) => {
              const active = isActive(n.to, n.exact);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium ${
                    active ? "text-mint" : "text-muted-foreground"
                  }`}
                >
                  <n.icon className="h-5 w-5" />
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
