import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logAiUsage, type AiUsageKind } from "./ai-usage.server";

const truncStr = (max: number) =>
  z.preprocess(
    (v) => (v == null ? null : String(v).slice(0, max)),
    z.string().max(max).optional().nullable(),
  );

const ChecklistItemSchema = z.object({
  description: z.preprocess(
    (v) => (v == null ? "" : String(v).slice(0, 2000)),
    z.string().max(2000),
  ),
  category: truncStr(120),
  points: z.number().optional().nullable(),
  helper_text: truncStr(2000),
});

const InputSchema = z.object({
  station_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(300),
  specialty: z.string().min(1).max(120),
  topic: z.string().max(200).optional().nullable(),
  clinical_case: z.string().max(20_000).optional().nullable(),
  case_description: z.string().max(20_000).optional().nullable(),
  candidate_task: z.string().max(10_000).optional().nullable(),
  patient_info: z.string().max(10_000).optional().nullable(),
  patient_script: z.string().max(20_000).optional().nullable(),
  patient_profile: z.string().max(10_000).optional().nullable(),
  support_materials: z.string().max(10_000).optional().nullable(),
  evaluator_notes: z.string().max(10_000).optional().nullable(),
  deliverable_materials: z
    .array(
      z.object({
        name: z.string().max(300).optional().nullable(),
        type: z.string().max(120).optional().nullable(),
        description: z.string().max(5_000).optional().nullable(),
        content: z.string().max(20_000).optional().nullable(),
      }),
    )
    .max(20)
    .optional()
    .nullable(),
  educational_goal: z.string().max(5_000).optional().nullable(),
  expected_conduct: z.string().max(10_000).optional().nullable(),
  common_mistakes: z.string().max(10_000).optional().nullable(),
  scoring_criteria: z.string().max(10_000).optional().nullable(),
  references: z.array(z.object({ label: z.string(), url: z.string().optional() })).max(40).optional(),
  checklist_items: z.array(ChecklistItemSchema).max(200).optional().nullable(),
  count: z.number().int().min(6).max(30).default(14),
});

const CardSchema = z.object({
  front: z.string().min(3).max(800),
  back: z.string().min(3).max(2000),
});

const ResultSchema = z.object({
  deck_title: z.string().min(1).max(200).optional(),
  deck_topic: z.string().max(200).optional(),
  cards: z.array(CardSchema).min(3).max(40),
});

const SYSTEM_PROMPT = `Você é um professor médico brasileiro especialista em preparação para o Revalida/INEP, com domínio profundo de medicina baseada em evidências.

Sua tarefa: gerar um DECK DE FLASHCARDS de alta qualidade a partir do contexto COMPLETO de uma ESTAÇÃO clínica (OSCE) — título, descrição do caso, tarefa do candidato, roteiro/perfil do ator, materiais de apoio, IMPRESSOS (exames, ECG, laudos), notas do avaliador, conduta esperada, erros comuns, critérios E o CHECKLIST/PEP. Retorne SOMENTE JSON válido (sem markdown, sem cercas \`\`\`).

ANTES DE ESCREVER OS CARDS:
1. Identifique o TEMA CLÍNICO real da estação (a doença/condição/abordagem) a partir de TODO o contexto — não apenas do título nem apenas do PEP. O PEP indica o que o candidato deve executar; os cards devem ensinar o assunto inteiro.
2. Os cards devem fazer SENTIDO com o que está sendo dito na estação. Se a estação é sobre anemia, NÃO gere cards sobre hipotireoidismo. Se é sobre IAM, NÃO gere cards sobre asma. Coerência absoluta com o tema identificado.

REGRAS DE CONTEÚDO (não negociáveis):
1. Cada card deve refletir conhecimento CIENTÍFICO ATUAL e correto, conforme:
   - Diretrizes brasileiras vigentes (SBC, SBP, FEBRASGO, SBI, SBPT, SBN, SBD, SBEM, MS, Caderno de Atenção Básica)
   - Protocolos do Ministério da Saúde e PCDTs do SUS
   - Bulas e normas regulatórias da ANVISA (medicamentos, doses, contraindicações)
   - Guidelines internacionais consagradas (WHO, CDC, NICE, AHA, ACOG, GINA, GOLD, ADA, KDIGO) quando aplicáveis ao SUS
   - Revisões de UpToDate / BMJ Best Practice / Cochrane
2. NÃO invente doses, esquemas, nomes comerciais, critérios diagnósticos ou condutas.
3. Se houver dúvida razoável sobre um dado, escolha um conteúdo mais geral e seguro — prefira omitir a chutar.
4. Use terminologia médica padrão em português do Brasil (CID-10/11, DeCS).
5. Doses sempre com unidade explícita (mg, mg/kg/dia, UI, mL), via e intervalo.
6. NÃO cite o nome do paciente/caso da estação — os cards devem ser GENERALIZÁVEIS (sobre a condição, não sobre o caso específico).

REGRAS DE FORMATO DOS CARDS:
- "front" (pergunta): 1 frase curta e objetiva, terminando em "?". Foco em UMA ideia testável.
  Bons formatos: "Qual o tratamento de primeira linha para X?", "Quais critérios diagnósticos de Y?", "Quando indicar Z?", "Qual o mecanismo de ação de W?".
- "back" (resposta): direta, em até ~80 palavras. Pode usar bullets curtos com "•" ou numeração "1)". Inclua dose/critério/valor de corte quando aplicável.
- Diversifique os tipos: epidemiologia, fisiopatologia (1-2), diagnóstico/critérios, exames complementares, tratamento farmacológico (com dose), conduta não-farmacológica, complicações, red flags, prevenção, particularidades pediátricas/gestantes quando pertinente.
- Sem duplicatas: cada card cobre um aspecto diferente do mesmo tema clínico.

Schema de saída:
{
  "deck_title": "<título — será sobrescrito pelo título da estação>",
  "cards": [
    { "front": "...", "back": "..." }
  ]
}`;

