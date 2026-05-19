import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Stethoscope, HeartPulse, Activity, Pill, Syringe, Cross, Microscope, Brain } from "lucide-react";

/**
 * Animated, parallax-aware background for the login page.
 * Uses only brand colors (mint + medical) and medical/Revalida iconography.
 */
export function LoginBackground() {
  // Mouse-driven parallax
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 60, damping: 20, mass: 0.6 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const x = e.clientX / window.innerWidth - 0.5; // -0.5 .. 0.5
      const y = e.clientY / window.innerHeight - 0.5;
      mx.set(x);
      my.set(y);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  // Parallax layers (different depths)
  const layerSlow = { x: useTransform(sx, (v) => v * 14), y: useTransform(sy, (v) => v * 14) };
  const layerMid = { x: useTransform(sx, (v) => v * 28), y: useTransform(sy, (v) => v * 28) };
  const layerFast = { x: useTransform(sx, (v) => v * 48), y: useTransform(sy, (v) => v * 48) };

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--mint) 30%, transparent) 0%, transparent 55%), radial-gradient(110% 80% at 100% 100%, color-mix(in oklab, var(--medical) 24%, transparent) 0%, transparent 55%), linear-gradient(160deg, color-mix(in oklab, var(--mint-soft) 70%, white) 0%, white 55%, color-mix(in oklab, var(--medical) 12%, white) 100%)",
      }}
    >
      {/* Aurora orbs (slow parallax) */}
      <motion.div className="absolute inset-0" style={layerSlow}>
        <motion.div
          className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{ background: "color-mix(in oklab, var(--mint) 45%, transparent)" }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 0.9, 0.7] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-28 top-1/4 h-[26rem] w-[26rem] rounded-full blur-3xl"
          style={{ background: "color-mix(in oklab, var(--medical) 35%, transparent)" }}
          animate={{ scale: [1.05, 1, 1.05], opacity: [0.6, 0.85, 0.6] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        />
        <motion.div
          className="absolute -bottom-32 left-1/3 h-[24rem] w-[24rem] rounded-full blur-3xl"
          style={{ background: "color-mix(in oklab, var(--mint) 35%, transparent)" }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.55, 0.8, 0.55] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />
      </motion.div>

      {/* Mint grid (mid parallax) */}
      <motion.div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          ...layerMid,
          backgroundImage:
            "linear-gradient(var(--mint) 1px, transparent 1px), linear-gradient(90deg, var(--mint) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />

      {/* Concentric pulse rings (heartbeat vibe) */}
      <motion.div className="absolute inset-0 grid place-items-center" style={layerSlow}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border"
            style={{ borderColor: "color-mix(in oklab, var(--mint) 45%, transparent)" }}
            initial={{ width: 80, height: 80, opacity: 0.5 }}
            animate={{ width: 560, height: 560, opacity: 0 }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeOut", delay: i * 2 }}
          />
        ))}
      </motion.div>

      {/* ECG / heartbeat line */}
      <svg
        className="absolute left-0 right-0 top-1/2 h-32 w-full -translate-y-1/2 opacity-80"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="ecg-grad" x1="0" x2="1">
            <stop offset="0%" stopColor="var(--mint)" stopOpacity="0" />
            <stop offset="20%" stopColor="var(--mint)" stopOpacity="0.9" />
            <stop offset="60%" stopColor="var(--medical)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--medical)" stopOpacity="0" />
          </linearGradient>
          <filter id="ecg-glow" x="-10%" y="-50%" width="120%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Static baseline trace, brand colors, soft */}
        <path
          d="M0 50 L200 50 L230 50 L245 20 L260 80 L275 35 L290 50 L500 50 L530 50 L545 15 L560 85 L575 30 L590 50 L800 50 L830 50 L845 25 L860 75 L875 40 L890 50 L1200 50"
          stroke="var(--mint)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.35"
        />
        {/* Animated bright pulse traveling along the trace */}
        <motion.path
          d="M0 50 L200 50 L230 50 L245 20 L260 80 L275 35 L290 50 L500 50 L530 50 L545 15 L560 85 L575 30 L590 50 L800 50 L830 50 L845 25 L860 75 L875 40 L890 50 L1200 50"
          stroke="url(#ecg-grad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#ecg-glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>

      {/* DNA helix (subtle, top-right) */}
      <svg
        className="absolute right-[4%] top-[8%] h-40 w-16 opacity-30"
        viewBox="0 0 60 200"
        fill="none"
      >
        <motion.g
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "30px 100px" }}
        >
          {Array.from({ length: 8 }).map((_, i) => {
            const y = 15 + i * 24;
            return (
              <line
                key={i}
                x1={10 + (i % 2 ? 10 : 0)}
                x2={50 - (i % 2 ? 10 : 0)}
                y1={y}
                y2={y}
                stroke="var(--mint)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}
        </motion.g>
      </svg>

      {/* Floating medical icons (fast parallax + eased float) */}
      <motion.div className="absolute inset-0" style={layerFast}>
        <FloatingIcon className="left-[6%] top-[10%]" color="mint" delay={0}>
          <Stethoscope className="h-9 w-9" strokeWidth={1.75} />
        </FloatingIcon>
        <FloatingIcon className="right-[10%] top-[16%]" color="medical" delay={1}>
          <HeartPulse className="h-8 w-8" strokeWidth={1.75} />
        </FloatingIcon>
        <FloatingIcon className="left-[14%] bottom-[18%]" color="mint" delay={2}>
          <Activity className="h-8 w-8" strokeWidth={1.75} />
        </FloatingIcon>
        <FloatingIcon className="right-[8%] bottom-[14%]" color="medical" delay={0.5}>
          <Pill className="h-9 w-9" strokeWidth={1.75} />
        </FloatingIcon>
        <FloatingIcon className="left-[42%] top-[8%]" color="medical" delay={2.5}>
          <Syringe className="h-7 w-7" strokeWidth={1.75} />
        </FloatingIcon>
        <FloatingIcon className="right-[36%] bottom-[8%]" color="mint" delay={1.7}>
          <Microscope className="h-8 w-8" strokeWidth={1.75} />
        </FloatingIcon>
        <FloatingIcon className="left-[4%] top-[48%]" color="medical" delay={3.1}>
          <Brain className="h-8 w-8" strokeWidth={1.75} />
        </FloatingIcon>
        <FloatingIcon className="right-[4%] top-[52%]" color="mint" delay={0.8}>
          <Cross className="h-7 w-7" strokeWidth={1.75} />
        </FloatingIcon>
      </motion.div>

      {/* Soft vignette to focus the card */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, color-mix(in oklab, var(--mint-soft) 30%, white) 100%)",
        }}
      />
    </div>
  );
}

function FloatingIcon({
  className,
  children,
  color,
  delay,
}: {
  className: string;
  children: React.ReactNode;
  color: "mint" | "medical";
  delay: number;
}) {
  const cssVar = color === "mint" ? "var(--mint)" : "var(--medical)";
  return (
    <motion.div
      className={`absolute ${className}`}
      style={{ color: cssVar, opacity: 0.55 }}
      animate={{ y: [0, -14, 0], rotate: [0, 4, -4, 0] }}
      transition={{ duration: 7 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}
