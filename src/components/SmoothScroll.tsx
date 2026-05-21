import { useEffect } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import Lenis from "lenis";

export function SmoothScroll() {
  useEffect(() => {
    // Smooth scroll desativado para evitar conflito com o layout SSR do TanStack Start.
    // O CSS já habilita scroll-behavior: smooth nas âncoras.
  }, []);
  return null;
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 30,
    mass: 0.4,
  });
  return (
    <motion.div
      style={{ scaleX }}
      className="pointer-events-none fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left"
    >
      <div className="h-full w-full bg-gradient-to-r from-primary via-mint to-primary shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_60%,transparent)]" />
    </motion.div>
  );
}