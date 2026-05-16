import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const color = variant === "light" ? "text-white" : "text-foreground";
  return (
    <Link to="/" className={`flex items-center gap-2 font-display font-bold ${color}`}>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-mint shadow-glow">
        <Activity className="h-5 w-5 text-night" strokeWidth={2.5} />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-base tracking-tight">Estação Revalida</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Prova prática · Treino real
        </span>
      </span>
    </Link>
  );
}
