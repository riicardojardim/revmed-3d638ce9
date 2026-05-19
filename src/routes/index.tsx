import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useRef, type ComponentType, type ReactNode } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
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
  MessageSquare,
  MessagesSquare,
  ClipboardList,
  ListChecks,
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
  X,
  Mic,
  MicOff,
  ShieldCheck,
  MapPin,
  Stethoscope,
  ArrowLeft,
  FileText,
  StickyNote,
  Inbox,
  Eye,
  History,
  Gift,
  Play,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import candidate1 from "@/assets/candidate-1.jpg";
import candidate2 from "@/assets/candidate-2.jpg";
import candidate3 from "@/assets/candidate-3.jpg";
import candidate4 from "@/assets/candidate-4.jpg";
import candidate5 from "@/assets/candidate-5.jpg";
import candidate6 from "@/assets/candidate-6.jpg";
import candidate7 from "@/assets/candidate-7.jpg";

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
          "Checklists oficiais, simulação entre candidato e ator, flashcards e correção de professores. Domine a prova prática.",
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
      <TrustBar />
      <Stats />
      <HowItWorks />
      <BeforeAfter />
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
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground lg:flex">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="transition-colors hover:text-primary">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
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
    <section className="relative overflow-hidden px-4 pb-20 pt-10 lg:px-8 lg:pt-16">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-[560px] w-[560px] rounded-full bg-mint/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-[380px] w-[380px] rounded-full bg-mint-soft/25 blur-[120px]" />

      <div className="container mx-auto grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint-soft/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint" />
            </span>
            Simulador oficial · Revalida 2026
          </div>

          <h1 className="font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-primary sm:text-4xl md:text-5xl lg:text-[3.25rem]">
            Treine a prova prática do Revalida com{" "}
            <span className="bg-gradient-to-br from-mint to-primary bg-clip-text text-transparent">
              realismo de estação real.
            </span>
          </h1>

          <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
            Estações clínicas com checklists oficiais, cronômetro e{" "}
            <strong className="text-foreground">vídeo-chamada nativa entre candidato e ator</strong>.
            Chegue na prova já tendo feito a prova.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link to="/cadastro">
              <Button
                size="lg"
                className="h-12 rounded-xl bg-mint px-6 text-sm font-bold text-night shadow-glow transition-transform hover:scale-[1.02] hover:bg-mint/90"
              >
                Quero treinar minha 1ª estação grátis
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <a href="#simulacao">
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-2 px-6 text-sm font-bold"
              >
                Ver como funciona
              </Button>
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-mint" /> 7 dias de garantia incondicional</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-mint" /> Sem cartão pra começar</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-mint" /> Cancele em 2 cliques</span>
          </div>


          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {[candidate3, candidate6, candidate5, candidate4].map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-full border-2 border-background object-cover"
                  />
                ))}
              </div>
              <div className="text-xs leading-tight">
                <div className="flex items-center gap-1 text-mint">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="h-3 w-3 fill-current" />
                  ))}
                </div>
                <p className="mt-0.5 font-semibold text-foreground">
                  +1.200 candidatos treinando hoje
                </p>
              </div>
            </div>
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
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      className="relative"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/20">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning" />
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
          </div>
          <div className="flex max-w-[250px] items-center gap-1.5 truncate rounded-md bg-background px-2.5 py-0.5 text-[10px] text-muted-foreground sm:max-w-none">
            <ShieldCheck className="h-3 w-3 text-mint" />
            estacaorevalida.com.br/app/sala/MX9K2/candidato
          </div>
          <div className="w-12" />
        </div>

        <div className="bg-background/70 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <button className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Sair
            </button>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="rounded-full bg-mint/15 px-2 py-0.5 font-bold text-mint">Candidato</span>
              <span>•</span>
              <span>Clínica Médica</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-mint/20 bg-gradient-hero p-4 text-white shadow-elegant">
            <div
              className="pointer-events-none absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "linear-gradient(var(--mint) 1px, transparent 1px), linear-gradient(90deg, var(--mint) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-mint">
                <ShieldCheck className="h-2.5 w-2.5" /> Estação em andamento
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-bold leading-tight md:text-lg">
                    Estação de Clínica Médica
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] text-white/70">
                    <span className="rounded-md bg-mint px-1.5 py-0.5 font-bold text-night">CLM</span>
                    <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-mint" /> Dor torácica</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> 10 min</span>
                  </div>
                </div>
                <span className="rounded-md border border-white/20 bg-white/5 px-2 py-1 font-mono text-[10px] tracking-wider">
                  MX9K2
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_176px]">
            <div className="space-y-3">
              <MockStationBlock icon={MessageSquare} title="Cenário de atuação">
                Paciente chega ao pronto atendimento com dor torácica opressiva. Conduza anamnese, solicite exames e indique a conduta inicial.
              </MockStationBlock>

              <MockStationBlock icon={ListChecks} title="Nos 10 minutos, você deverá">
                <ul className="space-y-1">
                  <li>• Avaliar sinais de gravidade e fatores de risco.</li>
                  <li>• Solicitar ECG, troponina e monitorização.</li>
                  <li>• Explicar hipótese e conduta ao paciente.</li>
                </ul>
              </MockStationBlock>

              <MockStationBlock
                icon={Inbox}
                title="Materiais recebidos"
                right={<Badge variant="outline" className="border-white/30 text-white">2</Badge>}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {["ECG de 12 derivações", "Troponina I — laudo"].map((name, i) => (
                    <div key={name} className="rounded-lg border border-mint/35 bg-mint/5 p-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <FileText className="h-3 w-3 text-mint" /> {name}
                      </div>
                      <div className="mt-1 text-[9px] text-muted-foreground">
                        {i === 0 ? "clique para ver a imagem" : "resultado entregue pelo ator"}
                      </div>
                    </div>
                  ))}
                </div>
              </MockStationBlock>
            </div>

            <aside className="space-y-3">
              <div className="rounded-xl border border-border bg-gradient-hero p-3 text-white shadow-elegant">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-white/70">
                  <span>Em andamento</span>
                  <Eye className="h-3 w-3" />
                </div>
                <div className="mt-2 rounded-lg bg-mint/15 px-3 py-4 text-center font-display text-3xl font-bold tabular-nums">
                  07:42
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <StickyNote className="h-3 w-3 text-primary" /> Anotações
                </div>
                <div className="space-y-1.5 text-[9.5px] leading-snug text-foreground/80">
                  <p>• Dor 7/10 há 40min</p>
                  <p>• HAS, tabagismo prévio</p>
                  <p className="rounded bg-mint/20 px-1 py-0.5 font-semibold text-primary">HD: SCA · AAS + ECG</p>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="absolute bottom-3 right-3 w-[190px] overflow-hidden rounded-xl border border-border bg-background shadow-elegant">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-2 py-1 text-[10px] font-semibold">
            <span className="inline-flex items-center gap-1"><Video className="h-3 w-3 text-primary" /> Vídeo</span>
            <span className="text-muted-foreground">2 / 2</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 bg-night p-1.5">
            <VideoTile src={candidate6} name="Você" role="Candidato" active />
            <VideoTile src={candidate3} name="Ana" role="Atriz" />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        className="absolute -right-3 -top-3 hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-elegant md:flex"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint-soft">
          <Trophy className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-[11px] font-bold leading-tight">+42 estações</p>
          <p className="text-[9px] text-muted-foreground">esta semana</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4 }}
        className="absolute -bottom-3 left-4 hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-elegant md:flex"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
        </span>
        <span className="text-[11px] font-semibold">128 salas ao vivo</span>
      </motion.div>
    </motion.div>
  );
}

