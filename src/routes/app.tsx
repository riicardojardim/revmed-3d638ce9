import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  Activity,
  LayoutDashboard,
  Users,
  CreditCard,
  Stethoscope,
  FileStack,
  Calendar,
  DoorOpen,
  Video,
  Sparkles,
  Clock,
  MessageSquare,
  Headphones,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { toast } from "sonner";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  badge?: string;
  children?: { to: string; label: string }[];
};

type NavSection = { label?: string; items: NavItem[] };

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const { user, loading, profile, roles, signOut } = useAuth();
  const { plan, isPrivileged } = useSubscription();

  const isAdmin = roles.includes("admin");
  const isTeacher = roles.includes("professor") || isAdmin;
  const isAtorOnly = plan?.slug === "ator" && !plan.expired;
  const isCompleto = isPrivileged || (!!plan && !plan.expired && plan.slug === "completo");

  // Build sidebar sections based on plan
  let sections: NavSection[] = [];

  if (isAdmin && pathname.startsWith("/app/admin")) {
    sections = [
      {
        items: [
          { to: "/app/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
          { to: "/app/admin/estacoes", label: "Estações", icon: Stethoscope },
          { to: "/app/admin/usuarios", label: "Usuários", icon: Users },
          { to: "/app/admin/conteudo", label: "Conteúdo", icon: FileStack },
          { to: "/app/admin/planos", label: "Planos", icon: CreditCard },
          { to: "/app/perfil", label: "Perfil", icon: User },
        ],
      },
    ];
  } else if (isAtorOnly) {
    sections = [
      {
        items: [
          { to: "/app", label: "Início", icon: Home, exact: true },
          { to: "/app/treinar", label: "Salas", icon: Dumbbell },
          { to: "/app/perfil", label: "Perfil", icon: User },
        ],
      },
    ];
  } else if (isCompleto) {
    // Pense-style sectioned sidebar for Completo / privileged
    sections = [
      { items: [{ to: "/app", label: "Dashboard", icon: Home, exact: true }] },
      {
        label: "Checklist & Flashcard",
        items: [
          { to: "/app/estacoes", label: "Banco de checklists", icon: ClipboardList },
          { to: "/app/treinar", label: "Criar Simulado", icon: Dumbbell },
          { to: "/app/flashcards", label: "Flashcards", icon: Brain, children: [
            { to: "/app/flashcards", label: "Flashcards" },
            { to: "/app/flashcards/revisao", label: "Revisão" },
          ]},
          
          { to: "/app/entrar", label: "Entrar", icon: DoorOpen },
        ],
      },
      {
        label: "Desempenho",
        items: [
          { to: "/app/progresso", label: "Meus Desempenhos", icon: TrendingUp },
          { to: "/app/historico", label: "Histórico", icon: Clock },
        ],
      },
      ...(isTeacher
        ? [{
            label: "Área da mentoria",
            items: [{ to: "/app/professor", label: "Painel do Professor", icon: GraduationCap } as NavItem],
          }]
        : []),
      {
        label: "Contato",
        items: [
          { to: "/app/feedback", label: "Feedback", icon: MessageSquare },
          { to: "/app/suporte", label: "Suporte", icon: Headphones },
        ],
      },
      { items: [{ to: "/app/perfil", label: "Perfil", icon: User }] },
    ];
  } else {
    // Free / default candidato
    sections = [
      {
        items: [
          { to: "/app", label: "Início", icon: Home, exact: true },
          { to: "/app/estacoes", label: "Estações", icon: ClipboardList },
          { to: "/app/treinar", label: "Treinar", icon: Dumbbell },
          { to: "/app/flashcards", label: "Flashcards", icon: Brain },
          
          { to: "/app/progresso", label: "Progresso", icon: TrendingUp },
          ...(isTeacher ? [{ to: "/app/professor", label: "Professor", icon: GraduationCap } as NavItem] : []),
          { to: "/app/perfil", label: "Perfil", icon: User },
        ],
      },
    ];
  }

  // Mobile bottom nav: flatten top-level
  const flatNav: NavItem[] = sections.flatMap((s) => s.items);

  const [activeRoom, setActiveRoom] = useState<{ code: string; title: string } | null>(null);
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("ator:activeRoom");
        setActiveRoom(raw ? JSON.parse(raw) : null);
      } catch { setActiveRoom(null); }
    };
    read();
    window.addEventListener("ator:activeRoom", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("ator:activeRoom", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!loading && user && isAdmin && pathname === "/app") {
      nav({ to: "/app/admin" });
    }
  }, [loading, user, isAdmin, pathname, nav]);

  useEffect(() => {
    if (loading || !user || sessionStorage.getItem("auth:welcome") !== "1") return;
    sessionStorage.removeItem("auth:welcome");
    toast.success("Bem-vindo de volta!");
  }, [loading, user]);

  const isActive = (to: string, exact?: boolean) =>
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
    <div className="flex min-h-screen w-full bg-paper">
      {/* Desktop sidebar — editorial rail */}
      <aside className="hidden w-[260px] shrink-0 border-r hairline bg-sidebar lg:flex lg:flex-col">
        <div className="px-6 pt-6 pb-4">
          <Logo />
          <div className="mt-4 flex items-center gap-2 text-eyebrow-serif">
            <span className="h-px w-6 bg-mint/60" />
            <span>Edição 2026.1</span>
          </div>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          {sections.map((section, si) => (
            <div key={si}>
              {section.label && (
                <div className="px-2 pb-2 pt-1 text-eyebrow-serif">
                  {section.label}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((n) => {
                  const active = isActive(n.to, n.exact);
                  const isSalas = n.to === "/app/treinar";
                  const hasChildren = !!n.children?.length;
                  const childActive = hasChildren && n.children!.some((c) => isActive(c.to, true));
                  const isOn = active || childActive;
                  return (
                    <div key={n.to}>
                      <Link
                        to={n.to}
                        className={`group relative flex items-center gap-3 rounded-lg pl-4 pr-3 py-2 text-[13.5px] transition-all ${
                          isOn
                            ? "bg-mint/[0.08] text-foreground font-semibold"
                            : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
                        }`}
                      >
                        <span
                          className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-r-full transition-all ${
                            isOn ? "bg-mint" : "bg-transparent group-hover:bg-foreground/15"
                          }`}
                        />
                        <n.icon className={`h-[17px] w-[17px] transition-colors ${isOn ? "text-mint" : ""}`} strokeWidth={isOn ? 2.2 : 1.7} />
                        <span className="flex-1 truncate">{n.label}</span>
                        {n.badge && (
                          <span className="chip-editorial !py-0.5 !text-[9px]">
                            {n.badge}
                          </span>
                        )}
                        {hasChildren && (childActive
                          ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                          : <ChevronRight className="h-3.5 w-3.5 opacity-60" />)}
                      </Link>
                      {hasChildren && childActive && (
                        <div className="ml-7 mt-1 space-y-0.5 border-l hairline pl-3">
                          {n.children!.map((c) => {
                            const cActive = isActive(c.to, true);
                            return (
                              <Link
                                key={c.to}
                                to={c.to}
                                className={`block rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                                  cActive ? "text-mint font-semibold" : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {c.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                      {isSalas && activeRoom && (
                        <div className="ml-7 mt-1 border-l border-mint/30 pl-3">
                          <Link
                            to="/app/sala/$code/paciente"
                            params={{ code: activeRoom.code }}
                            className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-all ${
                              pathname.startsWith(`/app/sala/${activeRoom.code}`)
                                ? "bg-mint/15 text-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <Activity className="h-3.5 w-3.5 text-mint" />
                            <span className="flex-1 truncate">Treinamento</span>
                          </Link>
                          <div className="px-2.5 pb-1 pt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-mint/80">
                            {activeRoom.code}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t hairline p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.8} />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Topbar — editorial */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b hairline glass-panel px-4 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo />
          </div>
          <div className="flex flex-1 items-center gap-3 overflow-hidden">
            <span className="chip-editorial shrink-0">
              <span className="live-dot" />
              <span>Revalida · 2026.1</span>
            </span>
            <a
              href="https://chat.whatsapp.com/"
              target="_blank"
              rel="noreferrer"
              className="hidden truncate text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors story-link sm:inline-block"
            >
              Grupo Premium 2026.1 · WhatsApp
            </a>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Notificações">
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.7} />
            </Button>
            <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-gradient-mint font-display text-[15px] font-semibold text-night ring-1 ring-mint/40 sm:flex">
              {initial}
            </div>
          </div>
        </header>

        <main className="relative flex-1 px-4 pb-24 pt-8 lg:px-10 lg:pb-12">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-dot-grid opacity-[0.35]" />
          <div className="relative">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t hairline glass-panel lg:hidden">
          <div className="flex overflow-x-auto no-scrollbar">
            {flatNav.slice(0, 6).map((n) => {
              const active = isActive(n.to, n.exact);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex min-w-[68px] flex-1 flex-col items-center justify-center gap-1 px-2 py-2.5 text-[10px] font-medium transition-colors ${
                    active ? "text-mint" : "text-muted-foreground"
                  }`}
                >
                  <n.icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.7} />
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
