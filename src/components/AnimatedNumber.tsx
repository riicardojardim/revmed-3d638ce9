import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  /** Delay em ms antes de iniciar a contagem (ex.: esperar overlay sumir). */
  delay?: number;
};

/**
 * Conta de 0 até `value` com easing suave. Ideal pra métricas do dashboard.
 */
export function AnimatedNumber({ value, duration = 900, decimals = 0, className, delay = 0 }: Props) {
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
    }, Math.max(0, delay));
    return () => {
      if (timer) clearTimeout(timer);
      cancelAnimationFrame(raf);
      startRef.current = null;
      fromRef.current = display;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, delay]);

  return <span className={className}>{display.toFixed(decimals)}</span>;
}

