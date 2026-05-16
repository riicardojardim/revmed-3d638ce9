// Predefined specialty badge metadata (only place colors live for the actor/candidate UI).
// Anywhere else the UI should stay in just 2 colors: neutral + mint.

export type SpecialtyMeta = {
  code: string;
  // Tailwind classes for the small uppercase badge (e.g. "PE")
  badge: string;
};

const META: Record<string, SpecialtyMeta> = {
  "Clínica Médica":            { code: "CM", badge: "bg-sky-500/15 text-sky-300" },
  "Cirurgia":                  { code: "CR", badge: "bg-purple-500/15 text-purple-300" },
  "Pediatria":                 { code: "PE", badge: "bg-emerald-500/15 text-emerald-300" },
  "Ginecologia e Obstetrícia": { code: "GO", badge: "bg-pink-500/15 text-pink-300" },
  "Medicina da Família":       { code: "MF", badge: "bg-orange-500/15 text-orange-300" },
  "Saúde Coletiva":            { code: "PR", badge: "bg-amber-500/15 text-amber-300" },
  "Preventiva":                { code: "PR", badge: "bg-amber-500/15 text-amber-300" },
  "Urgência e Emergência":     { code: "UE", badge: "bg-rose-500/15 text-rose-300" },
};

export function getSpecialtyMeta(specialty?: string | null): SpecialtyMeta {
  if (!specialty) return { code: "ES", badge: "bg-muted text-muted-foreground" };
  return META[specialty] ?? {
    code: specialty.slice(0, 2).toUpperCase(),
    badge: "bg-muted text-muted-foreground",
  };
}
