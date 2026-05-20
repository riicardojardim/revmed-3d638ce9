import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Stethoscope, UserRound } from "lucide-react";

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
  walking: 400,
  arrived: 4400,   // câmera para na porta
  opening: 5300,   // porta abre
  countdown: 6300,
} as const;
const COUNT_STEP_MS = 700;
const COUNT_END_MS = 600;

type Phase = "intro" | "walking" | "arrived" | "opening" | "countdown" | "done";

/**
 * Corredor de hospital em primeira pessoa.
 * Câmera caminha pelo corredor, luzes do teto passando, chega na porta da estação.
 */
export function StationIntroOverlayCorridor({
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
    : initialElapsed >= PHASE_AT.opening ? "opening"
    : initialElapsed >= PHASE_AT.arrived ? "arrived"
    : initialElapsed >= PHASE_AT.walking ? "walking"
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
      schedule(PHASE_AT.walking, "walking"),
      schedule(PHASE_AT.arrived, "arrived"),
      schedule(PHASE_AT.opening, "opening"),
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

  // tonalidade da iluminação
  const tintWarm = isCandidate; // candidato = corredor mais "humano" quente; ator = mais clínico azulado
  const lightColor = tintWarm ? "rgba(255, 230, 180, " : "rgba(190, 220, 255, ";
  const wallTint = tintWarm ? "hsl(35 18% 90%)" : "hsl(210 18% 92%)";
  const wallShadow = tintWarm ? "hsl(30 15% 55%)" : "hsl(215 18% 60%)";

  const walking = phase === "walking" || phase === "arrived" || phase === "opening" || phase === "countdown" || phase === "done";
  const arrived = phase === "arrived" || phase === "opening" || phase === "countdown" || phase === "done";
  const opening = phase === "opening" || phase === "countdown" || phase === "done";
  const open = phase === "countdown" || phase === "done";

  // velocidade do scroll do corredor (textura repetindo)
  // distância percorrida em 4s caminhando, depois desacelera
  const walkDuration = (PHASE_AT.arrived - PHASE_AT.walking) / 1000;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] overflow-hidden bg-black"
      aria-live="polite"
    >
      {/* === CENA: corredor em perspectiva === */}
      <div className="absolute inset-0" style={{ perspective: 900, perspectiveOrigin: "50% 52%" }}>
        {/* Ponto de fuga: o "fim" do corredor (porta) */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "100vw",
            height: "100vh",
            transformStyle: "preserve-3d",
          }}
        >
          {/* CHÃO — plano inclinado pra trás */}
          <div
            className="absolute left-1/2 bottom-0 -translate-x-1/2"
            style={{
              width: "180vw",
              height: "60vh",
              transformOrigin: "50% 100%",
              transform: "rotateX(78deg)",
              background:
                `linear-gradient(180deg, hsl(220 15% 8%) 0%, hsl(220 15% 14%) 60%, hsl(220 12% 22%) 100%)`,
            }}
          >
            {/* listras do piso (faz sensação de movimento) */}
            <motion.div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, hsl(220 12% 26% / 0.6) 0px, hsl(220 12% 26% / 0.6) 2px, transparent 2px, transparent 80px)",
              }}
              initial={{ backgroundPositionY: 0 }}
              animate={walking ? { backgroundPositionY: arrived ? 1600 : 1400 } : {}}
              transition={{ duration: arrived ? 0.6 : walkDuration, ease: arrived ? [0.2, 0.8, 0.2, 1] : "linear" }}
            />
            {/* linha central amarela do corredor */}
            <div
              className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2"
              style={{
                width: 8,
                background: "repeating-linear-gradient(0deg, hsl(45 90% 55%) 0px, hsl(45 90% 55%) 40px, transparent 40px, transparent 80px)",
                opacity: 0.55,
              }}
            />
          </div>

          {/* TETO */}
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2"
            style={{
              width: "180vw",
              height: "60vh",
              transformOrigin: "50% 0%",
              transform: "rotateX(-78deg)",
              background: `linear-gradient(0deg, hsl(220 18% 10%) 0%, hsl(220 16% 16%) 70%, hsl(220 14% 22%) 100%)`,
            }}
          >
            {/* placas do forro */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, hsl(220 10% 30%) 0px, hsl(220 10% 30%) 1px, transparent 1px, transparent 120px), repeating-linear-gradient(90deg, hsl(220 10% 30%) 0px, hsl(220 10% 30%) 1px, transparent 1px, transparent 200px)",
              }}
            />
          </div>

          {/* PAREDE ESQUERDA */}
          <Wall side="left" walking={walking} arrived={arrived} wallTint={wallTint} wallShadow={wallShadow} walkDuration={walkDuration} />
          {/* PAREDE DIREITA */}
          <Wall side="right" walking={walking} arrived={arrived} wallTint={wallTint} wallShadow={wallShadow} walkDuration={walkDuration} />

          {/* LUZES DO TETO passando — barras horizontais brilhantes que vêm do ponto de fuga */}
          <CeilingLights walking={walking} arrived={arrived} lightColor={lightColor} walkDuration={walkDuration} />

          {/* PORTA NO FUNDO DO CORREDOR */}
          <Door
            arrived={arrived}
            opening={opening}
            open={open}
            isCandidate={isCandidate}
          />
        </div>
      </div>

      {/* Vinheta */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)]" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="absolute left-1/2 top-8 -translate-x-1/2"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-black/40 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-mint/90 backdrop-blur-sm">
          <ShieldCheck className="h-3 w-3" /> Estação Revalida
        </div>
      </motion.div>

      {/* Texto inferior por fase */}
      <div className="absolute bottom-[10vh] left-1/2 -translate-x-1/2 w-full px-6 text-center">
        <AnimatePresence mode="wait">
          {phase === "intro" || phase === "walking" ? (
            <motion.div
              key="t-walk"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5 }}
            >
              <div className="font-display text-2xl text-white/95 md:text-3xl drop-shadow-lg">
                {isCandidate ? "Indo para a sala da estação…" : "O candidato está a caminho…"}
              </div>
              <div className="mt-2 text-sm text-white/60 drop-shadow">
                {isCandidate
                  ? `Respire fundo, ${displayName.split(" ")[0]}.`
                  : "Prepare-se para receber o candidato."}
              </div>
            </motion.div>
          ) : phase === "arrived" ? (
            <motion.div
              key="t-arrived"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4 }}
              className="font-display text-xl text-white/90 drop-shadow-lg"
            >
              Você chegou.
            </motion.div>
          ) : phase === "opening" ? (
            <motion.div
              key="t-open"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4 }}
              className="font-display text-xl text-white/90 drop-shadow-lg"
            >
              Abrindo…
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Countdown */}
      <AnimatePresence>
        {phase === "countdown" && (
          <motion.div
            key={`cd-${count}`}
            initial={{ opacity: 0, scale: 0.55, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.45, filter: "blur(8px)" }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[3px]"
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
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[11px] backdrop-blur-sm">
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

/* ---------- Parede lateral ---------- */
function Wall({
  side, walking, arrived, wallTint, wallShadow, walkDuration,
}: {
  side: "left" | "right"; walking: boolean; arrived: boolean;
  wallTint: string; wallShadow: string; walkDuration: number;
}) {
  const isLeft = side === "left";
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2"
      style={{
        [isLeft ? "left" : "right"]: 0,
        width: "60vh",
        height: "100vh",
        transformOrigin: isLeft ? "left center" : "right center",
        transform: `rotateY(${isLeft ? 78 : -78}deg)`,
        background: `linear-gradient(${isLeft ? "90deg" : "270deg"}, ${wallShadow} 0%, ${wallTint} 50%, ${wallShadow} 100%)`,
        overflow: "hidden",
      }}
    >
      {/* Rodapé escuro */}
      <div className="absolute bottom-0 left-0 right-0 h-[6%] bg-[hsl(220_15%_18%)]" />
      {/* Faixa de cor superior (corredor hospital) */}
      <div className="absolute top-[15%] left-0 right-0 h-[6%] bg-[hsl(180_40%_42%)] opacity-60" />

      {/* Portas/quadros se movendo */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0px, transparent 280px, hsl(220 18% 25%) 280px, hsl(220 18% 25%) 286px, transparent 286px, transparent 380px, hsl(220 25% 18%) 380px, hsl(220 25% 18%) 460px, transparent 460px, transparent 540px)",
        }}
        initial={{ backgroundPositionX: 0 }}
        animate={walking ? { backgroundPositionX: arrived ? -2400 : -2100 } : {}}
        transition={{ duration: arrived ? 0.6 : walkDuration, ease: arrived ? [0.2, 0.8, 0.2, 1] : "linear" }}
      />

      {/* Sinalização circular de "salas" passando */}
      <motion.div
        className="absolute top-[28%] left-0 right-0 h-12"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0px, transparent 360px, hsl(160 60% 45% / 0.4) 360px, hsl(160 60% 45% / 0.4) 410px, transparent 410px, transparent 540px)",
        }}
        initial={{ backgroundPositionX: 0 }}
        animate={walking ? { backgroundPositionX: arrived ? -2400 : -2100 } : {}}
        transition={{ duration: arrived ? 0.6 : walkDuration, ease: arrived ? [0.2, 0.8, 0.2, 1] : "linear" }}
      />
    </div>
  );
}

