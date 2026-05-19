// Specialty color tokens — alinhado ao padrão Pense Revalida:
//   CM  Clínica Médica            → azul claro
//   CR  Cirurgia                  → roxo / lilás
//   GO  Ginecologia e Obstetrícia → coral / vermelho
//   PE  Pediatria                 → verde
//   PR  Preventiva                → laranja
//   MFC Medicina de Família e Comunidade → esmeralda


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
    badge: "bg-blue-500/20 text-blue-800 dark:text-blue-200 ring-1 ring-blue-600/50",
    card: "border-blue-500/40 bg-blue-500/5",
    solid: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-300",
  },
  "Cirurgia": {
    code: "CR",
    badge: "bg-violet-500/20 text-violet-800 dark:text-violet-200 ring-1 ring-violet-600/50",
    card: "border-violet-500/40 bg-violet-500/5",
    solid: "bg-violet-500",
    text: "text-violet-700 dark:text-violet-300",
  },
  "Pediatria": {
    code: "PE",
    badge: "bg-amber-500/25 text-amber-900 dark:text-amber-200 ring-1 ring-amber-600/50",
    card: "border-amber-500/40 bg-amber-500/5",
    solid: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
  },
  "Ginecologia e Obstetrícia": {
    code: "GO",
    badge: "bg-pink-500/20 text-pink-800 dark:text-pink-200 ring-1 ring-pink-600/50",
    card: "border-pink-500/40 bg-pink-500/5",
    solid: "bg-pink-500",
    text: "text-pink-700 dark:text-pink-300",
  },
  "Medicina de Família e Comunidade": {
    code: "MFC",
    badge: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-600/50",
    card: "border-emerald-500/40 bg-emerald-500/5",
    solid: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  "Saúde Coletiva": {
    code: "SC",
    badge: "bg-orange-500/20 text-orange-800 dark:text-orange-200 ring-1 ring-orange-600/50",
    card: "border-orange-500/40 bg-orange-500/5",
    solid: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-300",
  },
  "Preventiva": {
    code: "PR",
    badge: "bg-orange-500/20 text-orange-800 dark:text-orange-200 ring-1 ring-orange-600/50",
    card: "border-orange-500/40 bg-orange-500/5",
    solid: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-300",
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
