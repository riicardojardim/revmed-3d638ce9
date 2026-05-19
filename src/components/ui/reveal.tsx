import { motion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode } from "react";

type Props = Omit<HTMLMotionProps<"div">, "children"> & {
  /** Atraso da animação em segundos (use 0, 0.08, 0.16, 0.24... pra cascata). */
  delay?: number;
  /** Distância vertical inicial. */
  y?: number;
  children: ReactNode;
};

/**
 * Bloco que entra com fade + slide suave (easing Apple-style).
 * Pra criar cascata, vá incrementando `delay` em 0.08s entre seções irmãs.
 */
export function Reveal({ delay = 0, y = 16, children, ...rest }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
