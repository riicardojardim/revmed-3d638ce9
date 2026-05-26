import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAiUsage } from "./ai-usage.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado: apenas administradores.");
}

// ─────────── Schemas de saída da IA ───────────
// str() aceita string, null ou undefined e sempre devolve string ("" como fallback).
// A IA frequentemente devolve null em campos opcionais — não podemos rejeitar isso.
const str = (fallback = "") =>
  z.preprocess((v) => (v == null ? fallback : typeof v === "string" ? v : String(v)), z.string());
const nstr = () =>
  z.preprocess((v) => (v == null || v === "" ? null : typeof v === "string" ? v : String(v)), z.string().nullable());
const num = (fallback = 0) =>
  z.preprocess((v) => (v == null || v === "" ? fallback : typeof v === "number" ? v : Number(v) || fallback), z.number());

const LevelSchema = z.object({
  label: str(""),
  points: num(0),
  description: str(""),
});

const ChecklistItemSchema = z.object({
  description: str(""),
  category: str(""),
  points: num(1),
  levels: z.array(LevelSchema).default([]),
});

const StationSchema = z.object({
  title: str("Estação sem título"),
  specialty: str("Clínica Médica"),
  difficulty: z.preprocess(
    (v) => (v === "Fácil" || v === "Intermediário" || v === "Avançado" ? v : "Intermediário"),
    z.enum(["Fácil", "Intermediário", "Avançado"]),
  ),
  duration_minutes: z.preprocess(
    (v) => {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) return 10;
      return Math.max(3, Math.min(30, Math.round(n)));
    },
    z.number().int().min(3).max(30),
  ),
  clinical_case: str(""),
  candidate_task: str(""),
  patient_info: nstr(),
  support_materials: nstr(),
  patient_script: nstr(),
  evaluator_notes: nstr(),
  scoring_criteria: nstr(),
  post_materials: nstr(),
  competencies: z.preprocess(
    (v) => (Array.isArray(v) ? v.filter((x) => x != null).map((x) => String(x)) : []),
    z.array(z.string()),
  ),
  checklist_items: z.array(ChecklistItemSchema).default([]),
});

const StationsResultSchema = z.object({
  stations: z.array(StationSchema).default([]),
});

export type ImportedStation = z.infer<typeof StationSchema>;

// ─────────── Prompt fortemente anti-alucinação ───────────
const SYSTEM_PROMPT = `Você EXTRAI estações clínicas (estilo OSCE/Revalida) de um TEXTO bruto vindo de um PDF. O PDF pode conter VÁRIAS estações no mesmo documento, em qualquer ordem ou formato. Retorne SOMENTE JSON válido conforme o schema.

REGRA DE OURO — FIDELIDADE LITERAL ABSOLUTA:
- Todo texto que você devolver (title, clinical_case, candidate_task, patient_info, support_materials, patient_script, evaluator_notes, scoring_criteria, post_materials, checklist_items[*].description/category, levels[*].label/description) precisa estar EXATAMENTE como aparece no texto fonte — palavra por palavra, pontuação por pontuação, números por extenso/algarismo como vierem.
- NUNCA parafraseie, NUNCA resuma, NUNCA reescreva, NUNCA corrija gramática/typos, NUNCA traduza, NUNCA troque sinônimos.
- NUNCA invente conteúdo. Se um campo não existir na fonte, use null (campos opcionais) ou string vazia.
- Preserve quebras de linha, pontuação e símbolos exatamente como aparecem.

SEGMENTAÇÃO:
- Identifique CADA estação clínica distinta dentro do texto. Pode haver 1, 2, 5, 10+ estações por documento.
- Marcadores comuns (use como pistas, mas não dependa de um padrão fixo): "Estação X", "Caso clínico X", "Tarefa do candidato", "Instruções ao candidato", "PEP", "Padrão Esperado de Procedimento", "Checklist", numeração, cabeçalhos repetidos.
- Se o texto contém UMA única estação, retorne array com 1 elemento. Se contém múltiplas, retorne uma por estação.

CAMPOS:
- title: título/nome da estação literal (ex.: "Dor torácica na emergência"). Se não houver título explícito, gere um curto a partir do tema principal copiando palavras da fonte.
- specialty: uma de "Clínica Médica", "Cirurgia", "Pediatria", "Ginecologia e Obstetrícia", "Medicina de Família e Comunidade". Inferir SOMENTE da especialidade declarada ou tema; nunca inventar.
- difficulty: "Fácil" | "Intermediário" | "Avançado". Use "Intermediário" se não estiver explícito.
- duration_minutes: número entre 3 e 30. Use 10 se não houver indicação.
- clinical_case: a apresentação do caso (cenário, queixa, contexto). Texto LITERAL da fonte.
- candidate_task: a(s) tarefa(s)/instrução(ões) ao candidato. Texto LITERAL.
- patient_info, support_materials, patient_script, evaluator_notes, scoring_criteria, post_materials: copie LITERALMENTE quando existirem; null quando não houver.
- competencies: lista curta de competências/temas declarados na fonte (ex.: ["Anamnese", "Comunicação"]). [] se não houver.

CHECKLIST (checklist_items):
- Cada item do PEP/checklist vira um ChecklistItem.
- category: COPIE LITERALMENTE o título do item, removendo SOMENTE o número inicial e o ":" final. Ex.: "1. Apresentação:" → "Apresentação".
- description: sub-itens/ações sob a categoria, LITERAIS, sem incluir os níveis. "" se for só título + níveis.
- points: valor MÁXIMO do item (idêntico à fonte). 0 se ausente.
- levels: SÓ inclua se a fonte explicitamente listar níveis (Inadequado/Parcialmente adequado/Adequado ou similares). Copie label e description LITERALMENTE.

Schema esperado:
{
  "stations": [{
    "title": string, "specialty": string, "difficulty": "Fácil"|"Intermediário"|"Avançado",
    "duration_minutes": number,
    "clinical_case": string, "candidate_task": string,
    "patient_info": string|null, "support_materials": string|null,
    "patient_script": string|null, "evaluator_notes": string|null,
    "scoring_criteria": string|null, "post_materials": string|null,
    "competencies": string[],
    "checklist_items": [{
      "description": string, "category": string, "points": number,
      "levels": [{ "label": string, "points": number, "description": string }]
    }]
  }]
}`;

