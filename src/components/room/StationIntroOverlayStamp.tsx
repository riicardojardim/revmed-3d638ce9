import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Stethoscope, UserRound, ShieldCheck } from "lucide-react";

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
  paper: 400,      // papel/prontuário aparece
  hover: 1600,     // carimbo entra do alto, "pairando"
  impact: 2600,    // carimbo desce com impacto
  splatter: 2900,  // tinta espirra, partículas
  reveal: 3600,    // selo + dados
  countdown: 6300,
} as const;
const COUNT_STEP_MS = 700;
const COUNT_END_MS = 600;

type Phase =
  | "intro"
  | "paper"
  | "hover"
  | "impact"
  | "splatter"
  | "reveal"
  | "countdown"
  | "done";

/**
 * Carimbo "AUTORIZADO" — fundo de prontuário (papel pautado + cabeçalho),
 * carimbo desce do topo com impacto, tinta espirra e revela os dados da estação.
 *
 * Variações de papel:
 *  - candidato: verde clínico, carimbo "AUTORIZADO"
 *  - ator/banca: âmbar/sépia, carimbo "BANCA AVALIADORA"
 */
export function StationIntroOverlayStamp({
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
    : initialElapsed >= PHASE_AT.reveal ? "reveal"
    : initialElapsed >= PHASE_AT.splatter ? "splatter"
    : initialElapsed >= PHASE_AT.impact ? "impact"
    : initialElapsed >= PHASE_AT.hover ? "hover"
    : initialElapsed >= PHASE_AT.paper ? "paper"
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
      schedule(PHASE_AT.paper, "paper"),
      schedule(PHASE_AT.hover, "hover"),
      schedule(PHASE_AT.impact, "impact"),
      schedule(PHASE_AT.splatter, "splatter"),
      schedule(PHASE_AT.reveal, "reveal"),
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

  // paletas distintas
  // candidato: tinta verde clínica sobre papel creme/verde clarinho
  // ator/banca: tinta vinho/âmbar sobre papel sépia
  const ink = isCandidate ? "#1a6b3f" : "#8a1e2a";
  const inkSoft = isCandidate ? "rgba(26,107,63,0.18)" : "rgba(138,30,42,0.18)";
  const paperBg = isCandidate
    ? "linear-gradient(180deg,#f8f5ec 0%, #f1ecdc 100%)"
    : "linear-gradient(180deg,#f5eedb 0%, #e8dcc0 100%)";
  const ruleColor = isCandidate ? "rgba(26,107,63,0.10)" : "rgba(138,30,42,0.10)";
  const headerAccent = isCandidate ? "rgba(26,107,63,0.55)" : "rgba(138,30,42,0.55)";

  const paperVisible = phase !== "intro";
  const stampHovering = phase === "hover";
  const stampDown = phase === "impact" || phase === "splatter" || phase === "reveal" || phase === "countdown" || phase === "done";
  const splattering = phase === "splatter" || phase === "reveal" || phase === "countdown" || phase === "done";
  const revealed = phase === "reveal" || phase === "countdown" || phase === "done";
  const counting = phase === "countdown" || phase === "done";

  const stampLabel = isCandidate ? "AUTORIZADO" : "BANCA AVALIADORA";
  const stampSub = isCandidate ? "INICIAR ESTAÇÃO" : "AVALIAÇÃO EM CURSO";

  // pseudo-código de protocolo
  const protocol = useMemo(() => {
    let h = 2166136261;
    const s = stationTitle + displayName;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return Math.abs(h).toString(36).slice(0, 8).toUpperCase();
  }, [stationTitle, displayName]);

  const today = useMemo(() => new Date(anchor).toLocaleDateString("pt-BR"), [anchor]);

  // partículas de tinta (estáticas pseudo-aleatórias mas estáveis)
  const droplets = useMemo(() => {
    const seed = (stationTitle + displayName).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const rng = (i: number) => {
      const x = Math.sin(seed + i * 9.81) * 10000;
      return x - Math.floor(x);
    };
    return Array.from({ length: 22 }).map((_, i) => {
      const angle = rng(i) * Math.PI * 2;
      const dist = 40 + rng(i + 99) * 140;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist * 0.7,
        size: 3 + rng(i + 33) * 9,
        delay: rng(i + 7) * 0.25,
      };
    });
  }, [stationTitle, displayName]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] overflow-hidden"
      aria-live="polite"
      style={{
        background:
          "radial-gradient(ellipse at center, #1a1812 0%, #0a0907 70%, #000 100%)",
      }}
    >
      {/* leve vinheta / luz de mesa */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(255,220,160,0.10), transparent 70%)",
        }}
      />

      {/* === PRONTUÁRIO (papel) === */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: -1.2, scale: 0.96 }}
          animate={
            paperVisible
              ? { opacity: 1, y: 0, rotate: -0.6, scale: 1 }
              : { opacity: 0, y: 30, rotate: -1.2, scale: 0.96 }
          }
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative rounded-sm"
          style={{
            width: "min(560px, 92vw)",
            height: "min(720px, 88vh)",
            background: paperBg,
            boxShadow:
              "0 30px 80px -20px rgba(0,0,0,0.75), 0 6px 20px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.06)",
            backgroundImage: `
              ${paperBg.replace("linear-gradient", "linear-gradient")},
              repeating-linear-gradient(180deg, transparent 0 30px, ${ruleColor} 30px 31px),
              radial-gradient(ellipse at 20% 10%, rgba(0,0,0,0.06), transparent 60%)
            `,
            backgroundBlendMode: "normal, multiply, multiply",
          }}
        >
          {/* "furos" do fichário na borda esquerda */}
          <div className="absolute left-3 top-0 bottom-0 flex flex-col justify-around py-6 pointer-events-none">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-3 w-3 rounded-full" style={{ background: "rgba(0,0,0,0.25)", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4)" }} />
            ))}
          </div>

          {/* cabeçalho do prontuário */}
          <div className="relative pt-7 pb-3 px-10 border-b" style={{ borderColor: headerAccent }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: ink }}>
                <FileText className="h-3.5 w-3.5" />
                <span>REVMED · Prontuário</span>
              </div>
              <div className="font-mono text-[10px] tracking-widest" style={{ color: ink, opacity: 0.7 }}>
                Nº {protocol}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[10px]" style={{ color: ink }}>
              <div className="flex justify-between border-b border-dashed pb-0.5" style={{ borderColor: inkSoft }}>
                <span className="opacity-60">DATA</span><span>{today}</span>
              </div>
              <div className="flex justify-between border-b border-dashed pb-0.5" style={{ borderColor: inkSoft }}>
                <span className="opacity-60">PERFIL</span><span>{isCandidate ? "CANDIDATO" : "EXAMINADOR"}</span>
              </div>
              <div className="flex justify-between border-b border-dashed pb-0.5 col-span-2" style={{ borderColor: inkSoft }}>
                <span className="opacity-60">NOME</span><span className="truncate ml-2">{displayName}</span>
              </div>
              {specialty ? (
                <div className="flex justify-between border-b border-dashed pb-0.5 col-span-2" style={{ borderColor: inkSoft }}>
                  <span className="opacity-60">ESPECIALIDADE</span><span className="truncate ml-2">{specialty}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* conteúdo do prontuário (com pseudo-anotações) */}
          <div className="relative px-10 pt-6">
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase opacity-60" style={{ color: ink }}>
              Identificação da estação
            </div>
            <div className="mt-2 font-display text-2xl md:text-3xl font-bold leading-tight" style={{ color: "#1c1a14" }}>
              {isCandidate ? (specialty || "Sigiloso até a abertura") : stationTitle}
            </div>

            {/* "linhas escritas à mão" */}
            <div className="mt-6 space-y-3">
              {[88, 95, 72, 84, 60].map((w, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={paperVisible ? { opacity: 0.55, x: 0 } : { opacity: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
                  className="h-[6px] rounded-full"
                  style={{ width: `${w}%`, background: `repeating-linear-gradient(90deg, ${ink} 0 8px, transparent 8px 12px)`, opacity: 0.35 }}
                />
              ))}
            </div>
          </div>

          {/* ÁREA DO CARIMBO (centro-baixo do papel) */}
          <div className="absolute left-1/2 bottom-24 -translate-x-1/2">
            <div className="relative" style={{ width: 320, height: 200 }}>
              {/* sombra do carimbo no papel */}
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ width: 230, height: 80, background: "radial-gradient(ellipse, rgba(0,0,0,0.25), transparent 70%)", filter: "blur(8px)" }}
                animate={stampDown ? { opacity: 0.9, scale: 1 } : stampHovering ? { opacity: 0.35, scale: 0.85 } : { opacity: 0 }}
                transition={{ duration: 0.2 }}
              />

              {/* SPLATTER — gotas de tinta */}
              <AnimatePresence>
                {splattering && (
                  <>
                    {droplets.map((d, i) => (
                      <motion.span
                        key={i}
                        className="absolute left-1/2 top-1/2 rounded-full"
                        style={{
                          background: ink,
                          width: d.size,
                          height: d.size,
                          filter: "blur(0.4px)",
                          opacity: 0.85,
                        }}
                        initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                        animate={{ x: d.x, y: d.y, scale: 1, opacity: 0.85 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.45,
                          delay: d.delay,
                          ease: [0.2, 0.8, 0.2, 1],
                        }}
                      />
                    ))}
                    {/* respingo principal central */}
                    <motion.div
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ width: 260, height: 90, background: `radial-gradient(ellipse, ${inkSoft}, transparent 70%)` }}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </>
                )}
              </AnimatePresence>

              {/* CARIMBO */}
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                initial={{ y: -380, rotate: -14, scale: 1.05, opacity: 0 }}
                animate={
                  stampDown
                    ? { y: 0, rotate: -7, scale: 1, opacity: 1 }
                    : stampHovering
                      ? { y: -90, rotate: -10, scale: 1.02, opacity: 1 }
                      : phase === "intro" || phase === "paper"
                        ? { y: -380, rotate: -14, scale: 1.05, opacity: 0 }
                        : { y: -380, rotate: -14, scale: 1.05, opacity: 0 }
                }
                transition={
                  stampDown
                    ? { duration: 0.18, ease: [0.7, 0, 0.84, 0] }
                    : { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }
                }
              >
                {/* imitação de carimbo de borracha — duplo retângulo com tinta irregular */}
                <div
                  className="relative px-8 py-3"
                  style={{
                    color: ink,
                    border: `4px double ${ink}`,
                    borderRadius: 6,
                    background: "transparent",
                    boxShadow: stampDown ? `inset 0 0 0 1px ${inkSoft}` : "none",
                    transform: "skew(-2deg, -1deg)",
                    // textura irregular
                    filter: stampDown ? "url(#stampRough)" : "none",
                    opacity: stampDown ? 0.92 : 0.85,
                  }}
                >
                  <div className="font-display text-3xl md:text-4xl font-black tracking-[0.15em]" style={{ letterSpacing: "0.18em" }}>
                    {stampLabel}
                  </div>
                  <div className="mt-1 text-center font-mono text-[10px] tracking-[0.35em] opacity-80">
                    {stampSub}
                  </div>
                  {/* "data" do carimbo */}
                  <div className="mt-1 text-center font-mono text-[9px] tracking-[0.4em] opacity-70">
                    {today} · Nº {protocol}
                  </div>
                </div>
              </motion.div>

              {/* filtro de textura "roughen" para o carimbo */}
              <svg width="0" height="0" className="absolute">
                <defs>
                  <filter id="stampRough">
                    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
                    <feDisplacementMap in="SourceGraphic" scale="2.2" />
                  </filter>
                </defs>
              </svg>

              {/* flash de impacto */}
              <AnimatePresence>
                {phase === "impact" && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.85), transparent 60%)" }}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1.1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* rodapé: assinatura + papel role */}
          <div className="absolute left-10 right-10 bottom-6 flex items-end justify-between font-mono text-[10px]" style={{ color: ink }}>
            <div>
              <div className="opacity-60">RESPONSÁVEL</div>
              <div className="mt-1 font-display text-sm italic" style={{ borderBottom: `1px solid ${inkSoft}`, paddingBottom: 2, minWidth: 180 }}>
                {isCandidate ? `Dr(a). ${displayName.split(" ")[0]}` : "Banca Avaliadora"}
              </div>
            </div>
            <div className="text-right">
              <div className="opacity-60">PAPEL</div>
              <div className="mt-1 inline-flex items-center gap-1.5">
                <RoleIcon className="h-3 w-3" />
                <span>{isCandidate ? "Candidato" : "Ator / Banca"}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* HUD topo (discreto) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: paperVisible ? 1 : 0, y: paperVisible ? 0 : -10 }}
        transition={{ duration: 0.4 }}
        className="absolute left-1/2 top-6 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 backdrop-blur-md"
      >
        <ShieldCheck className="h-3.5 w-3.5 text-white/70" />
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/70">
          REVMED · Liberação de Acesso
        </span>
      </motion.div>

      {/* CONTAGEM */}
      <AnimatePresence>
        {counting && (
          <motion.div
            key={count}
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/55 backdrop-blur-[3px]"
          >
            <div
              className="font-display font-bold leading-none"
              style={{
                color: "#fff",
                fontSize: "clamp(7rem, 22vw, 17rem)",
                textShadow: `0 0 60px ${isCandidate ? "rgba(120,255,180,0.55)" : "rgba(255,180,180,0.55)"}`,
              }}
            >
              {count === 0 ? "GO" : count}
            </div>
            <div className="mt-2 font-mono text-xs tracking-[0.35em] uppercase text-white/70">
              {isCandidate ? "Iniciando estação" : "Recebendo candidato"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* grão de filme */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
    </motion.div>
  );
}
