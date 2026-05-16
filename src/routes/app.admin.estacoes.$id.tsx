import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Eye, EyeOff, Plus, Trash2, ChevronUp, ChevronDown, Copy,
  Upload, Sparkles, FileText, MessageSquare, ListChecks, Inbox, StickyNote,
  User, Stethoscope, ClipboardCheck, Target, AlertTriangle, BookOpen, Clock,
  Image as ImageIcon, X,
} from "lucide-react";
import { PRBlock, ScriptText, formatPatientProfile } from "@/components/station/shared";
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
import { parseStationPdfs } from "@/lib/stations-ai.functions";

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
  "Clínica Médica", "Pediatria", "Ginecologia e Obstetrícia",
  "Cirurgia", "Medicina da Família", "Urgência e Emergência",
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
    setItems(((it as unknown as Item[]) ?? []).map((i) => ({
      ...i,
      levels: Array.isArray(i.levels) && i.levels.length ? i.levels : defaultLevels(Number(i.points) || 1),
    })));
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
    />
  );
}

function EditorBody({
  station, items, id, saving, totalPts, up, load, saveStation, togglePublish, setStation,
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

      {/* PDF Import */}
      <PdfImportSection
        stationId={id}
        currentItemsCount={items.length}
        applyResult={async (r) => {
          setStation((s) => {
            if (!s) return s;
            return {
              ...s,
              title: r.title || s.title,
              specialty: r.specialty || s.specialty,
              educational_goal: r.educational_goal ?? s.educational_goal,
              competencies: r.competencies?.length ? r.competencies : s.competencies,
              clinical_case: r.clinical_case ?? s.clinical_case,
              candidate_task: r.candidate_task ?? s.candidate_task,
              patient_info: r.patient_info ?? s.patient_info,
              patient_script: r.patient_script ?? s.patient_script,
              support_materials: r.support_materials ?? s.support_materials,
              patient_profile: { ...s.patient_profile, ...(r.patient_profile ?? {}) },
              deliverable_materials: r.deliverable_materials?.length
                ? r.deliverable_materials.map((m, i) => ({
                    id: `imp${i + 1}`,
                    name: m.name,
                    type: m.type || "Impresso",
                    description: m.description ?? "",
                    content: m.content ?? "",
                    autoDeliver: false,
                  }))
                : s.deliverable_materials,
              expected_conduct: r.expected_conduct ?? s.expected_conduct,
              common_mistakes: r.common_mistakes ?? s.common_mistakes,
              evaluator_notes: r.evaluator_notes ?? s.evaluator_notes,
              scoring_criteria: r.scoring_criteria ?? s.scoring_criteria,
            };
          });
          // checklist items go directly into the DB so they show up
          if (r.checklist_items?.length) {
            const startIdx = items.length;
            const rows = r.checklist_items.map((ci, idx) => {
              const pts = Number(ci.points) > 0 ? Number(ci.points) : 1;
              const number = startIdx + idx + 1;
              const rawDesc = ci.description.trim();
              // gold-standard: description starts with "N. ..."
              const description = /^\d+\.\s/.test(rawDesc) ? rawDesc : `${number}. ${rawDesc}`;
              // keep AI's clean category name; strip accidental leading number
              const category =
                (ci.category ?? "Anamnese").replace(/^\s*\d+\.\s*/, "").trim() || "Anamnese";
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
            await load();
          }

          await saveStation({ silent: true });
          toast.success("PDF importado e campos preenchidos");
        }}
      />

      <SectionBasics station={station} up={up} />

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
  const [loading, setLoading] = useState(false);
  const parseFn = useServerFn(parseStationPdfs);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (next.length === 0) return toast.error("Selecione arquivos PDF");
    setFiles((prev) => [...prev, ...next].slice(0, 5));
  }

  async function run() {
    if (!files.length) return toast.error("Adicione ao menos 1 PDF");
    setLoading(true);
    try {
      const pdfs = await Promise.all(
        files.map(async (f) => ({ name: f.name, dataUrl: await fileToDataUrl(f) })),
      );
      const result = await parseFn({ data: { pdfs } });
      await applyResult(result);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao processar PDF";
      toast.error("Falha na IA", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section
      title="Importar checklist em PDF"
      hint="Anexe um ou mais PDFs (checklist, caso, impressos) e a IA preenche os campos abaixo automaticamente."
    >
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
    </Section>
  );
}

function SectionBasics({ station, up }: { station: Station; up: <K extends keyof Station>(k: K, v: Station[K]) => void }) {
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
      <div>
        <Label>Objetivo educacional</Label>
        <Textarea rows={3} value={station.educational_goal ?? ""} onChange={(e) => up("educational_goal", e.target.value)}
          placeholder="O que o candidato deve aprender ao terminar esta estação?" />
      </div>
      <div>
        <Label>Competências avaliadas (separadas por vírgula)</Label>
        <Input value={(station.competencies ?? []).join(", ")}
          onChange={(e) => up("competencies", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
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
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Dados rápidos do paciente (mostrados ao avaliado)</Label>
          <Textarea rows={4} value={station.patient_info ?? ""} onChange={(e) => up("patient_info", e.target.value)} />
        </div>
        <div>
          <Label>Materiais disponíveis durante a estação</Label>
          <Textarea rows={4} value={station.support_materials ?? ""} onChange={(e) => up("support_materials", e.target.value)} />
        </div>
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

  return (
    <Section title="Impressos e materiais entregáveis" hint="Materiais que o avaliador libera quando o candidato solicita ou cumpre um gatilho.">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4" /> Adicionar impresso</Button>
      </div>
      {materials.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum impresso ainda. Adicione exames, ECGs, imagens ou respostas do paciente.
        </p>
      ) : (
        <div className="space-y-3">
          {materials.map((m, i) => (
            <div key={i} className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-mint/30 text-mint">Impresso {i + 1}</Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === materials.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
                <div>
                  <Label>Nome (curto, ex: "Pulso e respiração")</Label>
                  <Input value={m.name} onChange={(e) => update(i, { name: e.target.value })} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={m.type} onValueChange={(v) => update(i, { type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MATERIAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Quando liberar (gatilho)</Label>
                <Input value={m.description ?? ""} onChange={(e) => update(i, { description: e.target.value })}
                  placeholder="Ex: Liberar se perguntado sobre pulso e respiração." />
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
              <div className="flex items-center gap-2">
                <Switch checked={!!m.autoDeliver} onCheckedChange={(v) => update(i, { autoDeliver: v })} />
                <span className="text-sm text-muted-foreground">Entregar automaticamente no início</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function SectionChecklist({ stationId, items, reload }: { stationId: string; items: Item[]; reload: () => Promise<void> }) {
  const [draft, setDraft] = useState({ description: "", category: "Apresentação", points: 1 });

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.description.trim()) return toast.error("Descrição obrigatória");
    const pts = Number(draft.points) || 1;
    const titleSource = (draft.category || draft.description).trim();
    const payload = {
      station_id: stationId,
      description: draft.description.trim(),
      category: numberedCategory(items.length, titleSource),
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
      <form onSubmit={addItem} className="grid gap-2 rounded-xl border border-border bg-background/40 p-3 md:grid-cols-[1fr,180px,90px,auto]">
        <Input placeholder="Descrição do item (ex: 'Apresentação')" value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
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

              <div className="grid gap-3 md:grid-cols-[2fr,140px,140px]">
                <div>
                  <Label>Descrição</Label>
                  <Textarea rows={2} defaultValue={item.description}
                    onBlur={(e) => e.target.value !== item.description && patchItem(item, { description: e.target.value })} />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={item.category} onValueChange={(v) => patchItem(item, { category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pontos máximos</Label>
                  <Input type="number" step="0.1" min={0} max={20} defaultValue={item.points}
                    onBlur={(e) => Number(e.target.value) !== Number(item.points) && patchItem(item, { points: Number(e.target.value) })} />
                </div>
              </div>

              <div>
                <Label>Texto auxiliar (opcional)</Label>
                <Input defaultValue={item.helper_text ?? ""}
                  onBlur={(e) => (e.target.value || null) !== item.helper_text && patchItem(item, { helper_text: e.target.value || null })} />
              </div>

              <div className="rounded-lg border border-border bg-card p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Níveis de avaliação</div>
                <div className="space-y-2">
                  {(item.levels ?? defaultLevels(Number(item.points) || 1)).map((lv, lvIdx) => (
                    <div key={lvIdx} className="grid gap-2 md:grid-cols-[160px,80px,1fr]">
                      <Input defaultValue={lv.label}
                        onBlur={(e) => e.target.value !== lv.label && patchLevel(item, lvIdx, { label: e.target.value })} />
                      <Input type="number" step="0.05" min={0} defaultValue={lv.points}
                        onBlur={(e) => Number(e.target.value) !== lv.points && patchLevel(item, lvIdx, { points: Number(e.target.value) })} />
                      <Input placeholder="Descrição do critério" defaultValue={lv.description ?? ""}
                        onBlur={(e) => (e.target.value || "") !== (lv.description ?? "") && patchLevel(item, lvIdx, { description: e.target.value })} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function SectionPedagogical({
  station, up,
}: {
  station: Station;
  up: <K extends keyof Station>(k: K, v: Station[K]) => void;
}) {
  return (
    <Section title="Notas pedagógicas (para o ator/avaliador)" hint="Conteúdo que o ator usa para conduzir e avaliar, e que aparece no feedback final.">
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

// ============================================================
// Live preview — mirrors the actual Avaliado / Ator / Avaliador panels
// ============================================================
type PreviewMode = "candidato" | "ator";

function StationLivePreview({ station, items }: { station: Station; items: Item[] }) {
  const [mode, setMode] = useState<PreviewMode>("candidato");
  const meta = getSpecialtyMeta(station.specialty);
  const totalPts = items.reduce((s, i) => s + Number(i.points || 0), 0);

  const tabs: { id: PreviewMode; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { id: "candidato", label: "Avaliado (candidato)", icon: User },
    { id: "ator",      label: "Ator / Paciente",      icon: Stethoscope },
  ];

  const p = station.patient_profile ?? {};
  const hasProfile = Object.values(p).some((v) => typeof v === "string" && v.trim().length > 0);
  const patientFormatted = hasProfile ? formatPatientProfile(p as never) : "";

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn("inline-flex h-7 items-center rounded-md px-2 text-xs font-bold", meta.badge)}>
              {meta.code}
            </span>
            <h3 className="truncate font-display text-lg font-bold text-foreground md:text-xl">
              {station.title || "(sem título)"}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-mint/15 px-2.5 py-1 font-medium text-mint">
              {mode === "candidato" ? "Candidato" : "Ator/Paciente"}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{station.specialty}</span>
          </div>
        </div>

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
                  Os impressos cadastrados serão entregues pelo avaliador durante a estação.
                </p>
                {(station.deliverable_materials ?? []).length > 0 && (
                  <div className="mt-3 space-y-2 opacity-70">
                    {(station.deliverable_materials ?? []).map((m, i) => (
                      <div key={i} className="rounded-lg border border-dashed border-border p-2 text-xs">
                        <span className="font-semibold">{m.name || `Impresso ${i + 1}`}</span>
                        {m.type && <span className="ml-2 text-muted-foreground">· {m.type}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </PRBlock>
              <PRBlock icon={StickyNote} title="Anotações">
                <Textarea rows={3} placeholder="O candidato anota aqui durante a estação…" disabled />
              </PRBlock>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Tempo
                </div>
                <div className="mt-2 font-mono text-3xl font-bold">{String(station.duration_minutes).padStart(2, "0")}:00</div>
                <div className="text-xs text-muted-foreground">Definido pelo ator/banca na sala.</div>
              </div>
            </div>
          </div>
        )}

        {mode === "ator" && (
          <div className="space-y-4">
            <PRBlock icon={User} title="Orientações do Ator / Atriz">
              {station.patient_script ? (
                <ScriptText text={station.patient_script} />
              ) : hasProfile ? (
                <ScriptText text={patientFormatted} />
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma orientação preenchida.</p>
              )}
            </PRBlock>
            <PRBlock icon={MessageSquare} title="Cenário clínico (contexto)">
              <ScriptText text={station.clinical_case || "—"} />
            </PRBlock>
            {station.case_description && (
              <PRBlock icon={MessageSquare} title="Descrição do caso">
                <ScriptText text={station.case_description} />
              </PRBlock>
            )}
            <PRBlock icon={Inbox} title="Impressos para entregar" right={<Badge variant="outline">{(station.deliverable_materials ?? []).length}</Badge>}>
              {(station.deliverable_materials ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum impresso cadastrado.</p>
              ) : (
                <div className="space-y-3">
                  {(station.deliverable_materials ?? []).map((m, i) => (
                    <div key={i} className="rounded-xl border border-mint/30 bg-mint/5 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <FileText className="h-4 w-4 text-mint" /> {m.name || `Impresso ${i + 1}`}
                        {m.type && <Badge variant="outline" className="ml-auto">{m.type}</Badge>}
                      </div>
                      {m.description && <div className="mt-2 text-xs text-muted-foreground">Gatilho: {m.description}</div>}
                      {m.content && <pre className="mt-2 whitespace-pre-wrap rounded bg-background/60 p-2 text-xs">{m.content}</pre>}
                      {m.imageUrl && <img src={m.imageUrl} alt={m.name || "Material"} className="mt-2 max-h-80 rounded-lg border border-border" />}
                    </div>
                  ))}
                </div>
              )}
            </PRBlock>
          </div>
        )}

      </div>
    </div>
  );
}
