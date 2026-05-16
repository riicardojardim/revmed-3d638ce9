import { Link } from "@tanstack/react-router";
import logoUrl from "@/assets/logo-estacao-revalida.png";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  // variant kept for API compatibility; the logo is full-color and works on both backgrounds.
  void variant;
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Estação Revalida — início">
      <img
        src={logoUrl}
        alt="Estação Revalida"
        className="h-10 w-auto select-none md:h-11"
        draggable={false}
      />
    </Link>
  );
}
