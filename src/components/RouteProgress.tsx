import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Barra fina e indeterminada no topo, exibida enquanto o TanStack Router
 * carrega uma nova rota. Mantém o conteúdo atual visível para reduzir flicker.
 * Aparece só se a navegação levar mais de ~120ms, evitando "flash" em troca
 * instantânea.
 */
export function RouteProgress() {
  const status = useRouterState({ select: (s) => s.status });
  const isPending = status === "pending";
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setShow(false);
      return;
    }
    const t = window.setTimeout(() => setShow(true), 120);
    return () => window.clearTimeout(t);
  }, [isPending]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="route-progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] overflow-hidden"
        >
          <div className="absolute inset-0 bg-mint/10" />
          <motion.div
            className="absolute inset-y-0 w-1/3 rounded-r-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, var(--mint) 40%, var(--medical) 80%, transparent 100%)",
              boxShadow: "0 0 12px color-mix(in oklab, var(--mint) 60%, transparent)",
            }}
            animate={{ x: ["-40%", "180%"] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
