import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowRight, UserRound, Theater, Copy, Search, GraduationCap, ListOrdered, ChevronUp, ChevronDown, X, GripVertical } from "lucide-react";
import { createSimulado } from "@/lib/simulado";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/treinar")({
  component: TrainPage,
  head: () => ({ meta: [{ title: "Painel do Ator — Estação Revalida" }] }),
});

function genCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

import { getSpecialtyMeta } from "@/lib/specialtyMeta";

function specialtyBadge(specialty: string) {
  const m = getSpecialtyMeta(specialty);
  return { code: m.code, cls: m.badge };
}

type DBStation = {
  id: string;
  title: string;
  specialty: string;
  difficulty: string;
  duration_minutes: number;
};

function TrainPage() {
  const { user } = useAuth();
  const { plan, isPrivileged } = useSubscription();
  const canSaveSimulado = isPrivileged || (!!plan && !plan.expired && plan.slug === "completo");
  const nav = useNavigate();
  const [stations, setStations] = useState<DBStation[]>([]);
  const [, setLoading] = useState(true);
  const [allOpen, setAllOpen] = useState(false);
  const [allSearch, setAllSearch] = useState("");
  const [allSpecialty, setAllSpecialty] = useState<string>("all");
  const [selected, setSelected] = useState<DBStation[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [simName, setSimName] = useState("");
  // simulados list removido (agora aparece em Histórico após o candidato concluir)

  // Always in select-mode: this page only creates simulados, no individual "Iniciar"
  const selectMode = true;

  function toggleSelected(s: DBStation) {
    setSelected((prev) => prev.find((x) => x.id === s.id)
      ? prev.filter((x) => x.id !== s.id)
      : [...prev, s]);
  }
  function moveSelected(idx: number, dir: -1 | 1) {
    setSelected((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }
  function openSelectMode() {
    setSelected([]);
    setAllOpen(true);
  }
  function startSimulado() {
    if (!user) { toast.error("Faça login para criar um simulado."); return; }
    if (selected.length < 2) {
      toast.error("Um simulado precisa de pelo menos 2 checklists.");
      return;
    }
    const today = new Date().toLocaleDateString("pt-BR");
    const sim = createSimulado(
      user.id,
      simName.trim() || `Simulado ${today}`,
      selected.map((s) => ({ id: s.id, title: s.title, specialty: s.specialty })),
    );
    setReviewOpen(false);
    setAllOpen(false);
    setSelected([]);
    setSimName("");
    nav({ to: "/app/simulado/$id", params: { id: sim.id } });
  }

  const allFiltered = useMemo(() => {
    return stations
      .filter((s) => {
        const t = s.title.toLowerCase().includes(allSearch.toLowerCase());
        const sp = allSpecialty === "all" || s.specialty === allSpecialty;
        return t && sp;
      })
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  }, [stations, allSearch, allSpecialty]);

  // efeito de "Meus simulados" removido — histórico cuida disso agora

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("custom_stations")
        .select("id, title, specialty, difficulty, duration_minutes")
        .eq("published", true)
        .order("created_at", { ascending: false });
      setStations((data ?? []) as DBStation[]);
      setLoading(false);
    })();
  }, []);

  const specialties = Array.from(new Set(stations.map((s) => s.specialty)));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top header bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-mint/30 bg-gradient-to-r from-mint/10 to-medical/5 px-5 py-3">
        <GraduationCap className="h-5 w-5 text-mint" />
        <span className="text-sm font-semibold text-foreground">Criar Simulado</span>
        <span className="ml-auto rounded-full bg-mint/15 px-3 py-1 text-xs font-mono font-bold text-mint">
          {stations.length} checklists
        </span>
      </div>

      {/* Hero / CTA */}
      <div className="rounded-3xl border border-mint/30 bg-card p-6 shadow-card">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-mint/15 p-3">
            <Theater className="h-6 w-6 text-mint" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold">Monte sua sequência de checklists</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecione os checklists na ordem que deseja treinar. Só avança para o próximo quando o PEP atual estiver completo.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="hero" onClick={openSelectMode}>
                <GraduationCap className="mr-1 h-4 w-4" /> Criar Simulado
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* "Meus simulados" removido — simulados concluídos aparecem em Histórico */}

      <Dialog open={allOpen} onOpenChange={(v) => { setAllOpen(v); }}>
        <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-mint" />

              Todos os Checklists{selectMode ? " | Simulado" : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 px-6 py-4 sm:grid-cols-[1fr_280px] border-b border-border">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={allSearch}
                onChange={(e) => setAllSearch(e.target.value)}
                placeholder="Buscar checklist..."
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2.5 text-sm"
              />
            </div>
            <select
              value={allSpecialty}
              onChange={(e) => setAllSpecialty(e.target.value)}
              className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="all">Todas as Áreas</option>
              {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="px-6 py-2 text-center text-sm font-semibold text-muted-foreground border-b border-border">
            {allFiltered.length} Checklists
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="hidden grid-cols-[1fr_90px_90px_120px] gap-3 border-b border-border bg-muted/30 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid sticky top-0 z-10">
              <div>Checklist</div>
              <div className="text-center">Média</div>
              <div className="text-center">Nota</div>
              <div className="text-right">Treinar</div>
            </div>
            <ul className="divide-y divide-border">
              {allFiltered.map((s) => {
                const b = specialtyBadge(s.specialty);
                const isSel = !!selected.find((x) => x.id === s.id);
                return (
                  <li key={s.id} className="grid grid-cols-1 gap-2 px-6 py-3 transition-colors hover:bg-muted/20 md:grid-cols-[1fr_90px_90px_120px] md:items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 font-mono text-[10px] font-bold ${b.cls}`}>
                        {b.code}
                      </span>
                      <div className="truncate text-sm font-medium text-foreground">{s.title}</div>
                    </div>
                    <div className="text-center text-xs text-muted-foreground md:text-sm">—</div>
                    <div className="text-center text-xs text-muted-foreground md:text-sm">—</div>
                    <div className="md:text-right">
                      {isSel ? (
                        <Button size="sm" variant="outline" disabled className="opacity-60">
                          Adicionado
                        </Button>
                      ) : (
                        <Button size="sm" variant="hero" onClick={() => toggleSelected(s)}>
                          Adicionar
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
              {allFiltered.length === 0 && (
                <li className="px-6 py-12 text-center text-sm text-muted-foreground">
                  Nenhum checklist encontrado.
                </li>
              )}
            </ul>
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-6 py-3">
            <Button variant="outline" onClick={() => { setAllOpen(false); }}>Cancelar</Button>
            {selectMode && (
              <Button
                variant="hero"
                disabled={selected.length < 2}
                onClick={() => {
                  const today = new Date().toLocaleDateString("pt-BR");
                  setSimName(`Simulado ${today}`);
                  setReviewOpen(true);
                }}
                title={selected.length < 2 ? "Selecione pelo menos 2 checklists" : ""}
              >
                Simulado ({selected.length})
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Criar Simulado — review/order/name */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-mint" /> Criar Simulado
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Nome do simulado
              </label>
              <Input
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                placeholder="Ex.: Simulado 16/05/2026"
                className="mt-1.5"
              />
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Tema
              </div>
              <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
                {selected.map((s, idx) => {
                  const b = specialtyBadge(s.specialty);
                  return (
                    <li key={s.id} className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-2.5">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          onClick={() => moveSelected(idx, -1)}
                          disabled={idx === 0}
                          aria-label="Subir"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <button
                          type="button"
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          onClick={() => moveSelected(idx, 1)}
                          disabled={idx === selected.length - 1}
                          aria-label="Descer"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                      <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 font-mono text-[10px] font-bold ${b.cls}`}>
                        {b.code}
                      </span>
                      <div className="min-w-0 flex-1 truncate text-sm font-medium">{s.title}</div>
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:text-rose-400"
                        onClick={() => toggleSelected(s)}
                        aria-label="Remover"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
                {selected.length === 0 && (
                  <li className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    Nenhum checklist selecionado.
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancelar</Button>
            <Button variant="hero" onClick={startSimulado} disabled={selected.length === 0}>
              Iniciar Simulado
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
