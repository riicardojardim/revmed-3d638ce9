import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileText, Loader2, CheckCircle2, XCircle, Trash2, Save, UserSquare2, X, ClipboardPaste, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { importStationsFromPdf, importStationsFromText, bulkCreateStations, type ImportedStation } from "@/lib/pdf-import.functions";
import { renderAndUploadPdf, type RenderProgress } from "@/lib/pdf-page-renderer";

export const Route = createFileRoute("/app/admin/estacoes/importar")({
  component: ImportPdfPage,
});

type FileStatus = "pending" | "rendering" | "uploading" | "extracting" | "done" | "error";

interface PdfJob {
  id: string;
  file: File;
  actorFile?: File;
  status: FileStatus;
  error?: string;
  pages?: number;
  truncated?: boolean;
  progress?: { current: number; total: number; label: string };
  actorInfo?: { pages: number; segments: number; matched: number } | null;
  stations: (ImportedStation & { _selected: boolean })[];
}

const SPECIALTIES = [
  "Clínica Médica",
  "Cirurgia",
  "Pediatria",
  "Ginecologia e Obstetrícia",
  "Medicina de Família e Comunidade",
];

// ───── Pareamento automático principal × orientação do ator ─────
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const ACTOR_KEYWORDS = ["orientacao", "orientacoes", "orientac", "ator", "atriz", "paciente"];

function isActorFilename(name: string): boolean {
  const n = normalizeName(name);
  return ACTOR_KEYWORDS.some((k) => n.includes(k));
}

function tokens(name: string): string[] {
  return normalizeName(name)
    .split(" ")
    .filter((t) => t && !ACTOR_KEYWORDS.includes(t));
}

function similarity(a: File, b: File): number {
  const A = new Set(tokens(a.name));
  const B = new Set(tokens(b.name));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  A.forEach((t) => { if (B.has(t)) inter++; });
  return inter / Math.max(A.size, B.size);
}

function pairFiles(files: File[]): { main: File; actor?: File }[] {
  const mains: File[] = [];
  const actors: File[] = [];
  files.forEach((f) => (isActorFilename(f.name) ? actors.push(f) : mains.push(f)));

  const usedActors = new Set<File>();
  const pairs: { main: File; actor?: File }[] = mains.map((main) => {
    let bestActor: File | null = null;
    let bestScore = 0;
    actors.forEach((a) => {
      if (usedActors.has(a)) return;
      const score = similarity(main, a);
      if (score > 0 && score > bestScore) {
        bestActor = a;
        bestScore = score;
      }
    });
    if (bestActor) usedActors.add(bestActor);
    return { main, actor: bestActor ?? undefined };
  });

  // Atores não pareados viram "main" (sem actor) para o usuário decidir
  actors.forEach((a) => {
    if (!usedActors.has(a)) pairs.push({ main: a });
  });

  return pairs;
}

