import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useRef } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Brain,
  TrendingUp,
  Users,
  Smartphone,
  Sparkles,
  Heart,
  Baby,
  Activity,
  Scissors,
  HomeIcon,
  Siren,
  MessagesSquare,
  ClipboardList,
  Star,
  ChevronDown,
  Instagram,
  MessageCircle,
  Theater,
  UserRound,
  ClipboardCheck,
  Video,
  Calendar,
  BarChart3,
  Layers,
  Trophy,
  Bell,
  X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Estação Revalida — Treine a prova prática do Revalida" },
      {
        name: "description",
        content:
          "Simule estações clínicas com checklists oficiais, cronômetro e vídeo-chamada integrada. A plataforma premium para sua aprovação no Revalida.",
      },
      { property: "og:title", content: "Estação Revalida — Treine a prova prática do Revalida" },
      {
        property: "og:description",
        content:
          "Checklists oficiais, simulação com 3 papéis, flashcards e correção de professores. Domine a prova prática.",
      },
    ],
  }),
});

const nav = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Simulação", href: "#simulacao" },
  { label: "Recursos", href: "#recursos" },
  { label: "Planos", href: "#planos" },
  { label: "FAQ", href: "#faq" },
];

function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/app", replace: true });
    }
  }, [loading, user, navigate]);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <Stats />
      <HowItWorks />
      <Simulation />
      <Resources />
      <Areas />
      <Plans />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
      <FloatingNotifications />
    </div>
  );
}

/* ---------------- Header ---------------- */
function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground lg:flex">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="transition-colors hover:text-primary">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link to="/login">
            <Button variant="ghost" size="sm">Entrar</Button>
          </Link>
          <Link to="/cadastro">
            <Button size="sm" className="rounded-full bg-mint text-night shadow-glow hover:bg-mint/90">
              Começar agora <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <button
          className="rounded-md p-2 lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
        >
          <div className="flex flex-col gap-1.5">
            <span className="h-0.5 w-5 bg-foreground" />
            <span className="h-0.5 w-5 bg-foreground" />
          </div>
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-3">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                {n.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link to="/login" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full">Entrar</Button>
              </Link>
              <Link to="/cadastro" onClick={() => setOpen(false)}>
                <Button className="w-full bg-mint text-night hover:bg-mint/90">Começar</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-12 lg:px-8 lg:pt-20">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-[600px] w-[600px] rounded-full bg-mint/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-mint-soft/30 blur-[120px]" />

      <div className="container mx-auto grid items-center gap-16 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 space-y-7"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint-soft/40 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
            </span>
            Simulador Premium · Revalida 2026
          </div>

          <h1 className="font-display text-4xl font-extrabold leading-[1.05] text-primary md:text-6xl lg:text-7xl">
            Domine a prova prática com{" "}
            <span className="bg-gradient-to-br from-mint to-primary bg-clip-text text-transparent">
              realismo total.
            </span>
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Simule estações clínicas com checklists oficiais, cronômetro de prova e{" "}
            <strong className="text-foreground">vídeo-chamada integrada para 3 papéis</strong> —
            candidato, paciente ator e banca. Treine como se já estivesse no dia.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/cadastro">
              <Button
                size="lg"
                className="h-14 rounded-2xl bg-mint px-8 text-base font-bold text-night shadow-glow hover:scale-[1.02] hover:bg-mint/90"
              >
                Começar meu treino
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#simulacao">
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-2xl border-2 px-8 text-base font-bold"
              >
                Ver como funciona
              </Button>
            </a>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <div className="flex -space-x-3">
              {[
                "from-mint to-mint-soft",
                "from-primary to-mint",
                "from-mint-soft to-primary",
              ].map((g, i) => (
                <div
                  key={i}
                  className={`h-10 w-10 rounded-full border-2 border-background bg-gradient-to-br ${g}`}
                />
              ))}
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-mint-soft text-[10px] font-bold text-primary">
                +1k
              </div>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              <span className="text-foreground">+1.200 médicos</span> treinando hoje
            </p>
          </div>
        </motion.div>

        <HeroVisual />
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="relative"
    >
      {/* Outer frame */}
      <div className="relative rounded-[32px] bg-night p-2 shadow-2xl shadow-primary/30">
        <div className="relative aspect-[5/4] overflow-hidden rounded-[24px] bg-gradient-to-br from-primary via-primary to-night">
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle, var(--mint) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Top cards */}
          <div className="absolute left-5 right-5 top-5 flex justify-between gap-3">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                Cronômetro
              </p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums text-white">
                07:42
              </p>
            </motion.div>
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="rounded-2xl border border-mint/40 bg-mint/20 p-4 text-center backdrop-blur-xl"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-mint-soft">
                Nota
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-mint">8.7</p>
            </motion.div>
          </div>

          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-4 py-2 backdrop-blur-sm">
              <Video className="h-4 w-4 text-mint" />
              <span className="text-xs font-semibold text-white">Sala ao vivo · 3 papéis</span>
            </div>
          </div>

          {/* Bottom checklist card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="absolute bottom-5 left-5 right-5 rounded-2xl border border-border bg-card p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Checklist oficial
                </span>
              </div>
              <span className="text-[10px] font-bold text-mint">85%</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-4 w-4 text-mint" />
                <span className="text-foreground/80">Anamnese completa</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-4 w-4 text-mint" />
                <span className="text-foreground/80">Exame físico dirigido</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="h-4 w-4 rounded-full border-2 border-mint" />
                <span className="text-muted-foreground">Hipótese diagnóstica</span>
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "85%" }}
                transition={{ delay: 1, duration: 1.2, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-mint to-primary"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating side badge */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="absolute -right-4 top-1/2 hidden -translate-y-1/2 rounded-2xl border border-border bg-card p-4 shadow-elegant md:block"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mint-soft">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold">+42 estações</p>
            <p className="text-[10px] text-muted-foreground">esta semana</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Stats with animated counters ---------------- */
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: 1.5, bounce: 0 });
  const display = useTransform(spring, (v) =>
    value >= 100 ? Math.round(v).toLocaleString("pt-BR") : v.toFixed(1).replace(".", ",")
  );
  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, mv, value]);
  return (
    <span ref={ref}>
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}

