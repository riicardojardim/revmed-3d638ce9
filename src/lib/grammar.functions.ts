import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FieldSchema = z.object({
  id: z.string().min(1).max(200),
  label: z.string().min(1).max(200),
  text: z.string().max(20_000),
});

const InputSchema = z.object({
  fields: z.array(FieldSchema).min(1).max(120),
});

const IssueSchema = z.object({
  field_id: z.string(),
  type: z.enum(["ortografia", "gramatica", "pontuacao", "concordancia", "estilo", "outro"]),
  excerpt: z.string(),
  explanation: z.string(),
  suggestion: z.string().optional(),
});

const FieldResultSchema = z.object({
  field_id: z.string(),
  corrected_text: z.string(),
  issues: z.array(IssueSchema).default([]),
});

const ResultSchema = z.object({
  fields: z.array(FieldResultSchema).default([]),
});

export type GrammarFieldResult = z.infer<typeof FieldResultSchema>;
export type GrammarIssue = z.infer<typeof IssueSchema>;

const SYSTEM_PROMPT = `Você é um REVISOR ORTOGRÁFICO E GRAMATICAL em PORTUGUÊS DO BRASIL para textos de estações clínicas (medicina).

REGRAS:
- Para cada campo recebido, retorne:
  - "corrected_text": o texto reescrito com ortografia, acentuação, pontuação (ponto final, vírgula, dois-pontos, ponto-e-vírgula), concordância e crase corretos. PRESERVE o sentido, o vocabulário técnico médico, listas, quebras de linha, números e formatação original (parênteses, dois-pontos de subitens, etc.). NÃO reescreva o estilo, apenas corrija.
  - "issues": lista dos problemas encontrados. Cada issue tem: "type" (ortografia | gramatica | pontuacao | concordancia | estilo | outro), "excerpt" (trecho original com problema, curto), "explanation" (o que está errado e por quê, 1 frase), "suggestion" (correção sugerida, curta).
- Se o campo já estiver correto, retorne "issues": [] e "corrected_text" igual ao original.
- NÃO invente conteúdo médico. NÃO altere termos técnicos corretos.
- NÃO marque como erro: abreviações médicas válidas (HAS, DM2, IAM, PA, FC), siglas, nomes próprios, unidades (mg, mL, mmHg).
- Retorne SOMENTE JSON válido conforme o schema, sem markdown.

Schema:
{
  "fields": [{
    "field_id": string,
    "corrected_text": string,
    "issues": [{ "field_id": string, "type": string, "excerpt": string, "explanation": string, "suggestion": string }]
  }]
}`;

export const reviewGrammar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor");

    // Filter empty fields server-side too
    const fields = data.fields.filter((f) => f.text.trim().length > 0);
    if (fields.length === 0) return { fields: [] };

    const userPayload = {
      instruction:
        "Revise ortográfica e gramaticalmente cada campo abaixo (português do Brasil). Retorne SOMENTE o JSON conforme o schema.",
      fields,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
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
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    };
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
