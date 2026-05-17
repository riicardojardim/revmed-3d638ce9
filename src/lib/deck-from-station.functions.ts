import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  station_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(300),
  specialty: z.string().min(1).max(120),
  topic: z.string().max(200).optional().nullable(),
  clinical_case: z.string().max(20_000).optional().nullable(),
  candidate_task: z.string().max(10_000).optional().nullable(),
  educational_goal: z.string().max(5_000).optional().nullable(),
  expected_conduct: z.string().max(10_000).optional().nullable(),
  common_mistakes: z.string().max(10_000).optional().nullable(),
  scoring_criteria: z.string().max(10_000).optional().nullable(),
  references: z.array(z.object({ label: z.string(), url: z.string().optional() })).max(40).optional(),
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

Sua tarefa: gerar um DECK DE FLASHCARDS de alta qualidade a partir do contexto de uma ESTAÇÃO clínica (OSCE). Retorne SOMENTE JSON válido (sem markdown, sem cercas \`\`\`).

REGRAS DE CONTEÚDO (não negociáveis):
1. Cada card deve refletir conhecimento CIENTÍFICO ATUAL e correto, conforme:
   - Diretrizes brasileiras vigentes (SBC, SBP, FEBRASGO, SBI, MS, Caderno de Atenção Básica)
   - Protocolos do Ministério da Saúde e PCDTs do SUS
   - Bulas e normas regulatórias da ANVISA (medicamentos, doses, contraindicações)
   - Guidelines internacionais consagradas (WHO, CDC, NICE, AHA, ACOG, GINA, GOLD, ADA, KDIGO) quando aplicáveis
   - Revisões de UpToDate / BMJ Best Practice / Cochrane
2. NÃO invente doses, esquemas, nomes comerciais, critérios diagnósticos ou condutas.
3. Se houver dúvida razoável sobre um dado, escolha um conteúdo mais geral e seguro — prefira omitir a chutar.
4. Use terminologia médica padrão em português do Brasil (CID-10/11, DeCS).
5. Doses sempre com unidade explícita (mg, mg/kg/dia, UI, mL), via e intervalo.
6. NÃO cite o nome do paciente/caso da estação — os cards devem ser GENERALIZÁVEIS (sobre a condição, não sobre o caso específico).

REGRAS DE FORMATO DOS CARDS:
- "front" (pergunta): 1 frase curta e objetiva, terminando em "?". Foco em UMA ideia testável.
  Bons formatos: "Qual o tratamento de primeira linha para X?", "Quais critérios diagnósticos de Y?", "Quando indicar Z?", "Qual o mecanismo de ação de W?".
- "back" (resposta): direta, em até ~80 palavras. Pode usar bullets curtos com "•" ou numeração "1)". Inclua dose/critério/valor de corte quando aplicável. Termine com 1 linha "Fonte: <diretriz/órgão>" se relevante.
- Diversifique os tipos: epidemiologia, fisiopatologia (1-2), diagnóstico/critérios, exames complementares, tratamento farmacológico (com dose), conduta não-farmacológica, complicações, red flags, prevenção, particularidades pediátricas/gestantes quando pertinente, comunicação/quebra de más notícias quando pertinente à estação.
- Sem duplicatas: cada card cobre um aspecto diferente.

Schema de saída:
{
  "deck_title": "<título curto e claro, ex.: 'IAM com supra de ST'>",
  "deck_topic": "<subtema opcional, ex.: 'Manejo na sala de emergência'>",
  "cards": [
    { "front": "...", "back": "..." }
  ]
}`;

type GatewayChoice = { message?: { content?: string }; finish_reason?: string };

async function callGateway(apiKey: string, userText: string, model: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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
    if (res.status === 429) throw new Error("Limite de uso da IA atingido. Aguarde alguns instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`AI Gateway ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: GatewayChoice[] };
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
  return [
    `Gere ${input.count} flashcards de alta qualidade para a estação abaixo. Conteúdo baseado em evidências, diretrizes brasileiras e ANVISA quando houver medicamento.`,
    "",
    `TÍTULO DA ESTAÇÃO: ${input.title}`,
    `ÁREA: ${input.specialty}`,
    input.topic ? `TÓPICO: ${input.topic}` : "",
    "",
    input.educational_goal ? `OBJETIVO EDUCACIONAL:\n${input.educational_goal}` : "",
    input.candidate_task ? `\nTAREFA DO CANDIDATO:\n${input.candidate_task}` : "",
    input.clinical_case ? `\nCASO CLÍNICO (use apenas para inferir o tema; NÃO cite o paciente nos cards):\n${input.clinical_case.slice(0, 4000)}` : "",
    input.expected_conduct ? `\nCONDUTA ESPERADA:\n${input.expected_conduct.slice(0, 3000)}` : "",
    input.common_mistakes ? `\nERROS COMUNS:\n${input.common_mistakes.slice(0, 2000)}` : "",
    input.scoring_criteria ? `\nCRITÉRIOS DE AVALIAÇÃO:\n${input.scoring_criteria.slice(0, 2000)}` : "",
    refs ? `\nREFERÊNCIAS DECLARADAS NA ESTAÇÃO:\n${refs}` : "",
    "",
    "Retorne SOMENTE o JSON do schema. Verifique cada dose e critério antes de gerar.",
  ].filter(Boolean).join("\n");
}

export const generateDeckFromStation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor");

    const prompt = buildUserPrompt(data);
    let result: z.infer<typeof ResultSchema>;
    try {
      result = await callGateway(apiKey, prompt, "google/gemini-2.5-flash", 90_000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTimeout = /abort|timeout|504|502|upstream/i.test(msg);
      if (!isTimeout) throw err;
      result = await callGateway(apiKey, prompt, "google/gemini-2.5-pro", 150_000);
    }

    const { supabase, userId } = context;
    const deckTitle = (result.deck_title?.trim() || data.title).slice(0, 200);
    const deckTopic = (result.deck_topic?.trim() || data.topic || null) as string | null;

    const { data: deck, error: deckErr } = await supabase
      .from("flashcard_decks")
      .insert({
        created_by: userId,
        title: deckTitle,
        specialty: data.specialty,
        topic: deckTopic,
        description: `Gerado automaticamente a partir da estação "${data.title}".`,
        published: false,
      })
      .select("id")
      .single();
    if (deckErr || !deck) throw new Error(deckErr?.message || "Falha ao criar o deck");

    const rows = result.cards.map((c, i) => ({
      deck_id: deck.id,
      created_by: userId,
      specialty: data.specialty,
      topic: deckTopic,
      front: c.front.trim(),
      back: c.back.trim(),
      position: i,
      published: false,
    }));
    const { error: cardsErr } = await supabase.from("flashcards").insert(rows);
    if (cardsErr) {
      // rollback deck if cards failed
      await supabase.from("flashcard_decks").delete().eq("id", deck.id);
      throw new Error(cardsErr.message);
    }

    return { deck_id: deck.id, count: rows.length };
  });
