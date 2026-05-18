// Specialty color tokens — alinhado ao padrão Pense Revalida:
//   CM  Clínica Médica            → azul claro
//   CR  Cirurgia                  → roxo / lilás
//   GO  Ginecologia e Obstetrícia → coral / vermelho
//   PE  Pediatria                 → verde
//   PR  Preventiva                → laranja
//   MFC Medicina de Família e Comunidade → esmeralda
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
    badge: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30",
    card: "border-violet-500/40 bg-violet-500/5",
    solid: "bg-violet-500",
    text: "text-violet-400",
  },
  "Pediatria": {
    code: "PE",
    badge: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
    card: "border-emerald-500/40 bg-emerald-500/5",
    solid: "bg-emerald-500",
    text: "text-emerald-400",
  },
  "Ginecologia e Obstetrícia": {
    code: "GO",
    badge: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
    card: "border-rose-500/40 bg-rose-500/5",
    solid: "bg-rose-500",
    text: "text-rose-400",
  },
  "Medicina de Família e Comunidade": {
    code: "MFC",
    badge: "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30",
    card: "border-teal-500/40 bg-teal-500/5",
    solid: "bg-teal-500",
    text: "text-teal-400",
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
    badge: "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30",
    card: "border-orange-500/40 bg-orange-500/5",
    solid: "bg-orange-500",
    text: "text-orange-400",
  },
  "Preventiva": {
    code: "PR",
    badge: "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30",
    card: "border-orange-500/40 bg-orange-500/5",
    solid: "bg-orange-500",
    text: "text-orange-400",
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
 *   3. Ginecologia e Obstetrícia
 *   4. Pediatria
 *   5. Medicina de Família e Comunidade / Preventiva
 * Extras (fora da prova oficial) ficam no final.
 */
export const SPECIALTY_ORDER: string[] = [
  "Clínica Médica",
  "Cirurgia",
  "Ginecologia e Obstetrícia",
  "Pediatria",
  "Medicina de Família e Comunidade",
  "Preventiva",
  "Saúde Coletiva",
  "Urgência e Emergência",
];

/** Lista padrão das 5 especialidades oficiais do Revalida, na ordem certa. */
export const REVALIDA_SPECIALTIES: string[] = [
  "Clínica Médica",
  "Cirurgia",
  "Ginecologia e Obstetrícia",
  "Pediatria",
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
