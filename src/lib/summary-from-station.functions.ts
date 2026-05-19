import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ChecklistItemSchema = z.object({
  description: z.string().min(1).max(2000),
  category: z.string().max(120).optional().nullable(),
  points: z.number().optional().nullable(),
  helper_text: z.string().max(2000).optional().nullable(),
});

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
  references: z
    .array(z.object({ label: z.string(), url: z.string().optional() }))
    .max(40)
    .optional(),
  checklist_items: z
    .array(ChecklistItemSchema)
    .min(1, "O checklist (PEP) precisa ter pelo menos 1 item preenchido para gerar o resumo.")
    .max(200),
});

const coerceText = (max: number, min = 10) =>
  z.preprocess((value) => {
    if (value == null) return "";
    if (Array.isArray(value))
      return value
        .map((v) => String(v ?? ""))
        .join("\n")
        .trim()
        .slice(0, max);
    return String(value).trim().slice(0, max);
  }, z.string().min(min).max(max));

const ResultSchema = z.object({
  title: coerceText(200, 3),
  topic: z
    .preprocess(
      (value) => (value == null ? null : String(value).trim().slice(0, 200)),
      z.string().max(200).nullable(),
    )
    .optional(),
  difficulty: z
    .preprocess(
      (value) => {
        const v = String(value ?? "").toLowerCase();
        if (v.includes("av")) return "Avançado";
        if (v.includes("b")) return "Básico";
        return "Intermediário";
      },
      z.enum(["Básico", "Intermediário", "Avançado"]),
    )
    .default("Intermediário"),
  read_time_minutes: z.coerce.number().int().min(2).max(30).catch(7),
  high_yield: z
    .preprocess((value) => {
      if (typeof value === "string") return /^(true|sim|yes|1|alta)/i.test(value.trim());
      return value;
    }, z.boolean())
    .catch(false),
  definition: coerceText(3500, 20),
  clinical_picture: coerceText(4500, 20),
  diagnosis: coerceText(5000, 20),
  conduct: coerceText(7000, 20),
  key_points: coerceText(3500, 10),
  pitfalls: coerceText(3500, 10),
  sources: z
    .preprocess(
      (value) => {
        const list = Array.isArray(value) ? value : value ? [value] : [];
        return list
          .map((s) => String(s).trim().slice(0, 200))
          .filter(Boolean)
          .slice(0, 15);
      },
      z.array(z.string().max(200)).max(15),
    )
    .default([]),
});

function normalizeGatewayResult(value: unknown) {
  const data =
    typeof value === "object" && value !== null ? { ...(value as Record<string, unknown>) } : {};

  if (typeof data.read_time_minutes === "string") {
    const match = data.read_time_minutes.match(/\d+/);
    data.read_time_minutes = match ? Number(match[0]) : 7;
  }

  if (typeof data.high_yield === "string") {
    data.high_yield = /^(true|sim|yes|1|alta)/i.test(data.high_yield.trim());
  }

  for (const key of [
    "definition",
    "clinical_picture",
    "diagnosis",
    "conduct",
    "key_points",
    "pitfalls",
  ] as const) {
    if (data[key] != null) data[key] = String(data[key]);
  }

  return data;
}

