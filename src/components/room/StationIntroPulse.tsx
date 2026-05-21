import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Stethoscope, UserRound, Activity } from "lucide-react";
import logoUrl from "@/assets/logo-revmed-horizontal.png";

export type IntroRole = "candidato" | "paciente";

export const INTRO_DURATION_MS = 7000;

interface Props {
  role: IntroRole;
  stationTitle: string;
  specialty?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  onComplete: () => void;
  startAtMs?: number;
  nowMs?: () => number;
}

const ROLE_META: Record<IntroRole, { label: string; icon: typeof Stethoscope }> = {
  candidato: { label: "Candidato / Médico", icon: Stethoscope },
  paciente: { label: "Ator / Paciente", icon: UserRound },
};

const PHASE_AT = {
  logo: 0,
  ecg: 1100,
  countdown: 3800,
} as const;
const COUNT_STEP_MS = 800;
const COUNT_END_MS = 600;

type Phase = "logo" | "ecg" | "countdown" | "done";

export function StationIntroPulse({
  role, stationTitle, specialty, displayName, onComplete, startAtMs, nowMs,
}: Props) {
  const reduce = useReducedMotion();
  const now = nowMs ?? (() => Date.now());
  const anchorRef = useRef<number>(startAtMs ?? now());
  if (startAtMs !== undefined && startAtMs !== anchorRef.current) anchorRef.current = startAtMs;
  const anchor = anchorRef.current;

  const initialElapsed = Math.max(0, now() - anchor);
  const initialPhase: Phase =
    initialElapsed >= PHASE_AT.countdown ? "countdown"
    : initialElapsed >= PHASE_AT.ecg ? "ecg"
    : "logo";
  const initialCount: 3 | 2 | 1 | 0 = (() => {
    if (initialPhase !== "countdown") return 3;
    const inCd = initialElapsed - PHASE_AT.countdown;
    return Math.max(0, 3 - Math.floor(inCd / COUNT_STEP_MS)) as 3 | 2 | 1 | 0;
  })();

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [count, setCount] = useState<3 | 2 | 1 | 0>(initialCount);

  useEffect(() => {
    if (reduce) {
      const t = setTimeout(() => setPhase("countdown"), 200);
      return () => clearTimeout(t);
    }
    const elapsed = Math.max(0, now() - anchor);
    const schedule = (at: number, p: Phase) => {
      const delay = at - elapsed;
      if (delay <= 0) return null;
      return setTimeout(() => setPhase(p), delay);
    };
    const timers = [
      schedule(PHASE_AT.ecg, "ecg"),
      schedule(PHASE_AT.countdown, "countdown"),
    ].filter((t): t is ReturnType<typeof setTimeout> => t !== null);
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, anchor]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) {
      const t = setTimeout(() => { setPhase("done"); onComplete(); }, COUNT_END_MS);
      return () => clearTimeout(t);
    }
    const stepsTaken = 3 - count;
    const nextAt = anchor + PHASE_AT.countdown + (stepsTaken + 1) * COUNT_STEP_MS;
    const delay = Math.max(0, nextAt - now());
    const t = setTimeout(() => setCount((c) => (c - 1) as 3 | 2 | 1 | 0), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count, onComplete, anchor]);

  const isCandidate = role === "candidato";
  const Icon = ROLE_META[role].icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at center, hsl(var(--medical) / 0.18) 0%, hsl(220 50% 6%) 60%, hsl(222 60% 3%) 100%)",
      }}
      aria-live="polite"
    >
      {/* sutil grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--mint)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--mint)) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.7)_100%)]" />

      {/* Logo + título no topo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{
          opacity: phase === "countdown" ? 0.25 : 1,
          y: 0,
          scale: phase === "logo" ? 1 : 0.85,
        }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-1/2 top-[12%] -translate-x-1/2 text-center"
      >
        <img src={logoUrl} alt="REVMED" draggable={false} className="mx-auto h-14 w-auto select-none md:h-16 drop-shadow-[0_0_30px_hsl(var(--mint)/0.45)]" />
        <div className="mt-4 font-display text-lg text-white/85 md:text-xl">
          {isCandidate ? "Você vai entrar agora." : "Prepare-se para receber o candidato."}
        </div>
      </motion.div>

      {/* ECG */}
      <AnimatePresence>
        {(phase === "ecg" || phase === "countdown") && (
          <motion.div
            key="ecg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: phase === "countdown" ? 0.35 : 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(820px,92vw)]"
          >
            <div className="flex items-center gap-2 text-mint mb-2 text-[10px] font-semibold uppercase tracking-[0.25em]">
              <Activity className="h-3 w-3" /> Sinal vital — Estação ativa
            </div>
            <svg viewBox="0 0 800 140" className="w-full h-[120px]">
              <defs>
                <linearGradient id="ecgGrad" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--mint))" stopOpacity="0" />
                  <stop offset="20%" stopColor="hsl(var(--mint))" stopOpacity="1" />
                  <stop offset="100%" stopColor="hsl(var(--mint))" stopOpacity="1" />
                </linearGradient>
                <filter id="glow"><feGaussianBlur stdDeviation="2.5" /></filter>
              </defs>
              <line x1="0" y1="70" x2="800" y2="70" stroke="hsl(var(--mint) / 0.18)" strokeWidth="1" strokeDasharray="4 6" />
              <motion.path
                d="M0 70 L200 70 L230 70 L245 30 L260 110 L275 50 L290 70 L800 70"
                stroke="url(#ecgGrad)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.2, ease: [0.45, 0, 0.2, 1] }}
              />
              <motion.path
                d="M0 70 L200 70 L230 70 L245 30 L260 110 L275 50 L290 70 L800 70"
                stroke="hsl(var(--mint))"
                strokeWidth="1.4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.2, ease: [0.45, 0, 0.2, 1] }}
              />
            </svg>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-4 text-center"
            >
              <div className="line-clamp-2 font-display text-base font-semibold text-white md:text-lg">
                {isCandidate ? "Sigiloso — abertura ao iniciar" : stationTitle}
              </div>
              {!isCandidate && specialty && (
                <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/55">{specialty}</div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countdown */}
      <AnimatePresence>
        {phase === "countdown" && (
          <motion.div
            key={`cd-${count}`}
            initial={{ opacity: 0, scale: 0.6, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.5, filter: "blur(6px)" }}
            transition={{ duration: 0.45 }}
            className="absolute inset-x-0 bottom-[14%] flex flex-col items-center justify-center"
          >
            {count > 0 ? (
              <div className="font-display font-bold leading-none text-mint drop-shadow-[0_0_40px_hsl(var(--mint)/0.55)] text-[clamp(5rem,18vw,13rem)]">
                {count}
              </div>
            ) : (
              <div className="font-display font-bold text-white text-[clamp(1.75rem,4.5vw,3rem)]">
                Estação iniciada
              </div>
            )}
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-[11px] text-white/80">
              <Icon className="h-3 w-3 text-mint" /> {ROLE_META[role].label} · {displayName.split(" ")[0]}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
