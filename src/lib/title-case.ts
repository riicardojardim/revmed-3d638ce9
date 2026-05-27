const LOWERCASE_WORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "na", "no", "nas", "nos",
  "a", "o", "as", "os", "com", "para", "por", "ou",
]);

// Detecta siglas: tokens com 2+ caracteres todos em maiúsculas (permitindo dígitos
// e símbolos como "+"), ex.: "LGBTQIAPN+", "IOT", "HIV", "DPOC", "AVC", "TDAH".
function isAcronym(token: string): boolean {
  if (token.length < 2) return false;
  const letters = token.match(/\p{L}/gu);
  if (!letters || letters.length < 2) return false;
  return letters.every((c) => c === c.toLocaleUpperCase("pt-BR") && c !== c.toLocaleLowerCase("pt-BR"));
}

export function toTitleCase(input: string): string {
  if (!input) return "";
  return input
    .split(/(\s+|[-–—/])/)
    .map((tok, i) => {
      if (/^\s+$/.test(tok) || /^[-–—/]$/.test(tok)) return tok;
      if (isAcronym(tok)) return tok;
      const lower = tok.toLocaleLowerCase("pt-BR");
      if (i > 0 && LOWERCASE_WORDS.has(lower)) return lower;
      return lower.replace(/(^|[(\[{"'])(\p{L})/u, (_, p, c) => p + c.toLocaleUpperCase("pt-BR"));
    })
    .join("");
}