const SYSTEM_PROMPT = `Você é um professor médico brasileiro, especialista em preparação para o Revalida/INEP, com domínio profundo de medicina baseada em evidências.

Sua tarefa: gerar um RESUMO CLÍNICO de altíssima qualidade a partir do contexto de uma ESTAÇÃO clínica (OSCE). Retorne SOMENTE JSON válido (sem markdown, sem cercas \`\`\`).

IMPORTANTE PARA O JSON:
- "read_time_minutes" deve ser número inteiro, não string.
- "high_yield" deve ser booleano true/false, não string.
- Cada seção textual deve ser objetiva: use no máximo 6 bullets ou 2 parágrafos curtos por campo para evitar respostas longas demais.

REGRAS DE CONTEÚDO (não negociáveis — segurança do paciente vem primeiro):
1. FONTES PERMITIDAS (use SOMENTE estas — qualquer outra é PROIBIDA):
   - Ministério da Saúde (MS): PCDTs, Cadernos de Atenção Básica, Protocolos Clínicos, manuais oficiais
   - ANVISA: bulas oficiais, RDCs, alertas de farmacovigilância (doses, contraindicações, interações)
   - Biblioteca Virtual em Saúde (BVS/BIREME) e Google Saúde (Google Health) como apoio de consulta
   - Diretrizes brasileiras vigentes das sociedades médicas: SBC, SBP, FEBRASGO, SBI, SBPT, SBN, SBD, SBEM, SBR, SBOT, SBU, SBMFC, SBGG, ABP
   - INEP / matriz oficial e provas anteriores do Revalida
   - Guidelines internacionais consagradas QUANDO aplicáveis ao SUS: WHO/OMS, OPAS, CDC, NICE, AHA, ACOG, GINA, GOLD, ADA, KDIGO, IDSA
   - Bases secundárias de apoio: UpToDate, BMJ Best Practice, Cochrane (apenas como confirmação)
2. FONTES PROIBIDAS (NUNCA cite e NUNCA use como base): blogs, sites comerciais de farmácias, fóruns, ChatGPT/IA, Wikipedia, sites de notícias leigas, materiais de cursinhos sem referência primária, "minutos com seu médico", redes sociais.
3. NÃO invente doses, esquemas terapêuticos, critérios diagnósticos, valores de corte, nomes comerciais ou condutas. Toda informação precisa ser RASTREÁVEL a uma das fontes permitidas acima.
4. Se houver qualquer dúvida razoável sobre um dado específico, prefira uma orientação mais geral e segura — OMITIR é melhor que CHUTAR.
5. SEMPRE que citar medicamento: dose com unidade explícita (mg, mg/kg/dia, UI, mL), via, intervalo e duração. Cite a fonte (MS/ANVISA/diretriz) entre parênteses quando relevante.
6. NÃO cite o nome do paciente da estação — o resumo deve ser GENERALIZÁVEL sobre a condição clínica, NÃO sobre o caso específico.
7. Tom direto, didático, em português do Brasil. Use terminologia padrão (CID-10/11, DeCS).

REGRAS DE FORMATO (cada campo textual é uma string, NÃO HTML, NÃO markdown):
- "title": copie EXATAMENTE o título da estação informado pelo usuário.
- "topic": subtema opcional (ex.: "Tratamento ambulatorial").
- "difficulty": "Básico" | "Intermediário" | "Avançado" — proporcional à complexidade do tema na prova.
- "read_time_minutes": estimativa honesta (5–12 minutos típico).
- "high_yield": true SOMENTE se for tema de alta incidência no Revalida.
- "definition": 1 parágrafo + epidemiologia rápida e fisiopatologia essencial.
- "clinical_picture": sinais e sintomas em bullets curtos (use "• " no início de cada linha). Inclua red flags.
- "diagnosis": critérios diagnósticos, exames complementares (com valores de corte), diagnósticos diferenciais. Use bullets quando útil.
- "conduct": tratamento estruturado e direto — medidas gerais, farmacológico (DOSES COMPLETAS), não-farmacológico, critérios de internação/alta, seguimento. Máximo 6 bullets.
- "key_points": 4–7 bullets do que mais cai na prova — números, mnemônicos, "first-line", critérios. Cada bullet começa com "• ".
- "pitfalls": 3–6 erros comuns / armadilhas frequentes da prova. Cada bullet começa com "• ".
- "sources": array de strings curtas com as fontes EFETIVAMENTE usadas. Ex.: ["MS — PCDT Pneumonia Adquirida na Comunidade 2023", "SBPT — Diretriz PAC 2018", "ANVISA — bula Amoxicilina"].

CITAÇÕES INLINE (OBRIGATÓRIO — aumenta confiabilidade e rastreabilidade):
- Em CADA seção textual (definition, clinical_picture, diagnosis, conduct, key_points, pitfalls), insira citações inline entre colchetes imediatamente após a afirmação que sustentam.
- Formato curto e padronizado: [MS — PCDT <tema> <ano>], [ANVISA — bula <fármaco>], [Diretriz SBC <ano>], [SBP — <documento> <ano>], [FEBRASGO <ano>], [WHO <ano>], [INEP — Matriz Revalida].
- Toda dose, valor de corte, critério diagnóstico, esquema terapêutico e conduta DEVE ter pelo menos uma citação inline.
- As mesmas fontes citadas inline devem aparecer (sem colchetes, com descrição completa) no array "sources".
- Exemplo de conduct: "Amoxicilina 500 mg VO 8/8h por 7 dias [MS — PCDT PAC 2023] [ANVISA — bula Amoxicilina]."
- Exemplo de diagnosis: "• PA ≥ 140×90 mmHg em 2 medidas [Diretriz SBC HAS 2020]."

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
        max_tokens: 3800,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429)
      throw new Error("Limite de uso da IA atingido. Aguarde alguns instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`AI Gateway ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: GatewayChoice[] };
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
  return ResultSchema.parse(normalizeGatewayResult(parsed));
}

