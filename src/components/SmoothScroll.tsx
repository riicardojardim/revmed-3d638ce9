import { useEffect } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import Lenis from "lenis";

export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });

    // Tornar âncoras (#id) compatíveis com Lenis
    const onAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: -16, duration: 1.2 });
    };
    document.addEventListener("click", onAnchorClick);

    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("click", onAnchorClick);
      lenis.destroy();
    };
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