function Stats() {
  const stats = [
    { value: 120, suffix: "+", label: "Estações clínicas" },
    { value: 600, suffix: "+", label: "Itens de checklist" },
    { value: 1200, suffix: "+", label: "Médicos ativos" },
    { value: 8.4, suffix: "", label: "Nota média de evolução" },
  ];
  return (
    <section className="container mx-auto px-4 pb-20 lg:px-8">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-card md:p-12">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-4xl font-extrabold text-primary md:text-5xl">
                <AnimatedNumber value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- How it works ---------------- */
function HowItWorks() {
  const steps = [
    {
      icon: ClipboardList,
      title: "Escolha a estação",
      desc: "Filtre por especialidade, dificuldade e tempo para focar no seu ponto fraco.",
    },
    {
      icon: Clock,
      title: "Ative o cronômetro",
      desc: "Leia o caso e simule o tempo real da banca. Sem checklist à vista, igual à prova.",
    },
    {
      icon: ClipboardCheck,
      title: "Treine o checklist",
      desc: "Sua banca (ou IA) marca o que você fez ou deixou de fazer durante a estação.",
    },
    {
      icon: BarChart3,
      title: "Receba feedback",
      desc: "Veja sua nota, pontos fortes e fracos, e o plano de revisão para a próxima.",
    },
  ];
  return (
    <section id="como-funciona" className="container mx-auto px-4 py-20 lg:px-8 lg:py-28">
      <SectionTitle eyebrow="Metodologia" title="Quatro passos para a aprovação" />
      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="group relative rounded-3xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-mint/50 hover:shadow-elegant"
          >
            <span className="absolute right-5 top-4 font-display text-5xl font-extrabold text-muted/30 transition-colors group-hover:text-mint-soft/60">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-soft/50">
              <s.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display text-lg font-bold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Simulation (3 roles) ---------------- */
function Simulation() {
  const roles = [
    {
      icon: UserRound,
      title: "Candidato",
      desc: "Você atua no caso clínico sem ver o checklist — exatamente como na prova real.",
      highlight: false,
    },
    {
      icon: Theater,
      title: "Paciente ator",
      desc: "Recebe um roteiro com história, emoções e o que só revelar se for perguntado.",
      highlight: false,
    },
    {
      icon: ClipboardCheck,
      title: "Banca examinadora",
      desc: "Corrige o candidato pelo checklist oficial, pontua e devolve feedback no fim.",
      highlight: true,
    },
  ];

  return (
    <section id="simulacao" className="relative overflow-hidden bg-night py-24 text-white lg:py-32">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle, var(--mint) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-mint/10 blur-[120px]" />

      <div className="container relative mx-auto grid gap-16 px-4 lg:grid-cols-2 lg:px-8">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-mint-soft">
            <Sparkles className="h-3.5 w-3.5" />
            Diferencial exclusivo
          </div>
          <h2 className="font-display text-4xl font-extrabold leading-tight md:text-5xl">
            Treine em equipe,{" "}
            <span className="bg-gradient-to-br from-mint to-mint-soft bg-clip-text text-transparent">
              aprenda em 3 dimensões.
            </span>
          </h2>
          <p className="max-w-lg text-lg leading-relaxed text-white/70">
            Nossa sala de vídeo integrada permite que você troque de perspectiva. Ao atuar como
            banca, você entende exatamente o que o avaliador procura no Revalida.
          </p>
          <ul className="space-y-3 pt-2">
            {[
              "Vídeo-chamada nativa, sem precisar de Zoom ou Meet",
              "Compartilhe um código e treine com qualquer colega",
              "Cada papel vê apenas o conteúdo do seu perfil",
              "Feedback consolidado no fim da sala",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-mint" />
                <span className="text-white/80">{item}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-4">
            <Link to="/cadastro">
              <Button
                size="lg"
                className="h-12 rounded-xl bg-mint px-6 font-bold text-night hover:bg-mint/90"
              >
                Criar minha sala
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-5">
          {roles.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className={`flex items-center gap-5 rounded-3xl border p-6 transition-colors ${
                r.highlight
                  ? "border-mint/40 bg-mint/15"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                  r.highlight ? "bg-mint text-night" : "bg-white/10 text-mint"
                }`}
              >
                <r.icon className="h-7 w-7" />
              </div>
              <div>
                <h4 className="font-display text-xl font-bold">{r.title}</h4>
                <p className="mt-1 text-sm text-white/60">{r.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Resources (real features) ---------------- */
function Resources() {
  const features = [
    {
      icon: ClipboardCheck,
      title: "Checklists oficiais",
      desc: "Itens avaliativos por categoria, alinhados aos critérios do INEP.",
    },
    {
      icon: Clock,
      title: "Cronômetro integrado",
      desc: "Treine no tempo real da prova, com alerta no minuto final.",
    },
    {
      icon: Video,
      title: "Vídeo-chamada nativa",
      desc: "Sala ao vivo com 3 papéis, sem instalar nada extra.",
    },
    {
      icon: Brain,
      title: "Flashcards",
      desc: "Revisão espaçada para fixar critérios e condutas que mais caem.",
    },
    {
      icon: Layers,
      title: "Resumos",
      desc: "Conteúdo objetivo escrito por médicos, com foco no que cai na prova.",
    },
    {
      icon: TrendingUp,
      title: "Histórico e desempenho",
      desc: "Gráficos por competência e evolução por especialidade ao longo do tempo.",
    },
    {
      icon: Calendar,
      title: "Cronograma de estudos",
      desc: "Plano semanal personalizável para você não perder o ritmo.",
    },
    {
      icon: Users,
      title: "Correção do professor",
      desc: "Feedback humano detalhado para alunos de mentoria.",
    },
    {
      icon: Smartphone,
      title: "App instalável (PWA)",
      desc: "Treine pelo celular como se fosse um aplicativo nativo.",
    },
  ];
  return (
    <section id="recursos" className="container mx-auto px-4 py-20 lg:px-8 lg:py-28">
      <SectionTitle eyebrow="Recursos" title="Tudo que você precisa para treinar com método" />
      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
            className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-mint/40 hover:shadow-card"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-mint-soft/50 transition-colors group-hover:bg-mint/20">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display font-bold">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Areas ---------------- */
function Areas() {
  const areas = [
    { icon: Activity, name: "Clínica Médica", count: "28 estações" },
    { icon: Scissors, name: "Cirurgia", count: "18 estações" },
    { icon: Baby, name: "Pediatria", count: "22 estações" },
    { icon: Heart, name: "Ginecologia & Obstetrícia", count: "24 estações" },
    { icon: HomeIcon, name: "Medicina de Família", count: "20 estações" },
    { icon: MessagesSquare, name: "Comunicação médico-paciente", count: "12 estações" },
    { icon: Siren, name: "Emergência", count: "10 estações" },
    { icon: ClipboardList, name: "Exames e condutas", count: "14 estações" },
  ];
  return (
    <section className="bg-card/40 py-20 lg:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <SectionTitle
          eyebrow="Áreas de treino"
          title="Estações organizadas por especialidade"
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map((a, i) => (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.35, delay: (i % 4) * 0.05 }}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-mint/40 hover:shadow-card"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mint-soft/50 transition-colors group-hover:bg-mint/20">
                <a.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="font-semibold leading-tight">{a.name}</div>
                <div className="text-xs text-muted-foreground">{a.count}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Plans ---------------- */
const plans = [
  {
    name: "Ator",
    badge: "Iniciante",
    desc: "Atue como paciente em salas e avalie candidatos.",
    price: "R$ 97",
    period: "/até a prova",
    cta: "Quero ser Ator",
    highlight: false,
    features: [
      "Acesso até o dia da prova",
      "Atuação como paciente ator",
      "Banco de checklists do paciente",
      "Libere impressos e materiais",
    ],
  },
  {
    name: "Completo",
    badge: "Mais escolhido",
    desc: "Plataforma completa, pagamento único até a prova.",
    price: "R$ 497",
    originalPrice: "R$ 597",
    period: "/até a prova",
    cta: "Quero o Completo",
    highlight: true,
    features: [
      "Treine como candidato, ator e banca",
      "+120 estações clínicas",
      "+600 itens de checklist",
      "Flashcards e resumos",
      "Cronograma e histórico completo",
      "Vídeo-chamada integrada",
      "Grupo de WhatsApp + suporte",
    ],
  },
  {
    name: "Completo Mensal",
    badge: "Recorrente",
    desc: "Mesmo acesso do Completo, cobrado mês a mês.",
    price: "R$ 347",
    period: "/mês",
    cta: "Assinar mensal",
    highlight: false,
    features: [
      "Acesso a tudo enquanto estiver ativo",
      "Treine como candidato e como ator",
      "+600 checklists e flashcards",
      "Cancele quando quiser",
    ],
  },
];

function Plans() {
  return (
    <section id="planos" className="container mx-auto px-4 py-20 lg:px-8 lg:py-28">
      <SectionTitle eyebrow="Planos" title="Escolha o ritmo do seu treino" />
      <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
        Comece hoje. Cancele quando quiser no plano mensal — sem fidelidade.
      </p>
      <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
        {plans.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`relative flex flex-col rounded-3xl border bg-card p-8 transition-all ${
              p.highlight
                ? "border-2 border-mint shadow-glow lg:-translate-y-4 lg:scale-105"
                : "border-border shadow-card hover:border-mint/40"
            }`}
          >
            {p.highlight && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-mint px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-night hover:bg-mint">
                {p.badge}
              </Badge>
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {!p.highlight && p.badge}
              {p.highlight && "Formação completa"}
            </span>
            <h3 className="mt-1 font-display text-2xl font-bold">{p.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>

            <div className="mt-6 flex items-baseline gap-2">
              {p.originalPrice && (
                <span className="text-base text-muted-foreground line-through">
                  {p.originalPrice}
                </span>
              )}
              <span className="font-display text-4xl font-extrabold text-primary">{p.price}</span>
              <span className="text-sm text-muted-foreground">{p.period}</span>
            </div>

            <ul className="mt-6 space-y-3 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link to="/cadastro" className="mt-auto pt-8">
              <Button
                size="lg"
                className={`w-full rounded-xl font-bold ${
                  p.highlight
                    ? "bg-mint text-night shadow-glow hover:bg-mint/90"
                    : "bg-background text-foreground hover:bg-muted"
                }`}
                variant={p.highlight ? "default" : "outline"}
              >
                {p.cta}
              </Button>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Testimonials ---------------- */
const testimonials = [
  {
    name: "Dra. Marina L.",
    role: "Aprovada · Revalida 2025",
    text: "Treinar por estação com cronômetro mudou meu desempenho. Cheguei na prova com a sensação de já ter passado por aquilo.",
  },
  {
    name: "Dr. Rafael S.",
    role: "Estudante",
    text: "Os checklists me ajudaram a estruturar o raciocínio e perder o medo do tempo. O feedback é o melhor da plataforma.",
  },
  {
    name: "Dra. Camila T.",
    role: "Professora convidada",
    text: "Como mentora, consigo corrigir meus alunos com profundidade e acompanhar cada evolução. Recomendo demais.",
  },
];

function Testimonials() {
  return (
    <section className="bg-card/40 py-20 lg:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <SectionTitle eyebrow="Depoimentos" title="O que dizem quem treina conosco" />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-card"
            >
              <div className="flex gap-0.5 text-mint">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Star key={k} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 leading-relaxed text-foreground/90">"{t.text}"</p>
              <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-mint to-primary" />
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
const faqs = [
  {
    q: "O app substitui um curso presencial?",
    a: "Não. Ele é um complemento poderoso para a parte prática, com simulação, cronômetro, vídeo-chamada e feedback que dificilmente se replicam fora da prova.",
  },
  {
    q: "Como funciona a sala com 3 papéis?",
    a: "Você cria uma sala e compartilha o código. Cada participante entra como candidato, paciente ator ou banca — cada um vê apenas o conteúdo do seu papel, com vídeo integrado.",
  },
  {
    q: "Posso treinar pelo celular?",
    a: "Sim. O app é mobile-first e pode ser instalado como PWA, funcionando como aplicativo nativo no seu celular.",
  },
  {
    q: "Os checklists são oficiais?",
    a: "São construídos com base nos critérios do INEP por professores médicos. Mentores e admins podem editar e criar novas estações.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "No plano Completo Mensal, sim — sem fidelidade. O Completo até a prova é pagamento único.",
  },
  {
    q: "Existe correção humana?",
    a: "Sim, para alunos do plano de mentoria. Professores avaliam tentativas, dão nota e escrevem feedback individual.",
  },
];

function FAQ() {
  return (
    <section id="faq" className="container mx-auto max-w-3xl px-4 py-20 lg:px-8 lg:py-28">
      <SectionTitle eyebrow="FAQ" title="Perguntas frequentes" />
      <div className="mt-12 space-y-3">
        {faqs.map((f, i) => (
          <FAQItem key={i} q={f.q} a={f.a} />
        ))}
      </div>
    </section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card transition-all">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left font-medium"
      >
        <span>{q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-mint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{a}</div>
      )}
    </div>
  );
}

/* ---------------- Final CTA ---------------- */
function FinalCTA() {
  return (
    <section className="container mx-auto px-4 py-20 lg:px-8">
      <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-primary via-primary to-night p-10 text-center text-white md:p-16">
        <div className="pointer-events-none absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full bg-mint/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-mint/15 blur-[100px]" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold leading-tight md:text-5xl">
            Pronto pra treinar como na{" "}
            <span className="bg-gradient-to-br from-mint to-mint-soft bg-clip-text text-transparent">
              estação real?
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-white/70">
            Acesso imediato. Comece a treinar nos próximos 2 minutos.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/cadastro">
              <Button
                size="lg"
                className="h-14 rounded-2xl bg-mint px-10 text-base font-bold text-night shadow-glow hover:scale-[1.02] hover:bg-mint/90"
              >
                Começar meu treino agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function Footer() {
  return (
    <footer className="border-t border-border bg-night text-white/80">
      <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <Logo variant="light" />
          <p className="mt-5 max-w-sm text-sm text-white/60">
            Plataforma premium de preparação para a prova prática do Revalida. Treine, corrija,
            repita e evolua.
          </p>
          <div className="mt-6 flex gap-3">
            <a
              href="https://wa.me/5500000000000"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 transition-colors hover:bg-white/10"
              aria-label="WhatsApp"
            >
              <MessageCircle className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 transition-colors hover:bg-white/10"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Produto</div>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li><a href="#como-funciona">Como funciona</a></li>
            <li><a href="#simulacao">Simulação</a></li>
            <li><a href="#recursos">Recursos</a></li>
            <li><a href="#planos">Planos</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Legal</div>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li><a href="#">Termos de uso</a></li>
            <li><a href="#">Política de privacidade</a></li>
            <li><a href="#">Contato</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Estação Revalida · Conteúdo educacional autoral. Não
        afiliado ao INEP ou ao governo.
      </div>
    </footer>
  );
}

/* ---------------- Section title helper ---------------- */
function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint-soft/40 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-mint" />
        {eyebrow}
      </div>
      <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight md:text-4xl lg:text-5xl">
        {title}
      </h2>
    </div>
  );
}

/* ---------------- Floating social-proof notifications ---------------- */
type FakeNotif = {
  kind: "compra" | "conquista" | "aprovado" | "online";
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
};

const FAKE_NOTIFS: FakeNotif[] = [
  { kind: "compra", title: "Dr. Lucas R. assinou o plano Completo", subtitle: "há 2 minutos · São Paulo", icon: Sparkles },
  { kind: "conquista", title: "Ana acabou de completar 50 estações", subtitle: "Clínica Médica · há 4 min", icon: Trophy },
  { kind: "aprovado", title: "João foi aprovado no Revalida 2025.1", subtitle: "Treinou 142 estações", icon: CheckCircle2 },
  { kind: "online", title: "+128 médicos estudando agora", subtitle: "Salas ao vivo abertas", icon: Users },
  { kind: "compra", title: "Dra. Marina P. assinou o Completo Mensal", subtitle: "há 7 minutos · Recife", icon: Sparkles },
  { kind: "conquista", title: "Bruno bateu 90% no checklist de Pediatria", subtitle: "há 9 min", icon: Trophy },
  { kind: "aprovado", title: "Camila foi aprovada · Revalida 2024.2", subtitle: "Treinou 98 estações", icon: CheckCircle2 },
  { kind: "compra", title: "Dr. Pedro H. assinou o Ator", subtitle: "há 12 min · Curitiba", icon: Sparkles },
];

function FloatingNotifications() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const showT = setTimeout(() => setVisible(true), 3500);
    return () => clearTimeout(showT);
  }, [dismissed]);

  useEffect(() => {
    if (dismissed || !visible) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % FAKE_NOTIFS.length);
        setVisible(true);
      }, 400);
    }, 6500);
    return () => clearInterval(id);
  }, [dismissed, visible]);

  if (dismissed) return null;

  const n = FAKE_NOTIFS[index];
  const Icon = n.icon;
  const tone =
    n.kind === "aprovado"
      ? "bg-mint text-night"
      : n.kind === "online"
      ? "bg-primary text-white"
      : n.kind === "conquista"
      ? "bg-mint-soft text-primary"
      : "bg-mint text-night";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed bottom-4 left-4 z-[60] max-w-xs sm:bottom-6 sm:left-6"
    >
      <div className="relative flex items-center gap-3 rounded-2xl border border-border bg-card p-3 pr-9 shadow-elegant">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-foreground">{n.title}</p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{n.subtitle}</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
