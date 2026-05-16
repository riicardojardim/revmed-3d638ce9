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

const SYSTEM_PROMPT = `Você é um assistente que extrai estações clínicas estilo OSCE/Revalida a partir de PDFs em português.

Devolva SOMENTE JSON válido seguindo este schema:
{
  "title": string,
  "specialty": "Clínica Médica" | "Pediatria" | "Ginecologia e Obstetrícia" | "Cirurgia" | "Medicina da Família" | "Urgência e Emergência",
  "educational_goal": string,
  "competencies": string[],
  "clinical_case": string,
  "candidate_task": string,
  "patient_info": string,
  "support_materials": string,
  "patient_profile": {
    "name": string, "age": string, "sex": string, "city": string, "profession": string,
    "chiefComplaint": string, "hpi": string, "personalHistory": string, "medications": string,
    "allergies": string, "familyHistory": string, "habits": string, "symptoms": string,
    "vitals": string, "previousExams": string,
    "spontaneous": string, "onlyIfAsked": string, "doNotReveal": string,
    "emotionalTone": string, "actingTips": string
  },
  "deliverable_materials": [
    { "name": string, "type": "Impresso"|"Exame laboratorial"|"Exame de imagem"|"ECG"|"Outro",
      "description": string, "content": string }
  ],
  "expected_conduct": string,
  "common_mistakes": string,
  "evaluator_notes": string,
  "scoring_criteria": string,
  "checklist_items": [
    {
      "description": string,
      "category": string,
      "points": number,
      "helper_text": string,
      "levels": [
        { "label": "Inadequado", "points": 0, "description": string },
        { "label": "Parcialmente adequado", "points": number, "description": string },
        { "label": "Adequado", "points": number, "description": string }
      ]
    }
  ]
}

Regras:
- Itens do checklist devem seguir o PEP graduado: 3 níveis (Inadequado/Parcialmente adequado/Adequado).
- "category" deve ser numerada ("1. Apresentação", "2. Anamnese", ...).
- Se houver vários PDFs, COMBINE as informações em uma única estação.
- Se um campo não existir no PDF, deixe vazio (string vazia ou array vazio).
- NUNCA invente dados clínicos que não estejam nos PDFs.
- Retorne SOMENTE o objeto JSON, sem markdown, sem texto extra.`;

export const parseStationPdfs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor");

    const userContent: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Extraia a estação clínica destes ${data.pdfs.length} PDF(s) e devolva JSON.`,
      },
    ];
    for (const f of data.pdfs) {
      userContent.push({
        type: "image_url",
        image_url: { url: f.dataUrl },
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 110_000);
    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
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
      choices?: Array<{ message?: { content?: string } }>;
    };
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
