import { BookOpen } from "lucide-react";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  specialty: string;
  topic?: string | null;
  /** Se informado, usa a imagem real como capa; senão, gera capa estilizada. */
  imageUrl?: string | null;
  highYield?: boolean;
  className?: string;
};

/** Capa padronizada dos Resumos — espelha o estilo dos decks de flashcard. */
export function SummaryCover({ title, specialty, topic, imageUrl, highYield, className }: Props) {
  const meta = getSpecialtyMeta(specialty);

  if (imageUrl) {
    return (
      <div className={cn("@container relative aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-elegant", className)}>
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-[6cqi] text-white">
          <div className="flex items-start justify-between gap-2">
            <span className={cn("inline-flex items-center justify-center rounded-md font-bold tracking-wider text-white ring-1 ring-white/30 shadow-sm", meta.solid)}
              style={{ padding: "1.2cqi 2.2cqi", fontSize: "max(8px, 4.2cqi)", lineHeight: 1 }}>
              {meta.code}
            </span>
            {highYield && (
              <span className="rounded-md bg-amber-400/90 px-[2cqi] py-[1cqi] font-bold text-amber-950 ring-1 ring-amber-200"
                style={{ fontSize: "max(8px, 3.6cqi)", lineHeight: 1 }}>
                Alta incidência
              </span>
            )}
          </div>
          <div>
            <h3 className="font-display font-black leading-[1.05] break-words" style={{ fontSize: "max(11px, 8cqi)" }}>
              {title}
            </h3>
            {topic && (
              <div className="mt-[1.5cqi] uppercase tracking-[0.18em] text-white/80" style={{ fontSize: "max(8px, 2.8cqi)" }}>
                {topic}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "@container relative aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-white/10 text-white shadow-elegant",
        "bg-[radial-gradient(135%_135%_at_15%_110%,#15406a_0%,#0c2c4d_35%,#071a32_65%,#040c1a_100%)]",
        className,
      )}
    >
      <div className={cn("pointer-events-none absolute -bottom-1/3 -left-1/3 h-2/3 w-2/3 rounded-full blur-3xl opacity-45", meta.solid)} />
      <div className="pointer-events-none absolute top-[55%] -right-1/4 h-1/2 w-1/2 rounded-full blur-3xl opacity-18 bg-mint" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_100%_0%,rgba(4,12,26,0.55)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "10cqi 10cqi",
        }} />

      <div className="relative flex h-full flex-col" style={{ padding: "6cqi" }}>
        <div className="flex items-start justify-between gap-[2cqi]">
          <span className={cn("inline-flex items-center justify-center rounded-md font-bold tracking-wider text-white ring-1 ring-white/30 shadow-sm", meta.solid)}
            style={{ padding: "1.2cqi 2.2cqi", fontSize: "max(8px, 4.2cqi)", lineHeight: 1 }}>
            {meta.code}
          </span>
          {highYield ? (
            <span className="rounded-md bg-amber-400/90 px-[2cqi] py-[1cqi] font-bold text-amber-950 ring-1 ring-amber-200"
              style={{ fontSize: "max(8px, 3.4cqi)", lineHeight: 1 }}>
              Alta incidência
            </span>
          ) : (
            <BookOpen className="opacity-80" style={{ width: "12cqi", height: "12cqi" }} />
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center min-h-0">
          <h3 className="font-display font-black leading-[1.05] text-white break-words"
            style={{ fontSize: "max(11px, 9cqi)" }}>
            {title}
          </h3>
          <div className="mt-[2cqi] hidden @[140px]:block rounded-full bg-mint" style={{ height: "1.2cqi", width: "14cqi" }} />
        </div>

        <div className="hidden @[120px]:block space-y-[1cqi]">
          <div className="font-semibold uppercase tracking-[0.18em] text-white/90" style={{ fontSize: "max(9px, 3.6cqi)" }}>
            {specialty}
          </div>
          <div className="hidden @[200px]:block uppercase tracking-[0.22em] text-white/50" style={{ fontSize: "max(8px, 2.6cqi)" }}>
            Resumos · Estação Revalida
          </div>
        </div>
      </div>
    </div>
  );
}
