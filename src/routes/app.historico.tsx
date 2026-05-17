import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Clock } from "lucide-react";

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
};

function Historico() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"pense" | "simulado" | "parceiros">("pense");
  const [items, setItems] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("attempts")
      .select("id, station_title, specialty, score, created_at, used_seconds")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setItems((data ?? []) as Attempt[]);
        setLoading(false);
      });
  }, [user]);

  const filtered = items.filter((i) =>
    !search || (i.station_title ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Histórico</h1>
        <p className="text-sm text-muted-foreground">Seus treinos anteriores.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h3 className="font-display text-lg font-bold text-medical">Histórico de Checklist | Estação Revalida</h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tema..."
          className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-mint"
        />
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-muted/30 p-1">
          {(["pense", "simulado", "parceiros"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t ? "bg-mint text-night" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "pense" ? "Estação Revalida" : t === "simulado" ? "Simulado" : "Parceiros e Clientes"}
            </button>
          ))}
        </div>

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
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhum treinamento.</td></tr>
              ) : filtered.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{a.station_title ?? "—"}</td>
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
      </div>
    </div>
  );
}