async function signPagePaths(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data, error } = await supabaseAdmin.storage
    .from("pdf-pages")
    .createSignedUrls(paths, 60 * 60);
  if (error) throw new Error(`Falha ao gerar URLs assinadas: ${error.message}`);
  const urls = (data ?? []).map((d) => d.signedUrl).filter((u): u is string => Boolean(u));
  if (urls.length !== paths.length) {
    throw new Error("Algumas páginas não puderam ser assinadas no Storage.");
  }
  return urls;
}

async function deletePagePaths(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    await supabaseAdmin.storage.from("pdf-pages").remove(paths);
  } catch (e) {
    console.error("[pdf-import] cleanup failed", e);
  }
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userText: string,
  imageUrls: string[],
  options: { jsonMode: boolean; timeoutMs: number; userId: string; kind: "station" | "transcript" },
): Promise<{ content: string; usage: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  const start = Date.now();
  let res: Response;
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          ...imageUrls.map((url) => ({ type: "image_url", image_url: { url } })),
        ],
      },
    ],
  };
  if (options.jsonMode) body.response_format = { type: "json_object" };
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const txt = await res.text();
    await logAiUsage({
      kind: options.kind,
      model,
      userId: options.userId,
      status: "error",
      errorMessage: `HTTP ${res.status}: ${txt.slice(0, 200)}`,
      durationMs: Date.now() - start,
    });
    if (res.status === 429) throw new Error("Limite de uso da IA atingido. Aguarde alguns instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`AI Gateway ${res.status}: ${txt.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };
  await logAiUsage({
    kind: options.kind,
    model,
    userId: options.userId,
    usage: json.usage ?? null,
    durationMs: Date.now() - start,
  });
  if (json.choices?.[0]?.finish_reason === "length") {
    throw new Error("Resposta da IA foi truncada (PDF muito grande).");
  }
  return { content: json.choices?.[0]?.message?.content ?? "", usage: json.usage ?? null };
}

function parseJsonResponse(content: string): unknown {
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  if (!cleaned) return {};

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[\[{]/);
    if (start === -1) {
      throw new Error("A IA não retornou JSON válido.");
    }

    let depth = 0;
    let inString = false;
    let escaped = false;
    const opener = cleaned[start];
    const closer = opener === "[" ? "]" : "}";

    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];

      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === opener) depth++;
      else if (ch === closer) depth--;

      if (depth === 0) {
        const candidate = cleaned.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          break;
        }
      }
    }

    throw new Error("A resposta da IA veio com JSON incompleto ou texto extra inválido.");
  }
}

