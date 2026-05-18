import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { ClipboardList, Stethoscope, UserRound, ShieldCheck } from "lucide-react";

export type IntroRole = "candidato" | "paciente";

/** Duração total da animação de entrada (precisa bater com a timeline interna). */
export const INTRO_DURATION_MS = 9000;

interface Props {
  role: IntroRole;
  stationTitle: string;
  specialty?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  onComplete: () => void;
}

const ROLE_META: Record<IntroRole, { label: string; icon: typeof Stethoscope }> = {
  candidato: { label: "Candidato / Médico", icon: Stethoscope },
  paciente: { label: "Ator / Paciente", icon: UserRound },
};

/**
 * StationIntroOverlay — sequência institucional "Prontuário + Crachá".
 * Duração ~5.2s. Sincronizada externamente via Supabase Realtime.
 */
export function StationIntroOverlay({ role, stationTitle, specialty, displayName, avatarUrl, onComplete }: Props) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"intro" | "credential" | "record" | "doors" | "countdown" | "done">("intro");
  const [count, setCount] = useState<3 | 2 | 1 | 0>(3);

  // Timeline (reduced: pula direto para countdown curto)
  useEffect(() => {
    if (reduce) {
      const t1 = setTimeout(() => setPhase("countdown"), 300);
      return () => clearTimeout(t1);
    }
    const timers = [
      setTimeout(() => setPhase("credential"), 700),
      setTimeout(() => setPhase("record"), 2500),
      setTimeout(() => setPhase("doors"), 5500),
      setTimeout(() => setPhase("countdown"), 6300),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduce]);

  // Countdown 3-2-1-0 → done → onComplete
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) {
      const t = setTimeout(() => {
        setPhase("done");
        onComplete();
      }, 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => (c - 1) as 3 | 2 | 1 | 0), 700);
    return () => clearTimeout(t);
  }, [phase, count, onComplete]);

  const isCandidate = role === "candidato";
  const Icon = ROLE_META[role].icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at center, hsl(220 45% 12%) 0%, hsl(222 50% 6%) 70%, hsl(222 60% 3%) 100%)",
      }}
      aria-live="polite"
    >
      {/* Textura sutil + grid institucional */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(160 60% 60%) 1px, transparent 1px), linear-gradient(90deg, hsl(160 60% 60%) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Vinheta */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />

      {/* Título */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: phase === "doors" || phase === "countdown" ? 0.2 : 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="absolute left-1/2 top-[10%] -translate-x-1/2 text-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-mint">
          <ShieldCheck className="h-3 w-3" /> Estação Revalida
        </div>
        <div className="mt-3 font-display text-xl text-white/80 md:text-2xl">
          {isCandidate ? "Você vai entrar agora." : "Prepare-se para receber o candidato"}
        </div>
        <div className="mt-1 text-sm text-white/50">
          {isCandidate ? "Boa prova." : "Revise o papel da estação"}
        </div>
      </motion.div>

      {/* Crachá */}
      <AnimatePresence>
        {(phase === "credential" || phase === "record") && (
          <motion.div
            key="cred"
            initial={{ y: 200, opacity: 0, scale: 0.9 }}
            animate={{
              y: phase === "record" ? -20 : 0,
              opacity: 1,
              scale: phase === "record" ? 0.85 : 1,
              x: phase === "record" ? "-22%" : 0,
            }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: "spring", damping: 18, stiffness: 110 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <CredentialCard
              role={role}
              displayName={displayName}
              stationTitle={isCandidate ? "Sigiloso até a abertura" : stationTitle}
              specialty={isCandidate ? null : specialty}
              hideStation={isCandidate}
              Icon={Icon}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prontuário */}
      <AnimatePresence>
        {phase === "record" && (
          <motion.div
            key="rec"
            initial={{ opacity: 0, rotateY: -45, x: "20%", scale: 0.85 }}
            animate={{ opacity: 1, rotateY: 0, x: "20%", scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ transformStyle: "preserve-3d", perspective: 1200 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <ClinicalRecord isCandidate={isCandidate} stationTitle={stationTitle} displayName={displayName} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portas: aparecem fechadas em "doors", abrem no countdown */}
      <AnimatePresence>
        {(phase === "doors" || phase === "countdown" || phase === "done") && (
          <SlidingDoors open={phase === "countdown" || phase === "done"} />
        )}
      </AnimatePresence>

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
              <div className="font-display font-bold leading-none text-mint drop-shadow-[0_0_30px_rgba(74,222,180,0.45)] text-[clamp(6rem,22vw,16rem)]">
                {count}
              </div>
            ) : (
              <div className="font-display font-bold text-white text-[clamp(2rem,5vw,3.5rem)]">
                Estação iniciada
              </div>
            )}
            <div className="mt-6 flex flex-col items-center gap-1 text-center text-white/60">
              {isCandidate ? (
                <div className="text-sm font-medium text-white/80">Boa prova, {displayName.split(" ")[0]}.</div>
              ) : (
                <>
                  <div className="text-sm font-medium text-white/80">{stationTitle}</div>
                  {specialty && <div className="text-xs uppercase tracking-wider">{specialty}</div>}
                </>
              )}
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px]">
                <Icon className="h-3 w-3 text-mint" /> {ROLE_META[role].label}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Hash determinístico simples → pseudo-código alfanumérico estável por título. */
function pseudoCode(seed: string, len = 8) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[h % alphabet.length];
    h = Math.floor(h / alphabet.length) + 7 * (i + 1);
  }
  return out;
}

/** QR "fake" — padrão visual gerado a partir do seed (não escaneável). Garante 3 finder patterns. */
function FakeQR({ seed, size = 80 }: { seed: string; size?: number }) {
  const N = 17; // grid
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 131 + seed.charCodeAt(i)) >>> 0;
  const rand = () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0xffffffff;
  };
  const cells: boolean[][] = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => rand() > 0.55),
  );
  // Finder patterns (cantos)
  const stampFinder = (cx: number, cy: number) => {
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) {
        const onBorder = x === 0 || y === 0 || x === 6 || y === 6;
        const onInner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        cells[cy + y][cx + x] = onBorder || onInner;
      }
    // gap branco ao redor
    for (let y = -1; y <= 7; y++)
      for (let x = -1; x <= 7; x++) {
        if (x === -1 || y === -1 || x === 7 || y === 7) {
          const yy = cy + y, xx = cx + x;
          if (yy >= 0 && yy < N && xx >= 0 && xx < N) cells[yy][xx] = false;
        }
      }
  };
  stampFinder(0, 0);
  stampFinder(N - 7, 0);
  stampFinder(0, N - 7);

  const cell = size / N;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-sm bg-white">
      {cells.map((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="#0a0a0a" /> : null,
        ),
      )}
    </svg>
  );
}

