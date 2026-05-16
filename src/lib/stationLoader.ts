import { supabase } from "@/integrations/supabase/client";
import { STATIONS, type Station, type ChecklistItem } from "@/data/stations";

export interface LoadedStation extends Station {
  patientScript: string;
  evaluatorNotes?: string;
  competencies?: string[];
  scoringCriteria?: string;
  postMaterials?: string;
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export async function loadStation(id: string): Promise<LoadedStation | null> {
  if (isUuid(id)) {
    const { data: s } = await supabase
      .from("custom_stations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!s) return null;
    const { data: items } = await supabase
      .from("station_checklist_items")
      .select("*")
      .eq("station_id", id)
      .order("order_index");
    const checklist: ChecklistItem[] = (items ?? []).map((it: { id: string; category: string; description: string; points: number }) => ({
      id: it.id,
      category: it.category as ChecklistItem["category"],
      description: it.description,
      points: it.points,
    }));
    return {
      id: s.id,
      slug: s.id,
      title: s.title,
      specialty: s.specialty as Station["specialty"],
      difficulty: (s.difficulty ?? "Médio") as Station["difficulty"],
      durationMinutes: s.duration_minutes ?? 10,
      clinicalCase: s.clinical_case,
      candidateTask: s.candidate_task,
      patientInfo: s.patient_info ?? "",
      supportMaterials: s.support_materials ?? "",
      checklist,
      patientScript: s.patient_script ?? s.patient_info ?? "",
      evaluatorNotes: s.evaluator_notes ?? undefined,
      competencies: (s.competencies ?? []) as string[],
      scoringCriteria: s.scoring_criteria ?? undefined,
      postMaterials: s.post_materials ?? undefined,
    };
  }
  const mock = STATIONS.find((s) => s.id === id);
  if (!mock) return null;
  return {
    ...mock,
    patientScript:
      `Queixa principal: ${mock.clinicalCase}\n\n` +
      `Comportamento: responda apenas ao que for perguntado. Mostre ansiedade leve.\n\n` +
      `Sinais simulados: ${mock.patientInfo}\n\n` +
      `Informações que só revela se questionado: antecedentes pessoais, hábitos, uso de medicamentos.`,
    competencies: Array.from(new Set(mock.checklist.map((c) => c.category))),
  };
}
