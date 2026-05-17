import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Stethoscope,
  Clock,
  Brain,
  TrendingUp,
  Users,
  Smartphone,
  GraduationCap,
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
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import heroImage from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Estação Revalida — Treine a prova prática do Revalida" },
      {
        name: "description",
        content:
          "Simule casos clínicos, pratique com checklists, controle o tempo e receba feedback. A plataforma premium para sua aprovação no Revalida.",
      },
    ],
  }),
});

const nav = [
  { label: "Início", href: "#inicio" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Estações", href: "#areas" },
  { label: "Professores", href: "#professores" },
  { label: "Planos", href: "#planos" },
  { label: "FAQ", href: "#faq" },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Trust />
      <HowItWorks />
      <Differentials />
      <RolesSimulation />
      <Areas />
      <ForStudents />
      <ForTeachers />
      <Plans />
      <Testimonials />
      <FAQ />
      <Footer />
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground lg:flex">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="transition-colors hover:text-foreground">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/login">
            <Button variant="ghost">Entrar</Button>
          </Link>
          <Link to="/cadastro">
            <Button variant="hero">Começar agora</Button>
          </Link>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="lg:hidden rounded-lg p-2 text-foreground"
          aria-label="Menu"
        >
          <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-3">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                {n.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2">
              <Link to="/login" className="flex-1">
                <Button variant="outline" className="w-full">Entrar</Button>
              </Link>
              <Link to="/cadastro" className="flex-1">
                <Button variant="hero" className="w-full">Começar</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10 opacity-90"
        style={{
          backgroundImage: `radial-gradient(900px 500px at 80% -10%, color-mix(in oklab, var(--mint) 18%, transparent), transparent), radial-gradient(700px 400px at -10% 50%, color-mix(in oklab, var(--medical) 14%, transparent), transparent)`,
        }}
      />
      <div className="container mx-auto grid gap-12 px-4 py-16 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:py-28">
        <div className="flex flex-col justify-center">
          <Badge className="w-fit border-mint/30 bg-mint/10 text-foreground hover:bg-mint/10">
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-mint" />
            Treino por estação · Evolução por competência
          </Badge>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            Treine a prova prática do Revalida{" "}
            <span className="text-gradient">como se estivesse na estação real.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Simule casos clínicos, pratique com checklists, controle o tempo, receba feedback
            inteligente e acompanhe sua evolução até o dia da prova.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/cadastro">
              <Button variant="hero" size="xl" className="w-full sm:w-auto">
                Começar meu treino
                <ArrowRight className="ml-1 h-5 w-5" />
              </Button>
            </Link>
            <a href="#como-funciona">
              <Button variant="outline" size="xl" className="w-full sm:w-auto">
                Ver como funciona
              </Button>
            </a>
          </div>
          <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-background bg-gradient-mint"
                />
              ))}
            </div>
            <span>+1.200 médicos treinando hoje</span>
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-hero shadow-elegant">
        <img
          src={heroImage}
          alt="Plataforma Estação Revalida"
          width={1536}
          height={1024}
          className="h-full w-full object-cover opacity-60 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night/80 via-night/30 to-transparent" />

        {/* Floating cards */}
        <div className="absolute left-4 top-6 w-44 rounded-2xl border border-white/10 bg-night/70 p-4 text-white shadow-elegant backdrop-blur md:left-6 md:top-8 md:w-52">
          <div className="text-xs font-medium uppercase tracking-wider text-mint">Cronômetro</div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums">07:42</div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div className="h-full w-3/4 rounded-full bg-mint" />
          </div>
        </div>

        <div className="absolute right-4 top-24 w-52 rounded-2xl border border-white/10 bg-night/70 p-4 text-white shadow-elegant backdrop-blur md:right-6 md:top-32 md:w-60">
          <div className="text-xs font-medium uppercase tracking-wider text-mint">Nota da estação</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold">8,7</span>
            <span className="text-sm text-white/60">/ 10</span>
          </div>
          <div className="mt-1 text-xs text-white/70">Dor torácica · Emergência</div>
        </div>

        <div className="absolute bottom-5 left-4 right-4 rounded-2xl border border-white/10 bg-night/70 p-4 text-white shadow-elegant backdrop-blur md:left-6 md:right-6">
          <div className="text-xs font-medium uppercase tracking-wider text-mint">Pontos</div>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="flex items-center gap-1.5 text-success">
                <CheckCircle2 className="h-4 w-4" /> Fortes
              </div>
              <div className="mt-1 text-white/80">Anamnese, comunicação</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-warning">
                <TrendingUp className="h-4 w-4" /> A melhorar
              </div>
              <div className="mt-1 text-white/80">Conduta, prescrição</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Trust() {
  return (
    <section className="border-y border-border bg-card/40 py-8">
      <div className="container mx-auto grid grid-cols-2 gap-6 px-4 text-center md:grid-cols-4 lg:px-8">
        {[
          { v: "120+", l: "estações clínicas" },
          { v: "6", l: "áreas médicas" },
          { v: "1.200+", l: "médicos ativos" },
          { v: "8,4", l: "nota média de evolução" },
        ].map((s) => (
          <div key={s.l}>
            <div className="font-display text-2xl font-bold text-foreground md:text-3xl">{s.v}</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const steps = [
  { icon: Stethoscope, title: "Escolha uma estação", desc: "Selecione uma área, dificuldade e tempo de treino." },
  { icon: Clock, title: "Inicie o cronômetro", desc: "Leia o caso clínico e a tarefa do candidato." },
  { icon: ClipboardList, title: "Treine e responda", desc: "Marque o checklist sozinho, com um colega ou professor." },
  { icon: TrendingUp, title: "Receba feedback", desc: "Veja nota, pontos fortes, fracos e plano de melhoria." },
];

function HowItWorks() {
  return (
    <section id="como-funciona" className="container mx-auto px-4 py-20 lg:px-8 lg:py-28">
      <SectionTitle eyebrow="Como funciona" title="Quatro passos para treinar como na prova real" />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <div
            key={s.title}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-elegant"
          >
            <div className="absolute right-4 top-4 font-display text-5xl font-bold text-mint/10">
              0{i + 1}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-mint">
              <s.icon className="h-6 w-6 text-night" />
            </div>
            <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const diffs = [
  { icon: ClipboardList, t: "Checklists de prova prática", d: "Itens avaliativos pontuados por categoria." },
  { icon: Clock, t: "Cronômetro integrado", d: "Treine no tempo real de cada estação." },
  { icon: Brain, t: "Feedback inteligente", d: "Texto educacional baseado no seu desempenho." },
  { icon: TrendingUp, t: "Evolução por competência", d: "Acompanhe seu progresso por área." },
  { icon: Users, t: "Treino em dupla", d: "Ator e candidato em uma sala compartilhada." },
  { icon: GraduationCap, t: "Área do professor", d: "Crie estações e corrija seus alunos." },
  { icon: Smartphone, t: "PWA instalável", d: "Treine pelo celular como em um app nativo." },
  { icon: Heart, t: "Conteúdo autoral", d: "Casos clínicos elaborados por médicos." },
];

function Differentials() {
  return (
    <section className="bg-card/30 py-20 lg:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <SectionTitle eyebrow="Diferenciais" title="Tudo que você precisa para treinar com método" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {diffs.map((d) => (
            <div
              key={d.t}
              className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-mint/40 hover:shadow-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mint/10">
                <d.icon className="h-5 w-5 text-medical" />
              </div>
              <div className="mt-4 font-semibold">{d.t}</div>
              <div className="mt-1.5 text-sm text-muted-foreground">{d.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RolesSimulation() {
  const roles = [
    {
      icon: Stethoscope,
      title: "Candidato",
      desc: "Vê o caso clínico, a tarefa e o cronômetro. Não vê o checklist — exatamente como na prova real.",
      accent: "from-mint/20 to-medical/10",
    },
    {
      icon: UserRound,
      title: "Paciente / ator",
      desc: "Recebe um roteiro: queixa, história, emoções e o que só revelar se for perguntado.",
      accent: "from-rose-200/30 to-amber-100/20",
    },
    {
      icon: ClipboardCheck,
      title: "Médico ator",
      desc: "Corrige o candidato pelo checklist oficial, pontua, comenta cada item e dá o feedback final.",
      accent: "from-indigo-200/30 to-mint/10",
    },
  ];
  return (
    <section id="papeis" className="container mx-auto px-4 py-20 lg:px-8 lg:py-28">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <Badge className="border-mint/30 bg-mint/10 text-foreground hover:bg-mint/10">
            <Theater className="mr-1.5 h-3.5 w-3.5 text-mint" /> Simulação com papéis reais
          </Badge>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight md:text-4xl">
            Simulação com paciente e ator.{" "}
            <span className="text-gradient">Sinta a pressão de uma estação real.</span>
          </h2>
          <p className="mt-5 text-muted-foreground">
            O candidato vê o caso, o paciente segue o roteiro e o ator corrige pelo checklist.
            Crie uma sala, compartilhe o código e treine como se já estivesse na prova.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Treine com paciente simulado e ator.",
              "Cada papel vê apenas o conteúdo do seu perfil.",
              "Ideal para professores, mentorias, turmas e cursos preparatórios.",
              "Funciona no celular — chame seu colega por chamada de vídeo e abra a sala aqui.",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" /> <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/cadastro">
              <Button variant="hero" size="lg">Criar uma sala agora <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
            <a href="#planos">
              <Button variant="outline" size="lg">Ver planos</Button>
            </a>
          </div>
        </div>

        <div className="grid gap-4">
          {roles.map((r) => (
            <div key={r.title} className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card">
              <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${r.accent} opacity-60`} />
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-mint">
                  <r.icon className="h-6 w-6 text-night" />
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-medical">{r.title}</div>
                  <div className="mt-1 font-display text-lg font-bold">{`Sou ${r.title.toLowerCase()}`}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{r.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const areas = [
  { icon: Activity, name: "Clínica Médica", count: 28 },
  { icon: Baby, name: "Pediatria", count: 22 },
  { icon: Heart, name: "Ginecologia e Obstetrícia", count: 24 },
  { icon: Scissors, name: "Cirurgia", count: 18 },
  { icon: HomeIcon, name: "Medicina da Família", count: 20 },
  { icon: Siren, name: "Urgência e Emergência", count: 16 },
  { icon: MessagesSquare, name: "Comunicação médico-paciente", count: 12 },
  { icon: Stethoscope, name: "Exames e condutas", count: 14 },
];

function Areas() {
  return (
    <section id="areas" className="container mx-auto px-4 py-20 lg:px-8 lg:py-28">
      <SectionTitle eyebrow="Áreas de treino" title="Estações organizadas por especialidade" />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {areas.map((a) => (
          <div
            key={a.name}
            className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-card p-6 transition-all hover:shadow-elegant"
          >
            <a.icon className="h-7 w-7 text-medical" />
            <div className="mt-5 font-semibold leading-tight">{a.name}</div>
            <div className="mt-2 text-sm text-muted-foreground">{a.count} estações</div>
            <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-mint opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
          </div>
        ))}
      </div>
    </section>
  );
}

function ForStudents() {
  return (
    <section className="bg-night text-white py-20 lg:py-28">
      <div className="container mx-auto grid gap-12 px-4 lg:grid-cols-2 lg:px-8">
        <div>
          <Badge className="border-mint/30 bg-mint/10 text-mint hover:bg-mint/10">Para alunos</Badge>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            Estude com método, treine com tempo, evolua com dado.
          </h2>
          <p className="mt-5 text-white/70">
            Cada item do checklist pode fazer diferença na sua aprovação. Você treina, vê histórico,
            acompanha notas e sabe exatamente onde precisa melhorar.
          </p>
          <ul className="mt-7 space-y-3 text-white/85">
            {[
              "Biblioteca crescente de estações por especialidade",
              "Cronômetro com alerta visual no minuto final",
              "Histórico completo com nota e tempo gasto",
              "Plano de revisão automático após cada estação",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-mint" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur md:p-8">
          <div className="text-xs font-medium uppercase tracking-wider text-mint">Seu progresso</div>
          <div className="mt-4 space-y-4">
            {[
              { l: "Anamnese", v: 82 },
              { l: "Exame físico", v: 68 },
              { l: "Conduta", v: 61 },
              { l: "Comunicação", v: 88 },
            ].map((c) => (
              <div key={c.l}>
                <div className="flex justify-between text-sm">
                  <span className="text-white/80">{c.l}</span>
                  <span className="font-medium text-mint">{c.v}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-mint"
                    style={{ width: `${c.v}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ForTeachers() {
  return (
    <section id="professores" className="container mx-auto px-4 py-20 lg:px-8 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="order-2 lg:order-1">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Painel</div>
                <div className="font-display text-2xl font-bold">Professor</div>
              </div>
              <GraduationCap className="h-8 w-8 text-medical" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { l: "Alunos ativos", v: "84" },
                { l: "Estações criadas", v: "32" },
                { l: "Correções pendentes", v: "7" },
                { l: "Média geral", v: "7,9" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-border bg-background p-4">
                  <div className="font-display text-xl font-bold">{s.v}</div>
                  <div className="text-xs text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <Badge>Para professores</Badge>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
            Crie estações, corrija alunos e acompanhe cada evolução.
          </h2>
          <p className="mt-5 text-muted-foreground">
            Estruture suas próprias estações com checklists, libere materiais e ofereça feedback
            individual com a profundidade que só um professor pode dar.
          </p>
          <ul className="mt-7 space-y-3">
            {[
              "Editor de estação com checklist por categoria e peso",
              "Painel de correção com nota e comentário",
              "Turmas e mentorias com acompanhamento por aluno",
              "Liberação de materiais de apoio e resumos",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-mint" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "/ 3 dias",
    desc: "Experimente a plataforma completa por 3 dias.",
    features: [
      "3 dias de acesso completo",
      "Treine como médico ou ator",
      "+600 checklists atualizados",
      "Flashcards e resumos",
      "Estatísticas de estudo",
    ],
    cta: "Começar grátis",
  },
  {
    name: "Completo",
    price: "R$ 800",
    period: "até o dia da prova",
    desc: "Treine como médico/candidato OU como ator.",
    features: [
      "Acesso até o dia da prova",
      "Treine como médico OU ator",
      "+600 checklists e +450 flashcards",
      "Treinamentos ilimitados",
      "Grupo de WhatsApp e CHAT",
      "Crie checklists com IA",
      "Correção por IA com feedback",
    ],
    highlight: true,
    cta: "Quero o Completo",
  },
  {
    name: "Ator",
    price: "R$ 170",
    period: "até o dia da prova",
    desc: "Exclusivo para quem vai avaliar e atuar como paciente.",
    features: [
      "Acesso até o dia da prova",
      "Atue como ator",
      "+600 checklists atualizados",
      "Treinamentos ilimitados",
      "Use a plataforma como ator",
    ],
    cta: "Quero ser Ator",
  },
];

function Plans() {
  return (
    <section id="planos" className="bg-card/30 py-20 lg:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <SectionTitle eyebrow="Planos" title="Escolha o ritmo do seu treino" />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-3xl border p-7 transition-all ${
                p.highlight
                  ? "border-mint/50 bg-card shadow-elegant lg:-translate-y-2"
                  : "border-border bg-card shadow-card"
              }`}
            >
              {p.highlight && (
                <Badge className="absolute right-6 top-6 bg-gradient-mint text-night hover:bg-gradient-mint">
                  Mais escolhido
                </Badge>
              )}
              <div className="font-display text-xl font-bold">{p.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">{p.desc}</div>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">{p.price}</span>
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
              <Link to="/cadastro" className="mt-8">
                <Button variant={p.highlight ? "hero" : "outline"} className="w-full">
                  {p.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Valores ilustrativos para demonstração. Integração de pagamento em breve.
        </p>
      </div>
    </section>
  );
}

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
    <section className="container mx-auto px-4 py-20 lg:px-8 lg:py-28">
      <SectionTitle eyebrow="Depoimentos" title="O que dizem quem treina conosco" />
      <p className="-mt-2 text-center text-xs text-muted-foreground">
        Depoimentos fictícios para demonstração — serão substituídos por reais.
      </p>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {testimonials.map((t) => (
          <div key={t.name} className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex gap-0.5 text-mint">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <p className="mt-4 leading-relaxed text-foreground/90">"{t.text}"</p>
            <div className="mt-5 border-t border-border pt-4">
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.role}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const faqs = [
  { q: "O app substitui um curso presencial?", a: "Não. Ele é um complemento poderoso para a parte prática, com simulação, cronômetro e feedback que dificilmente se replicam fora da prova." },
  { q: "Posso treinar pelo celular?", a: "Sim. O app é mobile-first e pode ser instalado como PWA, funcionando como um app nativo no seu celular." },
  { q: "Os checklists são editáveis?", a: "Professores e administradores podem criar e editar estações e checklists na área do professor." },
  { q: "Professores podem corrigir alunos?", a: "Sim. O painel do professor permite ver tentativas enviadas, dar nota e escrever feedback individual." },
  { q: "Tem IA?", a: "Sim. O feedback inteligente é gerado automaticamente com base no seu desempenho, e novos recursos com paciente virtual estão no roadmap." },
  { q: "Posso usar com meus alunos?", a: "Sim. O plano Mentoria inclui ferramentas para acompanhar turmas e corrigir alunos." },
];

function FAQ() {
  return (
    <section id="faq" className="bg-card/30 py-20 lg:py-28">
      <div className="container mx-auto max-w-3xl px-4 lg:px-8">
        <SectionTitle eyebrow="FAQ" title="Perguntas frequentes" />
        <div className="mt-10 space-y-3">
          {faqs.map((f, i) => (
            <FAQItem key={i} q={f.q} a={f.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card transition-all">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left font-medium"
      >
        <span>{q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-mint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{a}</div>}
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-night text-white/80">
      <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <Logo variant="light" />
          <p className="mt-5 max-w-sm text-sm text-white/60">
            Plataforma premium de preparação para a prova prática do Revalida. Treine, corrija, repita
            e evolua.
          </p>
          <div className="mt-6 flex gap-3">
            <a
              href="https://wa.me/5500000000000"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 hover:bg-white/10"
              aria-label="WhatsApp"
            >
              <MessageCircle className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 hover:bg-white/10"
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
            <li><a href="#areas">Estações</a></li>
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
        © {new Date().getFullYear()} Estação Revalida · Conteúdo educacional autoral. Não afiliado ao INEP ou ao governo.
      </div>
    </footer>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-wider text-medical">
        <span className="h-1.5 w-1.5 rounded-full bg-mint" />
        {eyebrow}
      </div>
      <h2 className="mt-4 font-display text-3xl font-bold leading-tight md:text-4xl">{title}</h2>
    </div>
  );
}
