import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Menu,
  X,
  Sparkles,
  Flame,
  Target,
  Compass,
  Layers,
  Instagram,
  Phone,
  Mail,
  MessageCircle,
  Drama,
  Crown,
  GraduationCap,
  Home as HomeIcon,
  User as UserIcon,
  LogOut,
  PlayCircle,
  Award,
  Stethoscope,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSiteSettings } from "@/hooks/use-site-settings";

import { UserAvatar } from "@/components/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "@tanstack/react-router";
import mockupDashboard from "@/assets/mockup-dashboard.png";
import mockupChecklists from "@/assets/mockup-checklists.png";
import mockupFlashcards from "@/assets/mockup-flashcards.png";
import mockupResumos from "@/assets/mockup-resumos.png";
import avatar1 from "@/assets/hero-avatar-1.jpg";
import avatar2 from "@/assets/hero-avatar-2.jpg";
import avatar3 from "@/assets/hero-avatar-3.jpg";
import avatar4 from "@/assets/hero-avatar-4.jpg";
import anoar1 from "@/assets/anoar-1.png";
import anoar2 from "@/assets/anoar-2.png";
import anoar3 from "@/assets/anoar-3.png";
import anoar4 from "@/assets/anoar-4.png";
import { Tilt } from "@/components/landing/motion-primitives";
import { Depoimentos } from "@/components/landing/Depoimentos";
import { AprovadosMarquee } from "@/components/landing/AprovadosMarquee";
import { ComoFunciona, Comparativo } from "@/components/landing/ComoFunciona";
import {
  FakeNotifications,
  NOTIFICATION_AVATAR_SOURCES,
  WhatsAppFloat,
  UrgencyBanner,
} from "@/components/landing/FakeNotifications";
import { SignupPaymentModal, type SignupModalPlan } from "@/components/landing/SignupPaymentModal";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "REVMED — A maior mentoria online para Revalidação de Diploma Médico" },
      {
        name: "description",
        content:
          "A 1ª maior mentoria online do Brasil agora em sua melhor versão — App REVMED. Treine com o time que mais aprova na Revalidação de Diploma Médico: plataforma completa com aulas, cronograma, resumos, flashcards, simulados e mentoria integrada.",
      },
      { property: "og:title", content: "REVMED — A maior mentoria online para Revalidação de Diploma Médico" },
      {
        property: "og:description",
        content:
          "Venha treinar com o time que mais aprova na Revalidação de Diploma Médico. Plataforma completa + mentoria 1:5 com acompanhamento humano.",
      },
    ],
    links: NOTIFICATION_AVATAR_SOURCES.map((src) => ({
      rel: "preload",
      as: "image",
      href: src,
      fetchpriority: "high",
    })),
  }),
});

const NAV_LINKS = [
  { id: "plataforma", label: "Plataforma" },
  { id: "manifesto", label: "Método" },
  { id: "resultados", label: "Resultados" },
  { id: "mentoria", label: "Mentoria" },
  { id: "investimento", label: "Planos" },
];

