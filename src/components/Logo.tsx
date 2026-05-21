import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

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
      <span
        className={
          className ??
          (isStacked
            ? "font-display font-black tracking-tight text-4xl md:text-5xl"
            : "font-display font-black tracking-tight text-xl md:text-2xl")
        }
        style={{
          backgroundImage:
            "linear-gradient(135deg, #f5c542 0%, #e85d1c 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          letterSpacing: "0.02em",
        }}
      >
        REVMED
      </span>
    </Link>
  );
}
