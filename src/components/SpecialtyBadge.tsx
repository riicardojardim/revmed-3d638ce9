import { Badge } from "@/components/ui/badge";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { cn } from "@/lib/utils";

interface SpecialtyBadgeProps {
  specialty?: string | null;
  /** Mostrar só o código curto (CM, CR, PE…) em vez do nome completo */
  short?: boolean;
  className?: string;
}

/** Badge colorido padronizado por especialidade. Use em todas as listas/cards. */
export function SpecialtyBadge({ specialty, short, className }: SpecialtyBadgeProps) {
  const meta = getSpecialtyMeta(specialty);
  const label = short ? meta.code : specialty ?? "—";
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-semibold", meta.badge, className)}
    >
      {label}
    </Badge>
  );
}
