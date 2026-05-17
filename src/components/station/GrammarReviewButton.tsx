import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Loader2, SpellCheck, AlertTriangle, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reviewGrammar, type GrammarFieldResult } from "@/lib/grammar.functions";

type AnyStation = Record<string, unknown> & {
  title: string;
  clinical_case?: string | null;
  case_description?: string | null;
  candidate_task?: string;
  patient_info?: string | null;
  support_materials?: string | null;
  patient_script?: string | null;
  evaluator_notes?: string | null;
  scoring_criteria?: string | null;
  post_materials?: string | null;
  educational_goal?: string | null;
  expected_conduct?: string | null;
  common_mistakes?: string | null;
  patient_profile?: Record<string, string | undefined>;
  deliverable_materials?: Array<{
    id: string;
    name?: string;
    description?: string;
    content?: string;
  }>;
};

type AnyItem = {
  id: string;
  description: string;
  helper_text?: string | null;
  levels?: Array<{ label: string; points: number; description?: string }>;
};

interface Field {
  id: string;
  label: string;
  text: string;
}

const STATION_TEXT_KEYS: Array<{ key: keyof AnyStation; label: string }> = [
  { key: "title", label: "Título" },
  { key: "clinical_case", label: "Caso clínico" },
  { key: "case_description", label: "Descrição do caso" },
  { key: "candidate_task", label: "Tarefa do candidato" },
  { key: "patient_info", label: "Info do paciente" },
  { key: "support_materials", label: "Materiais de apoio" },
  { key: "patient_script", label: "Roteiro do ator" },
  { key: "evaluator_notes", label: "Notas do ator" },
  { key: "scoring_criteria", label: "Critérios de pontuação" },
  { key: "post_materials", label: "Materiais entregues" },
  { key: "educational_goal", label: "Objetivo educacional" },
  { key: "expected_conduct", label: "Conduta esperada" },
  { key: "common_mistakes", label: "Erros comuns" },
];

const PROFILE_LABELS: Record<string, string> = {
  chiefComplaint: "Paciente · Queixa principal",
  hpi: "Paciente · HMA",
  personalHistory: "Paciente · Antecedentes",
  medications: "Paciente · Medicações",
  allergies: "Paciente · Alergias",
  familyHistory: "Paciente · Antec. familiares",
  habits: "Paciente · Hábitos",
  symptoms: "Paciente · Sintomas",
  vitals: "Paciente · Sinais vitais",
  previousExams: "Paciente · Exames prévios",
  spontaneous: "Paciente · Fala espontânea",
  onlyIfAsked: "Paciente · Só se perguntado",
  doNotReveal: "Paciente · Não revelar",
  emotionalTone: "Paciente · Tom emocional",
  actingTips: "Paciente · Dicas de atuação",
};

function collectFields(station: AnyStation, items: AnyItem[]): Field[] {
  const out: Field[] = [];
  for (const { key, label } of STATION_TEXT_KEYS) {
    const v = station[key];
    if (typeof v === "string" && v.trim()) {
      out.push({ id: `station.${String(key)}`, label, text: v });
    }
  }
  const profile = station.patient_profile ?? {};
  for (const [k, label] of Object.entries(PROFILE_LABELS)) {
    const v = profile[k];
    if (typeof v === "string" && v.trim()) {
      out.push({ id: `profile.${k}`, label, text: v });
    }
  }
  for (const m of station.deliverable_materials ?? []) {
    if (m.name && m.name.trim()) out.push({ id: `material.${m.id}.name`, label: `Impresso · nome (${m.name.slice(0, 30)})`, text: m.name });
    if (m.description && m.description.trim()) out.push({ id: `material.${m.id}.description`, label: `Impresso · descrição (${m.name ?? ""})`, text: m.description });
    if (m.content && m.content.trim()) out.push({ id: `material.${m.id}.content`, label: `Impresso · conteúdo (${m.name ?? ""})`, text: m.content });
  }
  items.forEach((it, idx) => {
    if (it.description && it.description.trim()) {
      out.push({ id: `item.${it.id}.description`, label: `PEP item ${idx + 1}`, text: it.description });
    }
    if (it.helper_text && it.helper_text.trim()) {
      out.push({ id: `item.${it.id}.helper_text`, label: `PEP item ${idx + 1} · dica`, text: it.helper_text });
    }
    (it.levels ?? []).forEach((lv, li) => {
      if (lv.description && lv.description.trim()) {
        out.push({
          id: `item.${it.id}.level.${li}`,
          label: `PEP item ${idx + 1} · ${lv.label}`,
          text: lv.description,
        });
      }
    });
  });
  return out;
}

