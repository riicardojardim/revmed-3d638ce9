import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Stethoscope, UserRound } from "lucide-react";

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
  approach: 600,    // médico aparece e caminha até a porta
  knock: 2400,      // mão na maçaneta / batida
  opening: 3800,    // porta começa a abrir
  open: 5600,       // porta totalmente aberta + luz
  countdown: 6300,  // 3-2-1-0
} as const;
const COUNT_STEP_MS = 700;
const COUNT_END_MS = 600;

type Phase = "intro" | "approach" | "knock" | "opening" | "open" | "countdown" | "done";

/**
 * Animação "Médico abrindo a porta".
 * - Candidato: vê o próprio médico (1ª pessoa figurativa) caminhando até a porta e abrindo.
 * - Ator/Banca: vê a sala da banca com a porta se abrindo e o candidato entrando.
 */
export function StationIntroOverlayDoor({
  role, stationTitle, specialty, displayName, avatarUrl, onComplete, startAtMs, nowMs,
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
    : initialElapsed >= PHASE_AT.knock ? "knock"
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
      schedule(PHASE_AT.knock, "knock"),
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
  const Icon = isCandidate ? Stethoscope : UserRound;

  // Estado da porta
  const doorOpen = phase === "opening" || phase === "open" || phase === "countdown" || phase === "done";
  const doorFullyOpen = phase === "open" || phase === "countdown" || phase === "done";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{
        background: isCandidate
          ? "radial-gradient(ellipse at center, hsl(220 45% 12%) 0%, hsl(222 50% 6%) 70%, hsl(222 60% 3%) 100%)"
          : "radial-gradient(ellipse at center, hsl(210 35% 16%) 0%, hsl(215 40% 8%) 70%, hsl(220 50% 4%) 100%)",
      }}
      aria-live="polite"
    >
      {/* grid sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(160 60% 60%) 1px, transparent 1px), linear-gradient(90deg, hsl(160 60% 60%) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.65)_100%)]" />

      {/* Título */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: doorOpen ? 0.25 : 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="absolute left-1/2 top-[8%] -translate-x-1/2 text-center px-4"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-mint">
          <ShieldCheck className="h-3 w-3" /> Estação Revalida
        </div>
        <div className="mt-3 font-display text-xl text-white/85 md:text-2xl">
          {isCandidate ? "Você está entrando na sala." : "O candidato está chegando."}
        </div>
        <div className="mt-1 text-sm text-white/50">
          {isCandidate ? "Respire fundo, boa prova." : "Receba com calma e siga o roteiro."}
        </div>
      </motion.div>

      {/* Cena central */}
      <div className="absolute inset-0 flex items-end justify-center pb-[14vh]">
        <div className="relative" style={{ width: "min(78vw, 520px)", height: "min(74vh, 620px)" }}>
          {/* "Chão" / sombra de piso */}
          <div className="absolute bottom-0 left-0 right-0 h-[14%] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55),transparent_70%)]" />

          {/* Moldura da porta */}
          <DoorFrame />

          {/* Luz que vaza quando abre (atrás das folhas) */}
          <AnimatePresence>
            {doorOpen && (
              <motion.div
                key="light"
                initial={{ opacity: 0 }}
                animate={{ opacity: doorFullyOpen ? 1 : 0.7 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute"
                style={{
                  left: "12%", right: "12%", top: "8%", bottom: "10%",
                  background: isCandidate
                    ? "radial-gradient(ellipse at center, rgba(255,236,180,0.55) 0%, rgba(255,200,120,0.25) 40%, rgba(0,0,0,0) 75%)"
                    : "radial-gradient(ellipse at center, rgba(180,220,255,0.45) 0%, rgba(120,170,255,0.2) 40%, rgba(0,0,0,0) 75%)",
                  filter: "blur(2px)",
                }}
              />
            )}
          </AnimatePresence>

          {/* Para o ATOR: silhueta do candidato aparece atrás da porta quando abre */}
          {!isCandidate && (
            <AnimatePresence>
              {doorOpen && (
                <motion.div
                  key="incoming-doctor"
                  initial={{ opacity: 0, y: 30, scale: 0.85 }}
                  animate={{ opacity: doorFullyOpen ? 1 : 0.6, y: 0, scale: doorFullyOpen ? 1 : 0.92 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{ bottom: "10%", width: "44%" }}
                >
                  <DoctorFigure />
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Folhas da porta (duas, abrem para os lados) */}
          <DoorLeaves open={doorOpen} fullyOpen={doorFullyOpen} />

          {/* Para o CANDIDATO: silhueta do médico vista por trás, caminhando até a porta */}
          {isCandidate && (
            <AnimatePresence>
              {(phase === "approach" || phase === "knock" || phase === "opening") && (
                <motion.div
                  key="self-doctor"
                  initial={{ opacity: 0, y: 60, scale: 0.7 }}
                  animate={{
                    opacity: phase === "opening" ? 0 : 1,
                    y: phase === "approach" ? 20 : 0,
                    scale: phase === "approach" ? 0.78 : 0.92,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{ bottom: "6%", width: "46%" }}
                >
                  <DoctorFigureBack knocking={phase === "knock"} />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Countdown */}
      <AnimatePresence>
        {phase === "countdown" && (
          <motion.div
            key={`cd-${count}`}
            initial={{ opacity: 0, scale: 0.6, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.4, filter: "blur(6px)" }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            {count > 0 ? (
              <div className="font-display font-bold leading-none text-mint drop-shadow-[0_0_30px_rgba(74,222,180,0.5)] text-[clamp(6rem,22vw,16rem)]">
                {count}
              </div>
            ) : (
              <div className="font-display font-bold text-white text-[clamp(2rem,5vw,3.5rem)]">
                Estação iniciada
              </div>
            )}
            <div className="mt-6 flex flex-col items-center gap-1 text-center text-white/60">
              {isCandidate ? (
                <div className="text-sm font-medium text-white/85">Boa prova, {displayName.split(" ")[0]}.</div>
              ) : (
                <>
                  <div className="text-sm font-medium text-white/85">{stationTitle}</div>
                  {specialty && <div className="text-xs uppercase tracking-wider">{specialty}</div>}
                </>
              )}
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px]">
                <Icon className="h-3 w-3 text-mint" /> {isCandidate ? "Candidato / Médico" : "Ator / Paciente"}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------- Subcomponentes SVG ---------- */

function DoorFrame() {
  return (
    <div
      className="absolute"
      style={{
        left: "10%", right: "10%", top: "6%", bottom: "8%",
        background: "linear-gradient(180deg, hsl(220 25% 22%) 0%, hsl(220 30% 14%) 100%)",
        borderRadius: "14px 14px 4px 4px",
        boxShadow: "0 30px 60px -20px rgba(0,0,0,0.7), inset 0 0 0 6px hsl(220 35% 28%), inset 0 0 0 8px hsl(160 60% 45% / 0.25)",
      }}
    >
      {/* placa "ESTAÇÃO" acima */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -top-3 rounded-md border border-mint/40 bg-night/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-mint"
      >
        Sala da Estação
      </div>
    </div>
  );
}

function DoorLeaves({ open, fullyOpen }: { open: boolean; fullyOpen: boolean }) {
  // duas folhas que se abrem em perspective
  const angle = fullyOpen ? 75 : open ? 40 : 0;
  const common: React.CSSProperties = {
    position: "absolute", top: "8%", bottom: "10%", width: "39%",
    background: "linear-gradient(180deg, hsl(28 35% 28%) 0%, hsl(25 40% 18%) 100%)",
    boxShadow: "inset 0 0 0 3px hsl(28 30% 22%), inset 0 0 30px rgba(0,0,0,0.4)",
    transformStyle: "preserve-3d" as const,
  };
  return (
    <div className="absolute inset-0" style={{ perspective: 1400 }}>
      {/* folha esquerda */}
      <motion.div
        style={{ ...common, left: "12%", transformOrigin: "left center", borderRadius: "10px 2px 2px 10px" }}
        animate={{ rotateY: -angle }}
        transition={{ duration: open ? 1.6 : 0, ease: [0.4, 0.05, 0.2, 1] }}
      >
        <DoorPanelDeco side="left" />
      </motion.div>
      {/* folha direita */}
      <motion.div
        style={{ ...common, right: "12%", transformOrigin: "right center", borderRadius: "2px 10px 10px 2px" }}
        animate={{ rotateY: angle }}
        transition={{ duration: open ? 1.6 : 0, ease: [0.4, 0.05, 0.2, 1] }}
      >
        <DoorPanelDeco side="right" />
      </motion.div>
    </div>
  );
}

function DoorPanelDeco({ side }: { side: "left" | "right" }) {
  return (
    <>
      {/* painel interno */}
      <div
        className="absolute"
        style={{
          left: 10, right: 10, top: 16, bottom: 16,
          border: "2px solid hsl(28 30% 35% / 0.5)", borderRadius: 6,
        }}
      />
      {/* faixa de vidro fosco */}
      <div
        className="absolute"
        style={{
          left: 18, right: 18, top: 24, height: "32%",
          background: "linear-gradient(180deg, hsl(180 25% 65% / 0.18), hsl(180 25% 80% / 0.05))",
          border: "1px solid hsl(180 25% 70% / 0.25)", borderRadius: 4,
        }}
      />
      {/* maçaneta */}
      <div
        className="absolute"
        style={{
          [side === "left" ? "right" : "left"]: 10, top: "55%",
          width: 14, height: 14, borderRadius: 999,
          background: "radial-gradient(circle at 30% 30%, #fde68a, #b45309)",
          boxShadow: "0 0 6px rgba(0,0,0,0.5)",
        } as React.CSSProperties}
      />
    </>
  );
}

/** Médico visto de costas (perspectiva do candidato). */
function DoctorFigureBack({ knocking }: { knocking: boolean }) {
  return (
    <svg viewBox="0 0 200 280" className="h-auto w-full">
      {/* sombra no chão */}
      <ellipse cx="100" cy="272" rx="55" ry="6" fill="rgba(0,0,0,0.55)" />
      {/* jaleco (costas) */}
      <path d="M55 100 Q100 80 145 100 L155 260 L45 260 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
      {/* costura central */}
      <line x1="100" y1="100" x2="100" y2="258" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* calça */}
      <rect x="60" y="260" width="35" height="18" fill="#1e293b" />
      <rect x="105" y="260" width="35" height="18" fill="#1e293b" />
      {/* cabeça (nuca) */}
      <circle cx="100" cy="60" r="28" fill="#d4a373" />
      {/* cabelo */}
      <path d="M72 60 Q100 28 128 60 L128 50 Q100 22 72 50 Z" fill="#1f2937" />
      {/* orelhas */}
      <ellipse cx="72" cy="62" rx="4" ry="6" fill="#c08b5c" />
      <ellipse cx="128" cy="62" rx="4" ry="6" fill="#c08b5c" />
      {/* estetoscópio no pescoço (visto de trás: U) */}
      <path d="M78 95 Q100 130 122 95" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="78" cy="95" r="4" fill="#0f172a" />
      <circle cx="122" cy="95" r="4" fill="#0f172a" />
      {/* braço esquerdo */}
      <motion.g
        animate={knocking ? { rotate: [0, -18, 0, -18, 0] } : { rotate: 0 }}
        transition={{ duration: 1.2, repeat: knocking ? Infinity : 0 }}
        style={{ transformOrigin: "55px 115px" }}
      >
        <path d="M55 110 Q45 160 60 200" fill="none" stroke="#f8fafc" strokeWidth="14" strokeLinecap="round" />
        <circle cx="60" cy="200" r="8" fill="#d4a373" />
      </motion.g>
      {/* braço direito (levantado pra maçaneta) */}
      <motion.g
        animate={knocking ? { rotate: [0, 12, 6, 12, 6] } : { rotate: 0 }}
        transition={{ duration: 1.2, repeat: knocking ? Infinity : 0 }}
        style={{ transformOrigin: "145px 115px" }}
      >
        <path d="M145 110 Q160 150 150 175" fill="none" stroke="#f8fafc" strokeWidth="14" strokeLinecap="round" />
        <circle cx="150" cy="175" r="8" fill="#d4a373" />
      </motion.g>
    </svg>
  );
}

/** Médico visto de frente (perspectiva do ator/banca: o candidato entrando). */
function DoctorFigure() {
  return (
    <svg viewBox="0 0 200 280" className="h-auto w-full drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]">
      <ellipse cx="100" cy="272" rx="55" ry="6" fill="rgba(0,0,0,0.6)" />
      {/* jaleco */}
      <path d="M55 100 Q100 80 145 100 L155 260 L45 260 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
      {/* abertura V */}
      <path d="M100 100 L88 140 L100 165 L112 140 Z" fill="#0ea5a4" opacity="0.85" />
      <line x1="100" y1="165" x2="100" y2="258" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* bolso */}
      <rect x="115" y="170" width="22" height="22" fill="none" stroke="#cbd5e1" strokeWidth="1.5" rx="2" />
      {/* calça */}
      <rect x="60" y="260" width="35" height="18" fill="#1e293b" />
      <rect x="105" y="260" width="35" height="18" fill="#1e293b" />
      {/* cabeça */}
      <circle cx="100" cy="60" r="28" fill="#e9c89c" />
      {/* cabelo */}
      <path d="M74 55 Q100 25 126 55 L126 48 Q100 22 74 48 Z" fill="#1f2937" />
      {/* olhos */}
      <circle cx="90" cy="62" r="2.5" fill="#0f172a" />
      <circle cx="110" cy="62" r="2.5" fill="#0f172a" />
      {/* sorriso */}
      <path d="M90 74 Q100 80 110 74" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
      {/* estetoscópio no pescoço */}
      <path d="M78 95 Q100 130 122 95" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
      <path d="M100 128 L100 165" stroke="#0f172a" strokeWidth="3" />
      <circle cx="100" cy="172" r="7" fill="#94a3b8" stroke="#0f172a" strokeWidth="2" />
      {/* braços */}
      <path d="M55 110 Q40 160 55 205" fill="none" stroke="#f8fafc" strokeWidth="14" strokeLinecap="round" />
      <path d="M145 110 Q160 160 145 205" fill="none" stroke="#f8fafc" strokeWidth="14" strokeLinecap="round" />
      <circle cx="55" cy="205" r="8" fill="#e9c89c" />
      <circle cx="145" cy="205" r="8" fill="#e9c89c" />
    </svg>
  );
}
