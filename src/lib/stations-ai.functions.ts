import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  pdfs: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        // data URI: data:application/pdf;base64,XXXX
        dataUrl: z.string().min(20).max(20_000_000),
      }),
    )
    .min(1)
    .max(5),
});

const ResultSchema = z.object({
  title: z.string().optional(),
  specialty: z.string().optional(),
  educational_goal: z.string().optional(),
  competencies: z.array(z.string()).optional(),
  clinical_case: z.string().optional(),
  case_description: z.string().optional(),
  candidate_task: z.string().optional(),
  patient_info: z.string().optional(),
  patient_script: z.string().optional(),
  support_materials: z.string().optional(),
  patient_profile: z
    .object({
      name: z.string().optional(),
      age: z.string().optional(),
      sex: z.string().optional(),
      city: z.string().optional(),
      profession: z.string().optional(),
      chiefComplaint: z.string().optional(),
      hpi: z.string().optional(),
      personalHistory: z.string().optional(),
      medications: z.string().optional(),
      allergies: z.string().optional(),
      familyHistory: z.string().optional(),
      habits: z.string().optional(),
      symptoms: z.string().optional(),
      vitals: z.string().optional(),
      previousExams: z.string().optional(),
      spontaneous: z.string().optional(),
      onlyIfAsked: z.string().optional(),
      doNotReveal: z.string().optional(),
      emotionalTone: z.string().optional(),
      actingTips: z.string().optional(),
    })
    .optional(),
  deliverable_materials: z
    .array(
      z.object({
        name: z.string(),
        type: z.string().optional(),
        description: z.string().optional(),
        content: z.string().optional(),
      }),
    )
    .optional(),
  expected_conduct: z.string().optional(),
  common_mistakes: z.string().optional(),
  evaluator_notes: z.string().optional(),
  scoring_criteria: z.string().optional(),
  checklist_items: z
    .array(
      z.object({
        description: z.string(),
        category: z.string().optional(),
        points: z.number().optional(),
        helper_text: z.string().optional(),
        levels: z
          .array(
            z.object({
              label: z.string(),
              points: z.number(),
              description: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

const SYSTEM_PROMPT = `Você extrai estações clínicas estilo OSCE/Revalida de PDFs em português e devolve SOMENTE JSON válido (sem markdown, sem comentários).

REGRA MÁXIMA DE FIDELIDADE: transcreva apenas o texto que aparece no PDF. NÃO invente, NÃO complete lacunas, NÃO transforme tópicos em narrativa nova. Se uma seção não estiver legível/visível, deixe o campo vazio.

================================================================
PADRÃO OBRIGATÓRIO — siga EXATAMENTE este formato (estação "Acidente por aranha" é o gold standard):
================================================================

1) checklist_items
   - "category": nome curto da etapa SEM número. Use: "Comunicação", "Anamnese", "Exame físico", "Diagnóstico", "Conduta", "Orientação", "Procedimento", "Prescrição". NÃO coloque tudo como "Anamnese".
   - "description": começa SEMPRE com o número do item seguido de ponto, e quando houver sub-itens, liste-os no formato "(1) X;\\n(2) Y;\\n(3) Z." Exemplo real:
       "2. Realiza anamnese direcionada perguntando por:\\n(1) Tempo de evolução;\\n(2) Dor no local da picada;\\n(3) Salivação excessiva ou sialorreia;\\n(4) Vômitos;\\n(5) Priapismo;\\n(6) Sudorese;\\n(7) Limpeza da região afetada."
   - "points": pontuação MÁXIMA do item (0.25, 0.5, 0.75, 1.0, 1.5, 1.75, 2.0…). Use fracionário se for assim no PDF.
   - "levels": 2 ou 3 níveis com a regra de pontuação DENTRO do label:
       * 3 níveis quando há graduação parcial: "Inadequado: Pergunta por dois ou menos itens.", "Parcialmente adequado: Pergunta de três a cinco itens.", "Adequado: Pergunta seis ou sete itens."
       * 2 níveis para ações binárias: "Inadequado: Não solicita." / "Adequado: Solicita."
       * Os "points" de cada nível devem refletir o PEP do PDF (Ex.: 0 / 0.75 / 1.5).
   - NUNCA use labels genéricos como "Inadequado" sozinho — sempre inclua a regra concreta após os dois pontos.
   - Numere os itens em ordem (1., 2., 3., …) na "description".

2) deliverable_materials (impressos / exames entregáveis pelo avaliador) — OBRIGATÓRIO
   - Vasculhe TODO o PDF procurando seções como: "IMPRESSO 1", "IMPRESSO 2", "IMPRESSO N", "Material impresso", "Exame físico (resultado)", "Exames laboratoriais", "Exames complementares", "ECG", "Imagem", "Radiografia", "Tomografia", "USG", "Laudo", "Foto", "Prescrição em branco", "Receituário".
   - Extraia TODOS — não pule nenhum. Se o PDF tem "Impresso 1, 2, 3, 4", o array deve ter 4 itens, em ordem.
   - "name": use o TÍTULO LITERAL do impresso como aparece no PDF (ex.: "Impresso 1 - Exame físico", "Impresso 2 - Exames laboratoriais", "Impresso 3 - ECG").
   - "type": "Exame físico" | "Exame laboratorial" | "Exame de imagem" | "ECG" | "Impresso" | "Outro".
   - "description": gatilho de entrega quando o PDF indicar (ex.: "Entregue após solicitação do exame físico.", "Entregue se solicitar exames laboratoriais."). Se não houver gatilho explícito, deixe vazio.
   - "content": TRANSCREVA NA ÍNTEGRA o texto do impresso (sinais vitais com valores e unidades, todos os exames laboratoriais linha a linha com valores e unidades, laudo completo, descrição da imagem/foto, etc.). NÃO RESUMA, NÃO PARAFRASEIE. Para imagens/fotos sem texto, coloque uma breve descrição do que se vê (ex.: "Foto de lesão eritematosa em membro inferior direito") — o usuário fará o upload da imagem manualmente depois.
   - Se um impresso só contém imagem (foto, RX, TC) sem dados textuais, ainda assim CRIE o item com name e type corretos e content descrevendo brevemente a imagem.

3) patient_script (INSTRUÇÕES DO ATOR — fala/atuação do paciente simulado)
   - COPIE INTEGRALMENTE E FIELMENTE a seção do PDF chamada "INSTRUÇÕES AO ATOR", "INSTRUÇÕES DO ATOR", "ATOR", "PACIENTE SIMULADO" ou "ROTEIRO DO ATOR".
   - NÃO inclua o TÍTULO da seção (ex.: "INSTRUÇÕES AO ATOR/ATRIZ") — comece direto pelo conteúdo (DADOS PESSOAIS, etc.). O título já aparece no card do preview.
   - Preserve subtítulos, quebras de linha, bullets e ordem do texto original. SEMPRE deixe UMA LINHA EM BRANCO entre cada cabeçalho de seção em CAIXA ALTA (ex.: depois do bloco de "DADOS PESSOAIS", uma linha vazia, depois "MOTIVO DA CONSULTA", etc.).
   - NÃO crie respostas, sintomas, tom, medicações, hábitos ou histórico que não estejam escritos no PDF.
   - Se essa seção NÃO existir ou não estiver legível no PDF, deixe patient_script vazio e NÃO derive a partir da descrição do caso/PEP.

4) patient_profile (estrutura espelha "Acidente por aranha")
   - Preencha estes campos SOMENTE a partir da seção de ator/paciente simulado. Se o PDF não tiver essa seção, deixe patient_profile vazio ({}).
   - hpi: "Tempo de evolução: …\\nLocal: …\\nDor: …\\nIntensidade: …\\nIrradiação: …\\nTipo de dor: …"
   - symptoms: "Vômitos: …\\nAlterações visuais: …\\nSialorreia: …\\nPriapismo: …\\nAstenia: …"
   - habits: "Álcool: …\\nCigarro: …\\nDrogas: …"
   - personalHistory: "Doenças: …\\nCartão de vacina: …"
   - onlyIfAsked: começa por "Se perguntado por …: responder que …"
   - chiefComplaint: fala literal do paciente ("Estava limpando o quintal …").

5) candidate_task
   - SOMENTE a lista de tarefas, começando direto pelos itens (ex.: "- Realizar anamnese direcionada;\\n- Solicitar exame físico;\\n- ..."). NÃO inclua o preâmbulo "Nos X minutos de duração da estação, você deverá executar as seguintes tarefas:" — esse texto já aparece no banner do preview.

6) specialty — VALORES PERMITIDOS (use EXATAMENTE um destes, mesmo que o PDF diga outra coisa):
   - "Clínica Médica"  (PDF: "Clínica Médica", "CM", "Medicina Interna")
   - "Pediatria"  (PDF: "Pediatria", "PED")
   - "Ginecologia e Obstetrícia"  (PDF: "GO", "G.O.", "Ginecologia", "Obstetrícia", "Tocoginecologia")
   - "Cirurgia"  (PDF: "Clínica Cirúrgica", "CC", "Cirurgia Geral", "CIRURGIA")
   - "Medicina da Família"  (PDF: "Medicina de Família e Comunidade", "MFC", "Saúde da Família", "Atenção Primária")
   - "Urgência e Emergência"  (PDF: "Urgência", "Emergência", "PS", "Pronto-Socorro", "UPA", "SAMU", "Trauma")
   - REGRA: PRIMEIRO procure a especialidade EXPLÍCITA no PDF (cabeçalho, área, "Especialidade:", banner). Se encontrar, mapeie para o enum acima e use. Se NÃO houver especialidade explícita, DEDUZA a partir do cenário+caso: paciente criança/lactente/RN → Pediatria; gestante/parto/puerpério/ginecológico → Ginecologia e Obstetrícia; UPA/PS/SAMU/trauma/emergência → Urgência e Emergência; UBS/ESF/atenção primária/saúde da família → Medicina da Família; pré/pós-operatório/abdome agudo cirúrgico/trauma cirúrgico → Cirurgia; demais quadros clínicos em ambulatório/hospital → Clínica Médica. NUNCA deixe specialty vazio se houver caso clínico — sempre escolha o valor mais provável do enum.

7) clinical_case  vs  case_description — SEPARE OS DOIS:
   - "clinical_case" = SEÇÃO "CENÁRIO DE ATENDIMENTO" do PDF. Contém: Nível de atenção, Tipo de atendimento, Infraestrutura disponível. NÃO inclua a narrativa do caso aqui.
   - "case_description" = SOMENTE a narrativa da SEÇÃO "DESCRIÇÃO DO CASO" do PDF ("Você atende um homem de 30 anos…"). NÃO inclua o bloco "Nos X minutos de duração da estação, você deverá executar as seguintes tarefas:" nem a lista de tarefas — isso vai SOMENTE em candidate_task.
   - Se o PDF não tiver "CENÁRIO DE ATENDIMENTO" explícito, deixe "clinical_case" vazio.

================================================================
REGRAS GERAIS
================================================================
- Se houver vários PDFs, COMBINE em uma única estação.
- NUNCA invente dados clínicos. Se um campo não existe no PDF, deixe vazio ("" ou []). Principalmente patient_script: só pode conter texto de seção de ator/paciente simulado.
- Preserve unidades, frações e números EXATAMENTE como aparecem (use ponto decimal: 0.25, 1.75).
- Não use markdown nem cercas \`\`\`. Devolva APENAS o objeto JSON.

Schema do JSON:
{
  "title": string,
  "specialty": string,
  "educational_goal": string,
  "competencies": string[],
  "clinical_case": string,
  "case_description": string,
  "candidate_task": string,
  "patient_info": string,
  "patient_script": string,
  "support_materials": string,
  "patient_profile": { ...campos acima },
  "deliverable_materials": [{ "name": string, "type": string, "description": string, "content": string }],
  "expected_conduct": string,
  "common_mistakes": string,
  "evaluator_notes": string,
  "scoring_criteria": string,
  "checklist_items": [{
    "description": string, "category": string, "points": number, "helper_text": string,
    "levels": [{ "label": string, "points": number, "description": string }]
  }]
}`;

type ParsedStation = z.infer<typeof ResultSchema>;

function gatewayHeaders(apiKey: string): HeadersInit {
  return {
    "Lovable-API-Key": apiKey,
    "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    "Content-Type": "application/json",
  };
}

function gatewayError(status: number, body: string): Error {
  const isTimeout = [408, 500, 502, 503, 504, 524].includes(status) && /timeout|timed out|upstream/i.test(body);
  const err = new Error(isTimeout ? "A IA demorou demais para responder. Vou tentar novamente automaticamente." : `AI Gateway ${status}: ${body.slice(0, 200)}`);
  (err as Error & { status?: number; retryable?: boolean }).status = status;
  (err as Error & { status?: number; retryable?: boolean }).retryable = isTimeout;
  return err;
}

async function callGateway(
  apiKey: string,
  pdfDataUrl: string,
  pdfName: string,
  model: string,
  timeoutMs: number,
): Promise<ParsedStation> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: gatewayHeaders(apiKey),
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
              text: `Extraia a estação clínica deste PDF "${pdfName}" seguindo EXATAMENTE o padrão do gold standard. Antes do JSON, localize mentalmente os cabeçalhos "CENÁRIO DE ATENDIMENTO", "DESCRIÇÃO DO CASO" e "INSTRUÇÕES AO ATOR" e copie cada seção para seu campo correto. Não derive nem invente orientações do ator; se não conseguir transcrever fielmente a seção do ator, deixe patient_script vazio. Não deixe de extrair TODOS os impressos com conteúdo na íntegra, e checklist com categorias variadas + sub-itens "(1)... (2)..." dentro da description.`,
              },
              { type: "image_url", image_url: { url: pdfDataUrl } },
            ],
          },
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
    throw gatewayError(res.status, txt);
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
  return cleanExtractedStation(ResultSchema.parse(parsed));
}

function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const status = (err as Error & { status?: number }).status;
  if (status && [408, 502, 503, 504, 524].includes(status)) return true;
  const msg = err.message.toLowerCase();
  return /timeout|timed out|upstream|aborted|network|fetch failed|econn|socket/.test(msg);
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i === attempts - 1 || !isRetryable(e)) throw e;
      // backoff: 2s, 5s
      await new Promise((r) => setTimeout(r, i === 0 ? 2000 : 5000));
    }
  }
  throw lastErr;
}

