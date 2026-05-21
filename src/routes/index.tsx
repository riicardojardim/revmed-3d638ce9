import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  PlayCircle,
  Instagram,
  Phone,
  Mail,
  MessageCircle,
  Drama,
  Crown,
  GraduationCap,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/use-auth";
import mockupDashboard from "@/assets/mockup-dashboard.jpg";
import mockupChecklists from "@/assets/mockup-checklists.jpg";
import mockupFlashcards from "@/assets/mockup-flashcards.jpg";
import mockupResumos from "@/assets/mockup-resumos.jpg";
import avatar1 from "@/assets/hero-avatar-1.jpg";
import avatar2 from "@/assets/hero-avatar-2.jpg";
import avatar3 from "@/assets/hero-avatar-3.jpg";
import avatar4 from "@/assets/hero-avatar-4.jpg";
import { Tilt, Magnetic, AnimatedCounter } from "@/components/landing/motion-primitives";
import { Depoimentos } from "@/components/landing/Depoimentos";
import { ComoFunciona, Comparativo } from "@/components/landing/ComoFunciona";
import {
  FakeNotifications,
  NOTIFICATION_AVATAR_SOURCES,
  WhatsAppFloat,
  UrgencyBanner,
} from "@/components/landing/FakeNotifications";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "REVMED — Plataforma de prática para o Revalida INEP" },
      {
        name: "description",
        content:
          "Estações com cronômetro INEP, banco de checklists oficiais, flashcards com revisão espaçada, resumos práticos e desempenho em tempo real. Tudo num só lugar — com mentoria opcional 1:5.",
      },
      { property: "og:title", content: "REVMED — A plataforma do candidato Revalida" },
      {
        property: "og:description",
        content:
          "Treine estações ao vivo com ator, marque checklist como a banca, revise por flashcards e resumos, acompanhe seu desempenho. Mentoria 1:5 disponível como complemento.",
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
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="dark min-h-dvh bg-background text-foreground antialiased">
      <UrgencyBanner />
      <TopNav
        scrolled={scrolled}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        isLogged={!!user}
      />
      <main className="overflow-clip">
        <Hero isLogged={!!user} />
        <MarqueeStrip />
        <ComoFunciona />
        <Manifesto />
        <Plataforma />
        <Comparativo />
        <Resultados />
        <Depoimentos />
        <Mentoria />
        <Investimento isLogged={!!user} />
        <FAQ />
        <FinalCTA isLogged={!!user} />
      </main>
      <Footer />
      <FakeNotifications />
      <WhatsAppFloat />
    </div>
  );
}

/* ----------------------------- TOP NAV ----------------------------- */

