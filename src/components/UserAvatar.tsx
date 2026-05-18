import { cn } from "@/lib/utils";

interface Props {
  avatarUrl?: string | null;
  name?: string | null;
  fallback?: string;
  className?: string;
}

/**
 * Avatar redondo padrão do app — exibe foto do perfil quando disponível,
 * senão inicial do nome com fundo gradiente mint.
 */
export function UserAvatar({ avatarUrl, name, fallback = "?", className }: Props) {
  const source = (name ?? "").trim() || fallback;
  // Remove título eventual (Dr./Dra.) antes de pegar a inicial.
  const cleaned = source.replace(/^(dr\.?|dra\.?)\s+/i, "").trim() || source;
  const initial = (cleaned.charAt(0) || "?").toUpperCase();
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-mint text-sm font-bold text-night",
        className,
      )}
      aria-label={name ?? undefined}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name ?? "Avatar"}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span>{initial}</span>
      )}
    </span>
  );
}
