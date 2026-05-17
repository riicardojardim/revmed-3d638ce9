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

const SYSTEM_PROMPT = `Você sugere TÍTULOS para estações clínicas (medicina, Revalida/INEP). Português do Brasil.

FORMATO OBRIGATÓRIO:
"SIGLAS - Texto descritivo curto"

REGRAS:
- Mantenha EXATAMENTE as siglas/acrônimos que o usuário já digitou no início do título. Não invente novas siglas, não traduza, não expanda.
- Se o usuário digitou "JAHSID", o título DEVE começar com "JAHSID - ...".
- BASE PRIMÁRIA para a descrição: a TAREFA DO CANDIDATO ("candidate_task") e os ITENS DO PEP ("pep_items"). Eles mostram o que de fato será avaliado.
- BASE SECUNDÁRIA: caso clínico e roteiro do ator (apenas para identificar o diagnóstico/contexto).
- A descrição deve refletir a AÇÃO PRINCIPAL que o candidato precisa executar (ex.: "manejo inicial", "diagnóstico e conduta", "comunicação de más notícias", "intubação orotraqueal", "punção lombar", "atendimento ao politrauma") + o DIAGNÓSTICO/TEMA quando claro (ex.: "DPOC exacerbada", "IAM com supra", "sepse").
- Formato da descrição: 3 a 8 palavras, Title Case em português. Ex.: "Manejo da DPOC Exacerbada", "Diagnóstico e Conduta no IAM".
- NÃO invente dados clínicos. Use só o que está no conteúdo fornecido.
- Se NÃO houver siglas no título atual, gere apenas o texto descritivo (sem hífen no início).
- Retorne 1 título principal + até 3 alternativas curtas (variando a ação chave).

Retorne SOMENTE JSON: {"title": "...", "alternatives": ["...", "..."]}`;

export const suggestStationTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor");

    const userPayload = {
      instruction:
        "Sugira um título no formato 'SIGLAS - Descrição curta' preservando siglas. Baseie a descrição PRINCIPALMENTE em candidate_task + pep_items. Retorne SOMENTE JSON.",
      currentTitle: data.currentTitle,
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
