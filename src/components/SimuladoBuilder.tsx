import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, GraduationCap, ChevronUp, ChevronDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { createSimulado } from "@/lib/simulado";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type StationOption = { id: string; title: string; specialty: string };

export function SimuladoBuilder({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const [stations, setStations] = useState<StationOption[]>([]);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StationOption[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("custom_stations")
        .select("id, title, specialty")
        .eq("published", true)
        .order("title");
      setStations((data ?? []) as StationOption[]);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setName(""); setSearch(""); setSelected([]);
    }
  }, [open]);

  const filtered = useMemo(
    () => stations.filter((s) => s.title.toLowerCase().includes(search.toLowerCase())),
    [stations, search],
  );

  function toggle(s: StationOption) {
    setSelected((prev) => prev.find((x) => x.id === s.id)
      ? prev.filter((x) => x.id !== s.id)
      : [...prev, s]);
  }

  function move(idx: number, dir: -1 | 1) {
    setSelected((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  function start() {
    if (!user) { toast.error("Faça login para criar um simulado."); return; }
    if (selected.length === 0) {
      toast.error("Selecione pelo menos uma estação.");
      return;
    }
    const sim = createSimulado(user.id, name || `Simulado com ${selected.length} estação(ões)`, selected);
    onOpenChange(false);
    nav({ to: "/app/simulado/$id", params: { id: sim.id } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-mint" />
            Criar simulado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Simulado Pediatria 1" className="mt-1.5" />
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            {/* Available */}
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar checklist..."
                    className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
                  />
                </div>
              </div>
              <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                {filtered.map((s) => {
                  const isSel = !!selected.find((x) => x.id === s.id);
                  const m = getSpecialtyMeta(s.specialty);
                  return (
                    <li key={s.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30">
                      <Checkbox checked={isSel} onCheckedChange={() => toggle(s)} />
                      <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 font-mono text-[10px] font-bold", m.badge)}>{m.code}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{s.title}</div>
                        <div className="text-xs text-muted-foreground">{s.specialty}</div>
                      </div>
                    </li>
                  );
                })}
                {filtered.length === 0 && (
                  <li className="px-3 py-10 text-center text-xs text-muted-foreground">Nenhuma estação encontrada.</li>
                )}
              </ul>
            </div>

            {/* Selected with order */}
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-3">
                <div className="text-sm font-semibold">Ordem do simulado</div>
                <Badge variant="outline">{selected.length}</Badge>
              </div>
              <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                {selected.map((s, idx) => {
                  const m = getSpecialtyMeta(s.specialty);
                  return (
                    <li key={s.id} className="flex items-center gap-2 px-3 py-2.5">
                      <span className="w-6 text-center text-xs font-bold text-mint tabular-nums">{idx + 1}</span>
                      <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 font-mono text-[10px] font-bold", m.badge)}>{m.code}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{s.title}</div>
                      </div>
                      <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30" onClick={() => move(idx, -1)} disabled={idx === 0}>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30" onClick={() => move(idx, 1)} disabled={idx === selected.length - 1}>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-rose-400" onClick={() => toggle(s)}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
                {selected.length === 0 && (
                  <li className="px-3 py-10 text-center text-xs text-muted-foreground">
                    Marque checklists ao lado para montar a sequência.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="hero" onClick={start} disabled={selected.length === 0}>
            Iniciar simulado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
