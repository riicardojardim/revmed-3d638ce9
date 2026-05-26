import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAiUsage } from "./ai-usage.server";
import { extractPatientInfoFromSupportText, mergeDeliverableMaterials, splitCaseDescriptionAndTaskBlock, type ImportedDeliverableMaterial } from "./imported-station-utils";
import { normalizeImportedStations, parseStructuredStationsFromText } from "./station-import-parser";

function normalizeForSourceCheck(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cropForSourceCheck(value: string | null | undefined, limit = 1200): string {
  return (value ?? "").trim().slice(0, limit);
}

function stationLooksGroundedInTranscript(station: ImportedStation, transcript: string): boolean {
  const source = normalizeForSourceCheck(transcript);
  const samples = [
    cropForSourceCheck(station.title, 180),
    cropForSourceCheck(station.clinical_case, 500),
    cropForSourceCheck(station.case_description, 500),
    cropForSourceCheck(station.patient_info, 500),
    cropForSourceCheck(station.candidate_task, 500),
    cropForSourceCheck(station.patient_script, 500),
    cropForSourceCheck(station.support_materials, 500),
  ]
    .map(normalizeForSourceCheck)
    .filter((value) => value.length >= 24);

  if (samples.length === 0) return false;

  const hits = samples.filter((sample) => source.includes(sample)).length;
  return hits >= Math.max(1, Math.ceil(samples.length / 3));
}

function checklistItemLooksGroundedInTranscript(item: ImportedStation["checklist_items"][number], transcript: string): boolean {
  const source = normalizeForSourceCheck(transcript);
  const samples = [
    cropForSourceCheck(item.category, 180),
    cropForSourceCheck(item.description, 600),
    ...((item.levels ?? []).flatMap((level) => [cropForSourceCheck(level.label, 60), cropForSourceCheck(level.description, 300)])),
  ]
    .map(normalizeForSourceCheck)
    .filter((value) => value.length >= 12);

  if (samples.length === 0) return false;

  const hits = samples.filter((sample) => source.includes(sample)).length;
  return hits >= Math.max(1, Math.ceil(samples.length / 3));
}

function filterChecklistItemsGroundedInTranscript(stations: ImportedStation[], transcript: string): ImportedStation[] {
  return stations.map((station) => ({
    ...station,
    checklist_items: (station.checklist_items ?? []).filter((item) => checklistItemLooksGroundedInTranscript(item, transcript)),
  }));
}

function groundStationsAgainstTranscript(stations: ImportedStation[], transcript: string): ImportedStation[] {
  return filterChecklistItemsGroundedInTranscript(stations, transcript).filter((station) => stationLooksGroundedInTranscript(station, transcript));
}

function transcriptMentionsActorGuidance(transcript: string): boolean {
  return /(orienta[cç][õo]es?|instru[cç][õo]es?)\s+(ao|a|do|da|para o|para a)\s+(ator|atriz|paciente)/i.test(transcript);
}

function transcriptMentionsPep(transcript: string): boolean {
  return /\b(pep|checklist|padr[aã]o esperado|avalia[cç][ãa]o de habilidades cl[ií]nicas)\b/i.test(transcript);
}

function stationsNeedAiFallback(stations: ImportedStation[], transcript: string): boolean {
  if (stations.length === 0) return true;

  const needsActorGuidance = transcriptMentionsActorGuidance(transcript)
    && stations.some((station) => !station.patient_script?.trim());

  const needsPep = transcriptMentionsPep(transcript)
    && stations.some((station) => {
      const items = station.checklist_items ?? [];
      if (items.length === 0) return true;
      return items.every((item) => {
        const adequate = item.levels?.find((level) => normalizeForSourceCheck(level.label) === "adequado");
        return !adequate || (adequate.points ?? 0) <= 0;
      });
    });

  return needsActorGuidance || needsPep;
}

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

const DeliverableMaterialSchema = z.object({
  id: z.string().optional(),
  name: str(""),
  type: str("Impresso"),
  description: str(""),
  content: str(""),
  imageUrl: z.string().optional(),
  autoDeliver: z.boolean().optional(),
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
  case_description: nstr(),
  candidate_task: str(""),
  patient_info: nstr(),
  support_materials: nstr(),
  deliverable_materials: z.array(DeliverableMaterialSchema).default([]),
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

type ImportedStationInput = Omit<ImportedStation, "case_description" | "deliverable_materials"> &
  Partial<Pick<ImportedStation, "case_description" | "deliverable_materials">>;

function normalizeImportedStationPayload(station: ImportedStationInput): ImportedStation {
  const originalCaseDescription = station.case_description?.trim() || null;
  const originalPatientInfo = station.patient_info?.trim() || null;
  const { caseDescription, candidateTask } = splitCaseDescriptionAndTaskBlock(
    originalCaseDescription ?? originalPatientInfo,
    station.candidate_task,
  );
  const deliverableMaterials = mergeDeliverableMaterials(
    station.deliverable_materials as ImportedDeliverableMaterial[] | undefined,
    station.support_materials,
  );
  const fallbackPatientInfo = originalPatientInfo ?? extractPatientInfoFromSupportText(station.support_materials);

  return {
    ...station,
    case_description: originalCaseDescription ?? caseDescription,
    patient_info: fallbackPatientInfo,
    candidate_task: station.candidate_task?.trim() ? station.candidate_task : candidateTask,
    deliverable_materials: deliverableMaterials,
  };
}

function normalizeImportedStationList(stations: ImportedStationInput[]): ImportedStation[] {
  return stations.map(normalizeImportedStationPayload);
}

// ─────────── Prompt fortemente anti-alucinação ───────────
const SYSTEM_PROMPT = `Você é um EXTRATOR LITERAL de PDFs de estações clínicas (OSCE/Revalida). NÃO é um gerador de conteúdo. NÃO "entende medicina". Sua única função é separar o texto literal do PDF nos campos corretos. Retorne SOMENTE JSON válido conforme o schema.

REGRA ABSOLUTA — EXTRAÇÃO LITERAL:
- NÃO inventar. NÃO completar. NÃO corrigir português. NÃO trocar palavras. NÃO melhorar texto. NÃO resumir. NÃO interpretar clinicamente. NÃO transformar o texto em outro texto. NÃO criar conteúdo que não esteja visível no PDF.
- Apenas COPIE o que está escrito no PDF e coloque no campo correto.
- Se algum trecho não estiver claro, escreva exatamente: [TRECHO ILEGÍVEL NO PDF]. Nunca adivinhe.
- Preserve quebras de linha, pontuação, números, símbolos e ordem.

SEGMENTAÇÃO:
- O PDF pode conter VÁRIAS estações. Retorne uma entrada por estação distinta, em ordem.

REGRA DE FRONTEIRA (CRÍTICA):
- O texto fonte é organizado em SEÇÕES com cabeçalhos próprios. Quando encontrar um novo cabeçalho, ENCERRE a seção anterior. NUNCA misture seções. NUNCA repita conteúdo em mais de um campo.

MAPEAMENTO DE SEÇÕES → CAMPOS (estrito):

1) CENÁRIO DE ATUAÇÃO → clinical_case
   Copie SOMENTE o texto abaixo do título "CENÁRIO DE ATUAÇÃO". Inclui APENAS: local de atuação, infraestrutura da unidade, nível de atenção, tipo de atendimento. PARE antes de "DESCRIÇÃO DO CASO".
   NÃO coloque aqui: tarefas, dados do paciente, ficha do paciente, PEP.

2) DESCRIÇÃO DO CASO → patient_info
   Copie o texto abaixo de "DESCRIÇÃO DO CASO". Inclua TAMBÉM a "Ficha do paciente" se ela existir em página separada (dados de acolhimento, classificação, sinais vitais, motivo da consulta). NUNCA deixe patient_info vazio se existir DESCRIÇÃO DO CASO ou Ficha do paciente.
   NÃO coloque aqui: tarefas, orientações ao ator, PEP.

3) TAREFAS DO CANDIDATO → candidate_task
   Copie SOMENTE a lista que aparece após frases como "Nos próximos 10 minutos, deverão ser realizadas as seguintes tarefas:" ou equivalente. Copie cada item literalmente. NÃO coloque tarefas em clinical_case nem em patient_info. NÃO reescreva os itens.

4) ORIENTAÇÕES DO ATOR/ATRIZ → patient_script
   Copie LITERALMENTE o bloco completo: nome, idade, profissão, queixa, história, antecedentes, hábitos, respostas, perguntas, orientações em vermelho, instruções sobre quando entregar impressos. NÃO resuma. NÃO corrija. Se não existir, use "Não informado".

5) IMPRESSOS / MATERIAIS → support_materials
   Identifique TODO título começando com "IMPRESSO 1", "IMPRESSO 2", etc. Cada impresso é um bloco separado. Concatene-os no campo support_materials no formato literal:

   === IMPRESSO 1 — <título literal> ===
   <texto literal do impresso>
   [IMAGEM NECESSÁRIA: SIM] (se contém foto clínica, ECG, RX, USG, TC, RM, gráfico ou imagem)
   [IMAGEM NECESSÁRIA: NÃO] (se for apenas texto)

   === IMPRESSO 2 — ... ===
   ...

   NUNCA deixe support_materials vazio se o PDF contém páginas com "IMPRESSO".

6) PEP / PADRÃO ESPERADO DE PROCEDIMENTO / CHECKLIST DE AVALIAÇÃO → checklist_items
   Copie cada item literalmente, na ordem exata do PDF. NÃO altere descrição. NÃO corrija termos. NÃO resuma.
   - category: título literal do item, sem o número inicial e sem ":" final. Ex.: "01- Apresentação" → "Apresentação".
   - description: ações/sub-itens listados sob a categoria (ex.: "(1) cumprimenta o paciente simulado; (2) identifica-se; ..."), LITERAL, sem incluir as linhas dos níveis.
   - points: pontuação MÁXIMA do item (valor da coluna ADEQUADO).
   - levels: SEMPRE preencher conforme a tabela:
       * INADEQUADO → label "Inadequado", points = 0, description literal após "Inadequado:".
       * PARCIALMENTE ADEQUADO (somente se a coluna existir) → label "Parcialmente adequado", points = valor da coluna, description literal.
       * ADEQUADO → label "Adequado", points = valor da coluna ADEQUADO (NUNCA 0), description literal após "Adequado:".
     NUNCA salve "Adequado" com points = 0. Inadequado SEMPRE = 0. Parcialmente adequado só existe se aparecer no PDF.

CAMPOS RESTANTES:
- title: título/nome literal da estação (ex.: "ESTAÇÃO 10 — TABAGISMO").
- specialty: uma de "Clínica Médica", "Cirurgia", "Pediatria", "Ginecologia e Obstetrícia", "Medicina de Família e Comunidade". Inferir SOMENTE de "ÁREA: ..." declarada; senão "Clínica Médica".
- duration_minutes: número entre 3 e 30 (procure "Nos próximos X minutos"; default 10).
- competencies: copiar LITERAL quando existir; [] caso contrário.
- evaluator_notes, scoring_criteria, post_materials: SEMPRE null. NÃO extraia esses campos.

Schema esperado:
{
  "stations": [{
    "title": string, "specialty": string,
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

const PDF_IMPORT_PRIMARY_MODEL = "openai/gpt-5.5";
const PDF_IMPORT_FALLBACK_MODEL = "google/gemini-2.5-pro";
const PDF_IMPORT_FALLBACK_ERROR_RE = /abort|timeout|504|502|truncad|incompleto|inválido|nao retornou json|não retornou json|not supported in the v1\/chat\/completions|not a chat model/i;

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
    parsed = await requestAndParse(PDF_IMPORT_PRIMARY_MODEL, 300_000);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!PDF_IMPORT_FALLBACK_ERROR_RE.test(msg)) throw err;
    parsed = await requestAndParse(PDF_IMPORT_FALLBACK_MODEL, 240_000);
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
  return StationsResultSchema.parse({ stations: normalizeImportedStationList(normalizeImportedStations(StationsResultSchema.parse(parsed).stations)) });
}

const TRANSCRIBE_PROMPT = `Você TRANSCREVE LITERALMENTE o texto de páginas escaneadas de um PDF. Regras inegociáveis:
- Copie o texto EXATAMENTE como aparece, palavra por palavra, pontuação por pontuação.
- NUNCA parafraseie, NUNCA resuma, NUNCA corrija, NUNCA traduza, NUNCA invente.
- Preserve quebras de linha, listas, numeração, símbolos.
- Mantenha cabeçalhos visíveis como aparecem (ex.: "Estação 1", "Orientações ao ator").
- Não adicione comentários, marcações de markdown extras ou notas suas.`;

async function transcribeViaVision(apiKey: string, imageUrls: string[], userId: string): Promise<string> {
  const userText = "Transcreva LITERALMENTE todo o conteúdo das páginas a seguir, em ordem.";
  try {
    const { content } = await callGemini(apiKey, PDF_IMPORT_PRIMARY_MODEL, TRANSCRIBE_PROMPT, userText, imageUrls, {
      jsonMode: false,
      timeoutMs: 240_000,
      userId,
      kind: "transcript",
    });
    return content;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!PDF_IMPORT_FALLBACK_ERROR_RE.test(msg)) throw err;
    const { content } = await callGemini(apiKey, PDF_IMPORT_FALLBACK_MODEL, TRANSCRIBE_PROMPT, userText, imageUrls, {
      jsonMode: false,
      timeoutMs: 180_000,
      userId,
      kind: "transcript",
    });
    return content;
  }
}

async function transcribePdfInBatches(apiKey: string, pagePaths: string[], userId: string): Promise<string> {
  const BATCH_SIZE = 20;
  const parts: string[] = [];

  for (let i = 0; i < pagePaths.length; i += BATCH_SIZE) {
    const batch = pagePaths.slice(i, i + BATCH_SIZE);
    const urls = await signPagePaths(batch);
    const text = await transcribeViaVision(apiKey, urls, userId);
    if (text.trim()) parts.push(text.trim());
  }

  return parts.join("\n\n");
}

async function extractStationsFromTranscript(
  apiKey: string,
  transcript: string,
  userId: string,
  sourceLabel: string,
): Promise<ImportedStation[]> {
  const deterministicStations = parseStructuredStationsFromText(transcript, sourceLabel);
  const deterministicLooksReliable = deterministicStations.some(
    (station) =>
      Boolean(station.patient_script?.trim()) ||
      Boolean(station.patient_info?.trim()) ||
      Boolean(station.support_materials?.trim()) ||
      station.checklist_items.length > 0,
  );

  if (deterministicStations.length > 0 && deterministicLooksReliable) {
    return groundStationsAgainstTranscript(
      StationsResultSchema.parse({ stations: normalizeImportedStationList(normalizeImportedStations(deterministicStations)) }).stations,
      transcript,
    );
  }

  const userText = `Abaixo está o TEXTO BRUTO de uma ou várias estações clínicas. Aplique a REGRA DE OURO (fidelidade literal) e a REGRA DE FRONTEIRA (cada seção do texto vai para EXATAMENTE UM campo — não duplique conteúdo, não misture cenário com descrição do caso nem com tarefas). Retorne SOMENTE JSON com { "stations": [...] }.\n\nLembrete crítico:\n- "CENÁRIO DE ATUAÇÃO" → clinical_case (PARE quando começar "DESCRIÇÃO DO CASO").\n- "DESCRIÇÃO DO CASO" → patient_info (PARE quando começar tarefas).\n- "TAREFAS" / "Nos próximos X minutos" / "INSTRUÇÕES PARA O(A) PARTICIPANTE" → candidate_task.\n- "ORIENTAÇÕES AO ATOR/ATRIZ" → patient_script (copie TODO o bloco, completo, até o próximo cabeçalho).\n- "IMPRESSO" / "IMPRESSOS" → support_materials (copie TODO o bloco literal até o próximo cabeçalho).\n- "PEP" / "CHECKLIST" / "PADRÃO ESPERADO DE RESPOSTA" → checklist_items (TODOS os itens, com category, description, points e os 3 levels).\n- Quando o PEP terminar e a próxima estação começar, PARE imediatamente a estação atual. NÃO puxe nada da próxima estação.\n\n=== TEXTO ===\n${transcript}\n=== FIM ===`;

  async function requestAndParse(model: string, timeoutMs: number) {
    const { content } = await callGemini(apiKey, model, SYSTEM_PROMPT, userText, [], {
      jsonMode: true,
      timeoutMs,
      userId,
      kind: "station",
    });
    return parseJsonResponse(content || "{}");
  }

  let parsed: unknown;
  try {
    parsed = await requestAndParse(PDF_IMPORT_PRIMARY_MODEL, 300_000);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!PDF_IMPORT_FALLBACK_ERROR_RE.test(msg)) throw err;
    parsed = await requestAndParse(PDF_IMPORT_FALLBACK_MODEL, 240_000);
  }

  if (Array.isArray(parsed)) parsed = { stations: parsed };
  else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj.stations)) {
      const arrKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
      if (arrKey) parsed = { stations: obj[arrKey] };
    }
  }

  const normalizedStations = StationsResultSchema.parse({
    stations: normalizeImportedStationList(normalizeImportedStations(StationsResultSchema.parse(parsed).stations)),
  }).stations;

  const groundedStations = groundStationsAgainstTranscript(normalizedStations, transcript);
  return groundedStations.length > 0 ? groundedStations : normalizedStations;
}

// ─────────── Parse de UM PDF a partir das páginas no Storage ───────────
export const importStationsFromPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      filename: z.string().min(1).max(255),
      pagePaths: z.array(z.string().min(1).max(500)).min(1).max(400),
      extractedText: z.string().max(2_000_000).optional(),
      actorFilename: z.string().min(1).max(255).optional(),
      actorPagePaths: z.array(z.string().min(1).max(500)).max(400).optional(),
      actorExtractedText: z.string().max(2_000_000).optional(),
      cleanup: z.boolean().default(true),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor");

    let transcript = "";
  let allStations: ImportedStation[] = [];
  let parserFailed = false;
  try {
    transcript = data.extractedText?.trim() || "";
    const deterministicFromRawText = transcript ? parseStructuredStationsFromText(transcript, data.filename) : [];

    if (deterministicFromRawText.length > 0) {
      allStations = groundStationsAgainstTranscript(
        StationsResultSchema.parse({ stations: normalizeImportedStationList(normalizeImportedStations(deterministicFromRawText)) }).stations,
        transcript,
      );
    } else {
      if (transcript.length < 200) {
        transcript = await transcribePdfInBatches(apiKey, data.pagePaths, context.userId);
      }

      const deterministicAfterOcr = transcript ? parseStructuredStationsFromText(transcript, data.filename) : [];
      if (deterministicAfterOcr.length > 0) {
        allStations = groundStationsAgainstTranscript(
          StationsResultSchema.parse({ stations: normalizeImportedStationList(normalizeImportedStations(deterministicAfterOcr)) }).stations,
          transcript,
        );
      } else {
        allStations = await extractStationsFromTranscript(apiKey, transcript, context.userId, data.filename);
      }
    }
  } catch (e) {
    parserFailed = true;
    console.error("[pdf-import] transcript-first strategy failed, falling back to direct vision", e);
  }

  if (allStations.length === 0) {
      console.warn("[pdf-import] no stations from transcript path, falling back to direct vision", { parserFailed });
      const BATCH_SIZE = 20;
      const batches: string[][] = [];
      for (let i = 0; i < data.pagePaths.length; i += BATCH_SIZE) {
        batches.push(data.pagePaths.slice(i, i + BATCH_SIZE));
      }

      for (let i = 0; i < batches.length; i++) {
        const urls = await signPagePaths(batches[i]);
        try {
          const partial = await extractStationsViaVision(apiKey, urls, context.userId);
          allStations.push(...partial.stations);
        } catch (e) {
          console.error(`[pdf-import] batch ${i + 1}/${batches.length} failed`, e);
        }
      }
    }

    if (allStations.length === 0) {
      throw new Error(
        `A IA não conseguiu extrair nenhuma estação deste PDF (${data.pagePaths.length} páginas). ` +
        `Verifique se o PDF tem texto/imagens legíveis ou tente a opção "Colar texto".`,
      );
    }

    const result = { stations: allStations };

    // ───── Merge do PDF de orientações do ator (opcional) ─────
    let actorPages = 0;
    let actorMatched = 0;
    let actorSegments = 0;
    if (data.actorPagePaths && data.actorPagePaths.length > 0) {
      try {
        actorPages = data.actorPagePaths.length;
        const actorText = data.actorExtractedText?.trim() || await transcribePdfInBatches(apiKey, data.actorPagePaths, context.userId);
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
          case_description: st.case_description,
          candidate_task: st.candidate_task,
          patient_info: st.patient_info,
          support_materials: st.support_materials,
          deliverable_materials: st.deliverable_materials as never,
          patient_script: st.patient_script,
          evaluator_notes: null,
          scoring_criteria: null,
          post_materials: null,
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
    return {
      sourceLabel: data.sourceLabel,
      stations: await extractStationsFromTranscript(apiKey, data.text, context.userId, data.sourceLabel),
    };
  });