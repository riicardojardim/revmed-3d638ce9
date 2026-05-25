import { useSiteSettings } from "@/hooks/use-site-settings";

// Defaults oficiais — Revalida 2025/2, INEP (escala 0–100)
export const DEFAULT_NOTA_DE_CORTE = 62.174;
export const DEFAULT_EXAM_EDITION = "Revalida 2025/2";

/**
 * Configurações da prova (editáveis no painel admin → "Geral").
 * Retorna a nota de corte INEP nas escalas 0–100 e 0–10, e a edição vigente.
 */
export function useExamSettings() {
  const { settings } = useSiteSettings();
  const notaDeCorte =
    settings?.nota_de_corte != null && Number.isFinite(Number(settings.nota_de_corte))
      ? Number(settings.nota_de_corte)
      : DEFAULT_NOTA_DE_CORTE;
  const edicao = settings?.exam_edition?.trim() || DEFAULT_EXAM_EDITION;
  return {
    notaDeCorte,
    notaDeCorteEscala10: notaDeCorte / 10,
    edicao,
  };
}