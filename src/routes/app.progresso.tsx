import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { STATIONS } from "@/data/stations";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SpecialtyMedals, MEDAL_SPECIALTIES, getSpecAvg } from "@/components/SpecialtyMedals";
import { useExamSettings } from "@/hooks/use-exam-settings";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { ResetStatsButton } from "@/components/ResetStatsButton";
import { Reveal } from "@/components/ui/reveal";
import { Shimmer } from "@/components/ui/shimmer";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { MotionCard, listContainer, listItem } from "@/components/motion/MotionPrimitives";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/app/progresso")({
  component: ProgressPage,
  head: () => ({ meta: [{ title: "Progresso — REVMED" }] }),
});

interface DbAttempt {
  id: string;
  station_id: string;
  station_title: string | null;
  specialty: string | null;
  score: number;
  status: string;
  created_at: string;
  professor_score: number | null;
  reviewed_at: string | null;
  professor_feedback: string | null;
}

function ProgressPage() {
  const { user } = useAuth();
  const { notaDeCorte, notaDeCorteEscala10, edicao } = useExamSettings();
  const [attempts, setAttempts] = useState<DbAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("attempts")
      .select("id, station_id, station_title, specialty, score, status, created_at, professor_score, reviewed_at, professor_feedback")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);
    setAttempts((data ?? []) as DbAttempt[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const specStats = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    attempts.forEach((a) => {
      const k = a.specialty ?? "Outras";
      const cur = m.get(k) ?? { sum: 0, n: 0 };
      cur.sum += Number(a.score) || 0;
      cur.n += 1;
      m.set(k, cur);
    });
    return m;
  }, [attempts]);

  const avg =
    attempts.length > 0
      ? attempts.reduce((s, a) => s + Number(a.score), 0) / attempts.length
      : 0;

  return (
    <div className="relative mx-auto max-w-5xl space-y-6">
      <Reveal className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Sua evolução</h1>
          <p className="mt-1 text-muted-foreground">
            Acompanhe seu desempenho por competência e histórico de estações.
          </p>
        </div>
        <ResetStatsButton scope="attempts" onDone={load} />
      </Reveal>

      <Reveal delay={0.08} className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <MotionCard lift={3} glow className="rounded-2xl border border-border bg-card p-5 shadow-card transition-colors hover:border-mint/40">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Tentativas</div>
          <div className="mt-2 font-display text-3xl font-bold"><AnimatedNumber value={attempts.length} /></div>
        </MotionCard>
        <MotionCard lift={3} glow className="rounded-2xl border border-border bg-card p-5 shadow-card transition-colors hover:border-mint/40">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Nota média</div>
          <div className="mt-2 font-display text-3xl font-bold text-medical">
            <AnimatedNumber value={avg} decimals={1} />
          </div>
        </MotionCard>
        <MotionCard lift={3} glow className="rounded-2xl border border-border bg-card p-5 shadow-card transition-colors hover:border-mint/40">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Nota de corte INEP</div>
          <div className="mt-2 font-display text-3xl font-bold text-mint">
            {notaDeCorte.toFixed(3)}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {edicao} · equivale a {notaDeCorteEscala10.toFixed(2)} na escala 0–10
          </div>
        </MotionCard>
      </Reveal>

      <Reveal delay={0.16} className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display font-bold">Média por especialidade</h3>
          <span className="text-xs text-muted-foreground">
            Meta: ≥ <span className="font-semibold text-foreground">{notaDeCorteEscala10.toFixed(2)}</span> (nota de corte INEP)
          </span>
        </div>
        <ul className="mt-4 space-y-3">
          {MEDAL_SPECIALTIES.map((s) => {
            const meta = getSpecialtyMeta(s.key);
            const { avg, n } = getSpecAvg(specStats, s.key);
            const pct = Math.max(0, Math.min(100, (avg / 10) * 100));
            const target = notaDeCorte; // 0–100 scale
            const hit = avg >= notaDeCorteEscala10 && n > 0;
            return (
              <li key={s.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-6 min-w-[2rem] items-center justify-center rounded-md px-1.5 text-[10px] font-bold tracking-wider ${meta.badge}`}>
                      {s.short}
                    </span>
                    <span className="font-medium">{s.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                    <span>{n} est.</span>
                    <span className={`font-display text-base font-bold ${hit ? meta.text : "text-foreground"}`}>
                      {avg.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${meta.solid} transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                  <div
                    className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-foreground/60"
                    style={{ left: `${target}%` }}
                    title={`Nota de corte INEP — ${notaDeCorte.toFixed(3)} pts`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Reveal>

      <Reveal delay={0.24} className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <SpecialtyMedals stats={specStats} />
      </Reveal>

      <Reveal delay={0.32} className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h3 className="font-semibold">Histórico recente</h3>
        {loading ? (
          <div className="mt-4"><Shimmer rows={4} className="h-14 rounded-xl" /></div>
        ) : attempts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Você ainda não realizou nenhuma estação.
          </p>
        ) : (
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="mt-4 divide-y divide-border"
          >
            <AnimatePresence initial={false}>
            {attempts.map((a) => {
              const st = STATIONS.find((s) => s.id === a.station_id);
              const title = a.station_title || st?.title || a.station_id;
              const specialty = a.specialty || st?.specialty || "—";
              const date = new Date(a.created_at).toLocaleDateString("pt-BR");
              return (
                <motion.div
                  key={a.id}
                  variants={listItem}
                  layout
                  whileHover={{ x: 2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="py-3"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mint/10 font-display font-bold text-medical">
                      {Number(a.score).toFixed(1)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{title}</div>
                      <div className="text-xs text-muted-foreground">{specialty} · {date}</div>
                    </div>
                    {a.reviewed_at && (
                      <Badge className="bg-success/15 text-success hover:bg-success/15">
                        Prof: {a.professor_score?.toFixed(1) ?? "—"}
                      </Badge>
                    )}
                  </div>
                  {a.professor_feedback && (
                    <div className="mt-2 ml-16 rounded-xl border border-mint/30 bg-mint/5 p-3 text-sm">
                      <div className="text-xs font-semibold uppercase tracking-wider text-medical">Feedback do professor</div>
                      <p className="mt-1 text-foreground/90 whitespace-pre-wrap">{a.professor_feedback}</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
            </AnimatePresence>
          </motion.div>
        )}
      </Reveal>
    </div>
  );
}