async function extractStationsViaVision(
  apiKey: string,
  imageUrls: string[],
  userId: string,
): Promise<z.infer<typeof StationsResultSchema>> {
  const userText =
    "Você está vendo TODAS as páginas escaneadas de um PDF de checklists clínicos, em ordem. Aplique a REGRA DE OURO e o schema. Retorne SOMENTE JSON.";

  async function requestAndParse(model: string, timeoutMs: number) {
    const { content } = await callGemini(apiKey, model, SYSTEM_PROMPT, userText, imageUrls, {
      jsonMode: true,
      timeoutMs,
      userId,
      kind: "station",
    });
    return parseJsonResponse(content || "{}");
  }

  let parsed: unknown;
  try {
    parsed = await requestAndParse("google/gemini-2.5-pro", 300_000);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/abort|timeout|504|502|truncad|incompleto|inválido|nao retornou json|não retornou json/i.test(msg)) throw err;
    parsed = await requestAndParse("google/gemini-2.5-flash", 240_000);
  }
  // Gemini às vezes retorna direto o array de estações em vez de { stations: [...] }
  if (Array.isArray(parsed)) parsed = { stations: parsed };
  else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj.stations)) {
      // tenta achar a primeira chave que seja array de objetos
      const arrKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
      if (arrKey) parsed = { stations: obj[arrKey] };
    }
  }
  return StationsResultSchema.parse(parsed);
}

const TRANSCRIBE_PROMPT = `Você TRANSCREVE LITERALMENTE o texto de páginas escaneadas de um PDF. Regras inegociáveis:
- Copie o texto EXATAMENTE como aparece, palavra por palavra, pontuação por pontuação.
- NUNCA parafraseie, NUNCA resuma, NUNCA corrija, NUNCA traduza, NUNCA invente.
- Preserve quebras de linha, listas, numeração, símbolos.
- Mantenha cabeçalhos visíveis como aparecem (ex.: "Estação 1", "Orientações ao ator").
- Não adicione comentários, marcações de markdown extras ou notas suas.`;

async function transcribeViaVision(apiKey: string, imageUrls: string[], userId: string): Promise<string> {
  const userText = "Transcreva LITERALMENTE todo o conteúdo das páginas a seguir, em ordem.";
  const { content } = await callGemini(apiKey, "google/gemini-2.5-pro", TRANSCRIBE_PROMPT, userText, imageUrls, {
    jsonMode: false,
    timeoutMs: 240_000,
    userId,
    kind: "transcript",
  });
  return content;
}

// ─────────── Parse de UM PDF a partir das páginas no Storage ───────────
export const importStationsFromPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      filename: z.string().min(1).max(255),
      pagePaths: z.array(z.string().min(1).max(500)).min(1).max(400),
      actorFilename: z.string().min(1).max(255).optional(),
      actorPagePaths: z.array(z.string().min(1).max(500)).max(400).optional(),
      cleanup: z.boolean().default(true),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor");

    const mainUrls = await signPagePaths(data.pagePaths);
    const result = await extractStationsViaVision(apiKey, mainUrls, context.userId);

    // ───── Merge do PDF de orientações do ator (opcional) ─────
    let actorPages = 0;
    let actorMatched = 0;
    let actorSegments = 0;
    if (data.actorPagePaths && data.actorPagePaths.length > 0) {
      try {
        actorPages = data.actorPagePaths.length;
        const actorUrls = await signPagePaths(data.actorPagePaths);
        const actorText = await transcribeViaVision(apiKey, actorUrls, context.userId);
        const segments = splitActorByStation(actorText);
        actorSegments = segments.length;
        const byNumber = new Map<number, string>();
        segments.forEach((seg) => {
          if (seg.number != null) byNumber.set(seg.number, seg.text);
        });
        result.stations = result.stations.map((st, idx) => {
          const n = extractStationNumber(st.title);
          let txt: string | null = null;
          if (n != null && byNumber.has(n)) txt = byNumber.get(n) ?? null;
          else if (segments[idx]) txt = segments[idx].text;
          if (txt && txt.trim().length > 0) {
            actorMatched++;
            return { ...st, patient_script: txt.trim() };
          }
          return st;
        });
      } catch (e) {
        console.error("[pdf-import] actor merge failed", e);
      }
    }

    if (data.cleanup) {
      await deletePagePaths([...(data.pagePaths ?? []), ...(data.actorPagePaths ?? [])]);
    }

    return {
      filename: data.filename,
      pages: data.pagePaths.length,
      textLength: 0,
      truncated: false,
      stations: result.stations,
      actor:
        data.actorPagePaths && data.actorPagePaths.length > 0
          ? { filename: data.actorFilename ?? null, pages: actorPages, segments: actorSegments, matched: actorMatched }
          : null,
    };
  });

