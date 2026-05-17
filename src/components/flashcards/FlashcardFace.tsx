import { cn } from "@/lib/utils";

type Props = {
  side: "front" | "back";
  label?: string;
  counter?: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Face padrão de um flashcard (pergunta ou resposta).
 * Quadrado fluido — escala via container queries.
 *  - front (Pergunta) → azul (primary)
 *  - back  (Resposta) → âmbar
 */
export function FlashcardFace({ side, label, counter, className, children }: Props) {
  const isBack = side === "back";
  const title = label ?? (isBack ? "Resposta" : "Pergunta");

  return (
    <div
      className={cn(
        "@container relative rounded-2xl overflow-hidden ring-1 ring-border aspect-square flex flex-col w-full",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between font-display font-bold text-white shrink-0",
          isBack ? "bg-amber-500" : "bg-primary",
        )}
        style={{
          padding: "2cqi 4cqi",
          fontSize: "max(11px, 3.6cqi)",
        }}
      >
        <span>{title}</span>
        {counter ? <span className="tabular-nums">{counter}</span> : null}
      </div>
      <div
        className={cn(
          "flex-1 flex items-stretch justify-center overflow-hidden min-h-0",
          isBack ? "bg-amber-100 text-amber-900" : "bg-primary/10 text-foreground",
        )}
      >
        {children}
      </div>
    </div>
  );
}
