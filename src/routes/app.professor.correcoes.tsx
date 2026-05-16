import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardEdit, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/professor/correcoes")({
  component: ReviewQueuePage,
});

interface Row {
  id: string;
  station_title: string | null;
  specialty: string | null;
  score: number;
  created_at: string;
  reviewed_at: string | null;
  professor_score: number | null;
}

function ReviewQueuePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let q = supabase
      .from("attempts")
      .select("id, station_title, specialty, score, created_at, reviewed_at, professor_score")
      .order("created_at", { ascending: false })
      .limit(50);
    q = tab === "pending" ? q.is("reviewed_at", null) : q.not("reviewed_at", "is", null);
    q.then(({ data }) => {
      setRows((data ?? []) as Row[]);
      setLoading(false);
    });
  }, [tab]);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1 w-fit">
        {([
          { k: "pending", l: "Aguardando" },
          { k: "done", l: "Corrigidas" },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium ${tab === t.k ? "bg-mint/10 text-foreground" : "text-muted-foreground"}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-mint" />
          <p className="mt-3 text-sm text-muted-foreground">
            {tab === "pending" ? "Nenhuma tentativa aguardando correção." : "Você ainda não corrigiu tentativas."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mint/10 font-display font-bold text-medical">
                {Number(r.score).toFixed(1)}
              </div>
              <div className="flex-1 min-w-[160px]">
                <div className="font-medium">{r.station_title ?? "Estação"}</div>
                <div className="text-xs text-muted-foreground">
                  {r.specialty ?? "—"} · {new Date(r.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
              {r.reviewed_at ? (
                <Badge className="bg-success/15 text-success hover:bg-success/15">
                  Nota: {r.professor_score?.toFixed(1) ?? "—"}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-warning/30 text-warning">Pendente</Badge>
              )}
              <Link to="/app/professor/correcoes/$id" params={{ id: r.id }}>
                <Button variant="outline" size="sm"><ClipboardEdit className="h-4 w-4" /> Abrir</Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