// ─────────── Helpers para parsear PDF de orientações do ator ───────────
function splitActorByStation(raw: string): { number: number | null; text: string }[] {
  if (!raw || raw.trim().length === 0) return [];
  // Regex captura cabeçalhos tipo "Estação 1", "ESTAÇÃO 02", "Estacao 3", etc.
  const re = /(^|\n)\s*(?:esta[çc][ãa]o|estacao)\s*(\d{1,3})\b[^\n]*/gi;
  const matches: { index: number; number: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    matches.push({ index: m.index + (m[1] ? m[1].length : 0), number: parseInt(m[2], 10) });
  }
  if (matches.length === 0) {
    // Sem marcador — retorna tudo como um único bloco
    return [{ number: null, text: raw }];
  }
  const out: { number: number | null; text: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    out.push({ number: matches[i].number, text: raw.slice(start, end) });
  }
  return out;
}

function extractStationNumber(title: string): number | null {
  const m = title.match(/esta[çc][ãa]o\s*(\d{1,3})/i);
  return m ? parseInt(m[1], 10) : null;
}

// ─────────── Bulk insert das estações revisadas ───────────
export const bulkCreateStations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      stations: z.array(StationSchema).min(1).max(200),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const created: { id: string; title: string }[] = [];
    for (const st of data.stations) {
      const { data: ins, error } = await supabaseAdmin
        .from("custom_stations")
        .insert({
          created_by: context.userId,
          title: st.title,
          specialty: st.specialty,
          difficulty: st.difficulty,
          duration_minutes: st.duration_minutes,
          clinical_case: st.clinical_case,
          candidate_task: st.candidate_task,
          patient_info: st.patient_info,
          support_materials: st.support_materials,
          patient_script: st.patient_script,
          evaluator_notes: st.evaluator_notes,
          scoring_criteria: st.scoring_criteria,
          post_materials: st.post_materials,
          competencies: st.competencies,
          published: false,
        })
        .select("id")
        .single();
      if (error || !ins) {
        throw new Error(`Falha ao inserir "${st.title}": ${error?.message ?? "sem id"}`);
      }
      if (st.checklist_items.length > 0) {
        const items = st.checklist_items.map((it, idx) => ({
          station_id: ins.id,
          description: it.description,
          category: it.category || "Geral",
          points: it.points,
          levels: it.levels as never,
          order_index: idx,
        }));
        const { error: itemErr } = await supabaseAdmin.from("station_checklist_items").insert(items);
        if (itemErr) {
          throw new Error(`Estação criada mas checklist falhou em "${st.title}": ${itemErr.message}`);
        }
      }
      created.push({ id: ins.id, title: st.title });
    }

    return { created };
  });

// ─────────── Importar estações a partir de TEXTO colado (ChatGPT, etc.) ───────────
export const importStationsFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      text: z.string().min(20).max(400_000),
      sourceLabel: z.string().min(1).max(255).default("Texto colado"),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor");

    const userText = `Abaixo está o TEXTO BRUTO de uma ou várias estações clínicas. Aplique a REGRA DE OURO (fidelidade literal absoluta) e o schema. Retorne SOMENTE JSON com { "stations": [...] }.\n\n=== TEXTO ===\n${data.text}\n=== FIM ===`;

    async function requestAndParse(model: string, timeoutMs: number) {
      const { content } = await callGemini(apiKey!, model, SYSTEM_PROMPT, userText, [], {
        jsonMode: true,
        timeoutMs,
        userId: context.userId,
        kind: "station",
      });
      return parseJsonResponse(content || "{}");
    }

    let parsed: unknown;
    try {
      parsed = await requestAndParse("google/gemini-2.5-flash", 180_000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/abort|timeout|504|502|truncad|incompleto|inválido|nao retornou json|não retornou json/i.test(msg)) throw err;
      parsed = await requestAndParse("google/gemini-2.5-pro", 300_000);
    }

    if (Array.isArray(parsed)) parsed = { stations: parsed };
    else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (!Array.isArray(obj.stations)) {
        const arrKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
        if (arrKey) parsed = { stations: obj[arrKey] };
      }
    }
    const result = StationsResultSchema.parse(parsed);
    return {
      sourceLabel: data.sourceLabel,
      stations: result.stations,
    };
  });