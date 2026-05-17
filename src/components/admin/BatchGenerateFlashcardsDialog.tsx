import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Square } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { generateDeckFromStation } from "@/lib/deck-from-station.functions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stationIds: string[]; // candidatos (do filtro atual)
  onDone?: () => void;
}

interface Item {
  id: string;
  title: string;
  status: "pending" | "running" | "done" | "skipped" | "error";
  message?: string;
  durationMs?: number;
}

function fmtTime(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r.toString().padStart(2, "0")}s`;
}

export function BatchGenerateFlashcardsDialog({ open, onOpenChange, stationIds, onDone }: Props) {
  const generate = useServerFn(generateDeckFromStation);
  const [skipExisting, setSkipExisting] = useState(true);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [items, setItems] = useState<Item[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setPhase("idle");
      setItems([]);
      setStartedAt(null);
      cancelRef.current = false;
    }
  }, [open]);

  const stats = useMemo(() => {
    const done = items.filter((i) => i.status === "done").length;
    const skipped = items.filter((i) => i.status === "skipped").length;
    const errored = items.filter((i) => i.status === "error").length;
    const processed = done + skipped + errored;
    const total = items.length;
    const generated = items.filter((i) => i.status === "done");
    const avg = generated.length > 0
      ? generated.reduce((acc, i) => acc + (i.durationMs ?? 0), 0) / generated.length
      : 0;
    const remaining = Math.max(0, total - processed);
    const eta = avg > 0 ? avg * remaining : 0;
    const elapsed = startedAt ? Date.now() - startedAt : 0;
    return { done, skipped, errored, processed, total, avg, eta, elapsed, remaining };
  }, [items, startedAt]);

  async function start() {
    if (stationIds.length === 0) {
      toast.error("Nenhuma estação selecionada.");
      return;
    }
    cancelRef.current = false;
    setPhase("running");
    setStartedAt(Date.now());

    // Buscar dados completos das estações
    const { data: stations, error } = await supabase
      .from("custom_stations")
      .select("id,title,specialty,clinical_case,candidate_task,educational_goal,expected_conduct,common_mistakes,scoring_criteria,bibliographic_references")
      .in("id", stationIds);
    if (error || !stations) {
      toast.error("Falha ao carregar estações", { description: error?.message });
      setPhase("idle");
      return;
    }

    // Decks existentes por station
    const existingByStation = new Set<string>();
    if (skipExisting) {
      const { data: decks } = await supabase
        .from("flashcard_decks")
        .select("station_id")
        .in("station_id", stationIds);
      (decks ?? []).forEach((d) => { if (d.station_id) existingByStation.add(d.station_id as string); });
    }

    const initial: Item[] = stations.map((s) => ({
      id: s.id as string,
      title: (s.title as string) || "(sem título)",
      status: skipExisting && existingByStation.has(s.id as string) ? "skipped" : "pending",
      message: skipExisting && existingByStation.has(s.id as string) ? "Já tem deck vinculado" : undefined,
    }));
    setItems(initial);

    for (let i = 0; i < stations.length; i++) {
      if (cancelRef.current) break;
      const s = stations[i] as {
        id: string; title: string; specialty: string;
        clinical_case: string | null; candidate_task: string | null;
        educational_goal: string | null; expected_conduct: string | null;
        common_mistakes: string | null; scoring_criteria: string | null;
        bibliographic_references: Array<{ label: string; url?: string }> | null;
      };
      if (skipExisting && existingByStation.has(s.id)) continue;
      if (!s.title?.trim() || !s.specialty?.trim()) {
        setItems((prev) => prev.map((it) => it.id === s.id ? { ...it, status: "error", message: "Sem título ou área" } : it));
        continue;
      }
      setItems((prev) => prev.map((it) => it.id === s.id ? { ...it, status: "running" } : it));
      const t0 = Date.now();
      try {
        const count = 10 + Math.floor(Math.random() * 6);
        const res = await generate({
          data: {
            station_id: s.id,
            title: s.title,
            specialty: s.specialty,
            topic: null,
            clinical_case: s.clinical_case ?? null,
            candidate_task: s.candidate_task ?? null,
            educational_goal: s.educational_goal ?? null,
            expected_conduct: s.expected_conduct ?? null,
            common_mistakes: s.common_mistakes ?? null,
            scoring_criteria: s.scoring_criteria ?? null,
            references: (s.bibliographic_references ?? []).map((r) => ({ label: r.label, url: r.url })),
            count,
          },
        });
        const dur = Date.now() - t0;
        setItems((prev) => prev.map((it) => it.id === s.id ? {
          ...it, status: "done", message: `${res.count} cards`, durationMs: dur,
        } : it));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setItems((prev) => prev.map((it) => it.id === s.id ? { ...it, status: "error", message: msg.slice(0, 140) } : it));
      }
    }

    setPhase("done");
    onDone?.();
  }

  const pct = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (phase === "running") {
        if (!v) cancelRef.current = true;
      }
      onOpenChange(v);
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar flashcards em lote
          </DialogTitle>
          <DialogDescription>
            Gera um deck de flashcards com IA para cada estação. Os decks ficam vinculados à estação como
            <strong className="mx-1">rascunho</strong>
            — só aparecem para os assinantes quando você publicá-los.
          </DialogDescription>
        </DialogHeader>

        {phase === "idle" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <div className="font-medium">Escopo</div>
              <div className="text-muted-foreground">
                {stationIds.length} estação(ões) do filtro atual serão processadas.
              </div>
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
              <Checkbox checked={skipExisting} onCheckedChange={(v) => setSkipExisting(v === true)} />
              <span>
                <span className="font-medium">Pular estações que já têm deck vinculado</span>
                <span className="block text-xs text-muted-foreground">
                  Recomendado para evitar decks duplicados.
                </span>
              </span>
            </label>
          </div>
        )}

        {phase !== "idle" && (
          <div className="space-y-3">
            <Progress value={pct} />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {stats.processed} de {stats.total} ({pct}%)
                {stats.skipped > 0 && <> · {stats.skipped} pulada(s)</>}
                {stats.errored > 0 && <> · <span className="text-destructive">{stats.errored} erro(s)</span></>}
              </span>
              <span>
                Decorrido: {fmtTime(stats.elapsed)}
                {phase === "running" && stats.avg > 0 && (
                  <> · Restante estimado: <strong className="text-foreground">{fmtTime(stats.eta)}</strong></>
                )}
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-border divide-y divide-border">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <div className="w-5 shrink-0">
                    {it.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {it.status === "done" && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {it.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
                    {it.status === "skipped" && <span className="text-xs text-muted-foreground">—</span>}
                    {it.status === "pending" && <span className="text-xs text-muted-foreground">·</span>}
                  </div>
                  <div className="flex-1 truncate">{it.title}</div>
                  <div className={`text-xs truncate max-w-[40%] ${it.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                    {it.message ?? ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {phase === "idle" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button variant="hero" onClick={start}>
                <Sparkles className="h-4 w-4" /> Iniciar geração
              </Button>
            </>
          )}
          {phase === "running" && (
            <Button variant="outline" onClick={() => { cancelRef.current = true; }}>
              <Square className="h-4 w-4" /> Parar após o atual
            </Button>
          )}
          {phase === "done" && (
            <Button variant="hero" onClick={() => onOpenChange(false)}>Concluir</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