function MockStationBlock({
  icon: Icon,
  title,
  right,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-2 bg-gradient-hero px-3 py-2 text-[10px] font-bold text-white shadow-elegant">
        <span className="inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-mint" /> {title}
        </span>
        {right}
      </header>
      <div className="p-3 text-[11px] leading-snug text-foreground/85">{children}</div>
    </section>
  );
}

function VideoTile({
  src,
  name,
  role,
  active,
  wide,
}: {
  src: string;
  name: string;
  role: string;
  active?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border ${
        active ? "border-mint/70 ring-2 ring-mint/30" : "border-border"
      } bg-night ${wide ? "aspect-[16/7]" : "aspect-[4/3]"}`}
    >
      <img src={src} alt={name} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
        <div className="flex items-center gap-1 text-[10px] font-semibold text-white">
          {active && <span className="h-1.5 w-1.5 rounded-full bg-mint" />}
          {name}
          <span className="text-white/60">· {role}</span>
        </div>
        {active ? (
          <Mic className="h-3 w-3 text-mint" />
        ) : (
          <MicOff className="h-3 w-3 text-white/60" />
        )}
      </div>
    </div>
  );
}

/* ---------------- Trust bar ---------------- */
function TrustBar() {
  return (
    <div className="border-y border-border bg-card/40">
      <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:px-8">
        <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-mint" /> Pagamento seguro</span>
        <span className="flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5 text-mint" /> Feito por médicos</span>
        <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-mint" /> Atualizado para 2026</span>
        <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-mint" /> Instalável (PWA)</span>
      </div>
    </div>
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
    { value: 1200, suffix: "+", label: "Candidatos ativos" },
    { value: 8.4, suffix: "", label: "Nota média" },
  ];
  return (
    <section className="container mx-auto px-4 py-14 lg:px-8">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card md:p-8">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-2xl font-extrabold text-primary md:text-3xl">
                <AnimatedNumber value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
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
    { icon: ClipboardList, title: "Escolha a estação", desc: "Filtre por especialidade, dificuldade e tempo." },
    { icon: Clock, title: "Ative o cronômetro", desc: "Leia o caso e simule o tempo real da prova." },
    { icon: ClipboardCheck, title: "Treine o checklist", desc: "O ator marca cada item — ou a IA, se você estiver sozinho." },
    { icon: BarChart3, title: "Receba feedback", desc: "Nota, pontos fortes/fracos e plano de revisão." },
  ];
  return (
    <section id="como-funciona" className="container mx-auto px-4 py-16 lg:px-8 lg:py-24">
      <SectionTitle eyebrow="Metodologia" title="Quatro passos para a aprovação" />
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="group relative rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-mint/50 hover:shadow-elegant"
          >
            <span className="absolute right-4 top-3 font-display text-3xl font-extrabold text-muted/30 transition-colors group-hover:text-mint-soft/60">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-mint-soft/50">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display text-base font-bold">{s.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Before / After ---------------- */
function BeforeAfter() {
  const before = [
    "Lê checklist 10x, decora itens soltos e nunca diz em voz alta",
    "Chega na estação e congela na hora de conduzir o paciente",
    "Não sabe se tá no tempo certo — perde ponto por timing",
    "Estuda sozinho, sem ninguém pra apontar o que tá errado",
    "Descobre o que esqueceu só DEPOIS da prova",
  ];
  const after = [
    "Conduz a estação em voz alta, igual no dia da prova",
    "Já passou pelo nervosismo dezenas de vezes — calejado",
    "Cronômetro real, divisão de tempo treinada na prática",
    "Ator (ou IA) marca cada erro na hora, com feedback",
    "Sai de cada simulado sabendo exatamente o que revisar",
  ];

  return (
    <section className="bg-gradient-to-b from-background to-mint-soft/30 py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <SectionTitle
          eyebrow="A diferença"
          title="Estudar sozinho vs. treinar na Estação Revalida"
        />
        <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/15">
                <X className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">Estudando sozinho</h3>
            </div>
            <ul className="space-y-2.5">
              {before.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative rounded-2xl border-2 border-mint bg-card p-6 shadow-glow">
            <Badge className="absolute -top-2.5 left-5 rounded-full bg-mint px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-night hover:bg-mint">
              Com a Estação
            </Badge>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-mint/15">
                <CheckCircle2 className="h-5 w-5 text-mint" />
              </div>
              <h3 className="font-display text-lg font-bold text-primary">Treinando aqui</h3>
            </div>
            <ul className="space-y-2.5">
              {after.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-8 flex max-w-5xl flex-col items-center justify-between gap-4 rounded-2xl border border-mint/30 bg-mint-soft/40 p-5 sm:flex-row">
          <p className="text-sm font-semibold text-primary">
            Pare de adivinhar como vai ser a prova. Faça a prova antes da prova.
          </p>
          <Link to="/cadastro">
            <Button className="h-10 rounded-xl bg-mint px-5 text-sm font-bold text-night hover:bg-mint/90">
              Treinar minha 1ª estação grátis
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}


/* ---------------- Simulation (2 roles: candidato + ator) ---------------- */
function Simulation() {
  const roles = [
    {
      icon: UserRound,
      title: "Candidato",
      desc: "Atua no caso clínico sem ver o checklist — exatamente como na prova real. Vê impressos, faz anotações e conduz a estação.",
      highlight: true,
    },
    {
      icon: Theater,
      title: "Paciente ator",
      desc: "Recebe roteiro com história, emoções, gatilhos de fala e marca o checklist oficial enquanto o candidato conduz.",
      highlight: false,
    },
    {
      icon: Video,
      title: "Vídeo chamada integrada",
      desc: "Áudio e vídeo nativos na plataforma — sem Zoom, sem Meet, sem instalar nada. Entrou no código, já tá em estação.",
      highlight: false,
    },
    {
      icon: History,
      title: "Histórico de estações",
      desc: "Cada simulação fica salva com checklist, anotações e desempenho. Reveja o que errou e acompanhe sua evolução semana a semana.",
      highlight: false,
    },
  ];

  return (
    <section id="simulacao" className="relative overflow-hidden bg-night py-20 text-white lg:py-28">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle, var(--mint) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-mint/10 blur-[120px]" />

      <div className="container relative mx-auto grid gap-12 px-4 lg:grid-cols-2 lg:px-8">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-mint-soft">
            <Sparkles className="h-3 w-3" />
            Diferencial exclusivo
          </div>
          <h2 className="font-display text-3xl font-extrabold leading-tight md:text-4xl">
            Treine em dupla,{" "}
            <span className="bg-gradient-to-br from-mint to-mint-soft bg-clip-text text-transparent">
              aprenda dos dois lados.
            </span>
          </h2>
          <p className="max-w-lg text-base leading-relaxed text-white/70">
            Vídeo nativo na plataforma. Hoje você é candidato, amanhã é ator —
            ver o checklist por trás muda como você responde na prova.
          </p>
          <ul className="space-y-2.5 pt-1">
            {[
              "Vídeo nativo — sem Zoom, sem Meet, sem instalar nada",
              "Código de sala pra treinar com qualquer colega",
              "Cada papel vê só o conteúdo do seu perfil",
              "Treine sozinho também: IA assume o papel do ator",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                <span className="text-white/80">{item}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-3">
            <Link to="/cadastro">
              <Button size="lg" className="h-11 rounded-xl bg-mint px-5 text-sm font-bold text-night hover:bg-mint/90">
                Criar minha sala
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {roles.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: i * 0.12 }}
              className={`flex items-center gap-4 rounded-2xl border p-5 transition-colors ${
                r.highlight ? "border-mint/40 bg-mint/15" : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  r.highlight ? "bg-mint text-night" : "bg-white/10 text-mint"
                }`}
              >
                <r.icon className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-display text-base font-bold">{r.title}</h4>
                <p className="mt-0.5 text-xs text-white/60">{r.desc}</p>
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
    { icon: ClipboardCheck, title: "Checklists oficiais", desc: "Itens avaliativos por categoria, alinhados ao INEP." },
    { icon: Clock, title: "Cronômetro integrado", desc: "Tempo real da prova, com alerta no minuto final." },
    { icon: Video, title: "Vídeo-chamada nativa", desc: "Sala ao vivo entre candidato e ator, sem instalar nada." },
    { icon: Brain, title: "Flashcards", desc: "Revisão espaçada dos critérios que mais caem." },
    { icon: Layers, title: "Resumos", desc: "Conteúdo objetivo escrito por médicos." },
    { icon: TrendingUp, title: "Histórico e desempenho", desc: "Gráficos por competência e evolução por área." },
    { icon: Calendar, title: "Cronograma de estudos", desc: "Plano semanal personalizável." },
    { icon: Users, title: "Correção do professor", desc: "Feedback humano para alunos de mentoria." },
    { icon: Smartphone, title: "App instalável (PWA)", desc: "Treine pelo celular como app nativo." },
  ];
  return (
    <section id="recursos" className="container mx-auto px-4 py-16 lg:px-8 lg:py-24">
      <SectionTitle eyebrow="Recursos" title="Tudo que você precisa para treinar com método" />
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.35, delay: (i % 3) * 0.07 }}
            className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-mint/40 hover:shadow-card"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-mint-soft/50 transition-colors group-hover:bg-mint/20">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display text-sm font-bold">{f.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
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
    { icon: MessagesSquare, name: "Comunicação", count: "12 estações" },
    { icon: Siren, name: "Emergência", count: "10 estações" },
    { icon: ClipboardList, name: "Exames e condutas", count: "14 estações" },
  ];
  return (
    <section className="bg-card/40 py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <SectionTitle eyebrow="Áreas de treino" title="Estações organizadas por especialidade" />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map((a, i) => (
            <motion.div
              key={a.name}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.3, delay: (i % 4) * 0.05 }}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-mint/40 hover:shadow-card"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mint-soft/50 transition-colors group-hover:bg-mint/20">
                <a.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight">{a.name}</div>
                <div className="text-[11px] text-muted-foreground">{a.count}</div>
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
      "Banco de roteiros do paciente",
      "Impressos e materiais liberados",
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
      "Treine como candidato e como ator",
      "+120 estações clínicas",
      "+600 itens de checklist",
      "Flashcards e resumos",
      "Cronograma e histórico completo",
      "Vídeo-chamada integrada",
      "Grupo de WhatsApp + suporte",
    ],
    bonuses: [
      { name: "Banco de 50 casos pediátricos exclusivos", value: "R$ 197" },
      { name: "Aula ao vivo: Erros que reprovam na prática", value: "R$ 297" },
      { name: "Checklist comentado por aprovados 2024", value: "R$ 147" },
    ],
    totalValue: "R$ 1.138",
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
    <section id="planos" className="container mx-auto px-4 py-16 lg:px-8 lg:py-24">
      <SectionTitle eyebrow="Planos" title="Escolha o ritmo do seu treino" />
      <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
        Comece hoje. Cancele quando quiser no plano mensal — sem fidelidade.
      </p>
      <div className="mt-20 grid items-center gap-5 lg:grid-cols-3">
        {plans.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.45, delay: i * 0.08 }}
            className={`relative flex flex-col rounded-2xl border bg-card p-6 transition-all ${
              p.highlight
                ? "border-2 border-mint shadow-glow lg:-my-8 lg:px-7 lg:py-10 lg:scale-[1.03]"
                : "border-border shadow-card hover:border-mint/40"
            }`}
          >
            {p.highlight && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-mint px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-night hover:bg-mint">
                {p.badge}
              </Badge>
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {!p.highlight && p.badge}
              {p.highlight && "Formação completa"}
            </span>
            <h3 className="mt-1 font-display text-xl font-bold">{p.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>

            <div className="mt-5 flex items-baseline gap-2">
              {p.originalPrice && (
                <span className="text-sm text-muted-foreground line-through">{p.originalPrice}</span>
              )}
              <span className="font-display text-3xl font-extrabold text-primary">{p.price}</span>
              <span className="text-xs text-muted-foreground">{p.period}</span>
            </div>

            <ul className="mt-5 space-y-2 text-xs">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {p.bonuses && (
              <div className="mt-5 rounded-xl border border-dashed border-mint/50 bg-mint-soft/30 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                  <Gift className="h-3.5 w-3.5" />
                  Bônus exclusivos por tempo limitado
                </div>
                <ul className="space-y-1.5">
                  {p.bonuses.map((b) => (
                    <li key={b.name} className="flex items-start justify-between gap-2 text-[11px]">
                      <span className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-mint" />
                        <span className="text-foreground">{b.name}</span>
                      </span>
                      <span className="shrink-0 font-bold text-mint line-through opacity-70">{b.value}</span>
                    </li>
                  ))}
                </ul>
                {p.totalValue && (
                  <div className="mt-2.5 flex items-center justify-between border-t border-mint/30 pt-2 text-[11px]">
                    <span className="font-semibold text-muted-foreground">Valor total:</span>
                    <span className="font-display text-sm font-extrabold text-primary line-through">{p.totalValue}</span>
                  </div>
                )}
              </div>
            )}


            <div className="mt-auto pt-6">
              <Link to="/cadastro">
                <Button
                  size="lg"
                  className={`w-full rounded-xl text-sm font-bold ${
                    p.highlight
                      ? "bg-mint text-night shadow-glow hover:bg-mint/90"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                  variant={p.highlight ? "default" : "outline"}
                >
                  {p.cta}
                </Button>
              </Link>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-mint" />
                7 dias de garantia · 100% do dinheiro de volta
              </p>
            </div>

          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Testimonials ---------------- */
const testimonials = [
  {
    name: "Marina Lopes",
    role: "Aprovada · Revalida 2025",
    text: "Treinar por estação com cronômetro mudou meu desempenho. Cheguei na prova com a sensação de já ter passado por aquilo.",
    avatar: candidate1,
  },
  {
    name: "Rafael Santos",
    role: "Candidato · Revalida 2026",
    text: "Os checklists me ajudaram a estruturar o raciocínio e perder o medo do tempo. O feedback é o melhor da plataforma.",
    avatar: candidate2,
  },
  {
    name: "Camila Tavares",
    role: "Professora · mentoria",
    text: "Como mentora, consigo corrigir meus alunos com profundidade e acompanhar cada evolução. Recomendo demais.",
    avatar: candidate3,
  },
  {
    name: "Bruno Almeida",
    role: "Aprovado · Revalida 2024.2",
    text: "A sala em dupla é o que mais se aproxima da prova real. Atuar como ator me fez enxergar tudo o que faltava na minha conduta.",
    avatar: candidate4,
  },
  {
    name: "Letícia Moura",
    role: "Candidata · Revalida 2026",
    text: "App leve, treino pelo celular no intervalo do plantão. Os flashcards salvam minha revisão.",
    avatar: candidate5,
  },
  {
    name: "Felipe Carvalho",
    role: "Aprovado · Revalida 2025.1",
    text: "Saí do achismo. O histórico mostra exatamente onde eu travo e o que treinar na próxima semana.",
    avatar: candidate6,
  },
];

function Testimonials() {
  return (
    <section className="bg-card/40 py-16 lg:py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <SectionTitle eyebrow="Depoimentos" title="O que dizem quem treina com a gente" />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className="flex gap-0.5 text-mint">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Star key={k} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">"{t.text}"</p>
              <div className="mt-4 flex items-center gap-3 border-t border-border pt-3">
                <img
                  src={t.avatar}
                  alt={t.name}
                  width={40}
                  height={40}
                  loading="lazy"
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">{t.role}</div>
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
  { q: "O app substitui um curso presencial?", a: "Não. Ele é um complemento poderoso para a parte prática, com simulação, cronômetro, vídeo-chamada e feedback que dificilmente se replicam fora da prova." },
  { q: "Como funciona a sala em dupla?", a: "Você cria uma sala e compartilha o código. Um entra como candidato e o outro como paciente ator — cada um vê apenas o conteúdo do seu papel, com vídeo integrado. Se estiver sozinho, a IA assume o papel do ator." },
  { q: "Posso treinar pelo celular?", a: "Sim. O app é mobile-first e pode ser instalado como PWA, funcionando como aplicativo nativo no seu celular." },
  { q: "Os checklists são oficiais?", a: "São construídos com base nos critérios do INEP por professores médicos. Mentores e admins podem editar e criar novas estações." },
  { q: "Posso cancelar quando quiser?", a: "No plano Completo Mensal, sim — sem fidelidade. O Completo até a prova é pagamento único." },
  { q: "Existe correção humana?", a: "Sim, para alunos do plano de mentoria. Professores avaliam tentativas, dão nota e escrevem feedback individual." },
];

function FAQ() {
  return (
    <section id="faq" className="container mx-auto max-w-5xl px-4 py-16 lg:px-8 lg:py-24">
      <SectionTitle eyebrow="FAQ" title="Perguntas frequentes" />
      <div className="mt-10 grid gap-3 md:grid-cols-2">
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
    <div className="overflow-hidden rounded-xl border border-border bg-card transition-all">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm font-semibold"
      >
        <span>{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-mint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 text-xs leading-relaxed text-muted-foreground">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Final CTA ---------------- */
function FinalCTA() {
  return (
    <section className="container mx-auto px-4 py-16 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-night p-8 text-center text-white md:p-14">
        <div className="pointer-events-none absolute -right-20 -top-20 h-[380px] w-[380px] rounded-full bg-mint/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-[280px] w-[280px] rounded-full bg-mint/15 blur-[100px]" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-2xl font-extrabold leading-tight md:text-4xl">
            Pronto para treinar como na{" "}
            <span className="bg-gradient-to-br from-mint to-mint-soft bg-clip-text text-transparent">
              estação real?
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
            Acesso imediato. Comece a treinar nos próximos 2 minutos.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/cadastro">
              <Button
                size="lg"
                className="h-12 rounded-xl bg-mint px-8 text-sm font-bold text-night shadow-glow transition-transform hover:scale-[1.02] hover:bg-mint/90"
              >
                Começar meu treino agora
                <ArrowRight className="ml-1.5 h-4 w-4" />
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
      <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <Logo variant="light" />
          <p className="mt-4 max-w-sm text-xs text-white/60">
            Plataforma premium de preparação para a prova prática do Revalida. Treine, corrija,
            repita e evolua.
          </p>
          <div className="mt-5 flex gap-2.5">
            <a
              href="https://wa.me/5500000000000"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 transition-colors hover:bg-white/10"
              aria-label="WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <a
              href="#"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 transition-colors hover:bg-white/10"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-white">Produto</div>
          <ul className="mt-3 space-y-2 text-xs text-white/60">
            <li><a href="#como-funciona">Como funciona</a></li>
            <li><a href="#simulacao">Simulação</a></li>
            <li><a href="#recursos">Recursos</a></li>
            <li><a href="#planos">Planos</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-white">Legal</div>
          <ul className="mt-3 space-y-2 text-xs text-white/60">
            <li><a href="#">Termos de uso</a></li>
            <li><a href="#">Política de privacidade</a></li>
            <li><a href="#">Contato</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-[11px] text-white/40">
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
      <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint-soft/50 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
        <span className="h-1 w-1 rounded-full bg-mint" />
        {eyebrow}
      </div>
      <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight tracking-tight md:text-3xl lg:text-[2rem]">
        {title}
      </h2>
    </div>
  );
}

/* ---------------- Floating social-proof notifications ---------------- */
type FakeNotif = {
  kind: "compra" | "conquista" | "aprovado" | "online";
  name: string;
  action: string;
  meta: string;
  city?: string;
  avatar: string;
};

const FAKE_NOTIFS: FakeNotif[] = [
  { kind: "compra", name: "Lucas R.", action: "assinou o plano Completo", meta: "há 2 min", city: "São Paulo, SP", avatar: candidate2 },
  { kind: "conquista", name: "Ana C.", action: "completou 50 estações de Clínica Médica", meta: "há 4 min", avatar: candidate5 },
  { kind: "aprovado", name: "João P.", action: "foi aprovado no Revalida 2025.1 🎉", meta: "treinou 142 estações", avatar: candidate4 },
  { kind: "online", name: "+128 candidatos", action: "estudando agora", meta: "salas ao vivo abertas", avatar: candidate3 },
  { kind: "compra", name: "Marina P.", action: "assinou o Completo Mensal", meta: "há 7 min", city: "Recife, PE", avatar: candidate1 },
  { kind: "conquista", name: "Bruno A.", action: "bateu 90% no checklist de Pediatria", meta: "há 9 min", avatar: candidate6 },
  { kind: "aprovado", name: "Camila T.", action: "foi aprovada · Revalida 2024.2", meta: "treinou 98 estações", avatar: candidate7 },
  { kind: "compra", name: "Pedro H.", action: "assinou o plano Ator", meta: "há 12 min", city: "Curitiba, PR", avatar: candidate2 },
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
  const kindMeta =
    n.kind === "aprovado"
      ? { label: "Aprovação", chip: "bg-mint text-night" }
      : n.kind === "online"
      ? { label: "Ao vivo", chip: "bg-primary text-white" }
      : n.kind === "conquista"
      ? { label: "Conquista", chip: "bg-mint-soft text-primary" }
      : { label: "Nova assinatura", chip: "bg-mint text-night" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed bottom-4 left-4 z-[60] w-[300px] max-w-[calc(100vw-2rem)] sm:bottom-6 sm:left-6"
    >
      <div className="relative flex items-start gap-3 rounded-2xl border border-border bg-card p-3 pr-8 shadow-elegant">
        <div className="relative shrink-0">
          <img
            src={n.avatar}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
          />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-card bg-mint">
            <span className="h-1 w-1 rounded-full bg-night" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <span
            className={`inline-block rounded-full px-1.5 py-px text-[8px] font-bold uppercase tracking-widest ${kindMeta.chip}`}
          >
            {kindMeta.label}
          </span>
          <p className="mt-1 text-[11px] font-semibold leading-tight text-foreground">
            <span className="font-bold">{n.name}</span>{" "}
            <span className="font-normal text-muted-foreground">{n.action}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>{n.meta}</span>
            {n.city && (
              <>
                <span>·</span>
                <MapPin className="h-2.5 w-2.5" />
                <span>{n.city}</span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}
