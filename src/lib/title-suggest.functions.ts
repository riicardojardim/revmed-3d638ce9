import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const truncateString = (max: number) =>
  z.preprocess(
    (value) => {
      if (value == null) return "";
      const str = typeof value === "string" ? value : String(value);
      return str.slice(0, max);
    },
    z.string(),
  );

const InputSchema = z.object({
  currentTitle: z.string().max(300).optional().default(""),
  specialty: z.string().max(100).optional().default(""),
  clinical_case: z.string().max(20_000).optional().default(""),
  case_description: z.string().max(20_000).optional().default(""),
  candidate_task: z.string().max(20_000).optional().default(""),
  patient_script: z.string().max(20_000).optional().default(""),
  pep_items: z
    .array(truncateString(500))
    .max(60)
    .optional()
    .default([]),
});

const ResultSchema = z.object({
  title: z.string().min(3).max(160),
  alternatives: z.array(z.string().min(3).max(160)).max(4).default([]),
});

const SYSTEM_PROMPT = `Você sugere TÍTULOS para estações clínicas no padrão INEP/Revalida. Português do Brasil.

PADRÃO INEP — siga FIELMENTE estes exemplos reais:
- "DPOC EXACERBADA - Manejo na Emergência"
- "IAM COM SUPRA - Diagnóstico e Conduta Inicial"
- "PRÉ-ECLÂMPSIA GRAVE - Abordagem na Gestação"
- "ACIDENTE POR ARANHA - Atendimento na Emergência"
- "TUBERCULOSE PULMONAR - Diagnóstico e Notificação"
- "COMUNICAÇÃO DE MÁS NOTÍCIAS - Óbito Materno"
- "INFECÇÃO URINÁRIA NA GESTAÇÃO - Diagnóstico e Conduta"

FORMATO OBRIGATÓRIO: "PARTE EM CAIXA ALTA - Frase descritiva em Title Case"
- ANTES do hífen: o DIAGNÓSTICO/TEMA central em CAIXA ALTA (ex.: "DPOC EXACERBADA", "IAM COM SUPRA", "SEPSE", "ECLÂMPSIA", "ACIDENTE POR ARANHA"). Pode ser sigla médica consagrada (DPOC, IAM, AVC, HDA, TEP, ITU, HAS, DM2) OU o nome da doença/condição por extenso, sempre em MAIÚSCULAS.
- DEPOIS do hífen: a AÇÃO PRINCIPAL que o candidato precisa executar, em Title Case (ex.: "Manejo na Emergência", "Diagnóstico e Conduta Inicial", "Abordagem Ambulatorial", "Atendimento ao Politrauma", "Comunicação de Más Notícias").

REGRAS:
- PRIORIDADE MÁXIMA: a parte antes do hífen DEVE ser o DIAGNÓSTICO/CONDIÇÃO CLÍNICA específica identificada a partir de clinical_case + case_description + patient_script + candidate_task + pep_items (ex.: "ANEMIA FERROPRIVA", "DPOC EXACERBADA", "HIPOTIREOIDISMO PRIMÁRIO"). NUNCA use o nome de uma ESPECIALIDADE/ÁREA como diagnóstico.
- LISTA NEGRA — NUNCA use estes termos antes do hífen, são especialidades/áreas, não diagnósticos: "CLÍNICA MÉDICA", "CIRURGIA", "CIRURGIA GERAL", "PEDIATRIA", "GINECOLOGIA", "OBSTETRÍCIA", "GINECOLOGIA E OBSTETRÍCIA", "MEDICINA DE FAMÍLIA", "MEDICINA DE FAMÍLIA E COMUNIDADE", "PREVENTIVA", "SAÚDE COLETIVA", "PSIQUIATRIA", "EMERGÊNCIA", "URGÊNCIA", "AMBULATÓRIO".
- Ignore o currentTitle se ele for genérico (uma especialidade da lista negra, "Nova estação", vazio, ou apenas a especialidade repetida). Nesses casos, IDENTIFIQUE o diagnóstico real do conteúdo.
- Só PRESERVE o início do currentTitle quando ele já contiver uma SIGLA MÉDICA CONSAGRADA DE DIAGNÓSTICO (DPOC, IAM, AVC, HDA, TEP, ITU, HAS, DM2, ICC, IRA, IRC, AVE, HSA, TVP, HPB, DRGE, DHEG etc.). Nomes de especialidade NÃO são siglas a preservar.
- BASE PRIMÁRIA do DIAGNÓSTICO: clinical_case + case_description + patient_script (sintomas, achados, exames). BASE PRIMÁRIA da AÇÃO: candidate_task + pep_items.
- A frase depois do hífen deve ter 2 a 6 palavras em Title Case português.
- NUNCA invente diagnóstico. Se realmente não houver pistas, use a queixa principal específica em CAIXA ALTA (ex.: "DOR ABDOMINAL AGUDA - Investigação Inicial"), nunca a especialidade.
- Retorne 1 título principal + até 3 alternativas (variando a ação OU alternando entre sigla e nome por extenso do mesmo diagnóstico).


Retorne SOMENTE JSON: {"title": "...", "alternatives": ["...", "..."]}`;

export const suggestStationTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor");

    const GENERIC_TITLES = new Set([
      "clinica medica", "cirurgia", "cirurgia geral", "pediatria",
      "ginecologia", "obstetricia", "ginecologia e obstetricia",
      "medicina de familia", "medicina de familia e comunidade",
      "preventiva", "saude coletiva", "psiquiatria",
      "emergencia", "urgencia", "ambulatorio", "nova estacao", "",
    ]);
    const norm = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const ct = data.currentTitle.trim();
    const ctNorm = norm(ct);
    const isGeneric =
      GENERIC_TITLES.has(ctNorm) || ctNorm === norm(data.specialty);
    const effectiveCurrentTitle = isGeneric ? "" : ct;

    const userPayload = {
      instruction:
        "Identifique o DIAGNÓSTICO específico a partir de clinical_case/case_description/patient_script e a AÇÃO a partir de candidate_task/pep_items. NUNCA use o nome da especialidade como diagnóstico. Retorne SOMENTE JSON.",
      currentTitle: effectiveCurrentTitle,
      specialty: data.specialty,
      candidate_task: data.candidate_task.slice(0, 3000),
      pep_items: data.pep_items.slice(0, 60),
      clinical_case: data.clinical_case.slice(0, 2500),
      case_description: data.case_description.slice(0, 2500),
      patient_script: data.patient_script.slice(0, 2500),
    };


    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify(userPayload) },
          ],
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) throw new Error("Limite de uso da IA atingido. Aguarde alguns instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados.");
      throw new Error(`AI Gateway ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
    return ResultSchema.parse(parsed);
  });
