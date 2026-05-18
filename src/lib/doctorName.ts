/**
 * Formata o nome do profissional com o título escolhido (Dr./Dra./Sem título).
 * Evita prefixos duplicados e respeita o valor "Sem título".
 */
export function formatDoctorName(
  fullName?: string | null,
  title?: string | null,
  fallback?: string,
): string {
  const name = ((fullName ?? "").trim()) || (fallback ?? "").trim();
  if (!name) return "";
  const t = (title ?? "").trim();
  if (!t || t === "Sem título") return name;
  const lower = name.toLowerCase();
  if (
    lower.startsWith("dr.") ||
    lower.startsWith("dra.") ||
    lower.startsWith("dr ") ||
    lower.startsWith("dra ")
  ) {
    return name;
  }
  return `${t} ${name}`;
}
