import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sparkles, Eye, EyeOff, Pencil, Trash2, Search, FileText, Star, Loader2, CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { SpecialtyBadge } from "@/components/SpecialtyBadge";
import { batchGenerateSummariesFromStations } from "@/lib/summary-batch.functions";

export const Route = createFileRoute("/app/admin/resumos/")({
  component: AdminResumosPage,
});

const SPECIALTIES = [
  "Clínica Médica",
  "Cirurgia",
  "Pediatria",
  "Ginecologia e Obstetrícia",
  "Medicina de Família e Comunidade",
  "Preventiva",
];

type Summary = {
  id: string;
  title: string;
  specialty: string;
  topic: string | null;
  difficulty: string;
  read_time_minutes: number;
  published: boolean;
  high_yield: boolean;
  cover_image_url: string | null;
  created_at: string;
};

type StationRow = { id: string; title: string; specialty: string; published: boolean };

function AdminResumosPage() {
  const batchFn = useServerFn(batchGenerateSummariesFromStations);
  const [items, setItems] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState("all");
  const [status, setStatus] = useState("all");

  const [batchOpen, setBatchOpen] = useState(false);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [stationSearch, setStationSearch] = useState("");
  const [stationSpec, setStationSpec] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [batchResults, setBatchResults] = useState<
    Array<{ station_id: string; title: string; status: "ok" | "error" | "skipped"; message?: string; verdict?: string; blocking?: boolean }>
  >([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("summaries")
      .select("id, title, specialty, topic, difficulty, read_time_minutes, published, high_yield, cover_image_url, created_at")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Summary[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function loadStations() {
    const { data } = await supabase
      .from("custom_stations")
      .select("id, title, specialty, published")
      .order("created_at", { ascending: false })
      .limit(500);
    setStations((data ?? []) as StationRow[]);
  }

  function openBatch() {
    setSelected(new Set());
    setBatchResults([]);
    setProgress(null);
    setBatchOpen(true);
    void loadStations();
  }

  async function togglePublish(s: Summary) {
    const { error } = await supabase.from("summaries").update({ published: !s.published }).eq("id", s.id);
    if (error) return toast.error("Falha ao atualizar", { description: error.message });
    toast.success(s.published ? "Resumo despublicado" : "Resumo publicado");
    void load();
  }
  async function toggleHighYield(s: Summary) {
    const { error } = await supabase.from("summaries").update({ high_yield: !s.high_yield }).eq("id", s.id);
    if (error) return toast.error("Falha", { description: error.message });
    void load();
  }
  async function remove(s: Summary) {
    if (!confirm(`Excluir o resumo "${s.title}"?`)) return;
    const { error } = await supabase.from("summaries").delete().eq("id", s.id);
    if (error) return toast.error("Falha ao excluir", { description: error.message });
    toast.success("Resumo excluído");
    void load();
  }

  const filtered = useMemo(() => {
    return items.filter((d) => {
      if (q && !d.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (spec !== "all" && d.specialty !== spec) return false;
      if (status === "published" && !d.published) return false;
      if (status === "draft" && d.published) return false;
      return true;
    });
  }, [items, q, spec, status]);

  const filteredStations = useMemo(() => {
    return stations.filter((s) => {
      if (stationSpec !== "all" && s.specialty !== stationSpec) return false;
      if (stationSearch && !s.title.toLowerCase().includes(stationSearch.toLowerCase())) return false;
      return true;
    });
  }, [stations, stationSearch, stationSpec]);

  async function runBatch() {
    const ids = Array.from(selected);
    if (ids.length === 0) return toast.error("Selecione ao menos uma estação.");
    if (ids.length > 30) return toast.error("Máximo 30 estações por lote.");
    setRunning(true);
    setBatchResults([]);
    setProgress({ done: 0, total: ids.length });
    try {
      const out = await batchFn({ data: { station_ids: ids } });
      const titleById = new Map(stations.map((s) => [s.id, s.title]));
      setBatchResults(
        out.results.map((r) => ({
          station_id: r.station_id,
          title: titleById.get(r.station_id) ?? r.station_id.slice(0, 8),
          status: r.status,
          message: r.status === "error" ? r.message : r.status === "skipped" ? r.reason : undefined,
          verdict: r.status === "ok" ? r.verdict : undefined,
          blocking: r.status === "ok" ? r.blocking : undefined,
        })),
      );
      setProgress({ done: ids.length, total: ids.length });
      toast.success(`Lote concluído: ${out.summary.ok}/${out.summary.total} gerados${out.summary.errors ? ` · ${out.summary.errors} falha(s)` : ""}.`);
      void load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Falha no lote", { description: msg.slice(0, 200) });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Resumos clínicos</h2>
          <p className="text-sm text-muted-foreground">
            Gere resumos a partir das estações, edite, publique e mantenha a curadoria.
          </p>
        </div>
        <Button variant="hero" onClick={openBatch}>
          <Sparkles className="h-4 w-4" /> Gerar em lote
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar pelo título..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={spec} onValueChange={setSpec}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="published">Publicados</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-mint" />
          <h3 className="mt-3 font-display text-lg font-semibold">Nenhum resumo ainda</h3>
          <p className="mt-1 text-sm text-muted-foreground">Use “Gerar em lote” para criar resumos a partir das estações publicadas.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex-1 min-w-[200px]">
                <div className="flex flex-wrap items-center gap-2">
                  <SpecialtyBadge specialty={s.specialty} />
                  <Badge variant="outline">{s.difficulty}</Badge>
                  <Badge variant="outline">{s.read_time_minutes} min</Badge>
                  {s.published ? (
                    <Badge className="bg-success/15 text-success hover:bg-success/15">Publicado</Badge>
                  ) : (
                    <Badge variant="outline" className="border-warning/30 text-warning">Rascunho</Badge>
                  )}
                  {s.high_yield && (
                    <Badge className="bg-amber-400/15 text-amber-600 hover:bg-amber-400/15">Alta incidência</Badge>
                  )}
                </div>
                <div className="mt-1 font-display text-lg font-semibold">{s.title}</div>
                {s.topic && <div className="text-xs text-muted-foreground">{s.topic}</div>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => toggleHighYield(s)} title="Alta incidência">
                  <Star className={`h-4 w-4 ${s.high_yield ? "fill-amber-400 text-amber-500" : ""}`} />
                </Button>
                <Link to="/app/admin/resumos/$id" params={{ id: s.id }}>
                  <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /> Editar</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => togglePublish(s)}>
                  {s.published ? <><EyeOff className="h-4 w-4" /> Despublicar</> : <><Eye className="h-4 w-4" /> Publicar</>}
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(s)} title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={batchOpen} onOpenChange={(o) => !running && setBatchOpen(o)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-mint" /> Gerar resumos em lote
            </DialogTitle>
            <DialogDescription>
              Selecione as estações. Cada resumo é gerado por IA (GPT‑5 com fallback Gemini 2.5 Pro), validado e salvo como rascunho.
            </DialogDescription>
          </DialogHeader>

          {batchResults.length === 0 ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Buscar estação..." value={stationSearch} onChange={(e) => setStationSearch(e.target.value)} />
                </div>
                <Select value={stationSpec} onValueChange={setStationSpec}>
                  <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as áreas</SelectItem>
                    {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{selected.size} selecionada(s) · máx. 30 por lote</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-medical hover:underline"
                    onClick={() => {
                      const next = new Set(selected);
                      filteredStations.slice(0, 30).forEach((s) => next.add(s.id));
                      setSelected(next);
                    }}
                  >Selecionar visíveis</button>
                  <button type="button" className="text-muted-foreground hover:underline" onClick={() => setSelected(new Set())}>
                    Limpar
                  </button>
                </div>
              </div>

              <div className="mt-2 max-h-[360px] overflow-y-auto rounded-lg border border-border">
                {filteredStations.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma estação encontrada.</div>
                ) : filteredStations.map((s) => {
                  const checked = selected.has(s.id);
                  return (
                    <label key={s.id} className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 last:border-0 hover:bg-muted/40">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = new Set(selected);
                          if (v) next.add(s.id); else next.delete(s.id);
                          setSelected(next);
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{s.title}</div>
                        <div className="text-xs text-muted-foreground">{s.specialty} · {s.published ? "Publicada" : "Rascunho"}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="max-h-[420px] space-y-2 overflow-y-auto">
              {batchResults.map((r) => (
                <div key={r.station_id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                  {r.status === "ok" ? (
                    r.blocking ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  ) : r.status === "skipped" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.status === "ok"
                        ? `Gerado · veredito IA: ${r.verdict}${r.blocking ? " · requer revisão antes de publicar" : ""}`
                        : r.message ?? r.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-2">
            {running && progress ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando lote... isso pode levar alguns minutos.
              </div>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBatchOpen(false)} disabled={running}>
                {batchResults.length > 0 ? "Fechar" : "Cancelar"}
              </Button>
              {batchResults.length === 0 && (
                <Button variant="hero" onClick={runBatch} disabled={running || selected.size === 0}>
                  {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</> : <><Sparkles className="h-4 w-4" /> Gerar {selected.size > 0 ? `(${selected.size})` : ""}</>}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
