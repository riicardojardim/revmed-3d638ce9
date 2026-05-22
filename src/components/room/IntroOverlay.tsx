import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Stethoscope, UserRound, Activity } from "lucide-react";
import logoUrl from "@/assets/logo-revmed-horizontal.png";

export type IntroRole = "candidato" | "paciente";

/** Mantido por compatibilidade com chamadas antigas. Existe uma única animação agora. */
export type IntroVariant = "revmed";
export const INTRO_VARIANT_LABEL: Record<IntroVariant, string> = {
  revmed: "REVMED — Entrada da estação",
};

const PHASE_AT = {
  logo: 0,
  card: 1100,
  countdown: 3700,
} as const;
const COUNT_STEP_MS = 850;
const COUNT_END_MS = 700;

export const INTRO_DURATION_MS =
  PHASE_AT.countdown + 3 * COUNT_STEP_MS + COUNT_END_MS; // ~6,9s

type Phase = "logo" | "card" | "countdown" | "done";

interface Props {
  /** Ignorado — existe apenas uma animação. Mantido para compatibilidade. */
  variant?: IntroVariant | string | null;
  role: IntroRole;
  stationTitle: string;
  specialty?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  onComplete: () => void;
  startAtMs?: number;
  nowMs?: () => number;
}

/** Remove prefixo "Dr." / "Dra." do nome (para o ator/paciente). */
function stripDoctor(name: string): string {
  return name.replace(/^\s*(dr\.?|dra\.?)\s+/i, "").trim() || name;
}

