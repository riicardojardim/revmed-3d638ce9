import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { cn } from "@/lib/utils";
import logoStackedUrl from "@/assets/logo-estacao-revalida-stacked.png";

type Props = {
  title: string;
  specialty: string;
  topic?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Capa padrão dos decks de Flashcard.
 * Layout fixo — admin só edita os textos. Fundo azul gradiente da marca
 * + logo Estação Revalida.
 */
export function DeckCover({ title, specialty, topic, size = "lg", className }: Props) {
  const meta = getSpecialtyMeta(specialty);
  const isSm = size === "sm";

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-white/10 text-white",
        "bg-[radial-gradient(120%_120%_at_0%_0%,#1e6fb8_0%,#0f4c81_38%,#0a2a4a_72%,#07111f_100%)]",
        "shadow-elegant",
        className,
      )}
    >
      {/* Glow accent na cor da especialidade */}
      <div className={cn("absolute -top-1/3 -right-1/3 h-2/3 w-2/3 rounded-full blur-3xl opacity-50", meta.solid)} />
      <div className="absolute -bottom-1/4 -left-1/4 h-1/2 w-1/2 rounded-full blur-3xl opacity-30 bg-mint" />

      {/* Grid sutil */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className={cn("relative flex h-full flex-col", isSm ? "p-2" : "p-5")}>
        {/* Top: badge especialidade + logo */}
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-md font-bold tracking-wider bg-white/15 ring-1 ring-white/25 text-white backdrop-blur-sm",
              isSm ? "px-1 py-0.5 text-[8px]" : "px-2 py-1 text-xs",
            )}
          >
            {meta.code}
          </span>
          <img
            src={logoStackedUrl}
            alt=""
            draggable={false}
            className={cn(
              "select-none object-contain opacity-95 drop-shadow",
              isSm ? "h-5" : size === "md" ? "h-10" : "h-14",
            )}
          />
        </div>

        {/* Centro: título grande */}
        <div className="flex flex-1 flex-col justify-center">
          <h3
            className={cn(
              "font-display font-black leading-[1.05] text-white",
              isSm ? "text-[11px]" : size === "md" ? "text-xl" : "text-3xl md:text-4xl",
            )}
          >
            {title}
          </h3>
          {!isSm && (
            <div className={cn("mt-2 h-1 rounded-full bg-mint", size === "md" ? "w-10" : "w-14")} />
          )}
        </div>

        {/* Rodapé: especialidade · tópico */}
        {!isSm && (
          <div className="space-y-1">
            <div className="text-xs md:text-sm font-semibold uppercase tracking-[0.18em] text-white/90">
              {specialty}
              {topic ? <span className="font-normal text-white/60"> · {topic}</span> : null}
            </div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">
              Flashcards · Estação Revalida
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
