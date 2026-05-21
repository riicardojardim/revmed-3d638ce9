import { useEffect, useState } from "react";
import logoStackedUrl from "@/assets/logo-estacao-revalida-stacked.png";

export function SplashScreen({
  onDone,
  duration = 1600,
}: {
  onDone?: () => void;
  duration?: number;
}) {
  const [leaving, setLeaving] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), duration);
    const t2 = setTimeout(() => {
      setHidden(true);
      onDone?.();
    }, duration + 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [duration, onDone]);

  if (hidden) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-mint/10 transition-opacity duration-500 ${
        leaving ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-mint/20 blur-3xl animate-pulse" />
        <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-medical/15 blur-2xl" />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        <div
          className="animate-in fade-in zoom-in-95 duration-700"
          style={{ animationFillMode: "both" }}
        >
          <img
            src={logoStackedUrl}
            alt="REVMED"
            className="h-32 w-auto select-none drop-shadow-[0_8px_30px_rgba(0,200,150,0.35)] md:h-40"
            draggable={false}
          />
        </div>

        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-700"
          style={{ animationDelay: "200ms", animationFillMode: "both" }}
        >
          <p className="text-center text-xs font-semibold uppercase tracking-[0.35em] text-mint">
            Entrando na estação
          </p>
        </div>

        {/* Loader bar */}
        <div className="relative mt-2 h-1 w-44 overflow-hidden rounded-full bg-muted">
          <div className="splash-bar absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-mint via-mint to-medical" />
        </div>
      </div>

      <style>{`
        @keyframes splash-bar {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(380%); }
        }
        .splash-bar { animation: splash-bar 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