export function IntroOverlay({
  role,
  stationTitle,
  specialty,
  displayName,
  onComplete,
  startAtMs,
  nowMs,
}: Props) {
  const reduce = useReducedMotion();
  const now = nowMs ?? (() => Date.now());
  const anchorRef = useRef<number>(startAtMs ?? now());
  if (startAtMs !== undefined && startAtMs !== anchorRef.current) {
    anchorRef.current = startAtMs;
  }
  const anchor = anchorRef.current;

  const initialElapsed = Math.max(0, now() - anchor);
  const initialPhase: Phase =
    initialElapsed >= PHASE_AT.countdown
      ? "countdown"
      : initialElapsed >= PHASE_AT.card
        ? "card"
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
      schedule(PHASE_AT.card, "card"),
      schedule(PHASE_AT.countdown, "countdown"),
    ].filter((t): t is ReturnType<typeof setTimeout> => t !== null);
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, anchor]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) {
      const t = setTimeout(() => {
        setPhase("done");
        onComplete();
      }, COUNT_END_MS);
      return () => clearTimeout(t);
    }
    const stepsTaken = 3 - count;
    const nextAt =
      anchor + PHASE_AT.countdown + (stepsTaken + 1) * COUNT_STEP_MS;
    const delay = Math.max(0, nextAt - now());
    const t = setTimeout(
      () => setCount((c) => (c - 1) as 3 | 2 | 1 | 0),
      delay,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count, onComplete, anchor]);

  const isCandidate = role === "candidato";
  const RoleIcon = isCandidate ? Stethoscope : UserRound;
  const roleLabel = isCandidate ? "Candidato" : "Paciente";

  // Nome exibido:
  //  - candidato: "Dr. nome sobrenome" (já formatado pelo chamador)
  //  - paciente: sem Dr. (removemos prefixo aqui por segurança)
  const shownName = isCandidate ? displayName : stripDoctor(displayName);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, color-mix(in oklab, var(--medical) 22%, transparent) 0%, var(--night) 55%, #050303 100%)",
      }}
      aria-live="polite"
    >
      {/* Grade sutil em bronze */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(var(--medical) 1px, transparent 1px), linear-gradient(90deg, var(--medical) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Halos quentes */}
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-[440px] w-[440px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--medical) 35%, transparent), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-32 -bottom-32 h-[440px] w-[440px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--mint) 30%, transparent), transparent 70%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.75)_100%)]" />

      {/* Logo no topo */}
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.92 }}
        animate={{
          opacity: phase === "countdown" ? 0.35 : 1,
          y: 0,
          scale: phase === "logo" ? 1 : 0.88,
        }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-1/2 top-[11%] -translate-x-1/2 text-center"
      >
        <img
          src={logoUrl}
          alt="REVMED"
          draggable={false}
          className="mx-auto h-14 w-auto select-none md:h-16"
          style={{
            filter:
              "drop-shadow(0 0 30px color-mix(in oklab, var(--medical) 55%, transparent))",
          }}
        />
        <div
          className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em]"
          style={{
            borderColor: "color-mix(in oklab, var(--medical) 45%, transparent)",
            background: "color-mix(in oklab, var(--medical) 12%, transparent)",
            color: "var(--medical)",
          }}
        >
          <Activity className="h-3 w-3" /> Estação ativa
        </div>
      </motion.div>

      {/* Cartão de identidade */}
      <AnimatePresence>
        {(phase === "card" || phase === "countdown") && (
          <motion.div
            key="card"
            initial={{ y: 60, opacity: 0, scale: 0.94 }}
            animate={{
              y: phase === "countdown" ? -36 : 0,
              opacity: phase === "countdown" ? 0.35 : 1,
              scale: phase === "countdown" ? 0.9 : 1,
            }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: "spring", damping: 20, stiffness: 130 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(520px,92vw)]"
          >
            <div
              className="relative overflow-hidden rounded-3xl border shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)]"
              style={{
                borderColor:
                  "color-mix(in oklab, var(--medical) 38%, transparent)",
                background:
                  "linear-gradient(160deg, color-mix(in oklab, var(--surface-2) 92%, transparent) 0%, color-mix(in oklab, var(--night) 95%, transparent) 100%)",
              }}
            >
              {/* faixa superior gradiente laranja */}
              <div
                className="h-1.5"
                style={{
                  background:
                    "linear-gradient(90deg, var(--medical), var(--mint), var(--medical-dark))",
                }}
              />

              <div className="px-7 py-6">
                {/* role chip */}
                <div className="flex items-center justify-between">
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]"
                    style={{
                      borderColor:
                        "color-mix(in oklab, var(--medical) 45%, transparent)",
                      background:
                        "color-mix(in oklab, var(--medical) 14%, transparent)",
                      color: "var(--medical)",
                    }}
                  >
                    <RoleIcon className="h-3 w-3" /> {roleLabel}
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.22em]"
                    style={{ color: "var(--bronze, #6D4A25)" }}
                  >
                    REVMED
                  </span>
                </div>

                {/* nome */}
                <div className="mt-5">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-white/45">
                    {isCandidate ? "Médico em prova" : "Paciente da estação"}
                  </div>
                  <div className="mt-1 font-display text-2xl font-bold leading-tight text-white md:text-3xl">
                    {shownName}
                  </div>
                </div>

                {/* divisor laranja */}
                <div
                  className="my-5 h-px w-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, color-mix(in oklab, var(--medical) 60%, transparent), transparent)",
                  }}
                />

                {/* infos da estação */}
                <div className="space-y-3">
                  {!isCandidate && stationTitle && (
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.24em] text-white/45">
                        Checklist
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-sm font-medium text-white/90">
                        {stationTitle}
                      </div>
                    </div>
                  )}
                  {specialty && (
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.24em] text-white/45">
                        Especialidade
                      </div>
                      <div
                        className="mt-0.5 text-sm font-semibold"
                        style={{ color: "var(--medical)" }}
                      >
                        {specialty}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* faixa inferior */}
              <div
                className="h-1"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, color-mix(in oklab, var(--medical) 60%, transparent), transparent)",
                }}
              />
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
            exit={{ opacity: 0, scale: 1.6, filter: "blur(6px)" }}
            transition={{ duration: 0.45 }}
            className="absolute inset-x-0 bottom-[12%] flex flex-col items-center justify-center"
          >
            {count > 0 ? (
              <div
                className="font-display font-bold leading-none text-[clamp(5rem,18vw,13rem)]"
                style={{
                  color: "var(--medical)",
                  textShadow:
                    "0 0 50px color-mix(in oklab, var(--medical) 70%, transparent)",
                }}
              >
                {count}
              </div>
            ) : (
              <div className="font-display font-bold text-white text-[clamp(1.75rem,4.5vw,3rem)]">
                Estação iniciada
              </div>
            )}
            <div
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] text-white/85"
              style={{
                borderColor:
                  "color-mix(in oklab, var(--medical) 40%, transparent)",
                background:
                  "color-mix(in oklab, var(--medical) 10%, transparent)",
              }}
            >
              <RoleIcon
                className="h-3 w-3"
                style={{ color: "var(--medical)" }}
              />{" "}
              {shownName.split(" ")[0]}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}