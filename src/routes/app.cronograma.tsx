import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/stagger";
import { MotionCard } from "@/components/motion/MotionPrimitives";

export const Route = createFileRoute("/app/cronograma")({
  component: Cronograma,
  head: () => ({ meta: [{ title: "Cronograma — REVMED" }] }),
});

function Cronograma() {
  const today = new Date();
  const monthLabel = today.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDow = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null as number | null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Reveal className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3 py-1 text-xs font-medium text-medical">
            <Sparkles className="h-3.5 w-3.5" /> Novo
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold md:text-3xl">Cronograma</h1>
          <p className="text-sm text-muted-foreground">Organize sua rotina de treino com base no desempenho.</p>
        </div>
        <Button variant="hero">
          <Sparkles className="h-4 w-4" /> Gerar cronograma
        </Button>
      </Reveal>

      <MotionCard lift={2} glow className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-mint" />
          <h2 className="font-display text-xl font-bold capitalize">{monthLabel}</h2>
        </div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mt-5 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border text-xs"
        >
          {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((d) => (
            <div key={d} className="bg-muted/40 py-2 text-center font-semibold uppercase tracking-wider text-muted-foreground">
              {d}
            </div>
          ))}
          {cells.map((day, i) => (
            <motion.div
              key={i}
              variants={staggerItem}
              whileHover={day ? { scale: 1.04, backgroundColor: "hsl(var(--muted))" } : undefined}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="aspect-square bg-background p-2 text-sm"
            >
              {day && <div className="text-muted-foreground">{day}</div>}
            </motion.div>
          ))}
        </motion.div>
        <p className="mt-4 text-center text-xs text-muted-foreground">Em breve: geração automática de cronograma personalizado.</p>
      </MotionCard>
    </div>
  );
}
