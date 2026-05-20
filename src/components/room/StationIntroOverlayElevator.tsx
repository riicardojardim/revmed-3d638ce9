import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, Stethoscope, UserRound, Bell } from "lucide-react";

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
  riding: 400,        // contador rolando (8 -> T)
  arriving: 3600,     // chega no T, "ting"
  opening: 4400,      // portas começam a abrir
  open: 6000,         // portas abertas, reveal
  countdown: 6500,
} as const;
const COUNT_STEP_MS = 700;
const COUNT_END_MS = 600;

type Phase = "intro" | "riding" | "arriving" | "opening" | "open" | "countdown" | "done";

// Sequência de andares mostrada no painel (de cima pra baixo, descendo até T)
const FLOORS = ["8", "7", "6", "5", "4", "3", "2", "1", "T"] as const;

/**
 * Elevador hospitalar — painel numérico com andares passando, "ting" no térreo,
 * portas de elevador abrindo e revelando o corredor da estação.
 */
export function StationIntroOverlayElevator({
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
    : initialElapsed >= PHASE_AT.open ? "open"
    : initialElapsed >= PHASE_AT.opening ? "opening"
    : initialElapsed >= PHASE_AT.arriving ? "arriving"
    : initialElapsed >= PHASE_AT.riding ? "riding"
    : "intro";
  const initialCount: 3 | 2 | 1 | 0 = (() => {
    if (initialPhase !== "countdown") return 3;
    const inCd = initialElapsed - PHASE_AT.countdown;
    const step = Math.floor(inCd / COUNT_STEP_MS);
    return Math.max(0, 3 - step) as 3 | 2 | 1 | 0;
  })();

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [count, setCount] = useState<3 | 2 | 1 | 0>(initialCount);

  // índice atual do andar (0..FLOORS.length-1)
  const ridingDuration = (PHASE_AT.arriving - PHASE_AT.riding) / 1000; // em segundos
  const ridingDurationMs = PHASE_AT.arriving - PHASE_AT.riding;

  const [floorIdx, setFloorIdx] = useState<number>(() => {
    if (initialPhase === "intro" || initialPhase === "riding" || initialPhase === "arriving") {
      const localElapsed = Math.max(0, initialElapsed - PHASE_AT.riding);
      const ratio = Math.min(1, localElapsed / ridingDurationMs);
      return Math.min(FLOORS.length - 1, Math.floor(ratio * (FLOORS.length - 1)));
    }
    return FLOORS.length - 1;
  });

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
      schedule(PHASE_AT.riding, "riding"),
      schedule(PHASE_AT.arriving, "arriving"),
      schedule(PHASE_AT.opening, "opening"),
      schedule(PHASE_AT.open, "open"),
      schedule(PHASE_AT.countdown, "countdown"),
    ].filter((t): t is ReturnType<typeof setTimeout> => t !== null);
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, anchor]);

  // anima o índice de andar de baixo do estado atual até o final
  useEffect(() => {
    if (phase !== "riding") {
      if (phase === "arriving" || phase === "opening" || phase === "open" || phase === "countdown" || phase === "done") {
        setFloorIdx(FLOORS.length - 1);
      }
      return;
    }
    const stepMs = ridingDurationMs / (FLOORS.length - 1);
    const elapsed = Math.max(0, now() - anchor - PHASE_AT.riding);
    let i = Math.min(FLOORS.length - 1, Math.floor(elapsed / stepMs));
    setFloorIdx(i);
    const interval = setInterval(() => {
      i += 1;
      if (i >= FLOORS.length - 1) {
        setFloorIdx(FLOORS.length - 1);
        clearInterval(interval);
        return;
      }
      setFloorIdx(i);
    }, stepMs);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, anchor]);

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

  // candidato = âmbar/dígito 7-segmentos quente | ator/banca = azul-aço institucional
  const accent = isCandidate ? "#ffb347" : "#7dd3fc";
  const accentGlow = isCandidate ? "rgba(255,179,71,0.55)" : "rgba(125,211,252,0.55)";
  const accentSoft = isCandidate ? "rgba(255,179,71,0.18)" : "rgba(125,211,252,0.18)";

  const cabinVisible = phase !== "intro";
  const arrived = phase === "arriving" || phase === "opening" || phase === "open" || phase === "countdown" || phase === "done";
  const opening = phase === "opening" || phase === "open" || phase === "countdown" || phase === "done";
  const opened = phase === "open" || phase === "countdown" || phase === "done";
  const counting = phase === "countdown" || phase === "done";

  const currentFloor = FLOORS[Math.min(floorIdx, FLOORS.length - 1)];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] overflow-hidden bg-black"
      aria-live="polite"
      style={{
        background:
          "radial-gradient(ellipse at center, #1a1d22 0%, #0a0b0d 70%, #000 100%)",
      }}
    >
      {/* HUD topo: identificação */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: cabinVisible ? 1 : 0, y: cabinVisible ? 0 : -10 }}
        transition={{ duration: 0.4 }}
        className="absolute left-1/2 top-6 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border px-4 py-1.5 backdrop-blur-md"
        style={{ borderColor: accentSoft, background: "rgba(0,0,0,0.5)", color: accent }}
      >
        <Bell className="h-3.5 w-3.5" />
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase">
          Estação Revalida · Elevador Clínico
        </span>
      </motion.div>

      {/* === CABINE === */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{
            width: "min(720px, 94vw)",
            height: "min(640px, 84vh)",
          }}
        >
          {/* moldura externa da cabine */}
          <div
            className="absolute inset-0 rounded-md"
            style={{
              background:
                "linear-gradient(180deg, #2a2d33 0%, #1a1c20 100%)",
              boxShadow:
                "0 30px 80px -20px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          />

          {/* painel de andares (topo) */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-5 flex items-center gap-4 rounded-md border px-5 py-2 z-20"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "linear-gradient(180deg,#0a0b0d,#15171b)",
              boxShadow: `inset 0 0 24px ${accentSoft}, 0 4px 12px rgba(0,0,0,0.6)`,
            }}
          >
            {/* setas de direção */}
            <div className="flex flex-col items-center gap-0.5" style={{ color: accent }}>
              <motion.div
                animate={arrived ? { opacity: 0.2 } : { opacity: [1, 0.25, 1] }}
                transition={arrived ? { duration: 0.3 } : { duration: 0.8, repeat: Infinity }}
              >
                <ArrowUp className="h-4 w-4 opacity-25" />
              </motion.div>
              <motion.div
                animate={arrived ? { opacity: 0.2 } : { opacity: [0.25, 1, 0.25] }}
                transition={arrived ? { duration: 0.3 } : { duration: 0.8, repeat: Infinity }}
              >
                <ArrowDown className="h-4 w-4" style={{ filter: `drop-shadow(0 0 6px ${accentGlow})` }} />
              </motion.div>
            </div>

            {/* dígito 7-segmentos */}
            <div
              className="relative flex items-center justify-center"
              style={{
                width: 92,
                height: 72,
                background: "#0a0b0d",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 4,
                boxShadow: `inset 0 0 14px rgba(0,0,0,0.9)`,
              }}
            >
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={currentFloor}
                  initial={{ y: -40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 40, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="font-mono font-bold leading-none"
                  style={{
                    fontSize: 56,
                    color: accent,
                    textShadow: `0 0 18px ${accentGlow}, 0 0 4px ${accent}`,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {currentFloor}
                </motion.span>
              </AnimatePresence>
              {/* "ghost" dos segmentos apagados */}
              <span
                className="absolute font-mono font-bold leading-none pointer-events-none"
                style={{
                  fontSize: 56,
                  color: accent,
                  opacity: 0.08,
                }}
              >
                8
              </span>
            </div>

            {/* sino de chegada */}
            <motion.div
              animate={arrived ? { rotate: [0, -18, 16, -10, 8, -4, 0], scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.7, ease: "easeOut" }}
              style={{ color: accent }}
            >
              <Bell className="h-5 w-5" style={{ filter: arrived ? `drop-shadow(0 0 8px ${accentGlow})` : "none" }} />
            </motion.div>
          </div>

          {/* "ondas" do ting */}
          <AnimatePresence>
            {phase === "arriving" && (
              <>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute left-1/2 -translate-x-1/2 top-5 rounded-md pointer-events-none"
                    style={{
                      width: 220, height: 56,
                      border: `1px solid ${accent}`,
                    }}
                    initial={{ opacity: 0.6, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.6 }}
                    transition={{ duration: 1, delay: i * 0.18, ease: "easeOut" }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          {/* === poço da porta (área que se revela) === */}
          <div
            className="absolute left-6 right-6 rounded-md overflow-hidden"
            style={{
              top: 96,
              bottom: 80,
              background:
                "linear-gradient(180deg, #0c0d10 0%, #06070a 100%)",
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.8)",
            }}
          >
            {/* CORREDOR revelado (visível através da abertura) */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{
                background: isCandidate
                  ? "radial-gradient(ellipse at center, rgba(255,200,120,0.18), transparent 70%), #0d0c0a"
                  : "radial-gradient(ellipse at center, rgba(150,200,255,0.16), transparent 70%), #0a0d12",
              }}
            >
              {/* perspectiva do corredor (linhas convergindo) */}
              <svg
                viewBox="0 0 600 400"
                className="absolute inset-0 w-full h-full opacity-50"
                preserveAspectRatio="xMidYMid slice"
              >
                {/* chão em perspectiva */}
                <path d="M0 400 L300 200 L600 400 Z" fill={accentSoft} opacity="0.3" />
                {/* linhas do teto */}
                {[0.1, 0.25, 0.4].map((y, i) => (
                  <line
                    key={`t${i}`}
                    x1={0 + i * 60} y1={y * 400}
                    x2={600 - i * 60} y2={y * 400}
                    stroke={accent} strokeWidth="0.5" opacity={0.4 - i * 0.1}
                  />
                ))}
                {/* luzes do teto */}
                {[0.18, 0.32, 0.46].map((y, i) => (
                  <rect
                    key={`l${i}`}
                    x={300 - (40 + i * 30)} y={y * 400 - 4}
                    width={(80 + i * 60)} height={3}
                    fill={accent} opacity={0.6 - i * 0.15}
                  />
                ))}
                {/* portas laterais do corredor */}
                {[0, 1, 2].map((i) => {
                  const t = 0.2 + i * 0.18;
                  const inset = 300 - 280 * (1 - t);
                  return (
                    <g key={`d${i}`}>
                      <rect x={inset - 30} y={140 + i * 30} width="20" height="80" fill="none" stroke={accent} strokeWidth="0.8" opacity={0.55 - i * 0.1} />
                      <rect x={600 - inset + 10} y={140 + i * 30} width="20" height="80" fill="none" stroke={accent} strokeWidth="0.8" opacity={0.55 - i * 0.1} />
                    </g>
                  );
                })}
                {/* sinal "estação" no fundo */}
                <text x="300" y="190" textAnchor="middle" fill={accent} fontFamily="monospace" fontSize="10" letterSpacing="2" opacity="0.7">
                  ESTAÇÃO
                </text>
              </svg>

              {/* haze / luz de fundo */}
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{
                  width: 360, height: 160,
                  background: `radial-gradient(ellipse, ${accentGlow}, transparent 70%)`,
                  filter: "blur(20px)",
                  mixBlendMode: "screen",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: opened ? 0.9 : opening ? 0.5 : 0 }}
                transition={{ duration: 0.8 }}
              />

              {/* TÍTULO / IDENTIFICAÇÃO no corredor */}
              <AnimatePresence>
                {opened && !counting && (
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10 text-center px-6"
                  >
                    <div
                      className="font-mono text-[10px] tracking-[0.35em] uppercase opacity-70"
                      style={{ color: accent }}
                    >
                      Térreo · Sala de avaliação
                    </div>
                    <div
                      className="mt-2 font-display text-2xl md:text-4xl font-bold leading-tight"
                      style={{ color: "white", textShadow: `0 0 30px ${accentGlow}` }}
                    >
                      {isCandidate
                        ? (specialty || "Sigiloso até a abertura")
                        : stationTitle}
                    </div>
                    {!isCandidate && specialty && (
                      <div
                        className="mt-2 font-mono text-[11px] tracking-[0.3em] uppercase opacity-70"
                        style={{ color: accent }}
                      >
                        {specialty}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* === PORTAS DO ELEVADOR (deslizam pra fora) === */}
            {/* porta esquerda */}
            <motion.div
              className="absolute top-0 bottom-0 left-0"
              style={{
                width: "50%",
                background:
                  "linear-gradient(90deg, #3a3d43 0%, #2a2d33 70%, #1e2025 100%)",
                borderRight: "1px solid rgba(0,0,0,0.6)",
                boxShadow: "inset -8px 0 18px rgba(0,0,0,0.6)",
              }}
              initial={{ x: 0 }}
              animate={{ x: opening ? "-100%" : 0 }}
              transition={{ duration: 1.4, ease: [0.6, 0.05, 0.2, 1] }}
            >
              {/* faixa metálica */}
              <div className="absolute inset-y-0 right-0 w-[3px] bg-gradient-to-b from-white/20 via-white/5 to-white/20" />
              {/* corrimão central da porta */}
              <div className="absolute inset-y-12 right-1 w-[2px] bg-black/40" />
              {/* "escovado" */}
              <div
                className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px)",
                }}
              />
            </motion.div>
            {/* porta direita */}
            <motion.div
              className="absolute top-0 bottom-0 right-0"
              style={{
                width: "50%",
                background:
                  "linear-gradient(270deg, #3a3d43 0%, #2a2d33 70%, #1e2025 100%)",
                borderLeft: "1px solid rgba(0,0,0,0.6)",
                boxShadow: "inset 8px 0 18px rgba(0,0,0,0.6)",
              }}
              initial={{ x: 0 }}
              animate={{ x: opening ? "100%" : 0 }}
              transition={{ duration: 1.4, ease: [0.6, 0.05, 0.2, 1] }}
            >
              <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-white/20 via-white/5 to-white/20" />
              <div className="absolute inset-y-12 left-1 w-[2px] bg-black/40" />
              <div
                className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px)",
                }}
              />
            </motion.div>

            {/* fresta vertical de luz no momento da abertura */}
            <AnimatePresence>
              {opening && !opened && (
                <motion.div
                  className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
                  style={{
                    width: 12,
                    background: `linear-gradient(180deg, transparent, ${accent}, transparent)`,
                    filter: `blur(6px)`,
                    mixBlendMode: "screen",
                  }}
                  initial={{ opacity: 0, scaleX: 0.2 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* rodapé da cabine: painel de papel/role */}
          <div className="absolute left-8 right-8 bottom-5 flex items-end justify-between font-mono text-[10px] z-20" style={{ color: "rgba(255,255,255,0.6)" }}>
            <div className="flex items-center gap-2">
              <span className="opacity-50">PASSAGEIRO</span>
              <span className="text-white/90">{displayName}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 backdrop-blur-sm">
              <RoleIcon className="h-3 w-3" style={{ color: accent }} />
              <span>{isCandidate ? "Candidato" : "Ator / Banca"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* "TING" textual no momento da chegada */}
      <AnimatePresence>
        {phase === "arriving" && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
          >
            <div
              className="font-display font-black tracking-[0.1em]"
              style={{
                fontSize: "clamp(3rem, 10vw, 7rem)",
                color: accent,
                textShadow: `0 0 60px ${accentGlow}, 0 0 12px ${accent}`,
                WebkitTextStroke: `1px ${accentSoft}`,
              }}
            >
              TING!
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
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/55 backdrop-blur-[3px]"
          >
            <div
              className="font-display font-bold leading-none"
              style={{
                color: accent,
                fontSize: "clamp(7rem, 22vw, 17rem)",
                textShadow: `0 0 60px ${accentGlow}`,
              }}
            >
              {count === 0 ? "GO" : count}
            </div>
            <div className="mt-2 font-mono text-xs tracking-[0.35em] uppercase opacity-70" style={{ color: accent }}>
              {isCandidate ? "Iniciando estação" : "Recebendo candidato"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* grão sutil */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
    </motion.div>
  );
}