function TopNav({
  scrolled,
  menuOpen,
  setMenuOpen,
  isLogged,
}: {
  scrolled: boolean;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  isLogged: boolean;
}) {
  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
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
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to={isLogged ? "/app" : "/login"}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {isLogged ? "Plataforma" : "Entrar"}
          </Link>
          <Link
            to={isLogged ? "/app" : "/cadastro"}
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
          >
            {isLogged ? "Abrir painel" : "Garantir vaga"}
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
        <button
          aria-label="Abrir menu"
          className="rounded-lg border border-border p-2 lg:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {menuOpen && (
        <div className="border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-1 px-5 py-4">
            {NAV_LINKS.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <Link
              to={isLogged ? "/app" : "/cadastro"}
              className="mt-2 rounded-full bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground"
            >
              {isLogged ? "Abrir painel" : "Garantir vaga"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

/* ----------------------------- HERO ----------------------------- */

const HERO_PREFIX = ["A", "plataforma", "que"];
const HERO_ITALIC = "treina pra valer";
const HERO_SUFFIX = ["o", "Revalida."];
const WORD_STAGGER = 0.07;
const HERO_BASE_DELAY = 0.15;

function HeroWord({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <motion.span
      initial={{ y: 18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className="inline-block"
    >
      {children}
    </motion.span>
  );
}

function HeroTitle() {
  const italicDelay = HERO_BASE_DELAY + HERO_PREFIX.length * WORD_STAGGER + 0.18;
  const suffixStart = italicDelay + 0.35;
  return (
    <>
      {HERO_PREFIX.map((w, i) => (
        <span key={`p-${i}`}>
          <HeroWord delay={HERO_BASE_DELAY + i * WORD_STAGGER}>{w}</HeroWord>{" "}
        </span>
      ))}
      <motion.span
        initial={{ y: 18, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.85, delay: italicDelay, ease: [0.22, 1, 0.36, 1] }}
        className="font-serif italic hero-italic-shimmer inline-block"
        style={{ fontWeight: 400 }}
      >
        {HERO_ITALIC}
      </motion.span>{" "}
      {HERO_SUFFIX.map((w, i) => (
        <span key={`s-${i}`}>
          <HeroWord delay={suffixStart + i * WORD_STAGGER}>{w}</HeroWord>{" "}
        </span>
      ))}
    </>
  );
}

function Hero({ isLogged }: { isLogged: boolean }) {
  return (
    <section className="relative">
      {/* Aurora cônica girando sutilmente */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="aurora-bg" />
      </div>
      {/* Orbs flutuantes */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="orb-a absolute -top-20 -left-10 h-72 w-72 rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--primary) 55%, transparent), transparent 70%)" }}
        />
        <div
          className="orb-b absolute top-1/3 right-0 h-80 w-80 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--mint) 50%, transparent), transparent 70%)" }}
        />
        <div
          className="orb-c absolute bottom-0 left-1/3 h-64 w-64 rounded-full opacity-35 blur-3xl"
          style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--primary) 40%, transparent), transparent 70%)" }}
        />
      </div>
      {/* radial orange glow base */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 60% at 80% 0%, color-mix(in oklab, var(--primary) 30%, transparent) 0%, transparent 60%), radial-gradient(40% 50% at 10% 100%, color-mix(in oklab, var(--mint) 18%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="mx-auto grid max-w-7xl items-stretch gap-12 px-5 pt-10 pb-20 md:px-8 md:pt-16 md:pb-28 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6 lg:order-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary"
          >
            <Flame className="h-3.5 w-3.5" />
            Plataforma oficial • Revalida INEP
          </motion.div>

          <h1 className="mt-6 font-display text-[2.6rem] font-black leading-[0.98] tracking-[-0.05em] md:text-6xl lg:text-7xl xl:text-[5.5rem]">
            <HeroTitle />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl leading-relaxed"
          >
            Estações ao vivo com cronômetro INEP, banco gigante de checklists
            oficiais, flashcards com revisão espaçada, resumos enxutos e
            desempenho em tempo real. Tudo num só lugar — sem travar, mesmo com
            todo mundo treinando junto.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.05 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Magnetic strength={0.28} className="relative inline-block">
              <span aria-hidden className="cta-halo" />
              <Link
                to={isLogged ? "/app" : "/cadastro"}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-7 py-4 text-base font-bold text-primary-foreground shadow-[0_20px_60px_-15px_color-mix(in_oklab,var(--primary)_75%,transparent)] transition-all hover:scale-[1.03] hover:shadow-[0_25px_80px_-15px_color-mix(in_oklab,var(--primary)_90%,transparent)]"
                style={{
                  backgroundImage:
                    "linear-gradient(120deg, #ff8a3a 0%, #F59A1B 50%, #CF8737 100%)",
                }}
              >
                <span className="relative z-10">Começar a treinar</span>
                <ArrowUpRight className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5" />
                <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
              </Link>
            </Magnetic>
            <a
              href="#plataforma"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-6 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-card"
            >
              <PlayCircle className="h-5 w-5 text-primary" />
              Ver por dentro
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground"
          >
            <div className="flex -space-x-2">
              {[avatar1, avatar2, avatar3, avatar4].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  width={32}
                  height={32}
                  loading="eager"
                  decoding="async"
                  className="h-8 w-8 rounded-full border-2 border-background object-cover"
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
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative flex lg:col-span-6 lg:order-1"
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
    <div className="relative w-full min-h-[520px] lg:min-h-[640px]">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="absolute -left-3 top-4 z-30 hidden rounded-2xl border border-border bg-background/90 px-4 py-3 shadow-elegant backdrop-blur-xl md:block"
      >
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Aprovação 25.1
        </div>
        <div className="font-display text-2xl font-black text-primary">87%</div>
      </motion.div>

      <Tilt className="absolute right-0 top-10 z-10 w-[78%] lg:w-[72%]" max={4} scale={1.0}>
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

      <Tilt className="absolute left-0 bottom-16 z-20 w-[92%] lg:w-[88%]" max={7} scale={1.015}>
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.85 }}
        className="absolute -right-2 bottom-4 z-30 hidden rounded-2xl border border-border bg-background/90 px-4 py-3 shadow-elegant backdrop-blur-xl md:block"
      >
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Simulações
        </div>
        <div className="font-display text-2xl font-black text-mint">+ 320</div>
      </motion.div>

      <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 gap-1.5">
        {frontSlides.map((_, k) => (
          <button
            key={k}
            onClick={() => setIFront(k)}
            aria-label={`Slide ${k + 1}`}
            className={`h-1.5 rounded-full transition-all ${k === iFront ? "w-7 bg-primary" : "w-1.5 bg-muted-foreground/40"}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- MARQUEE ----------------------------- */

function MarqueeStrip() {
  const items = [
    "Estações com cronômetro INEP",
    "Checklists oficiais",
    "Flashcards com revisão espaçada",
    "Resumos enxutos",
    "Desempenho em tempo real",
    "Sala estável pra prática ao vivo",
    "Banco com centenas de casos",
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
    title: "Treine de verdade.",
    body:
      "Estação ao vivo, ator do outro lado, cronômetro do INEP rodando. Você não simula no papel — você executa, do mesmo jeito que vai fazer na prova.",
  },
  {
    n: "02",
    icon: Compass,
    title: "Veja onde está.",
    body:
      "Cada checklist, flashcard e estação vira número no seu painel de desempenho. Você sabe exatamente em qual área está perdendo ponto — e onde já é prova.",
  },
  {
    n: "03",
    icon: Layers,
    title: "Repetição que cura.",
    body:
      "Checklist, flashcard e simulado cronometrado em looping. Nada de revisar uma vez e esquecer — você ensaia até a conduta sair em automático.",
  },
];

function Manifesto() {
  return (
    <section id="manifesto" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Método
            </p>
            <h2 className="mt-4 font-display text-[2.4rem] font-black leading-[1.02] tracking-[-0.045em] md:text-6xl lg:text-7xl">
              Aprovação não é sorte. É <em className="not-italic text-primary">método</em>.
            </h2>
            <p className="mt-6 text-base text-muted-foreground md:text-lg">
              O Revalida não recompensa quem estudou mais — recompensa quem
              treinou certo. A REVMED foi feita pra você praticar conduta,
              marcar checklist como banca e medir o próprio progresso, no
              tempo que a sua rotina permite.
            </p>
          </div>
          <div className="lg:col-span-8">
            <div className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border">
              {PILLARS.map((p) => (
                <motion.article
                  key={p.n}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5 }}
                  className="group relative grid grid-cols-[auto_1fr_auto] items-start gap-6 bg-card p-7 md:p-9"
                >
                  <div className="font-display text-3xl font-black text-primary md:text-4xl">
                    {p.n}
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-extrabold tracking-[-0.03em] md:text-3xl lg:text-[2rem]">
                      {p.title}
                    </h3>
                    <p className="mt-2 max-w-xl text-muted-foreground">
                      {p.body}
                    </p>
                  </div>
                  <p.icon className="h-6 w-6 text-primary opacity-60 transition-opacity group-hover:opacity-100 md:h-7 md:w-7" />
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
    <section id="plataforma" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Plataforma
            </p>
            <h2 className="mt-4 font-display text-[2.4rem] font-black leading-[1.02] tracking-[-0.045em] md:text-6xl lg:text-7xl">
              Estação, checklist, flashcard e resumo. Num só lugar.
            </h2>
          </div>
          <p className="max-w-md text-muted-foreground">
            Sala estável pra dezenas de candidatos treinarem ao mesmo tempo,
            sem travar. Tudo integrado ao seu painel de desempenho, com
            histórico, tempo médio e nota por critério.
          </p>
        </div>

        <div className="mt-12 grid auto-rows-[minmax(180px,_auto)] gap-4 md:grid-cols-6">
          <FeatureCard
            className="md:col-span-4"
            tag="Estação"
            title="Sala ao vivo com cronômetro INEP"
            desc="Candidato, ator e avaliador na mesma sala — 10 minutos, impressos, roteiro padronizado. Roda estável mesmo com a turma toda treinando junto."
            accent="primary"
          />
          <FeatureCard
            className="md:col-span-2"
            tag="Checklist"
            title="Pontuação igual à da banca"
            desc="Marque critério por critério, no mesmo modelo do INEP."
          />
          <FeatureCard
            className="md:col-span-2"
            tag="Flashcards"
            title="Revisão espaçada por área"
            desc="Centenas de cards prontos. Você só revisa o que tá perdendo."
          />
          <FeatureCard
            className="md:col-span-2"
            tag="Resumos"
            title="Resumos curtos, do jeito que cai"
            desc="Sem manual de 800 páginas. Só o que vira ponto na prova."
            accent="mint"
          />
          <FeatureCard
            className="md:col-span-2"
            tag="Desempenho"
            title="Painel com nota, tempo e evolução"
            desc="Acompanhe sua média por estação, área e critério em tempo real."
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
      ? "card-premium ring-1 ring-primary/40"
      : accent === "mint"
        ? "card-premium ring-1 ring-mint/40"
        : "card-premium";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl p-6 transition-transform hover:-translate-y-1 md:p-8 ${accentRing} ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-background/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          {tag}
        </span>
        <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
      <div className="mt-8">
        <h3 className="font-display text-xl font-bold leading-tight tracking-tight md:text-2xl">
          {title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
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
      className="relative border-y border-border/60 bg-card/30 py-24 md:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {NUMBERS.map((n, i) => (
            <motion.div
              key={n.l}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="card-premium rounded-3xl p-7 transition-transform hover:-translate-y-1"
            >
              <div className="font-display text-5xl font-black tracking-[-0.03em] text-primary md:text-6xl">
                {n.v}
              </div>
              <div className="mt-3 text-sm font-medium text-muted-foreground">
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
    <section id="mentoria" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid items-stretch gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Mentoria (opcional)
            </p>
            <h2 className="mt-4 font-display text-[2.4rem] font-black leading-[1.02] tracking-[-0.045em] md:text-6xl lg:text-7xl">
              Quer alguém <br />
              do seu lado? <br />
              <span className="text-primary">Tem mentoria.</span>
            </h2>
            <p className="mt-6 text-muted-foreground md:text-lg">
              A plataforma já te dá tudo pra treinar sozinho. Mas quem prefere
              um mentor por perto, com grupo de 5 alunos, encontros ao vivo e
              psicólogo no programa, pode entrar na mentoria — um plus à parte,
              em turmas pequenas que fecham rápido.
            </p>
            <Link
              to="/cadastro"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              Saber mais da mentoria
              <ArrowUpRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="relative lg:col-span-7">
            <div className="card-premium relative overflow-hidden rounded-[2rem] ring-1 ring-primary/40 p-8 md:p-10">
              <div
                aria-hidden
                className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl"
              />
              <div className="relative">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Sparkles className="h-4 w-4" /> Programa completo
                </div>
                <h3 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.03em] md:text-4xl lg:text-5xl">
                  O que vem na mentoria
                </h3>
                <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                  {MENTORIA_BENEFITS.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-sm md:text-base">{b}</span>
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

function Investimento({ isLogged }: { isLogged: boolean }) {
  return (
    <section
      id="investimento"
      className="relative border-y border-border/60 bg-card/30 py-24 md:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Planos
          </p>
          <h2 className="mt-4 font-display text-[2.4rem] font-black leading-[1.02] tracking-[-0.045em] md:text-6xl lg:text-7xl">
            Escolha como você quer treinar.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Plataforma completa, acesso só de ator, ou mentoria com acompanhamento ao vivo. Pague uma vez e use até o dia da prova.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:gap-7 lg:grid-cols-3">
          {PLANS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: idx * 0.08 }}
                className={`card-premium group relative flex flex-col overflow-hidden rounded-3xl p-8 md:p-9 transition-transform hover:-translate-y-1 ${
                  p.highlight
                    ? "ring-1 ring-primary/60 shadow-[0_40px_100px_-30px_color-mix(in_oklab,var(--primary)_75%,transparent)] lg:scale-[1.03]"
                    : ""
                }`}
              >
                {/* Glow de fundo */}
                <div
                  className={`pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-b ${p.accent} to-transparent opacity-60 blur-3xl`}
                />

                {p.highlight && (
                  <div className="absolute right-6 top-6 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground shadow-elegant">
                    Recomendado
                  </div>
                )}

                <div className="relative">
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${
                      p.highlight
                        ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                        : "bg-muted/60 text-foreground ring-1 ring-border"
                    }`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.2} />
                  </div>

                  <h3 className="mt-5 font-display text-2xl font-black tracking-[-0.02em]">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {p.tagline}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {p.desc}
                  </p>

                  <div className="mt-6 flex items-end gap-1.5">
                    <span className="font-display text-[2.75rem] font-black leading-none tracking-[-0.04em] md:text-5xl">
                      {p.price}
                    </span>
                    {p.cadence && (
                      <span className="mb-1.5 text-sm text-muted-foreground">
                        {p.cadence}
                      </span>
                    )}
                  </div>

                  <div className="my-7 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

                  <ul className="space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm">
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

                <div className="relative mt-auto pt-9">
                  {p.ctaType === "whatsapp" ? (
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-base font-bold text-white shadow-[0_15px_40px_-10px_rgba(37,211,102,0.55)] transition-transform hover:scale-[1.02]"
                    >
                      <MessageCircle className="h-5 w-5" strokeWidth={2.4} />
                      {p.cta}
                    </a>
                  ) : (
                    <Link
                      to={isLogged ? "/app" : "/cadastro"}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-bold transition-transform hover:scale-[1.02] ${
                        p.highlight
                          ? "bg-primary text-primary-foreground shadow-elegant"
                          : "border border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      {p.cta}
                      <ArrowUpRight className="h-5 w-5" />
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
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
    a: "Não. A sala foi feita pra rodar estável com várias estações acontecendo ao mesmo tempo — candidato, ator e avaliador na mesma chamada, com cronômetro INEP.",
  },
  {
    q: "Preciso entrar na mentoria pra usar a plataforma?",
    a: "Não. A mentoria é um plus à parte. No plano Full você tem acesso completo a checklists, flashcards, simulados cronometrados, resumos e painel de desempenho — sem precisar de mentor.",
  },
  {
    q: "Consigo acompanhar meu desempenho?",
    a: "Sim. Tudo que você faz na plataforma vira número no seu painel — nota por critério, tempo médio por estação, evolução por área e histórico completo de simulações.",
  },
  {
    q: "Tem garantia?",
    a: "Sete dias nos planos Ator e Full. Se não fizer sentido, devolvemos 100% do valor.",
  },
  {
    q: "Funciona no celular?",
    a: "Funciona em qualquer tela. A plataforma é PWA — você instala no celular e revisa flashcard e resumo em qualquer lugar.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-5 md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Perguntas honestas
        </p>
        <h2 className="mt-4 font-display text-[2.4rem] font-black leading-[1.02] tracking-[-0.045em] md:text-6xl lg:text-7xl">
          O que a gente costuma ouvir.
        </h2>
        <div className="mt-10 divide-y divide-border border-y border-border">
          {FAQS.map((f, i) => (
            <div key={f.q}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
              >
                <span className="font-display text-lg font-semibold md:text-xl">
                  {f.q}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-primary transition-transform ${
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
                  className="pb-6 text-muted-foreground"
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
    <section className="relative overflow-hidden py-24 md:py-32">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 70% at 50% 50%, color-mix(in oklab, var(--primary) 30%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-3xl px-5 text-center md:px-8">
        <h2 className="font-display text-[2.6rem] font-black leading-[0.98] tracking-[-0.045em] md:text-7xl lg:text-[5.5rem]">
          Pronto pra treinar <br />
          <span className="text-primary">do jeito que cai?</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-muted-foreground md:text-lg">
          Estações ao vivo, checklists oficiais, flashcards, resumos e painel
          de desempenho. Tudo num só lugar, até o dia da prova.
        </p>
        <Link
          to={isLogged ? "/app" : "/cadastro"}
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-4 text-base font-bold text-primary-foreground shadow-[0_20px_60px_-20px_color-mix(in_oklab,var(--primary)_70%,transparent)] transition-transform hover:scale-[1.03]"
        >
          Entrar na plataforma
          <ArrowUpRight className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}

/* ----------------------------- FOOTER ----------------------------- */

function Footer() {
  return (
    <footer className="border-t border-border bg-card/30 pt-12 pb-8">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-col items-center gap-10 text-center md:flex-row md:items-start md:justify-between md:text-left">
          {/* brand */}
          <div className="flex flex-col items-center gap-3 md:items-start">
            <Logo />
            <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground md:text-left">
              A plataforma de prática do candidato Revalida INEP — estações,
              checklists, flashcards, resumos e desempenho num só lugar.
            </p>
          </div>

          {/* contact */}
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground md:items-start">
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
          <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground md:items-end">
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