/* ---------- Luzes do teto ---------- */
function CeilingLights({
  walking, arrived, lightColor, walkDuration,
}: {
  walking: boolean; arrived: boolean; lightColor: string; walkDuration: number;
}) {
  return (
    <div
      className="absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none"
      style={{
        width: "180vw",
        height: "60vh",
        transformOrigin: "50% 0%",
        transform: "rotateX(-78deg) translateZ(0.5px)",
      }}
    >
      {/* faixas luminosas que correm em direção ao observador */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage:
            `repeating-linear-gradient(0deg, transparent 0px, transparent 180px, ${lightColor}0.9) 180px, ${lightColor}0.9) 196px, transparent 196px, transparent 220px)`,
          filter: "blur(1.5px)",
        }}
        initial={{ backgroundPositionY: 0 }}
        animate={walking ? { backgroundPositionY: arrived ? 1600 : 1400 } : {}}
        transition={{ duration: arrived ? 0.6 : walkDuration, ease: arrived ? [0.2, 0.8, 0.2, 1] : "linear" }}
      />
      {/* halo ao redor das luzes */}
      <motion.div
        className="absolute inset-0 mix-blend-screen"
        style={{
          backgroundImage:
            `repeating-linear-gradient(0deg, transparent 0px, transparent 160px, ${lightColor}0.25) 160px, ${lightColor}0.25) 220px, transparent 220px, transparent 240px)`,
          filter: "blur(8px)",
          opacity: 0.85,
        }}
        initial={{ backgroundPositionY: 0 }}
        animate={walking ? { backgroundPositionY: arrived ? 1600 : 1400 } : {}}
        transition={{ duration: arrived ? 0.6 : walkDuration, ease: arrived ? [0.2, 0.8, 0.2, 1] : "linear" }}
      />
    </div>
  );
}

