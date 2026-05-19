import { motion } from "framer-motion";

/**
 * Ambient background for the Dashboard.
 * Sutil: 2 blobs mint + grid com máscara radial + linha ECG fina no rodapé.
 * Fica atrás do conteúdo via `pointer-events-none` e `-z-10`.
 */
export function DashboardBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Aurora mint blobs */}
      <motion.div
        className="absolute -top-32 -left-24 h-[520px] w-[520px] rounded-full bg-mint/20 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.6, 0.45] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -right-24 h-[560px] w-[560px] rounded-full bg-medical/15 blur-3xl"
        animate={{ scale: [1.05, 1, 1.05], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute top-1/3 left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-mint/10 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />

      {/* Grid mint mascarado */}
      <div
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--mint) 18%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--mint) 18%, transparent) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 0%, transparent 75%)",
        }}
      />

      {/* Linha ECG fininha no rodapé */}
      <svg
        className="absolute bottom-8 left-0 h-16 w-full opacity-40"
        viewBox="0 0 1200 80"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="dash-ecg-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--mint)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--mint)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--medical)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 40 L260 40 L290 40 L305 22 L325 58 L345 12 L365 40 L600 40 L620 40 L640 30 L660 50 L680 40 L920 40 L950 40 L970 18 L990 62 L1010 40 L1200 40"
          stroke="url(#dash-ecg-grad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
