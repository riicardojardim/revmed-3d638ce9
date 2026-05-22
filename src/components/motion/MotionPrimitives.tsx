import { motion, useReducedMotion, type HTMLMotionProps, type Variants } from "framer-motion";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { STAGGER } from "@/lib/stagger";

/**
 * Card com micro-interações padronizadas (hover lift + tap press).
 * Use no lugar de <div> para qualquer card clicável/destacável.
 */
type MotionCardProps = HTMLMotionProps<"div"> & {
  /** Intensidade do lift no hover (px). Default: 3 */
  lift?: number;
  /** Adiciona glow sutil no hover. */
  glow?: boolean;
};

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ className, lift = 3, glow = false, children, ...rest }, ref) => {
    const reduce = useReducedMotion();
    return (
      <motion.div
        ref={ref}
        whileHover={reduce ? undefined : { y: -lift, transition: { duration: 0.18, ease: STAGGER.ease } }}
        whileTap={reduce ? undefined : { scale: 0.985 }}
        transition={{ duration: 0.18, ease: STAGGER.ease }}
        className={cn(
          "transition-shadow duration-300",
          glow && "hover:shadow-glow",
          className,
        )}
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);
MotionCard.displayName = "MotionCard";

/**
 * Revela conteúdo ao entrar na viewport. Use para seções longas.
 */
export function Reveal({
  children,
  delay = 0,
  y = 14,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: STAGGER.ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Variants p/ listas longas — entrada item-a-item rápida.
 */
export const listContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: STAGGER.ease } },
};

/**
 * Botão de ícone com pulso sutil no tap.
 */
export function TapIcon({
  children,
  className,
  ...rest
}: HTMLMotionProps<"button">) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      whileHover={reduce ? undefined : { scale: 1.08 }}
      whileTap={reduce ? undefined : { scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn("inline-flex items-center justify-center", className)}
      {...rest}
    >
      {children}
    </motion.button>
  );
}