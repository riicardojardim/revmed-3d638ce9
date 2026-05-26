const LOWERCASE_WORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "na", "no", "nas", "nos",
  "a", "o", "as", "os", "com", "para", "por", "ou",
]);

export function toTitleCase(input: string): string {
  if (!input) return "";
  return input
    .toLocaleLowerCase("pt-BR")
    .split(/(\s+|[-–—/])/)
    .map((tok, i) => {
      if (/^\s+$/.test(tok) || /^[-–—/]$/.test(tok)) return tok;
      if (i > 0 && LOWERCASE_WORDS.has(tok)) return tok;
      return tok.replace(/(^|[(\[{"'])(\p{L})/u, (_, p, c) => p + c.toLocaleUpperCase("pt-BR"));
    })
    .join("");
}