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
 * Mesmo formato quadrado da capa, com header colorido.
 *  - front (Pergunta) → azul (primary)
 *  - back  (Resposta) → âmbar
 */
export function FlashcardFace({ side, label, counter, className, children }: Props) {
  const isBack = side === "back";
  const title = label ?? (isBack ? "Resposta" : "Pergunta");

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden ring-1 ring-border aspect-square flex flex-col w-full",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2 font-display font-bold text-white shrink-0",
          isBack ? "bg-amber-500" : "bg-primary",
        )}
      >
        <span>{title}</span>
        {counter ? <span>{counter}</span> : null}
      </div>
      <div
        className={cn(
          "flex-1 flex items-stretch justify-center overflow-hidden",
          isBack ? "bg-amber-100 text-amber-900" : "bg-primary/10 text-foreground",
        )}
      >
        {children}
      </div>
    </div>
  );
}
