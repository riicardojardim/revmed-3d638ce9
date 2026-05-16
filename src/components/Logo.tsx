import { Link } from "@tanstack/react-router";
import logoUrl from "@/assets/logo-estacao-revalida.png";
import logoStackedUrl from "@/assets/logo-estacao-revalida-stacked.png";

export function Logo({
  variant = "dark",
  layout = "horizontal",
  className,
}: {
  variant?: "dark" | "light";
  layout?: "horizontal" | "stacked";
  className?: string;
}) {
  void variant;
  const isStacked = layout === "stacked";
  return (
    <Link
      to="/"
      className="inline-flex items-center justify-center"
      aria-label="Estação Revalida — início"
    >
      <img
        src={isStacked ? logoStackedUrl : logoUrl}
        alt="Estação Revalida"
        className={
          className ??
          (isStacked
            ? "h-28 w-auto select-none md:h-32"
            : "h-10 w-auto select-none md:h-11")
        }
        draggable={false}
      />
    </Link>
  );
}
