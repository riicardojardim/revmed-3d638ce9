import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Eye, EyeOff, Plus, Trash2, ChevronUp, ChevronDown, Copy,
  Upload, FileText, MessageSquare, ListChecks, Inbox, StickyNote,
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
import { mergeDeliverableMaterials } from "@/lib/imported-station-utils";

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
  imageUrls?: string[];
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
    const supportMaterials = (raw.support_materials as string | null) ?? null;
    const explicitDeliverableMaterials = Array.isArray(raw.deliverable_materials)
      ? (raw.deliverable_materials as Array<Partial<DeliverableMaterial>>).map((material, index) => ({
          id: material.id ?? `imp${index + 1}`,
          name: material.name ?? "",
          type: material.type ?? "Impresso",
          description: material.description ?? "",
          content: material.content ?? "",
          imageUrl: material.imageUrl,
          autoDeliver: material.autoDeliver,
        }))
      : null;
    const deliverableMaterials: DeliverableMaterial[] = mergeDeliverableMaterials(
      explicitDeliverableMaterials,
      supportMaterials ?? "",
    ).map((material, index) => ({
          id: material.id ?? `imp${index + 1}`,
          name: material.name,
          type: material.type,
          description: material.description,
          content: material.content,
          imageUrl: material.imageUrl,
          autoDeliver: material.autoDeliver,
        }));
    const caseDescription = ((raw.case_description as string | null) ?? (raw.patient_info as string | null) ?? null);
    setStation({
      ...(raw as unknown as Station),
      case_description: caseDescription,
      support_materials: supportMaterials,
      competencies: (raw.competencies as string[]) ?? [],
      bibliographic_references: (raw.bibliographic_references as BiblioRef[]) ?? [],
      deliverable_materials: deliverableMaterials,
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
    />
  );
}

function EditorBody({
  station, items, id, saving, totalPts, up, load, saveStation, togglePublish,
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
}) {
  const [tab, setTab] = useState<"ator" | "avaliado">("ator");
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/admin/estacoes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para a lista
        </Link>
        <div className="flex flex-wrap gap-2">
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
          <SectionChecklist stationId={id} items={items} reload={load} />
        </>
      ) : (
        <SectionCaseCandidate station={station} up={up} />
      )}

      {/* Sempre visíveis (ambas as abas) */}
      <SectionReferences station={station} up={up} />
      <Section title="Pré-visualização" hint="Veja como o avaliado e o ator/paciente enxergam a estação no painel deles.">
        <StationLivePreview station={station} items={items} />
      </Section>

      <SectionPublish station={station} togglePublish={togglePublish} />
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

function SectionBasics({ station, up }: { station: Station; up: <K extends keyof Station>(k: K, v: Station[K]) => void; items: Item[] }) {
  return (
    <Section title="Informações básicas" hint="Como a estação aparece para o assinante.">
      <div>
        <Label>Título</Label>
        <Input value={station.title} onChange={(e) => up("title", e.target.value)} />
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
      <form onSubmit={addItem} className="grid gap-2 rounded-xl border border-border bg-background/40 p-3 lg:grid-cols-[1fr,200px,90px,auto]">
        <Textarea rows={3} placeholder="Descrição do item (pode usar várias linhas, ;, . etc.)" value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <Input placeholder="Categoria (ex: Anamnese)" value={draft.category}
          onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
        <Input type="number" step="0.1" min={0.1} max={20} value={draft.points}
          onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })} />
        <Button type="submit" variant="hero"><Plus className="h-4 w-4" /> Adicionar</Button>
      </form>

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
          <div key={row.kind} className={cn("grid items-center gap-2 rounded-lg border p-2 lg:grid-cols-[200px,110px,1fr]", tone, !checked && "opacity-60")}>
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
          <div key={i} className="grid gap-2 lg:grid-cols-[2fr,2fr,auto]">
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
          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
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

            <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
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

