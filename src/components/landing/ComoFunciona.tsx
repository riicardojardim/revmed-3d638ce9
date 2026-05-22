import { motion } from "framer-motion";
import { ClipboardCheck, Users, Timer, Trophy } from "lucide-react";

const STEPS = [
  {
    icon: ClipboardCheck,
    n: "01",
    title: "Diagnóstico",
    body: "Mapeamos onde você está hoje: pontos fortes, lacunas e tempo disponível na sua rotina.",
  },
  {
    icon: Users,
    n: "02",
    title: "Turma de 5",
    body: "Você entra num grupo pequeno com mentor presente e cronograma feito pra você.",
  },
  {
    icon: Timer,
    n: "03",
    title: "Prática real",
    body: "Simulados cronometrados no padrão INEP, com banca, ator e correção objetiva por critério.",
  },
  {
    icon: Trophy,
    n: "04",
    title: "Aprovação",
    body: "Você chega na prova já tendo feito a prova. Sem surpresa, sem ansiedade, sem improviso.",
  },
];

export function ComoFunciona() {
  return (
    <section className="relative py-16 md:py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Como funciona
          </p>
          <h2 className="mt-3 font-display text-[1.85rem] font-black leading-[1.05] tracking-[-0.03em] md:mt-4 md:text-5xl">
            Do diagnóstico à aprovação <br />
            em <span className="text-primary">4 passos</span>.
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 md:mt-14 md:grid-cols-4 md:gap-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/40 p-4 transition-all hover:-translate-y-1 hover:border-primary/40 sm:p-6"
            >
              <div className="absolute right-3 top-2 font-display text-3xl font-black text-primary/10 transition-colors group-hover:text-primary/20 sm:right-4 sm:top-3 sm:text-5xl">
                {s.n}
              </div>
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30 sm:h-11 sm:w-11">
                  <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-bold tracking-tight sm:mt-5 sm:text-lg">
                  {s.title}
                </h3>
                <p className="mt-2 text-[0.8rem] text-muted-foreground sm:text-sm">
                  {s.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- */

import { X, Check } from "lucide-react";

const COMPARISON = [
  { feature: "Cronograma feito por você", sozinho: false, revmed: true },
  { feature: "Estudo do que realmente cai no INEP", sozinho: false, revmed: true },
  { feature: "Simulação com cronômetro e ator", sozinho: false, revmed: true },
  { feature: "Correção objetiva por critério", sozinho: false, revmed: true },
  { feature: "Mentor acompanhando toda semana", sozinho: false, revmed: true },
  { feature: "Acompanhamento psicológico", sozinho: false, revmed: true },
  { feature: "Ansiedade até a véspera da prova", sozinho: true, revmed: false },
];

export function Comparativo() {
  return (
    <section className="relative py-16 md:py-28">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Comparativo
          </p>
          <h2 className="mt-3 font-display text-[1.85rem] font-black leading-[1.05] tracking-[-0.03em] md:mt-4 md:text-5xl">
            Estudar sozinho <span className="text-muted-foreground">vs.</span>{" "}
            <span className="text-primary">estudar com REVMED</span>
          </h2>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border sm:rounded-3xl md:mt-12">
          <div className="grid grid-cols-[1.6fr_auto_auto] bg-card/60 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">
            <div className="px-3 py-3 sm:px-5 sm:py-4 md:px-7">O que importa</div>
            <div className="px-2 py-3 text-center sm:px-3 sm:py-4 md:px-5">Sozinho</div>
            <div className="bg-primary/15 px-2 py-3 text-center text-primary sm:px-3 sm:py-4 md:px-5">REVMED</div>
          </div>
          {COMPARISON.map((row, i) => (
            <motion.div
              key={row.feature}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="grid grid-cols-[1.6fr_auto_auto] items-center border-t border-border bg-background/40 text-[0.8rem] sm:text-sm md:text-base"
            >
              <div className="px-3 py-3 font-medium sm:px-5 sm:py-4 md:px-7">{row.feature}</div>
              <div className="flex justify-center px-2 py-3 sm:px-3 sm:py-4 md:px-5">
                {row.sozinho ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/15 text-destructive sm:h-7 sm:w-7">
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground/60 sm:h-7 sm:w-7">
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                )}
              </div>
              <div className="flex justify-center bg-primary/5 px-2 py-3 sm:px-3 sm:py-4 md:px-5">
                {row.revmed ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground sm:h-7 sm:w-7">
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground/60 sm:h-7 sm:w-7">
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}