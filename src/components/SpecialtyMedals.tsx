import { Medal, Lock } from "lucide-react";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";

// Nota de corte oficial do INEP — Revalida prática.
// Histórico recente: a nota mínima vem se mantendo em 6,0 (60% dos pontos).
// Fonte: edital INEP Revalida 2024/2025.
export const NOTA_DE_CORTE = 6.0;
export const MIN_STATIONS_PER_SPECIALTY = 5;

// Ordem e rótulos canônicos para as medalhas
export const MEDAL_SPECIALTIES: { key: string; label: string; short: string }[] = [
  { key: "Clínica Médica", label: "Clínica Médica", short: "CM" },
  { key: "Cirurgia", label: "Cirurgia", short: "CR" },
  { key: "Pediatria", label: "Pediatria", short: "PE" },
  { key: "Ginecologia e Obstetrícia", label: "Ginecologia e Obstetrícia", short: "GO" },
  { key: "Medicina de Família e Comunidade", label: "MFC / Preventiva", short: "MFC" },
];

export type SpecStats = Map<string, { sum: number; n: number }>;

export function getSpecAvg(stats: SpecStats, key: string): { avg: number; n: number } {
  // MFC engloba também "Preventiva" / "Medicina Preventiva" / "Saúde Coletiva"
  const keys =
    key === "Medicina de Família e Comunidade"
      ? [key, "Preventiva", "Medicina Preventiva", "Saúde Coletiva"]
      : [key];
  let sum = 0;
  let n = 0;
  keys.forEach((k) => {
    const d = stats.get(k);
    if (d) {
      sum += d.sum;
      n += d.n;
    }
  });
  return { avg: n ? sum / n : 0, n };
}

export function SpecialtyMedals({ stats }: { stats: SpecStats }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display font-bold">Medalhas por especialidade</h3>
        <span className="text-xs text-muted-foreground">
          Conquiste ≥ {MIN_STATIONS_PER_SPECIALTY} estações com média ≥{" "}
          <span className="font-semibold text-foreground">{NOTA_DE_CORTE.toFixed(1)}</span>{" "}
          (nota de corte INEP)
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {MEDAL_SPECIALTIES.map((s) => {
          const meta = getSpecialtyMeta(s.key);
          const { avg, n } = getSpecAvg(stats, s.key);
          const unlocked = n >= MIN_STATIONS_PER_SPECIALTY && avg >= NOTA_DE_CORTE;
          return (
            <div
              key={s.key}
              className={
                "rounded-2xl border p-4 text-center transition " +
                (unlocked
                  ? `${meta.card} shadow-card`
                  : "border-dashed border-border bg-muted/20 opacity-70")
              }
            >
              <div
                className={
                  "mx-auto flex h-14 w-14 items-center justify-center rounded-full " +
                  (unlocked ? `${meta.solid} text-white shadow-elegant` : "bg-muted text-muted-foreground")
                }
              >
                {unlocked ? <Medal className="h-7 w-7" /> : <Lock className="h-5 w-5" />}
              </div>
              <div className={"mt-2 text-xs font-bold tracking-wider " + (unlocked ? meta.text : "text-muted-foreground")}>
                {s.short}
              </div>
              <div className="text-[11px] leading-tight text-muted-foreground">{s.label}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {n}/{MIN_STATIONS_PER_SPECIALTY} est. · média {avg.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
