import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileText, Loader2, CheckCircle2, XCircle, Trash2, Save } from "lucide-react";
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
import { importStationsFromPdf, bulkCreateStations, type ImportedStation } from "@/lib/pdf-import.functions";

export const Route = createFileRoute("/app/admin/estacoes/importar")({
  component: ImportPdfPage,
});

type FileStatus = "pending" | "reading" | "extracting" | "done" | "error";

interface PdfJob {
  id: string;
  file: File;
  status: FileStatus;
  error?: string;
  pages?: number;
  truncated?: boolean;
  stations: (ImportedStation & { _selected: boolean })[];
}

const SPECIALTIES = [
  "Clínica Médica",
  "Cirurgia",
  "Pediatria",
  "Ginecologia e Obstetrícia",
  "Medicina de Família e Comunidade",
];

async function fileToDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
}

function ImportPdfPage() {
  const nav = useNavigate();
  const parsePdf = useServerFn(importStationsFromPdf);
  const insertAll = useServerFn(bulkCreateStations);
  const [jobs, setJobs] = useState<PdfJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!arr.length) {
      toast.error("Selecione PDFs válidos");
      return;
    }
    setJobs((prev) => [
      ...prev,
      ...arr.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        status: "pending" as FileStatus,
        stations: [],
      })),
    ]);
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
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "reading", error: undefined } : j)));
    try {
      if (file.size > 22 * 1024 * 1024) throw new Error("PDF maior que 22 MB.");

      const dataUrl = await fileToDataUrl(file);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "extracting" } : j)));

      const res = await parsePdf({ data: { filename: file.name, dataUrl } });
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status: "done",
                pages: res.pages,
                truncated: res.truncated,
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
          Envie um ou vários PDFs. A IA detecta cada estação dentro do PDF e extrai o texto <strong>literalmente</strong>, do jeito que está no documento. Depois você revisa e confirma a importação.
        </p>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-8 text-center transition hover:bg-muted/50">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="font-medium">Clique ou arraste PDFs aqui</div>
          <div className="text-xs text-muted-foreground">Máx. 22 MB por arquivo</div>
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
      </div>

      {jobs.length > 0 && (
        <div className="space-y-4">
          {jobs.map((job) => (
            <PdfJobCard
              key={job.id}
              job={job}
              onRemove={() => removeJob(job.id)}
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
    case "reading":
      return <Badge variant="outline" className="border-blue-500/30 text-blue-500"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Lendo PDF</Badge>;
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
  onUpdateStation: (idx: number, patch: Partial<ImportedStation & { _selected: boolean }>) => void;
  onRetry: () => void;
}

function PdfJobCard({ job, onRemove, onUpdateStation, onRetry }: PdfJobCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        <FileText className="h-5 w-5 text-mint" />
        <div className="flex-1 min-w-[200px]">
          <div className="font-medium">{job.file.name}</div>
          <div className="text-xs text-muted-foreground">
            {(job.file.size / 1024 / 1024).toFixed(2)} MB
            {job.pages ? ` · ${job.pages} páginas` : ""}
            {job.stations.length ? ` · ${job.stations.length} estação(ões) detectada(s)` : ""}
            {job.truncated ? " · ⚠️ texto truncado" : ""}
          </div>
        </div>
        <StatusBadge status={job.status} />
        {job.status === "error" && (
          <Button variant="outline" size="sm" onClick={onRetry}>Tentar novamente</Button>
        )}
        <Button variant="ghost" size="icon" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
      </div>

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
        <Label>Caso clínico</Label>
        <Textarea rows={5} value={station.clinical_case} onChange={(e) => onChange({ clinical_case: e.target.value })} />
      </div>
      <div>
        <Label>Tarefa do candidato</Label>
        <Textarea rows={3} value={station.candidate_task} onChange={(e) => onChange({ candidate_task: e.target.value })} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Dados do paciente</Label>
          <Textarea rows={3} value={station.patient_info ?? ""} onChange={(e) => onChange({ patient_info: e.target.value || null })} />
        </div>
        <div>
          <Label>Materiais disponíveis</Label>
          <Textarea rows={3} value={station.support_materials ?? ""} onChange={(e) => onChange({ support_materials: e.target.value || null })} />
        </div>
      </div>
      <div>
        <Label>Roteiro do paciente/ator</Label>
        <Textarea rows={5} value={station.patient_script ?? ""} onChange={(e) => onChange({ patient_script: e.target.value || null })} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Observações para o avaliador</Label>
          <Textarea rows={3} value={station.evaluator_notes ?? ""} onChange={(e) => onChange({ evaluator_notes: e.target.value || null })} />
        </div>
        <div>
          <Label>Critérios de pontuação</Label>
          <Textarea rows={3} value={station.scoring_criteria ?? ""} onChange={(e) => onChange({ scoring_criteria: e.target.value || null })} />
        </div>
      </div>
      <div>
        <Label>Material pós-estação</Label>
        <Textarea rows={3} value={station.post_materials ?? ""} onChange={(e) => onChange({ post_materials: e.target.value || null })} />
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-display text-sm font-semibold">Checklist extraído ({station.checklist_items.length} itens)</h4>
          <Badge variant="outline">{station.checklist_items.reduce((s, i) => s + (i.points || 0), 0).toFixed(2)} pts totais</Badge>
        </div>
        <div className="space-y-2">
          {station.checklist_items.map((it, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-mint">{it.category || "—"}</div>
                <Badge variant="outline">{it.points} pts</Badge>
              </div>
              {it.description && (
                <div className="mt-1 whitespace-pre-wrap text-sm">{it.description}</div>
              )}
              {it.levels.length > 0 && (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {it.levels.map((lv, li) => (
                    <div key={li}>
                      <strong>{lv.label}</strong> ({lv.points}): {lv.description}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {station.checklist_items.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum item de checklist detectado neste PDF.</p>
          )}
        </div>
      </div>
    </div>
  );
}