function LandingPage() {
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [signupPlan, setSignupPlan] = useState<SignupModalPlan | null>(null);
  const [dbPlans, setDbPlans] = useState<any[]>([]);

  const lastY = useRef(0);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    setMounted(true);
    const fetchPlans = async () => {
      setLoadingPlans(true);
      const { data, error } = await supabase.from("plans").select("*").eq("active", true).order("price_cents");
      if (error) {
        console.error("Erro ao buscar planos:", error);
        setLoadingPlans(false);
        return;
      }
      if (data) {
        setDbPlans(data);
      }
      setLoadingPlans(false);
    };

    fetchPlans();
  }, []);


  useEffect(() => {
    lastY.current = window.scrollY;
    setScrolled(window.scrollY > 8);

    if (menuOpen || userMenuOpen || window.scrollY <= 24) {
      setHidden(false);
    }

    let ticking = false;
    let frame = 0;

    const onScroll = () => {
      if (ticking) return;

      ticking = true;
      frame = window.requestAnimationFrame(() => {
        const y = Math.max(window.scrollY, 0);
        const delta = y - lastY.current;
        const movedEnough = Math.abs(delta) >= 2;

        setScrolled(y > 8);

        if (menuOpen || userMenuOpen || y <= 24) {
          setHidden(false);
        } else if (!movedEnough) {
          lastY.current = y;
          ticking = false;
          return;
        } else if (delta > 0 && y > 72) {
          setHidden(true);
        } else if (delta < 0) {
          setHidden(false);
        }

        lastY.current = y;
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [menuOpen, userMenuOpen]);

  return (
    <div className="dark min-h-dvh bg-background text-foreground antialiased">
      <UrgencyBanner />
      <TopNav
        scrolled={scrolled}
        hidden={hidden}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        userMenuOpen={userMenuOpen}
        setUserMenuOpen={setUserMenuOpen}
        isLogged={mounted && !!user}
        avatarUrl={profile?.avatar_url ?? null}
        displayName={profile?.full_name ?? user?.email ?? null}
        onSignOut={signOut}
      />
      <main className="overflow-clip">
        <Hero isLogged={mounted && !!user} dbPlans={dbPlans} />
        <MarqueeStrip />
        <ComoFunciona />
        <Manifesto />
        <Plataforma />
        <Comparativo />
        <Resultados />
        <Depoimentos />
        <AprovadosMarquee />
        <SobreFundador />
        <VejaPlataforma />
        <Mentoria dbPlans={dbPlans} />
        <Investimento
          isLogged={mounted && !!user}
          onChoosePlan={(p) => setSignupPlan(p)}
          dbPlans={dbPlans}
          loadingPlans={loadingPlans}
        />

        <FAQ dbPlans={dbPlans} />
        <FinalCTA isLogged={mounted && !!user} />
      </main>
      <Footer />
      <FakeNotifications />
      <WhatsAppFloat />
      <SignupPaymentModal
        open={!!signupPlan}
        onOpenChange={(v) => { if (!v) setSignupPlan(null); }}
        plan={signupPlan}
      />
    </div>
  );
}

/* ----------------------------- TOP NAV ----------------------------- */

function TopNav({
  scrolled,
  hidden,
  menuOpen,
  setMenuOpen,
  userMenuOpen,
  setUserMenuOpen,
  isLogged,
  avatarUrl,
  displayName,
  onSignOut,
}: {
  scrolled: boolean;
  hidden: boolean;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  userMenuOpen: boolean;
  setUserMenuOpen: (v: boolean) => void;
  isLogged: boolean;
  avatarUrl: string | null;
  displayName: string | null;
  onSignOut: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const hasSolidSurface = scrolled || menuOpen || userMenuOpen;

  return (
    <header
      className={`sticky top-0 z-50 transform-gpu transition-[transform,opacity,background-color,border-color,backdrop-filter,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
        hidden ? "-translate-y-[120%] opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      } ${
        hasSolidSurface
          ? "border-b border-border/70 bg-background/95 shadow-[0_18px_44px_-30px_hsl(var(--foreground)/0.8)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-4 md:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {isLogged ? (
            <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex rounded-full outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="Abrir menu do usuário"
                >
                  <UserAvatar
                    avatarUrl={avatarUrl}
                    name={displayName}
                    size="md"
                    online
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="truncate">
                  {displayName ?? "Minha conta"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate({ to: "/app" })}>
                  <HomeIcon className="mr-2 h-4 w-4" />
                  Início
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: "/app/perfil" })}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={async () => {
                    await onSignOut();
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] sm:px-5 sm:py-2.5"
            >
              Login
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

/* ----------------------------- HERO ----------------------------- */

function Hero({ isLogged, dbPlans }: { isLogged: boolean; dbPlans: any[] }) {
  const getPlanName = (slug: string, fallback: string) => {
    const p = dbPlans?.find(x => x.slug === slug);
    return p?.name || fallback;
  };

  const mentoriaName = getPlanName('mentoria', 'mentoria 1:5');
  const completoName = getPlanName('completo', 'Plataforma completa');
  return (
    <section className="relative">
      {/* radial orange glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 60% at 80% 0%, color-mix(in oklab, var(--primary) 30%, transparent) 0%, transparent 60%), radial-gradient(40% 50% at 10% 100%, color-mix(in oklab, var(--mint) 18%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="mx-auto grid max-w-7xl items-stretch gap-6 px-5 pt-3 pb-14 md:px-8 md:pt-12 md:pb-20 md:gap-10 lg:pt-16 lg:pb-28 lg:gap-8 lg:grid-cols-12">
        <div className="lg:col-span-6 lg:order-2">
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex w-auto max-w-full items-center gap-2 whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-primary md:px-3 md:py-1.5 md:text-xs md:tracking-[0.18em] lg:hidden"
          >
            <Flame className="h-3.5 w-3.5" />
            Plataforma de treino • Revalida INEP
          </motion.div>

          <motion.h1
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-3 font-display text-[1.75rem] font-black leading-[1.05] tracking-[-0.035em] md:mt-6 md:text-[2.6rem] lg:text-5xl xl:text-6xl"
          >
            <span>A primeira e maior Mentoria On-line do Brasil, </span>
            <span
              style={{
                backgroundImage:
                  "linear-gradient(120deg, #f5c542 0%, #e85d1c 60%, #ff8a3a 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              agora na Melhor versão - App RevMed
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:mt-5 md:text-base lg:mt-6 lg:text-lg"
          >
            Venha treinar com o time que mais aprova na Revalidação de Diploma Médico.
            {completoName} com aulas, cronograma, resumos, flashcards, simulados e {mentoriaName.toLowerCase()} integrada.
          </motion.p>

          {/* Mockup inline somente no mobile/tablet — segue a ordem pedida: texto → mockup → botões → prova social */}
          <div className="relative mt-4 lg:hidden">
            <div
              aria-hidden
              className="absolute -inset-6 -z-10 rounded-[2rem] blur-3xl"
              style={{
                background:
                  "radial-gradient(50% 50% at 50% 50%, color-mix(in oklab, var(--primary) 30%, transparent) 0%, transparent 70%)",
              }}
            />
            <MockupCarousel />
          </div>

          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:mt-8"
          >
            {isLogged ? (
              <Link
                to="/app"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[0_10px_40px_-12px_color-mix(in_oklab,var(--primary)_60%,transparent)] transition-transform hover:scale-[1.02] sm:w-auto md:py-3.5 md:text-base"
              >
                Começar a treinar
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 md:h-5 md:w-5" />
              </Link>
            ) : (
              <a
                href="#planos"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-[0_10px_40px_-12px_color-mix(in_oklab,var(--primary)_60%,transparent)] transition-transform hover:scale-[1.02] sm:w-auto md:py-3.5 md:text-base"
              >
                Começar a treinar
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 md:h-5 md:w-5" />
              </a>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 text-[0.7rem] text-muted-foreground md:mt-8 md:gap-x-6 md:text-xs"
          >
            <div className="flex -space-x-2">
              {[avatar1, avatar2, avatar3, avatar4].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  width={28}
                  height={28}
                  loading="eager"
                  decoding="async"
                  className="h-7 w-7 rounded-full border-2 border-background object-cover md:h-8 md:w-8"
                />
              ))}
            </div>
            <span>
              <span className="font-bold text-foreground">+ 1.200 médicos</span>{" "}
              treinando na plataforma
            </span>
            <span className="hidden h-6 w-px bg-border md:block" />
            <span>
              <span className="font-bold text-foreground">87%</span> de aprovação na 25.1
            </span>
            <span className="hidden h-6 w-px bg-border md:block" />
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-mint" />
              <span className="font-bold text-foreground">Sala estável</span> mesmo com a turma cheia
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative hidden lg:col-span-6 lg:order-1 lg:flex"
        >
          <div className="relative flex w-full items-stretch">
            <div
              aria-hidden
              className="absolute -inset-8 -z-10 rounded-[3rem] blur-3xl"
              style={{
                background:
                  "radial-gradient(50% 50% at 50% 50%, color-mix(in oklab, var(--primary) 35%, transparent) 0%, transparent 70%)",
              }}
            />
            <MockupCarousel />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ----------------------------- MARQUEE ----------------------------- */

function MockupCarousel() {
  // Front carousel: dashboard ↔ checklists
  const frontSlides = [
    { src: mockupDashboard, alt: "Dashboard REVMED com progresso real do candidato", label: "Dashboard" },
    { src: mockupChecklists, alt: "Banco de checklists oficiais REVMED para Revalida", label: "Checklists" },
  ];
  // Back carousel: flashcards ↔ resumos
  const backSlides = [
    { src: mockupFlashcards, alt: "Banco de flashcards REVMED com revisão espaçada", label: "Flashcards" },
    { src: mockupResumos, alt: "Banco de resumos REVMED com conteúdo prático", label: "Resumos" },
  ];
  const [iFront, setIFront] = useState(0);
  const [iBack, setIBack] = useState(0);
  useEffect(() => {
    const tF = setInterval(() => setIFront((v) => (v + 1) % frontSlides.length), 4500);
    const tB = setInterval(() => setIBack((v) => (v + 1) % backSlides.length), 5200);
    return () => {
      clearInterval(tF);
      clearInterval(tB);
    };
  }, [frontSlides.length, backSlides.length]);

  // Pré-carrega e decodifica todas as imagens uma única vez para evitar flash preto
  useEffect(() => {
    [...frontSlides, ...backSlides].forEach((s) => {
      const img = new Image();
      img.src = s.src;
      if (typeof img.decode === "function") {
        img.decode().catch(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full min-h-[420px] sm:min-h-[480px] lg:min-h-[640px]">
      <motion.div
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="absolute -left-3 top-4 z-30 hidden rounded-2xl border border-border bg-background/90 px-4 py-3 shadow-elegant backdrop-blur-xl md:block"
      >
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Aprovação 25.1
        </div>
        <div className="font-display text-2xl font-black text-primary">87%</div>
      </motion.div>

      <Tilt className="absolute right-0 top-4 z-10 w-[78%] lg:top-10 lg:w-[72%]" max={4} scale={1.0}>
        <div className="relative aspect-[16/10] rotate-[4deg] overflow-hidden rounded-2xl border border-border/70 bg-[#0a0a0a] opacity-70 shadow-2xl ring-1 ring-white/[0.04]">
          {/* Barra do navegador também no mockup de trás */}
          <div className="flex items-center gap-1.5 border-b border-border/60 bg-card/95 px-3 py-2 backdrop-blur-xl">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <div className="ml-3 hidden flex-1 items-center justify-center sm:flex">
              <span className="rounded-md bg-background/60 px-3 py-0.5 text-[10px] font-medium text-muted-foreground">
                revmed.app.br / {backSlides[iBack].label.toLowerCase()}
              </span>
            </div>
          </div>
          <div className="relative h-[calc(100%-30px)] w-full bg-[#0a0a0a]">
            {backSlides.map((s, k) => (
              <motion.img
                key={k}
                src={s.src}
                alt=""
                aria-hidden
                draggable={false}
                loading="eager"
                decoding="sync"
                fetchPriority={k === 0 ? "high" : "low"}
                initial={false}
                animate={{ opacity: k === iBack ? 1 : 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 h-full w-full select-none object-contain"
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-background/40 via-transparent to-transparent" />
        </div>
      </Tilt>

      <Tilt className="absolute left-0 bottom-6 z-20 w-[92%] lg:bottom-16 lg:w-[88%]" max={7} scale={1.015}>
        <div className="relative aspect-[16/10] -rotate-[2deg] overflow-hidden rounded-2xl border border-border bg-[#0a0a0a] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.06]">
          <div className="flex items-center gap-1.5 border-b border-border/60 bg-card/95 px-3 py-2 backdrop-blur-xl">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <div className="ml-3 hidden flex-1 items-center justify-center sm:flex">
              <span className="rounded-md bg-background/60 px-3 py-0.5 text-[10px] font-medium text-muted-foreground">
                revmed.app.br / {frontSlides[iFront].label.toLowerCase()}
              </span>
            </div>
          </div>
          <div className="relative h-[calc(100%-30px)] w-full bg-[#0a0a0a]">
            {frontSlides.map((s, k) => (
              <motion.img
                key={k}
                src={s.src}
                alt={s.alt}
                width={1600}
                height={1000}
                draggable={false}
                loading="eager"
                decoding="sync"
                fetchPriority={k === 0 ? "high" : "low"}
                initial={false}
                animate={{ opacity: k === iFront ? 1 : 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 h-full w-full select-none object-contain"
              />
            ))}
          </div>
        </div>
      </Tilt>

      <motion.div
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.85 }}
        className="absolute -right-2 bottom-4 z-30 hidden rounded-2xl border border-border bg-background/90 px-4 py-3 shadow-elegant backdrop-blur-xl md:block"
      >
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Simulações
        </div>
        <div className="font-display text-2xl font-black text-mint">+ 320</div>
      </motion.div>

    </div>
  );
}

/* ----------------------------- MARQUEE ----------------------------- */

function MarqueeStrip() {
  const items = [
    "Sala ao vivo com vídeo integrado",
    "Cronômetro sincronizado no servidor",
    "Checklist 3 níveis igual ao INEP",
    "Impressos em tempo real",
    "Flashcards inteligentes que voltam na hora certa",
    "Resumos cruzados por tema",
    "Patentes, troféus e ranking",
    "Heatmap de 84 dias e streak",
    "Amigos online, DMs e comunidade",
    "Nota de corte INEP no painel",
  ];
  return (
    <section className="border-y border-border/60 bg-card/40 py-5">
      <div className="flex overflow-hidden">
        <div className="flex shrink-0 animate-marquee gap-12 whitespace-nowrap px-6 text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {[...items, ...items, ...items].map((it, i) => (
            <span key={i} className="flex items-center gap-3">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              {it}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- MANIFESTO ----------------------------- */

const PILLARS = [
  {
    n: "01",
    icon: Target,
    title: "Sala igual à da prova.",
    body:
      "Candidato e ator-avaliador na mesma chamada de vídeo. Cronômetro travado no servidor, impressos entregues em tempo real e checklist 3 níveis (adequado, parcial, inadequado) marcado pelo avaliador igual ao INEP.",
  },
  {
    n: "02",
    icon: Compass,
    title: "Sabe sua nota de corte.",
    body:
      "Cada estação, flashcard e simulado vira número: nota por critério, nota de corte do Revalida 25.2, evolução por área, tempo médio e histórico completo. Você sabe se hoje passaria.",
  },
  {
    n: "03",
    icon: Layers,
    title: "Só revisa o que você esquece.",
    body:
      "Os flashcards voltam no momento certo — quando o conteúdo está prestes a sair da sua cabeça. Resumos cruzados te levam direto do card pro tema. Patente e troféu por especialidade pra você ver o que ainda falta dominar.",
  },
];

function Manifesto() {
  return (
    <section id="manifesto" className="relative py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-8 md:gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Método
            </p>
            <h2 className="mt-3 font-display text-[1.85rem] font-black leading-[1.05] tracking-[-0.03em] md:mt-4 md:text-4xl lg:text-5xl">
              Aprovação não é sorte. É <em className="not-italic text-primary">método</em>.
            </h2>
            <p className="mt-4 text-sm text-muted-foreground md:mt-6 md:text-base lg:text-lg">
              O Revalida não recompensa quem estudou mais — recompensa quem
              treinou certo. A REVMED foi feita pra você praticar conduta,
              marcar checklist como avaliador e medir o próprio progresso, no
              tempo que a sua rotina permite.
            </p>
          </div>
          <div className="lg:col-span-8">
            <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border">
              {PILLARS.map((p) => (
                <motion.article
                  key={p.n}
                  initial={{ opacity: 1, y: 0 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5 }}
                  className="group relative grid grid-cols-[auto_1fr_auto] items-start gap-4 bg-card p-4 sm:gap-5 sm:p-5 md:p-6"
                >
                  <div className="font-display text-xl font-black text-primary sm:text-2xl md:text-3xl">
                    {p.n}
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold tracking-tight sm:text-lg md:text-xl">
                      {p.title}
                    </h3>
                    <p className="mt-1.5 max-w-xl text-[0.8rem] text-muted-foreground sm:text-sm">
                      {p.body}
                    </p>
                  </div>
                  <p.icon className="h-4 w-4 text-primary opacity-60 transition-opacity group-hover:opacity-100 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- PLATAFORMA ----------------------------- */

function Plataforma() {
  return (
    <section id="plataforma" className="relative py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 md:gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Plataforma
            </p>
            <h2 className="mt-3 font-display text-[1.85rem] font-black leading-[1.05] tracking-[-0.03em] md:mt-4 md:text-4xl lg:text-5xl">
              Tudo que o INEP cobra. E tudo que ajuda a treinar.
            </h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground md:text-[0.95rem] lg:text-base">
            Sala ao vivo com vídeo, checklist 3 níveis, flashcards inteligentes,
            resumos, simulados, comunidade, ranking e gamificação. Tudo
            integrado, conectado ao seu painel de desempenho e à nota de
            corte do INEP.
          </p>
        </div>

        <div className="mt-8 grid auto-rows-[minmax(160px,_auto)] gap-3 md:mt-12 md:auto-rows-[minmax(180px,_auto)] md:grid-cols-2 md:gap-4 lg:grid-cols-6">
          <FeatureCard
            className="md:col-span-2 lg:col-span-4"
            tag="Sala ao vivo"
            title="Candidato + ator-avaliador, com vídeo integrado"
            desc="Chamada de vídeo, cronômetro travado no servidor, impressos (ECG, exame, RX) entregues em tempo real, intro de 30s e roteiro padronizado. Os dois papéis na mesma sala, igual ao INEP."
            accent="primary"
          />
          <FeatureCard
            className="md:col-span-2 lg:col-span-2"
            tag="Checklist 3 níveis"
            title="Sua nota sai na hora"
            desc="Adequado, parcial, inadequado — igual ao INEP. Você vê critério por critério assim que a estação fecha."
          />
          <FeatureCard
            className="md:col-span-1 lg:col-span-2"
            tag="Flashcards inteligentes"
            title="Só revisa o que tá esquecendo"
            desc="Os cards voltam no momento certo, quando você ainda está esquecendo. Dashboard por área e deck pronto a partir de cada estação."
          />
          <FeatureCard
            className="md:col-span-1 lg:col-span-2"
            tag="Resumos"
            title="Cruzados por tema"
            desc="Resumo estruturado com link pro flashcard e pra estação do mesmo tema. Estudo conectado, sem manual de 800 páginas."
            accent="mint"
          />
          <FeatureCard
            className="md:col-span-2 lg:col-span-2"
            tag="Progresso & gamificação"
            title="Patentes, troféus e nota de corte"
            desc="Patente de Interno a Mestre, troféu por especialidade, heatmap de 84 dias com streak e sua nota comparada ao corte do Revalida 25.2."
          />
          <FeatureCard
            className="md:col-span-2 lg:col-span-3"
            tag="Comunidade"
            title="Amigos online, DMs e feed"
            desc="Veja quem está logado agora, chame pra estação direto no chat, troque caso clínico no feed e receba convites por notificação em tempo real."
          />
          <FeatureCard
            className="md:col-span-2 lg:col-span-3"
            tag="Simulados & histórico"
            title="Cronograma e replay de cada estação"
            desc="Monte simulados cronometrados, acompanhe seu cronograma de estudos e revise o histórico de cada simulação com nota e tempo por critério."
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  tag,
  title,
  desc,
  className = "",
  accent = "muted",
}: {
  tag: string;
  title: string;
  desc: string;
  className?: string;
  accent?: "primary" | "mint" | "muted";
}) {
  const accentRing =
    accent === "primary"
      ? "ring-1 ring-primary/40 bg-gradient-to-br from-primary/15 via-card to-card"
      : accent === "mint"
        ? "ring-1 ring-mint/40 bg-gradient-to-br from-mint/15 via-card to-card"
        : "ring-1 ring-border bg-card";
  return (
    <motion.div
      initial={{ opacity: 1, y: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 transition-transform hover:-translate-y-1 sm:rounded-3xl sm:p-6 md:p-8 ${accentRing} ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-background/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          {tag}
        </span>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary sm:h-5 sm:w-5" />
      </div>
      <div className="mt-6 sm:mt-8">
        <h3 className="font-display text-lg font-bold leading-tight tracking-tight sm:text-xl md:text-2xl">
          {title}
        </h3>
        <p className="mt-2 text-[0.8rem] text-muted-foreground sm:text-sm md:text-base">
          {desc}
        </p>
      </div>
    </motion.div>
  );
}

/* ----------------------------- RESULTADOS ----------------------------- */

const NUMBERS = [
  { v: "+ 320", l: "Estações ao vivo já realizadas" },
  { v: "+ 1.2k", l: "Médicos treinando na plataforma" },
  { v: "87%", l: "Aprovação dos alunos na 25.1" },
  { v: "10min", l: "Cronômetro INEP em cada estação" },
];


function Resultados() {
  return (
    <section
      id="resultados"
      className="relative border-y border-border/60 bg-card/30 py-16 md:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {NUMBERS.map((n, i) => (
            <motion.div
              key={n.l}
              initial={{ opacity: 1, y: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-2xl border border-border bg-background p-5 sm:rounded-3xl sm:p-6 md:p-7"
            >
              <div className="font-display text-3xl font-black tracking-[-0.03em] text-primary sm:text-4xl md:text-5xl lg:text-6xl">
                {n.v}
              </div>
              <div className="mt-2 text-xs font-medium text-muted-foreground sm:mt-3 sm:text-sm">
                {n.l}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- MENTORIA ----------------------------- */

const MENTORIA_BENEFITS = [
  "Acesso integral à plataforma REVMED",
  "20 encontros práticos em grupo de 5",
  "10 encontros nas 5 grandes áreas",
  "6 sessões com psicólogo do programa",
  "Cronograma de estudos personalizado",
  "WhatsApp direto com o mentor",
];

function Mentoria() {
  return (
    <section id="mentoria" className="relative py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid items-stretch gap-8 md:gap-10 lg:grid-cols-12">
          <div className="text-center lg:col-span-5 lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Mentoria (opcional)
            </p>
            <h2 className="mt-3 font-display text-[1.55rem] font-black leading-[1.08] tracking-[-0.03em] sm:text-[1.75rem] md:mt-4 md:text-[2rem] lg:text-5xl">
              Quer alguém do seu lado?{" "}
              <span className="whitespace-nowrap text-primary">Tem mentoria.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground md:mt-6 md:text-base lg:mx-0 lg:max-w-none lg:text-lg">
              A plataforma já te dá tudo pra treinar sozinho. Mas quem prefere
              um mentor por perto, com Turmas Programadas de 5 pessoas, encontros ao vivo e
              psicólogo no programa, pode entrar na mentoria — um plus à parte,
              em turmas pequenas que fecham rápido.
            </p>
            <Link
              to="/cadastro"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02] md:mt-8 md:px-6 md:py-3.5 md:text-base"
            >
              Saber mais da mentoria
              <ArrowUpRight className="h-4 w-4 md:h-5 md:w-5" />
            </Link>
          </div>
          <div className="relative lg:col-span-7">
            <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:rounded-[2rem] sm:p-8 md:p-8 lg:p-10">
              <div
                aria-hidden
                className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl"
              />
              <div className="relative flex h-full flex-col justify-center">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Sparkles className="h-4 w-4" /> Programa completo
                </div>
                <h3 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl md:mt-4 md:text-3xl lg:text-4xl">
                  O que vem na mentoria
                </h3>
                <ul className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
                  {MENTORIA_BENEFITS.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[0.85rem] sm:text-sm md:text-base">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- INVESTIMENTO ----------------------------- */

const WHATSAPP_URL =
  "https://wa.me/5521987860985?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20a%20Mentoria%20REVMED.";

type Plan = {
  slug: string;
  name: string;

  tagline: string;
  price: string;
  cadence: string;
  installments?: string;
  oldPrice?: string;
  discountTag?: string;
  desc: string;
  features: string[];
  cta: string;
  ctaType: "internal" | "whatsapp";
  highlight: boolean;
  icon: typeof Drama;
  accent: string;
};

const PLANS: Plan[] = [
  {
    slug: "ator",
    name: "Plano Ator",
    tagline: "Treine como paciente",
    price: "R$ 147,00",
    cadence: "até o dia da prova",
    installments: "ou 10x de R$ 14,70 sem juros",
    desc: "Para quem quer praticar estações como ator simulando paciente. Acesso ao módulo de simulações ao vivo.",
    features: [
      "Iniciar sessões como ator",
      "Roteiros de pacientes padronizados",
      "Feedback do candidato avaliado",
      "Histórico das sessões realizadas",
    ],
    cta: "Entrar como ator",
    ctaType: "internal",
    highlight: false,
    icon: Drama,
    accent: "from-mint/20",
  },
  {
    slug: "completo",
    name: "Plano Plataforma",
    tagline: "App REVMED completo",
    price: "R$ 597,00",
    cadence: "até o dia da prova",
    installments: "ou 10x de R$ 59,70 sem juros",
    oldPrice: "R$ 897,00",
    discountTag: "33% OFF",
    desc: "Acesso total à plataforma REVMED — checklists, flashcards, simulados cronometrados e banco de resumos.",
    features: [
      "Tudo do plano Ator",
      "Banco completo de estações INEP",
      "Flashcards com revisão espaçada",
      "Simulados cronometrados",
      "Banco de resumos práticos",
      "Comunidade de candidatos",
    ],
    cta: "Começar agora",
    ctaType: "internal",
    highlight: true,
    icon: Crown,
    accent: "from-primary/25",
  },
  {
    slug: "mentoria",
    name: "Mentoria 1:5",

    tagline: "Acompanhamento humano + plataforma",
    price: "Sob consulta",
    cadence: "turmas reduzidas",
    installments: "Parcelamos em até 10x sem juros no cartão",
    desc: "Programa completo com mentor presente, Turmas Programadas de 5 pessoas, psicólogo no time, WhatsApp 24h e plataforma inclusa.",
    features: [
      "Tudo do plano Plataforma",
      "20 encontros práticos ao vivo",
      "10 encontros extras nas grandes áreas",
      "6 sessões com psicólogo do programa",
      "Grupo geral + comunidade exclusiva",
      "WhatsApp 24h com acesso direto ao mentor",
      "Cronograma personalizado de estudos",
    ],
    cta: "Falar no WhatsApp",
    ctaType: "whatsapp",
    highlight: false,
    icon: GraduationCap,
    accent: "from-amber-500/20",
  },
];


function Investimento({
  isLogged,
  onChoosePlan,
  dbPlans,
  loadingPlans,
}: {
  isLogged: boolean;
  onChoosePlan: (p: SignupModalPlan) => void;
  dbPlans: any[];
  loadingPlans: boolean;
}) {
  const BRL_CURRENCY = "BRL";
  const allPlans = useMemo(() => {
    // Se não houver planos no banco, usamos os estáticos como fallback
    if (!dbPlans || dbPlans.length === 0) {
      return PLANS;
    }

    // Mapeamos os planos estáticos para sobrescrever com dados do banco
    const merged = PLANS.map(staticPlan => {
      const dbPlan = dbPlans.find(p => p.slug === staticPlan.slug);
      
      if (!dbPlan) return staticPlan;
      
      const priceValue = dbPlan.price_cents / 100;
      const formattedPrice = dbPlan.price_cents > 0 
        ? priceValue.toLocaleString("pt-BR", { style: "currency", currency: BRL_CURRENCY })
        : (staticPlan.slug === "mentoria" ? "Sob consulta" : "R$ 0,00");

      // Calculamos o desconto automaticamente se houver preço antigo
      let calculatedDiscount = dbPlan.discount_tag;
      if (dbPlan.old_price_cents && dbPlan.old_price_cents > dbPlan.price_cents) {
        const discountPercent = Math.round(100 - (dbPlan.price_cents * 100) / dbPlan.old_price_cents);
        calculatedDiscount = `${discountPercent}% OFF`;
      }

      return {
        ...staticPlan,
        name: dbPlan.name || staticPlan.name,
        tagline: dbPlan.tagline || staticPlan.tagline,
        price: formattedPrice,
        priceCents: dbPlan.price_cents,
        oldPrice: dbPlan.old_price_cents ? (dbPlan.old_price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: BRL_CURRENCY }) : undefined,
        discountTag: calculatedDiscount || undefined,
        cta: dbPlan.cta_text || staticPlan.cta,
        highlight: dbPlan.highlight ?? staticPlan.highlight,
        accent: dbPlan.accent_color || staticPlan.accent,
        desc: dbPlan.description || staticPlan.desc,
        features: Array.isArray(dbPlan.features) && dbPlan.features.length > 0 ? dbPlan.features : staticPlan.features,
        installments: dbPlan.price_cents > 0 
          ? `ou 10x de ${(priceValue / 10).toLocaleString("pt-BR", { style: "currency", currency: BRL_CURRENCY })} sem juros` 
          : staticPlan.installments
      };
    });

    // Adicionamos planos extras que existam no banco mas não no array estático
    const additional = dbPlans
      .filter(dbPlan => !PLANS.some(staticPlan => staticPlan.slug === dbPlan.slug))
      .map(dbPlan => {
        const priceValue = dbPlan.price_cents / 100;
        
        // Calculamos o desconto automaticamente se houver preço antigo
        let calculatedDiscount = dbPlan.discount_tag;
        if (dbPlan.old_price_cents && dbPlan.old_price_cents > dbPlan.price_cents) {
          const discountPercent = Math.round(100 - (dbPlan.price_cents * 100) / dbPlan.old_price_cents);
          calculatedDiscount = `${discountPercent}% OFF`;
        }

        return {
          slug: dbPlan.slug,
          name: dbPlan.name,
          tagline: dbPlan.tagline || "Novo plano",
          price: priceValue > 0 ? priceValue.toLocaleString("pt-BR", { style: "currency", currency: BRL_CURRENCY }) : "Grátis",
          priceCents: dbPlan.price_cents,
          oldPrice: dbPlan.old_price_cents ? (dbPlan.old_price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: BRL_CURRENCY }) : undefined,
          discountTag: calculatedDiscount || undefined,
          cta: dbPlan.cta_text || "Começar agora",
          ctaType: "internal" as const,
          highlight: dbPlan.highlight,
          accent: dbPlan.accent_color || "from-primary/20",
          desc: dbPlan.description || "",
          features: Array.isArray(dbPlan.features) ? dbPlan.features : [],
          icon: dbPlan.slug === "completo" ? Crown : dbPlan.slug === "ator" ? Drama : GraduationCap,
          installments: dbPlan.price_cents > 0 ? `ou 10x de ${(priceValue / 10).toLocaleString("pt-BR", { style: "currency", currency: BRL_CURRENCY })} sem juros` : undefined,
          cadence: "acesso vitalício" 
        };
      });

    return [...merged, ...additional];
  }, [dbPlans]);

  return (
    <section
      id="investimento"
      className="relative border-y border-border/60 bg-card/30 py-16 md:py-24 lg:py-32"
    >

      <span id="planos" className="absolute -top-20" aria-hidden />
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Planos
          </p>
          <h2 className="mt-3 font-display text-[1.85rem] font-black leading-[1.05] tracking-[-0.03em] md:mt-4 md:text-4xl lg:text-5xl">
            Escolha como você quer treinar.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground md:mt-5 md:text-base lg:text-lg">
            {dbPlans.length > 0 ? dbPlans.map(p => p.name).join(", ") : "Plano Ator, Plano Plataforma ou Mentoria 1:5"} com acompanhamento humano.
            Pague uma vez e use até o dia da prova — <span className="font-semibold text-foreground">parcelamos em até 10x sem juros no cartão</span>.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:mt-12 md:gap-6 lg:grid-cols-3 lg:mt-14 lg:gap-7">
          {loadingPlans ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[500px] animate-pulse rounded-3xl border border-border/50 bg-card/20" />
            ))
          ) : allPlans.filter((p: any) => dbPlans.some((db: any) => db.slug === p.slug)).map((p: any, idx: number) => {


            const Icon = p.icon;
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 1, y: 0 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: idx * 0.08 }}
                className={`group relative flex flex-col overflow-hidden rounded-3xl p-6 sm:p-7 md:p-8 lg:p-9 transition-all duration-300 ${
                  p.highlight
                    ? "border-2 border-primary/80 bg-gradient-to-br from-primary/[0.15] via-background to-background shadow-[0_40px_100px_-30px_rgba(255,140,0,0.4)] lg:scale-[1.06] z-10"
                    : "border border-border/80 bg-background/80 backdrop-blur-sm hover:border-border"
                }`}
              >
                {/* Glow de fundo */}
                <div
                  className={`pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-b ${p.highlight ? 'from-primary/40' : p.accent} to-transparent opacity-80 blur-3xl`}
                />

                {p.highlight && (
                  <div className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-[0_8px_20px_rgba(255,140,0,0.5)] sm:right-6 sm:top-6 sm:px-4 sm:text-[11px] animate-pulse">
                    Recomendado
                  </div>
                )}

                <div className="relative">
                  <div
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl sm:h-12 sm:w-12 transition-transform duration-300 group-hover:scale-110 ${
                      p.highlight
                        ? "bg-primary text-primary-foreground shadow-[0_0_25px_rgba(255,140,0,0.6)]"
                        : "bg-muted/60 text-foreground ring-1 ring-border"
                    }`}
                  >
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.2} />
                  </div>

                  <h3 className="mt-4 font-display text-xl font-black tracking-[-0.02em] sm:mt-5 sm:text-2xl">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
                    {p.tagline}
                  </p>
                  <p className="mt-3 text-[0.8rem] leading-relaxed text-muted-foreground sm:mt-4 sm:text-sm">
                    {p.desc}
                  </p>

                  <div className="mt-5 flex flex-wrap items-end gap-1.5 sm:mt-6">
                    {p.oldPrice && (
                      <span className="mb-1.5 mr-2 text-sm text-muted-foreground line-through">
                        {p.oldPrice}
                      </span>
                    )}
                    <span className="font-display text-4xl font-black leading-none tracking-[-0.04em] sm:text-[2.75rem] md:text-4xl lg:text-5xl">
                      {p.price}
                    </span>
                    {p.cadence && (
                      <span className="mb-1.5 text-xs text-muted-foreground sm:text-sm">
                        {p.cadence}
                      </span>
                    )}

                    {p.discountTag && (
                      <span className="mb-1 ml-1 rounded-full bg-mint/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mint">
                        {p.discountTag}
                      </span>
                    )}
                  </div>
                  {p.installments && (
                    <p className={`mt-2 text-[0.75rem] font-semibold sm:text-sm ${p.highlight ? "text-primary brightness-125" : "text-primary"}`}>
                      {p.installments}
                    </p>
                  )}

                  <div className="my-5 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent sm:my-7" />

                  <ul className="space-y-2.5 sm:space-y-3">
                    {p.features.map((f: string) => (
                      <li key={f} className="flex items-start gap-3 text-[0.8rem] sm:text-sm">
                        <span
                          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                            p.highlight
                              ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(255,140,0,0.5)] scale-110"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <Check className="h-3 w-3" strokeWidth={4} />
                        </span>
                        <span className="leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative mt-auto pt-7 sm:pt-9">
                  {p.ctaType === "whatsapp" ? (
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-white shadow-[0_15px_40px_-10px_rgba(37,211,102,0.55)] transition-transform hover:scale-[1.02] sm:px-6 sm:py-3.5 sm:text-base"
                    >
                      <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.4} />
                      {p.cta}
                    </a>
                  ) : isLogged ? (
                    <Link
                      to="/app"
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-transform hover:scale-[1.02] sm:px-6 sm:py-3.5 sm:text-base ${
                        p.highlight
                          ? "bg-primary text-primary-foreground shadow-[0_10px_30px_-5px_rgba(255,140,0,0.5)] hover:shadow-[0_15px_40px_-5px_rgba(255,140,0,0.6)]"
                          : "border border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      {p.cta}
                      <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        onChoosePlan({
                          slug: p.slug as SignupModalPlan["slug"],
                          name: p.name,
                          price: p.price,
                          priceCents: (p as any).priceCents ?? 0,
                          cadence: p.cadence || "",
                        })

                      }

                      className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-all duration-300 hover:scale-[1.03] sm:px-6 sm:py-3.5 sm:text-base ${
                        p.highlight
                          ? "bg-primary text-primary-foreground shadow-[0_15px_35px_-5px_rgba(255,140,0,0.5)] hover:shadow-[0_20px_45px_-5px_rgba(255,140,0,0.6)]"
                          : "border border-border bg-card text-foreground hover:bg-muted shadow-sm"
                      }`}
                    >
                      {p.cta}
                      <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[0.7rem] text-muted-foreground sm:mt-10 sm:text-xs">
          Cancela quando quiser. 7 dias de garantia nos planos Ator e Plataforma.
        </p>
      </div>
    </section>
  );
}

/* ----------------------------- FAQ ----------------------------- */

/* ----------------------------- SOBRE O FUNDADOR ----------------------------- */

const FUNDADOR_SLIDES = [
  { icon: Stethoscope, title: "Trajetória médica", body: "Médico com anos de atuação clínica e dedicação à formação de novos médicos no Brasil.", photo: anoar1, objectPos: "center 20%" },
  { icon: GraduationCap, title: "Especialista em Revalida", body: "Referência na preparação para a Revalidação de Diploma Médico, com método próprio de treino prático.", photo: anoar2, objectPos: "center 20%" },
  { icon: Award, title: "Conquistas", body: "Milhares de médicos aprovados em diferentes edições do Revalida INEP através das mentorias REVMED.", photo: anoar3, objectPos: "center 25%" },
  { icon: Sparkles, title: "Missão REVMED", body: "Levar a primeira e maior mentoria online do Brasil a quem sonha em revalidar seu diploma — com método, acompanhamento e tecnologia.", photo: anoar4, objectPos: "center 8%" },
];

function SobreFundador() {
  const [idx, setIdx] = useState(0);
  const slide = FUNDADOR_SLIDES[idx];
  const Icon = slide.icon;

  // Auto-advance a cada 6s
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % FUNDADOR_SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="fundador" className="relative overflow-hidden py-16 md:py-24 lg:py-32">
      {/* Glow de fundo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid items-center gap-10 md:gap-14 lg:grid-cols-12">
          {/* COLUNA FOTO */}
          <div className="lg:col-span-5">
            <div className="relative">
              {/* Moldura com gradiente */}
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/20 via-background to-background shadow-[0_30px_80px_-20px_rgba(255,140,0,0.35)]">
                {FUNDADOR_SLIDES.map((s, i) => (
                  <motion.img
                    key={i}
                    src={s.photo}
                    alt={`Dr. Anoar Jezini — ${s.title}`}
                    loading="lazy"
                    initial={false}
                    animate={{
                      opacity: i === idx ? 1 : 0,
                      scale: i === idx ? 1 : 1.05,
                    }}
                    transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
                    style={{ objectPosition: s.objectPos }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ))}
                {/* Vinheta inferior */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background via-background/60 to-transparent" />

                {/* Selo flutuante */}
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-primary/40 bg-background/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary backdrop-blur-md">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  Fundador REVMED
                </div>

                {/* Assinatura inferior */}
                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-black tracking-tight text-foreground sm:text-xl">
                      Dr. Anoar Jezini
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/90">
                      CRM · Mentor-chefe
                    </p>
                  </div>
                </div>
              </div>

              {/* Thumbs */}
              <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
                {FUNDADOR_SLIDES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    aria-label={`Ver ${s.title}`}
                    className={`relative aspect-square overflow-hidden rounded-xl border transition-all ${
                      i === idx
                        ? "border-primary shadow-[0_0_0_2px_rgba(255,140,0,0.35)]"
                        : "border-border opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={s.photo} alt="" style={{ objectPosition: s.objectPos }} className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* COLUNA TEXTO */}
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Quem está por trás</p>
            <h2 className="mt-3 font-display text-[1.85rem] font-black leading-[1.05] tracking-[-0.03em] md:mt-4 md:text-4xl lg:text-5xl">
              Quem é o <span className="text-primary">Dr. Anoar Jezini?</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
              Minha trajetória com a revalidação médica começou através da própria vivência das dificuldades, medos e desafios que o processo do Revalida impõe.
              <br /><br />
              <strong className="font-bold text-foreground">Ao invés de transformar isso em desistência, transformei em propósito.</strong>
              <br /><br />
              Sou <strong className="font-bold text-foreground">médico, fisioterapeuta e faixa preta de Jiu-Jitsu</strong>, natural de Manaus e atualmente residente no Rio de Janeiro.
              <br /><br />
              <strong className="font-bold text-foreground">Há 4 anos</strong> atuo diretamente com preparação para o Revalida INEP, construindo uma metodologia focada em prática, estratégia e preparo emocional.
              <br /><br />
              Foi assim que nasceram a <strong className="font-bold text-foreground">RevMed Mentoria</strong> e o <strong className="font-bold text-foreground">Revalida360</strong>, projetos que já realizaram <strong className="font-bold text-foreground">6 grandes edições</strong> e ajudaram na revalidação de <strong className="font-bold text-foreground">mais de 1200 diplomas médicos</strong>.
              <br /><br />
              Mais do que ensinar Medicina, nossa missão é <strong className="font-bold text-foreground">devolver esperança, direção e confiança</strong> para médicos que sonham em exercer sua profissão no Brasil.
              <br /><br />
              Hoje, a RevMed representa muito mais que uma mentoria:
              <br /><br />
              <strong className="font-bold text-foreground">é uma família construída através de propósito, trabalho, fé e transformação de vidas.</strong>
            </p>

            {/* Cards de stats */}
            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { n: "+1.000", l: "Aprovados" },
                { n: "10+", l: "Anos de mentoria" },
                { n: "1ª", l: "Mentoria online do Brasil" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl border border-border bg-card/60 p-3 text-center backdrop-blur sm:p-4">
                  <div className="font-display text-xl font-black text-primary sm:text-2xl">{s.n}</div>
                  <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Slide ativo */}
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="mt-6 rounded-3xl border border-border bg-card/80 p-6 backdrop-blur md:p-8"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-lg font-bold tracking-tight sm:text-xl">{slide.title}</h3>
              </div>
              <p className="mt-4 text-sm text-muted-foreground sm:text-base">{slide.body}</p>
              <div className="mt-6 flex items-center justify-between gap-3">
                <div className="flex gap-1.5">
                  {FUNDADOR_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIdx(i)}
                      aria-label={`Slide ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-primary" : "w-4 bg-border hover:bg-primary/40"}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setIdx((idx + 1) % FUNDADOR_SLIDES.length)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/60 hover:text-primary"
                >
                  Próximo <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- VEJA A PLATAFORMA + AULÃO ----------------------------- */

function VejaPlataforma() {
  return (
    <section className="relative py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Veja por dentro</p>
          <h2 className="mt-3 font-display text-[1.85rem] font-black leading-[1.05] tracking-[-0.03em] md:mt-4 md:text-4xl lg:text-5xl">
            Conheça a plataforma e o <span className="text-primary">Aulão do Esqueleto INEP</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
            Assista ao vídeo explicativo do App REVMED e ao aulão gravado do Dr. Anoar sobre a estrutura da prova do INEP.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:mt-12 md:grid-cols-2 md:gap-6">
          {[
            { tag: "Vídeo explicativo", title: "App REVMED por dentro", desc: "Aulas, cronograma, resumos, flashcards, mentoria e acompanhamento — tudo num só lugar.", src: "/videos/app-por-dentro.mp4" },
            { tag: "Aulão gravado", title: "Esqueleto INEP — Dr. Anoar", desc: "Aprenda a lógica da prova, os principais pontos cobrados e como direcionar seus estudos com estratégia." },
          ].map((v) => (
            <div key={v.title} className="group relative overflow-hidden rounded-3xl border border-border bg-card transition-transform hover:-translate-y-1">
              <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br from-primary/20 via-card to-background">
                {v.src ? (
                  <video
                    src={v.src}
                    className="h-full w-full object-cover"
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <>
                    <PlayCircle className="h-16 w-16 text-primary/80 transition-transform group-hover:scale-110" strokeWidth={1.5} />
                    <span className="absolute bottom-3 left-3 rounded-full bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur">
                      Vídeo em breve
                    </span>
                  </>
                )}
              </div>
              <div className="p-6">
                <span className="rounded-full bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{v.tag}</span>
                <h3 className="mt-3 font-display text-lg font-bold tracking-tight sm:text-xl">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- FAQ ----------------------------- */

const FAQS = [
  {
    q: "Pra quem é a REVMED?",
    a: "Pra médicos formados fora do Brasil que vão prestar Revalida INEP. A plataforma serve tanto pra primeira quanto pra segunda fase, com foco em estação, checklist, flashcard, resumo e desempenho.",
  },
  {
    q: "A sala ao vivo trava com muita gente junto?",
    a: "Não. A chamada de vídeo usa a mesma tecnologia das plataformas de telemedicina e o cronômetro é sincronizado no servidor — todo mundo vê o mesmo tempo, mesmo com a turma inteira treinando ao mesmo tempo.",
  },
  {
    q: "Como funciona o checklist da estação?",
    a: "Igual ao do INEP: 3 níveis (adequado, parcial, inadequado) marcados pelo ator-avaliador enquanto a estação acontece. Quando o cronômetro fecha, sua nota sai na hora — critério por critério e tempo gasto em cada um.",
  },
  {
    q: "Os flashcards usam qual método?",
    a: "Revisão espaçada inteligente: os cards voltam no momento exato em que você está prestes a esquecer o conteúdo (a mesma lógica do Anki). Cada deck tem dashboard por área e pode ser gerado a partir da estação que você acabou de fazer.",
  },
  {
    q: "Tem comunidade e gamificação?",
    a: "Tem. Você vê amigos online em tempo real, troca DM, chama pra estação direto do chat, posta caso no feed da comunidade e recebe convite por notificação. Tem ainda patentes (Interno a Mestre), troféus por especialidade, ranking e heatmap de 84 dias com streak.",
  },
  {
    q: "Preciso entrar na mentoria pra usar a plataforma?",
    a: "Não. A mentoria é um plus à parte. No plano Full você tem acesso completo a estações ao vivo, checklists 3 níveis, flashcards inteligentes, resumos, simulados, comunidade e painel de desempenho — sem precisar de mentor.",
  },
  {
    q: "Tem garantia?",
    a: "Sete dias nos planos Ator e Full. Se não fizer sentido, devolvemos 100% do valor.",
  },
  {
    q: "Funciona no celular?",
    a: "Funciona em qualquer tela. A plataforma é PWA — você instala no celular e revisa flashcard, resumo e até entra na sala em qualquer lugar.",
  },
];

function Mentoria({ dbPlans }: { dbPlans: any[] }) {
  const getPlanName = (slug: string, fallback: string) => {
    const p = dbPlans?.find(x => x.slug === slug);
    return p?.name || fallback;
  };
  const mentoriaName = getPlanName('mentoria', 'Mentoria');
  const [open, setOpen] = useState<number | null>(0);
  
  const getPlanName = (slug: string, fallback: string) => {
    const p = dbPlans?.find(x => x.slug === slug);
    return p?.name || fallback;
  };

  const dynamicFaqs = useMemo(() => {
    return FAQS.map(faq => {
      let a = faq.a;
      let q = faq.q;
      
      // Replace names dynamically
      const names = [
        { slug: 'completo', fallback: 'Plano Full' },
        { slug: 'ator', fallback: 'Plano Ator' },
        { slug: 'mentoria', fallback: 'Mentoria 1:5' }
      ];

      names.forEach(({ slug, fallback }) => {
        const dynamicName = getPlanName(slug, fallback);
        // Usamos regex global para substituir todas as ocorrências
        const regex = new RegExp(fallback, 'g');
        a = a.replace(regex, dynamicName);
        q = q.replace(regex, dynamicName);
      });

      return { ...faq, q, a };
    });
  }, [dbPlans]);

  return (
    <section className="py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-5 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Dúvidas Frequentes
        </p>
        <h2 className="mt-3 font-display text-[1.85rem] font-black leading-[1.05] tracking-[-0.03em] md:mt-4 md:text-4xl lg:text-5xl">
          Tirou a dúvida? <span className="text-primary">Vem com a gente.</span>
        </h2>
        <div className="mt-8 divide-y divide-border border-y border-border md:mt-10">
          {dynamicFaqs.map((f, i) => (
            <div key={f.q}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-3 py-4 text-left sm:gap-4 sm:py-5"
              >
                <span className="font-display text-base font-semibold sm:text-lg md:text-xl">
                  {f.q}
                </span>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-primary transition-transform sm:h-8 sm:w-8 ${
                    open === i ? "rotate-45 bg-primary text-primary-foreground" : ""
                  }`}
                >
                  +
                </span>
              </button>
              {open === i && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="pb-5 text-sm text-muted-foreground sm:pb-6 sm:text-base"
                >
                  {f.a}
                </motion.p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl border border-mint/30 bg-mint/[0.06] p-6 text-center md:mt-12 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-mint">
            Ainda com dúvida?
          </p>
          <h3 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            Entra no nosso grupo do WhatsApp
          </h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Fala direto com nosso time, tira dúvidas em tempo real e ainda conhece a comunidade REVMED por dentro.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-white shadow-[0_15px_40px_-10px_rgba(37,211,102,0.55)] transition-transform hover:scale-[1.02] sm:px-6 sm:py-3.5 sm:text-base"
          >
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.4} />
            Entrar no grupo do WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- FINAL CTA ----------------------------- */

function FinalCTA({ isLogged }: { isLogged: boolean }) {
  return (
    <section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 70% at 50% 50%, color-mix(in oklab, var(--primary) 30%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-3xl px-5 text-center md:px-8">
        <h2 className="font-display text-3xl font-black leading-[1.02] tracking-[-0.03em] sm:text-4xl md:text-5xl lg:text-6xl">
          Treine como o INEP <br />
          <span className="text-primary">cobra na prova.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:mt-6 sm:text-base lg:text-lg">
          Sala ao vivo com vídeo, checklist 3 níveis, flashcards inteligentes,
          resumos, simulados, comunidade e gamificação. Tudo num só lugar,
          até o dia da prova.
        </p>
        {isLogged ? (
          <Link
            to="/app"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_20px_60px_-20px_color-mix(in_oklab,var(--primary)_70%,transparent)] transition-transform hover:scale-[1.03] sm:mt-10 sm:px-7 sm:py-4 sm:text-base"
          >
            Entrar na plataforma
            <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </Link>
        ) : (
          <a
            href="#planos"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_20px_60px_-20px_color-mix(in_oklab,var(--primary)_70%,transparent)] transition-transform hover:scale-[1.03] sm:mt-10 sm:px-7 sm:py-4 sm:text-base"
          >
            Escolher meu plano
            <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </a>
        )}
      </div>
    </section>
  );
}

/* ----------------------------- FOOTER ----------------------------- */

function Footer() {
  const { settings } = useSiteSettings();
  const phone1 = settings?.contact_phone_primary ?? "+5521987860985";
  const phone1Label = settings?.contact_phone_primary_label ?? "(21) 98786-0985 — Suporte REVMED";
  const phone2 = settings?.contact_phone_secondary ?? "+5521983786198";
  const phone2Label = settings?.contact_phone_secondary_label ?? "(21) 98378-6198 — Dr. Anoar Jezini";
  const email = settings?.contact_email ?? "contato@revmed.app.br";
  const igUrl = settings?.instagram_url ?? "https://instagram.com/revmedmentoria";
  const igHandle = settings?.instagram_handle ?? "@revmedmentoria";
  const cnpj = settings?.cnpj ?? "CNPJ 48.442.973/0001-07";
  const desc = settings?.footer_description ??
    "A plataforma de prática do candidato Revalida INEP — sala ao vivo com vídeo, checklist 3 níveis, flashcards inteligentes, resumos, comunidade e gamificação num só lugar.";
  return (
    <footer className="border-t border-border bg-card/30 pt-12 pb-8">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-10 text-center md:grid-cols-3 md:items-start md:gap-8 md:text-left">
          {/* brand */}
          <div className="flex flex-col items-center gap-3 md:items-start md:col-span-3 lg:col-span-1">
            <Logo />
            <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground md:text-left">
              {desc}
            </p>
          </div>

          {/* contact */}
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground md:items-start md:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Contato
            </p>
            <a
              href={`tel:${phone1}`}
              className="inline-flex items-center gap-2 hover:text-foreground"
            >
              <Phone className="h-4 w-4 text-primary" />
              {phone1Label}
            </a>
            <a
              href={`tel:${phone2}`}
              className="inline-flex items-center gap-2 hover:text-foreground"
            >
              <Phone className="h-4 w-4 text-primary" />
              {phone2Label}
            </a>
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 hover:text-foreground"
            >
              <Mail className="h-4 w-4 text-primary" />
              {email}
            </a>
          </div>

          {/* links */}
          <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground md:col-span-1 md:items-start lg:items-end">
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Plataforma
            </p>
            <a
              href={igUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:text-foreground"
            >
              <Instagram className="h-4 w-4" />
              {igHandle}
            </a>
            <a href="#plataforma" className="hover:text-foreground">
              Como funciona
            </a>
            <a href="#investimento" className="hover:text-foreground">
              Planos
            </a>
          </div>
        </div>

        {/* legal bar */}
        <div className="mt-10 flex flex-col items-center gap-2 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground/70 md:flex-row md:justify-between md:text-left">
          <p>{cnpj}</p>
          <p>© {new Date().getFullYear()} REVMED. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}