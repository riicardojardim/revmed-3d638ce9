import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface Props {
  avatarUrl?: string | null;
  name?: string | null;
  fallback?: string;
  size?: AvatarSize;
  className?: string;
}

/**
 * Avatar padrão do app — sempre redondo (rounded-full).
 * Exibe a foto do perfil quando disponível, senão a inicial do nome
 * com fundo gradiente mint. Tamanhos padronizados via prop `size`.
 */
const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-14 w-14 text-lg",
};

export function UserAvatar({ avatarUrl, name, fallback = "?", size = "md", className }: Props) {
  const source = (name ?? "").trim() || fallback;
  // Remove título eventual (Dr./Dra.) antes de pegar a inicial.
  const cleaned = source.replace(/^(dr\.?|dra\.?)\s+/i, "").trim() || source;
  const initial = (cleaned.charAt(0) || "?").toUpperCase();
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-mint font-bold text-night ring-1 ring-mint/30",
        SIZE_CLASSES[size],
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
