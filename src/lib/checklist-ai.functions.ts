import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FileSchema = z.object({
  name: z.string().min(1).max(255),
  // data URI: data:<mime>;base64,XXXX  (pdf or image/*)
  dataUrl: z.string().min(20).max(20_000_000),
});

const InputSchema = z.object({
  text: z.string().max(50_000).optional(),
  files: z.array(FileSchema).max(8).optional(),
}).refine((d) => (d.text && d.text.trim().length > 0) || (d.files && d.files.length > 0), {
  message: "Envie texto, PDF ou imagem",
});

const LevelSchema = z.object({
  label: z.string(),
  points: z.number(),
  description: z.string().optional(),
});

const ItemSchema = z.object({
  description: z.string(),
  category: z.string().optional(),
  points: z.number().optional(),
  helper_text: z.string().optional(),
  levels: z.array(LevelSchema).optional(),
});

const ResultSchema = z.object({
  checklist_items: z.array(ItemSchema).default([]),
});

const SYSTEM_PROMPT = `Você EXTRAI um Checklist PEP de estação clínica (estilo OSCE/Revalida) a partir de TEXTO, PDF ou IMAGEM. Retorne SOMENTE JSON válido (sem markdown).

REGRA DE OURO — NÃO INVENTE NADA:
- Use APENAS o conteúdo presente na fonte. Não adicione itens, níveis, regras, exemplos ou pontuações que não estejam ali.
- NÃO gere "helper_text". Esse campo não deve existir na resposta.
- Se a fonte não trouxer níveis (Inadequado/Parcial/Adequado) para um item, retorne "levels": [] — não invente níveis.
- Se a fonte não trouxer pontuação, use 0.
- Preserve a pontuação EXATAMENTE como vem na fonte: ponto-e-vírgula (;), ponto final (.), dois-pontos (:), parênteses, quebras de linha (\\n). NÃO troque ";" por "," nem remova ".".

REGRAS:
- "category": curta, SEM número, identificada AUTOMATICAMENTE a partir do conteúdo do item (não use sempre a mesma). Exemplos comuns: "Apresentação", "Anamnese", "Exame físico", "Hipótese diagnóstica", "Diagnóstico diferencial", "Conduta", "Comunicação", "Procedimento", "Prescrição", "Orientações finais". Use a que melhor descreve o item — pode ser outra se a fonte indicar.
- "description": COPIE o texto do item da fonte, começando com o número e ponto ("1. ...", "2. ..."). Preserve sub-itens, ; e . exatamente como na fonte (ex.: "(1) X;\\n(2) Y;\\n(3) Z.").
- "points": valor MÁXIMO do item, igual à fonte (0.25, 0.5, 0.75, 1.0, 1.5, 2.0…).
- "levels": SÓ inclua se a fonte explicitamente listar níveis, no formato "Inadequado: <regra da fonte>", "Parcialmente adequado: <regra>", "Adequado: <regra>" com os "points" exatos da fonte.
- Combine múltiplas fontes sem duplicar itens.

Schema:
{
  "checklist_items": [{
    "description": string, "category": string, "points": number,
    "levels": [{ "label": string, "points": number, "description": string }]
  }]
}`;

type UserContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

async function callGateway(
  apiKey: string,
  userParts: UserContent[],
  model: string,
  timeoutMs: number,
): Promise<z.infer<typeof ResultSchema>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userParts },
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
  if (json.choices?.[0]?.finish_reason === "length") {
    throw new Error("A resposta da IA foi cortada (limite de tokens).");
  }
  const content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : {};
  }
  return ResultSchema.parse(parsed);
}

export const parseChecklistBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor");

    const parts: UserContent[] = [];
    parts.push({
      type: "text",
      text:
        "Organize um Checklist PEP a partir das fontes abaixo (texto colado, PDFs e/ou imagens). " +
        "Retorne SOMENTE o JSON conforme o schema, com itens numerados, categorias variadas e níveis com regra explícita após os dois pontos.",
    });
    if (data.text && data.text.trim()) {
      parts.push({ type: "text", text: `FONTE (texto colado):\n${data.text.trim()}` });
    }
    for (const f of data.files ?? []) {
      parts.push({ type: "text", text: `Arquivo: ${f.name}` });
      parts.push({ type: "image_url", image_url: { url: f.dataUrl } });
    }

    try {
      return await callGateway(apiKey, parts, "google/gemini-2.5-flash", 90_000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTimeout = /abort|timeout|504|502|upstream/i.test(msg);
      if (!isTimeout) throw err;
      return await callGateway(apiKey, parts, "google/gemini-2.5-pro", 150_000);
    }
  });
