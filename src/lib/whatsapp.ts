// Brazilian WhatsApp helpers — store digits only, display masked.

/** Keep digits only, drop optional leading country code 55, cap at 11 digits. */
export function normalizeWhatsapp(input: string): string {
  let d = (input || "").replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  return d.slice(0, 11);
}

/** Format as (XX) XXXXX-XXXX while typing. Accepts partial input. */
export function formatWhatsapp(input: string): string {
  const d = normalizeWhatsapp(input);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

/** Valid Brazilian mobile: 11 digits, DDD 11-99, 9th digit = 9. */
export function isValidWhatsapp(input: string): boolean {
  const d = normalizeWhatsapp(input);
  if (d.length !== 11) return false;
  const ddd = parseInt(d.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (d[2] !== "9") return false;
  return true;
}
