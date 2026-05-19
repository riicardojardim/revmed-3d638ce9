import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Stethoscope,
  HeartPulse,
  Activity,
  Pill,
  Syringe,
  Cross,
  Microscope,
  Brain,
  Thermometer,
  Bandage,
  Dna,
} from "lucide-react";

const ICONS = [
  Stethoscope,
  HeartPulse,
  Activity,
  Pill,
  Syringe,
  Cross,
  Microscope,
  Brain,
  Thermometer,
  Bandage,
  Dna,
];

type Particle = {
  Icon: (typeof ICONS)[number];
  leftPct: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  rotate: number;
  color: "mint" | "medical";
  direction: 1 | -1; // 1 = falling down, -1 = rising up
  opacity: number;
};

// Deterministic pseudo-random so SSR/CSR match
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function FallingMedicalIcons({
  count = 18,
  seed = 7,
}: {
  count?: number;
  seed?: number;
}) {
  const particles = useMemo<Particle[]>(() => {
    const r = rng(seed);
    return Array.from({ length: count }).map((_, i) => {
      const Icon = ICONS[Math.floor(r() * ICONS.length)];
      const direction: 1 | -1 = r() > 0.35 ? 1 : -1; // mostly falling
      return {
        Icon,
        leftPct: r() * 100,
        size: 18 + Math.floor(r() * 22), // 18–40px
        duration: 14 + r() * 18, // 14–32s
        delay: -r() * 25, // start mid-stream
        drift: (r() - 0.5) * 80, // horizontal drift px
        rotate: (r() - 0.5) * 360,
        color: r() > 0.5 ? "mint" : "medical",
        direction,
        opacity: 0.18 + r() * 0.32,
      };
    });
  }, [count, seed]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p, i) => {
        const cssVar = p.color === "mint" ? "var(--mint)" : "var(--medical)";
        const startY = p.direction === 1 ? "-10vh" : "110vh";
        const endY = p.direction === 1 ? "110vh" : "-10vh";
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${p.leftPct}%`,
              top: 0,
              color: cssVar,
              opacity: p.opacity,
              willChange: "transform",
            }}
            initial={{ y: startY, x: 0, rotate: 0 }}
            animate={{
              y: [startY, endY],
              x: [0, p.drift, -p.drift / 2, 0],
              rotate: [0, p.rotate],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "linear",
              times: [0, 1],
              x: {
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: "easeInOut",
              },
              rotate: {
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: "linear",
              },
            }}
          >
            <p.Icon size={p.size} strokeWidth={1.6} />
          </motion.div>
        );
      })}
    </div>
  );
}
