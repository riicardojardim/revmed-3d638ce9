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

2) deliverable_materials (impressos / exames entregáveis pelo avaliador)
   - Extraia TODOS os impressos do PDF (Exame físico, exames laboratoriais, ECG, exames de imagem, foto, prescrição em branco, etc.).
   - "name": ex. "Impresso 1 ( Exame físico )", "Impresso 2 ( Exames laboratoriais )".
   - "type": "Exame físico" | "Exame laboratorial" | "Exame de imagem" | "ECG" | "Impresso" | "Outro" (use o texto natural do PDF).
   - "description": gatilho de entrega, ex.: "Entregue após solicitação do exame físico.", "Entregue se solicitar exames laboratoriais.".
   - "content": TRANSCREVA na íntegra (sinais vitais, valores de exames com unidades, laudo, imagem descrita, etc.). Não resuma.

3) patient_script (INSTRUÇÕES DO ATOR — fala/atuação do paciente simulado)
   - Texto corrido com o que o ator DEVE dizer e como deve agir. Inclua tom emocional, postura, fala espontânea inicial, respostas a perguntas, e o que NÃO revelar a menos que perguntado.
   - Se o PDF tiver seções tipo "Instruções ao ator", "Paciente simulado", "Roteiro do ator" — copie integralmente nesse campo.

4) patient_profile (estrutura espelha "Acidente por aranha")
   - hpi: "Tempo de evolução: …\\nLocal: …\\nDor: …\\nIntensidade: …\\nIrradiação: …\\nTipo de dor: …"
   - symptoms: "Vômitos: …\\nAlterações visuais: …\\nSialorreia: …\\nPriapismo: …\\nAstenia: …"
   - habits: "Álcool: …\\nCigarro: …\\nDrogas: …"
   - personalHistory: "Doenças: …\\nCartão de vacina: …"
   - onlyIfAsked: começa por "Se perguntado por …: responder que …"
   - chiefComplaint: fala literal do paciente ("Estava limpando o quintal …").

5) candidate_task
   - Sempre no formato: "Nos X minutos de duração da estação, você deverá executar as seguintes tarefas:\\n\\n- Tarefa 1;\\n- Tarefa 2;\\n- …".

6) specialty
   - Um dos: "Clínica Médica" | "Pediatria" | "Ginecologia e Obstetrícia" | "Cirurgia" | "Medicina da Família" | "Urgência e Emergência".

================================================================
REGRAS GERAIS
================================================================
- Se houver vários PDFs, COMBINE em uma única estação.
- NUNCA invente dados clínicos. Se um campo não existe no PDF, deixe vazio ("" ou []).
- Preserve unidades, frações e números EXATAMENTE como aparecem (use ponto decimal: 0.25, 1.75).
- Não use markdown nem cercas \`\`\`. Devolva APENAS o objeto JSON.

Schema do JSON:
{
  "title": string,
  "specialty": string,
  "educational_goal": string,
  "competencies": string[],
  "clinical_case": string,
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

export const parseStationPdfs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor");

    const userContent: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Extraia a estação clínica destes ${data.pdfs.length} PDF(s) seguindo EXATAMENTE o padrão do gold standard descrito no system prompt. Não deixe de extrair: instruções do ator (patient_script), TODOS os impressos com conteúdo na íntegra, e checklist com categorias variadas + sub-itens "(1)... (2)..." dentro da description.`,
      },
    ];
    for (const f of data.pdfs) {
      userContent.push({
        type: "image_url",
        image_url: { url: f.dataUrl },
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 170_000);
    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Falha de rede com o gateway de IA: ${msg}. Tente novamente, reduza o número de PDFs ou use arquivos menores.`,
      );
    }
    clearTimeout(timer);

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 504 || /timeout/i.test(txt)) {
        throw new Error(
          "A IA demorou demais para ler os PDFs (timeout). Tente enviar menos arquivos por vez ou um PDF menor.",
        );
      }
      if (res.status === 429) throw new Error("Limite de uso da IA atingido. Aguarde alguns instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados.");
      throw new Error(`AI Gateway falhou (${res.status}): ${txt.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    };
    const finish = json.choices?.[0]?.finish_reason;
    if (finish === "length") {
      throw new Error("A resposta da IA foi cortada (limite de tokens). Envie PDFs menores ou separe em pedaços.");
    }
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      // try to extract a json object
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
    const result = ResultSchema.parse(parsed);
    return result;
  });
