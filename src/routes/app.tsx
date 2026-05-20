import { Link, Outlet, useRouterState, useNavigate, useRouter } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { DashboardBackground } from "@/components/DashboardBackground";
import { RouteProgress } from "@/components/RouteProgress";
import { Logo } from "@/components/Logo";

import { UserAvatar } from "@/components/UserAvatar";
import { NotificationBell } from "@/components/NotificationBell";
import { NOTA_DE_CORTE, NOTA_DE_CORTE_EDICAO } from "@/components/SpecialtyMedals";
import { OnlinePresenceProvider } from "@/hooks/use-online-presence";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  ClipboardList,
  Dumbbell,
  
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
  DollarSign,
  Stethoscope,
  FileStack,
  FileText,
  Calendar,
  DoorOpen,
  Video,
  Sparkles,
  
  MessageSquare,
  Headphones,
  

  MoreHorizontal,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useSiteSettings } from "@/hooks/use-site-settings";
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
  const { settings } = useSiteSettings();
  const waEnabled = settings?.whatsapp_banner_enabled !== false;
  const waUrl = settings?.whatsapp_banner_url || "https://chat.whatsapp.com/";
  const waLabel = settings?.whatsapp_banner_label || "Grupo Premium 2026.1 · WhatsApp (Grupo 6)";
  const { plan, isPrivileged, isCompletoLike, isAtorOnly } = useSubscription();

  const isAdmin = roles.includes("admin");
  const isTeacher = roles.includes("professor") || isAdmin;
  const isCompleto = isCompletoLike;

  // Build sidebar sections based on plan
  let sections: NavSection[] = [];

  if (isAdmin && pathname.startsWith("/app/admin")) {
    sections = [
      {
        items: [
          { to: "/app/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
          { to: "/app/admin/estacoes", label: "Checklists", icon: Stethoscope },
          { to: "/app/admin/flashcards", label: "Flashcards", icon: Brain },
          { to: "/app/admin/resumos", label: "Resumos", icon: FileText },
          { to: "/app/admin/usuarios", label: "Usuários", icon: Users },
          { to: "/app/admin/conteudo", label: "Conteúdo", icon: FileStack },
          { to: "/app/admin/planos", label: "Planos", icon: CreditCard },
          { to: "/app/admin/pagamentos", label: "Pagamentos", icon: DollarSign },
          { to: "/app/admin/aparencia", label: "Aparência", icon: Sparkles },
          { to: "/app/admin/integracoes", label: "Integrações", icon: Activity },
          { to: "/app/perfil", label: "Perfil", icon: User },
        ],
      },
    ];
  } else if (isAtorOnly) {
    sections = [
      {
        items: [
          { to: "/app", label: "Início", icon: Home, exact: true },
          { to: "/app/checklists", label: "Checklists", icon: ClipboardList },
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
          { to: "/app/checklists", label: "Checklists", icon: ClipboardList },
          { to: "/app/flashcards", label: "Flashcards", icon: Brain, children: [
            { to: "/app/flashcards", label: "Flashcards" },
            { to: "/app/flashcards/desempenho", label: "Desempenho" },
          ]},
          { to: "/app/resumos", label: "Resumos", icon: BookOpen },
          { to: "/app/entrar", label: "Entrar", icon: DoorOpen },
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
          { to: "/app/checklists", label: "Checklists", icon: ClipboardList },
          { to: "/app/flashcards", label: "Flashcards", icon: Brain },
          { to: "/app/resumos", label: "Resumos", icon: BookOpen },
          ...(isTeacher ? [{ to: "/app/professor", label: "Professor", icon: GraduationCap } as NavItem] : []),
          { to: "/app/perfil", label: "Perfil", icon: User },
        ],
      },
    ];
  }

  // Mobile bottom nav: flatten top-level
  const flatNav: NavItem[] = sections.flatMap((s) => s.items);

  
  const [activeRoom, setActiveRoom] = useState<{ code: string; title: string; path?: string; parent?: "treinar" | "estacoes" } | null>(null);
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
        <div className="flex flex-col items-center gap-3">
          <Logo className="h-10 w-auto opacity-80" />
          <div className="h-1 w-32 overflow-hidden rounded-full bg-muted/50">
            <div className="h-full w-1/2 animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-mint" />
          </div>
        </div>
        <style>{`@keyframes loading {0%{transform:translateX(-100%)}100%{transform:translateX(220%)}}`}</style>
      </div>
    );
  }


  const initial = (profile?.full_name || user.email || "?").charAt(0).toUpperCase();

  return (
    <OnlinePresenceProvider>
    <DashboardBackground />
    <div className="relative z-10 flex min-h-dvh w-full min-w-0 overflow-x-clip">
      {/* Sidebar desktop removida — navegação fica apenas no dock inferior */}


      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header
          className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-4 md:px-6 lg:px-8"
          style={{ paddingTop: "max(env(safe-area-inset-top), 10px)", paddingLeft: "max(env(safe-area-inset-left), 0.75rem)", paddingRight: "max(env(safe-area-inset-right), 0.75rem)" }}
        >
          <div className="flex items-center gap-2">
            <Logo />
          </div>
          <div className="flex flex-1 items-center gap-2 overflow-hidden font-sans">
            <span
              title={`Nota de corte da prova de habilidades clínicas — ${NOTA_DE_CORTE_EDICAO} (INEP)`}
              className="hidden shrink-0 items-center gap-2 rounded-full border border-mint/40 bg-mint/10 px-3 py-1.5 text-xs font-semibold tracking-tight text-foreground md:inline-flex"
            >
              <span className="text-muted-foreground">Nota de corte INEP</span>
              <span className="font-display font-bold tabular-nums text-mint">{NOTA_DE_CORTE.toFixed(3)} pts</span>
              <span className="hidden h-3 w-px bg-mint/40 lg:inline-block" />
              <span className="hidden text-muted-foreground lg:inline">{NOTA_DE_CORTE_EDICAO}</span>
            </span>
            {waEnabled && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="group relative hidden shrink-0 items-center gap-2 overflow-hidden rounded-full bg-[#25D366] px-3.5 py-1.5 text-xs font-bold tracking-tight text-white shadow-[0_4px_14px_-2px_rgba(37,211,102,0.55)] ring-1 ring-white/20 transition-all hover:bg-[#1ebe5d] hover:shadow-[0_6px_20px_-2px_rgba(37,211,102,0.75)] sm:inline-flex"
              >
                <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-white">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[#25D366]" aria-hidden>
                    <path d="M17.5 14.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2s-.8 1-1 1.2c-.2.2-.4.2-.6 0-.3-.2-1.2-.4-2.3-1.4-.8-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.4.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.2-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.5s1 2.9 1.1 3.1c.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.2-.1-.5-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3c1.4.8 3 1.3 4.8 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
                  </svg>
                </span>
                <span className="relative truncate text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">{waLabel}</span>
              </a>
            )}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden rounded-full outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 sm:inline-flex"
                  aria-label="Abrir menu do usuário"
                >
                  <UserAvatar
                    avatarUrl={profile?.avatar_url}
                    name={profile?.full_name ?? user.email}
                    size="md"
                    online
                  />

                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="truncate">
                  {profile?.full_name ?? user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => nav({ to: "/app/perfil" })}>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-7xl min-w-0 flex-1 overflow-x-clip px-3 pb-32 pt-4 sm:px-4 sm:pt-6 md:px-6 lg:px-8">
          <RouteProgress />
          <Outlet />
        </main>



        {/* Bottom dock — em todas as larguras */}
        <BottomDock items={flatNav} isActive={isActive} />



      </div>
    </div>
    </OnlinePresenceProvider>
  );
}

