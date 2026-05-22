import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Eye, EyeOff, Plus, Trash2, ChevronUp, ChevronDown, Copy,
  Upload, Sparkles, FileText, MessageSquare, ListChecks, Inbox, StickyNote,
  User, Stethoscope, ClipboardCheck, Target, AlertTriangle, BookOpen, Clock,
  Image as ImageIcon, X, Theater, Send, Play, Square, Lock,
  UserPlus, Link2, BarChart3, MessageCircle, MessageSquareWarning, Check,
  CheckCircle2, AlertCircle, Printer,
} from "lucide-react";
import { downloadActorPDF, downloadCandidatePDF } from "@/lib/station-pdf";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { PRBlock, SubBlock, ScriptText, Highlightable, formatPatientProfile } from "@/components/station/shared";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { parseStationPdfs, parseStationText } from "@/lib/stations-ai.functions";
import { parseChecklistBulk } from "@/lib/checklist-ai.functions";
import { generateDeckFromStation } from "@/lib/deck-from-station.functions";
import { generateSummaryFromStation } from "@/lib/summary-from-station.functions";
import { DeckCover } from "@/components/flashcards/DeckCover";
import { FlashcardFace } from "@/components/flashcards/FlashcardFace";
import { DeckPreview } from "@/components/flashcards/DeckPreview";
import { GrammarReviewButton } from "@/components/station/GrammarReviewButton";
import { suggestStationTitle } from "@/lib/title-suggest.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Wand2, Brain } from "lucide-react";

export const Route = createFileRoute("/app/admin/estacoes/$id")({
  component: StationEditor,
});

// -------- Types --------
interface PatientProfile {
  name?: string; age?: string; sex?: string; city?: string; profession?: string;
  chiefComplaint?: string; hpi?: string; personalHistory?: string;
  medications?: string; allergies?: string; familyHistory?: string;
  habits?: string; symptoms?: string; vitals?: string; previousExams?: string;
  spontaneous?: string; onlyIfAsked?: string; doNotReveal?: string;
  emotionalTone?: string; actingTips?: string;
}

interface DeliverableMaterial {
  id: string;
  name: string;
  type: string;
  description?: string;
  content: string;
  imageUrl?: string;
  autoDeliver?: boolean;
}

function serializePatientProfile(p: PatientProfile | null | undefined): string | null {
  if (!p) return null;
  const labels: Array<[keyof PatientProfile, string]> = [
    ["name", "Nome"], ["age", "Idade"], ["sex", "Sexo"], ["city", "Cidade"], ["profession", "Profissão"],
    ["chiefComplaint", "Queixa principal"], ["hpi", "HMA"], ["personalHistory", "Antecedentes pessoais"],
    ["medications", "Medicações"], ["allergies", "Alergias"], ["familyHistory", "Antecedentes familiares"],
    ["habits", "Hábitos"], ["symptoms", "Sintomas"], ["vitals", "Sinais vitais"], ["previousExams", "Exames prévios"],
    ["spontaneous", "Falar espontaneamente"], ["onlyIfAsked", "Só se perguntado"], ["doNotReveal", "Não revelar"],
    ["emotionalTone", "Tom emocional"], ["actingTips", "Dicas de atuação"],
  ];
  const out = labels
    .map(([k, label]) => {
      const v = (p[k] ?? "").toString().trim();
      return v ? `${label}: ${v}` : "";
    })
    .filter(Boolean)
    .join("\n");
  return out || null;
}


interface BiblioRef { label: string; url?: string }

interface Station {
  id: string;
  title: string;
  specialty: string;
  difficulty: string;
  duration_minutes: number;
  clinical_case: string;
  case_description: string | null;
  candidate_task: string;
  patient_info: string | null;
  support_materials: string | null;
  patient_script: string | null;
  evaluator_notes: string | null;
  competencies: string[];
  scoring_criteria: string | null;
  post_materials: string | null;
  educational_goal: string | null;
  expected_conduct: string | null;
  common_mistakes: string | null;
  bibliographic_references: BiblioRef[];
  deliverable_materials: DeliverableMaterial[];
  patient_profile: PatientProfile;
  published: boolean;
}

interface ChecklistLevel { label: string; points: number; description?: string }
interface Item {
  id: string;
  description: string;
  category: string;
  points: number;
  helper_text: string | null;
  order_index: number;
  levels: ChecklistLevel[];
}

const SPECIALTIES = [
  "Clínica Médica", "Cirurgia", "Pediatria",
  "Ginecologia e Obstetrícia", "Medicina de Família e Comunidade",
];
const CATEGORIES = [
  "Apresentação", "Anamnese", "Exame físico", "Hipótese diagnóstica",
  "Conduta", "Comunicação", "Procedimento", "Prescrição", "Orientações finais",
];
const MATERIAL_TYPES = ["Impresso", "Exame laboratorial", "Exame de imagem", "ECG", "Outro"];

function withDuration(text: string, mins: number): string {
  if (!text) return text;
  const n = Number.isFinite(mins) && mins > 0 ? mins : 10;
  return text
    .replace(/Nos\s+\d+\s*min\.?\s*minutos/gi, `Nos ${n} minutos`)
    .replace(/Nos\s+\d+\s*minutos/gi, `Nos ${n} minutos`)
    .replace(/em\s+at[ée]\s+\d+\s*minutos/gi, `em até ${n} minutos`);
}

function defaultLevels(maxPts: number): ChecklistLevel[] {
  const m = Number.isFinite(maxPts) ? maxPts : 1;
  const mid = Math.round((m / 2) * 100) / 100;
  return [
    { label: "Inadequado", points: 0, description: "Não realiza." },
    { label: "Parcialmente adequado", points: mid, description: "Realiza parcialmente." },
    { label: "Adequado", points: m, description: "Realiza completamente." },
  ];
}

function numberedCategory(index: number, title: string): string {
  const clean = title.replace(/^\s*\d+\.\s*/, "").trim();
  return `${index + 1}. ${clean}`;
}

function formatPepHeading(index: number, category: string | null | undefined, description: string): string {
  const cleanCategory = (category ?? "").replace(/^\s*\d+\s*[.)\-–—]\s*/, "").trim();
  if (cleanCategory) {
    const needsPunctuation = !/[:.;!?]$/.test(cleanCategory);
    const punctuation = needsPunctuation ? (/\(\d+\)\s*/.test(description) ? ":" : ".") : "";
    return `${index + 1}. ${cleanCategory}${punctuation}`;
  }
  return numberedCategory(index, description.replace(/^\s*\d+\s*[.)\-–—]\s*/, "").trim());
}

function cleanPepTitle(value: string): string {
  return value
    .replace(/^\s*\d+\s*[.)\-–—]\s*/, "")
    .replace(/\s*:\s*$/, "")
    .trim();
}

/**
 * Use the numbered PEP title only as category, never inside description.
 * Example: "2. Investiga os sintomas atuais da criança:" becomes category
 * "Investiga os sintomas atuais da criança" and description starts at the subitems.
 */
function normalizeChecklistFields(rawDesc: string, rawCategory?: string | null): { description: string; category: string } {
  const desc = (rawDesc ?? "").trim();
  const lines = desc.split(/\r?\n/);
  const firstContentIndex = lines.findIndex((line) => line.trim());
  const firstLine = firstContentIndex >= 0 ? lines[firstContentIndex].trim() : "";
  const titleMatch = firstLine.match(/^\s*\d+\s*[.)\-–—]\s*(.{2,180}?)\s*:\s*(.*)$/);
  const title = titleMatch ? cleanPepTitle(titleMatch[1]) : "";
  const inlineRemainder = titleMatch?.[2]?.trim() ?? "";
  const withoutTitle = titleMatch
    ? [
        ...lines.slice(0, firstContentIndex),
        ...(inlineRemainder ? [inlineRemainder] : []),
        ...lines.slice(firstContentIndex + 1),
      ].join("\n").trim()
    : desc;
  // Cut everything from the first level marker line onwards
  // (levels can span multiple lines — continuations would otherwise leak into description)
  const lvlRe = /^\s*(inadequado|parcialmente\s+adequado|adequado)\s*:/i;
  const descLines = withoutTitle.split(/\r?\n/);
  const cutAt = descLines.findIndex((line) => lvlRe.test(line));
  const cleanedDescription = (cutAt === -1 ? descLines : descLines.slice(0, cutAt))
    .join("\n")
    .trim();
  const legacyPresentation = /identifica-se/i.test(desc) && /cumprimenta\s+o\s+paciente/i.test(desc) ? "Apresentação" : "";
  const explicit = cleanPepTitle(rawCategory ?? "");
  const chosen = title || legacyPresentation || explicit || "Sem categoria";
  return { description: cleanedDescription, category: chosen };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function StationEditor() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [station, setStation] = useState<Station | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [{ data: s }, { data: it }] = await Promise.all([
      supabase.from("custom_stations").select("*").eq("id", id).maybeSingle(),
      supabase.from("station_checklist_items").select("*").eq("station_id", id).order("order_index"),
    ]);
    if (!s) {
      toast.error("Estação não encontrada");
      nav({ to: "/app/admin/estacoes" });
      return;
    }
    const raw = s as Record<string, unknown>;
    setStation({
      ...(raw as unknown as Station),
      competencies: (raw.competencies as string[]) ?? [],
      bibliographic_references: (raw.bibliographic_references as BiblioRef[]) ?? [],
      deliverable_materials: (raw.deliverable_materials as DeliverableMaterial[]) ?? [],
      patient_profile: (raw.patient_profile as PatientProfile) ?? {},
    });
    const loaded = ((it as unknown as Item[]) ?? []).map((i) => ({
      ...i,
      levels: Array.isArray(i.levels) && i.levels.length ? i.levels : defaultLevels(Number(i.points) || 1),
    }));
    // one-time cleanup: strip leading "N. Category:" from descriptions and fix wrong default categories
    const fixes: { id: string; description: string; category: string }[] = [];
    const normalized = loaded.map((it) => {
      const { description, category } = normalizeChecklistFields(it.description, it.category);
      if (description !== it.description || category !== it.category) {
        fixes.push({ id: it.id, description, category });
        return { ...it, description, category };
      }
      return it;
    });
    setItems(normalized);
    if (fixes.length) {
      void Promise.all(
        fixes.map((f) =>
          supabase.from("station_checklist_items").update({ description: f.description, category: f.category }).eq("id", f.id)
        )
      );
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  function up<K extends keyof Station>(k: K, v: Station[K]) {
    setStation((s) => (s ? { ...s, [k]: v } : s));
  }

  async function saveStation(opts: { silent?: boolean } = {}) {
    if (!station) return;
    setSaving(true);
    const payload = {
      title: station.title,
      specialty: station.specialty,
      clinical_case: station.clinical_case,
      case_description: station.case_description,
      candidate_task: station.candidate_task,
      patient_info: station.patient_info,
      support_materials: station.support_materials,
      patient_script: station.patient_script,
      evaluator_notes: station.evaluator_notes,
      competencies: station.competencies,
      scoring_criteria: station.scoring_criteria,
      post_materials: station.post_materials,
      educational_goal: station.educational_goal,
      expected_conduct: station.expected_conduct,
      common_mistakes: station.common_mistakes,
      bibliographic_references: station.bibliographic_references,
      deliverable_materials: station.deliverable_materials,
      patient_profile: station.patient_profile,
    } as never;
    const { error } = await supabase.from("custom_stations").update(payload).eq("id", id);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar", { description: error.message });
    if (!opts.silent) toast.success("Alterações salvas");
  }

  async function togglePublish() {
    if (!station) return;
    await saveStation({ silent: true });
    const { error } = await supabase
      .from("custom_stations")
      .update({ published: !station.published })
      .eq("id", id);
    if (error) return toast.error("Falha", { description: error.message });
    toast.success(station.published ? "Estação despublicada" : "Estação publicada para assinantes");
    void load();
  }

  if (!station) return <div className="text-sm text-muted-foreground">Carregando estação...</div>;

  const totalPts = items.reduce((s, i) => s + Number(i.points || 0), 0);

  return (
    <EditorBody
      station={station}
      items={items}
      id={id}
      saving={saving}
      totalPts={totalPts}
      up={up}
      load={load}
      saveStation={saveStation}
      togglePublish={togglePublish}
      setStation={setStation}
      setItems={setItems}
    />
  );
}

