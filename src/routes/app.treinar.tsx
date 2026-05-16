import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, ArrowRight, UserRound, Theater, Copy, Search, GraduationCap, ListChecks, Play, Trash2, ListOrdered } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { SimuladoBuilder } from "@/components/SimuladoBuilder";
import { listSimulados, deleteSimulado, type Simulado } from "@/lib/simulado";

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

const SPECIALTY_BADGE: Record<string, { code: string; cls: string }> = {
  "Clínica Médica":           { code: "CM", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30" },
  "Pediatria":                { code: "PE", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-400/30" },
  "Ginecologia e Obstetrícia":{ code: "GO", cls: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-400/30" },
  "Cirurgia":                 { code: "CR", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30" },
  "Medicina da Família":      { code: "MF", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/30" },
  "Urgência e Emergência":    { code: "UE", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/30" },
};

type DBStation = {
  id: string;
  title: string;
  specialty: string;
  difficulty: string;
  duration_minutes: number;
};

function TrainPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState<string>("all");
  const [busy, setBusy] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [stations, setStations] = useState<DBStation[]>([]);
  const [, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [allSearch, setAllSearch] = useState("");
  const [allSpecialty, setAllSpecialty] = useState<string>("all");
  const [simulados, setSimulados] = useState<Simulado[]>([]);

  const allFiltered = useMemo(() => {
    return stations
      .filter((s) => {
        const t = s.title.toLowerCase().includes(allSearch.toLowerCase());
        const sp = allSpecialty === "all" || s.specialty === allSpecialty;
        return t && sp;
      })
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  }, [stations, allSearch, allSpecialty]);

  useEffect(() => {
    const refresh = () => setSimulados(listSimulados());
    refresh();
    window.addEventListener("estacao:simulados", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("estacao:simulados", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

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
  const filtered = stations.filter((s) => {
    const matchText = s.title.toLowerCase().includes(search.toLowerCase());
    const matchSpec = specialty === "all" || s.specialty === specialty;
    return matchText && matchSpec;
  });

  async function startStation(stationId: string) {
    if (!user) return toast.error("Faça login para criar uma sala.");
    const st = stations.find((s) => s.id === stationId);
    if (!st) return toast.error("Estação não encontrada.");
    setBusy(true);
    const code = genCode();
    const { data, error } = await supabase.from("training_rooms")
      .insert({ code, host_id: user.id, station_id: st.id, station_title: st.title, mode: "dupla" })
      .select("id, code").single();
    if (error || !data) {
      setBusy(false);
      return toast.error(error?.message ?? "Falha ao criar sala.");
    }
    // Ator entra automaticamente como paciente/ator — sem escolha de papel
    await supabase.from("training_room_participants")
      .insert({ room_id: data.id, user_id: user.id, role: "paciente" });
    setBusy(false);
    setLastCode(data.code);
    nav({ to: "/app/sala/$code/paciente", params: { code: data.code } });
  }

  function copyLastCode() {
    if (!lastCode) return;
    navigator.clipboard.writeText(lastCode);
    toast.success("Código copiado");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top header bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-mint/30 bg-gradient-to-r from-mint/10 to-medical/5 px-5 py-3">
        <Theater className="h-5 w-5 text-mint" />
        <span className="text-sm font-semibold text-foreground">Painel do Ator · Estações</span>
        <span className="ml-auto rounded-full bg-mint/15 px-3 py-1 text-xs font-mono font-bold text-mint">
          {filtered.length}/{stations.length}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left column — search + table */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-semibold">Escolha a estação para abrir uma sala</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Você entra como ator/paciente. O código é gerado para você enviar ao candidato.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar um tema..."
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2.5 text-sm"
                />
              </div>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-border bg-background pl-9 pr-3 py-2.5 text-sm"
                >
                  <option value="all">Filtrar por especialidade</option>
                  {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Stations table */}
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
            <div className="hidden grid-cols-[1fr_110px_110px_140px] gap-3 border-b border-border bg-muted/30 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
              <div>Estação</div>
              <div className="text-center">Duração</div>
              <div className="text-center">Nível</div>
              <div className="text-right">Ação</div>
            </div>
            <ul className="divide-y divide-border">
              {filtered.map((s) => {
                const b = SPECIALTY_BADGE[s.specialty] ?? { code: "ES", cls: "bg-muted text-foreground border-border" };
                return (
                  <li key={s.id} className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-muted/20 md:grid-cols-[1fr_110px_110px_140px] md:items-center">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 font-mono text-xs font-bold ${b.cls}`}>
                        {b.code}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-foreground">{s.title}</div>
                        <div className="text-xs text-muted-foreground">{s.specialty}</div>
                      </div>
                    </div>
                    <div className="text-center text-xs text-muted-foreground md:text-sm">{s.duration_minutes} min</div>
                    <div className="text-center text-xs text-muted-foreground md:text-sm">{s.difficulty}</div>
                    <div className="md:text-right">
                      <Button
                        size="sm"
                        variant="hero"
                        disabled={busy}
                        onClick={() => startStation(s.id)}
                      >
                        Iniciar <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-5 py-12 text-center text-sm text-muted-foreground">
                  Nenhuma estação encontrada.
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Right column — info card */}
        <aside className="space-y-4">
          {/* Opções: Simulados */}
          <div className="rounded-3xl border border-mint/30 bg-card p-5 shadow-card">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Opções</div>
            <Button variant="hero" className="mt-3 w-full" onClick={() => setAllOpen(true)}>
              <ListOrdered className="mr-1 h-4 w-4" /> Todos os Checklists
            </Button>
            <Button variant="hero" className="mt-2 w-full" onClick={() => setBuilderOpen(true)}>
              <GraduationCap className="mr-1 h-4 w-4" /> Criar simulado
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Monte uma sequência de checklists. Só avança para o próximo quando o PEP atual estiver completo.
            </p>

            {simulados.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border pt-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <ListChecks className="h-3.5 w-3.5" /> Meus simulados
                </div>
                <ul className="space-y-1.5">
                  {simulados.map((s) => {
                    const total = s.stations.length;
                    const done = s.finished ? total : s.currentIndex;
                    return (
                      <li key={s.id} className="group flex items-center gap-2 rounded-lg border border-border bg-background/40 px-2.5 py-2">
                        <Link
                          to="/app/simulado/$id"
                          params={{ id: s.id }}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <Play className="h-3.5 w-3.5 shrink-0 text-mint" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium">{s.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {s.finished ? "Concluído" : `${done}/${total} estações`}
                            </div>
                          </div>
                        </Link>
                        <button
                          type="button"
                          onClick={() => { deleteSimulado(s.id); setSimulados(listSimulados()); }}
                          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                          aria-label="Remover simulado"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-gradient-hero p-6 text-white shadow-elegant">
            <div className="text-xs uppercase tracking-wider text-white/70">Disponíveis</div>
            <div className="mt-1 font-display text-4xl font-bold">{stations.length}</div>
            <div className="text-xs text-white/70">estações atualizadas</div>

            <div className="mt-5 space-y-2 text-xs text-white/80">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                Código gerado automaticamente
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                Impressos liberados sob demanda
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                PEP só vai para o candidato ao encerrar
              </div>
            </div>
          </div>

          {lastCode ? (
            <div className="rounded-3xl border border-mint/40 bg-mint/5 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Último código gerado
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="rounded-lg bg-background px-3 py-1.5 font-mono text-lg font-bold tracking-widest">
                  {lastCode}
                </div>
                <Button variant="outline" size="sm" onClick={copyLastCode}>
                  <Copy className="mr-1 h-4 w-4" /> Copiar
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Envie este código ao candidato (WhatsApp, e-mail) para ele entrar na mesma sala.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
              <div className="font-semibold text-foreground">Como funciona</div>
              <ol className="mt-3 space-y-2 text-xs">
                <li>1. Escolha a estação e clique em <strong>Iniciar</strong>.</li>
                <li>2. O código da sala é gerado e copiável.</li>
                <li>3. Envie o código ao candidato.</li>
                <li>4. Você entra direto como ator/paciente — sem escolher papel.</li>
              </ol>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-mint/10 px-2.5 py-1 text-[11px] font-medium text-mint">
                <Sparkles className="h-3 w-3" /> Foco total no seu papel
              </div>
            </div>
          )}
        </aside>
      </div>

      <SimuladoBuilder open={builderOpen} onOpenChange={setBuilderOpen} />

      <Dialog open={allOpen} onOpenChange={setAllOpen}>
        <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-mint" /> Todos os Checklists
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
                const b = SPECIALTY_BADGE[s.specialty] ?? { code: "ES", cls: "bg-muted text-foreground border-border" };
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
                      <Button
                        size="sm"
                        variant="hero"
                        disabled={busy}
                        onClick={() => { setAllOpen(false); startStation(s.id); }}
                      >
                        Iniciar
                      </Button>
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
            <Button variant="outline" onClick={() => setAllOpen(false)}>Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
