import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Droplet, Stethoscope, UserRound, Activity } from "lucide-react";

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

/**
 * Soro pingando — bolsa de soro no alto, gotejador transparente,
 * gotas caem em ritmo e cada gota "se transforma" no próximo número do countdown.
 *
 * Timeline:
 *  0      → fade in
 *  600ms  → bolsa/equipo aparecem
 *  1600ms → primeira gota cai (warm-up, sem número ainda)
 *  2600ms → gota = 3
 *  3700ms → gota = 2
 *  4800ms → gota = 1
 *  5900ms → gota = GO  (flash + reveal do título)
 *  7400ms → fade out / done
 */
const PHASE_AT = {
  intro: 0,
  setup: 600,
  warm: 1600,
  drop3: 2600,
  drop2: 3700,
  drop1: 4800,
  go: 5900,
  end: 7600,
} as const;

type Phase = "intro" | "setup" | "warm" | "drop3" | "drop2" | "drop1" | "go" | "end" | "done";

const DROP_FALL_MS = 700;
const NUMBER_HOLD_MS = 900;

export function StationIntroOverlayIV({
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
  const phaseAtTime = (e: number): Phase => {
    if (e >= PHASE_AT.end) return "end";
    if (e >= PHASE_AT.go) return "go";
    if (e >= PHASE_AT.drop1) return "drop1";
    if (e >= PHASE_AT.drop2) return "drop2";
    if (e >= PHASE_AT.drop3) return "drop3";
    if (e >= PHASE_AT.warm) return "warm";
    if (e >= PHASE_AT.setup) return "setup";
    return "intro";
  };

  const [phase, setPhase] = useState<Phase>(phaseAtTime(initialElapsed));

  useEffect(() => {
    if (reduce) {
      const t = setTimeout(() => { setPhase("done"); onComplete(); }, 400);
      return () => clearTimeout(t);
    }
    const elapsed = Math.max(0, now() - anchor);
    const schedule = (at: number, p: Phase) => {
      const delay = at - elapsed;
      if (delay <= 0) return null;
      return setTimeout(() => setPhase(p), delay);
    };
    const timers = [
      schedule(PHASE_AT.setup, "setup"),
      schedule(PHASE_AT.warm, "warm"),
      schedule(PHASE_AT.drop3, "drop3"),
      schedule(PHASE_AT.drop2, "drop2"),
      schedule(PHASE_AT.drop1, "drop1"),
      schedule(PHASE_AT.go, "go"),
      schedule(PHASE_AT.end, "end"),
    ].filter((t): t is ReturnType<typeof setTimeout> => t !== null);
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, anchor]);

  useEffect(() => {
    if (phase !== "end") return;
    const t = setTimeout(() => { setPhase("done"); onComplete(); }, 400);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  const isCandidate = role === "candidato";
  const RoleIcon = isCandidate ? Stethoscope : UserRound;

  // candidato = soro azul-cristalino | ator/banca = soro âmbar/golden (D5)
  const accent = isCandidate ? "#7dd3fc" : "#fcd34d";
  const accentGlow = isCandidate ? "rgba(125,211,252,0.55)" : "rgba(252,211,77,0.55)";
  const accentSoft = isCandidate ? "rgba(125,211,252,0.18)" : "rgba(252,211,77,0.18)";
  const liquid = isCandidate ? "rgba(125,211,252,0.85)" : "rgba(252,211,77,0.85)";

  const setupVisible = phase !== "intro";
  // qual gota numerada está caindo agora?
  const currentNumber: 3 | 2 | 1 | "GO" | null =
    phase === "drop3" ? 3
    : phase === "drop2" ? 2
    : phase === "drop1" ? 1
    : phase === "go" ? "GO"
    : null;

  // controla o "esvaziar" da bolsa de soro
  const bagDrainPct = useMemo(() => {
    const totalMs = PHASE_AT.go - PHASE_AT.setup;
    const elapsedDrain = Math.max(0, (() => {
      switch (phase) {
        case "intro":
        case "setup": return 0;
        case "warm": return PHASE_AT.warm - PHASE_AT.setup;
        case "drop3": return PHASE_AT.drop3 - PHASE_AT.setup;
        case "drop2": return PHASE_AT.drop2 - PHASE_AT.setup;
        case "drop1": return PHASE_AT.drop1 - PHASE_AT.setup;
        case "go":
        case "end":
        case "done":  return totalMs;
        default: return 0;
      }
    })());
    return Math.min(1, elapsedDrain / totalMs);
  }, [phase]);

  // contagem visual: percentual líquido restante
  const remainingPct = (1 - bagDrainPct * 0.7) * 100; // não esvazia tudo

  // gotas "ambientais" (warm-up, antes/depois das numeradas)
  const ambientDrops = useMemo(() => [0, 1, 2, 3].map((i) => i), []);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] overflow-hidden bg-black"
      aria-live="polite"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, #0c1820 0%, #050608 70%, #000 100%)",
      }}
    >
      {/* grade clínica sutil */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage:
            `linear-gradient(${accentSoft} 1px, transparent 1px), linear-gradient(90deg, ${accentSoft} 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />

      {/* HUD topo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: setupVisible ? 1 : 0, y: setupVisible ? 0 : -10 }}
        transition={{ duration: 0.4 }}
        className="absolute left-1/2 top-6 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border px-4 py-1.5 backdrop-blur-md"
        style={{ borderColor: accentSoft, background: "rgba(0,0,0,0.5)", color: accent }}
      >
        <Activity className="h-3.5 w-3.5" />
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase">
          Estação Revalida · Infusão de Acesso
        </span>
        <motion.span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: accent, boxShadow: `0 0 8px ${accentGlow}` }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      </motion.div>

      {/* HUD lateral esquerdo: dados de infusão */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: setupVisible ? 1 : 0, x: setupVisible ? 0 : -20 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-1.5 font-mono text-[10px]"
        style={{ color: accent }}
      >
        {[
          ["SOLUÇÃO", isCandidate ? "SF 0.9%" : "D5W"],
          ["VOLUME", `${Math.round(remainingPct)} ml`],
          ["GOTAS/min", "20"],
          ["VIA", "EV PERIFÉRICA"],
          ["ACESSO", isCandidate ? "MSE — Jelco 20G" : "MSD — Jelco 18G"],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-2 items-center min-w-[180px]">
            <span className="opacity-60">{k}</span>
            <span className="border-b border-dashed flex-1 min-w-[24px]" style={{ borderColor: accentSoft }} />
            <span>{v}</span>
          </div>
        ))}
      </motion.div>

      {/* HUD lateral direito: paciente */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: setupVisible ? 1 : 0, x: setupVisible ? 0 : 20 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-1 text-right font-mono text-[10px]"
        style={{ color: accent }}
      >
        <div className="opacity-60">PACIENTE</div>
        <div className="text-base font-semibold tracking-wide" style={{ textShadow: `0 0 12px ${accentGlow}` }}>
          {displayName}
        </div>
        <div className="opacity-60 mt-2">PAPEL</div>
        <div className="inline-flex items-center gap-1.5 justify-end">
          <RoleIcon className="h-3 w-3" />
          <span>{isCandidate ? "Candidato" : "Ator / Banca"}</span>
        </div>
        {specialty && (
          <>
            <div className="opacity-60 mt-2">ESPECIALIDADE</div>
            <div>{specialty}</div>
          </>
        )}
      </motion.div>

      {/* === SISTEMA DE SORO (centro) === */}
      <div className="absolute inset-0 flex items-start justify-center pt-12">
        <div className="relative" style={{ width: 200, height: "min(640px, 82vh)" }}>
          {/* gancho do suporte */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: setupVisible ? 1 : 0, y: setupVisible ? 0 : -20 }}
            transition={{ duration: 0.5 }}
            className="absolute left-1/2 -translate-x-1/2 top-0"
          >
            <svg width="60" height="40" viewBox="0 0 60 40" fill="none">
              <path d="M30 0 L30 18 C30 28 22 32 16 32 C10 32 10 24 16 24"
                stroke="#9aa3ad" strokeWidth="2" fill="none" strokeLinecap="round" />
              <circle cx="30" cy="2" r="2" fill="#9aa3ad" />
            </svg>
          </motion.div>

          {/* === BOLSA DE SORO === */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: setupVisible ? 1 : 0, y: setupVisible ? 0 : -10, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: 36, width: 140, height: 200 }}
          >
            <svg viewBox="0 0 140 200" className="absolute inset-0 w-full h-full">
              <defs>
                <clipPath id="bagShape">
                  <path d="M30 14 Q24 14 24 22 L18 180 Q18 192 30 192 L110 192 Q122 192 122 180 L116 22 Q116 14 110 14 Z" />
                </clipPath>
                <linearGradient id="bagLiquid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={liquid} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={liquid} stopOpacity="1" />
                </linearGradient>
                <linearGradient id="bagShine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="white" stopOpacity="0" />
                  <stop offset="50%" stopColor="white" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* corpo translúcido da bolsa */}
              <path
                d="M30 14 Q24 14 24 22 L18 180 Q18 192 30 192 L110 192 Q122 192 122 180 L116 22 Q116 14 110 14 Z"
                fill="rgba(255,255,255,0.04)"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1.2"
              />

              {/* líquido que diminui — o topo desce com bagDrainPct */}
              <g clipPath="url(#bagShape)">
                <motion.rect
                  x="0"
                  width="140"
                  fill="url(#bagLiquid)"
                  initial={{ y: 28, height: 168 }}
                  animate={{
                    y: 28 + bagDrainPct * 110,
                    height: 168 - bagDrainPct * 110,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
                {/* "ondinha" no topo do líquido */}
                <motion.path
                  d="M0 0 Q35 -4 70 0 T140 0 L140 6 L0 6 Z"
                  fill={accent}
                  opacity="0.6"
                  animate={{ y: 28 + bagDrainPct * 110 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
                {/* reflexo */}
                <rect x="0" y="0" width="140" height="200" fill="url(#bagShine)" />
              </g>

              {/* etiqueta */}
              <g transform="translate(36 60)">
                <rect width="68" height="44" rx="3" fill="rgba(255,255,255,0.92)" />
                <text x="34" y="14" textAnchor="middle" fontFamily="monospace" fontSize="6" fill="#0f172a" letterSpacing="1.5">
                  REVALIDA · IV
                </text>
                <text x="34" y="26" textAnchor="middle" fontFamily="monospace" fontSize="9" fontWeight="bold" fill="#0f172a">
                  {isCandidate ? "SF 0,9%" : "D5W 5%"}
                </text>
                <text x="34" y="37" textAnchor="middle" fontFamily="monospace" fontSize="5" fill="#475569" letterSpacing="1">
                  500 ml · Lote {Math.abs(stationTitle.length * 37).toString().slice(0, 5)}
                </text>
              </g>

              {/* graduação lateral */}
              {[0.2, 0.4, 0.6, 0.8].map((p, i) => (
                <g key={i} opacity="0.5">
                  <line
                    x1="22" y1={28 + p * 160}
                    x2="30" y2={28 + p * 160}
                    stroke="rgba(255,255,255,0.4)" strokeWidth="0.8"
                  />
                  <text x="6" y={31 + p * 160} fill="rgba(255,255,255,0.5)" fontFamily="monospace" fontSize="6">
                    {500 - Math.round(p * 400)}
                  </text>
                </g>
              ))}
            </svg>
          </motion.div>

          {/* === EQUIPO + GOTEJADOR === */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: setupVisible ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: 232, width: 60, height: 110 }}
          >
            {/* "haste" curta entre bolsa e câmara */}
            <div
              className="absolute left-1/2 -translate-x-1/2 top-0 w-[3px]"
              style={{ height: 14, background: "rgba(255,255,255,0.18)" }}
            />
            {/* câmara do gotejador (transparente) */}
            <div
              className="absolute left-1/2 -translate-x-1/2 rounded-md overflow-hidden"
              style={{
                top: 12,
                width: 36, height: 70,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: "inset 0 0 12px rgba(0,0,0,0.4)",
              }}
            >
              {/* nível interno parcial */}
              <div
                className="absolute left-0 right-0 bottom-0"
                style={{ height: 18, background: liquid, opacity: 0.5 }}
              />
              {/* "spike" no topo (de onde a gota se forma) */}
              <div
                className="absolute left-1/2 -translate-x-1/2 top-1 w-[2px] h-3"
                style={{ background: "rgba(255,255,255,0.5)" }}
              />
              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  top: 14,
                  width: 6, height: 6, borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
                  background: accent,
                  boxShadow: `0 0 6px ${accentGlow}`,
                }}
              />
            </div>
          </motion.div>

          {/* tubinho até a "zona de impacto" do número */}
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: setupVisible ? 1 : 0, scaleY: setupVisible ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              top: 342,
              originY: 0,
              left: "50%",
              transform: "translateX(-50%)",
            }}
            className="absolute w-[3px] bg-white/15"
          />
        </div>
      </div>

      {/* ====== ZONA DAS GOTAS (centro vertical) ====== */}
      {/* a gota nasce no gotejador (top ~342) e cai até o "alvo" (centro da tela) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* GOTAS AMBIENTAIS (não numeradas) — caem em loop discreto */}
        {(phase === "warm" || phase === "setup") && ambientDrops.map((i) => (
          <motion.div
            key={`amb-${i}`}
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: 342,
              width: 10, height: 14,
              borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
              background: liquid,
              boxShadow: `0 0 10px ${accentGlow}`,
            }}
            initial={{ y: 0, opacity: 0, scale: 0.6 }}
            animate={{ y: 200, opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 1.4] }}
            transition={{
              duration: DROP_FALL_MS / 1000,
              delay: i * 0.35,
              ease: "easeIn",
              times: [0, 0.1, 0.85, 1],
              repeat: phase === "warm" ? Infinity : 0,
              repeatDelay: 1.2,
            }}
          />
        ))}

        {/* GOTA NUMERADA atual */}
        <AnimatePresence mode="popLayout">
          {currentNumber !== null && (
            <NumberedDrop
              key={String(currentNumber)}
              value={currentNumber}
              liquid={liquid}
              accent={accent}
              accentGlow={accentGlow}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ALVO/POÇA no centro — onde a gota se transforma no número */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* "poça" formada */}
        <AnimatePresence>
          {currentNumber !== null && (
            <motion.div
              key={`pool-${String(currentNumber)}`}
              className="absolute rounded-full"
              style={{
                width: 360, height: 28,
                background: `radial-gradient(ellipse, ${accentSoft}, transparent 70%)`,
                top: "calc(50% + 90px)",
                filter: "blur(8px)",
              }}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.85 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* TÍTULO/REVELAÇÃO no GO */}
      <AnimatePresence>
        {phase === "go" || phase === "end" || phase === "done" ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="absolute left-1/2 bottom-20 -translate-x-1/2 z-20 text-center px-6"
            style={{ color: accent }}
          >
            <div className="font-mono text-[10px] tracking-[0.35em] uppercase opacity-70">
              {isCandidate ? "Acesso liberado" : "Banca pronta · receber candidato"}
            </div>
            <div
              className="mt-2 font-display text-2xl md:text-3xl font-bold tracking-tight"
              style={{ color: "white", textShadow: `0 0 24px ${accentGlow}` }}
            >
              {isCandidate ? (specialty || "Sigiloso até a abertura") : stationTitle}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* scanlines bem sutis */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 3px)",
        }}
      />
    </motion.div>
  );
}

/**
 * Gota numerada: cai do gotejador, no impacto se "espalha" virando o número
 * (3, 2, 1, GO) no centro da tela.
 */
function NumberedDrop({
  value, liquid, accent, accentGlow,
}: {
  value: 3 | 2 | 1 | "GO";
  liquid: string;
  accent: string;
  accentGlow: string;
}) {
  const isGo = value === "GO";
  return (
    <>
      {/* trajeto: 0 → ~"alvo" */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: 342,
          width: 14, height: 20,
          borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
          background: liquid,
          boxShadow: `0 0 18px ${accentGlow}`,
        }}
        initial={{ y: 0, opacity: 0, scale: 0.7 }}
        animate={{ y: 130, opacity: [0, 1, 1, 0], scale: [0.7, 1, 1.1, isGo ? 4 : 2.6] }}
        exit={{ opacity: 0 }}
        transition={{
          duration: DROP_FALL_MS / 1000,
          ease: "easeIn",
          times: [0, 0.12, 0.78, 1],
        }}
      />
      {/* o NÚMERO aparece no alvo, sincronizado com o "splash" */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
        initial={{ opacity: 0, scale: 0.3, filter: "blur(8px)" }}
        animate={{
          opacity: [0, 0, 1, 1, 0],
          scale: [0.3, 0.5, 1, 1.05, 1.4],
          filter: ["blur(8px)", "blur(4px)", "blur(0px)", "blur(0px)", "blur(6px)"],
        }}
        transition={{
          duration: (DROP_FALL_MS + NUMBER_HOLD_MS) / 1000,
          times: [0, 0.45, 0.55, 0.85, 1],
          ease: "easeOut",
        }}
      >
        <div
          className="font-display font-black leading-none text-center"
          style={{
            fontSize: isGo ? "clamp(5rem, 18vw, 14rem)" : "clamp(7rem, 22vw, 17rem)",
            color: "#fff",
            textShadow: `0 0 60px ${accentGlow}, 0 0 14px ${accent}`,
            WebkitTextStroke: `1px ${accent}`,
          }}
        >
          {value}
        </div>
        {isGo && (
          <div
            className="mt-2 font-mono text-xs tracking-[0.4em] uppercase opacity-80 text-center"
            style={{ color: accent }}
          >
            Iniciar estação
          </div>
        )}
      </motion.div>
      {/* respingo no impacto */}
      <Splash accent={accent} accentGlow={accentGlow} delayMs={DROP_FALL_MS * 0.78} />
    </>
  );
}

function Splash({ accent, accentGlow, delayMs }: { accent: string; accentGlow: string; delayMs: number }) {
  const dots = useMemo(() => Array.from({ length: 10 }).map((_, i) => {
    const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
    const dist = 60 + Math.random() * 80;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist * 0.4 - 10,
      size: 4 + Math.random() * 6,
    };
  }), []);

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
      {dots.map((d, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: 0, top: 0,
            width: d.size, height: d.size,
            background: accent,
            boxShadow: `0 0 8px ${accentGlow}`,
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{ x: d.x, y: d.y, opacity: [0, 0.9, 0], scale: [0, 1, 0.6] }}
          transition={{
            duration: 0.55,
            delay: delayMs / 1000,
            ease: "easeOut",
            times: [0, 0.4, 1],
          }}
        />
      ))}
    </div>
  );
}