async function processPdf(apiKey: string, pdf: { name: string; dataUrl: string }): Promise<ParsedStation> {
  // GPT-5, timeout 5 min por tentativa, até 3 tentativas em caso de upstream timeout/5xx.
  return await withRetry(() => callGateway(apiKey, pdf.dataUrl, pdf.name, "openai/gpt-5", 300_000));
}


function pickLonger(a?: string, b?: string): string | undefined {
  const av = (a ?? "").trim();
  const bv = (b ?? "").trim();
  if (!av) return bv || undefined;
  if (!bv) return av || undefined;
  return bv.length > av.length ? bv : av;
}

function cleanExtractedStation(raw: ParsedStation): ParsedStation {
  const r = { ...raw };
  r.patient_script = (r.patient_script ?? "").trim();
  if (r.patient_script.length === 0) r.patient_profile = {};
  const clinical = (r.clinical_case ?? "").trim();
  const description = (r.case_description ?? "").trim();
  if (!description && /descri[cç][aã]o do caso/i.test(clinical)) {
    const [before, after] = clinical.split(/descri[cç][aã]o do caso:?/i);
    r.clinical_case = before.trim();
    r.case_description = after?.trim() || undefined;
  }
  if (description && /cen[aá]rio de atendimento/i.test(description)) {
    const parts = description.split(/descri[cç][aã]o do caso:?/i);
    const scenario = parts[0]?.replace(/cen[aá]rio de atendimento:?/i, "").trim();
    const caseText = parts.slice(1).join("Descrição do caso:").trim();
    if (scenario && !clinical) r.clinical_case = scenario;
    if (caseText) r.case_description = caseText;
  }
  // Extrai bloco "Nos X minutos..." do case_description -> candidate_task
  const desc = r.case_description ?? "";
  const taskMatch = desc.match(/Nos\s+\d+\s+minutos[\s\S]*$/i);
  if (taskMatch) {
    if (!(r.candidate_task ?? "").trim()) r.candidate_task = taskMatch[0].trim();
    // remove o bloco da descrição do caso (já aparece no banner/tarefa)
    r.case_description = desc.slice(0, taskMatch.index).trim();
  }
  // candidate_task: remove o preâmbulo "Nos X minutos... tarefas:" deixando só os itens
  if (r.candidate_task) {
    r.candidate_task = r.candidate_task
      .replace(/^\s*Nos\s+\d+\s+minutos[^\n:]*(de dura[cç][aã]o[^\n:]*)?(da esta[cç][aã]o)?[^\n:]*tarefas\s*:?\s*\n*/i, "")
      .trim();
  }
  // patient_script: remove o título "ORIENTAÇÕES AO ATOR/ATRIZ" do início
  if (r.patient_script) {
    let ps = r.patient_script
      .replace(/^\s*(instru[cç][oõ]es?|orienta[cç][oõ]es?)\s+(ao|do|da|a|à)s?\s+(ator(?:\s*\/?\s*atriz)?|atriz|paciente\s+simulado)\s*:?\s*\n*/i, "")
      .trim();
    // adiciona linha em branco antes de cabeçalhos em CAIXA ALTA (ex.: "DADOS PESSOAIS", "MOTIVO DA CONSULTA")
    ps = ps.replace(/([^\n])\n([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ \-/]{3,}:?)\s*\n/g, "$1\n\n$2\n");
    r.patient_script = ps;
  }
  const norm = normalizeSpecialty(r.specialty) ?? deduceSpecialtyFromContent(r);
  if (norm) r.specialty = norm;
  return r;
}

