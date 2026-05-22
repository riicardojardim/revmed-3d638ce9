import { PlayCircle } from "lucide-react";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  specialty: string;
  topic?: string | null;
  durationSeconds?: number;
  imageUrl?: string | null;
  className?: string;
};

function fmtDuration(s?: number) {
  if (!s || s <= 0) return null;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Capa padronizada das vídeo aulas — mesmo DNA dos decks/resumos. */
export function LessonCover({ title, specialty, topic, durationSeconds, imageUrl, className }: Props) {
  const meta = getSpecialtyMeta(specialty);
  const dur = fmtDuration(durationSeconds);

  if (imageUrl) {
    return (
      <div className={cn("@container relative aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-elegant", className)}>
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <PlayCircle className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/90 drop-shadow-lg" style={{ width: "22cqi", height: "22cqi" }} />
        <div className="relative flex h-full flex-col justify-between p-[6cqi] text-white">
          <div className="flex items-start justify-between gap-2">
            <span className={cn("inline-flex items-center justify-center rounded-md font-bold tracking-wider text-white ring-1 ring-white/30 shadow-sm", meta.solid)}
              style={{ padding: "1.2cqi 2.2cqi", fontSize: "max(8px, 4.2cqi)", lineHeight: 1 }}>
              {meta.code}
            </span>
            {dur && (
              <span className="rounded-md bg-black/55 px-[2cqi] py-[1cqi] font-mono font-semibold tracking-wider ring-1 ring-white/20" style={{ fontSize: "max(8px, 3cqi)" }}>
                {dur}
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
        "bg-[radial-gradient(135%_135%_at_15%_110%,#3a1e08_0%,#241208_35%,#150a04_65%,#0a0503_100%)]",
        className,
      )}
    >
      <div className={cn("pointer-events-none absolute -bottom-1/3 -left-1/3 h-2/3 w-2/3 rounded-full blur-3xl opacity-45", meta.solid)} />
      <div className="pointer-events-none absolute top-[55%] -right-1/4 h-1/2 w-1/2 rounded-full blur-3xl opacity-25 bg-mint" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_100%_0%,rgba(10,5,3,0.6)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "10cqi 10cqi",
        }} />

      <PlayCircle className="pointer-events-none absolute right-[6cqi] top-[6cqi] text-white/15" style={{ width: "26cqi", height: "26cqi" }} />

      <div className="relative flex h-full flex-col" style={{ padding: "6cqi" }}>
        <div className="flex items-start justify-between gap-[2cqi]">
          <span className={cn("inline-flex items-center justify-center rounded-md font-bold tracking-wider text-white ring-1 ring-white/30 shadow-sm", meta.solid)}
            style={{ padding: "1.2cqi 2.2cqi", fontSize: "max(8px, 4.2cqi)", lineHeight: 1 }}>
            {meta.code}
          </span>
          {dur && (
            <span className="rounded-md bg-black/40 px-[2cqi] py-[1cqi] font-mono font-semibold tracking-wider ring-1 ring-white/20" style={{ fontSize: "max(8px, 3cqi)" }}>
              {dur}
            </span>
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
            Vídeo Aulas · REVMED
          </div>
        </div>
      </div>
    </div>
  );
}