function BottomDock({
  items,
  isActive,
}: {
  items: NavItem[];
  isActive: (to: string, exact?: boolean) => boolean;
}) {
  const isMobile = useIsMobile();
  const router = useRouter();
  // Em mobile mostramos no máximo 4 atalhos + botão "Mais" com o restante.
  const MAX_VISIBLE = 4;
  const showOverflow = isMobile && items.length > MAX_VISIBLE;
  const visible = showOverflow ? items.slice(0, MAX_VISIBLE) : items;
  const overflow = showOverflow ? items.slice(MAX_VISIBLE) : [];

  // Pré-carrega TODAS as rotas do dock assim que ele monta — evita qualquer
  // espera (e a tela anterior reaparecendo) ao clicar em Checklists, Flashcards
  // ou outros atalhos. Usa requestIdleCallback p/ não disputar com a 1ª pintura.
  useEffect(() => {
    const run = () => {
      items.forEach((n) => {
        router.preloadRoute({ to: n.to } as Parameters<typeof router.preloadRoute>[0]).catch(() => {});
      });
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(run);
    } else {
      window.setTimeout(run, 200);
    }
  }, [items, router]);



  return (
    <nav
      className="fixed left-1/2 z-40 w-[calc(100vw-1rem)] max-w-[720px] -translate-x-1/2 rounded-2xl border border-border/60 bg-background/90 shadow-elegant backdrop-blur-xl sm:w-[min(96vw,720px)]"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)",
        left: "calc(50% + (env(safe-area-inset-left) - env(safe-area-inset-right)) / 2)",
      }}
    >

      <div className="flex items-stretch justify-around gap-0.5 px-1.5 py-1.5 sm:gap-1 sm:px-2">
        {visible.map((n) => {
          const active = isActive(n.to, n.exact);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-all sm:px-1.5 ${
                active ? "bg-mint/15 text-mint" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <n.icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
              <span className="max-w-full truncate">{n.label}</span>
              {active && <span className="absolute -top-1 h-1 w-6 rounded-full bg-mint" />}
            </Link>
          );
        })}
        {showOverflow && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold text-muted-foreground transition-all hover:text-foreground sm:px-1.5"
                aria-label="Mais opções"
              >
                <MoreHorizontal className="h-5 w-5" />
                <span>Mais</span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-56 p-1">
              <div className="flex flex-col">
                {overflow.map((n) => {
                  const active = isActive(n.to, n.exact);
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        active ? "bg-mint/15 text-mint" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <n.icon className="h-4 w-4" />
                      <span className="flex-1 truncate">{n.label}</span>
                    </Link>
                  );
                })}
                <div className="my-1 h-px bg-border" />
                <button
                  type="button"
                  onClick={async () => {
                    const { supabase } = await import("@/integrations/supabase/client");
                    await supabase.auth.signOut();
                    window.location.href = "/login";
                  }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="flex-1 truncate text-left">Sair</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </nav>
  );
}