const SPECIALTY_ENUM = [
  "Clínica Médica", "Pediatria", "Ginecologia e Obstetrícia",
  "Cirurgia", "Medicina da Família", "Urgência e Emergência",
] as const;

function normalizeSpecialty(raw?: string): string | undefined {
  if (!raw) return undefined;
  const s = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (!s) return undefined;
  if (/(pediatr|crianc|lactente|neonat|reci?em.?nasc)/.test(s)) return "Pediatria";
  if (/(ginecolog|obstetr|tocoginec|\bgo\b|\bg\.o\.|gestant|gravid|pre.?natal|puerper|parto)/.test(s)) return "Ginecologia e Obstetrícia";
  if (/(cirurg|\bcc\b|pos.?operat|pre.?operat)/.test(s)) return "Cirurgia";
  if (/(familia|mfc|atencao primaria|saude da familia|esf|ubs|unidade basica)/.test(s)) return "Medicina da Família";
  if (/(urgencia|emergencia|\bps\b|pronto.?socorro|upa|samu|trauma)/.test(s)) return "Urgência e Emergência";
  if (/(clinica medica|medicina interna|\bcm\b)/.test(s)) return "Clínica Médica";
  const match = SPECIALTY_ENUM.find((e) => e.toLowerCase() === raw.trim().toLowerCase());
  return match;
}

