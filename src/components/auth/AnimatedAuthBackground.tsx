import { useEffect, useRef } from "react";

/**
 * Fundo animado para telas de autenticação (login / criar conta).
 * - Blobs com gradientes da marca (âmbar/mint/roxo) que flutuam lentamente
 * - Grid sutil + viñeta para profundidade
 * - Partículas leves desenhadas em canvas (respeita prefers-reduced-motion)
 * Tudo absolutamente posicionado e `pointer-events-none` — não interfere no formulário.
 */
export function AnimatedAuthBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    let particles: P[] = [];

    function resize() {
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(28, Math.floor((w * h) / 26000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -0.05 - Math.random() * 0.2,
        r: 0.6 + Math.random() * 1.6,
        a: 0.15 + Math.random() * 0.45,
      }));
    }

    function tick() {
      ctx!.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        // Tonalidade âmbar/dourada combinando com a marca
        ctx!.fillStyle = `rgba(255, 188, 95, ${p.a})`;
        ctx!.fill();
      }
      raf = requestAnimationFrame(tick);
    }

    resize();
    tick();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Base radial */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--background))_0%,hsl(var(--background))_40%,#0a0604_100%)]" />

      {/* Grid sutil */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* Blobs animados */}
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />
      <div className="auth-blob auth-blob-3" />
      <div className="auth-blob auth-blob-4" />

      {/* Canvas de partículas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Viñeta para destacar o card */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}

export default AnimatedAuthBackground;