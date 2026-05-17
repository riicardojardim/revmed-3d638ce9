// Specialty color tokens — alinhado ao padrão Pense Revalida:
//   CM  Clínica Médica            → azul claro
//   CR  Cirurgia                  → roxo / lilás
//   GO  Ginecologia e Obstetrícia → coral / vermelho
//   PE  Pediatria                 → verde
//   PR  Preventiva                → laranja
//   MF  Medicina da Família       → esmeralda (fora do Pense, mantido)
//   UE  Urgência e Emergência     → vermelho escuro (fora do Pense, mantido)

export type SpecialtyMeta = {
  code: string;
  /** Tailwind classes para o chip/badge pequeno (ex.: "CM") */
  badge: string;
  /** Tailwind classes para card/borda colorida */
  card: string;
  /** Cor sólida principal (Tailwind 500) para barras, dots, etc. */
  solid: string;
  /** Cor de texto puro para títulos coloridos */
  text: string;
};

const META: Record<string, SpecialtyMeta> = {
  "Clínica Médica": {
    code: "CM",
    badge: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30",
    card: "border-sky-500/40 bg-sky-500/5",
    solid: "bg-sky-500",
    text: "text-sky-400",
  },
  "Cirurgia": {
    code: "CR",
    badge: "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30",
    card: "border-teal-500/40 bg-teal-500/5",
    solid: "bg-teal-500",
    text: "text-teal-400",
  },
  "Pediatria": {
    code: "PE",
    badge: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
    card: "border-amber-500/40 bg-amber-500/5",
    solid: "bg-amber-500",
    text: "text-amber-400",
  },
  "Ginecologia e Obstetrícia": {
    code: "GO",
    badge: "bg-pink-500/15 text-pink-300 ring-1 ring-pink-500/30",
    card: "border-pink-500/40 bg-pink-500/5",
    solid: "bg-pink-500",
    text: "text-pink-400",
  },
  "Medicina da Família": {
    code: "MF",
    badge: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
    card: "border-emerald-500/40 bg-emerald-500/5",
    solid: "bg-emerald-500",
    text: "text-emerald-400",
  },
  "Urgência e Emergência": {
    code: "UE",
    badge: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
    card: "border-red-500/40 bg-red-500/5",
    solid: "bg-red-500",
    text: "text-red-400",
  },
  "Saúde Coletiva": {
    code: "SC",
    badge: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30",
    card: "border-violet-500/40 bg-violet-500/5",
    solid: "bg-violet-500",
    text: "text-violet-400",
  },
  "Preventiva": {
    code: "PR",
    badge: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30",
    card: "border-violet-500/40 bg-violet-500/5",
    solid: "bg-violet-500",
    text: "text-violet-400",
  },
};

const FALLBACK: SpecialtyMeta = {
  code: "ES",
  badge: "bg-muted text-muted-foreground ring-1 ring-border",
  card: "border-border bg-muted/30",
  solid: "bg-muted-foreground",
  text: "text-muted-foreground",
};

export function getSpecialtyMeta(specialty?: string | null): SpecialtyMeta {
  if (!specialty) return FALLBACK;
  return (
    META[specialty] ?? {
      ...FALLBACK,
      code: specialty.slice(0, 2).toUpperCase(),
    }
  );
}