function deduceSpecialtyFromContent(r: ParsedStation): string | undefined {
  const blob = [r.title, r.clinical_case, r.case_description, r.candidate_task, r.educational_goal, r.patient_info]
    .filter(Boolean).join(" \n ");
  if (!blob.trim()) return undefined;
  return normalizeSpecialty(blob);
}

function mergeResults(parts: ParsedStation[]): ParsedStation {
  if (parts.length === 1) {
    const r = { ...parts[0] };
    const norm = normalizeSpecialty(r.specialty) ?? deduceSpecialtyFromContent(r);
    if (norm) r.specialty = norm;
    return r;
  }
  const out: ParsedStation = {};
  const stringKeys: (keyof ParsedStation)[] = [
    "title", "specialty", "educational_goal", "clinical_case", "case_description", "candidate_task",
    "patient_info", "patient_script", "support_materials", "expected_conduct",
    "common_mistakes", "evaluator_notes", "scoring_criteria",
  ];
  for (const k of stringKeys) {
    for (const p of parts) {
      out[k] = pickLonger(out[k] as string | undefined, p[k] as string | undefined) as never;
    }
  }
  // competencies: union
  const comps = new Set<string>();
  for (const p of parts) (p.competencies ?? []).forEach((c) => comps.add(c));
  if (comps.size) out.competencies = [...comps];
  // patient_profile: merge field-by-field, prefer longer
  const profile: Record<string, string> = {};
  for (const p of parts) {
    const pp = p.patient_profile ?? {};
    for (const [k, v] of Object.entries(pp)) {
      if (typeof v === "string" && v.trim()) {
        profile[k] = pickLonger(profile[k], v) ?? v;
      }
    }
  }
  if (Object.keys(profile).length) out.patient_profile = profile;
  // deliverable_materials: concat, dedupe by name
  const seenMat = new Set<string>();
  const mats: NonNullable<ParsedStation["deliverable_materials"]> = [];
  for (const p of parts) {
    for (const m of p.deliverable_materials ?? []) {
      const key = (m.name || "").toLowerCase().trim();
      if (key && seenMat.has(key)) continue;
      if (key) seenMat.add(key);
      mats.push(m);
    }
  }
  if (mats.length) out.deliverable_materials = mats;
  // checklist_items: concat (renumbering happens client-side)
  const items: NonNullable<ParsedStation["checklist_items"]> = [];
  for (const p of parts) for (const it of p.checklist_items ?? []) items.push(it);
  if (items.length) out.checklist_items = items;
  const norm = normalizeSpecialty(out.specialty) ?? deduceSpecialtyFromContent(out);
  if (norm) out.specialty = norm;
  return out;
}

