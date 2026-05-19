import { Trophy, Lock } from "lucide-react";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";

// Nota de corte oficial do INEP — Revalida, prova de habilidades clínicas (2ª etapa).
// Última divulgada: edição 2025/2 = 62,174 pontos (escala 0–100).
// Fonte: DOU, Edital INEP nº 31, de 31/03/2026 (publicado em 01/04/2026, Seção 3, p. 85).
// https://www.in.gov.br/web/dou/-/edital-n-31-de-31-de-marco-de-2026-697022309
export const NOTA_DE_CORTE = 62.174; // escala 0–100
export const NOTA_DE_CORTE_EDICAO = "Revalida 2025/2";
export const MIN_STATIONS_PER_SPECIALTY = 5;

// Notas internas das tentativas são salvas na escala 0–10 — convertemos a nota de corte:
export const NOTA_DE_CORTE_ESCALA10 = NOTA_DE_CORTE / 10;

// Ordem e rótulos canônicos para as medalhas
export const MEDAL_SPECIALTIES: { key: string; label: string; short: string }[] = [
  { key: "Clínica Médica", label: "Clínica Médica", short: "CM" },
  { key: "Cirurgia", label: "Cirurgia", short: "CR" },
  { key: "Pediatria", label: "Pediatria", short: "PE" },
  { key: "Ginecologia e Obstetrícia", label: "Ginecologia e Obstetrícia", short: "GO" },
  { key: "Medicina de Família e Comunidade", label: "Medicina de Família e Comunidade", short: "MFC" },
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
      <h3 className="font-display font-bold">Troféus por especialidade</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {MEDAL_SPECIALTIES.map((s) => {
          const meta = getSpecialtyMeta(s.key);
          const { avg, n } = getSpecAvg(stats, s.key);
          const unlocked = n >= MIN_STATIONS_PER_SPECIALTY && avg >= NOTA_DE_CORTE_ESCALA10;
          return (
            <div
              key={s.key}
              className={
                "rounded-xl border p-2 text-center transition " +
                (unlocked
                  ? `${meta.card} shadow-card`
                  : "border-dashed border-border bg-muted/20 opacity-70")
              }
            >
              <div
                className={
                  "mx-auto flex h-8 w-8 items-center justify-center rounded-full " +
                  (unlocked ? `${meta.solid} text-white shadow-elegant` : "bg-muted text-muted-foreground")
                }
              >
                {unlocked ? <Trophy className="h-4 w-4" /> : <Lock className="h-3 w-3" />}
              </div>
              <div className={"mt-1 text-[10px] font-bold tracking-wider " + (unlocked ? meta.text : "text-muted-foreground")}>
                {s.short}
              </div>
              <div className="text-[9px] leading-tight text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