type GatewayChoice = { message?: { content?: string }; finish_reason?: string };

async function callGateway(
  apiKey: string,
  userText: string,
  model: string,
  timeoutMs: number,
  logCtx: { kind: AiUsageKind; userId: string | null; stationId?: string | null },
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userText },
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
    await logAiUsage({ kind: logCtx.kind, model, userId: logCtx.userId, stationId: logCtx.stationId ?? null, status: "error", errorMessage: `HTTP ${res.status}: ${txt.slice(0, 200)}`, durationMs: Date.now() - start });
    if (res.status === 429) throw new Error("Limite de uso da IA atingido. Aguarde alguns instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`AI Gateway ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: GatewayChoice[]; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
  await logAiUsage({ kind: logCtx.kind, model, userId: logCtx.userId, stationId: logCtx.stationId ?? null, usage: json.usage ?? null, durationMs: Date.now() - start });
  if (json.choices?.[0]?.finish_reason === "length") {
    throw new Error("A resposta da IA foi cortada (limite de tokens).");
  }
  const content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try { parsed = JSON.parse(content); }
  catch {
    const m = content.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : {};
  }
  return ResultSchema.parse(parsed);
}

function buildUserPrompt(input: z.infer<typeof InputSchema>): string {
  const refs = (input.references ?? [])
    .map((r) => `- ${r.label}${r.url ? ` (${r.url})` : ""}`)
    .join("\n");
  const checklistBlock = (input.checklist_items ?? [])
    .map((it, idx) => {
      const cat = it.category ? ` [${it.category}]` : "";
      const pts = typeof it.points === "number" ? ` (${it.points} pt)` : "";
      const helper = it.helper_text ? `\n     ↳ ${it.helper_text}` : "";
      return `  ${idx + 1}.${cat} ${it.description}${pts}${helper}`;
    })
    .join("\n");
  const deliverablesBlock = (input.deliverable_materials ?? [])
    .map((m, idx) => {
      const head = `IMPRESSO ${idx + 1}${m.type ? ` (${m.type})` : ""}${m.name ? ` — ${m.name}` : ""}`;
      const desc = m.description ? `\n  Descrição: ${m.description}` : "";
      const content = m.content ? `\n  Conteúdo: ${m.content.slice(0, 3000)}` : "";
      return `${head}${desc}${content}`;
    })
    .join("\n\n");
  return [
    `Gere ${input.count} flashcards de alta qualidade sobre o TEMA CLÍNICO real da estação abaixo. Use TODO o contexto (não apenas o título nem só o PEP) para identificar o assunto e gerar cards COERENTES com ele.`,
    "",
    `TÍTULO DA ESTAÇÃO: ${input.title}`,
    `ÁREA: ${input.specialty}`,
    input.topic ? `TÓPICO: ${input.topic}` : "",
    "",
    input.educational_goal ? `OBJETIVO EDUCACIONAL:\n${input.educational_goal}` : "",
    input.candidate_task ? `\nTAREFA DO CANDIDATO:\n${input.candidate_task}` : "",
    input.case_description ? `\nDESCRIÇÃO DO CASO / CENÁRIO:\n${input.case_description.slice(0, 5000)}` : "",
    input.clinical_case ? `\nCASO CLÍNICO (use apenas para inferir o tema; NÃO cite o paciente nos cards):\n${input.clinical_case.slice(0, 5000)}` : "",
    input.patient_info ? `\nINFORMAÇÕES DO PACIENTE:\n${input.patient_info.slice(0, 3000)}` : "",
    input.patient_profile ? `\nPERFIL DO ATOR/PACIENTE:\n${input.patient_profile.slice(0, 3000)}` : "",
    input.patient_script ? `\nROTEIRO DO ATOR:\n${input.patient_script.slice(0, 5000)}` : "",
    input.support_materials ? `\nMATERIAIS DE APOIO:\n${input.support_materials.slice(0, 3000)}` : "",
    deliverablesBlock ? `\nIMPRESSOS ENTREGUES AO CANDIDATO (exames, laudos, ECG, receitas):\n${deliverablesBlock}` : "",
    checklistBlock ? `\nCHECKLIST / PEP (critérios avaliados — os cards devem dar base científica ao tema, cobrindo esses pontos e indo além):\n${checklistBlock}` : "",
    input.expected_conduct ? `\nCONDUTA ESPERADA:\n${input.expected_conduct.slice(0, 3000)}` : "",
    input.common_mistakes ? `\nERROS COMUNS:\n${input.common_mistakes.slice(0, 2000)}` : "",
    input.evaluator_notes ? `\nNOTAS DO AVALIADOR:\n${input.evaluator_notes.slice(0, 2000)}` : "",
    input.scoring_criteria ? `\nCRITÉRIOS DE AVALIAÇÃO:\n${input.scoring_criteria.slice(0, 2000)}` : "",
    refs ? `\nREFERÊNCIAS DECLARADAS NA ESTAÇÃO:\n${refs}` : "",
    "",
    "Retorne SOMENTE o JSON do schema. Os cards DEVEM ser coerentes com o tema clínico identificado a partir do contexto inteiro. Verifique cada dose e critério antes de gerar.",
  ].filter(Boolean).join("\n");
}