export const parseStationPdfs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor");

    // Process all PDFs in parallel — each one stays well under upstream timeout
    const settled = await Promise.allSettled(data.pdfs.map((p) => processPdf(apiKey, p)));
    const ok = settled.filter((s): s is PromiseFulfilledResult<ParsedStation> => s.status === "fulfilled").map((s) => s.value);
    if (ok.length === 0) {
      const first = settled[0];
      const msg = first.status === "rejected" ? (first.reason instanceof Error ? first.reason.message : String(first.reason)) : "Falha desconhecida";
      throw new Error(`Não foi possível ler os PDFs: ${msg}`);
    }
    return mergeResults(ok);
  });

const TextInputSchema = z.object({
  text: z.string().min(50).max(200_000),
});

async function callGatewayText(
  apiKey: string,
  text: string,
  model: string,
  timeoutMs: number,
): Promise<ParsedStation> {
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
          {
            role: "user",
            content: `Extraia a estação clínica do TEXTO abaixo seguindo EXATAMENTE o padrão do gold standard. Antes do JSON, localize mentalmente os cabeçalhos "CENÁRIO DE ATENDIMENTO", "DESCRIÇÃO DO CASO" e "INSTRUÇÕES AO ATOR" e copie cada seção para seu campo correto. Não derive nem invente orientações do ator; se não conseguir transcrever fielmente a seção do ator, deixe patient_script vazio. Não deixe de extrair TODOS os impressos com conteúdo na íntegra, e checklist com categorias variadas + sub-itens "(1)... (2)..." dentro da description.\n\n=== TEXTO DA ESTAÇÃO ===\n${text}\n=== FIM DO TEXTO ===`,
          },
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
    const err = new Error([408,502,503,504,524].includes(res.status) ? "A IA demorou demais para responder. Tente novamente em alguns instantes." : `AI Gateway ${res.status}: ${txt.slice(0, 200)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
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
  return cleanExtractedStation(ResultSchema.parse(parsed));
}

export const parseStationText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => TextInputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor");

    return await withRetry(() => callGatewayText(apiKey, data.text, "openai/gpt-5", 300_000));
  });


