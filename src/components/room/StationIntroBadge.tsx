import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Stethoscope, UserRound, ShieldCheck } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
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
  sweep: 0,
  badge: 900,
  countdown: 3800,
} as const;
const COUNT_STEP_MS = 800;
const COUNT_END_MS = 600;

type Phase = "sweep" | "badge" | "countdown" | "done";

export function StationIntroBadge({
  role, stationTitle, specialty, displayName, avatarUrl, onComplete, startAtMs, nowMs,
}: Props) {
  const reduce = useReducedMotion();
  const now = nowMs ?? (() => Date.now());
  const anchorRef = useRef<number>(startAtMs ?? now());
  if (startAtMs !== undefined && startAtMs !== anchorRef.current) anchorRef.current = startAtMs;
  const anchor = anchorRef.current;

  const initialElapsed = Math.max(0, now() - anchor);
  const initialPhase: Phase =
    initialElapsed >= PHASE_AT.countdown ? "countdown"
    : initialElapsed >= PHASE_AT.badge ? "badge"
    : "sweep";
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
      schedule(PHASE_AT.badge, "badge"),
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
          "linear-gradient(160deg, hsl(220 45% 8%) 0%, hsl(160 40% 8%) 100%)",
      }}
      aria-live="polite"
    >
      {/* halos */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-mint/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 h-[420px] w-[420px] rounded-full bg-medical/20 blur-3xl" />

      {/* Sweep line */}
      <AnimatePresence>
        {phase === "sweep" && (
          <motion.div
            key="sweep"
            initial={{ x: "-30%" }}
            animate={{ x: "130%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: [0.5, 0, 0.3, 1] }}
            className="absolute inset-y-0 w-[40%]"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, hsl(var(--mint) / 0.35) 50%, transparent 100%)",
              filter: "blur(2px)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Logo topo */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: phase === "countdown" ? 0.3 : 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="absolute left-1/2 top-[10%] -translate-x-1/2 text-center"
      >
        <img src={logoUrl} alt="REVMED" draggable={false} className="mx-auto h-12 w-auto select-none md:h-14 drop-shadow-[0_0_24px_hsl(var(--mint)/0.45)]" />
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-mint">
          <ShieldCheck className="h-3 w-3" /> Credenciamento da estação
        </div>
      </motion.div>

      {/* Crachá */}
      <AnimatePresence>
        {(phase === "badge" || phase === "countdown") && (
          <motion.div
            key="badge"
            initial={{ y: 80, opacity: 0, scale: 0.9, rotate: -3 }}
            animate={{
              y: phase === "countdown" ? -40 : 0,
              opacity: phase === "countdown" ? 0.4 : 1,
              scale: phase === "countdown" ? 0.85 : 1,
              rotate: 0,
            }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: "spring", damping: 18, stiffness: 110 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div
              className="relative w-[clamp(260px,30vw,340px)] overflow-hidden rounded-2xl border border-white/15 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
              style={{ background: "linear-gradient(165deg, hsl(220 35% 18%) 0%, hsl(222 45% 10%) 100%)" }}
            >
              <div className="absolute -top-3 left-1/2 h-3 w-16 -translate-x-1/2 rounded-b-md bg-white/20" />
              <div className="h-1.5 bg-gradient-to-r from-mint via-medical to-mint" />
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <img src={logoUrl} alt="REVMED" className="h-5 w-auto select-none opacity-90" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                    CRED · {role.slice(0, 3).toUpperCase()}
                  </span>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <UserAvatar avatarUrl={avatarUrl} name={displayName} size="xl" />
                  <div className="min-w-0">
                    <div className="truncate font-display text-base font-bold text-white">{displayName}</div>
                    <div className="text-[11px] uppercase tracking-wider text-white/60">{ROLE_META[role].label}</div>
                  </div>
                </div>
                <div className="mt-5 space-y-2 border-t border-white/10 pt-3">
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Estação</div>
                  <div className="line-clamp-2 text-xs font-medium text-white/90">
                    {isCandidate ? "Sigiloso até a abertura" : stationTitle}
                  </div>
                  {!isCandidate && specialty && (
                    <>
                      <div className="mt-2 text-[10px] uppercase tracking-wider text-white/40">Especialidade</div>
                      <div className="text-xs text-white/80">{specialty}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
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
              <Icon className="h-3 w-3 text-mint" /> Boa prova, {displayName.split(" ")[0]}.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
