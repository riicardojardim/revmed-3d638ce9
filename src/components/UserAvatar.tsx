import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface Props {
  avatarUrl?: string | null;
  name?: string | null;
  fallback?: string;
  size?: AvatarSize;
  className?: string;
  /** Quando definido, mostra uma bolinha de status sobreposta ao avatar. */
  online?: boolean;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-14 w-14 text-lg",
};

const DOT_CLASSES: Record<AvatarSize, string> = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-3.5 w-3.5",
};

export function UserAvatar({ avatarUrl, name, fallback = "?", size = "md", className, online }: Props) {
  const source = (name ?? "").trim() || fallback;
  const cleaned = source.replace(/^(dr\.?|dra\.?)\s+/i, "").trim() || source;
  const initial = (cleaned.charAt(0) || "?").toUpperCase();

  const avatar = (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-mint font-bold text-night ring-1 ring-mint/30",
        SIZE_CLASSES[size],
        online === undefined ? className : undefined,
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

  if (online === undefined) return avatar;

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {avatar}
      <span
        className={cn(
          "absolute bottom-0 right-0 rounded-full ring-2 ring-card",
          DOT_CLASSES[size],
          online ? "bg-emerald-500" : "bg-muted-foreground/50",
        )}
        title={online ? "Online" : "Offline"}
        aria-hidden
      />
    </span>
  );
}
