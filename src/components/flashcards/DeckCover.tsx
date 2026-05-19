import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { cn } from "@/lib/utils";
import logoStackedUrl from "@/assets/logo-estacao-revalida-stacked.png";

type Props = {
  title: string;
  specialty: string;
  topic?: string | null;
  /** Mantido por compatibilidade — o layout é fluido via container query. */
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Capa padrão dos decks de Flashcard.
 * Layout fixo e 100% fluido: tudo escala com o tamanho do container
 * (container queries + unidades cqi). Funciona perfeito em qualquer
 * tamanho — do thumbnail (64px) até a tela cheia.
 */
export function DeckCover({ title, specialty, topic, className }: Props) {
  const meta = getSpecialtyMeta(specialty);

  return (
    <div
      className={cn(
        "@container relative aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-white/10 text-white",
        // Gradiente azul-noite mais profundo — contraste alto com o logo mint/branco
        "bg-[radial-gradient(135%_135%_at_15%_110%,#15406a_0%,#0c2c4d_35%,#071a32_65%,#040c1a_100%)]",
        "shadow-elegant",
        className,
      )}
    >
      {/* Glows decorativos — posicionados longe do logo (canto superior direito) */}
      <div className={cn("pointer-events-none absolute -bottom-1/3 -left-1/3 h-2/3 w-2/3 rounded-full blur-3xl opacity-45", meta.solid)} />
      <div className="pointer-events-none absolute top-[55%] -right-1/4 h-1/2 w-1/2 rounded-full blur-3xl opacity-18 bg-mint" />
      {/* Vinheta escura no canto do logo para garantir contraste em qualquer especialidade */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_100%_0%,rgba(4,12,26,0.55)_0%,transparent_70%)]" />

      {/* Grid sutil — densidade proporcional ao container */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "10cqi 10cqi",
        }}
      />

      <div
        className="relative flex h-full flex-col"
        style={{ padding: "6cqi" }}
      >
        {/* Top: badge especialidade + logo */}
        <div className="flex items-start justify-between gap-[2cqi]">
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-md font-bold tracking-wider text-white ring-1 ring-white/30 shadow-sm",
              meta.solid,
            )}
            style={{
              padding: "1.2cqi 2.2cqi",
              fontSize: "max(8px, 4.2cqi)",
              lineHeight: 1,
            }}
          >
            {meta.code}
          </span>
          <img
            src={logoStackedUrl}
            alt=""
            draggable={false}
            className="select-none object-contain opacity-95 drop-shadow"
            style={{ height: "18cqi", maxHeight: "72px" }}
          />
        </div>

        {/* Centro: título grande */}
        <div className="flex flex-1 flex-col justify-center min-h-0">
          <h3
            className="font-display font-black leading-[1.05] text-white break-words"
            style={{ fontSize: "max(11px, 9cqi)" }}
          >
            {title}
          </h3>
          {/* Divider mint — fica oculto em containers muito pequenos */}
          <div
            className="mt-[2cqi] hidden @[140px]:block rounded-full bg-mint"
            style={{ height: "1.2cqi", width: "14cqi" }}
          />
        </div>

        {/* Rodapé: especialidade · tópico (oculto em containers minúsculos) */}
        <div className="hidden @[120px]:block space-y-[1cqi]">
          <div
            className="font-semibold uppercase tracking-[0.18em] text-white/90"
            style={{ fontSize: "max(9px, 3.6cqi)" }}
          >
            {specialty}
          </div>
          <div
            className="hidden @[200px]:block uppercase tracking-[0.22em] text-white/50"
            style={{ fontSize: "max(8px, 2.6cqi)" }}
          >
            Flashcards · Estação Revalida
          </div>
        </div>
      </div>
    </div>
  );
}
