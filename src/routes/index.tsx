import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/use-auth";
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
import { Tilt } from "@/components/landing/motion-primitives";
import { Depoimentos } from "@/components/landing/Depoimentos";
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
      { title: "REVMED — Treine a estação do Revalida como se fosse hoje" },
      {
        name: "description",
        content:
          "Sala ao vivo com ator-avaliador, cronômetro do INEP, checklist nos 3 níveis da banca e flashcards inteligentes. Descubra semana a semana se já passaria no Revalida.",
      },
      { property: "og:title", content: "REVMED — Chegue na prova já tendo feito a prova" },
      {
        property: "og:description",
        content:
          "Estação ao vivo com ator-avaliador, checklist igual ao INEP, flashcards inteligentes e sua nota comparada ao corte. Comece em 1 minuto.",
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
  const lastY = useRef(0);

  useEffect(() => setMounted(true), []);

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
        <Hero isLogged={mounted && !!user} />
        <MarqueeStrip />
        <ComoFunciona />
        <Manifesto />
        <Plataforma />
        <Comparativo />
        <Resultados />
        <Depoimentos />
        <Mentoria />
        <Investimento
          isLogged={mounted && !!user}
          onChoosePlan={(p) => setSignupPlan(p)}
        />
        <FAQ />
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

function Hero({ isLogged }: { isLogged: boolean }) {
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
            <span className="lg:hidden">Chegue na prova </span>
            <span className="hidden lg:inline">Chegue na prova do Revalida </span>
            <span
              style={{
                backgroundImage:
                  "linear-gradient(120deg, #f5c542 0%, #e85d1c 60%, #ff8a3a 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              <span className="lg:hidden">já tendo feito a prova.</span>
              <span className="hidden lg:inline">já tendo feito a prova dezenas de vezes.</span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:mt-5 md:text-base lg:mt-6 lg:text-lg"
          >
            Sala ao vivo com ator-avaliador, cronômetro do INEP e
            checklist da banca — tudo num app que dá vontade de abrir
            todo dia.
            <span className="hidden lg:inline">
              {" "}Treine estações completas com correção objetiva nos 3 níveis
              da banca, acompanhe sua evolução semana a semana e chegue no dia
              da prova com a confiança de quem já passou por ela dezenas de vezes.
            </span>
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
              um mentor por perto, com grupo de 5 alunos, encontros ao vivo e
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
  name: string;
  tagline: string;
  price: string;
  cadence: string;
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
    name: "Ator",
    tagline: "Treine como paciente",
    price: "R$ 147,00",
    cadence: "até o dia da prova",
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
    name: "Full",
    tagline: "Plataforma completa",
    price: "R$ 597,00",
    cadence: "até o dia da prova",
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
    name: "Mentoria 1:5",
    tagline: "Acompanhamento humano",
    price: "Sob consulta",
    cadence: "",
    desc: "Programa completo com mentor presente, cinco alunos por turma, psicólogo no time e plataforma inclusa.",
    features: [
      "Tudo do plano Full",
      "20 encontros práticos ao vivo",
      "10 encontros nas grandes áreas",
      "6 sessões com psicólogo",
      "Cronograma personalizado",
      "WhatsApp direto com mentor",
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
}: {
  isLogged: boolean;
  onChoosePlan: (p: SignupModalPlan) => void;
}) {
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
            Plataforma completa, acesso só de ator, ou mentoria com acompanhamento ao vivo. Pague uma vez e use até o dia da prova.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:mt-12 md:gap-6 lg:grid-cols-3 lg:mt-14 lg:gap-7">
          {PLANS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 1, y: 0 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: idx * 0.08 }}
                className={`group relative flex flex-col overflow-hidden rounded-3xl p-6 sm:p-7 md:p-8 lg:p-9 ${
                  p.highlight
                    ? "border border-primary/60 bg-gradient-to-br from-primary/[0.12] via-background to-background shadow-[0_40px_100px_-30px_color-mix(in_oklab,var(--primary)_70%,transparent)] lg:scale-[1.03]"
                    : "border border-border/80 bg-background/80 backdrop-blur-sm hover:border-border"
                }`}
              >
                {/* Glow de fundo */}
                <div
                  className={`pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-b ${p.accent} to-transparent opacity-60 blur-3xl`}
                />

                {p.highlight && (
                  <div className="absolute right-4 top-4 rounded-full bg-primary px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-primary-foreground shadow-elegant sm:right-6 sm:top-6 sm:px-3 sm:text-[10px]">
                    Recomendado
                  </div>
                )}

                <div className="relative">
                  <div
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${
                      p.highlight
                        ? "bg-primary/15 text-primary ring-1 ring-primary/30"
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
                    <span className="font-display text-4xl font-black leading-none tracking-[-0.04em] sm:text-[2.75rem] md:text-4xl lg:text-5xl">
                      {p.price}
                    </span>
                    {p.cadence && (
                      <span className="mb-1.5 text-xs text-muted-foreground sm:text-sm">
                        {p.cadence}
                      </span>
                    )}
                  </div>

                  <div className="my-5 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent sm:my-7" />

                  <ul className="space-y-2.5 sm:space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-[0.8rem] sm:text-sm">
                        <span
                          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            p.highlight
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
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
                          ? "bg-primary text-primary-foreground shadow-elegant"
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
                          slug: p.name === "Full" ? "completo" : "ator",
                          name: p.name,
                          price: p.price,
                          cadence: p.cadence,
                        })
                      }
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-transform hover:scale-[1.02] sm:px-6 sm:py-3.5 sm:text-base ${
                        p.highlight
                          ? "bg-primary text-primary-foreground shadow-elegant"
                          : "border border-border bg-card text-foreground hover:bg-muted"
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
          Cancela quando quiser. 7 dias de garantia nos planos Ator e Full.
        </p>
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

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-5 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Perguntas honestas
        </p>
        <h2 className="mt-3 font-display text-[1.85rem] font-black leading-[1.05] tracking-[-0.03em] md:mt-4 md:text-4xl lg:text-5xl">
          O que a gente costuma ouvir.
        </h2>
        <div className="mt-8 divide-y divide-border border-y border-border md:mt-10">
          {FAQS.map((f, i) => (
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
  return (
    <footer className="border-t border-border bg-card/30 pt-12 pb-8">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-10 text-center md:grid-cols-3 md:items-start md:gap-8 md:text-left">
          {/* brand */}
          <div className="flex flex-col items-center gap-3 md:items-start md:col-span-3 lg:col-span-1">
            <Logo />
            <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground md:text-left">
              A plataforma de prática do candidato Revalida INEP — sala ao
              vivo com vídeo, checklist 3 níveis, flashcards inteligentes, resumos,
              comunidade e gamificação num só lugar.
            </p>
          </div>

          {/* contact */}
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground md:items-start md:col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Contato
            </p>
            <a
              href="tel:+5521987860985"
              className="inline-flex items-center gap-2 hover:text-foreground"
            >
              <Phone className="h-4 w-4 text-primary" />
              (21) 98786-0985 — Suporte REVMED
            </a>
            <a
              href="tel:+5521983786198"
              className="inline-flex items-center gap-2 hover:text-foreground"
            >
              <Phone className="h-4 w-4 text-primary" />
              (21) 98378-6198 — Dr. Anoar Jezini
            </a>
            <a
              href="mailto:contato@revmed.app.br"
              className="inline-flex items-center gap-2 hover:text-foreground"
            >
              <Mail className="h-4 w-4 text-primary" />
              contato@revmed.app.br
            </a>
          </div>

          {/* links */}
          <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground md:col-span-1 md:items-start lg:items-end">
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Plataforma
            </p>
            <a
              href="https://instagram.com/revmedmentoria"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:text-foreground"
            >
              <Instagram className="h-4 w-4" />
              @revmedmentoria
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
          <p>CNPJ 48.442.973/0001-07</p>
          <p>© {new Date().getFullYear()} REVMED. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}