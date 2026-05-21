import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Quote,
  Instagram,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/use-auth";
import mockupEstacao from "@/assets/revmed-mockup-estacao.png";
import mockupCronograma from "@/assets/revmed-mockup-cronograma.png";
import { Tilt } from "@/components/landing/motion-primitives";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "REVMED — Mentoria para Revalidação Médica" },
      {
        name: "description",
        content:
          "Mentoria 1:1 + plataforma de prática para médicos formados fora do Brasil. Cinco alunos por grupo, encontros com psicólogo, simulações com cronômetro INEP e revisão ativa que aprova.",
      },
      { property: "og:title", content: "REVMED — Mentoria que aprova no Revalida" },
      {
        property: "og:description",
        content:
          "Cinco vagas por turma. Encontros semanais. Plataforma com simulações cronometradas e correção objetiva. Sua aprovação não pode esperar mais um ciclo.",
      },
    ],
  }),
});

const NAV_LINKS = [
  { id: "manifesto", label: "Manifesto" },
  { id: "plataforma", label: "Plataforma" },
  { id: "resultados", label: "Resultados" },
  { id: "mentoria", label: "Mentoria" },
  { id: "investimento", label: "Investimento" },
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
      <TopNav
        scrolled={scrolled}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        isLogged={!!user}
      />
      <main className="overflow-clip">
        <Hero isLogged={!!user} />
        <MarqueeStrip />
        <Manifesto />
        <Plataforma />
        <Resultados />
        <Mentoria />
        <Investimento isLogged={!!user} />
        <FAQ />
        <FinalCTA isLogged={!!user} />
      </main>
      <Footer />
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
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pt-10 pb-20 md:px-8 md:pt-16 md:pb-28 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary"
          >
            <Flame className="h-3.5 w-3.5" />
            Turma 2026 • 5 vagas por grupo
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-6 font-display text-[2.6rem] font-black leading-[1.02] tracking-[-0.04em] md:text-6xl lg:text-7xl"
          >
            A mentoria que <br />
            <span
              style={{
                backgroundImage:
                  "linear-gradient(120deg, #f5c542 0%, #e85d1c 60%, #ff8a3a 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              vira chave
            </span>{" "}
            no Revalida.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl"
          >
            REVMED é mentoria de pequeno grupo + plataforma de prática para
            quem decidiu que esse ciclo é o último. Cinco médicos por turma.
            Cronômetro INEP. Acompanhamento com psicólogo. Resultado medido em
            prova, não em discurso.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              to={isLogged ? "/app" : "/cadastro"}
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground shadow-[0_10px_40px_-12px_color-mix(in_oklab,var(--primary)_60%,transparent)] transition-transform hover:scale-[1.02]"
            >
              Garantir minha vaga
              <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <a
              href="#plataforma"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-6 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-card"
            >
              <PlayCircle className="h-5 w-5 text-primary" />
              Ver a plataforma
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center gap-6 text-xs text-muted-foreground"
          >
            <div className="flex -space-x-2">
              {["bg-primary", "bg-mint", "bg-primary/70", "bg-mint/70"].map(
                (c, i) => (
                  <div
                    key={i}
                    className={`h-8 w-8 rounded-full border-2 border-background ${c}`}
                  />
                ),
              )}
            </div>
            <span>
              <span className="font-bold text-foreground">+ 1.200 médicos</span>{" "}
              já passaram pela mentoria
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative lg:col-span-6"
        >
          <div className="relative">
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
          {/* floating stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="absolute -left-2 top-10 hidden rounded-2xl border border-border bg-card/90 px-4 py-3 shadow-elegant backdrop-blur-xl md:block"
          >
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Aprovação 25.1
            </div>
            <div className="font-display text-2xl font-black text-primary">
              87%
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.85 }}
            className="absolute -right-2 bottom-12 hidden rounded-2xl border border-border bg-card/90 px-4 py-3 shadow-elegant backdrop-blur-xl md:block"
          >
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Simulações
            </div>
            <div className="font-display text-2xl font-black text-mint">
              + 320
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ----------------------------- MARQUEE ----------------------------- */

function MockupCarousel() {
  const slides = [
    { src: mockupEstacao, alt: "Simulador de estação clínica REVMED com cronômetro INEP" },
    { src: mockupCronograma, alt: "Painel REVMED com cronograma Revalida e progresso por especialidade" },
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 4000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <Tilt className="relative aspect-[16/10] w-full" max={7} scale={1.015}>
      <AnimatePresence mode="wait">
        <motion.img
          key={i}
          src={slides[i].src}
          alt={slides[i].alt}
          width={1600}
          height={1000}
          draggable={false}
          initial={{ opacity: 0, scale: 1.02, filter: "blur(6px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.985, filter: "blur(6px)" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 h-full w-full select-none rounded-2xl ring-1 ring-border/60 drop-shadow-2xl"
        />
      </AnimatePresence>
      <div className="absolute -bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
        {slides.map((_, k) => (
          <button
            key={k}
            onClick={() => setI(k)}
            aria-label={`Slide ${k + 1}`}
            className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40"}`}
          />
        ))}
      </div>
    </Tilt>
  );
}

/* ----------------------------- MARQUEE ----------------------------- */

function MarqueeStrip() {
  const items = [
    "Cinco alunos por grupo",
    "Cronômetro INEP",
    "Psicólogo no programa",
    "Banca de simulação real",
    "Checklists oficiais",
    "Mentor presente toda semana",
    "Foco em 2ª fase",
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
    title: "Foco brutal.",
    body:
      "Você não vai estudar tudo. Vai estudar o que cai. Mapeamos cada estação do INEP e cortamos o que não te tira pra fora da nota de corte.",
  },
  {
    n: "02",
    icon: Compass,
    title: "Rota individual.",
    body:
      "Cada um chega com uma história. Cinco médicos por grupo significa plano de estudo por nome — não por turma. Seu mentor sabe onde você travou.",
  },
  {
    n: "03",
    icon: Layers,
    title: "Repetição que cura.",
    body:
      "A plataforma roda checklist, flashcard e simulado cronometrado em looping. Nada de revisar uma vez e esquecer. Você ensaia até virar reflexo.",
  },
];

function Manifesto() {
  return (
    <section id="manifesto" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Manifesto
            </p>
            <h2 className="mt-4 font-display text-4xl font-black leading-[1.05] tracking-[-0.03em] md:text-5xl">
              Aprovação não é sorte. É <em className="not-italic text-primary">método</em>.
            </h2>
            <p className="mt-6 text-base text-muted-foreground md:text-lg">
              O Revalida não recompensa quem estudou mais — recompensa quem
              estudou certo. REVMED existe pra fazer essa diferença caber na
              sua rotina de plantonista, mãe, pai, imigrante e ser humano que
              precisa dormir.
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
                    <h3 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
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
            <h2 className="mt-4 font-display text-4xl font-black leading-[1.05] tracking-[-0.03em] md:text-5xl">
              Tudo num só lugar. Nada perdido em PDF.
            </h2>
          </div>
          <p className="max-w-md text-muted-foreground">
            Construímos a plataforma que a gente sempre quis ter na época do
            cursinho — sem 14 abas abertas, sem caderno físico, sem app
            “de flashcard” separado.
          </p>
        </div>

        <div className="mt-12 grid auto-rows-[minmax(180px,_auto)] gap-4 md:grid-cols-6">
          <FeatureCard
            className="md:col-span-4"
            tag="Estação"
            title="Simulações com cronômetro real do INEP"
            desc="10 minutos, cinco impressos, ator treinado. Quando a campainha toca, você já tá pronto pra prova oficial."
            accent="primary"
          />
          <FeatureCard
            className="md:col-span-2"
            tag="Checklist"
            title="Pontuação objetiva por critério"
            desc="O mesmo modelo da banca examinadora."
          />
          <FeatureCard
            className="md:col-span-2"
            tag="Flashcards"
            title="Revisão espaçada por especialidade"
            desc="Memorização ativa sem decoreba."
          />
          <FeatureCard
            className="md:col-span-2"
            tag="Resumos"
            title="Conteúdo enxuto, do jeito que cai"
            desc="Sem manual de 800 páginas."
            accent="mint"
          />
          <FeatureCard
            className="md:col-span-2"
            tag="Banca"
            title="Sala compartilhada candidato + ator + avaliador"
            desc="Treine no mesmo formato da prova prática."
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
  { v: "87%", l: "Aprovação na turma 25.1" },
  { v: "1.200+", l: "Médicos mentorados" },
  { v: "5", l: "Alunos por grupo" },
  { v: "10min", l: "Por estação, como no INEP" },
];

const TESTIMONIALS = [
  {
    name: "Dra. Júlia M.",
    role: "Formada em Lisboa • Aprovada 24.2",
    text: "Era minha terceira tentativa. O que mudou foi parar de estudar tudo e começar a estudar o que cai. O mentor foi cirúrgico.",
  },
  {
    name: "Dr. Renan A.",
    role: "Formado em Buenos Aires • Aprovado 25.1",
    text: "O simulado com cronômetro me destravou. Cheguei na prova oficial e foi como ensaio: já sabia o ritmo, já sabia onde respirar.",
  },
  {
    name: "Dra. Camila S.",
    role: "Formada em La Paz • Aprovada 25.1",
    text: "O psicólogo do programa foi o que ninguém me ofereceu antes. Sem ele eu teria desistido no meio do ciclo.",
  },
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
              className="rounded-3xl border border-border bg-background p-7"
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

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col gap-5 rounded-3xl border border-border bg-background p-7 md:p-8"
            >
              <Quote className="h-7 w-7 text-primary" />
              <blockquote className="text-base leading-relaxed text-foreground md:text-lg">
                “{t.text}”
              </blockquote>
              <figcaption className="mt-auto border-t border-border pt-4">
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- MENTORIA ----------------------------- */

const MENTORIA_BENEFITS = [
  "20 encontros práticos em grupo de 5",
  "10 encontros extras nas 5 grandes áreas",
  "6 encontros com psicólogo do programa",
  "Revisões + gravações sob demanda",
  "Acesso integral à plataforma REVMED",
  "Cronograma personalizado pelo mentor",
];

function Mentoria() {
  return (
    <section id="mentoria" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid items-stretch gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Mentoria 2026.1
            </p>
            <h2 className="mt-4 font-display text-4xl font-black leading-[1.05] tracking-[-0.03em] md:text-5xl">
              Cinco vagas. <br />
              Um mentor. <br />
              <span className="text-primary">Sua aprovação.</span>
            </h2>
            <p className="mt-6 text-muted-foreground md:text-lg">
              Grupos pequenos não são um detalhe — são o produto. Em cinco a
              gente conhece sua história, sua banca interna, seu ponto cego.
              Não dá pra escalar isso, e por isso a turma fecha rápido.
            </p>
            <Link
              to="/cadastro"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              Conversar com a equipe
              <ArrowUpRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="relative lg:col-span-7">
            <div className="relative overflow-hidden rounded-[2rem] border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-8 md:p-10">
              <div
                aria-hidden
                className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl"
              />
              <div className="relative">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Sparkles className="h-4 w-4" /> Programa completo
                </div>
                <h3 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">
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

const PLANS = [
  {
    name: "Plataforma",
    price: "R$ 97",
    cadence: "/mês",
    desc: "Acesso solo à plataforma REVMED — checklists, flashcards, simulados e resumos.",
    features: [
      "Plataforma completa REVMED",
      "Banco de estações INEP",
      "Flashcards com revisão espaçada",
      "Comunidade de candidatos",
    ],
    cta: "Começar agora",
    highlight: false,
  },
  {
    name: "Mentoria 1:5",
    price: "Sob consulta",
    cadence: "",
    desc: "O programa completo: cinco alunos, mentor presente, psicólogo no time, plataforma inclusa.",
    features: [
      "Tudo do plano Plataforma",
      "20 encontros práticos ao vivo",
      "10 encontros nas grandes áreas",
      "6 sessões com psicólogo",
      "Cronograma personalizado",
      "WhatsApp direto com mentor",
    ],
    cta: "Falar com a equipe",
    highlight: true,
  },
];

function Investimento({ isLogged }: { isLogged: boolean }) {
  return (
    <section
      id="investimento"
      className="relative border-y border-border/60 bg-card/30 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Investimento
          </p>
          <h2 className="mt-4 font-display text-4xl font-black leading-[1.05] tracking-[-0.03em] md:text-5xl">
            Dois caminhos. Mesma obsessão por aprovação.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {PLANS.map((p) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className={`relative flex flex-col rounded-3xl p-8 md:p-10 ${
                p.highlight
                  ? "border border-primary/50 bg-gradient-to-br from-primary/10 via-background to-background shadow-[0_30px_80px_-30px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
                  : "border border-border bg-background"
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 right-8 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                  Recomendado
                </div>
              )}
              <h3 className="font-display text-2xl font-bold">{p.name}</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {p.desc}
              </p>
              <div className="mt-6 flex items-end gap-1">
                <span className="font-display text-5xl font-black tracking-[-0.03em]">
                  {p.price}
                </span>
                {p.cadence && (
                  <span className="mb-2 text-sm text-muted-foreground">
                    {p.cadence}
                  </span>
                )}
              </div>
              <ul className="mt-8 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={isLogged ? "/app" : "/cadastro"}
                className={`mt-10 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-bold transition-transform hover:scale-[1.02] ${
                  p.highlight
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                {p.cta}
                <ArrowUpRight className="h-5 w-5" />
              </Link>
            </motion.div>
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
    a: "Pra médicos formados fora do Brasil que vão prestar Revalida INEP. Funciona tanto pra primeira fase quanto pra prática.",
  },
  {
    q: "Como funciona o grupo de cinco alunos?",
    a: "A cada ciclo abrimos turmas pequenas. O mentor acompanha o grupo do diagnóstico até a véspera da prova, com encontros semanais ao vivo.",
  },
  {
    q: "Posso usar só a plataforma, sem mentoria?",
    a: "Sim. O plano Plataforma é mensal e te dá acesso aos checklists, flashcards, simulados cronometrados e resumos.",
  },
  {
    q: "Tem garantia?",
    a: "Sete dias de teste no plano Plataforma. Se não fizer sentido, devolvemos 100% do valor.",
  },
  {
    q: "Funciona no celular?",
    a: "Funciona em qualquer tela. A plataforma é PWA — você instala no celular e estuda offline em modo leitura.",
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
        <h2 className="mt-4 font-display text-4xl font-black leading-[1.05] tracking-[-0.03em] md:text-5xl">
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
        <h2 className="font-display text-4xl font-black leading-[1.02] tracking-[-0.03em] md:text-6xl">
          O próximo nome aprovado <br />
          <span className="text-primary">pode ser o seu.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-muted-foreground md:text-lg">
          Vagas abertas para a turma 2026.1. Cinco médicos. Um mentor. Plataforma
          inclusa. Sem promessas mágicas — só método.
        </p>
        <Link
          to={isLogged ? "/app" : "/cadastro"}
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-4 text-base font-bold text-primary-foreground shadow-[0_20px_60px_-20px_color-mix(in_oklab,var(--primary)_70%,transparent)] transition-transform hover:scale-[1.03]"
        >
          Garantir minha vaga
          <ArrowUpRight className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}

/* ----------------------------- FOOTER ----------------------------- */

function Footer() {
  return (
    <footer className="border-t border-border bg-card/30 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 md:flex-row md:items-center md:px-8">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            REVMED — Mentoria para Revalidação Médica.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:gap-8">
          <a
            href="https://instagram.com/revmedmentoria"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 hover:text-foreground"
          >
            <Instagram className="h-4 w-4" />
            @revmedmentoria
          </a>
          <Link to="/login" className="hover:text-foreground">
            Entrar
          </Link>
          <span className="text-xs">© {new Date().getFullYear()} REVMED</span>
        </div>
      </div>
    </footer>
  );
}