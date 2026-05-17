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

REGRA DE OURO — FIDELIDADE LITERAL ABSOLUTA:
- Tudo o que você devolver (category, description, levels.label, levels.description, points) precisa estar EXATAMENTE como aparece na fonte — palavra por palavra, pontuação por pontuação.
- NÃO parafraseie, NÃO resuma, NÃO reescreva, NÃO corrija gramática/typos, NÃO traduza, NÃO troque sinônimos ("seis" ≠ "6", "criança" ≠ "paciente").
- NÃO invente itens, níveis, regras, exemplos, categorias ou pontuações que não estejam ali.
- NÃO gere "helper_text". Esse campo não deve existir na resposta.
- Se a fonte não trouxer níveis (Inadequado/Parcial/Adequado) para um item, retorne "levels": [] — não invente níveis.
- Se a fonte não trouxer pontuação, use 0.
- Preserve pontuação EXATAMENTE como vem na fonte: ponto-e-vírgula (;), ponto final (.), dois-pontos (:), parênteses, quebras de linha (\\n). NÃO troque ";" por "," nem remova ".".

REGRAS:
- "category": COPIE LITERALMENTE o título numerado do item da fonte, removendo SOMENTE o número inicial e o ":" final. Ex.: "1. Apresentação:" → category = "Apresentação"; "2. Investiga os sintomas atuais da criança:" → category = "Investiga os sintomas atuais da criança". NUNCA substitua por sinônimo (NÃO troque por "Comunicação"/"Anamnese"), NUNCA reescreva.
- "description": NÃO inclua a linha numerada/título da categoria. NÃO inclua linhas dos níveis ("Inadequado:", "Parcialmente adequado:", "Adequado:") — essas vão SOMENTE em "levels". Se o item só tem título + níveis (sem sub-itens), retorne "description": "". Quando houver sub-itens, copie-os PALAVRA POR PALAVRA (ex.: "(1) Identifica-se;\\n(2) Cumprimenta o paciente simulado."), preservando ; . : e quebras de linha.
- "points": valor MÁXIMO do item, IDÊNTICO ao da fonte (0.25, 0.5, 0.75, 1.0, 1.5, 2.0…).
- "levels": SÓ inclua se a fonte explicitamente listar níveis. Copie cada nível LITERALMENTE — mesmo rótulo da fonte ("Inadequado", "Parcialmente adequado", "Adequado" ou outros) e mesma regra após os dois pontos, sem reescrever ("Adequado: Pergunta seis ou sete itens." permanece assim; NÃO vire "Pergunta 6 ou 7 itens"). Use o MESMO número de níveis que a fonte (2 ou 3) e os MESMOS "points" da fonte.
- Combine múltiplas fontes sem duplicar itens.

Schema:
{
  "checklist_items": [{
    "description": string, "category": string, "points": number,
    "levels": [{ "label": string, "points": number, "description": string }]
  }]
}`;

function cleanCategoryTitle(value: string): string {
  return value.replace(/^\s*\d+\s*[.)\-–—]\s*/, "").replace(/\s*:\s*$/, "").trim();
}

function parsePointsLine(line: string): number[] {
  const matches = line.match(/\d+(?:[,.]\d+)?/g) ?? [];
  if (!matches.length) return [];
  const onlyNumbers = line.replace(/\d+(?:[,.]\d+)?/g, "").trim();
  if (onlyNumbers) return [];
  return matches.map((value) => Number(value.replace(",", "."))).filter((value) => Number.isFinite(value));
}

function parseChecklistTextLiterally(text: string): z.infer<typeof ResultSchema>["checklist_items"] {
  const sourceLines = text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ""))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: Array<{ header: string; lines: string[] }> = [];
  let current: { header: string; lines: string[] } | null = null;

  for (const line of sourceLines) {
    const start = line.match(/^\s*\d+\s*[.)]\s+(.+)$/);
    if (start) {
      if (current) blocks.push(current);
      current = { header: start[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);

  return blocks.flatMap((block) => {
    const lines = [...block.lines];
    let header = block.header;
    while (!header.includes(":") && lines.length) {
      const next = lines[0];
      if (/^\(\d+\)\s*/.test(next) || /^(inadequado|parcialmente\s+adequado|adequado)\s*:/i.test(next) || parsePointsLine(next).length) break;
      header += ` ${lines.shift()}`;
    }

    const colonIndex = header.indexOf(":");
    const category = cleanCategoryTitle(colonIndex >= 0 ? header.slice(0, colonIndex) : header);
    const inlineDescription = colonIndex >= 0 ? header.slice(colonIndex + 1).trim() : "";
    if (inlineDescription) lines.unshift(inlineDescription);

    const descriptionLines: string[] = [];
    const levels: z.infer<typeof LevelSchema>[] = [];
    let activeLevel: z.infer<typeof LevelSchema> | null = null;
    let activeLevelLines: string[] = [];
    let scoreValues: number[] = [];

    const flushLevel = () => {
      if (!activeLevel) return;
      levels.push({ ...activeLevel, description: activeLevelLines.join("\n").trim() });
      activeLevel = null;
      activeLevelLines = [];
    };

    for (const line of lines) {
      const parsedPoints = parsePointsLine(line);
      if (parsedPoints.length >= 2) {
        flushLevel();
        scoreValues = parsedPoints;
        continue;
      }
      const levelMatch = line.match(/^\s*(Inadequado|Parcialmente\s+adequado|Adequado)\s*:\s*(.*)$/i);
      if (levelMatch) {
        flushLevel();
        activeLevel = { label: levelMatch[1], points: 0, description: "" };
        if (levelMatch[2]?.trim()) activeLevelLines.push(levelMatch[2].trim());
        continue;
      }
      if (activeLevel) activeLevelLines.push(line);
      else descriptionLines.push(line);
    }
    flushLevel();

    const sortedScores = [...scoreValues].sort((a, b) => a - b);
    const maxPoints = sortedScores.at(-1) ?? 0;
    const withPoints = levels.map((level) => {
      const label = level.label.toLowerCase();
      const points = label.includes("inadequado")
        ? sortedScores[0] ?? 0
        : label.includes("parcial")
          ? sortedScores[Math.floor(sortedScores.length / 2)] ?? maxPoints
          : label.includes("adequado")
            ? maxPoints
            : level.points;
      return { ...level, points };
    });

    return category
      ? [{ category, description: descriptionLines.join("\n").trim(), points: maxPoints, levels: withPoints }]
      : [];
  });
}

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
        "Retorne SOMENTE o JSON conforme o schema: category deve ser o título literal sem número, e description deve conter só os sub-itens/ações, sem a linha numerada da categoria.",
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
