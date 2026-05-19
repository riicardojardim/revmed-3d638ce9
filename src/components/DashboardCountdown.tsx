import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Stethoscope } from "lucide-react";

export const DASHBOARD_COUNTDOWN_SESSION_KEY = "er_dashboard_countdown_shown_v1";
const SESSION_KEY = DASHBOARD_COUNTDOWN_SESSION_KEY;

type Props = {
  /** Segundos do countdown (3 a 5). */
  seconds?: number;
  /** Chamado quando o overlay termina. */
  onDone?: () => void;
  /** Mostra uma vez por sessão (default true). */
  oncePerSession?: boolean;
};

/**
 * Overlay de "preparando seu dashboard" com countdown 3..1 → Vamos lá!
 * Bloqueia visualmente a tela enquanto os cards entram.
 */
export function DashboardCountdown({ seconds = 3, onDone, oncePerSession = true }: Props) {
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (oncePerSession && sessionStorage.getItem(SESSION_KEY) === "1") {
      onDone?.();
      return;
    }
    setVisible(true);
    setCount(seconds);

    let current = seconds;
    const tick = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        clearInterval(tick);
        setCount(0);
        // pequeno respiro pro "Vamos lá!" aparecer
        setTimeout(() => {
          setVisible(false);
          if (oncePerSession) sessionStorage.setItem(SESSION_KEY, "1");
          onDone?.();
        }, 650);
      } else {
        setCount(current);
      }
    }, 1000);

    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="er-countdown"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-background/85 backdrop-blur-md"
          aria-live="polite"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-6"
          >
            <div className="flex items-center gap-2 text-mint">
              <Stethoscope className="h-5 w-5" />
              <span className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Preparando seu dashboard
              </span>
            </div>

            <div className="relative flex h-40 w-40 items-center justify-center">
              {/* Anel pulsando */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-mint/40"
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.15, 0.6] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="absolute inset-3 rounded-full border border-mint/20 bg-gradient-to-br from-mint/10 to-transparent" />

              <AnimatePresence mode="wait">
                <motion.span
                  key={count}
                  initial={{ scale: 0.6, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 1.4, opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="font-display text-6xl font-bold text-foreground"
                >
                  {count > 0 ? count : "Vamos lá!"}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="h-1.5 w-56 overflow-hidden rounded-full bg-muted/40">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-mint to-medical"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: seconds, ease: "linear" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
