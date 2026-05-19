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
});

const ResultSchema = z.object({
  title: z.string().min(3).max(200),
  topic: z.string().max(200).optional().nullable(),
  difficulty: z.enum(["Básico", "Intermediário", "Avançado"]).default("Intermediário"),
  read_time_minutes: z.number().int().min(2).max(30).default(7),
  high_yield: z.boolean().default(false),
  definition: z.string().min(20).max(2500),
  clinical_picture: z.string().min(20).max(3000),
  diagnosis: z.string().min(20).max(3500),
  conduct: z.string().min(20).max(4000),
  key_points: z.string().min(10).max(2500),
  pitfalls: z.string().min(10).max(2500),
  sources: z.array(z.string().max(200)).max(15).default([]),
});

const SYSTEM_PROMPT = `Você é um professor médico brasileiro, especialista em preparação para o Revalida/INEP, com domínio profundo de medicina baseada em evidências.

Sua tarefa: gerar um RESUMO CLÍNICO de altíssima qualidade a partir do contexto de uma ESTAÇÃO clínica (OSCE). Retorne SOMENTE JSON válido (sem markdown, sem cercas \`\`\`).

REGRAS DE CONTEÚDO (não negociáveis — segurança do paciente vem primeiro):
1. Use SOMENTE fontes oficiais e de altíssima confiabilidade:
   - Ministério da Saúde (MS), PCDTs do SUS, Cadernos de Atenção Básica
   - ANVISA (bulas, RDCs, medicamentos, doses, contraindicações)
   - Diretrizes brasileiras vigentes: SBC, SBP, FEBRASGO, SBI, SBPT, SBN, SBD, SBEM, SBR, SBOT, SBU
   - INEP / matriz oficial do Revalida
   - Guidelines internacionais consagradas QUANDO aplicáveis e alinhadas ao SUS: WHO, CDC, NICE, AHA, ACOG, GINA, GOLD, ADA, KDIGO
   - UpToDate / BMJ Best Practice / Cochrane como apoio
2. NÃO invente doses, esquemas terapêuticos, critérios diagnósticos, valores de corte, nomes comerciais ou condutas.
3. Se houver qualquer dúvida razoável sobre um dado específico, prefira uma orientação mais geral e segura — OMITIR é melhor que CHUTAR.
4. SEMPRE que citar medicamento: dose com unidade explícita (mg, mg/kg/dia, UI, mL), via, intervalo e duração. Cite a fonte (MS/ANVISA/diretriz) entre parênteses quando relevante.
5. NÃO cite o nome do paciente da estação — o resumo deve ser GENERALIZÁVEL sobre a condição clínica, NÃO sobre o caso específico.
6. Tom direto, didático, em português do Brasil. Use terminologia padrão (CID-10/11, DeCS).

REGRAS DE FORMATO (cada campo é uma string de texto, NÃO HTML, NÃO markdown):
- "title": nome curto e didático do tema (3–7 palavras). NÃO copie o título da estação. Ex.: "Pneumonia adquirida na comunidade", "Crise hipertensiva na gestante".
- "topic": subtema opcional (ex.: "Tratamento ambulatorial").
- "difficulty": "Básico" | "Intermediário" | "Avançado" — proporcional à complexidade do tema na prova.
- "read_time_minutes": estimativa honesta (5–12 minutos típico).
- "high_yield": true SOMENTE se for tema de alta incidência no Revalida.
- "definition": 1 parágrafo + epidemiologia rápida e fisiopatologia essencial.
- "clinical_picture": sinais e sintomas em bullets curtos (use "• " no início de cada linha). Inclua red flags.
- "diagnosis": critérios diagnósticos, exames complementares (com valores de corte), diagnósticos diferenciais. Use bullets quando útil.
- "conduct": tratamento estruturado — medidas gerais, farmacológico (DOSES COMPLETAS), não-farmacológico, critérios de internação/alta, seguimento. Use bullets ou numeração "1) 2) 3)".
- "key_points": 4–7 bullets do que mais cai na prova — números, mnemônicos, "first-line", critérios. Cada bullet começa com "• ".
- "pitfalls": 3–6 erros comuns / armadilhas frequentes da prova. Cada bullet começa com "• ".
- "sources": array de strings curtas com as fontes EFETIVAMENTE usadas. Ex.: ["PCDT MS — Pneumonia Adquirida na Comunidade 2023", "Diretriz SBPT 2018", "Bula ANVISA — Amoxicilina"].

VERIFIQUE cada dose, cada critério e cada valor de corte ANTES de gerar. Se não tiver certeza absoluta, generalize.`;

type GatewayChoice = { message?: { content?: string }; finish_reason?: string };

async function callGateway(apiKey: string, userText: string, model: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
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
    `Gere um RESUMO CLÍNICO completo e confiável para a estação abaixo.`,
    `Use SOMENTE Ministério da Saúde, ANVISA, PCDTs do SUS, diretrizes brasileiras das sociedades (SBC, SBP, FEBRASGO, SBPT, SBN, etc.), matriz do Revalida/INEP e guidelines internacionais consagradas quando alinhadas ao SUS.`,
    "",
    `TÍTULO DA ESTAÇÃO: ${input.title}`,
    `ÁREA: ${input.specialty}`,
    input.topic ? `TÓPICO: ${input.topic}` : "",
    "",
    input.educational_goal ? `OBJETIVO EDUCACIONAL:\n${input.educational_goal}` : "",
    input.candidate_task ? `\nTAREFA DO CANDIDATO:\n${input.candidate_task}` : "",
    input.clinical_case ? `\nCASO CLÍNICO (use apenas para inferir o tema; NÃO cite o paciente no resumo):\n${input.clinical_case.slice(0, 4000)}` : "",
    input.expected_conduct ? `\nCONDUTA ESPERADA:\n${input.expected_conduct.slice(0, 3000)}` : "",
    input.common_mistakes ? `\nERROS COMUNS:\n${input.common_mistakes.slice(0, 2000)}` : "",
    input.scoring_criteria ? `\nCRITÉRIOS DE AVALIAÇÃO:\n${input.scoring_criteria.slice(0, 2000)}` : "",
    refs ? `\nREFERÊNCIAS DECLARADAS NA ESTAÇÃO:\n${refs}` : "",
    "",
    "Retorne SOMENTE o JSON do schema. Verifique cada dose, valor de corte e critério antes de gerar — se houver dúvida, generalize com segurança.",
  ].filter(Boolean).join("\n");
}

export const generateSummaryFromStation = createServerFn({ method: "POST" })
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

    const sourcesBlock = result.sources && result.sources.length
      ? `\n\nFontes utilizadas:\n${result.sources.map((s) => `• ${s}`).join("\n")}`
      : "";

    const { data: row, error } = await supabase
      .from("summaries")
      .insert({
        created_by: userId,
        title: result.title.slice(0, 200),
        specialty: data.specialty,
        topic: result.topic ?? data.topic ?? null,
        difficulty: result.difficulty,
        read_time_minutes: result.read_time_minutes,
        high_yield: result.high_yield,
        definition: result.definition,
        clinical_picture: result.clinical_picture,
        diagnosis: result.diagnosis,
        conduct: result.conduct,
        key_points: result.key_points,
        pitfalls: result.pitfalls,
        content_md: sourcesBlock.trim(),
        published: false,
      })
      .select("id, title, specialty, topic, difficulty, read_time_minutes, high_yield, definition, clinical_picture, diagnosis, conduct, key_points, pitfalls, content_md")
      .single();
    if (error || !row) throw new Error(error?.message || "Falha ao salvar o resumo");

    return { summary: row };
  });
