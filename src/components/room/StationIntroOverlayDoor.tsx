import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { DoorOpen, ShieldCheck, Stethoscope, UserRound } from "lucide-react";

export type IntroRole = "candidato" | "paciente";

/** Mesma duração do clássico para manter a sincronização ator/candidato. */
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

// Marcos (ms a partir de startAt)
const PHASE_AT = {
  intro: 0,
  approach: 900,    // luz acende, partículas, título sobe
  unlock: 2600,     // selo "AUTORIZADO"
  opening: 3600,    // porta começa a abrir
  open: 5600,       // porta totalmente aberta + bloom
  countdown: 6300,
} as const;
const COUNT_STEP_MS = 700;
const COUNT_END_MS = 600;

type Phase = "intro" | "approach" | "unlock" | "opening" | "open" | "countdown" | "done";

/**
 * Animação cinematográfica "Entrada na Estação".
 * Estética: institucional, escura, com luz volumétrica vazando pela porta.
 * Sincronizada por startAtMs entre candidato e ator.
 */
export function StationIntroOverlayDoor({
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
    : initialElapsed >= PHASE_AT.unlock ? "unlock"
    : initialElapsed >= PHASE_AT.approach ? "approach"
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
      schedule(PHASE_AT.approach, "approach"),
      schedule(PHASE_AT.unlock, "unlock"),
      schedule(PHASE_AT.opening, "opening"),
      schedule(PHASE_AT.open, "open"),
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

  const doorOpening = phase === "opening" || phase === "open" || phase === "countdown" || phase === "done";
  const doorOpen = phase === "open" || phase === "countdown" || phase === "done";

  // ângulo de abertura (perspectiva)
  const leftAngle = doorOpen ? -88 : doorOpening ? -55 : 0;
  const rightAngle = doorOpen ? 88 : doorOpening ? 55 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[100] overflow-hidden bg-[#05070d]"
      aria-live="polite"
    >
      {/* === BG: gradiente profundo + vinheta + grão === */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(20,30,50,0.9) 0%, rgba(6,8,14,1) 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.85)_100%)]" />

      {/* === Header topo: marca === */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="absolute left-1/2 top-8 -translate-x-1/2 text-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-white/[0.03] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-mint/90 backdrop-blur-sm">
          <ShieldCheck className="h-3 w-3" /> REVMED
        </div>
      </motion.div>

      {/* === Cena central: porta com perspectiva === */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{
            width: "min(62vw, 460px)",
            height: "min(78vh, 640px)",
            perspective: 1800,
            perspectiveOrigin: "50% 45%",
          }}
        >
          {/* Halo / luz ambiente atrás da porta */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: doorOpen ? 1 : doorOpening ? 0.7 : phase === "intro" ? 0 : 0.3,
              scale: doorOpen ? 1.4 : 1,
            }}
            transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute inset-0 -z-10"
            style={{
              background: isCandidate
                ? "radial-gradient(ellipse 60% 70% at 50% 50%, rgba(255,228,170,0.45), rgba(255,180,90,0.15) 40%, transparent 70%)"
                : "radial-gradient(ellipse 60% 70% at 50% 50%, rgba(160,210,255,0.4), rgba(80,140,220,0.15) 40%, transparent 70%)",
              filter: "blur(20px)",
            }}
          />

          {/* Moldura externa (batente) */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, hsl(220 18% 16%) 0%, hsl(220 22% 10%) 50%, hsl(220 25% 7%) 100%)",
              borderRadius: "10px 10px 2px 2px",
              boxShadow:
                "0 40px 80px -20px rgba(0,0,0,0.8), inset 0 0 0 1px hsl(220 30% 22%), inset 0 0 0 8px hsl(220 18% 16%), inset 0 0 0 9px hsl(160 60% 45% / 0.35)",
            }}
          />

          {/* Placa "SALA" */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: doorOpen ? 0.3 : 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="absolute left-1/2 top-6 -translate-x-1/2 rounded-md border border-mint/40 bg-night/90 px-4 py-1.5 text-center backdrop-blur-sm"
          >
            <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-mint">Sala</div>
            <div className="mt-0.5 font-display text-xs font-semibold text-white/90">
              {isCandidate ? "Estação Clínica" : "Sala da Banca"}
            </div>
          </motion.div>

          {/* Vão interno: o que aparece quando abre */}
          <div
            className="absolute overflow-hidden"
            style={{
              left: 12, right: 12, top: 64, bottom: 12,
              borderRadius: "4px 4px 2px 2px",
              background:
                "linear-gradient(180deg, #0a0e18 0%, #060810 100%)",
            }}
          >
            {/* Luz volumétrica vazando */}
            <AnimatePresence>
              {doorOpening && (
                <motion.div
                  key="volumetric"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: doorOpen ? 1 : 0.6 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2 }}
                  className="absolute inset-0"
                  style={{
                    background: isCandidate
                      ? "radial-gradient(ellipse 90% 100% at 50% 55%, rgba(255,235,180,0.85) 0%, rgba(255,190,110,0.4) 35%, rgba(0,0,0,0) 70%)"
                      : "radial-gradient(ellipse 90% 100% at 50% 55%, rgba(190,225,255,0.8) 0%, rgba(120,170,230,0.35) 35%, rgba(0,0,0,0) 70%)",
                  }}
                />
              )}
            </AnimatePresence>

            {/* Raios de luz (god rays) */}
            <AnimatePresence>
              {doorOpen && (
                <motion.div
                  key="rays"
                  initial={{ opacity: 0, scaleY: 0.4 }}
                  animate={{ opacity: 0.7, scaleY: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.4, ease: "easeOut" }}
                  className="absolute inset-x-0 top-0 bottom-0 mx-auto origin-top"
                  style={{
                    width: "120%",
                    left: "-10%",
                    background: isCandidate
                      ? "conic-gradient(from 180deg at 50% 0%, transparent 75deg, rgba(255,230,170,0.18) 85deg, rgba(255,230,170,0.32) 90deg, rgba(255,230,170,0.18) 95deg, transparent 105deg)"
                      : "conic-gradient(from 180deg at 50% 0%, transparent 75deg, rgba(180,220,255,0.18) 85deg, rgba(180,220,255,0.32) 90deg, rgba(180,220,255,0.18) 95deg, transparent 105deg)",
                    filter: "blur(2px)",
                  }}
                />
              )}
            </AnimatePresence>

            {/* Partículas de poeira na luz */}
            <AnimatePresence>
              {doorOpen && !reduce && (
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute h-[3px] w-[3px] rounded-full bg-white/60"
                      style={{
                        left: `${20 + Math.random() * 60}%`,
                        top: `${30 + Math.random() * 50}%`,
                        filter: "blur(0.5px)",
                      }}
                      initial={{ opacity: 0, y: 0 }}
                      animate={{ opacity: [0, 0.8, 0], y: -40 }}
                      transition={{
                        duration: 3 + Math.random() * 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                      }}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* === Folhas da porta === */}
          <div
            className="absolute"
            style={{
              left: 12, right: 12, top: 64, bottom: 12,
              transformStyle: "preserve-3d",
            }}
          >
            <DoorLeaf side="left" angle={leftAngle} opening={doorOpening} />
            <DoorLeaf side="right" angle={rightAngle} opening={doorOpening} />
          </div>

          {/* Selo "AUTORIZADO" — flash antes de abrir */}
          <AnimatePresence>
            {phase === "unlock" && (
              <motion.div
                key="auth"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.3 }}
                transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
              >
                <div className="rounded-full border-2 border-mint bg-night/85 px-6 py-3 backdrop-blur-md shadow-[0_0_40px_rgba(74,222,180,0.5)]">
                  <div className="flex items-center gap-2 text-mint">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="font-display text-sm font-bold uppercase tracking-[0.25em]">
                      Acesso autorizado
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* === Texto inferior: contexto da fase === */}
      <div className="absolute bottom-[10vh] left-1/2 -translate-x-1/2 w-full px-6 text-center">
        <AnimatePresence mode="wait">
          {phase === "intro" || phase === "approach" ? (
            <motion.div
              key="t-approach"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5 }}
            >
              <div className="font-display text-2xl text-white/95 md:text-3xl">
                {isCandidate ? "Você está prestes a entrar." : "O candidato está prestes a entrar."}
              </div>
              <div className="mt-2 text-sm text-white/55">
                {isCandidate
                  ? `Respire fundo, ${displayName.split(" ")[0]}. Foco total.`
                  : "Receba com calma e siga o roteiro do caso."}
              </div>
            </motion.div>
          ) : phase === "unlock" ? (
            <motion.div
              key="t-unlock"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4 }}
              className="font-display text-xl text-white/90"
            >
              Identificação confirmada
            </motion.div>
          ) : phase === "opening" || phase === "open" ? (
            <motion.div
              key="t-open"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 font-display text-xl text-white/90 md:text-2xl">
                <DoorOpen className="h-5 w-5 text-mint" />
                {isCandidate ? "Abrindo a sala…" : "A porta está se abrindo…"}
              </div>
              {!isCandidate && (
                <div className="mt-2 text-sm text-white/55">{stationTitle}</div>
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
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2px]"
          >
            {count > 0 ? (
              <div className="font-display font-bold leading-none text-mint drop-shadow-[0_0_40px_rgba(74,222,180,0.6)] text-[clamp(7rem,24vw,18rem)]">
                {count}
              </div>
            ) : (
              <div className="font-display font-bold text-white text-[clamp(2.2rem,5.5vw,4rem)]">
                Estação iniciada
              </div>
            )}
            <div className="mt-6 flex flex-col items-center gap-2 text-center text-white/65">
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
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] backdrop-blur-sm">
                <RoleIcon className="h-3 w-3 text-mint" />
                {isCandidate ? "Candidato / Médico" : "Ator / Paciente"}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------- Folha da porta refinada ---------- */

function DoorLeaf({ side, angle, opening }: { side: "left" | "right"; angle: number; opening: boolean }) {
  const isLeft = side === "left";
  return (
    <motion.div
      className="absolute top-0 bottom-0"
      style={{
        width: "50%",
        [isLeft ? "left" : "right"]: 0,
        transformOrigin: isLeft ? "left center" : "right center",
        transformStyle: "preserve-3d",
      }}
      animate={{ rotateY: angle }}
      transition={{ duration: opening ? 2.0 : 0, ease: [0.4, 0.0, 0.2, 1] }}
    >
      <div
        className="relative h-full w-full overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, hsl(220 20% 22%) 0%, hsl(220 25% 14%) 50%, hsl(220 30% 10%) 100%)",
          borderRadius: isLeft ? "4px 0 0 4px" : "0 4px 4px 0",
          boxShadow:
            "inset 0 0 0 1px hsl(220 30% 28%), inset 0 0 60px rgba(0,0,0,0.55)",
        }}
      >
        {/* Painéis decorativos (estilo porta moderna) */}
        <div
          className="absolute"
          style={{
            left: "14%", right: "14%", top: "8%", height: "38%",
            border: "1.5px solid hsl(220 25% 32% / 0.7)",
            borderRadius: 3,
            background: "linear-gradient(180deg, hsl(220 22% 18%), hsl(220 28% 12%))",
            boxShadow: "inset 0 1px 0 hsl(220 25% 30% / 0.6), inset 0 -1px 0 rgba(0,0,0,0.4)",
          }}
        />
        <div
          className="absolute"
          style={{
            left: "14%", right: "14%", top: "52%", bottom: "8%",
            border: "1.5px solid hsl(220 25% 32% / 0.7)",
            borderRadius: 3,
            background: "linear-gradient(180deg, hsl(220 22% 18%), hsl(220 28% 12%))",
            boxShadow: "inset 0 1px 0 hsl(220 25% 30% / 0.6), inset 0 -1px 0 rgba(0,0,0,0.4)",
          }}
        />
        {/* Linha vertical sutil de brilho (luz lateral) */}
        <div
          className="absolute top-0 bottom-0 w-px opacity-40"
          style={{
            [isLeft ? "right" : "left"]: 0,
            background: "linear-gradient(180deg, transparent, hsl(160 60% 60% / 0.6), transparent)",
          }}
        />
        {/* Maçaneta */}
        <div
          className="absolute"
          style={{
            [isLeft ? "right" : "left"]: 14,
            top: "49%",
            width: 22, height: 6, borderRadius: 3,
            background: "linear-gradient(180deg, #e8c87a, #8a5a1a)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        />
        <div
          className="absolute"
          style={{
            [isLeft ? "right" : "left"]: 8,
            top: "calc(49% - 2px)",
            width: 10, height: 10, borderRadius: 999,
            background: "radial-gradient(circle at 35% 30%, #fde6a0, #6b3d0a)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.6)",
          }}
        />
      </div>
    </motion.div>
  );
}
