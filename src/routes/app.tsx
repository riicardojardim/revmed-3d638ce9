import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { RouteProgress } from "@/components/RouteProgress";
import { Logo } from "@/components/Logo";
import logoIconOnlyUrl from "@/assets/logo-revmed-icon.png";

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
  User,
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
  DoorOpen,
  Sparkles,
  MessageSquare,
  Headphones,
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
          <Outlet />
        </main>
      </SidebarInset>
    </div>
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
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-12 items-center px-2 group-data-[collapsible=icon]:justify-center">
          <div className="group-data-[collapsible=icon]:hidden">
            <Logo />
          </div>
          <img
            src={logoIconOnlyUrl}
            alt="REVMED"
            draggable={false}
            className="hidden h-8 w-auto select-none group-data-[collapsible=icon]:block"
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