function buildUserPrompt(input: z.infer<typeof InputSchema>): string {
  const refs = (input.references ?? [])
    .map((r) => `- ${r.label}${r.url ? ` (${r.url})` : ""}`)
    .join("\n");
  const checklistBlock = input.checklist_items
    .map((it, idx) => {
      const cat = it.category ? ` [${it.category}]` : "";
      const pts = typeof it.points === "number" ? ` (${it.points} pt)` : "";
      const helper = it.helper_text ? `\n     ↳ ${it.helper_text}` : "";
      return `  ${idx + 1}.${cat} ${it.description}${pts}${helper}`;
    })
    .join("\n");
  return [
    `Gere um RESUMO CLÍNICO completo e confiável para a estação abaixo.`,
    `O CHECKLIST (PEP) abaixo é a FONTE PRIMÁRIA do conteúdo: cubra TODOS os tópicos que ele cobra, na ordem clínica adequada. O resumo deve ensinar o aluno a executar cada item do PEP com segurança.`,
    `Use SOMENTE Ministério da Saúde, ANVISA, PCDTs do SUS, diretrizes brasileiras das sociedades (SBC, SBP, FEBRASGO, SBPT, SBN, etc.), matriz do Revalida/INEP e guidelines internacionais consagradas quando alinhadas ao SUS.`,
    "",
    `TÍTULO DA ESTAÇÃO (use EXATAMENTE este texto no campo "title" do JSON — não reescreva, não encurte): ${input.title}`,
    `ÁREA: ${input.specialty}`,
    input.topic ? `TÓPICO: ${input.topic}` : "",
    "",
    `CHECKLIST / PEP (cada item é um critério avaliado — o resumo deve dar base científica a TODOS):\n${checklistBlock}`,
    "",
    input.educational_goal ? `OBJETIVO EDUCACIONAL:\n${input.educational_goal}` : "",
    input.candidate_task ? `\nTAREFA DO CANDIDATO:\n${input.candidate_task}` : "",
    input.clinical_case
      ? `\nCASO CLÍNICO (use apenas para inferir o tema; NÃO cite o paciente no resumo):\n${input.clinical_case.slice(0, 4000)}`
      : "",
    input.expected_conduct ? `\nCONDUTA ESPERADA:\n${input.expected_conduct.slice(0, 3000)}` : "",
    input.common_mistakes ? `\nERROS COMUNS:\n${input.common_mistakes.slice(0, 2000)}` : "",
    input.scoring_criteria
      ? `\nCRITÉRIOS DE AVALIAÇÃO:\n${input.scoring_criteria.slice(0, 2000)}`
      : "",
    refs ? `\nREFERÊNCIAS DECLARADAS NA ESTAÇÃO:\n${refs}` : "",
    "",
    `Retorne SOMENTE o JSON do schema. O campo "title" deve ser EXATAMENTE "${input.title}". Verifique cada dose, valor de corte e critério antes de gerar — se houver dúvida, generalize com segurança.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ============================================================
// CAMADA 1 — Validação estrutural determinística
// ============================================================
type StructIssue = { field: string; severity: "error" | "warn"; message: string };

const CITATION_RE = /\[[^\]\n]{3,120}\]/;
const DOSE_NO_UNIT_RE =
  /\b\d+(?:[.,]\d+)?\s*(?!mg|mcg|µg|g\b|kg|ml|mL|L\b|UI|U\b|gotas|cp|cps|comprimid|%|mmHg|mEq|mmol|mol|h\b|dia|min|sem|°C|x\/dia|\/dia|\/kg|\/m²|anos?|meses)[a-zA-Zµ]{1,4}\b/;
const PLACEHOLDER_RE = /\b(xxx+|\?\?\?+|TODO|FIXME|lorem ipsum|placeholder)\b/i;
const LOW_CONFIDENCE_RE =
  /\b(talvez|possivelmente|pode ser que|acredito que|n[aã]o tenho certeza)\b/i;

function structuralCheck(r: z.infer<typeof ResultSchema>): StructIssue[] {
  const issues: StructIssue[] = [];
  const fields: Array<[keyof z.infer<typeof ResultSchema>, string, boolean]> = [
    ["definition", "Definição", false],
    ["clinical_picture", "Quadro clínico", false],
    ["diagnosis", "Diagnóstico", true],
    ["conduct", "Conduta", true],
    ["key_points", "Pontos-chave", true],
    ["pitfalls", "Armadilhas", false],
  ];
  for (const [key, label, requireCit] of fields) {
    const text = String(r[key] ?? "");
    if (!text.trim()) {
      issues.push({ field: label, severity: "error", message: "Seção vazia." });
      continue;
    }
    if (requireCit && !CITATION_RE.test(text)) {
      issues.push({
        field: label,
        severity: "error",
        message: "Falta citação inline (ex.: [MS — PCDT ...]).",
      });
    }
    if (PLACEHOLDER_RE.test(text)) {
      issues.push({ field: label, severity: "error", message: "Placeholder não preenchido." });
    }
    if (LOW_CONFIDENCE_RE.test(text)) {
      issues.push({
        field: label,
        severity: "warn",
        message: "Linguagem de baixa confiança — generalize ou cite a fonte.",
      });
    }
  }
  if (DOSE_NO_UNIT_RE.test(r.conduct)) {
    issues.push({
      field: "Conduta",
      severity: "warn",
      message: "Possível número sem unidade clara (mg, mg/kg, UI, mL...).",
    });
  }
  if (!r.sources || r.sources.length < 2) {
    issues.push({
      field: "Referências",
      severity: "error",
      message: "Menos de 2 fontes oficiais declaradas.",
    });
  }
  return issues;
}

// ============================================================
// CAMADA 2 — Fact-check IA (segundo modelo como revisor)
// ============================================================
const VerifierResultSchema = z.object({
  verdict: z.enum(["aprovado", "aprovado_com_correcoes", "reprovado"]),
  issues: z
    .array(
      z.object({
        field: z.string().max(60),
        severity: z.enum(["error", "warn"]),
        message: z.string().max(400),
      }),
    )
    .max(20)
    .default([]),
  corrections: z
    .object({
      definition: z.string().optional(),
      clinical_picture: z.string().optional(),
      diagnosis: z.string().optional(),
      conduct: z.string().optional(),
      key_points: z.string().optional(),
      pitfalls: z.string().optional(),
    })
    .default({}),
});

const VERIFIER_SYSTEM = `Você é um REVISOR médico sênior brasileiro, especialista em medicina baseada em evidências e na matriz do Revalida/INEP.

Sua tarefa: AUDITAR um resumo clínico já gerado por outra IA, validando cada DOSE, CRITÉRIO DIAGNÓSTICO, VALOR DE CORTE e CONDUTA contra fontes brasileiras oficiais (MS/PCDTs, ANVISA, diretrizes SBC/SBP/FEBRASGO/SBPT/SBN/SBD/SBI/SBEM) e guidelines internacionais consagradas alinhadas ao SUS.

Retorne SOMENTE JSON válido:
{
  "verdict": "aprovado" | "aprovado_com_correcoes" | "reprovado",
  "issues": [{ "field": "Conduta|Diagnóstico|...", "severity": "error|warn", "message": "explicação curta" }],
  "corrections": { "conduct": "...", "diagnosis": "...", ... }
}

CRITÉRIOS:
- "error" = informação INCORRETA, perigosa ao paciente ou inventada (dose errada, critério inexistente, fármaco contraindicado, conduta fora do protocolo brasileiro, ausência de citação em afirmação crítica).
- "warn" = correto mas impreciso, sem unidade, desatualizado ou sem citação.
- "reprovado" = ≥1 error grave que não pode ser corrigido sem reescrita completa.
- "aprovado_com_correcoes" = errors corrigíveis — em "corrections" forneça o texto INTEIRO da seção corrigida (mantendo formato bullets "• ", citações inline entre colchetes, doses com unidade explícita).
- "aprovado" = sem errors, apenas warns leves.

Na dúvida sobre uma dose ou critério: marque como error e generalize com segurança na correção.`;

async function verifySummary(apiKey: string, r: z.infer<typeof ResultSchema>, specialty: string) {
  const userText = [
    `ESPECIALIDADE: ${specialty}`,
    `TÍTULO: ${r.title}`,
    `\nDEFINIÇÃO:\n${r.definition}`,
    `\nQUADRO CLÍNICO:\n${r.clinical_picture}`,
    `\nDIAGNÓSTICO:\n${r.diagnosis}`,
    `\nCONDUTA:\n${r.conduct}`,
    `\nPONTOS-CHAVE:\n${r.key_points}`,
    `\nARMADILHAS:\n${r.pitfalls}`,
    `\nFONTES DECLARADAS:\n${(r.sources ?? []).map((s) => `- ${s}`).join("\n")}`,
    "",
    "Audite rigorosamente. Retorne SOMENTE o JSON do schema.",
  ].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: VERIFIER_SYSTEM },
          { role: "user", content: userText },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1400,
        temperature: 0,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Verifier ${res.status}`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
    return VerifierResultSchema.parse(parsed);
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// Helper exportado para reuso (geração única + batch)
// ============================================================
type SupabaseClientLike = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => {
      select: (cols: string) => {
        single: () => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
  };
};

export async function generateAndSaveSummary(
  input: z.infer<typeof InputSchema>,
  supabase: SupabaseClientLike,
  userId: string,
) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor");

  const prompt = buildUserPrompt(input);
  let result: z.infer<typeof ResultSchema>;
  try {
    result = await callGateway(apiKey, prompt, "google/gemini-3-flash-preview", 65_000);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isRecoverable = /abort|timeout|504|502|503|upstream|rate/i.test(msg);
    if (!isRecoverable) throw err;
    result = await callGateway(apiKey, prompt, "google/gemini-2.5-flash", 45_000);
  }

  let structIssues = structuralCheck(result);

  let verifier: z.infer<typeof VerifierResultSchema> | null = null;
  try {
    verifier = await verifySummary(apiKey, result, input.specialty);
    const c = verifier.corrections ?? {};
    if (c.definition) result.definition = c.definition;
    if (c.clinical_picture) result.clinical_picture = c.clinical_picture;
    if (c.diagnosis) result.diagnosis = c.diagnosis;
    if (c.conduct) result.conduct = c.conduct;
    if (c.key_points) result.key_points = c.key_points;
    if (c.pitfalls) result.pitfalls = c.pitfalls;
    structIssues = structuralCheck(result);
  } catch (err) {
    console.warn("[summary-verifier] falhou, seguindo com checagem estrutural apenas:", err);
  }

  const verifierIssues = verifier?.issues ?? [];
  const allIssues = [...structIssues, ...verifierIssues];
  const hasBlockingError =
    verifier?.verdict === "reprovado" || structIssues.some((i) => i.severity === "error");

  // Nas notas/referências mostramos APENAS as fontes utilizadas — sem nenhuma
  // menção a validação por IA, veredito ou avisos automáticos (visível ao usuário).
  const sourcesBlock =
    result.sources && result.sources.length
      ? `Fontes utilizadas:\n${result.sources.map((s) => `• ${s}`).join("\n")}`
      : "";

  const { data: row, error } = await supabase
    .from("summaries")
    .insert({
      created_by: userId,
      station_id: input.station_id ?? null,
      title: input.title.slice(0, 200),
      specialty: input.specialty,
      topic: result.topic ?? input.topic ?? null,
      difficulty: result.difficulty,
      read_time_minutes: result.read_time_minutes,
      high_yield: result.high_yield && !hasBlockingError,
      definition: result.definition,
      clinical_picture: result.clinical_picture,
      diagnosis: result.diagnosis,
      conduct: result.conduct,
      key_points: result.key_points,
      pitfalls: result.pitfalls,
      content_md: (sourcesBlock + auditBlock).trim(),
      published: false,
    })
    .select(
      "id, title, specialty, topic, difficulty, read_time_minutes, high_yield, definition, clinical_picture, diagnosis, conduct, key_points, pitfalls, content_md, station_id",
    )
    .single();
  if (error || !row) throw new Error(error?.message || "Falha ao salvar o resumo");

  return {
    summary: row,
    validation: {
      verdict: verifier?.verdict ?? "indisponivel",
      blocking: hasBlockingError,
      issues: allIssues,
    },
  };
}

export const generateSummaryFromStation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    return generateAndSaveSummary(
      data,
      context.supabase as unknown as SupabaseClientLike,
      context.userId,
    );
  });