export const generateDeckFromStation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor");

    const prompt = buildUserPrompt(data);
    const logCtx = { kind: "flashcards" as const, userId: context.userId, stationId: data.station_id ?? null };
    let result: z.infer<typeof ResultSchema>;
    try {
      result = await callGateway(apiKey, prompt, "google/gemini-2.5-flash", 90_000, logCtx);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTimeout = /abort|timeout|504|502|upstream/i.test(msg);
      if (!isTimeout) throw err;
      result = await callGateway(apiKey, prompt, "google/gemini-2.5-pro", 150_000, logCtx);
    }

    const { supabase, userId } = context;
    // Título do deck = título da estação (regra do produto).
    const deckTitle = data.title.slice(0, 200);

    const { data: deck, error: deckErr } = await supabase
      .from("flashcard_decks")
      .insert({
        created_by: userId,
        title: deckTitle,
        specialty: data.specialty,
        topic: null,
        description: null,
        published: false,
        station_id: data.station_id ?? null,
      })
      .select("id")
      .single();
    if (deckErr || !deck) throw new Error(deckErr?.message || "Falha ao criar o deck");

    const rows = result.cards.map((c, i) => ({
      deck_id: deck.id,
      created_by: userId,
      specialty: data.specialty,
      topic: null,
      front: c.front.trim(),
      back: c.back.trim(),
      position: i,
      published: false,
    }));
    const { error: cardsErr } = await supabase.from("flashcards").insert(rows);
    if (cardsErr) {
      await supabase.from("flashcard_decks").delete().eq("id", deck.id);
      throw new Error(cardsErr.message);
    }

    return { deck_id: deck.id, count: rows.length };
  });