function ImportPdfPage() {
  const nav = useNavigate();
  const parsePdf = useServerFn(importStationsFromPdf);
  const parseText = useServerFn(importStationsFromText);
  const insertAll = useServerFn(bulkCreateStations);
  const [jobs, setJobs] = useState<PdfJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pasteLabel, setPasteLabel] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [pasteBusy, setPasteBusy] = useState(false);

  async function processPastedText() {
    if (pasteText.trim().length < 20) {
      toast.error("Cole o texto da estação (mínimo 20 caracteres).");
      return;
    }
    setPasteBusy(true);
    const label = pasteLabel.trim() || `Texto colado ${new Date().toLocaleTimeString()}`;
    const jobId = `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setJobs((prev) => [
      ...prev,
      {
        id: jobId,
        file: new File([], `${label}.txt`, { type: "text/plain" }),
        status: "extracting",
        stations: [],
      },
    ]);
    try {
      const res = await parseText({ data: { text: pasteText, sourceLabel: label } });
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status: "done",
                stations: res.stations.map((s) => ({ ...s, _selected: true })),
              }
            : j,
        ),
      );
      toast.success(`${res.stations.length} estação(ões) extraídas do texto`);
      setPasteText("");
      setPasteLabel("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "error", error: msg } : j)));
      toast.error("Falha ao processar texto", { description: msg });
    } finally {
      setPasteBusy(false);
    }
  }

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!arr.length) {
      toast.error("Selecione PDFs válidos");
      return;
    }
    const pairs = pairFiles(arr);
    setJobs((prev) => [
      ...prev,
      ...pairs.map(({ main, actor }) => ({
        id: `${main.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file: main,
        actorFile: actor,
        status: "pending" as FileStatus,
        stations: [],
      })),
    ]);
    const paired = pairs.filter((p) => p.actor).length;
    if (paired > 0) toast.success(`${paired} PDF(s) pareado(s) com orientações do ator automaticamente`);
  }

  async function processAll() {
    setBusy(true);
    // Snapshot atual da fila pendente
    const queue: PdfJob[] = [];
    setJobs((prev) => {
      prev.forEach((j) => {
        if (j.status === "pending" || j.status === "error") queue.push(j);
      });
      return prev;
    });
    // Aguarda flush do setState
    await new Promise((r) => setTimeout(r, 0));

    const workers = Array.from({ length: Math.min(3, queue.length) }, () => worker());

    async function worker() {
      while (queue.length) {
        const job = queue.shift();
        if (!job) break;
        await processOne(job.id, job.file);
      }
    }

    await Promise.all(workers);
    setBusy(false);
  }

  async function processOne(jobId: string, file: File) {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "rendering", error: undefined, progress: undefined } : j)));
    try {
      if (file.size > 200 * 1024 * 1024) throw new Error("PDF maior que 200 MB.");
      let actorFile: File | undefined;
      setJobs((prev) => {
        const j = prev.find((x) => x.id === jobId);
        actorFile = j?.actorFile;
        return prev;
      });
      await new Promise((r) => setTimeout(r, 0));
      if (actorFile && actorFile.size > 200 * 1024 * 1024) {
        throw new Error("PDF de orientações do ator maior que 200 MB.");
      }

      const updateProgress = (p: RenderProgress, label: string) => {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status: p.phase === "render" ? "rendering" : "uploading",
                  progress: { current: p.current, total: p.total, label },
                }
              : j,
          ),
        );
      };

      const mainAsset = await renderAndUploadPdf(file, jobId, "main", (p) => updateProgress(p, "Principal"));
      let actorAsset: Awaited<ReturnType<typeof renderAndUploadPdf>> | undefined;
      if (actorFile) {
        actorAsset = await renderAndUploadPdf(actorFile, jobId, "actor", (p) => updateProgress(p, "Ator"));
      }

      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "extracting", progress: undefined } : j)));

      const res = await parsePdf({
        data: {
          filename: file.name,
          pagePaths: mainAsset.pagePaths,
          extractedText: mainAsset.extractedText,
          actorFilename: actorFile?.name,
          actorPagePaths: actorAsset?.pagePaths,
          actorExtractedText: actorAsset?.extractedText,
        },
      });
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status: "done",
                pages: res.pages,
                truncated: res.truncated,
                actorInfo: res.actor,
                stations: res.stations.map((s) => ({ ...s, _selected: true })),
              }
            : j,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "error", error: msg } : j)));
      toast.error("Falha ao processar PDF", { description: msg });
    }
  }

  function updateStation(jobId: string, idx: number, patch: Partial<ImportedStation & { _selected: boolean }>) {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, stations: j.stations.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }
          : j,
      ),
    );
  }

  function removeJob(jobId: string) {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }

  function removeActor(jobId: string) {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, actorFile: undefined } : j)));
  }

  function attachActor(jobId: string, file: File) {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, actorFile: file } : j)));
  }

  const allSelected = jobs.flatMap((j) => j.stations.filter((s) => s._selected));
  const totalSelected = allSelected.length;

  async function importAll() {
    if (totalSelected === 0) return toast.error("Nenhuma estação selecionada");
    if (!confirm(`Importar ${totalSelected} estação(ões) como rascunho?`)) return;
    setSaving(true);
    try {
      const payload = allSelected.map(({ _selected: _s, ...rest }) => rest);
      const res = await insertAll({ data: { stations: payload } });
      toast.success(`${res.created.length} estação(ões) importadas`);
      nav({ to: "/app/admin/estacoes" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Falha no import", { description: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/admin/estacoes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex gap-2">
          {jobs.some((j) => j.status === "pending" || j.status === "error") && (
            <Button variant="outline" onClick={processAll} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? "Processando..." : "Processar fila"}
            </Button>
          )}
          {totalSelected > 0 && (
            <Button variant="hero" onClick={importAll} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Salvando..." : `Importar ${totalSelected} estação(ões)`}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-xl font-bold">Importar checklists de PDFs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Envie PDFs ou cole o texto já organizado (ex.: vindo do ChatGPT). A IA monta o checklist <strong>literalmente</strong> e você revisa antes de salvar.
        </p>

        <Tabs defaultValue="pdf" className="mt-4">
          <TabsList>
            <TabsTrigger value="pdf"><Upload className="mr-1.5 h-3.5 w-3.5" /> Enviar PDF</TabsTrigger>
            <TabsTrigger value="text"><ClipboardPaste className="mr-1.5 h-3.5 w-3.5" /> Colar texto</TabsTrigger>
          </TabsList>

          <TabsContent value="pdf">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-8 text-center transition hover:bg-muted/50">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="font-medium">Clique ou arraste PDFs aqui</div>
              <div className="text-xs text-muted-foreground">Máx. 120 MB por arquivo</div>
              <input
                type="file"
                multiple
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </TabsContent>

          <TabsContent value="text" className="space-y-3">
            <div className="rounded-lg border border-mint/30 bg-mint/5 p-3 text-xs text-muted-foreground">
              Cole aqui o texto já organizado (caso, tarefas, paciente, materiais, roteiro do ator, critérios de pontuação e PEP). Use o prompt do ChatGPT que combinamos — a IA aqui só monta o checklist a partir do texto colado, sem reinterpretar.
            </div>
            <div>
              <Label htmlFor="paste-label">Identificação (ex.: "Dia 1 - Estação 2")</Label>
              <Input
                id="paste-label"
                value={pasteLabel}
                onChange={(e) => setPasteLabel(e.target.value)}
                placeholder="Opcional — só para você localizar depois"
                disabled={pasteBusy}
              />
            </div>
            <div>
              <Label htmlFor="paste-text">Texto da(s) estação(ões)</Label>
              <Textarea
                id="paste-text"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Cole aqui o texto completo vindo do ChatGPT..."
                rows={12}
                disabled={pasteBusy}
                className="font-mono text-xs"
              />
              <div className="mt-1 text-xs text-muted-foreground">
                {pasteText.length.toLocaleString()} caracteres
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="hero" onClick={processPastedText} disabled={pasteBusy || pasteText.trim().length < 20}>
                {pasteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {pasteBusy ? "Processando..." : "Extrair estações"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {jobs.length > 0 && (
        <div className="space-y-4">
          {jobs.map((job) => (
            <PdfJobCard
              key={job.id}
              job={job}
              onRemove={() => removeJob(job.id)}
              onRemoveActor={() => removeActor(job.id)}
              onAttachActor={(f) => attachActor(job.id, f)}
              onUpdateStation={(idx, patch) => updateStation(job.id, idx, patch)}
              onRetry={() => processOne(job.id, job.file)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: FileStatus }) {
  switch (status) {
    case "pending":
      return <Badge variant="outline">Aguardando</Badge>;
    case "rendering":
      return <Badge variant="outline" className="border-blue-500/30 text-blue-500"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Renderizando páginas</Badge>;
    case "uploading":
      return <Badge variant="outline" className="border-blue-500/30 text-blue-500"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Enviando páginas</Badge>;
    case "extracting":
      return <Badge variant="outline" className="border-mint/40 text-mint"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Analisando com IA</Badge>;
    case "done":
      return <Badge className="bg-success/15 text-success hover:bg-success/15"><CheckCircle2 className="mr-1 h-3 w-3" /> Pronto</Badge>;
    case "error":
      return <Badge variant="outline" className="border-destructive/40 text-destructive"><XCircle className="mr-1 h-3 w-3" /> Erro</Badge>;
  }
}

interface PdfJobCardProps {
  job: PdfJob;
  onRemove: () => void;
  onRemoveActor: () => void;
  onAttachActor: (file: File) => void;
  onUpdateStation: (idx: number, patch: Partial<ImportedStation & { _selected: boolean }>) => void;
  onRetry: () => void;
}

function PdfJobCard({ job, onRemove, onRemoveActor, onAttachActor, onUpdateStation, onRetry }: PdfJobCardProps) {
  const isText = job.file.type === "text/plain";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        {isText ? <ClipboardPaste className="h-5 w-5 text-mint" /> : <FileText className="h-5 w-5 text-mint" />}
        <div className="flex-1 min-w-[200px]">
          <div className="font-medium">{job.file.name}</div>
          <div className="text-xs text-muted-foreground">
            {isText ? "Texto colado" : `${(job.file.size / 1024 / 1024).toFixed(2)} MB`}
            {job.pages ? ` · ${job.pages} páginas` : ""}
            {job.stations.length ? ` · ${job.stations.length} estação(ões) detectada(s)` : ""}
            {job.truncated ? " · ⚠️ texto truncado" : ""}
          </div>
          {job.progress && (
            <div className="mt-1 text-xs text-mint">
              {job.progress.label}: {job.progress.current}/{job.progress.total} {job.status === "rendering" ? "renderizadas" : "enviadas"}
            </div>
          )}
        </div>
        <StatusBadge status={job.status} />
        {job.status === "error" && (
          <Button variant="outline" size="sm" onClick={onRetry}>Tentar novamente</Button>
        )}
        <Button variant="ghost" size="icon" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
      </div>

      {/* Pareamento com PDF de orientações do ator (só para PDFs) */}
      {!isText && (
      <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/20 p-3">
        {job.actorFile ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <UserSquare2 className="h-4 w-4 text-mint" />
            <span className="font-medium">Orientações do ator:</span>
            <span className="text-muted-foreground">{job.actorFile.name}</span>
            {job.actorInfo && (
              <Badge variant="outline" className="ml-1">
                {job.actorInfo.matched}/{job.stations.length} casadas
              </Badge>
            )}
            {job.status === "pending" || job.status === "error" ? (
              <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" onClick={onRemoveActor}>
                <X className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        ) : (
          <label className="flex cursor-pointer flex-wrap items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <UserSquare2 className="h-4 w-4" />
            <span>Anexar PDF de orientações do ator/atriz (opcional)</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onAttachActor(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      )}

      {job.error && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {job.error}
        </div>
      )}

      {job.stations.length > 0 && (
        <Accordion type="multiple" className="mt-4">
          {job.stations.map((st, idx) => (
            <AccordionItem key={idx} value={`${job.id}-${idx}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-1 items-center gap-3 pr-3">
                  <Checkbox
                    checked={st._selected}
                    onCheckedChange={(v) => onUpdateStation(idx, { _selected: Boolean(v) })}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{st.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {st.specialty} · {st.difficulty} · {st.duration_minutes} min · {st.checklist_items.length} itens
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <StationEditor station={st} onChange={(patch) => onUpdateStation(idx, patch)} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

function StationEditor({
  station,
  onChange,
}: {
  station: ImportedStation & { _selected: boolean };
  onChange: (patch: Partial<ImportedStation & { _selected: boolean }>) => void;
}) {
  return (
    <div className="space-y-3 p-2">
      <div className="grid gap-3 md:grid-cols-[2fr,1fr,1fr,1fr]">
        <div>
          <Label>Título</Label>
          <Input value={station.title} onChange={(e) => onChange({ title: e.target.value })} />
        </div>
        <div>
          <Label>Especialidade</Label>
          <Select value={station.specialty} onValueChange={(v) => onChange({ specialty: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Dificuldade</Label>
          <Select value={station.difficulty} onValueChange={(v) => onChange({ difficulty: v as ImportedStation["difficulty"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Fácil">Fácil</SelectItem>
              <SelectItem value="Intermediário">Intermediário</SelectItem>
              <SelectItem value="Avançado">Avançado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Duração (min)</Label>
          <Input type="number" min={3} max={30} value={station.duration_minutes} onChange={(e) => onChange({ duration_minutes: Math.max(3, Math.min(30, Number(e.target.value) || 10)) })} />
        </div>
      </div>
      <div>
        <Label>Cenário de atuação</Label>
        <Textarea rows={5} value={station.clinical_case} onChange={(e) => onChange({ clinical_case: e.target.value })} />
      </div>
      <div>
        <Label>Descrição do caso</Label>
        <Textarea rows={5} value={station.patient_info ?? ""} onChange={(e) => onChange({ patient_info: e.target.value || null })} />
      </div>
      <div>
        <Label>Tarefas do candidato</Label>
        <Textarea rows={4} value={station.candidate_task} onChange={(e) => onChange({ candidate_task: e.target.value })} />
      </div>
      <div>
        <Label>Orientações do atriz/ator</Label>
        <Textarea rows={8} value={station.patient_script ?? ""} onChange={(e) => onChange({ patient_script: e.target.value || null })} />
      </div>

      <ChecklistEditor items={station.checklist_items} onChange={(items) => onChange({ checklist_items: items })} />

    </div>
  );
}

function ChecklistEditor({
  items,
  onChange,
}: {
  items: ImportedStation["checklist_items"];
  onChange: (items: ImportedStation["checklist_items"]) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const allSelected = items.length > 0 && selected.size === items.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((_, i) => i)));
    }
  }

  function toggleOne(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function deleteSelected() {
    const next = items.filter((_, i) => !selected.has(i));
    onChange(next);
    setSelected(new Set());
  }


  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
          <h4 className="font-display text-sm font-semibold">Checklist extraído ({items.length} itens)</h4>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 1 && (
            <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive" onClick={deleteSelected}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Excluir {selected.size}
            </Button>
          )}
          <Badge variant="outline">{items.reduce((s, i) => s + (i.points || 0), 0).toFixed(2)} pts totais</Badge>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Checkbox checked={selected.has(i)} onCheckedChange={() => toggleOne(i)} />
                <div className="text-xs font-semibold text-mint">{it.category || "—"}</div>
              </div>
              <Badge variant="outline">{it.points} pts</Badge>
            </div>
            {it.description && (
              <div className="mt-1 whitespace-pre-wrap text-sm pl-6">{it.description}</div>
            )}
            {it.levels.length > 0 && (
              <div className="mt-2 space-y-1 text-xs text-muted-foreground pl-6">
                {it.levels.map((lv, li) => (
                  <div key={li}>
                    <strong>{lv.label}</strong> ({lv.points}): {lv.description}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum item de checklist detectado neste PDF.</p>
        )}
      </div>
    </div>
  );
}