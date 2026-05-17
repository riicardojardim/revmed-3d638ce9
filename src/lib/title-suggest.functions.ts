import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  currentTitle: z.string().max(300).optional().default(""),
  specialty: z.string().max(100).optional().default(""),
  clinical_case: z.string().max(20_000).optional().default(""),
  case_description: z.string().max(20_000).optional().default(""),
  candidate_task: z.string().max(20_000).optional().default(""),
  patient_script: z.string().max(20_000).optional().default(""),
  pep_items: z
    .array(z.string().max(500))
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
- Mantenha EXATAMENTE as siglas/acrônimos que o usuário já digitou no início do título (antes do hífen ou no texto). Não invente novas siglas, não traduza, não expanda elas.
- Se o usuário digitou "JAHSID", o título DEVE começar com "JAHSID - ...".
- Se houver várias siglas separadas por espaço/hífen, preserve a ordem.
- Após o hífen ( - ), gere uma descrição CURTA (3 a 8 palavras) baseada no conteúdo da estação (caso clínico, tarefa, ator). Use o diagnóstico/tema principal e a ação chave (ex.: "manejo inicial", "diagnóstico", "conduta", "comunicação de notícia difícil").
- Use Title Case em português (Primeira Letra Maiúscula nas palavras principais).
- NÃO invente dados clínicos. Use só o que está no conteúdo.
- Se NÃO houver siglas no título atual, gere apenas o texto descritivo (sem hífen no início).
- Retorne 1 título principal + até 3 alternativas curtas.

Retorne SOMENTE JSON: {"title": "...", "alternatives": ["...", "..."]}`;

export const suggestStationTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor");

    const userPayload = {
      instruction:
        "Sugira um título no formato 'SIGLAS - Descrição curta' preservando as siglas que o usuário já digitou. Retorne SOMENTE JSON.",
      currentTitle: data.currentTitle,
      specialty: data.specialty,
      clinical_case: data.clinical_case.slice(0, 4000),
      case_description: data.case_description.slice(0, 4000),
      candidate_task: data.candidate_task.slice(0, 2000),
      patient_script: data.patient_script.slice(0, 4000),
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