interface Props {
  station: AnyStation;
  items: AnyItem[];
  setStation: (updater: (s: AnyStation | null) => AnyStation | null) => void;
  setItems: (updater: (items: AnyItem[]) => AnyItem[]) => void;
}

export function GrammarReviewButton({ station, items, setStation, setItems }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GrammarFieldResult[] | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const reviewFn = useServerFn(reviewGrammar);

  const fields = useMemo(() => collectFields(station, items), [station, items]);

  const fieldMap = useMemo(() => {
    const m = new Map<string, Field>();
    fields.forEach((f) => m.set(f.id, f));
    return m;
  }, [fields]);

  async function runReview() {
    if (fields.length === 0) {
      toast.error("Não há textos preenchidos para revisar.");
      return;
    }
    setLoading(true);
    setResults(null);
    setApplied(new Set());
    try {
      const data = await reviewFn({ data: { fields } });
      setResults(data.fields);
      const total = data.fields.reduce((s, f) => s + f.issues.length, 0);
      if (total === 0) toast.success("Nenhum erro encontrado — está tudo certo!");
      else toast.success(`${total} sugestão(ões) encontrada(s) em ${data.fields.filter((f) => f.issues.length > 0).length} campo(s).`);
    } catch (err) {
      toast.error("Falha na revisão", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }

  function applyToField(fieldId: string, newText: string) {
    const [scope, ...rest] = fieldId.split(".");
    if (scope === "station") {
      const key = rest.join(".");
      setStation((s) => (s ? { ...s, [key]: newText } : s));
    } else if (scope === "profile") {
      const key = rest.join(".");
      setStation((s) => {
        if (!s) return s;
        const profile = { ...(s.patient_profile ?? {}) };
        profile[key] = newText;
        return { ...s, patient_profile: profile };
      });
    } else if (scope === "material") {
      const [mid, field] = rest;
      setStation((s) => {
        if (!s) return s;
        const list = (s.deliverable_materials ?? []).map((m) =>
          m.id === mid ? { ...m, [field]: newText } : m,
        );
        return { ...s, deliverable_materials: list };
      });
    } else if (scope === "item") {
      const [iid, field, ...tail] = rest;
      setItems((arr) =>
        arr.map((it) => {
          if (it.id !== iid) return it;
          if (field === "description") return { ...it, description: newText };
          if (field === "helper_text") return { ...it, helper_text: newText };
          if (field === "level") {
            const lvIdx = Number(tail[0]);
            const levels = (it.levels ?? []).map((lv, i) => (i === lvIdx ? { ...lv, description: newText } : lv));
            return { ...it, levels };
          }
          return it;
        }),
      );
    }
    setApplied((prev) => {
      const next = new Set(prev);
      next.add(fieldId);
      return next;
    });
    toast.success("Correção aplicada — lembre de salvar.");
  }

  const totalIssues = results?.reduce((s, f) => s + f.issues.length, 0) ?? 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <SpellCheck className="h-4 w-4" />
          Revisar gramática
          {totalIssues > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{totalIssues}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SpellCheck className="h-5 w-5" /> Revisão ortográfica e gramatical
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Analisa todos os textos preenchidos da estação (caso, tarefa, paciente, impressos e PEP) e aponta erros de
            ortografia, pontuação, concordância e estilo. Aplique as correções e clique em "Salvar" no topo.
          </p>
          <div className="flex items-center gap-2">
            <Button onClick={runReview} disabled={loading} variant="hero" className="gap-1.5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SpellCheck className="h-4 w-4" />}
              {loading ? "Revisando..." : `Revisar ${fields.length} campo(s)`}
            </Button>
            {results && (
              <Button variant="ghost" onClick={() => setResults(null)}>Limpar</Button>
            )}
          </div>

          {results && results.length > 0 && (
            <div className="space-y-3 pt-2">
              {results.map((fr) => {
                const meta = fieldMap.get(fr.field_id);
                if (!meta) return null;
                const isApplied = applied.has(fr.field_id);
                const hasCorrection = fr.corrected_text.trim() !== "" && fr.corrected_text.trim() !== meta.text.trim();
                const showCorrected = hasCorrection || isApplied;
                return (
                  <div key={fr.field_id} className="rounded-lg border bg-card p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold">{meta.label}</div>
                      {isApplied ? (
                        <Badge variant="outline" className="gap-1 text-mint border-mint/60 bg-mint/10">
                          <Check className="h-3 w-3" /> Aplicado
                        </Badge>
                      ) : fr.issues.length === 0 ? (
                        <Badge variant="outline" className="gap-1 text-mint border-mint/40">
                          <CheckCircle2 className="h-3 w-3" /> OK
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> {fr.issues.length}
                        </Badge>
                      )}
                    </div>

                    {fr.issues.length > 0 && (
                      <ul className="mb-2 space-y-2">
                        {fr.issues.map((iss, i) => (
                          <li key={i} className="rounded border-l-2 border-amber-500/60 bg-amber-500/5 p-2 text-xs">
                            <div className="mb-0.5 flex items-center gap-1.5">
                              <Badge variant="outline" className="h-4 px-1 text-[10px] uppercase">{iss.type}</Badge>
                            </div>
                            <div className="text-muted-foreground"><span className="font-mono text-foreground">"{iss.excerpt}"</span></div>
                            <div className="mt-1">{iss.explanation}</div>
                            {iss.suggestion && (
                              <div className="mt-1 flex items-center justify-between gap-2">
                                <span className="text-mint">→ {iss.suggestion}</span>
                                {!isApplied && iss.excerpt && meta.text.includes(iss.excerpt) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 gap-1 px-2 text-[10px]"
                                    onClick={() => applyToField(fr.field_id, meta.text.split(iss.excerpt).join(iss.suggestion ?? ""))}
                                  >
                                    <Check className="h-3 w-3" /> Aplicar
                                  </Button>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {(showCorrected || (fr.issues.length > 0 && fr.corrected_text)) && (
                      <div className="mt-2 rounded border bg-muted/30 p-2 text-xs">
                        <div className="mb-1 font-semibold text-mint">
                          {isApplied ? "Texto aplicado no formulário:" : "Texto corrigido (aplicar tudo):"}
                        </div>
                        <div className="whitespace-pre-wrap">{fr.corrected_text || meta.text}</div>
                        {!isApplied && (
                          <div className="mt-2 flex justify-end">
                            <Button size="sm" variant="hero" className="gap-1" onClick={() => applyToField(fr.field_id, fr.corrected_text || meta.text)}>
                              <Check className="h-3.5 w-3.5" /> Aplicar correção
                            </Button>
                          </div>
                        )}
                        {isApplied && (
                          <div className="mt-2 text-[11px] text-mint">
                            ✓ Substituído no campo "{meta.label}". Clique em "Salvar" no topo para gravar.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {results && results.length === 0 && (
            <p className="text-sm text-muted-foreground">Nada para revisar.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
