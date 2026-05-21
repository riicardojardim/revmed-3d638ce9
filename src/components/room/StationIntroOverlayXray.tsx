import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Activity, Stethoscope, UserRound, ScanLine } from "lucide-react";

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

// Timeline
const PHASE_AT = {
  intro: 0,
  booting: 400,       // boot do scanner
  scanning: 1600,     // barra desce
  revealing: 5000,    // dados aparecem
  countdown: 6500,
} as const;
const COUNT_STEP_MS = 700;
const COUNT_END_MS = 600;

type Phase = "intro" | "booting" | "scanning" | "revealing" | "countdown" | "done";

/**
 * Raio-X revelando — silhueta humana escaneada de cima a baixo,
 * revelando ossos e os dados da estação (título, especialidade, papel).
 */
export function StationIntroOverlayXray({
  role, stationTitle, specialty, displayName, onComplete, startAtMs, nowMs,
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
    initialElapsed >= PHASE_AT.countdown ? "countdown"
    : initialElapsed >= PHASE_AT.revealing ? "revealing"
    : initialElapsed >= PHASE_AT.scanning ? "scanning"
    : initialElapsed >= PHASE_AT.booting ? "booting"
    : "intro";
  const initialCount: 3 | 2 | 1 | 0 = (() => {
    if (initialPhase !== "countdown") return 3;
    const inCd = initialElapsed - PHASE_AT.countdown;
    const step = Math.floor(inCd / COUNT_STEP_MS);
    return Math.max(0, 3 - step) as 3 | 2 | 1 | 0;
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
      schedule(PHASE_AT.booting, "booting"),
      schedule(PHASE_AT.scanning, "scanning"),
      schedule(PHASE_AT.revealing, "revealing"),
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
  const RoleIcon = isCandidate ? Stethoscope : UserRound;
  // candidato = verde clínico; ator/banca = ciano frio
  const accent = isCandidate ? "rgb(120, 255, 180)" : "rgb(120, 220, 255)";
  const accentSoft = isCandidate ? "rgba(120,255,180,0.18)" : "rgba(120,220,255,0.18)";
  const accentGlow = isCandidate ? "rgba(120,255,180,0.55)" : "rgba(120,220,255,0.55)";

  const booted = phase !== "intro";
  const scanning = phase === "scanning" || phase === "revealing" || phase === "countdown" || phase === "done";
  const revealed = phase === "revealing" || phase === "countdown" || phase === "done";
  const counting = phase === "countdown" || phase === "done";

  const scanDuration = (PHASE_AT.revealing - PHASE_AT.scanning) / 1000;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] overflow-hidden bg-black"
      aria-live="polite"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at center, rgba(20,40,60,0.55) 0%, rgba(0,0,0,1) 70%)",
      }}
    >
      {/* Grade técnica de fundo */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            `linear-gradient(${accentSoft} 1px, transparent 1px), linear-gradient(90deg, ${accentSoft} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />

      {/* HUD topo: identificação do scanner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: booted ? 1 : 0, y: booted ? 0 : -10 }}
        transition={{ duration: 0.4 }}
        className="absolute left-1/2 top-6 -translate-x-1/2 z-20 flex items-center gap-3 rounded-full border px-4 py-2 backdrop-blur-md"
        style={{ borderColor: accentSoft, background: "rgba(0,0,0,0.5)", color: accent }}
      >
        <ScanLine className="h-4 w-4" />
        <span className="font-mono text-[11px] tracking-[0.25em] uppercase">
          REVMED · Scanner Radiológico v3.2
        </span>
        <motion.span
          className="h-2 w-2 rounded-full"
          style={{ background: accent, boxShadow: `0 0 8px ${accentGlow}` }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      </motion.div>

      {/* HUD esquerdo: dados técnicos */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: booted ? 1 : 0, x: booted ? 0 : -20 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-2 font-mono text-[10px]"
        style={{ color: accent }}
      >
        {[
          ["MODE", isCandidate ? "CANDIDATE" : "EXAMINER"],
          ["kVp", "120"],
          ["mA", "320"],
          ["EXP", "0.08s"],
          ["FILTER", "AL 2.5mm"],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-2 items-center">
            <span className="opacity-60">{k}</span>
            <span className="border-b border-dashed flex-1 min-w-[40px]" style={{ borderColor: accentSoft }} />
            <span>{v}</span>
          </div>
        ))}
      </motion.div>

      {/* HUD direito: status */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: booted ? 1 : 0, x: booted ? 0 : 20 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-2 font-mono text-[10px] text-right"
        style={{ color: accent }}
      >
        <div>SUBJECT</div>
        <div className="text-base font-semibold tracking-wide" style={{ textShadow: `0 0 12px ${accentGlow}` }}>
          {displayName}
        </div>
        <div className="opacity-60 mt-2">ROLE</div>
        <div className="flex items-center gap-1 justify-end">
          <RoleIcon className="h-3 w-3" />
          <span>{isCandidate ? "Candidato" : "Ator / Banca"}</span>
        </div>
        {specialty ? (
          <>
            <div className="opacity-60 mt-2">SPECIALTY</div>
            <div>{specialty}</div>
          </>
        ) : null}
      </motion.div>

      {/* === ÁREA DO SCAN: silhueta humana === */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ width: 320, height: 560 }}>
          {/* Moldura do scanner */}
          <div
            className="absolute -inset-6 rounded-3xl border"
            style={{
              borderColor: accentSoft,
              boxShadow: `inset 0 0 80px ${accentSoft}, 0 0 60px rgba(0,0,0,0.8)`,
            }}
          />
          {/* cantos da moldura */}
          {[
            "top-[-12px] left-[-12px] border-t-2 border-l-2",
            "top-[-12px] right-[-12px] border-t-2 border-r-2",
            "bottom-[-12px] left-[-12px] border-b-2 border-l-2",
            "bottom-[-12px] right-[-12px] border-b-2 border-r-2",
          ].map((cls, i) => (
            <div key={i} className={`absolute h-5 w-5 ${cls}`} style={{ borderColor: accent }} />
          ))}

          {/* Silhueta (corpo) — só visível depois do boot */}
          <svg
            viewBox="0 0 200 360"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* corpo cheio (silhueta escura) */}
            <motion.path
              d="M100 18c-14 0-25 11-25 25 0 9 4 17 11 21-8 3-14 8-18 16l-10 22c-3 7-1 14 6 17 5 2 10 0 13-5l4-9v60l-8 90c-1 8 4 14 12 14 6 0 11-4 12-10l6-58h4l6 58c1 6 6 10 12 10 8 0 13-6 12-14l-8-90v-60l4 9c3 5 8 7 13 5 7-3 9-10 6-17l-10-22c-4-8-10-13-18-16 7-4 11-12 11-21 0-14-11-25-25-25z"
              fill={accentSoft}
              stroke={accent}
              strokeWidth="0.8"
              initial={{ opacity: 0 }}
              animate={{ opacity: booted ? 0.5 : 0 }}
              transition={{ duration: 0.6 }}
            />

            {/* ESQUELETO — revelado conforme o scan passa */}
            <defs>
              <linearGradient id="xrayReveal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity="0" />
                <stop offset="50%" stopColor="white" stopOpacity="0" />
                <stop offset="100%" stopColor="white" stopOpacity="0">
                  <animate
                    attributeName="offset"
                    from="0"
                    to="1"
                    dur={`${scanDuration}s`}
                    begin={scanning ? "0s" : "indefinite"}
                    fill="freeze"
                  />
                </stop>
                <stop offset="100%" stopColor="white" stopOpacity="1">
                  <animate
                    attributeName="offset"
                    from="0"
                    to="1"
                    dur={`${scanDuration}s`}
                    begin={scanning ? "0s" : "indefinite"}
                    fill="freeze"
                  />
                </stop>
              </linearGradient>
              <mask id="scanMask">
                <rect x="0" y="0" width="200" height="360" fill="url(#xrayReveal)" />
              </mask>
              <filter id="boneGlow">
                <feGaussianBlur stdDeviation="0.6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g mask="url(#scanMask)" stroke={accent} strokeWidth="1.1" fill="none" filter="url(#boneGlow)" opacity={revealed ? 1 : 0.95}>
              {/* crânio */}
              <ellipse cx="100" cy="42" rx="20" ry="24" />
              <line x1="100" y1="18" x2="100" y2="66" strokeDasharray="1 2" opacity="0.5" />
              <circle cx="92" cy="40" r="2.5" />
              <circle cx="108" cy="40" r="2.5" />
              {/* mandíbula */}
              <path d="M86 56 Q100 70 114 56" />
              {/* coluna */}
              <line x1="100" y1="68" x2="100" y2="200" strokeDasharray="3 2" />
              {/* clavículas */}
              <path d="M70 82 Q100 76 130 82" />
              {/* costelas (caixa torácica) */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <path
                  key={i}
                  d={`M${72 - i * 0.5} ${90 + i * 10} Q100 ${100 + i * 10} ${128 + i * 0.5} ${90 + i * 10}`}
                  opacity={0.85 - i * 0.05}
                />
              ))}
              {/* esterno */}
              <line x1="100" y1="86" x2="100" y2="150" />
              {/* pelve */}
              <path d="M70 200 Q100 215 130 200 Q125 225 100 222 Q75 225 70 200 Z" />
              {/* braços */}
              <line x1="68" y1="86" x2="50" y2="150" />
              <line x1="50" y1="150" x2="42" y2="210" />
              <line x1="132" y1="86" x2="150" y2="150" />
              <line x1="150" y1="150" x2="158" y2="210" />
              {/* mãos (5 dedos simplificados) */}
              {[0, 1, 2, 3, 4].map((i) => (
                <line key={`lh${i}`} x1={42} y1={210} x2={36 + i * 2} y2={224 + i} />
              ))}
              {[0, 1, 2, 3, 4].map((i) => (
                <line key={`rh${i}`} x1={158} y1={210} x2={156 + i * 2} y2={224 + i} />
              ))}
              {/* pernas */}
              <line x1="86" y1="222" x2="78" y2="290" />
              <line x1="78" y1="290" x2="74" y2="345" />
              <line x1="114" y1="222" x2="122" y2="290" />
              <line x1="122" y1="290" x2="126" y2="345" />
              {/* pés */}
              <line x1="74" y1="345" x2="62" y2="350" />
              <line x1="126" y1="345" x2="138" y2="350" />

              {/* CORAÇÃO destacado */}
              <motion.path
                d="M92 110 Q88 104 95 104 Q100 104 100 110 Q100 104 105 104 Q112 104 108 110 Q108 120 100 128 Q92 120 92 110 Z"
                fill={accentGlow}
                stroke={accent}
                animate={revealed ? { scale: [1, 1.08, 1] } : {}}
                style={{ transformOrigin: "100px 116px" }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            </g>
          </svg>

          {/* Linha de scan (move de cima a baixo) */}
          {scanning && !counting && (
            <motion.div
              className="absolute left-0 right-0 h-[3px]"
              style={{
                background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                boxShadow: `0 0 24px 6px ${accentGlow}`,
              }}
              initial={{ top: 0 }}
              animate={{ top: "100%" }}
              transition={{ duration: scanDuration, ease: "linear" }}
            />
          )}
          {/* halo do scan */}
          {scanning && !counting && (
            <motion.div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                height: 120,
                background: `linear-gradient(180deg, transparent, ${accentSoft}, transparent)`,
                mixBlendMode: "screen",
              }}
              initial={{ top: -120 }}
              animate={{ top: "100%" }}
              transition={{ duration: scanDuration, ease: "linear" }}
            />
          )}

          {/* ECG no rodapé do painel — aparece após revelar */}
          <AnimatePresence>
            {revealed && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -bottom-10 left-0 right-0 flex items-center gap-2"
                style={{ color: accent }}
              >
                <Activity className="h-3.5 w-3.5" />
                <svg viewBox="0 0 200 20" className="flex-1 h-5">
                  <motion.path
                    d="M0 10 L40 10 L48 4 L56 16 L64 10 L120 10 L128 2 L136 18 L144 10 L200 10"
                    fill="none"
                    stroke={accent}
                    strokeWidth="1.2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </svg>
                <span className="font-mono text-[10px]">72 bpm</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* TÍTULO DA ESTAÇÃO — aparece no reveal */}
      <AnimatePresence>
        {revealed && !counting && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="absolute left-1/2 bottom-20 -translate-x-1/2 z-20 text-center px-6"
            style={{ color: accent }}
          >
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-70">
              {isCandidate ? "Área de avaliação" : "Diagnóstico identificado"}
            </div>
            <div
              className="mt-2 font-display text-2xl md:text-3xl font-bold tracking-tight"
              style={{ color: "white", textShadow: `0 0 24px ${accentGlow}` }}
            >
              {isCandidate ? (specialty || "Sigiloso até a abertura") : stationTitle}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTAGEM */}
      <AnimatePresence>
        {counting && (
          <motion.div
            key={count}
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center"
          >
            <div
              className="font-display text-[140px] font-bold leading-none"
              style={{ color: accent, textShadow: `0 0 60px ${accentGlow}` }}
            >
              {count === 0 ? "GO" : count}
            </div>
            <div className="mt-2 font-mono text-xs tracking-[0.3em] uppercase opacity-70" style={{ color: accent }}>
              {isCandidate ? "Iniciando estação" : "Recebendo candidato"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanlines CRT sutis */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 3px)",
        }}
      />
    </motion.div>
  );
}
