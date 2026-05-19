import { motion } from "framer-motion";
import { Stethoscope, HeartPulse, Activity, Pill, Syringe, Cross, Microscope, Brain } from "lucide-react";

/**
 * Ambient background for the Dashboard.
 * Mirrors the login background language: centered aurora, ECG line through the
 * middle, mint grid mascarada e anéis concêntricos pulsantes.
 */
export function DashboardBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--mint) 22%, transparent) 0%, transparent 55%), radial-gradient(110% 80% at 100% 100%, color-mix(in oklab, var(--medical) 18%, transparent) 0%, transparent 55%), linear-gradient(160deg, color-mix(in oklab, var(--mint-soft) 60%, var(--background)) 0%, var(--background) 55%, color-mix(in oklab, var(--medical) 10%, var(--background)) 100%)",
      }}
    >
      {/* Aurora orbs — centradas */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: "color-mix(in oklab, var(--mint) 28%, transparent)" }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.8, 0.55] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-[30%] top-[40%] h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: "color-mix(in oklab, var(--medical) 22%, transparent)" }}
        animate={{ scale: [1.05, 1, 1.05], opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />
      <motion.div
        className="absolute left-[70%] top-[55%] h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: "color-mix(in oklab, var(--mint) 24%, transparent)" }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />

      {/* Grid mint mascarado no centro */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--mint) 22%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--mint) 22%, transparent) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 70% 55% at 50% 50%, black 0%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 55% at 50% 50%, black 0%, transparent 75%)",
        }}
      />

      {/* Anéis concêntricos pulsantes no centro */}
      <div className="absolute inset-0 grid place-items-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border"
            style={{ borderColor: "color-mix(in oklab, var(--mint) 35%, transparent)" }}
            initial={{ width: 100, height: 100, opacity: 0.4 }}
            animate={{ width: 640, height: 640, opacity: 0 }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeOut", delay: i * 2.2 }}
          />
        ))}
      </div>

      {/* Linha ECG no meio */}
      <svg
        className="absolute left-0 right-0 top-1/2 h-28 w-full -translate-y-1/2 opacity-70"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="dash-ecg-grad" x1="0" x2="1">
            <stop offset="0%" stopColor="var(--mint)" stopOpacity="0" />
            <stop offset="20%" stopColor="var(--mint)" stopOpacity="0.9" />
            <stop offset="60%" stopColor="var(--medical)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--medical)" stopOpacity="0" />
          </linearGradient>
          <filter id="dash-ecg-glow" x="-10%" y="-50%" width="120%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M0 50 L200 50 L230 50 L245 20 L260 80 L275 35 L290 50 L500 50 L530 50 L545 15 L560 85 L575 30 L590 50 L800 50 L830 50 L845 25 L860 75 L875 40 L890 50 L1200 50"
          stroke="var(--mint)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.3"
        />
        <motion.path
          d="M0 50 L200 50 L230 50 L245 20 L260 80 L275 35 L290 50 L500 50 L530 50 L545 15 L560 85 L575 30 L590 50 L800 50 L830 50 L845 25 L860 75 L875 40 L890 50 L1200 50"
          stroke="url(#dash-ecg-grad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#dash-ecg-glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>

      {/* Ícones médicos flutuantes */}
      <div className="absolute inset-0">
        <FloatingIcon className="left-[5%] top-[8%]" color="mint" delay={0}>
          <Stethoscope className="h-9 w-9" strokeWidth={1.75} />
        </FloatingIcon>
        <FloatingIcon className="right-[8%] top-[12%]" color="medical" delay={1}>
          <HeartPulse className="h-8 w-8" strokeWidth={1.75} />
        </FloatingIcon>
        <FloatingIcon className="left-[12%] bottom-[14%]" color="mint" delay={2}>
          <Activity className="h-8 w-8" strokeWidth={1.75} />
        </FloatingIcon>
        <FloatingIcon className="right-[6%] bottom-[10%]" color="medical" delay={0.5}>
          <Pill className="h-9 w-9" strokeWidth={1.75} />
        </FloatingIcon>
        <FloatingIcon className="left-[44%] top-[6%]" color="medical" delay={2.5}>
          <Syringe className="h-7 w-7" strokeWidth={1.75} />
        </FloatingIcon>
        <FloatingIcon className="right-[34%] bottom-[6%]" color="mint" delay={1.7}>
          <Microscope className="h-8 w-8" strokeWidth={1.75} />
        </FloatingIcon>
        <FloatingIcon className="left-[3%] top-[46%]" color="medical" delay={3.1}>
          <Brain className="h-8 w-8" strokeWidth={1.75} />
        </FloatingIcon>
        <FloatingIcon className="right-[3%] top-[50%]" color="mint" delay={0.8}>
          <Cross className="h-7 w-7" strokeWidth={1.75} />
        </FloatingIcon>
      </div>


      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, color-mix(in oklab, var(--background) 70%, transparent) 100%)",
        }}
      />
    </div>
  );
}