function EditorBody({
  station, items, id, saving, totalPts, up, load, saveStation, togglePublish, setStation, setItems,
}: {
  station: Station;
  items: Item[];
  id: string;
  saving: boolean;
  totalPts: number;
  up: <K extends keyof Station>(k: K, v: Station[K]) => void;
  load: () => Promise<void>;
  saveStation: (opts?: { silent?: boolean }) => Promise<unknown>;
  togglePublish: () => Promise<unknown>;
  setStation: React.Dispatch<React.SetStateAction<Station | null>>;
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
}) {
  const [tab, setTab] = useState<"ator" | "avaliado">("ator");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [linkedRefreshKey, setLinkedRefreshKey] = useState(0);
  return (
    <div className="space-y-6">
      {/* PDF Import — Passo 1: importe o PDF para preencher tudo automaticamente */}
      <PdfImportSection
        stationId={id}
        currentItemsCount={items.length}
        applyResult={async (r) => {
          if (!station) return;
          // 1) Build merged station object
          const mergedDeliverables = r.deliverable_materials?.length
            ? r.deliverable_materials.map((m, i) => ({
                id: `imp${i + 1}`,
                name: (m.name ?? "").replace(/^\s*impresso\s*\d+\s*[-—–:.)]*\s*/i, "").trim() || (m.type ?? ""),
                type: m.type || "Impresso",
                description: m.description ?? "",
                content: m.content ?? "",
                autoDeliver: false,
              }))
            : station.deliverable_materials;
          const merged: Station = {
            ...station,
            title: r.title || station.title,
            specialty: r.specialty || station.specialty,
            educational_goal: r.educational_goal ?? station.educational_goal,
            competencies: r.competencies?.length ? r.competencies : station.competencies,
            clinical_case: r.clinical_case ?? station.clinical_case,
            case_description: r.case_description ?? station.case_description,
            candidate_task: r.candidate_task ?? station.candidate_task,
            patient_info: r.patient_info ?? station.patient_info,
            patient_script: r.patient_script ?? station.patient_script,
            support_materials: r.support_materials ?? station.support_materials,
            patient_profile: r.patient_profile ?? station.patient_profile,
            deliverable_materials: mergedDeliverables,
            expected_conduct: r.expected_conduct ?? station.expected_conduct,
            common_mistakes: r.common_mistakes ?? station.common_mistakes,
            evaluator_notes: r.evaluator_notes ?? station.evaluator_notes,
            scoring_criteria: r.scoring_criteria ?? station.scoring_criteria,
          };
          // 2) Persist merged station to DB FIRST (before any load())
          setStation(merged);
          const { error: upErr } = await supabase
            .from("custom_stations")
            .update({
              title: merged.title,
              specialty: merged.specialty,
              educational_goal: merged.educational_goal,
              competencies: merged.competencies,
              clinical_case: merged.clinical_case,
              case_description: merged.case_description,
              candidate_task: merged.candidate_task,
              patient_info: merged.patient_info,
              patient_script: merged.patient_script,
              support_materials: merged.support_materials,
              patient_profile: merged.patient_profile as never,
              deliverable_materials: merged.deliverable_materials as never,
              expected_conduct: merged.expected_conduct,
              common_mistakes: merged.common_mistakes,
              evaluator_notes: merged.evaluator_notes,
              scoring_criteria: merged.scoring_criteria,
            } as never)
            .eq("id", id);
          if (upErr) {
            toast.error("Falha ao salvar campos importados", { description: upErr.message });
            return;
          }
          // 3) Insert checklist items
          if (r.checklist_items?.length) {
            const startIdx = items.length;
            const rows = r.checklist_items.map((ci, idx) => {
              const pts = Number(ci.points) > 0 ? Number(ci.points) : 1;
              const { description, category } = normalizeChecklistFields(ci.description, ci.category);
              return {
                station_id: id,
                description,
                category,
                points: pts,
                helper_text: ci.helper_text ?? null,
                order_index: startIdx + idx,
                levels: ci.levels?.length ? ci.levels : defaultLevels(pts),
              };
            });
            const { error } = await supabase.from("station_checklist_items").insert(rows as never);
            if (error) toast.error("Falha ao importar checklist", { description: error.message });
          }
          // 4) Auto-suggest title (preserves siglas already typed)
          try {
            const pepDescriptions = (r.checklist_items ?? [])
              .map((it) => (it.description ?? "").trim())
              .filter((s) => s.length > 0);
            const sugg = await suggestStationTitle({
              data: {
                currentTitle: merged.title ?? "",
                specialty: merged.specialty ?? "",
                clinical_case: merged.clinical_case ?? "",
                case_description: merged.case_description ?? "",
                candidate_task: merged.candidate_task ?? "",
                patient_script: merged.patient_script ?? "",
                pep_items: pepDescriptions,
              },
            });
            if (sugg?.title && sugg.title.trim() && sugg.title.trim() !== merged.title?.trim()) {
              await supabase
                .from("custom_stations")
                .update({ title: sugg.title.trim() } as never)
                .eq("id", id);
            }
          } catch (e) {
            console.warn("Falha ao sugerir título automaticamente", e);
          }
          // 5) Reload from DB (now contains everything)
          await load();
          toast.success("PDF importado e campos preenchidos");
          if (r.checklist_items?.length) setAiDialogOpen(true);
        }}
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/admin/estacoes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para a lista
        </Link>
        <div className="flex flex-wrap gap-2">
          <GrammarReviewButton
            station={station as never}
            items={items as never}
            setStation={setStation as never}
            setItems={setItems as never}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Printer className="h-4 w-4" /> PDFs para impressão
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Gerar PDF da estação</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  downloadActorPDF(station as never);
                  toast.success("PDF do ator gerado");
                }}
              >
                <Theater className="h-4 w-4" /> PDF do ator
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  downloadCandidatePDF(station as never, items as never);
                  toast.success("PDF do candidato gerado");
                }}
              >
                <User className="h-4 w-4" /> PDF do candidato
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={togglePublish}>
            {station.published ? <><EyeOff className="h-4 w-4" /> Despublicar</> : <><Eye className="h-4 w-4" /> Publicar</>}
          </Button>
          <Button variant="hero" onClick={() => saveStation()} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          {items.length} itens · <span className="font-semibold text-foreground">{totalPts.toFixed(2)} pts</span> totais
        </div>
        <Badge variant="outline">
          {station.published ? "Publicada" : "Rascunho"}
        </Badge>
      </div>

      <SectionBasics station={station} up={up} items={items} />

      {/* Tabs: Ator / Avaliado */}
      <div className="inline-flex rounded-xl border border-border bg-background/40 p-1">
        {([
          { id: "ator", label: "Ator (preencher primeiro)", icon: Stethoscope },
          { id: "avaliado", label: "Avaliado (o que ele recebe)", icon: User },
        ] as const).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
                active ? "bg-mint/15 text-mint shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "ator" ? (
        <>
          <SectionCaseCandidate station={station} up={up} />
          <SectionCaseActor station={station} up={up} />
          <SectionMaterials
            materials={station.deliverable_materials}
            onChange={(m) => up("deliverable_materials", m)}
          />
          <SectionChecklist stationId={id} items={items} reload={load} onChecklistFilled={() => setAiDialogOpen(true)} />
          <SectionPedagogical station={station} up={up} />
        </>
      ) : (
        <SectionCaseCandidate station={station} up={up} />
      )}

      {/* Sempre visíveis (ambas as abas) */}
      <SectionReferences station={station} up={up} />
      <Section title="Pré-visualização" hint="Veja como o avaliado e o ator/paciente enxergam a estação no painel deles.">
        <StationLivePreview station={station} items={items} />
      </Section>

      <SectionGenerateFlashcards station={station} items={items} refreshKey={linkedRefreshKey} />
      <SectionGenerateSummary station={station} items={items} refreshKey={linkedRefreshKey} />
      <SectionPublish station={station} togglePublish={togglePublish} />

      <PostChecklistAIDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        station={station}
        items={items}
        onGenerated={() => setLinkedRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

// ============= Sections =============

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function PdfImportSection({
  stationId: _stationId,
  currentItemsCount: _currentItemsCount,
  applyResult,
}: {
  stationId: string;
  currentItemsCount: number;
  applyResult: (r: Awaited<ReturnType<typeof parseStationPdfs>>) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"pdf" | "text">("pdf");
  const [loading, setLoading] = useState(false);
  const parseFn = useServerFn(parseStationPdfs);
  const parseTextFn = useServerFn(parseStationText);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (next.length === 0) return toast.error("Selecione arquivos PDF");
    setFiles((prev) => [...prev, ...next].slice(0, 5));
  }

  async function run() {
    if (mode === "pdf" && !files.length) return toast.error("Adicione ao menos 1 PDF");
    if (mode === "text" && text.trim().length < 50) return toast.error("Cole o texto completo da estação (mínimo 50 caracteres)");
    setLoading(true);
    try {
      const result = mode === "pdf"
        ? await parseFn({
            data: {
              pdfs: await Promise.all(files.map(async (f) => ({ name: f.name, dataUrl: await fileToDataUrl(f) }))),
            },
          })
        : await parseTextFn({ data: { text: text.trim() } });
      await applyResult(result);
      setFiles([]);
      setText("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao processar";
      toast.error("Falha na IA", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section
      title="Importar estação com IA"
      hint="Anexe PDFs ou cole o texto completo da estação — a IA preenche todos os campos abaixo automaticamente."
    >
      <div className="mb-3 flex gap-1 rounded-lg border border-border bg-background/40 p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode("pdf")}
          className={`px-3 py-1.5 text-xs rounded-md transition ${mode === "pdf" ? "bg-mint/20 text-mint" : "text-muted-foreground hover:text-foreground"}`}
        >
          <FileText className="inline h-3.5 w-3.5 mr-1" /> PDF
        </button>
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`px-3 py-1.5 text-xs rounded-md transition ${mode === "text" ? "bg-mint/20 text-mint" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Sparkles className="inline h-3.5 w-3.5 mr-1" /> Colar texto
        </button>
      </div>

      {mode === "pdf" ? (
        <div
          className="rounded-xl border border-dashed border-border bg-background/40 p-4 text-sm"
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Escolher PDFs
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <span className="text-xs text-muted-foreground">
              Ou arraste e solte aqui · até 5 arquivos
            </span>
          </div>
          {files.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded border border-border bg-card/60 px-3 py-1.5 text-xs">
                  <span className="flex items-center gap-2 truncate">
                    <FileText className="h-3.5 w-3.5 text-mint" /> {f.name}
                    <span className="text-muted-foreground">({Math.round(f.size / 1024)} KB)</span>
                  </span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              A IA NÃO sobrescreve impressos já cadastrados a menos que estejam vazios. Os itens de
              checklist são adicionados ao final da lista.
            </p>
            <Button type="button" variant="hero" onClick={run} disabled={loading || !files.length}>
              <Sparkles className="h-4 w-4" /> {loading ? "Processando com IA..." : "Preencher com IA"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-background/40 p-4 text-sm space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cole aqui o texto completo da estação: cenário, descrição do caso, tarefa do candidato, instruções ao ator, impressos e checklist/PEP..."
            className="w-full min-h-[280px] rounded-lg border border-border bg-background/60 p-3 text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-mint"
            maxLength={200_000}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {text.length.toLocaleString("pt-BR")} caracteres · A IA preenche todos os campos a partir do texto colado.
            </p>
            <Button type="button" variant="hero" onClick={run} disabled={loading || text.trim().length < 50}>
              <Sparkles className="h-4 w-4" /> {loading ? "Processando com IA..." : "Preencher com IA"}
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}

function SectionBasics({ station, up, items }: { station: Station; up: <K extends keyof Station>(k: K, v: Station[K]) => void; items: Item[] }) {
  const suggestFn = useServerFn(suggestStationTitle);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<{ title: string; alternatives: string[] } | null>(null);
  const [open, setOpen] = useState(false);

  async function runSuggest() {
    setSuggesting(true);
    try {
      const pep_items = items
        .map((it) => (it.description ?? "").trim())
        .filter((s) => s.length > 0);
      const r = await suggestFn({
        data: {
          currentTitle: station.title ?? "",
          specialty: station.specialty ?? "",
          clinical_case: station.clinical_case ?? "",
          case_description: station.case_description ?? "",
          candidate_task: station.candidate_task ?? "",
          patient_script: station.patient_script ?? "",
          pep_items,
        },
      });
      setSuggestions(r);
      setOpen(true);
    } catch (err) {
      toast.error("Falha ao sugerir título", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setSuggesting(false);
    }
  }

  function apply(t: string) {
    up("title", t);
    setOpen(false);
    toast.success("Título aplicado");
  }

  return (
    <Section title="Informações básicas" hint="Como a estação aparece para o assinante.">
      <div>
        <Label>Título</Label>
        <div className="flex gap-2">
          <Input value={station.title} onChange={(e) => up("title", e.target.value)} />
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" onClick={runSuggest} disabled={suggesting} className="shrink-0 gap-1.5">
                {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Sugerir título
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-3" align="end">
              {suggestions ? (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Sugestão principal:</div>
                  <button
                    type="button"
                    onClick={() => apply(suggestions.title)}
                    className="w-full rounded border bg-card p-2 text-left text-sm hover:bg-accent"
                  >
                    {suggestions.title}
                  </button>
                  {suggestions.alternatives.length > 0 && (
                    <>
                      <div className="pt-1 text-xs text-muted-foreground">Alternativas:</div>
                      {suggestions.alternatives.map((a, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => apply(a)}
                          className="w-full rounded border bg-card p-2 text-left text-sm hover:bg-accent"
                        >
                          {a}
                        </button>
                      ))}
                    </>
                  )}
                  <div className="pt-1 text-[11px] text-muted-foreground">
                    Dica: digite as siglas no título antes de clicar — elas serão preservadas.
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Gerando sugestões...</div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div>
        <Label>Especialidade</Label>
        <Select value={station.specialty} onValueChange={(v) => up("specialty", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </Section>
  );
}

function SectionCaseCandidate({ station, up }: { station: Station; up: <K extends keyof Station>(k: K, v: Station[K]) => void }) {
  const formattingHint = "Cole o texto integral (como está no PDF). Linhas em CAIXA ALTA e títulos terminados em ':' ficam em negrito automaticamente. Use **palavra** para destacar manualmente.";
  return (
    <Section title="Cenário de atuação e tarefas" hint="Texto que o avaliado lê no início da estação.">
      <div>
        <Label>Cenário de atuação</Label>
        <p className="mb-1 text-xs text-muted-foreground">{formattingHint}</p>
        <Textarea rows={12} value={station.clinical_case} onChange={(e) => up("clinical_case", e.target.value)} placeholder={"Ex.:\nVocê está atendendo no pronto-socorro..."} />
      </div>
      <div>
        <Label>Descrição do caso</Label>
        <p className="mb-1 text-xs text-muted-foreground">{formattingHint}</p>
        <Textarea rows={12} value={station.case_description ?? ""} onChange={(e) => up("case_description", e.target.value)} placeholder={"Cole aqui a descrição completa do caso (como vem no PDF)."} />
      </div>
      <div>
        <Label>Tarefas do candidato (Nos X minutos de duração da estação, você deverá executar as seguintes tarefas)</Label>
        <p className="mb-1 text-xs text-muted-foreground">{formattingHint} A quantidade de minutos no título do preview é preenchida automaticamente.</p>
        <Textarea rows={10} value={station.candidate_task} onChange={(e) => up("candidate_task", e.target.value)} placeholder={"Ex.:\n- Realizar anamnese dirigida\n- Solicitar **exames complementares**\n- Comunicar a hipótese diagnóstica"} />
      </div>
    </Section>
  );
}

function SectionCaseActor({ station, up }: { station: Station; up: <K extends keyof Station>(k: K, v: Station[K]) => void }) {
  return (
    <Section title="Orientações do Ator / Atriz"
      hint="Cole aqui o texto integral das orientações do ator (como está no PDF). Linhas em CAIXA ALTA e títulos terminados em ':' aparecem em negrito automaticamente. Use **palavra** para destacar manualmente.">
      <div>
        <Label>Texto completo das orientações do ator</Label>
        <Textarea rows={20} value={station.patient_script ?? ""} onChange={(e) => up("patient_script", e.target.value)}
          placeholder={`Ex:\n\nDADOS PESSOAIS:\n- Miguel, 40 anos, mecânico.\n\nMOTIVO DA CONSULTA:\n- "Doutor, fui picado por uma aranha..."\n\nCARACTERÍSTICAS DO ACIDENTE:\n- Tempo de evolução: 2 horas\n- Local: mão direita\n- Dor: intensa, em queimação\n\nSE PERGUNTADO POR LIMPEZA:\n- Responder que não fez nada no local.`} />
      </div>
    </Section>
  );
}

function MaterialImageUpload({ value, onChange }: { value: string | undefined; onChange: (url: string | undefined) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 10MB).");
      return;
    }
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? "anon";
      const ext = file.name.split(".").pop() || "png";
      const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("station-materials").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("station-materials").getPublicUrl(path);
      onChange(pub.publicUrl);
      toast.success("Imagem enviada.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Falha no upload", { description: msg });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="Material" className="max-h-48 rounded-lg border border-border" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 h-6 w-6"
            onClick={() => onChange(undefined)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          <ImageIcon className="mx-auto mb-2 h-6 w-6 opacity-50" />
          Nenhuma imagem
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        <Upload className="h-4 w-4" /> {uploading ? "Enviando..." : value ? "Trocar imagem" : "Enviar imagem"}
      </Button>
    </div>
  );
}

function SectionMaterials({ materials, onChange }: { materials: DeliverableMaterial[]; onChange: (m: DeliverableMaterial[]) => void }) {
  function add() {
    const next = [...materials, {
      id: `imp${materials.length + 1}`,
      name: "",
      type: "Impresso",
      description: "",
      content: "",
      autoDeliver: false,
    }];
    onChange(next);
  }
  function update(i: number, patch: Partial<DeliverableMaterial>) {
    const next = materials.map((m, idx) => idx === i ? { ...m, ...patch } : m);
    onChange(next);
  }
  function remove(i: number) {
    onChange(materials.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= materials.length) return;
    const next = [...materials];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  const [openIdx, setOpenIdx] = useState<Record<number, boolean>>({});
  function toggle(i: number) {
    setOpenIdx((s) => ({ ...s, [i]: !s[i] }));
  }

  return (
    <Section title="Impressos e materiais entregáveis" hint="Materiais que o ator libera quando o candidato solicita ou cumpre um gatilho.">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4" /> Adicionar impresso</Button>
      </div>
      {materials.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum impresso ainda. Adicione exames, ECGs, imagens ou respostas do paciente.
        </p>
      ) : (
        <div className="space-y-3">
          {materials.map((m, i) => {
            const isOpen = !!openIdx[i];
            return (
            <div key={i} className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                  <Badge variant="outline" className="border-mint/30 text-mint">Impresso {i + 1}</Badge>
                  {m.name && <span className="text-sm text-muted-foreground truncate">{m.name}</span>}
                </button>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === materials.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              {isOpen && (
                <>
                  <div>
                    <Label>Nome (curto, ex: "Pulso e respiração")</Label>
                    <Input value={m.name} onChange={(e) => update(i, { name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Conteúdo entregue</Label>
                    <Textarea rows={4} value={m.content} onChange={(e) => update(i, { content: e.target.value })}
                      placeholder="Texto/resultado que será mostrado ao candidato." />
                  </div>
                  <div>
                    <Label>Imagem (opcional) — ex: ECG, radiografia, foto de lesão</Label>
                    <MaterialImageUpload
                      value={m.imageUrl}
                      onChange={(url) => update(i, { imageUrl: url })}
                    />
                  </div>
                </>
              )}
            </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function ChecklistBulkImport({
  stationId, currentCount, reload, onFilled,
}: { stationId: string; currentCount: number; reload: () => Promise<void>; onFilled?: () => void }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const parseFn = useServerFn(parseChecklistBulk);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).filter((f) =>
      f.type === "application/pdf" ||
      f.type.startsWith("image/") ||
      /\.(pdf|png|jpe?g|webp|gif|heic)$/i.test(f.name),
    );
    if (!next.length) return toast.error("Selecione PDFs ou imagens");
    setFiles((prev) => [...prev, ...next].slice(0, 8));
  }

  async function run() {
    if (!text.trim() && !files.length) {
      return toast.error("Cole um texto ou anexe um PDF/imagem");
    }
    setLoading(true);
    try {
      const payload = {
        text: text.trim() || undefined,
        files: await Promise.all(files.map(async (f) => ({ name: f.name, dataUrl: await fileToDataUrl(f) }))),
      };
      const result = await parseFn({ data: payload });
      const list = result.checklist_items ?? [];
      if (!list.length) {
        toast.error("A IA não encontrou itens de checklist");
        return;
      }
      const rows = list.map((ci, idx) => {
        const pts = Number(ci.points) > 0 ? Number(ci.points) : 1;
        const { description, category } = normalizeChecklistFields(ci.description, ci.category);
        return {
          station_id: stationId,
          description,
          category,
          points: pts,
          helper_text: ci.helper_text ?? null,
          order_index: currentCount + idx,
          levels: ci.levels?.length ? ci.levels : defaultLevels(pts),
        };
      });
      const { error } = await supabase.from("station_checklist_items").insert(rows as never);
      if (error) return toast.error("Falha ao inserir itens", { description: error.message });
      toast.success(`${rows.length} itens adicionados ao checklist`);
      setText("");
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      await reload();
      onFilled?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao processar";
      toast.error("Falha na IA", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-xl border border-dashed border-border bg-background/40 p-3 space-y-3"
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-mint" /> Adicionar vários itens de uma vez com IA
      </div>
      <p className="text-xs text-muted-foreground">
        Cole o checklist completo (texto), ou anexe PDF/imagem (print de prova, foto da grade) e a IA
        organiza os itens com categorias, pontos e níveis. Os itens são adicionados ao final da lista.
      </p>
      <Textarea
        rows={4}
        placeholder={"Cole aqui o PEP / checklist completo. Ex.:\n1. Apresenta-se ao paciente (0,5 pt)\n2. Pergunta sobre tempo de evolução, dor, vômitos, sialorreia... (1,5 pt)\n..."}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" /> Anexar PDF/imagem
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <span className="text-xs text-muted-foreground">Ou arraste e solte · até 8 arquivos</span>
      </div>
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between rounded border border-border bg-card/60 px-3 py-1.5 text-xs">
              <span className="flex items-center gap-2 truncate">
                {f.type.startsWith("image/") ? <ImageIcon className="h-3.5 w-3.5 text-mint" /> : <FileText className="h-3.5 w-3.5 text-mint" />}
                {f.name}
                <span className="text-muted-foreground">({Math.round(f.size / 1024)} KB)</span>
              </span>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <Button type="button" variant="hero" onClick={run} disabled={loading}>
          <Sparkles className="h-4 w-4" /> {loading ? "Organizando com IA..." : "Organizar e adicionar"}
        </Button>
      </div>
    </div>
  );
}

function SectionChecklist({ stationId, items, reload, onChecklistFilled }: { stationId: string; items: Item[]; reload: () => Promise<void>; onChecklistFilled?: () => void }) {
  const [draft, setDraft] = useState({ description: "", category: "Apresentação", points: 1 });

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.description.trim()) return toast.error("Descrição obrigatória");
    const pts = Number(draft.points) || 1;
    const category = (draft.category || "Anamnese").replace(/^\s*\d+\.\s*/, "").trim() || "Anamnese";
    const payload = {
      station_id: stationId,
      description: draft.description.trim(),
      category,
      points: pts,
      order_index: items.length,
      levels: defaultLevels(pts),
      helper_text: null,
    } as never;
    const { error } = await supabase.from("station_checklist_items").insert(payload);
    if (error) return toast.error("Erro", { description: error.message });
    setDraft({ description: "", category: draft.category, points: pts });
    await reload();
  }

  async function patchItem(item: Item, patch: Partial<Item>) {
    const next: Partial<Item> = { ...patch };
    if (patch.points !== undefined && (!Array.isArray(item.levels) || !item.levels.length)) {
      next.levels = defaultLevels(Number(patch.points) || 1);
    }
    const { error } = await supabase
      .from("station_checklist_items")
      .update(next as never)
      .eq("id", item.id);
    if (error) return toast.error("Erro ao salvar item", { description: error.message });
    await reload();
  }

  async function patchLevel(item: Item, levelIdx: number, patch: Partial<ChecklistLevel>) {
    const levels = item.levels.map((l, i) => i === levelIdx ? { ...l, ...patch } : l);
    const { error } = await supabase
      .from("station_checklist_items")
      .update({ levels } as never)
      .eq("id", item.id);
    if (error) return toast.error("Erro", { description: error.message });
    await reload();
  }

  async function remove(item: Item) {
    if (!confirm("Excluir este item?")) return;
    const { error } = await supabase.from("station_checklist_items").delete().eq("id", item.id);
    if (error) return toast.error("Erro", { description: error.message });
    await reload();
  }

  async function duplicate(item: Item) {
    const payload = {
      station_id: stationId,
      description: item.description + " (cópia)",
      category: item.category,
      points: item.points,
      helper_text: item.helper_text,
      order_index: items.length,
      levels: item.levels,
    } as never;
    const { error } = await supabase.from("station_checklist_items").insert(payload);
    if (error) return toast.error("Erro", { description: error.message });
    await reload();
  }

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const a = items[i], b = items[j];
    await Promise.all([
      supabase.from("station_checklist_items").update({ order_index: b.order_index } as never).eq("id", a.id),
      supabase.from("station_checklist_items").update({ order_index: a.order_index } as never).eq("id", b.id),
    ]);
    await reload();
  }

  const totalPts = items.reduce((s, i) => s + Number(i.points || 0), 0);

  return (
    <Section title="Checklist PEP graduado" hint="Cada item tem 3 níveis: Inadequado / Parcialmente adequado / Adequado.">
      <form onSubmit={addItem} className="grid gap-2 rounded-xl border border-border bg-background/40 p-3 md:grid-cols-[1fr,200px,90px,auto]">
        <Textarea rows={3} placeholder="Descrição do item (pode usar várias linhas, ;, . etc.)" value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <Input placeholder="Categoria (ex: Anamnese)" value={draft.category}
          onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
        <Input type="number" step="0.1" min={0.1} max={20} value={draft.points}
          onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })} />
        <Button type="submit" variant="hero"><Plus className="h-4 w-4" /> Adicionar</Button>
      </form>

      <ChecklistBulkImport stationId={stationId} currentCount={items.length} reload={reload} onFilled={onChecklistFilled} />

      <div className="text-xs text-muted-foreground">
        {items.length} itens · {totalPts.toFixed(2)} pts totais
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum item de checklist ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.id} className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-mono text-muted-foreground">#{i + 1}</span>
                  <Badge variant="outline">{item.category}</Badge>
                  <Badge className="bg-mint/15 text-mint hover:bg-mint/15">{Number(item.points).toFixed(2)} pts</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => duplicate(item)}><Copy className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(item)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr,220px]">
                <div>
                  <Label>Descrição</Label>
                  <Textarea rows={8} className="min-h-[180px] font-mono text-sm leading-relaxed whitespace-pre-wrap"
                    defaultValue={item.description}
                    onBlur={(e) => e.target.value !== item.description && patchItem(item, { description: e.target.value })} />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input defaultValue={item.category}
                    onBlur={(e) => e.target.value.trim() !== item.category && patchItem(item, { category: e.target.value.trim() || "Anamnese" })} />
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    A pontuação máxima é definida automaticamente pela soma dos níveis abaixo.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Níveis de avaliação</div>
                <LevelsEditor
                  item={item}
                  onSet={async (levels) => {
                    const maxPts = levels.reduce((m, l) => Math.max(m, Number(l.points) || 0), 0);
                    const { error } = await supabase
                      .from("station_checklist_items")
                      .update({ levels, points: maxPts } as never)
                      .eq("id", item.id);
                    if (error) {
                      toast.error("Erro", { description: error.message });
                      return;
                    }
                    await reload();
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

type LevelKind = "Inadequado" | "Parcialmente adequado" | "Adequado";

function classifyLevel(label: string): LevelKind {
  const v = (label ?? "").toLowerCase().trim();
  if (v.startsWith("parcial")) return "Parcialmente adequado";
  if (v.startsWith("inadequ") || v.startsWith("não") || v.startsWith("nao")) return "Inadequado";
  return "Adequado";
}

function LevelsEditor({
  item,
  onSet,
}: {
  item: Item;
  onSet: (levels: ChecklistLevel[]) => void | Promise<void>;
}) {
  const current = (item.levels?.length ? item.levels : defaultLevels(Number(item.points) || 1));
  const max = Number(item.points) || 1;

  const byKind = new Map<LevelKind, ChecklistLevel>();
  current.forEach((lv) => {
    const k = classifyLevel(lv.label);
    if (!byKind.has(k)) byKind.set(k, lv);
  });
  // Ensure Adequado always exists (required)
  const adequado: ChecklistLevel = byKind.get("Adequado") ?? { label: "Adequado", points: max, description: "Realiza completamente." };
  const parcial = byKind.get("Parcialmente adequado");
  const inadequado = byKind.get("Inadequado");

  function persist(next: { adequado: ChecklistLevel; parcial?: ChecklistLevel | null; inadequado?: ChecklistLevel | null }) {
    const out: ChecklistLevel[] = [];
    if (next.inadequado) out.push({ ...next.inadequado, label: "Inadequado" });
    if (next.parcial) out.push({ ...next.parcial, label: "Parcialmente adequado" });
    out.push({ ...next.adequado, label: "Adequado" });
    void onSet(out);
  }

  const rows: Array<{
    kind: LevelKind;
    level: ChecklistLevel | undefined;
    locked?: boolean;
    defaultPts: number;
    placeholder: string;
  }> = [
    { kind: "Inadequado", level: inadequado, defaultPts: 0, placeholder: "Não realiza." },
    { kind: "Parcialmente adequado", level: parcial, defaultPts: Math.round((max / 2) * 100) / 100, placeholder: "Realiza parcialmente." },
    { kind: "Adequado", level: adequado, locked: true, defaultPts: max, placeholder: "Realiza completamente." },
  ];

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const checked = row.locked || !!row.level;
        const lv = row.level ?? { label: row.kind, points: row.defaultPts, description: "" };
        const tone =
          row.kind === "Adequado" ? "border-mint/40 bg-mint/5"
            : row.kind === "Parcialmente adequado" ? "border-warning/30 bg-warning/5"
              : "border-destructive/30 bg-destructive/5";
        return (
          <div key={row.kind} className={cn("grid items-center gap-2 rounded-lg border p-2 md:grid-cols-[200px,110px,1fr]", tone, !checked && "opacity-60")}>
            <label className="flex items-center gap-2 text-sm font-medium">
              {row.locked ? (
                <span className="flex h-5 w-5 items-center justify-center rounded bg-mint text-white" title="Obrigatório">
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : (
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-mint"
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const newLv = { label: row.kind, points: row.defaultPts, description: row.placeholder };
                      if (row.kind === "Inadequado") persist({ adequado, parcial, inadequado: newLv });
                      else persist({ adequado, parcial: newLv, inadequado });
                    } else {
                      if (row.kind === "Inadequado") persist({ adequado, parcial, inadequado: null });
                      else persist({ adequado, parcial: null, inadequado });
                    }
                  }}
                />
              )}
              <span>{row.kind}</span>
            </label>
            <Input
              type="number"
              step="0.05"
              min={0}
              disabled={!checked}
              defaultValue={lv.points}
              key={`${row.kind}-${lv.points}-${checked}`}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (!checked || n === lv.points) return;
                const upd = { ...lv, points: n };
                if (row.kind === "Adequado") persist({ adequado: upd, parcial, inadequado });
                else if (row.kind === "Parcialmente adequado") persist({ adequado, parcial: upd, inadequado });
                else persist({ adequado, parcial, inadequado: upd });
              }}
            />
            <Input
              placeholder={row.placeholder}
              disabled={!checked}
              defaultValue={lv.description ?? ""}
              key={`${row.kind}-desc-${checked}`}
              onBlur={(e) => {
                const val = e.target.value;
                if (!checked || val === (lv.description ?? "")) return;
                const upd = { ...lv, description: val };
                if (row.kind === "Adequado") persist({ adequado: upd, parcial, inadequado });
                else if (row.kind === "Parcialmente adequado") persist({ adequado, parcial: upd, inadequado });
                else persist({ adequado, parcial, inadequado: upd });
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function SectionPedagogical({
  station, up,
}: {
  station: Station;
  up: <K extends keyof Station>(k: K, v: Station[K]) => void;
}) {
  return (
    <Section title="Notas pedagógicas (para o ator)" hint="Conteúdo que o ator usa para conduzir e avaliar, e que aparece no feedback final.">
      <div>
        <Label>Conduta esperada</Label>
        <Textarea rows={4} value={station.expected_conduct ?? ""} onChange={(e) => up("expected_conduct", e.target.value)} />
      </div>
      <div>
        <Label>Erros comuns</Label>
        <Textarea rows={3} value={station.common_mistakes ?? ""} onChange={(e) => up("common_mistakes", e.target.value)} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Observações para o ator / banca</Label>
          <Textarea rows={3} value={station.evaluator_notes ?? ""} onChange={(e) => up("evaluator_notes", e.target.value)} />
        </div>
        <div>
          <Label>Material de apoio pós-estação</Label>
          <Textarea rows={3} value={station.post_materials ?? ""} onChange={(e) => up("post_materials", e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Critérios de pontuação (resumo textual)</Label>
        <Textarea rows={3} value={station.scoring_criteria ?? ""} onChange={(e) => up("scoring_criteria", e.target.value)} />
      </div>
    </Section>
  );
}

function SectionReferences({
  station, up,
}: {
  station: Station;
  up: <K extends keyof Station>(k: K, v: Station[K]) => void;
}) {
  function addRef() {
    up("bibliographic_references", [...(station.bibliographic_references ?? []), { label: "", url: "" }]);
  }
  function updateRef(i: number, patch: Partial<BiblioRef>) {
    const next = (station.bibliographic_references ?? []).map((r, idx) => idx === i ? { ...r, ...patch } : r);
    up("bibliographic_references", next);
  }
  function removeRef(i: number) {
    up("bibliographic_references", (station.bibliographic_references ?? []).filter((_, idx) => idx !== i));
  }
  return (
    <Section title="Referências bibliográficas">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={addRef}><Plus className="h-4 w-4" /> Adicionar referência</Button>
      </div>
      <div className="space-y-2">
        {(station.bibliographic_references ?? []).map((r, i) => (
          <div key={i} className="grid gap-2 md:grid-cols-[2fr,2fr,auto]">
            <Input placeholder="Título / citação" value={r.label} onChange={(e) => updateRef(i, { label: e.target.value })} />
            <Input placeholder="URL (opcional)" value={r.url ?? ""} onChange={(e) => updateRef(i, { url: e.target.value })} />
            <Button variant="ghost" size="icon" onClick={() => removeRef(i)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SectionPublish({
  station, togglePublish,
}: {
  station: Station;
  togglePublish: () => unknown;
}) {
  return (
    <Section title="Publicar para os assinantes" hint="Estações publicadas aparecem para todos os usuários ativos.">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/40 p-4">
        <div>
          <div className="font-semibold">{station.published ? "Esta estação está PUBLICADA" : "Esta estação está em RASCUNHO"}</div>
          <div className="text-xs text-muted-foreground">
            {station.published ? "Visível para todos os assinantes." : "Apenas você e os admins enxergam."}
          </div>
        </div>
        <Button variant={station.published ? "outline" : "hero"} onClick={togglePublish}>
          {station.published ? <><EyeOff className="h-4 w-4" /> Despublicar</> : <><Eye className="h-4 w-4" /> Publicar agora</>}
        </Button>
      </div>
    </Section>
  );
}

type GeneratedCard = { id: string; front: string; back: string };
type GeneratedDeck = {
  deck_id: string;
  title: string;
  specialty: string;
  topic: string | null;
  cards: GeneratedCard[];
};

function SectionGenerateFlashcards({ station, items }: { station: Station; items: Item[] }) {
  const generate = useServerFn(generateDeckFromStation);
  const [loading, setLoading] = useState(false);
  const [deck, setDeck] = useState<GeneratedDeck | null>(null);
  const [linkedDecks, setLinkedDecks] = useState<Array<{ id: string; title: string; published: boolean; created_at: string; cards: number }>>([]);
  const checklistItems = items.map((it) => ({
    description: it.description,
    category: it.category,
    points: it.points,
    helper_text: it.helper_text,
  }));

  async function loadLinked() {
    const { data } = await supabase
      .from("flashcard_decks")
      .select("id,title,published,created_at, flashcards(count)")
      .eq("station_id", station.id)
      .order("created_at", { ascending: false });
    const rows = (data ?? []).map((d: { id: string; title: string; published: boolean; created_at: string; flashcards: { count: number }[] }) => ({
      id: d.id,
      title: d.title,
      published: d.published,
      created_at: d.created_at,
      cards: d.flashcards?.[0]?.count ?? 0,
    }));
    setLinkedDecks(rows);
  }

  useEffect(() => { void loadLinked(); }, [station.id]);

  async function run() {
    if (!station.title?.trim() || !station.specialty?.trim()) {
      toast.error("Preencha pelo menos o título e a área da estação.");
      return;
    }
    setLoading(true);
    setDeck(null);
    try {
      // A IA decide entre 10 e 15 cards (escolha aleatória dentro da faixa)
      const count = 10 + Math.floor(Math.random() * 6);
      const res = await generate({
        data: {
          station_id: station.id,
          title: station.title,
          specialty: station.specialty,
          topic: null,
          clinical_case: station.clinical_case ?? null,
          case_description: station.case_description ?? null,
          candidate_task: station.candidate_task ?? null,
          patient_info: station.patient_info ?? null,
          patient_script: station.patient_script ?? null,
          patient_profile: serializePatientProfile(station.patient_profile),
          support_materials: station.support_materials ?? null,
          evaluator_notes: station.evaluator_notes ?? null,
          deliverable_materials: (station.deliverable_materials ?? []).map((m) => ({
            name: m.name ?? null,
            type: m.type ?? null,
            description: m.description ?? null,
            content: m.content ?? null,
          })),
          educational_goal: station.educational_goal ?? null,
          expected_conduct: station.expected_conduct ?? null,
          common_mistakes: station.common_mistakes ?? null,
          scoring_criteria: station.scoring_criteria ?? null,
          references: (station.bibliographic_references ?? []).map((r) => ({ label: r.label, url: r.url })),
          checklist_items: checklistItems.slice(0, 200),
          count,
        },
      });
      // Busca os cards gerados para mostrar a pré-visualização inline
      const [{ data: d }, { data: cs }] = await Promise.all([
        supabase.from("flashcard_decks").select("title,specialty,topic").eq("id", res.deck_id).maybeSingle(),
        supabase.from("flashcards").select("id,front,back,position").eq("deck_id", res.deck_id).order("position"),
      ]);
      setDeck({
        deck_id: res.deck_id,
        title: (d?.title ?? station.title) as string,
        specialty: (d?.specialty ?? station.specialty) as string,
        topic: (d?.topic ?? null) as string | null,
        cards: ((cs ?? []) as GeneratedCard[]).map((c) => ({ id: c.id, front: c.front, back: c.back })),
      });
      toast.success(`Deck pronto com ${res.count} cards!`);
      void loadLinked();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao gerar flashcards", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section
      title="Gerar Flashcards desta estação"
      hint="A IA escolhe entre 10 e 15 cards baseados no tema da estação, usando diretrizes brasileiras (MS, SBC, SBP, FEBRASGO), ANVISA e guidelines internacionais. Você revisa e publica depois."
    >
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-mint/30 bg-mint/5 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-mint/20 p-2 text-mint">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Deck automático baseado em evidências</div>
            <div className="text-xs text-muted-foreground">
              A IA decide a quantidade ideal (10–15 cards) e mostra a pré-visualização aqui embaixo.
            </div>
          </div>
        </div>
        <div className="ml-auto">
          <Button variant="hero" onClick={run} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</> : <><Sparkles className="h-4 w-4" /> Gerar Flashcards</>}
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        A IA é um ponto de partida — revise sempre doses, contraindicações e critérios antes de publicar para os alunos.
      </p>

      {linkedDecks.length > 0 && (
        <div className="mt-3 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-display font-bold">
              Decks gerados desta estação
            </div>
            <Badge variant="outline">{linkedDecks.length}</Badge>
          </div>
          <div className="divide-y divide-border">
            {linkedDecks.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{d.title}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {d.cards} cards · {new Date(d.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                {d.published
                  ? <Badge variant="outline" className="border-mint/40 text-mint">Publicado</Badge>
                  : <Badge variant="outline">Rascunho</Badge>}
                <Link
                  to="/app/admin/flashcards/$id"
                  params={{ id: d.id }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
                >
                  Abrir →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {deck && <InlineDeckPreview deck={deck} />}
    </Section>
  );
}

function InlineDeckPreview({ deck }: { deck: GeneratedDeck }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [published, setPublished] = useState(false);
  const [pubLoading, setPubLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const total = deck.cards.length;
  const current = deck.cards[index];

  function go(delta: number) {
    setRevealed(false);
    setIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(total - 1, 0)));
  }

  async function togglePublish() {
    setPubLoading(true);
    const next = !published;
    const [{ error: deckErr }, { error: cardsErr }] = await Promise.all([
      supabase.from("flashcard_decks").update({ published: next }).eq("id", deck.deck_id),
      supabase.from("flashcards").update({ published: next }).eq("deck_id", deck.deck_id),
    ]);
    setPubLoading(false);
    if (deckErr || cardsErr) {
      toast.error("Falha ao atualizar publicação", { description: (deckErr ?? cardsErr)?.message });
      return;
    }
    setPublished(next);
    toast.success(next ? "Deck publicado para os alunos" : "Deck despublicado");
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4 text-mint" />
          <span className="font-display font-bold">Pré-visualização do aluno</span>
          <span className="text-muted-foreground">· {total} cards</span>
          {published && (
            <Badge variant="outline" className="border-mint/40 text-mint">Publicado</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <Play className="h-4 w-4" /> Pré-visualizar
          </Button>
          <Button variant="outline" size="sm" onClick={togglePublish} disabled={pubLoading}>
            {pubLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
              : published
                ? <><EyeOff className="h-4 w-4" /> Despublicar</>
                : <><Eye className="h-4 w-4" /> Publicar</>}
          </Button>
          <Link
            to="/app/admin/flashcards/$id"
            params={{ id: deck.deck_id }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            Abrir no editor →
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-start">
        <div className="mx-auto w-full max-w-[320px]">
          <DeckCover title={deck.title} specialty={deck.specialty} topic={deck.topic} />
        </div>

        {current ? (
          <div className="space-y-3">
            <div className="mx-auto w-full max-w-[440px]">
              <FlashcardFace
                side={revealed ? "back" : "front"}
                counter={`${index + 1} / ${total}`}
              >
                <div
                  className="w-full flex items-center justify-center text-center font-medium leading-relaxed"
                  style={{ padding: "6cqi", fontSize: "max(13px, 4.2cqi)" }}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {revealed ? current.back : current.front}
                  </p>
                </div>
              </FlashcardFace>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => go(-1)} disabled={index === 0}>
                <ChevronUp className="h-4 w-4 rotate-[-90deg]" /> Anterior
              </Button>
              <Button variant="hero" size="sm" onClick={() => setRevealed((r) => !r)}>
                {revealed ? "Ver pergunta" : "Ver resposta"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => go(1)} disabled={index >= total - 1}>
                Próximo <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
              </Button>
            </div>

            {revealed && (
              <div className="mt-1 flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground">Como o aluno autoavalia (apenas demonstração)</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => index < total - 1 && go(1)}
                    title="Errei / De novo"
                    className="h-12 w-12 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 text-xl flex items-center justify-center transition"
                  >
                    😕
                  </button>
                  <button
                    type="button"
                    onClick={() => index < total - 1 && go(1)}
                    title="Difícil"
                    className="h-12 w-12 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 text-xl flex items-center justify-center transition"
                  >
                    😐
                  </button>
                  <button
                    type="button"
                    onClick={() => index < total - 1 && go(1)}
                    title="Fácil"
                    className="h-12 w-12 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 text-xl flex items-center justify-center transition"
                  >
                    😄
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Nenhum card gerado.</div>
        )}
      </div>

      <DeckPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={deck.title}
        specialty={deck.specialty}
        topic={deck.topic}
        cards={deck.cards}
      />
    </div>
  );
}

// ============================================================
// Live preview — mirrors the actual Avaliado / Ator panels
// ============================================================
type PreviewMode = "candidato" | "ator";

function parsePreviewSubItems(description: string): { lead: string; subs: string[] } {
  const numbered = description.match(/\(\d+\)\s*[^()]+/g);
  if (numbered && numbered.length >= 2) {
    const firstIdx = description.indexOf(numbered[0]);
    const lead = description.slice(0, firstIdx).trim().replace(/[:;]\s*$/, "") || description.split(/[(:]/)[0].trim();
    return { lead, subs: numbered.map((s) => s.trim().replace(/[;.]$/, "")) };
  }
  const paren = description.match(/^(.*?)\(([^()]+,[^()]+)\)\s*$/);
  if (paren) {
    const subs = paren[2].split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    if (subs.length >= 2) return { lead: paren[1].trim(), subs };
  }
  const parts = description.split(";").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { lead: parts[0], subs: parts.slice(1) };
  return { lead: description, subs: [] };
}

function previewLevelTone(index: number, total: number): { idle: string; active: string } {
  const base = "text-muted-foreground hover:text-foreground";
  if (index === 0) return { idle: base, active: "bg-rose-500/85 text-white shadow-sm ring-1 ring-rose-400/60" };
  if (index === total - 1) return { idle: base, active: "bg-emerald-500/85 text-white shadow-sm ring-1 ring-emerald-400/60" };
  return { idle: base, active: "bg-amber-500/85 text-white shadow-sm ring-1 ring-amber-400/60" };
}

function StationLivePreview({ station, items }: { station: Station; items: Item[] }) {
  const [mode, setMode] = useState<PreviewMode>("candidato");
  const [previewMaterialId, setPreviewMaterialId] = useState<string | null>(null);
  const [pepLevels, setPepLevels] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [evalStatus, setEvalStatus] = useState<"em_andamento" | "aprovado" | "reprovado" | "repetir">("em_andamento");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [highlights, setHighlights] = useState<Record<string, boolean>>({});
  const [struck, setStruck] = useState<Set<string>>(new Set());
  const toggleStruck = (id: string) =>
    setStruck((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  const [copied, setCopied] = useState(false);
  const meta = getSpecialtyMeta(station.specialty);
  const materials = station.deliverable_materials ?? [];
  const p = station.patient_profile ?? {};
  const hasProfile = Object.values(p).some((v) => typeof v === "string" && v.trim().length > 0);
  const patientFormatted = hasProfile ? formatPatientProfile(p as never) : "";
  const scored = Object.keys(pepLevels).length;
  const earned = Object.values(pepLevels).reduce((sum, n) => sum + Number(n || 0), 0);
  const allScored = items.length > 0 && scored === items.length;
  const mm = String(station.duration_minutes || 10).padStart(2, "0");

  const tabs: { id: PreviewMode; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { id: "candidato", label: "Avaliado (candidato)", icon: User },
    { id: "ator", label: "Ator / Paciente", icon: Stethoscope },
  ];

  const copyPreviewCode = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl border border-border bg-background/40 p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = mode === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                active ? "bg-mint/15 text-mint shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-background/60 p-4 md:p-6">
        {mode === "candidato" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <PRBlock icon={MessageSquare} title="Cenário de atuação">
                <ScriptText text={station.clinical_case || "—"} />
              </PRBlock>
              {station.case_description && (
                <PRBlock icon={MessageSquare} title="Descrição do caso">
                  <ScriptText text={station.case_description} />
                </PRBlock>
              )}
              <PRBlock icon={ListChecks} title={`Nos ${station.duration_minutes} minutos de duração da estação, você deverá executar as seguintes tarefas`}>
                <ScriptText text={withDuration(station.candidate_task || "—", station.duration_minutes)} />
              </PRBlock>
              <PRBlock icon={Inbox} title="Materiais recebidos" right={<Badge variant="outline">0</Badge>}>
                <p className="text-sm text-muted-foreground">
                  Nenhum material ainda. Solicite exames e o ator entregará durante a estação.
                </p>
              </PRBlock>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Tempo
                </div>
                <div className="mt-2 font-mono text-3xl font-bold">{mm}:00</div>
                <div className="text-xs text-muted-foreground">Definido pelo ator/banca na sala.</div>
              </div>
            </div>
          </div>
        )}

        {mode === "ator" && (
          <div className="mx-auto max-w-7xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">
                  <Theater className="h-3 w-3" /> Painel do Ator
                </span>
                <span>•</span>
                <span>{station.specialty}</span>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn("inline-flex h-7 items-center rounded-md px-2 text-xs font-bold", meta.badge)}>
                      {meta.code}
                    </span>
                    <h1 className="truncate font-display text-lg font-bold text-foreground md:text-xl">
                      {station.title || "(sem título)"}
                    </h1>
                  </div>
                  <button
                    type="button"
                    onClick={copyPreviewCode}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:border-mint/40 hover:text-foreground"
                    title="Copiar link de convite"
                  >
                    <span className="truncate max-w-[160px]">PRÉVIA</span>
                    {copied ? <Check className="h-3 w-3 text-mint" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>

                <PRBlock icon={MessageSquare} title="Cenário de atuação">
                  <ScriptText text={station.clinical_case || "—"} />
                </PRBlock>

                {station.case_description && (
                  <PRBlock icon={MessageSquare} title="Descrição do caso">
                    <ScriptText text={station.case_description} />
                  </PRBlock>
                )}

                <PRBlock icon={ListChecks} title={`Nos ${station.duration_minutes} minutos de duração da estação, você deverá executar as seguintes tarefas`}>
                  <ScriptText text={withDuration(station.candidate_task || "—", station.duration_minutes)} />
                </PRBlock>

                <PRBlock icon={Theater} title="Orientações do Ator/Atriz">
                  <p className="mb-3 text-[11px] text-muted-foreground italic">
                    Dica: clique nas partes em <strong className="font-semibold">negrito</strong> para riscá-las. Selecione qualquer texto para marcá-lo; selecione de novo a mesma área para desmarcar.
                  </p>
                  {station.patient_script ? (
                    <ScriptText text={station.patient_script} />
                  ) : hasProfile ? (
                    <ScriptText text={patientFormatted} />
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma orientação preenchida.</p>
                  )}
                  {(p as { spontaneous?: string }).spontaneous && (
                    <SubBlock label="O que falar espontaneamente">
                      <ScriptText text={(p as { spontaneous?: string }).spontaneous ?? ""} />
                    </SubBlock>
                  )}
                  {(p as { doNotReveal?: string }).doNotReveal && (
                    <SubBlock label="Nunca revelar" tone="rose">
                      <ScriptText text={(p as { doNotReveal?: string }).doNotReveal ?? ""} />
                    </SubBlock>
                  )}
                  {((p as { emotionalTone?: string; actingTips?: string }).emotionalTone || (p as { emotionalTone?: string; actingTips?: string }).actingTips) && (
                    <SubBlock label="Tom emocional e atuação">
                      {(p as { emotionalTone?: string }).emotionalTone && <p><span className="font-medium">Tom:</span> {(p as { emotionalTone?: string }).emotionalTone}</p>}
                      {(p as { actingTips?: string }).actingTips && <p className="mt-1"><span className="font-medium">Dicas:</span> {(p as { actingTips?: string }).actingTips}</p>}
                    </SubBlock>
                  )}
                </PRBlock>

                <PRBlock
                  icon={Inbox}
                  title="Materiais para entregar ao candidato"
                  right={<Badge variant="outline" className="text-white border-white/30">0/{materials.length}</Badge>}
                >
                  {materials.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Esta estação não possui materiais cadastrados.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {materials.map((m, idx) => {
                        const isOpen = previewMaterialId === m.id;
                        const cleanName = (() => {
                          const clean = (m.name || "").replace(/^\s*impresso\s*\d+\s*[:\-–—()]*\s*/i, "").replace(/^\(\s*|\s*\)$/g, "").trim();
                          if (!clean) return "";
                          const sentence = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
                          return `( ${sentence} )`;
                        })();
                        return (
                          <div key={m.id || idx} className="flex h-full flex-col rounded-xl border border-border bg-background/40 p-3 transition-all hover:border-mint/40">
                            <button
                              type="button"
                              onClick={() => setPreviewMaterialId(isOpen ? null : m.id)}
                              className="group flex w-full items-start justify-between gap-2 text-left"
                              title="Clique para expandir / recolher"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 text-sm font-semibold group-hover:text-mint">
                                  <FileText className="h-4 w-4 text-mint" /> Impresso {idx + 1}{" "}
                                  <span className="font-normal text-muted-foreground">{cleanName}</span>
                                </div>
                                <div className="mt-0.5 text-[11px] text-muted-foreground">{isOpen ? "clique para recolher" : "clique para ver o conteúdo"}</div>
                                {m.description && <div className="mt-2 text-xs text-muted-foreground">{m.description}</div>}
                              </div>
                              <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                            </button>
                            {isOpen && (
                              <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                                {m.imageUrl && (
                                  <img
                                    src={m.imageUrl}
                                    alt={m.name || "Material"}
                                    className="mb-3 block h-auto w-full rounded-md border border-border"
                                  />
                                )}
                                {m.content
                                  ? <ScriptText text={m.content} />
                                  : (!m.imageUrl && <span className="italic text-muted-foreground">Sem conteúdo cadastrado.</span>)}
                              </div>
                            )}
                            <div className="mt-auto pt-3">
                              <Button size="sm" variant="hero" className="w-full" disabled>
                                <Send className="mr-1 h-4 w-4" /> Entregar
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </PRBlock>

                <PRBlock
                  icon={ClipboardCheck}
                  title="CHECKLIST ( PEP )"
                  right={<Badge variant="outline" className="text-white border-white/30">{scored}/{items.length}</Badge>}
                >
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum item de checklist cadastrado.</p>
                  ) : (
                    <ol className="space-y-3">
                      {items.map((it, idx) => {
                        const levels = [...(it.levels?.length ? it.levels : [{ label: "Inadequado", points: 0 }, { label: "Adequado", points: it.points }])].sort((a, b) => a.points - b.points);
                        const current = pepLevels[it.id];
                        const parts = parsePreviewSubItems(it.description);
                        return (
                          <li
                            key={it.id}
                            className={cn(
                              "grid grid-cols-[1fr_auto] gap-x-4 rounded-xl border px-4 py-3 transition-colors",
                              typeof current === "number" ? "border-mint/30 bg-mint/5" : "border-border bg-background/30",
                            )}
                          >
                            <div className="min-w-0">
                              <Highlightable>
                                <ScriptText
                                  text={formatPepHeading(idx, it.category, it.description)}
                                  className="text-sm font-semibold text-foreground"
                                  strikeable
                                  struck={struck}
                                  toggle={toggleStruck}
                                  prefix={it.id}
                                />
                              </Highlightable>
                              {parts.subs.length > 0 && (
                                <ul className="mt-2 space-y-0.5">
                                  {parts.subs.map((sub, si) => {
                                    const key = `${it.id}::${si}`;
                                    const active = !!highlights[key];
                                    return (
                                      <li key={key}>
                                        <button
                                          type="button"
                                          onClick={() => setHighlights((h) => ({ ...h, [key]: !h[key] }))}
                                          className={cn(
                                            "w-full rounded-md px-2 py-1 text-left text-sm transition-colors",
                                            active ? "bg-mint/40 text-night ring-1 ring-mint/60" : "text-foreground/85 hover:bg-white/5",
                                          )}
                                        >
                                          {sub}
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                              <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                                {levels.map((lv) => {
                                  const m = lv.label.match(/^([^:]+):\s*(.*)$/);
                                  const head = m ? m[1] : lv.label;
                                  const rest = m ? m[2] : "";
                                  return (
                                    <div key={lv.label}>
                                      <span className="font-bold text-foreground">{head}</span>
                                      {(rest || lv.description) && <span>: </span>}
                                      {rest && <span>{rest}</span>}
                                      {lv.description && <span>{rest ? " " : ""}{lv.description}</span>}
                                    </div>
                                  );
                                })}
                              </div>
                              <Textarea
                                value={comments[it.id] ?? ""}
                                onChange={(e) => setComments((c) => ({ ...c, [it.id]: e.target.value }))}
                                placeholder="Comentário (opcional)"
                                rows={2}
                                className="mt-3"
                                disabled
                              />
                            </div>
                            <div className="flex flex-col items-center gap-1 tabular-nums">
                              {levels.map((lv, li) => {
                                const selected = current === lv.points;
                                const tone = previewLevelTone(li, levels.length);
                                return (
                                  <button
                                    key={lv.label}
                                    type="button"
                                    onClick={() => setPepLevels((c) => {
                                      if (c[it.id] === lv.points) {
                                        const { [it.id]: _discard, ...rest } = c;
                                        return rest;
                                      }
                                      return { ...c, [it.id]: lv.points };
                                    })}
                                    className={cn(
                                      "flex h-7 w-9 items-center justify-center rounded-md text-sm font-bold transition-colors",
                                      selected ? tone.active : tone.idle,
                                    )}
                                    title={lv.label}
                                  >
                                    {lv.points}
                                  </button>
                                );
                              })}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  <div className="mt-5 rounded-xl border border-border bg-background/40 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Comentário final ao candidato
                    </div>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={4}
                      placeholder="Pontos fortes, pontos a melhorar..."
                      className="mt-2"
                      disabled
                    />
                  </div>

                  {!allScored && items.length > 0 && (
                    <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      <span className="font-bold">Atenção:</span> este checklist ainda não foi salvo. Só será salvo uma vez que todos os itens do PEP forem selecionados ({scored}/{items.length}).
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Nota parcial:</span>{" "}
                      <span className="font-bold text-mint">{earned.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={evalStatus} onValueChange={(v) => setEvalStatus(v as typeof evalStatus)} disabled>
                        <SelectTrigger className="h-9 w-[180px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="em_andamento">Em andamento</SelectItem>
                          <SelectItem value="aprovado">Aprovado</SelectItem>
                          <SelectItem value="reprovado">Reprovado</SelectItem>
                          <SelectItem value="repetir">Pedir repetição</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" disabled>Salvar rascunho</Button>
                      <Button variant="hero" disabled>
                        <Send className="mr-1 h-4 w-4" /> Enviar correção
                      </Button>
                    </div>
                  </div>
                </PRBlock>

                {(station.educational_goal || station.expected_conduct || station.common_mistakes) && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAnalysis((v) => !v)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-gradient-hero px-4 py-3 text-sm font-medium text-white shadow-elegant transition-opacity hover:opacity-90"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Análise de resultados
                      <ChevronDown className={cn("h-4 w-4 transition-transform", showAnalysis && "rotate-180")} />
                    </button>
                    {showAnalysis && (
                      <div className="mt-3 space-y-3">
                        {station.educational_goal && <SubBlock label="Objetivo educacional">{station.educational_goal}</SubBlock>}
                        {station.expected_conduct && <SubBlock label="Conduta esperada">{station.expected_conduct}</SubBlock>}
                        {station.common_mistakes && <SubBlock label="Erros comuns" tone="rose">{station.common_mistakes}</SubBlock>}
                      </div>
                    )}
                  </div>
                )}

                {station.bibliographic_references?.length > 0 && (
                  <PRBlock icon={BookOpen} title="Referências bibliográficas">
                    <ul className="space-y-2">
                      {station.bibliographic_references.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
                          {r.url ? (
                            <a href={r.url} target="_blank" rel="noreferrer" className="break-all text-mint underline-offset-2 hover:underline">
                              {r.label || r.url}
                            </a>
                          ) : (
                            <span className="text-foreground/90">{r.label}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </PRBlock>
                )}

                <PRBlock icon={MessageSquareWarning} title="Feedback | Erro, Dúvida ou Sugestão">
                  <p className="text-sm text-muted-foreground">
                    Encontrou algum problema ou tem sugestões sobre esta estação? Envie um feedback para a equipe.
                  </p>
                  <Button variant="hero" className="mt-3" disabled>
                    <MessageCircle className="mr-1 h-4 w-4" /> Enviar feedback
                  </Button>
                </PRBlock>
              </div>

              <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
                <div className="rounded-2xl border border-border bg-gradient-hero p-4 text-white shadow-elegant">
                  <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-white/70">
                    Aguardando início
                  </div>
                  <div className="mt-2 rounded-xl bg-white/5 px-5 py-6 text-center transition-colors">
                    <div className="font-display text-5xl font-bold tabular-nums text-white">
                      {mm}:00
                    </div>
                    <div className="mt-3">
                      <Select value={String(station.duration_minutes || 10)} disabled>
                        <SelectTrigger className="mx-auto h-8 w-auto gap-1 border-white/20 bg-white/10 px-3 text-xs text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 6, 7, 8, 9, 10].map((m) => (
                            <SelectItem key={m} value={String(m)}>{m} minutos</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="mt-1 text-[10px] text-white/60">Tempo da estação</div>
                    </div>
                  </div>
                  <Button variant="hero" className="mt-3 w-full" disabled>
                    <Play className="mr-1 h-4 w-4" /> Aguardando candidato...
                  </Button>
                  <Button variant="outline" className="mt-2 w-full" disabled>
                    <Square className="mr-1 h-4 w-4" /> Encerrar estação
                  </Button>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Resultado
                  </div>
                  <div className="mt-2 rounded-xl bg-background/60 px-4 py-3 text-center">
                    <div className="font-display text-xl font-bold tabular-nums text-mint">
                      {earned.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Status da avaliação
                  </div>
                  <Select value={evalStatus} onValueChange={(v) => setEvalStatus(v as typeof evalStatus)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_andamento">Aguardando...</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="reprovado">Reprovado</SelectItem>
                      <SelectItem value="repetir">Pedir repetição</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Participantes (0)
                    </div>
                    <span className="text-[10px] text-muted-foreground">avaliado da vez</span>
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    <UserPlus className="h-4 w-4" />
                    Aguardando participantes.
                  </div>
                </div>

                <div className="rounded-2xl border border-mint/20 bg-mint/5 p-4">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-mint">
                    <span>Convite do candidato</span>
                    <Badge variant="outline" className="border-mint/30 text-mint">PRÉVIA</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-mint" />
                    <span className="truncate">revmed.app.br/convite/PRÉVIA</span>
                    <Copy className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" disabled>WhatsApp</Button>
                    <Button size="sm" variant="outline" disabled>E-mail</Button>
                    <Button size="sm" variant="outline" disabled>Reenviar</Button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============= Resumo gerado por IA =============

type GeneratedSummary = {
  id: string;
  title: string;
  specialty: string;
  topic: string | null;
  difficulty: string;
  definition: string | null;
  clinical_picture: string | null;
  diagnosis: string | null;
  conduct: string | null;
  key_points: string | null;
  pitfalls: string | null;
  content_md: string | null;
};

function SectionGenerateSummary({ station, items }: { station: Station; items: Item[] }) {
  const generate = useServerFn(generateSummaryFromStation);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<GeneratedSummary | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [published, setPublished] = useState(false);
  const [pubLoading, setPubLoading] = useState(false);
  const [validation, setValidation] = useState<{ verdict: string; blocking: boolean; issues: Array<{ field: string; severity: "error" | "warn"; message: string }> } | null>(null);
  const [linked, setLinked] = useState<Array<{ id: string; title: string; published: boolean; created_at: string }>>([]);
  const checklistItems = items.map((it) => ({
    description: it.description,
    category: it.category,
    points: it.points,
    helper_text: it.helper_text,
  }));

  async function loadLinked() {
    const { data } = await supabase
      .from("summaries")
      .select("id,title,published,created_at")
      .eq("station_id", station.id)
      .order("created_at", { ascending: false })
      .limit(8);
    setLinked((data ?? []) as Array<{ id: string; title: string; published: boolean; created_at: string }>);
  }
  useEffect(() => { void loadLinked(); }, [station.id]);


  const checklistCount = checklistItems.length;
  const canGenerate = checklistCount > 0 && !!station.title?.trim() && !!station.specialty?.trim();

  async function run() {
    if (!station.title?.trim() || !station.specialty?.trim()) {
      toast.error("Preencha pelo menos o título e a área da estação.");
      return;
    }
    if (checklistCount === 0) {
      toast.error("O checklist (PEP) está vazio. Preencha os itens do PEP antes de gerar o resumo — a IA usa o checklist como base.");
      return;
    }
    setLoading(true);
    setSummary(null);
    setPublished(false);
    setValidation(null);
    try {
      const res = await generate({
        data: {
          station_id: station.id,
          title: station.title,
          specialty: station.specialty,
          topic: null,
          clinical_case: station.clinical_case ?? null,
          case_description: station.case_description ?? null,
          candidate_task: station.candidate_task ?? null,
          patient_info: station.patient_info ?? null,
          patient_script: station.patient_script ?? null,
          patient_profile: serializePatientProfile(station.patient_profile),
          support_materials: station.support_materials ?? null,
          evaluator_notes: station.evaluator_notes ?? null,
          deliverable_materials: (station.deliverable_materials ?? []).map((m) => ({
            name: m.name ?? null,
            type: m.type ?? null,
            description: m.description ?? null,
            content: m.content ?? null,
          })),
          educational_goal: station.educational_goal ?? null,
          expected_conduct: station.expected_conduct ?? null,
          common_mistakes: station.common_mistakes ?? null,
          scoring_criteria: station.scoring_criteria ?? null,
          references: (station.bibliographic_references ?? []).map((r) => ({ label: r.label, url: r.url })),
          checklist_items: checklistItems.slice(0, 200),
        },
      });
      setSummary(res.summary as GeneratedSummary);
      setModalOpen(true);
      const v = (res as { validation?: { verdict: string; blocking: boolean; issues: Array<{ field: string; severity: "error" | "warn"; message: string }> } }).validation ?? null;
      setValidation(v);
      if (v?.blocking) toast.warning("Resumo gerado com alertas críticos — revise antes de publicar.");
      else if ((v?.issues ?? []).length > 0) toast.message("Resumo gerado com avisos da validação automática.");
      else toast.success("Resumo pronto e aprovado pela validação automática!");
      void loadLinked();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao gerar resumo", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  async function togglePublish() {
    if (!summary) return;
    const next = !published;
    if (next && validation?.blocking) {
      toast.error("Não é possível publicar: a validação automática encontrou erros críticos. Edite manualmente o resumo na área de Resumos antes de publicar.");
      return;
    }
    setPubLoading(true);
    const { error } = await supabase.from("summaries").update({ published: next }).eq("id", summary.id);
    setPubLoading(false);
    if (error) return toast.error("Falha ao publicar", { description: error.message });
    setPublished(next);
    toast.success(next ? "Resumo publicado para os alunos" : "Resumo despublicado");
  }

  return (
    <Section
      title="Gerar Resumo desta estação"
      hint="A IA cria um resumo estruturado (Definição, Quadro clínico, Diagnóstico, Conduta, Pontos-chave, Armadilhas) com base no CHECKLIST (PEP) preenchido + descrição da estação, usando SOMENTE Ministério da Saúde, ANVISA, PCDTs do SUS, diretrizes brasileiras (SBC, SBP, FEBRASGO…), matriz do Revalida/INEP e guidelines internacionais consagradas. O título do resumo é o mesmo título da estação/checklist."
    >
      <div
        className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 transition-colors ${
          checklistCount > 0
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-rose-500/40 bg-rose-500/5"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`rounded-lg p-2 ${
              checklistCount > 0 ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"
            }`}
          >
            {checklistCount > 0 ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">Resumo clínico baseado no PEP desta estação</span>
              <Badge
                variant="outline"
                className={
                  checklistCount > 0
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700"
                    : "border-rose-500/50 bg-rose-500/10 text-rose-700"
                }
              >
                {checklistCount > 0
                  ? `Checklist pronto · ${checklistCount} ${checklistCount === 1 ? "item" : "itens"}`
                  : "Checklist vazio"}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {checklistCount > 0
                ? <>Usará os <strong>{checklistCount}</strong> {checklistCount === 1 ? "item" : "itens"} do checklist + descrição da estação. Fontes oficiais MS / ANVISA / SUS / sociedades.</>
                : <span className="text-rose-600 font-semibold">Preencha o PEP acima antes de gerar o resumo.</span>}
            </div>
          </div>
        </div>
        <div className="ml-auto">
          <Button variant="hero" onClick={run} disabled={loading || !canGenerate}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</> : <><Sparkles className="h-4 w-4" /> Gerar Resumo</>}
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Sempre revise doses, contraindicações e critérios antes de publicar para os alunos.
      </p>

      {summary && (
        <SummaryModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          summary={summary}
          published={published}
          pubLoading={pubLoading}
          onTogglePublish={togglePublish}
          validation={validation}
        />
      )}

      {linked.length > 0 && (
        <div className="mt-3 rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-display font-bold">Resumos conectados a esta estação</div>
            <Badge variant="outline">{linked.length}</Badge>
          </div>
          <div className="divide-y divide-border">
            {linked.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{s.title}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                {s.published
                  ? <Badge variant="outline" className="border-mint/40 text-mint">Publicado</Badge>
                  : <Badge variant="outline">Rascunho</Badge>}
                <Link
                  to="/app/admin/resumos/$id"
                  params={{ id: s.id }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
                >
                  Abrir →
                </Link>

              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

function SummaryModal({
  open, onOpenChange, summary, published, pubLoading, onTogglePublish, validation,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  summary: GeneratedSummary;
  published: boolean;
  pubLoading: boolean;
  onTogglePublish: () => void;
  validation: { verdict: string; blocking: boolean; issues: Array<{ field: string; severity: "error" | "warn"; message: string }> } | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{summary.title}</DialogTitle>
          <DialogDescription>
            Resumo clínico gerado a partir do checklist (PEP) desta estação.
          </DialogDescription>
        </DialogHeader>

        {validation && (
          <div className={cn(
            "rounded-xl border p-3 text-sm",
            validation.blocking
              ? "border-rose-400/40 bg-rose-500/5"
              : (validation.issues.length > 0 ? "border-amber-400/40 bg-amber-500/5" : "border-mint/40 bg-mint/5")
          )}>
            <div className="flex items-center gap-2 font-display font-bold">
              {validation.blocking ? (
                <><AlertTriangle className="h-4 w-4 text-rose-500" /> Validação: erros críticos</>
              ) : validation.issues.length > 0 ? (
                <><AlertTriangle className="h-4 w-4 text-amber-500" /> Validação: avisos</>
              ) : (
                <><ClipboardCheck className="h-4 w-4 text-mint" /> Validação: aprovado</>
              )}
              <span className="ml-auto text-xs font-normal text-muted-foreground">Veredito IA: {validation.verdict}</span>
            </div>
            {validation.issues.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {validation.issues.map((i, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                      i.severity === "error" ? "bg-rose-500/15 text-rose-600" : "bg-amber-500/15 text-amber-700"
                    )}>{i.severity}</span>
                    <span><strong>{i.field}:</strong> {i.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <InlineSummaryPreview
          summary={summary}
          published={published}
          pubLoading={pubLoading}
          onTogglePublish={onTogglePublish}
        />
      </DialogContent>
    </Dialog>
  );
}

function InlineSummaryPreview({
  summary, published, pubLoading, onTogglePublish,
}: {
  summary: GeneratedSummary;
  published: boolean;
  pubLoading: boolean;
  onTogglePublish: () => void;
}) {
  const meta = getSpecialtyMeta(summary.specialty);
  const Block = ({
    icon: Icon, title, text, tone = "default",
  }: { icon: ComponentType<{ className?: string }>; title: string; text: string | null; tone?: "default" | "highlight" | "warn" }) => {
    if (!text || !text.trim()) return null;
    const toneCls =
      tone === "highlight" ? "border-mint/30 bg-mint/5"
      : tone === "warn" ? "border-amber-400/30 bg-amber-400/5"
      : "border-border bg-background";
    const iconCls =
      tone === "highlight" ? "text-mint"
      : tone === "warn" ? "text-amber-500"
      : "text-muted-foreground";
    return (
      <section className={cn("rounded-2xl border p-4", toneCls)}>
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", iconCls)} />
          <h4 className="font-display text-xs font-bold uppercase tracking-wide">{title}</h4>
        </div>
        <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{text}</div>
      </section>
    );
  };

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4 text-mint" />
          <span className="font-display font-bold">Pré-visualização do aluno</span>
          {published && (
            <Badge variant="outline" className="border-mint/40 text-mint">Publicado</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onTogglePublish} disabled={pubLoading}>
            {pubLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
              : published
                ? <><EyeOff className="h-4 w-4" /> Despublicar</>
                : <><Eye className="h-4 w-4" /> Publicar</>}
          </Button>
          <Link
            to="/app/resumos/$id"
            params={{ id: summary.id }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            Abrir página completa →
          </Link>
        </div>
      </div>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white", meta.solid)}>
            {meta.code}
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {summary.difficulty}
          </span>
        </div>
        <h3 className="font-display text-2xl font-bold leading-tight">{summary.title}</h3>
        {summary.topic && <div className="text-xs text-muted-foreground">{summary.topic}</div>}
      </header>

      <div className="space-y-3">
        <Block icon={BookOpen} title="Definição" text={summary.definition} />
        <Block icon={Stethoscope} title="Quadro clínico" text={summary.clinical_picture} />
        <Block icon={FileText} title="Diagnóstico" text={summary.diagnosis} />
        <Block icon={ClipboardCheck} title="Conduta" text={summary.conduct} />
        <Block icon={Target} title="Pontos-chave da prova" text={summary.key_points} tone="highlight" />
        <Block icon={AlertTriangle} title="Armadilhas e erros comuns" text={summary.pitfalls} tone="warn" />
        {summary.content_md && summary.content_md.trim() && (
          <Block icon={StickyNote} title="Fontes" text={summary.content_md} />
        )}
      </div>
    </div>
  );
}

// ============= Post-Checklist AI Dialog =============
// Aparece logo após a IA preencher o checklist (PEP) a partir do PDF/texto.
// Oferece gerar Flashcards, gerar Resumo, ou os dois em sequência.
// Para cada artefato, mostra pré-visualização + publicar.

type AIPhase = "idle" | "running-deck" | "running-summary" | "done";
type AIArtifact = {
  deck?: GeneratedDeck;
  summary?: GeneratedSummary;
  summaryValidation?: { verdict: string; blocking: boolean; issues: Array<{ field: string; severity: "error" | "warn"; message: string }> } | null;
  deckPublished?: boolean;
  summaryPublished?: boolean;
};

function PostChecklistAIDialog({
  open, onOpenChange, station, items,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  station: Station;
  items: Item[];
}) {
  const generateDeck = useServerFn(generateDeckFromStation);
  const generateSummary = useServerFn(generateSummaryFromStation);
  const [phase, setPhase] = useState<AIPhase>("idle");
  const [artifact, setArtifact] = useState<AIArtifact>({});
  const [deckPreviewOpen, setDeckPreviewOpen] = useState(false);
  const [summaryPreviewOpen, setSummaryPreviewOpen] = useState(false);
  const [pubDeckLoading, setPubDeckLoading] = useState(false);
  const [pubSummaryLoading, setPubSummaryLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      // reset apenas ao fechar
      setPhase("idle");
      setArtifact({});
      setDeckPreviewOpen(false);
      setSummaryPreviewOpen(false);
    }
  }, [open]);

  const checklistItems = items.map((it) => ({
    description: it.description,
    category: it.category,
    points: it.points,
    helper_text: it.helper_text,
  }));

  async function runDeck(): Promise<boolean> {
    setPhase("running-deck");
    try {
      const count = 10 + Math.floor(Math.random() * 6);
      const res = await generateDeck({
        data: {
          station_id: station.id,
          title: station.title,
          specialty: station.specialty,
          topic: null,
          clinical_case: station.clinical_case ?? null,
          case_description: station.case_description ?? null,
          candidate_task: station.candidate_task ?? null,
          patient_info: station.patient_info ?? null,
          patient_script: station.patient_script ?? null,
          patient_profile: serializePatientProfile(station.patient_profile),
          support_materials: station.support_materials ?? null,
          evaluator_notes: station.evaluator_notes ?? null,
          deliverable_materials: (station.deliverable_materials ?? []).map((m) => ({
            name: m.name ?? null,
            type: m.type ?? null,
            description: m.description ?? null,
            content: m.content ?? null,
          })),
          educational_goal: station.educational_goal ?? null,
          expected_conduct: station.expected_conduct ?? null,
          common_mistakes: station.common_mistakes ?? null,
          scoring_criteria: station.scoring_criteria ?? null,
          references: (station.bibliographic_references ?? []).map((r) => ({ label: r.label, url: r.url })),
          checklist_items: checklistItems.slice(0, 200),
          count,
        },
      });
      const [{ data: d }, { data: cs }] = await Promise.all([
        supabase.from("flashcard_decks").select("title,specialty,topic").eq("id", res.deck_id).maybeSingle(),
        supabase.from("flashcards").select("id,front,back,position").eq("deck_id", res.deck_id).order("position"),
      ]);
      const deck: GeneratedDeck = {
        deck_id: res.deck_id,
        title: (d?.title ?? station.title) as string,
        specialty: (d?.specialty ?? station.specialty) as string,
        topic: (d?.topic ?? null) as string | null,
        cards: ((cs ?? []) as GeneratedCard[]).map((c) => ({ id: c.id, front: c.front, back: c.back })),
      };
      setArtifact((a) => ({ ...a, deck, deckPublished: false }));
      toast.success(`Deck pronto com ${res.count} cards!`);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao gerar flashcards", { description: msg });
      return false;
    }
  }

  async function runSummary(): Promise<boolean> {
    setPhase("running-summary");
    try {
      const res = await generateSummary({
        data: {
          station_id: station.id,
          title: station.title,
          specialty: station.specialty,
          topic: null,
          clinical_case: station.clinical_case ?? null,
          case_description: station.case_description ?? null,
          candidate_task: station.candidate_task ?? null,
          patient_info: station.patient_info ?? null,
          patient_script: station.patient_script ?? null,
          patient_profile: serializePatientProfile(station.patient_profile),
          support_materials: station.support_materials ?? null,
          evaluator_notes: station.evaluator_notes ?? null,
          deliverable_materials: (station.deliverable_materials ?? []).map((m) => ({
            name: m.name ?? null,
            type: m.type ?? null,
            description: m.description ?? null,
            content: m.content ?? null,
          })),
          educational_goal: station.educational_goal ?? null,
          expected_conduct: station.expected_conduct ?? null,
          common_mistakes: station.common_mistakes ?? null,
          scoring_criteria: station.scoring_criteria ?? null,
          references: (station.bibliographic_references ?? []).map((r) => ({ label: r.label, url: r.url })),
          checklist_items: checklistItems.slice(0, 200),
        },
      });
      const v = (res as { validation?: { verdict: string; blocking: boolean; issues: Array<{ field: string; severity: "error" | "warn"; message: string }> } }).validation ?? null;
      setArtifact((a) => ({ ...a, summary: res.summary as GeneratedSummary, summaryValidation: v, summaryPublished: false }));
      if (v?.blocking) toast.warning("Resumo gerado com alertas críticos — revise antes de publicar.");
      else toast.success("Resumo pronto!");
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Falha ao gerar resumo", { description: msg });
      return false;
    }
  }

  async function onClickDeck() {
    const ok = await runDeck();
    setPhase(ok ? "done" : "idle");
  }
  async function onClickSummary() {
    if (items.length === 0) return toast.error("Checklist vazio.");
    const ok = await runSummary();
    setPhase(ok ? "done" : "idle");
  }
  async function onClickBoth() {
    if (items.length === 0) return toast.error("Checklist vazio.");
    const okDeck = await runDeck();
    const okSum = await runSummary();
    setPhase(okDeck || okSum ? "done" : "idle");
  }

  async function toggleDeckPublish() {
    if (!artifact.deck) return;
    const next = !artifact.deckPublished;
    setPubDeckLoading(true);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("flashcard_decks").update({ published: next }).eq("id", artifact.deck.deck_id),
      supabase.from("flashcards").update({ published: next }).eq("deck_id", artifact.deck.deck_id),
    ]);
    setPubDeckLoading(false);
    if (e1 || e2) return toast.error("Falha ao publicar deck", { description: (e1 ?? e2)?.message });
    setArtifact((a) => ({ ...a, deckPublished: next }));
    toast.success(next ? "Deck publicado" : "Deck despublicado");
  }

  async function toggleSummaryPublish() {
    if (!artifact.summary) return;
    const next = !artifact.summaryPublished;
    if (next && artifact.summaryValidation?.blocking) {
      return toast.error("Resumo tem erros críticos. Edite antes de publicar.");
    }
    setPubSummaryLoading(true);
    const { error } = await supabase.from("summaries").update({ published: next }).eq("id", artifact.summary.id);
    setPubSummaryLoading(false);
    if (error) return toast.error("Falha ao publicar resumo", { description: error.message });
    setArtifact((a) => ({ ...a, summaryPublished: next }));
    toast.success(next ? "Resumo publicado" : "Resumo despublicado");
  }

  const isRunning = phase === "running-deck" || phase === "running-summary";
  const canAct = items.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (isRunning && !v) return; onOpenChange(v); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-xl">
              <Sparkles className="h-5 w-5 text-mint" /> Checklist preenchido!
            </DialogTitle>
            <DialogDescription>
              A IA acabou de organizar <strong>{items.length}</strong> {items.length === 1 ? "item" : "itens"} do PEP.
              Quer aproveitar e já gerar flashcards e/ou resumo desta estação?
            </DialogDescription>
          </DialogHeader>

          {phase === "idle" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                disabled={!canAct}
                onClick={onClickDeck}
                className="group rounded-2xl border border-border bg-card p-4 text-left transition hover:border-mint/40 hover:bg-mint/5 disabled:opacity-50"
              >
                <Brain className="h-6 w-6 text-mint" />
                <div className="mt-2 font-display font-bold">Gerar Flashcards</div>
                <div className="text-xs text-muted-foreground">10–15 cards baseados nesta estação.</div>
              </button>
              <button
                type="button"
                disabled={!canAct}
                onClick={onClickSummary}
                className="group rounded-2xl border border-border bg-card p-4 text-left transition hover:border-mint/40 hover:bg-mint/5 disabled:opacity-50"
              >
                <BookOpen className="h-6 w-6 text-mint" />
                <div className="mt-2 font-display font-bold">Gerar Resumo</div>
                <div className="text-xs text-muted-foreground">Resumo clínico estruturado a partir do PEP.</div>
              </button>
              <button
                type="button"
                disabled={!canAct}
                onClick={onClickBoth}
                className="group rounded-2xl border-2 border-mint/40 bg-mint/5 p-4 text-left transition hover:bg-mint/10 disabled:opacity-50"
              >
                <Sparkles className="h-6 w-6 text-mint" />
                <div className="mt-2 font-display font-bold">Gerar os dois</div>
                <div className="text-xs text-muted-foreground">Flashcards primeiro, depois o resumo.</div>
              </button>
            </div>
          )}

          {isRunning && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-mint/30 bg-mint/5 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-mint" />
                <div className="text-sm">
                  {phase === "running-deck" ? "Gerando flashcards..." : "Gerando resumo clínico..."}
                </div>
              </div>
              {artifact.deck && phase === "running-summary" && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
                  <Check className="h-4 w-4 text-mint" /> Flashcards prontos ({artifact.deck.cards.length} cards)
                </div>
              )}
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-3">
              {artifact.deck && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Brain className="h-4 w-4 text-mint" />
                    <div className="font-display font-bold">Deck de Flashcards</div>
                    <Badge variant="outline">{artifact.deck.cards.length} cards</Badge>
                    {artifact.deckPublished && <Badge variant="outline" className="border-mint/40 text-mint">Publicado</Badge>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDeckPreviewOpen(true)}>
                      <Play className="h-4 w-4" /> Pré-visualizar
                    </Button>
                    <Button variant={artifact.deckPublished ? "outline" : "hero"} size="sm" onClick={toggleDeckPublish} disabled={pubDeckLoading}>
                      {pubDeckLoading
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
                        : artifact.deckPublished
                          ? <><EyeOff className="h-4 w-4" /> Despublicar</>
                          : <><Eye className="h-4 w-4" /> Publicar</>}
                    </Button>
                    <Link
                      to="/app/admin/flashcards/$id"
                      params={{ id: artifact.deck.deck_id }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      Abrir editor →
                    </Link>
                  </div>
                </div>
              )}

              {artifact.summary && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <BookOpen className="h-4 w-4 text-mint" />
                    <div className="font-display font-bold">Resumo clínico</div>
                    {artifact.summaryValidation?.blocking && (
                      <Badge variant="outline" className="border-rose-400/40 text-rose-600">Revisar</Badge>
                    )}
                    {artifact.summaryPublished && <Badge variant="outline" className="border-mint/40 text-mint">Publicado</Badge>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSummaryPreviewOpen(true)}>
                      <Eye className="h-4 w-4" /> Pré-visualizar
                    </Button>
                    <Button variant={artifact.summaryPublished ? "outline" : "hero"} size="sm" onClick={toggleSummaryPublish} disabled={pubSummaryLoading}>
                      {pubSummaryLoading
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
                        : artifact.summaryPublished
                          ? <><EyeOff className="h-4 w-4" /> Despublicar</>
                          : <><Eye className="h-4 w-4" /> Publicar</>}
                    </Button>
                    <Link
                      to="/app/resumos/$id"
                      params={{ id: artifact.summary.id }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      Abrir página →
                    </Link>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {artifact.deck && (
        <DeckPreview
          open={deckPreviewOpen}
          onClose={() => setDeckPreviewOpen(false)}
          title={artifact.deck.title}
          specialty={artifact.deck.specialty}
          topic={artifact.deck.topic}
          cards={artifact.deck.cards}
        />
      )}

      {artifact.summary && (
        <SummaryModal
          open={summaryPreviewOpen}
          onOpenChange={setSummaryPreviewOpen}
          summary={artifact.summary}
          published={!!artifact.summaryPublished}
          pubLoading={pubSummaryLoading}
          onTogglePublish={toggleSummaryPublish}
          validation={artifact.summaryValidation ?? null}
        />
      )}
    </>
  );
}
