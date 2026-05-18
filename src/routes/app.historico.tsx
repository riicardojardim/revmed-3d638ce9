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
  const [tab, setTab] = useState<"pense" | "simulado">("pense");
  const [items, setItems] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openSim, setOpenSim] = useState<Record<string, boolean>>({});
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("attempts")
      .select("id, station_title, specialty, score, created_at, used_seconds, simulado_id, simulado_name, simulado_station_index, simulado_total_stations")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setItems((data ?? []) as Attempt[]);
        setLoading(false);
      });
  }, [user]);

  // Pense (estação única): tentativas SEM simulado OU simulados com apenas 1 estação
  const penseItems = useMemo(
    () =>
      items
        .filter((i) => !i.simulado_id || (i.simulado_total_stations ?? 0) <= 1)
        .filter((i) => !search || (i.station_title ?? "").toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  // Simulado: agrupa por simulado_id (apenas com 2+ estações)
  type SimGroup = { id: string; name: string; lastAt: string; total: number; stations: Attempt[]; avg: number };
  const simGroups = useMemo<SimGroup[]>(() => {
    const map = new Map<string, SimGroup>();
    for (const a of items) {
      if (!a.simulado_id) continue;
      if ((a.simulado_total_stations ?? 0) <= 1) continue;
      const g = map.get(a.simulado_id) ?? { id: a.simulado_id, name: a.simulado_name ?? "Simulado", lastAt: a.created_at, total: a.simulado_total_stations ?? 0, stations: [], avg: 0 };
      g.stations.push(a);
      if (new Date(a.created_at) > new Date(g.lastAt)) g.lastAt = a.created_at;
      map.set(a.simulado_id, g);
    }
    const arr = Array.from(map.values()).map((g) => {
      g.stations.sort((a, b) => (a.simulado_station_index ?? 0) - (b.simulado_station_index ?? 0));
      g.avg = g.stations.reduce((s, a) => s + Number(a.score || 0), 0) / Math.max(1, g.stations.length);
      return g;
    });
    arr.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    return arr.filter((g) => !search || g.name.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Histórico</h1>
        <p className="text-sm text-muted-foreground">Seus treinos anteriores.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="font-display text-lg font-bold text-medical">Histórico de Checklist</h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tema..."
          className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-mint"
        />
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-muted/30 p-1">
          {(["pense", "simulado"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t ? "bg-mint text-night" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "pense" ? "Estação Única" : "Simulado"}
            </button>
          ))}
        </div>

        {tab !== "simulado" && (
          <div className="mt-5 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Tema</th>
                  <th className="px-4 py-3">Feito</th>
                  <th className="px-4 py-3">Tempo</th>
                  <th className="px-4 py-3 text-right">Nota</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
                ) : penseItems.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhum treinamento.</td></tr>
                ) : penseItems.map((a) => (
                  <tr key={a.id} className="group border-t border-border transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <button
                        type="button"
                        onClick={() => setDetailId(a.id)}
                        className="flex items-center gap-2 text-left hover:text-mint"
                      >
                        {a.station_title ?? "—"}
                        <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(a.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.round(a.used_seconds / 60)} min</span>
                    </td>
                    <td className="px-4 py-3 text-right font-display font-bold text-medical">{Number(a.score).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "simulado" && (
          <div className="mt-5 space-y-3">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando...</p>
            ) : simGroups.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum simulado realizado.</p>
            ) : simGroups.map((g) => {
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
        )}
      </div>
    </div>
  );
}
