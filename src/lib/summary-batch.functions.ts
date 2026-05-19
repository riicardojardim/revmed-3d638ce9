import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateAndSaveSummary } from "./summary-from-station.functions";

const InputSchema = z.object({
  station_ids: z.array(z.string().uuid()).min(1).max(30),
});

type ItemResult =
  | { station_id: string; status: "ok"; summary_id: string; title: string; verdict: string; blocking: boolean }
  | { station_id: string; status: "error"; message: string }
  | { station_id: string; status: "skipped"; reason: string };

export const batchGenerateSummariesFromStations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const results: ItemResult[] = [];

    const { data: stations, error } = await supabase
      .from("custom_stations")
      .select("id, title, specialty, clinical_case, candidate_task, educational_goal, expected_conduct, common_mistakes, scoring_criteria, bibliographic_references")
      .in("id", data.station_ids);

    if (error) throw new Error(error.message);
    const byId = new Map((stations ?? []).map((s) => [s.id as string, s] as const));

    // Carrega itens de checklist (PEP) de TODAS as estações em uma query
    const { data: allItems } = await supabase
      .from("station_checklist_items")
      .select("station_id, description, category, points, helper_text, order_index")
      .in("station_id", data.station_ids)
      .order("order_index");
    const itemsByStation = new Map<string, Array<{ description: string; category: string | null; points: number | null; helper_text: string | null }>>();
    for (const it of (allItems ?? []) as Array<{ station_id: string; description: string; category: string | null; points: number | null; helper_text: string | null }>) {
      const arr = itemsByStation.get(it.station_id) ?? [];
      arr.push({ description: it.description, category: it.category, points: it.points, helper_text: it.helper_text });
      itemsByStation.set(it.station_id, arr);
    }

    // Sequencial para evitar saturar o gateway/rate limit
    for (const id of data.station_ids) {
      const s = byId.get(id);
      if (!s) {
        results.push({ station_id: id, status: "skipped", reason: "Estação não encontrada." });
        continue;
      }
      const checklist = itemsByStation.get(id) ?? [];
      if (checklist.length === 0) {
        results.push({ station_id: id, status: "skipped", reason: "Checklist (PEP) vazio — preencha os itens antes de gerar o resumo." });
        continue;
      }
      try {
        const refs = Array.isArray(s.bibliographic_references)
          ? (s.bibliographic_references as Array<{ label?: string; url?: string }>).map((r) => ({
              label: String(r?.label ?? r?.url ?? "Fonte"),
              url: r?.url,
            }))
          : [];
        const out = await generateAndSaveSummary(
          {
            station_id: s.id as string,
            title: String(s.title ?? "Estação"),
            specialty: String(s.specialty ?? "Clínica Médica"),
            topic: null,
            clinical_case: s.clinical_case ?? null,
            candidate_task: s.candidate_task ?? null,
            educational_goal: s.educational_goal ?? null,
            expected_conduct: s.expected_conduct ?? null,
            common_mistakes: s.common_mistakes ?? null,
            scoring_criteria: s.scoring_criteria ?? null,
            references: refs.slice(0, 40),
            checklist_items: checklist.slice(0, 200),
          },
          supabase as never,
          userId,
        );
        results.push({
          station_id: id,
          status: "ok",
          summary_id: (out.summary as { id: string }).id,
          title: (out.summary as { title: string }).title,
          verdict: out.validation.verdict,
          blocking: out.validation.blocking,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ station_id: id, status: "error", message: msg.slice(0, 240) });
      }
    }

    const ok = results.filter((r) => r.status === "ok").length;
    const errors = results.filter((r) => r.status === "error").length;
    return { results, summary: { total: data.station_ids.length, ok, errors } };
  });
