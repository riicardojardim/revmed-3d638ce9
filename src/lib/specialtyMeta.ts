// Specialty color tokens — identidade REVMED (paleta terrosa quente
// deliberadamente distinta do padrão azul/roxo/verde do Estação Revalida):
//   CM  Clínica Médica            → âmbar bronze
//   CR  Cirurgia                  → aço cirúrgico (slate)
//   PE  Pediatria                 → laranja coral
//   GO  Ginecologia e Obstetrícia → fúcsia/mulberry
//   MFC Medicina de Família e Comunidade → oliva


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

// Badges legíveis em fundo escuro/claro: usa tom 500 sólido + texto branco.
const META: Record<string, SpecialtyMeta> = {
  "Clínica Médica": {
    code: "CM",
    badge: "bg-amber-600 text-white ring-1 ring-amber-300/60 shadow-sm shadow-amber-900/30",
    card: "border-amber-600/40 bg-amber-600/5",
    solid: "bg-amber-600",
    text: "text-amber-700 dark:text-amber-300",
  },
  "Cirurgia": {
    code: "CR",
    badge: "bg-slate-500 text-white ring-1 ring-slate-300/60 shadow-sm shadow-slate-900/30",
    card: "border-slate-500/40 bg-slate-500/5",
    solid: "bg-slate-500",
    text: "text-slate-700 dark:text-slate-300",
  },
  "Pediatria": {
    code: "PE",
    badge: "bg-orange-500 text-white ring-1 ring-orange-300/60 shadow-sm shadow-orange-900/30",
    card: "border-orange-500/40 bg-orange-500/5",
    solid: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-300",
  },
  "Ginecologia e Obstetrícia": {
    code: "GO",
    badge: "bg-fuchsia-700 text-white ring-1 ring-fuchsia-400/60 shadow-sm shadow-fuchsia-900/30",
    card: "border-fuchsia-700/40 bg-fuchsia-700/5",
    solid: "bg-fuchsia-700",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
  },
  "Medicina de Família e Comunidade": {
    code: "MFC",
    badge: "bg-lime-600 text-white ring-1 ring-lime-300/60 shadow-sm shadow-lime-900/30",
    card: "border-lime-600/40 bg-lime-600/5",
    solid: "bg-lime-600",
    text: "text-lime-700 dark:text-lime-300",
  },
  "Saúde Coletiva": {
    code: "SC",
    badge: "bg-lime-600 text-white ring-1 ring-lime-300/60 shadow-sm shadow-lime-900/30",
    card: "border-lime-600/40 bg-lime-600/5",
    solid: "bg-lime-600",
    text: "text-lime-700 dark:text-lime-300",
  },
  "Preventiva": {
    code: "PR",
    badge: "bg-lime-600 text-white ring-1 ring-lime-300/60 shadow-sm shadow-lime-900/30",
    card: "border-lime-600/40 bg-lime-600/5",
    solid: "bg-lime-600",
    text: "text-lime-700 dark:text-lime-300",
  },
  "Direito Médico": {
    code: "DM",
    badge: "bg-indigo-600 text-white ring-1 ring-indigo-300/60 shadow-sm shadow-indigo-900/30",
    card: "border-indigo-600/40 bg-indigo-600/5",
    solid: "bg-indigo-600",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  "Geral": {
    code: "GR",
    badge: "bg-teal-600 text-white ring-1 ring-teal-300/60 shadow-sm shadow-teal-900/30",
    card: "border-teal-600/40 bg-teal-600/5",
    solid: "bg-teal-600",
    text: "text-teal-700 dark:text-teal-300",
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

/**
 * Ordem canônica oficial das especialidades do Revalida (INEP).
 * Use SEMPRE essa ordem em listas, filtros, dashboards, etc.
 *   1. Clínica Médica
 *   2. Cirurgia
 *   3. Pediatria
 *   4. Ginecologia e Obstetrícia
 *   5. Medicina de Família e Comunidade / Preventiva
 * Extras (fora da prova oficial) ficam no final.
 */
export const SPECIALTY_ORDER: string[] = [
  "Clínica Médica",
  "Cirurgia",
  "Pediatria",
  "Ginecologia e Obstetrícia",
  "Medicina de Família e Comunidade",
  "Preventiva",
  "Saúde Coletiva",
];

/** Lista padrão das 5 especialidades oficiais do Revalida, na ordem certa. */
export const REVALIDA_SPECIALTIES: string[] = [
  "Clínica Médica",
  "Cirurgia",
  "Pediatria",
  "Ginecologia e Obstetrícia",
  "Medicina de Família e Comunidade",
];

/** Índice (rank) de uma especialidade segundo a ordem oficial. Desconhecidas vão pro fim. */
export function specialtyRank(specialty?: string | null): number {
  if (!specialty) return Number.MAX_SAFE_INTEGER;
  const i = SPECIALTY_ORDER.indexOf(specialty);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

/** Ordena uma lista de strings de especialidade na ordem canônica. */
export function sortSpecialties<T extends string>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => specialtyRank(a) - specialtyRank(b));
}

/** Ordena objetos por uma chave de especialidade. */
export function sortBySpecialty<T>(list: readonly T[], getSpec: (item: T) => string | null | undefined): T[] {
  return [...list].sort((a, b) => specialtyRank(getSpec(a)) - specialtyRank(getSpec(b)));
}
