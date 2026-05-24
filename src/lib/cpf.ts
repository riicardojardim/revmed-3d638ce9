// Brazilian CPF helpers — store digits only, display masked.
// Centralized to guarantee identical normalization/validation across
// signup, profile and admin screens.

/** Keep digits only, cap at 11. */
export function normalizeCPF(input: string): string {
  return (input || "").replace(/\D/g, "").slice(0, 11);
}

/** Format as 000.000.000-00 while typing. Accepts partial input. */
export function formatCPF(input: string): string {
  const d = normalizeCPF(input);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** Validate CPF using the standard mod-11 check-digit algorithm. */
export function isValidCPF(input: string): boolean {
  const d = normalizeCPF(input);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i], 10) * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9], 10)) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i], 10) * (11 - i);
  r = (s * 10) % 11;
  if (r === 10) r = 0;
  return r === parseInt(d[10], 10);
}