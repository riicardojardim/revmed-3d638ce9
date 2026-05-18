import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Clock, ChevronRight, ChevronDown, ListOrdered } from "lucide-react";
import { HistoricoDetailModal } from "@/components/HistoricoDetailModal";


export const Route = createFileRoute("/app/historico")({
  component: Historico,
  head: () => ({ meta: [{ title: "Histórico — Estação Revalida" }] }),
});

type Attempt = {
  id: string;
  station_title: string | null;
  specialty: string | null;
  score: number;
  created_at: string;
  used_seconds: number;
  simulado_id: string | null;
  simulado_name: string | null;
  simulado_station_index: number | null;
  simulado_total_stations: number | null;
};

function Historico() {
  const { user } = useAuth();
  const [items, setItems] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openSim, setOpenSim] = useState<Record<string, boolean>>({});
  const [detailId, setDetailId] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("attempts")
      .select("id, station_title, specialty, score, created_at, used_seconds, simulado_id, simulado_name, simulado_station_index, simulado_total_stations")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setItems((data ?? []) as Attempt[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  // Lista unificada: simulados (2+ estações) viram um grupo; demais são itens individuais.
  type SimGroup = { kind: "sim"; id: string; name: string; lastAt: string; total: number; stations: Attempt[]; avg: number };
  type SingleRow = { kind: "single"; id: string; lastAt: string; attempt: Attempt };
  type Row = SimGroup | SingleRow;

  const rows = useMemo<Row[]>(() => {
    const simMap = new Map<string, SimGroup>();
    const singles: SingleRow[] = [];
    for (const a of items) {
      const isSim = !!a.simulado_id && (a.simulado_total_stations ?? 0) > 1;
      if (isSim && a.simulado_id) {
        const g = simMap.get(a.simulado_id) ?? { kind: "sim" as const, id: a.simulado_id, name: a.simulado_name ?? "Simulado", lastAt: a.created_at, total: a.simulado_total_stations ?? 0, stations: [], avg: 0 };
        g.stations.push(a);
        if (new Date(a.created_at) > new Date(g.lastAt)) g.lastAt = a.created_at;
        simMap.set(a.simulado_id, g);
      } else {
        singles.push({ kind: "single", id: a.id, lastAt: a.created_at, attempt: a });
      }
    }
    const sims: Row[] = Array.from(simMap.values()).map((g) => {
      g.stations.sort((a, b) => (a.simulado_station_index ?? 0) - (b.simulado_station_index ?? 0));
      g.avg = g.stations.reduce((s, a) => s + Number(a.score || 0), 0) / Math.max(1, g.stations.length);
      return g;
    });
    const all: Row[] = [...sims, ...singles];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? all.filter((r) =>
          r.kind === "sim"
            ? r.name.toLowerCase().includes(q) || r.stations.some((s) => (s.station_title ?? "").toLowerCase().includes(q))
            : (r.attempt.station_title ?? "").toLowerCase().includes(q),
        )
      : all;
    filtered.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    return filtered;
  }, [items, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Histórico</h1>
        <p className="text-sm text-muted-foreground">Seus treinos anteriores.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="font-display text-lg font-bold text-medical">Histórico de Estações</h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por estação ou simulado..."
          className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-mint"
        />

        <div className="mt-5 space-y-3">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum treinamento.</p>
          ) : rows.map((row) => {
            if (row.kind === "single") {
              const a = row.attempt;
              return (
                <div key={a.id} className="overflow-hidden rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setDetailId(a.id)}
                    className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{a.station_title ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString("pt-BR")} · <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.round(a.used_seconds / 60)} min</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-base font-bold text-medical">{Number(a.score).toFixed(1)}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">nota</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </div>
              );
            }
            const g = row;
            const open = !!openSim[g.id];
            const totalStations = g.total || g.stations.length;
            return (
              <div key={g.id} className="overflow-hidden rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setOpenSim((s) => ({ ...s, [g.id]: !open }))}
                  className="flex w-full items-center gap-3 bg-muted/30 px-4 py-3 text-left hover:bg-muted/50"
                >
                  <ListOrdered className="h-4 w-4 text-mint" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{g.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {g.stations.length}/{totalStations} estações · {new Date(g.lastAt).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-base font-bold text-medical">{g.avg.toFixed(1)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">média</div>
                  </div>
                  {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
                {open && (
                  <table className="w-full text-sm">
                    <tbody>
                      {g.stations.map((a, i) => (
                        <tr key={a.id} className="group border-t border-border transition-colors hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-medium">
                            <button
                              type="button"
                              onClick={() => setDetailId(a.id)}
                              className="flex items-center gap-2 text-left hover:text-mint"
                            >
                              <span className="text-xs text-muted-foreground">{(a.simulado_station_index ?? i) + 1}.</span>
                              {a.station_title ?? "—"}
                              <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.round(a.used_seconds / 60)} min</span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-display font-bold text-medical">{Number(a.score).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <HistoricoDetailModal
        attemptId={detailId}
        open={!!detailId}
        onOpenChange={(v) => { if (!v) setDetailId(null); }}
      />
    </div>
  );
}
