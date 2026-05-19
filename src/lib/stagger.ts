import type { Variants } from "framer-motion";

/**
 * Timings padronizados para animações em cascata (stagger) em toda a aplicação.
 * Use estes valores para manter consistência entre dashboard, checklists,
 * flashcards e demais seções.
 */
export const STAGGER = {
  /** Delay entre cada filho (segundos). */
  children: 0.08,
  /** Delay inicial antes do primeiro filho entrar (segundos). */
  delay: 0.05,
  /** Duração da animação de cada item (segundos). */
  duration: 0.5,
  /** Easing padrão (out-expo suave). */
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  /** Deslocamento vertical inicial (px). */
  y: 14,
} as const;

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: STAGGER.children,
      delayChildren: STAGGER.delay,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: STAGGER.y },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: STAGGER.duration, ease: STAGGER.ease },
  },
};
