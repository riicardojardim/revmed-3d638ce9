import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import logoUrl from "@/assets/logo-revmed-horizontal.png";
import logoIconUrl from "@/assets/logo-revmed.png";

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
  const { user } = useAuth();
  const target = user ? "/app" : "/";
  return (
    <Link
      to={target}
      className="inline-flex items-center justify-center"
      aria-label="REVMED — início"
    >
      <img
        src={isStacked ? logoIconUrl : logoUrl}
        alt="REVMED"
        draggable={false}
        className={
          className ??
          (isStacked
            ? "h-28 w-auto select-none md:h-32"
            : "h-10 w-auto select-none md:h-11")
        }
      />
    </Link>
  );
}