/* ---------- Porta no fim do corredor ---------- */
function Door({
  arrived, opening, open, isCandidate,
}: {
  arrived: boolean; opening: boolean; open: boolean; isCandidate: boolean;
}) {
  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      initial={{ x: "-50%", y: "-50%", scale: 0.18, opacity: 0 }}
      animate={{
        x: "-50%",
        y: "-50%",
        scale: arrived ? 1 : 0.35,
        opacity: arrived ? 1 : 0.7,
      }}
      transition={{ duration: arrived ? 0.7 : 4, ease: arrived ? [0.2, 0.8, 0.2, 1] : "easeIn" }}
      style={{ width: "min(38vw, 280px)", height: "min(70vh, 480px)" }}
    >
      {/* Moldura */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, hsl(220 22% 18%) 0%, hsl(220 28% 10%) 100%)",
          borderRadius: "8px 8px 2px 2px",
          boxShadow:
            "0 30px 70px -10px rgba(0,0,0,0.9), inset 0 0 0 1px hsl(220 30% 24%), inset 0 0 0 6px hsl(220 22% 16%), inset 0 0 0 7px hsl(160 60% 45% / 0.3)",
        }}
      />
      {/* Placa "ESTAÇÃO" */}
      <div className="absolute left-1/2 -translate-x-1/2 top-3 rounded-md border border-mint/40 bg-night/90 px-3 py-1 backdrop-blur-sm">
        <div className="text-[8px] font-bold uppercase tracking-[0.3em] text-mint">Estação</div>
      </div>
      {/* Vão interno + folhas */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: 10, right: 10, top: 36, bottom: 10,
          borderRadius: 2,
          background: "linear-gradient(180deg, #060810, #02030a)",
          perspective: 800,
          transformStyle: "preserve-3d",
        }}
      >
        {/* luz vazando */}
        <AnimatePresence>
          {opening && (
            <motion.div
              key="light"
              initial={{ opacity: 0 }}
              animate={{ opacity: open ? 1 : 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0"
              style={{
                background: isCandidate
                  ? "radial-gradient(ellipse at center, rgba(255,230,170,0.85), rgba(255,190,110,0.3) 50%, transparent 80%)"
                  : "radial-gradient(ellipse at center, rgba(190,225,255,0.8), rgba(120,170,230,0.3) 50%, transparent 80%)",
              }}
            />
          )}
        </AnimatePresence>
        {/* folha esquerda */}
        <motion.div
          className="absolute top-0 bottom-0 left-0"
          style={{
            width: "50%",
            background: "linear-gradient(135deg, hsl(220 20% 22%), hsl(220 28% 12%))",
            transformOrigin: "left center",
            boxShadow: "inset 0 0 0 1px hsl(220 30% 30%), inset -8px 0 16px rgba(0,0,0,0.5)",
          }}
          animate={{ rotateY: opening ? -85 : 0 }}
          transition={{ duration: opening ? 1.4 : 0, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="absolute right-2 top-1/2 -translate-y-1/2 h-2 w-4 rounded-sm bg-gradient-to-b from-[#e8c87a] to-[#8a5a1a]" />
        </motion.div>
        {/* folha direita */}
        <motion.div
          className="absolute top-0 bottom-0 right-0"
          style={{
            width: "50%",
            background: "linear-gradient(225deg, hsl(220 20% 22%), hsl(220 28% 12%))",
            transformOrigin: "right center",
            boxShadow: "inset 0 0 0 1px hsl(220 30% 30%), inset 8px 0 16px rgba(0,0,0,0.5)",
          }}
          animate={{ rotateY: opening ? 85 : 0 }}
          transition={{ duration: opening ? 1.4 : 0, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-4 rounded-sm bg-gradient-to-b from-[#e8c87a] to-[#8a5a1a]" />
        </motion.div>
      </div>
    </motion.div>
  );
}
