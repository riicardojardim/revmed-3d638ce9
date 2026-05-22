import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { RouteProgress } from "@/components/RouteProgress";
import { Logo } from "@/components/Logo";
import logoIconOnlyUrl from "@/assets/logo-revmed-icon.png";

import { UserAvatar } from "@/components/UserAvatar";
import { NotificationBell } from "@/components/NotificationBell";
import { FriendsPanel } from "@/components/FriendsPanel";
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
  User,
  LogOut,
  
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
  DoorOpen,
  Sparkles,
  MessageSquare,
  Headphones,
  ShieldCheck,
  Video,
  Users2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useSubscription } from "@/hooks/use-subscription";
import { PaywallGate } from "@/components/PaywallGate";
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
  const waLabel = settings?.whatsapp_banner_label || "Grupo Premium 25/2";
  const { plan, isPrivileged, isCompletoLike, isAtorOnly } = useSubscription();

  const isAdmin = roles.includes("admin");
  const isTeacher = roles.includes("professor") || isAdmin;
  const isCompleto = isCompletoLike;

  // Rotas que exigem assinatura ativa (privileged/admin/prof passam direto via PaywallGate)
  const PAID_PREFIXES = [
    "/app/checklists",
    "/app/flashcards",
    "/app/resumos",
    "/app/videoaulas",
    "/app/simulacao",
    "/app/resultado",
    "/app/historico",
    "/app/sala",
    "/app/entrar",
    "/app/aulas",
  ];
  const isPaidRoute = PAID_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // View-mode switcher (admins can preview the app as different plans).
  const VIEW_MODE_KEY = "revmed:viewMode";
  type ViewMode = "admin" | "completo";
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const v = localStorage.getItem(VIEW_MODE_KEY);
      return v === "completo" ? "completo" : "admin";
    } catch {
      return "admin";
    }
  });
  function changeViewMode(mode: ViewMode, target: string) {
    try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch {}
    setViewMode(mode);
    nav({ to: target });
  }

  // Build sidebar sections based on plan
  let sections: NavSection[] = [];

  if (isAdmin && pathname.startsWith("/app/admin")) {
    sections = [
      {
        items: [
          { to: "/app", label: "Voltar pro app", icon: Home, exact: true },
          { to: "/app/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
          { to: "/app/admin/estacoes", label: "Checklists", icon: Stethoscope },
          { to: "/app/admin/flashcards", label: "Flashcards", icon: Brain },
          { to: "/app/admin/resumos", label: "Resumos", icon: FileText },
          { to: "/app/admin/videoaulas", label: "Vídeo Aulas", icon: Video },
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
          { to: "/app/videoaulas", label: "Vídeo Aulas", icon: Video },
          { to: "/app/entrar", label: "Bipar estação", icon: DoorOpen },
        ],
      },
      {
        label: "Social",
        items: [
          { to: "/app/comunidade", label: "Comunidade", icon: Users2 },
        ],
      },
      {
        label: "Contato",
        items: [
          { to: "/app/feedback", label: "Feedback", icon: MessageSquare },
          { to: "/app/suporte", label: "Suporte", icon: Headphones },
        ],
      },
      {
        items: [
          { to: "/app/perfil", label: "Perfil", icon: User },
          ...(isAdmin ? [{ to: "/app/admin", label: "Painel Admin", icon: ShieldCheck } as NavItem] : []),
        ],
      },
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
          { to: "/app/videoaulas", label: "Vídeo Aulas", icon: Video },
          
          { to: "/app/perfil", label: "Perfil", icon: User },
          { to: "/app/comunidade", label: "Comunidade", icon: Users2 },
          ...(isAdmin ? [{ to: "/app/admin", label: "Painel Admin", icon: ShieldCheck } as NavItem] : []),
        ],
      },
    ];
  }

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

  // No auto-redirect for admins: clicking "Dashboard" should stay on /app.
  // Admins access the admin panel explicitly via the sidebar item.

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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-mint/20 blur-3xl animate-[splash-pulse_2.8s_ease-in-out_infinite]" />
          <div className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-medical/15 blur-2xl" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage:
                "radial-gradient(ellipse at center, black 30%, transparent 70%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at center, black 30%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative flex flex-col items-center gap-7">
          {/* Rotating rings */}
          <div className="relative flex h-40 w-40 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-mint/20" />
            <div className="absolute inset-0 animate-[splash-spin_2.4s_linear_infinite] rounded-full border-2 border-transparent border-t-mint border-r-mint/40" />
            <div className="absolute inset-3 animate-[splash-spin-rev_3.2s_linear_infinite] rounded-full border border-transparent border-b-medical/70 border-l-medical/30" />
            <div className="absolute inset-6 rounded-full bg-gradient-to-br from-mint/10 to-medical/10 backdrop-blur-sm" />
            <Logo className="relative h-12 w-auto animate-[splash-breathe_2.4s_ease-in-out_infinite] drop-shadow-[0_8px_24px_hsl(var(--mint)/0.45)]" />
          </div>

          <div className="flex flex-col items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-mint">
              Preparando sua estação
            </p>

            {/* Loader bar */}
            <div className="relative h-1 w-48 overflow-hidden rounded-full bg-muted/40">
              <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-mint to-medical animate-[loading_1.4s_ease-in-out_infinite]" />
            </div>

            {/* Dots */}
            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-mint animate-[splash-dot_1.2s_ease-in-out_infinite]" />
              <span className="h-1.5 w-1.5 rounded-full bg-mint animate-[splash-dot_1.2s_ease-in-out_infinite] [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-mint animate-[splash-dot_1.2s_ease-in-out_infinite] [animation-delay:0.4s]" />
            </div>
          </div>
        </div>

        <style>{`
          @keyframes loading { 0%{transform:translateX(-120%)} 100%{transform:translateX(380%)} }
          @keyframes splash-spin { to { transform: rotate(360deg); } }
          @keyframes splash-spin-rev { to { transform: rotate(-360deg); } }
          @keyframes splash-breathe {
            0%, 100% { transform: scale(1); opacity: 0.95; }
            50% { transform: scale(1.06); opacity: 1; }
          }
          @keyframes splash-pulse {
            0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 0.85; transform: translate(-50%, -50%) scale(1.08); }
          }
          @keyframes splash-dot {
            0%, 100% { opacity: 0.3; transform: translateY(0); }
            50% { opacity: 1; transform: translateY(-3px); }
          }
        `}</style>
      </div>
    );
  }


  const initial = (profile?.full_name || user.email || "?").charAt(0).toUpperCase();

  return (
    <OnlinePresenceProvider>
    <SidebarProvider>
    <div className="relative z-10 flex min-h-dvh w-full min-w-0 overflow-x-clip">
      <AppSideNav sections={sections} isActive={isActive} />

      <SidebarInset className="flex min-h-dvh min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header
          className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-4 md:px-6 lg:px-8"
          style={{ paddingTop: "max(env(safe-area-inset-top), 10px)", paddingLeft: "max(env(safe-area-inset-left), 0.75rem)", paddingRight: "max(env(safe-area-inset-right), 0.75rem)" }}
        >
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
          </div>
          <div className="hidden flex-1 items-center justify-end gap-2 overflow-hidden font-sans md:flex">
            <span
              title={`Nota de corte da prova de habilidades clínicas — ${NOTA_DE_CORTE_EDICAO} (INEP)`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-mint/40 bg-mint/10 px-3 py-1.5 text-xs font-semibold tracking-tight text-foreground"
            >
              <span className="text-muted-foreground">Nota de corte INEP</span>
              <span className="font-display font-bold tabular-nums text-mint">{NOTA_DE_CORTE.toFixed(3)} pts</span>
              <span className="inline-block h-3 w-px bg-mint/40" />
              <span className="text-muted-foreground">{NOTA_DE_CORTE_EDICAO}</span>
            </span>
            {waEnabled && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                title={waLabel}
                className="group inline-flex shrink-1 items-center gap-2 rounded-full border border-mint/40 bg-mint/10 px-3 py-1.5 text-xs font-semibold tracking-tight text-foreground transition-colors hover:bg-mint/15 hover:border-mint/60"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 fill-mint"
                >
                  <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
                </svg>
                <span className="font-display font-bold text-mint whitespace-nowrap">{waLabel}</span>
              </a>
            )}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex rounded-full outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2"
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
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Modo de visualização
                    </DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => changeViewMode("admin", "/app/admin")}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => changeViewMode("admin", "/app")}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Ver como Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => changeViewMode("completo", "/app")}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Ver como Plano Completo
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-7xl min-w-0 flex-1 overflow-x-clip px-3 pb-12 pt-4 sm:px-4 sm:pt-6 md:px-6 lg:px-8">
          <RouteProgress />
          {isPaidRoute ? (
            <PaywallGate>
              <Outlet />
            </PaywallGate>
          ) : (
            <Outlet />
          )}
        </main>
      </SidebarInset>
    </div>
    <FriendsPanel />
    </SidebarProvider>
    </OnlinePresenceProvider>
  );
}

function AppSideNav({
  sections,
  isActive,
}: {
  sections: NavSection[];
  isActive: (to: string, exact?: boolean) => boolean;
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border pt-[env(safe-area-inset-top)]">
        <div className="flex h-12 items-center px-2 group-data-[collapsible=icon]:justify-center">
          <div className="group-data-[collapsible=icon]:hidden">
            <Logo />
          </div>
          <img
            src={logoIconOnlyUrl}
            alt="REVMED"
            draggable={false}
            className="hidden aspect-square h-9 w-9 select-none object-contain group-data-[collapsible=icon]:block"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {sections.map((section, i) => (
          <SidebarGroup key={i}>
            {section.label && (
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const active = isActive(item.to, item.exact);
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                      >
                        <Link to={item.to}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
