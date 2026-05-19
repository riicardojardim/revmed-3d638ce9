import { useEffect, useRef, useState } from "react";
import { DASHBOARD_COUNTDOWN_SESSION_KEY } from "@/components/DashboardCountdown";

type Props = {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  /** Delay em ms antes de iniciar a contagem (default: aguarda o countdown do dashboard se ativo). */
  delay?: number;
};

/**
 * Conta de 0 até `value` com easing suave. Ideal pra métricas do dashboard.
 * Por padrão, se o countdown de entrada do dashboard ainda não rolou nesta sessão,
 * adia a contagem ~3.2s pra começar quando o overlay sumir.
 */
export function AnimatedNumber({ value, duration = 900, decimals = 0, className, delay }: Props) {
  const effectiveDelay =
    delay ??
    (typeof window !== "undefined" && sessionStorage.getItem(DASHBOARD_COUNTDOWN_SESSION_KEY) !== "1"
      ? 3200
      : 0);
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = Number.isFinite(value) ? value : 0;
    if (from === to) {
      setDisplay(to);
      return;
    }
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
        startRef.current = null;
      }
    };
    timer = setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, Math.max(0, effectiveDelay));
    return () => {
      if (timer) clearTimeout(timer);
      cancelAnimationFrame(raf);
      startRef.current = null;
      fromRef.current = display;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, effectiveDelay]);

  return <span className={className}>{display.toFixed(decimals)}</span>;
}

