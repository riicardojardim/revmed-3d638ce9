import { supabase } from "@/integrations/supabase/client";
import { STATIONS, type Station, type ChecklistItem, type ChecklistLevel, type PatientProfile, type DeliverableMaterial } from "@/data/stations";

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

// Generate default 3-level grading when a checklist item doesn't bring its own.
// Adequado = full points · Parcialmente = half · Inadequado = 0.
function withDefaultLevels(items: ChecklistItem[]): ChecklistItem[] {
  return items.map((it) => {
    if (it.levels && it.levels.length > 0) return it;
    const full = it.points;
    const half = Math.round((full / 2) * 100) / 100;
    const levels: ChecklistLevel[] =
      full > 0 && half > 0 && half < full
        ? [
            { label: "Inadequado", points: 0 },
            { label: "Parcialmente adequado", points: half },
            { label: "Adequado", points: full },
          ]
        : [
            { label: "Inadequado", points: 0 },
            { label: "Adequado", points: full },
          ];
    return { ...it, levels };
  });
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
    const sx = s as unknown as Record<string, unknown>;
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
      checklist: withDefaultLevels(checklist),
      patientScript: s.patient_script ?? s.patient_info ?? "",
      evaluatorNotes: s.evaluator_notes ?? undefined,
      competencies: (s.competencies ?? []) as string[],
      scoringCriteria: s.scoring_criteria ?? undefined,
      postMaterials: s.post_materials ?? undefined,
      patientProfile: (sx.patient_profile as PatientProfile) ?? undefined,
      deliverableMaterials: (sx.deliverable_materials as DeliverableMaterial[]) ?? [],
      educationalGoal: (sx.educational_goal as string) ?? undefined,
      expectedConduct: (sx.expected_conduct as string) ?? undefined,
      commonMistakes: (sx.common_mistakes as string) ?? undefined,
    };
  }
  const mock = STATIONS.find((s) => s.id === id);
  if (!mock) return null;
  const p = mock.patientProfile;
  const script = p
    ? [
        p.chiefComplaint && `Queixa principal: ${p.chiefComplaint}`,
        p.hpi && `História: ${p.hpi}`,
        p.emotionalTone && `Tom emocional: ${p.emotionalTone}`,
        p.spontaneous && `Fale espontaneamente: ${p.spontaneous}`,
        p.onlyIfAsked && `Revele só se perguntado: ${p.onlyIfAsked}`,
        p.doNotReveal && `Não revele: ${p.doNotReveal}`,
        p.actingTips && `Dicas: ${p.actingTips}`,
      ].filter(Boolean).join("\n\n")
    : `Queixa principal: ${mock.clinicalCase}\n\nComportamento: responda apenas ao que for perguntado. Mostre ansiedade leve.\n\nSinais simulados: ${mock.patientInfo}`;
  return {
    ...mock,
    checklist: withDefaultLevels(mock.checklist),
    patientScript: script,
    competencies: Array.from(new Set(mock.checklist.map((c) => c.category))),
  };
}