function CredentialCard({
  role,
  displayName,
  stationTitle,
  specialty,
  hideStation,
  Icon,
}: {
  role: IntroRole;
  displayName: string;
  stationTitle: string;
  specialty?: string | null;
  hideStation?: boolean;
  Icon: typeof Stethoscope;
}) {
  const protocol = pseudoCode(stationTitle + displayName, 8);
  return (
    <div
      className="relative w-[clamp(240px,28vw,320px)] overflow-hidden rounded-2xl border border-white/15 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
      style={{
        background:
          "linear-gradient(165deg, hsl(220 35% 18%) 0%, hsl(222 45% 10%) 100%)",
      }}
    >
      {/* Cordão */}
      <div className="absolute -top-3 left-1/2 h-3 w-16 -translate-x-1/2 rounded-b-md bg-white/20" />
      <div className="h-1.5 bg-gradient-to-r from-mint via-medical to-mint" />
      <div className="p-5">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-mint">
          <span>Estação Revalida</span>
          <span className="text-white/40">CRED · {role.slice(0, 3).toUpperCase()}</span>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-mint/15 ring-1 ring-mint/30">
            <Icon className="h-7 w-7 text-mint" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-base font-bold text-white">{displayName}</div>
            <div className="text-[11px] uppercase tracking-wider text-white/60">{ROLE_META[role].label}</div>
          </div>
        </div>
        <div className="mt-5 flex items-stretch gap-3 border-t border-white/10 pt-3">
          <div className="flex-1 space-y-1">
            {hideStation ? (
              <>
                <div className="text-[10px] uppercase tracking-wider text-white/40">Protocolo</div>
                <div className="font-mono text-xs font-semibold tracking-wider text-white/90">{protocol}</div>
                <div className="mt-2 text-[10px] uppercase tracking-wider text-white/40">Estação</div>
                <div className="text-xs italic text-white/60">Sigiloso até a abertura</div>
              </>
            ) : (
              <>
                <div className="text-[10px] uppercase tracking-wider text-white/40">Estação</div>
                <div className="line-clamp-2 text-xs font-medium text-white/90">{stationTitle}</div>
                {specialty && (
                  <>
                    <div className="mt-2 text-[10px] uppercase tracking-wider text-white/40">Especialidade</div>
                    <div className="text-xs text-white/80">{specialty}</div>
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="rounded-md bg-white p-1">
              <FakeQR seed={protocol} size={64} />
            </div>
            <div className="mt-1 text-[8px] uppercase tracking-wider text-white/40">Acesso</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClinicalRecord({
  isCandidate,
  stationTitle,
  displayName,
}: {
  isCandidate: boolean;
  stationTitle: string;
  displayName: string;
}) {
  const protocol = pseudoCode(stationTitle + displayName, 6);
  // Sala randômica determinística
  const room = (pseudoCode(stationTitle, 2).charCodeAt(0) % 9) + 1;
  return (
    <div
      className="w-[clamp(220px,26vw,300px)] rounded-xl border border-white/20 bg-[hsl(0_0%_97%)] p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)]"
    >
      <div className="flex items-center justify-between border-b border-night/10 pb-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-medical">
          <ClipboardList className="h-3.5 w-3.5" />
          {isCandidate ? "Ficha de Acesso" : "Roteiro do Ator"}
        </div>
        <div className="text-[9px] text-night/40">Nº {protocol}</div>
      </div>

      {isCandidate ? (
        <>
          <div className="mt-3 flex items-start gap-3">
            <div className="flex-1 space-y-1.5">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-night/50">Candidato</div>
                <div className="truncate text-xs font-semibold text-night/90">{displayName}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-night/50">Sala</div>
                <div className="text-xs font-semibold text-night/90">Estação {String(room).padStart(2, "0")}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-night/50">Caso</div>
                <div className="text-xs italic text-night/50">Lacrado — abertura ao iniciar</div>
              </div>
            </div>
            <div className="rounded-sm bg-white p-0.5 ring-1 ring-night/10">
              <FakeQR seed={protocol + "-rec"} size={72} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-night/10 pt-2">
            <div className="text-[9px] uppercase tracking-wider text-medical">Sigiloso</div>
            <div className="text-[9px] font-mono text-night/40">{protocol}</div>
          </div>
        </>
      ) : (
        <>
          <div className="mt-3 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-night/50">Estação</div>
            <div className="line-clamp-2 text-xs font-semibold text-night/90">{stationTitle}</div>
          </div>
          <div className="mt-3 space-y-1">
            {[90, 75, 85, 60].map((w, i) => (
              <div key={i} className="h-1.5 rounded-full bg-night/10" style={{ width: `${w}%` }} />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-night/10 pt-2">
            <div className="text-[9px] uppercase tracking-wider text-night/40">Confidencial</div>
            <div className="h-6 w-6 rounded-full bg-mint/30 ring-2 ring-mint/50" />
          </div>
        </>
      )}
    </div>
  );
}

function SlidingDoors({ open }: { open: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Painel esquerdo: começa fechado (x:0 cobrindo metade esq.), abre p/ -100% */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: open ? "-100%" : "0%" }}
        transition={{ duration: 0.9, ease: [0.7, 0, 0.3, 1] }}
        className="absolute inset-y-0 left-0 w-1/2 border-r border-mint/20"
        style={{
          background:
            "linear-gradient(110deg, hsl(220 40% 10%) 0%, hsl(220 35% 14%) 60%, hsl(160 30% 18%) 100%)",
          boxShadow: "inset -2px 0 0 hsl(160 60% 50% / 0.4)",
        }}
      >
        <div className="absolute right-2 top-1/2 h-24 w-1 -translate-y-1/2 rounded-full bg-mint/40" />
      </motion.div>
      {/* Painel direito */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: open ? "100%" : "0%" }}
        transition={{ duration: 0.9, ease: [0.7, 0, 0.3, 1] }}
        className="absolute inset-y-0 right-0 w-1/2 border-l border-mint/20"
        style={{
          background:
            "linear-gradient(250deg, hsl(220 40% 10%) 0%, hsl(220 35% 14%) 60%, hsl(160 30% 18%) 100%)",
          boxShadow: "inset 2px 0 0 hsl(160 60% 50% / 0.4)",
        }}
      >
        <div className="absolute left-2 top-1/2 h-24 w-1 -translate-y-1/2 rounded-full bg-mint/40" />
      </motion.div>
    </motion.div>
  );
}
