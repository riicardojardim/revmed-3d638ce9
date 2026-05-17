import { Layers } from "lucide-react";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  specialty: string;
  topic?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Capa padrão dos decks de Flashcard.
 * O layout é fixo — o admin só edita os textos (título / área / tópico).
 */
export function DeckCover({ title, specialty, topic, size = "lg", className }: Props) {
  const meta = getSpecialtyMeta(specialty);
  const dims =
    size === "sm" ? "text-[10px]" : size === "md" ? "text-xs" : "text-sm";

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-border",
        "bg-gradient-to-br from-card via-card to-background",
        className,
      )}
    >
      {/* Glow de fundo na cor da especialidade */}
      <div className={cn("absolute -top-1/3 -right-1/3 h-2/3 w-2/3 rounded-full blur-3xl opacity-40", meta.solid)} />
      <div className={cn("absolute -bottom-1/3 -left-1/3 h-2/3 w-2/3 rounded-full blur-3xl opacity-25", meta.solid)} />

      {/* Grid sutil */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-md px-2 py-1 font-bold tracking-wider",
              meta.badge,
              dims,
            )}
          >
            {meta.code}
          </span>
          <Layers className={cn("h-5 w-5", meta.text)} />
        </div>

        <div className="space-y-2">
          <div className={cn("uppercase tracking-[0.18em] font-semibold", meta.text, dims)}>
            {specialty}
            {topic ? <span className="text-muted-foreground"> · {topic}</span> : null}
          </div>
          <h3
            className={cn(
              "font-display font-black leading-[1.05] text-foreground",
              size === "sm" ? "text-base" : size === "md" ? "text-xl" : "text-2xl md:text-3xl",
            )}
          >
            {title}
          </h3>
          <div className={cn("h-1 w-12 rounded-full", meta.solid)} />
          <div className="pt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Flashcards · Estação Revalida
          </div>
        </div>
      </div>
    </div>
  );
}
