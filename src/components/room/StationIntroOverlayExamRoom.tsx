import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ClipboardList, Stethoscope, UserRound, Users } from "lucide-react";

export type IntroRole = "candidato" | "paciente";

export const INTRO_DURATION_MS = 9000;

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

// Marcos (ms)
const PHASE_AT = {
  intro: 0,
  approach: 700,    // walking up to door
  enter: 2400,      // door opens, doctor steps in
  reveal: 3800,     // banca revealed / clipboard handed
  settle: 5400,     // calmaria, título estação
  countdown: 6500,
} as const;
const COUNT_STEP_MS = 700;
const COUNT_END_MS = 600;

type Phase = "intro" | "approach" | "enter" | "reveal" | "settle" | "countdown" | "done";

export function StationIntroOverlayExamRoom({
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
    : initialElapsed >= PHASE_AT.settle ? "settle"
    : initialElapsed >= PHASE_AT.reveal ? "reveal"
    : initialElapsed >= PHASE_AT.enter ? "enter"
    : initialElapsed >= PHASE_AT.approach ? "approach"
    : "intro";
  const initialCount: 3 | 2 | 1 | 0 = (() => {
    if (initialPhase !== "countdown") return 3;
    const inCd = initialElapsed - PHASE_AT.countdown;
    return Math.max(0, 3 - Math.floor(inCd / COUNT_STEP_MS)) as 3 | 2 | 1 | 0;
  })();

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [count, setCount] = useState<3 | 2 | 1 | 0>(initialCount);

  useEffect(() => {
    if (reduce) {
      const t = setTimeout(() => setPhase("countdown"), 300);
      return () => clearTimeout(t);
    }
    const elapsed = Math.max(0, now() - anchor);
    const schedule = (at: number, p: Phase) => {
      const delay = at - elapsed;
      if (delay <= 0) return null;
      return setTimeout(() => setPhase(p), delay);
    };
    const timers = [
      schedule(PHASE_AT.approach, "approach"),
      schedule(PHASE_AT.enter, "enter"),
      schedule(PHASE_AT.reveal, "reveal"),
      schedule(PHASE_AT.settle, "settle"),
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
    const nextStepAt = anchor + PHASE_AT.countdown + (stepsTaken + 1) * COUNT_STEP_MS;
    const delay = Math.max(0, nextStepAt - now());
    const t = setTimeout(() => setCount((c) => (c - 1) as 3 | 2 | 1 | 0), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count, onComplete, anchor]);

  const isCandidate = role === "candidato";
  const accent = isCandidate ? "#7be3c4" : "#f5b454";
  const accentSoft = isCandidate ? "rgba(123,227,196,0.18)" : "rgba(245,180,84,0.18)";

  const stepIn = phase === "enter" || phase === "reveal" || phase === "settle" || phase === "countdown" || phase === "done";
  const revealed = phase === "reveal" || phase === "settle" || phase === "countdown" || phase === "done";
  const settled = phase === "settle" || phase === "countdown" || phase === "done";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[100] overflow-hidden bg-[#070912]"
      aria-live="polite"
    >
      {/* Ambient room background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 65% at 50% 55%, rgba(28,40,62,0.95) 0%, rgba(7,9,18,1) 75%)",
        }}
      />
      {/* Floor */}
      <div
        className="absolute inset-x-0 bottom-0 h-[42%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(20,28,44,0) 0%, rgba(16,22,36,0.85) 40%, rgba(8,12,22,1) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, transparent 0 38px, rgba(255,255,255,0.04) 38px 39px)",
        }}
      />
      {/* Grão */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.85)_100%)]" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute left-1/2 top-7 -translate-x-1/2"
      >
        <div
          className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] backdrop-blur-sm"
          style={{ borderColor: accentSoft, background: "rgba(255,255,255,0.03)", color: accent }}
        >
          <ClipboardList className="h-3 w-3" /> Estação Revalida
        </div>
      </motion.div>

      {/* === CENA === */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{ width: "min(92vw, 980px)", height: "min(78vh, 620px)", perspective: 1600 }}
        >
          {/* Mesa da banca (fundo) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: revealed ? 1 : 0.35, y: 0 }}
            transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: "32%", width: "62%" }}
          >
            {/* lâmpada / spot da banca */}
            <div
              className="absolute left-1/2 -translate-x-1/2 -top-24 h-44 w-[140%] rounded-[50%]"
              style={{
                background: `radial-gradient(ellipse 50% 80% at 50% 0%, ${accentSoft} 0%, transparent 70%)`,
                filter: "blur(10px)",
                opacity: revealed ? 1 : 0,
                transition: "opacity 800ms ease",
              }}
            />

            {/* Três avaliadores (silhuetas) */}
            <div className="relative flex items-end justify-center gap-10 pb-2">
              {[0, 1, 2].map((i) => (
                <Examiner key={i} delay={0.2 + i * 0.12} active={revealed} accent={accent} index={i} />
              ))}
            </div>

            {/* Mesa */}
            <div
              className="relative h-6 rounded-md"
              style={{
                background: "linear-gradient(180deg, #2a3550 0%, #141a2b 100%)",
                boxShadow: "0 30px 50px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            />
            <div
              className="mx-auto h-2 rounded-b-md"
              style={{
                width: "94%",
                background: "linear-gradient(180deg, #0e1322 0%, #06080f 100%)",
              }}
            />

            {/* Itens sobre a mesa: prontuários */}
            <div className="absolute inset-x-0 -top-3 flex justify-center gap-6">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: revealed ? 0.9 : 0, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                  className="h-3 w-12 rounded-sm"
                  style={{ background: "#e7e2d2", boxShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
                />
              ))}
            </div>
          </motion.div>

          {/* Vão da porta atrás da figura (apenas pré-entrada) */}
          <AnimatePresence>
            {!stepIn && (
              <motion.div
                key="door"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.7 }}
                className="absolute left-1/2 -translate-x-1/2"
                style={{ bottom: "8%", width: 220, height: 360 }}
              >
                <div
                  className="absolute inset-0 rounded-t-md"
                  style={{
                    background:
                      "linear-gradient(180deg, hsl(220 18% 14%) 0%, hsl(220 22% 8%) 100%)",
                    boxShadow:
                      "0 30px 60px -10px rgba(0,0,0,0.9), inset 0 0 0 1px hsl(220 30% 22%), inset 0 0 0 6px hsl(220 18% 14%)",
                  }}
                />
                <div
                  className="absolute inset-3 rounded-sm overflow-hidden"
                  style={{
                    background: `radial-gradient(ellipse 80% 100% at 50% 60%, ${accentSoft} 0%, rgba(0,0,0,0.85) 70%)`,
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* === Figura do médico (entrando) === */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.85 }}
            animate={{
              opacity: 1,
              y: stepIn ? 0 : 18,
              scale: settled ? 1 : stepIn ? 0.98 : 0.85,
            }}
            transition={{ duration: 1.0, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute left-1/2 -translate-x-1/2"
            style={{ bottom: "6%" }}
          >
            <Doctor accent={accent} entering={stepIn} />
            {/* shadow */}
            <div
              className="mx-auto mt-1 h-3 rounded-[50%] blur-md"
              style={{
                width: 140,
                background: "rgba(0,0,0,0.7)",
              }}
            />
          </motion.div>

          {/* Brilho de spotlight no médico quando entra */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: stepIn ? 0.55 : 0 }}
            transition={{ duration: 0.9 }}
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              bottom: "4%",
              width: 420,
              height: 320,
              background: `radial-gradient(ellipse 50% 70% at 50% 80%, ${accentSoft} 0%, transparent 70%)`,
              filter: "blur(8px)",
            }}
          />
        </div>
      </div>

      {/* === Texto inferior === */}
      <div className="absolute bottom-[7vh] left-1/2 -translate-x-1/2 w-full px-6 text-center">
        <AnimatePresence mode="wait">
          {phase === "intro" || phase === "approach" ? (
            <motion.div key="t1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.5 }}>
              <div className="font-display text-2xl text-white/95 md:text-3xl">
                {isCandidate ? "Prancheta na mão. Estetoscópio no pescoço." : "O candidato se aproxima da sala."}
              </div>
              <div className="mt-2 text-sm text-white/55">
                {isCandidate
                  ? `Respire fundo, ${displayName.split(" ")[0]}. A banca está esperando.`
                  : "Acolha com calma — siga o roteiro do caso."}
              </div>
            </motion.div>
          ) : phase === "enter" ? (
            <motion.div key="t2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.4 }}
              className="font-display text-xl text-white/90 inline-flex items-center gap-2">
              <Stethoscope className="h-5 w-5" style={{ color: accent }} />
              {isCandidate ? "Entrando na sala…" : "Candidato entrando…"}
            </motion.div>
          ) : phase === "reveal" ? (
            <motion.div key="t3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.5 }}
              className="font-display text-xl text-white/90 inline-flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: accent }} />
              {isCandidate ? "Banca avaliadora a postos" : "Banca avaliadora pronta"}
            </motion.div>
          ) : phase === "settle" ? (
            <motion.div key="t4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.5 }}>
              {!isCandidate && (
                <div className="text-sm text-white/55">{stationTitle}</div>
              )}
              {specialty && (
                <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-white/55">{specialty}</div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* === Countdown === */}
      <AnimatePresence>
        {phase === "countdown" && (
          <motion.div
            key={`cd-${count}`}
            initial={{ opacity: 0, scale: 0.55, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.45, filter: "blur(8px)" }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 backdrop-blur-[2px]"
          >
            {count > 0 ? (
              <div
                className="font-display font-bold leading-none text-[clamp(7rem,24vw,18rem)]"
                style={{ color: accent, textShadow: `0 0 60px ${accentSoft}` }}
              >
                {count}
              </div>
            ) : (
              <div className="font-display font-bold text-white text-[clamp(2.2rem,5.5vw,4rem)]">
                Estação iniciada
              </div>
            )}
            <div className="mt-6 flex flex-col items-center gap-2 text-center text-white/70">
              {isCandidate ? (
                <div className="font-display text-base font-medium text-white/90">
                  Boa prova, {displayName.split(" ")[0]}.
                </div>
              ) : (
                <>
                  <div className="font-display text-base font-medium text-white/90">{stationTitle}</div>
                  {specialty && (
                    <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{specialty}</div>
                  )}
                </>
              )}
              <div
                className="mt-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] backdrop-blur-sm"
                style={{ borderColor: "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.04)" }}
              >
                {isCandidate ? <Stethoscope className="h-3 w-3" style={{ color: accent }} /> : <UserRound className="h-3 w-3" style={{ color: accent }} />}
                {isCandidate ? "Candidato / Médico" : "Banca / Avaliador"}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------- Médico (SVG) ---------- */
function Doctor({ accent, entering }: { accent: string; entering: boolean }) {
  return (
    <motion.svg
      width="180" height="280" viewBox="0 0 180 280" fill="none"
      animate={entering ? { y: [0, -1.5, 0] } : { y: 0 }}
      transition={{ duration: 0.6, repeat: entering ? 1 : 0, ease: "easeInOut" }}
    >
      {/* Jaleco */}
      <path d="M30 270 L30 130 Q30 105 55 95 L70 90 L90 105 L110 90 L125 95 Q150 105 150 130 L150 270 Z"
        fill="#f4f5f8" stroke="#cfd3dc" strokeWidth="1.2" />
      {/* Sombra interna jaleco */}
      <path d="M90 105 L90 270" stroke="#d6dae1" strokeWidth="1.2" />
      {/* Botões */}
      <circle cx="90" cy="150" r="2.2" fill="#2a3550" />
      <circle cx="90" cy="180" r="2.2" fill="#2a3550" />
      <circle cx="90" cy="210" r="2.2" fill="#2a3550" />
      {/* Bolso */}
      <rect x="105" y="170" width="32" height="30" rx="2" fill="none" stroke="#c8cdd6" strokeWidth="1" />
      {/* Crachá */}
      <rect x="44" y="135" width="22" height="14" rx="2" fill={accent} />
      <rect x="46" y="137" width="18" height="3" rx="0.5" fill="rgba(0,0,0,0.35)" />
      {/* Cabeça */}
      <circle cx="90" cy="68" r="26" fill="#e9c9a8" stroke="#cda57f" strokeWidth="1" />
      {/* Cabelo */}
      <path d="M64 60 Q70 38 90 36 Q114 36 118 60 Q108 50 90 50 Q72 50 64 60 Z" fill="#3a2a20" />
      {/* Pescoço */}
      <rect x="82" y="90" width="16" height="10" fill="#e0bf9d" />
      {/* Estetoscópio */}
      <path d="M70 105 Q70 130 90 135 Q110 130 110 105"
        fill="none" stroke="#1a2236" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="90" cy="138" r="6" fill={accent} stroke="#0e1322" strokeWidth="1.5" />
      <circle cx="90" cy="138" r="2.5" fill="#0e1322" />
      {/* Braço esquerdo segurando prancheta */}
      <path d="M40 130 L30 200 L52 205 L60 145 Z" fill="#f4f5f8" stroke="#cfd3dc" strokeWidth="1" />
      {/* Prancheta */}
      <g transform="translate(8,180) rotate(-8)">
        <rect x="0" y="0" width="46" height="58" rx="3" fill="#c8a564" stroke="#8a6f3a" strokeWidth="1.2" />
        <rect x="14" y="-4" width="18" height="6" rx="1.5" fill="#8a6f3a" />
        <rect x="6" y="10" width="34" height="2.5" rx="1" fill="#f6efd9" />
        <rect x="6" y="18" width="28" height="2" rx="1" fill="#f6efd9" />
        <rect x="6" y="25" width="32" height="2" rx="1" fill="#f6efd9" />
        <rect x="6" y="32" width="22" height="2" rx="1" fill="#f6efd9" />
      </g>
      {/* Braço direito */}
      <path d="M140 130 L150 200 L128 205 L120 145 Z" fill="#f4f5f8" stroke="#cfd3dc" strokeWidth="1" />
      {/* Mão direita */}
      <circle cx="138" cy="206" r="6" fill="#e9c9a8" />
      {/* Calça */}
      <rect x="55" y="265" width="32" height="14" fill="#1a2236" />
      <rect x="93" y="265" width="32" height="14" fill="#1a2236" />
    </motion.svg>
  );
}

/* ---------- Avaliador (silhueta) ---------- */
function Examiner({ delay, active, accent, index }: { delay: number; active: boolean; accent: string; index: number }) {
  const scale = index === 1 ? 1.05 : 1;
  return (
    <motion.svg
      width={90 * scale} height={130 * scale} viewBox="0 0 90 130" fill="none"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: active ? 1 : 0.25, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {/* corpo */}
      <path d="M10 130 L10 80 Q10 60 30 56 L45 52 L60 56 Q80 60 80 80 L80 130 Z"
        fill="#1a2236" stroke="#2c3a5c" strokeWidth="1" />
      {/* gola/colarinho */}
      <path d="M35 56 L45 70 L55 56 L52 78 L38 78 Z" fill="#f4f5f8" opacity="0.92" />
      {/* gravata */}
      <path d="M43 70 L47 70 L48 90 L45 96 L42 90 Z" fill={accent} opacity="0.9" />
      {/* pescoço */}
      <rect x="40" y="44" width="10" height="10" fill="#cda57f" />
      {/* cabeça */}
      <circle cx="45" cy="32" r="18" fill="#e9c9a8" stroke="#cda57f" strokeWidth="0.8" />
      {/* cabelo */}
      <path d="M27 28 Q32 12 45 12 Q58 12 63 28 Q56 22 45 22 Q34 22 27 28 Z" fill="#2b1f17" />
      {/* óculos no centro */}
      {index === 1 && (
        <g stroke="#0e1322" strokeWidth="1.4" fill="none">
          <circle cx="39" cy="33" r="4" />
          <circle cx="51" cy="33" r="4" />
          <path d="M43 33 L47 33" />
        </g>
      )}
    </motion.svg>
  );
}
