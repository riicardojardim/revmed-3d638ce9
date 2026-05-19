import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Clock,
  ListOrdered,
} from "lucide-react";
import {
  SpecialtyMedals,
  NOTA_DE_CORTE,
  NOTA_DE_CORTE_EDICAO,
  NOTA_DE_CORTE_ESCALA10,
  MEDAL_SPECIALTIES,
  getSpecAvg,
} from "@/components/SpecialtyMedals";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { AtorDashboard } from "@/components/AtorDashboard";
import { Button } from "@/components/ui/button";
import { HistoricoDetailModal } from "@/components/HistoricoDetailModal";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Estação Revalida" }] }),
});

type AttemptRow = {
  id: string;
  specialty: string | null;
  station_title: string | null;
  score: number;
  created_at: string;
  used_seconds: number;
  simulado_id: string | null;
  simulado_name: string | null;
  simulado_station_index: number | null;
  simulado_total_stations: number | null;
};

function Dashboard() {
  const { user, profile } = useAuth();
  const { isCompletoLike, isAtorOnly, loading: subLoading } = useSubscription();
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSim, setOpenSim] = useState<Record<string, boolean>>({});
  const [detailId, setDetailId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(5);
  useEffect(() => { setVisibleCount(5); }, [search]);

  const isAtorPlan = isAtorOnly;
  const isCompleto = isCompletoLike;

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("attempts")
      .select(
        "id, specialty, station_title, score, created_at, used_seconds, simulado_id, simulado_name, simulado_station_index, simulado_total_stations",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setAttempts((data ?? []) as AttemptRow[]);
        setLoading(false);
      });
  }, [user]);

  const stats = useMemo(() => {
    const bySpec = new Map<string, { sum: number; n: number }>();
    attempts.forEach((a) => {
      const k = a.specialty ?? "Outras";
      const cur = bySpec.get(k) ?? { sum: 0, n: 0 };
      cur.sum += Number(a.score) || 0;
      cur.n += 1;
      bySpec.set(k, cur);
    });
    const total = attempts.length;
    const avg = total ? attempts.reduce((s, a) => s + Number(a.score), 0) / total : 0;
    return { bySpec, total, avg };
  }, [attempts]);

  type SimGroup = { kind: "sim"; id: string; name: string; lastAt: string; total: number; stations: AttemptRow[]; avg: number };
  type SingleRow = { kind: "single"; id: string; lastAt: string; attempt: AttemptRow };
  type Row = SimGroup | SingleRow;

  const rows = useMemo<Row[]>(() => {
    const simMap = new Map<string, SimGroup>();
    const singles: SingleRow[] = [];
    for (const a of attempts) {
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
  }, [attempts, search]);

  const displayName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "estudante";
  const titlePrefix = profile?.title && profile.title !== "Sem título" ? `${profile.title} ` : "";
  const greetingName = `${titlePrefix}${displayName}`;

  if (subLoading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }
  if (isAtorPlan) return <AtorDashboard />;
  if (!isCompleto) {
    // free user — keep simple welcome
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Bem-vindo(a)</p>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Olá, {displayName}!</h1>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <Sparkles className="mx-auto h-8 w-8 text-mint" />
          <h2 className="mt-3 font-display text-xl font-bold">Desbloqueie o plano Completo</h2>
          <p className="mt-2 text-sm text-muted-foreground">Acesso a 690+ checklists, 570+ resumos, 400+ flashcards, cronograma e mais.</p>
          <Link to="/app/perfil" className="mt-5 inline-block">
            <Button variant="hero">Ver planos</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">


      {/* Top row: welcome + stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-mint/5 p-6 shadow-card">
          <h2 className="font-display text-xl font-bold md:text-2xl">
            <span className="text-mint">{profile?.title && profile.title !== "Sem título" ? greetingName : `Olá, ${displayName}`}</span>{" "}
            <span className="text-foreground">sua média geral está em </span>
            <span className="text-mint">{stats.avg.toFixed(1)}</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Com nossos treinamentos vamos trabalhar para manter sua média sempre acima da última nota de corte do Revalida.
          </p>
          <div className="mt-5">
            <SpecialtyMedals stats={stats.bySpec} />
          </div>
        </div>

        <DailyMotivationCard userId={user?.id ?? "anon"} />
      </div>

      {/* Meu Desempenho */}
      <Link
        to="/app/progresso"
        className="group block rounded-2xl border border-border bg-card p-6 shadow-card transition-colors hover:border-mint/60"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-mint" />
            <h3 className="font-display text-lg font-bold">Meu Desempenho</h3>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-mint">
            Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-background p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Tentativas</div>
            <div className="mt-1 font-display text-3xl font-bold">{stats.total}</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Nota média</div>
            <div className="mt-1 font-display text-3xl font-bold text-medical">{stats.avg.toFixed(1)}</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Nota de corte INEP</div>
            <div className="mt-1 font-display text-3xl font-bold text-mint">{NOTA_DE_CORTE.toFixed(3)}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {NOTA_DE_CORTE_EDICAO} · {NOTA_DE_CORTE_ESCALA10.toFixed(2)} na escala 0–10
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="font-display font-semibold">Média por especialidade</h4>
            <span className="text-xs text-muted-foreground">
              Meta: ≥ <span className="font-semibold text-foreground">{NOTA_DE_CORTE_ESCALA10.toFixed(2)}</span>
            </span>
          </div>
          <ul className="mt-3 space-y-3">
            {MEDAL_SPECIALTIES.map((s) => {
              const meta = getSpecialtyMeta(s.key);
              const { avg, n } = getSpecAvg(stats.bySpec, s.key);
              const pct = Math.max(0, Math.min(100, (avg / 10) * 100));
              const target = NOTA_DE_CORTE;
              const hit = avg >= NOTA_DE_CORTE_ESCALA10 && n > 0;
              return (
                <li key={s.key} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-6 min-w-[2rem] items-center justify-center rounded-md px-1.5 text-[10px] font-bold tracking-wider ${meta.badge}`}>
                        {s.short}
                      </span>
                      <span className="font-medium">{s.label}</span>
                    </div>
                    <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                      <span>{n} est.</span>
                      <span className={`font-display text-base font-bold ${hit ? meta.text : "text-foreground"}`}>
                        {avg.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${meta.solid} transition-all`} style={{ width: `${pct}%` }} />
                    <div
                      className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-foreground/60"
                      style={{ left: `${target}%` }}
                      title={`Nota de corte INEP — ${NOTA_DE_CORTE.toFixed(3)} pts`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Link>

      {/* Histórico */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-mint" />
          <h3 className="font-display text-lg font-bold">Histórico de Estações</h3>
        </div>
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
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum treinamento ainda.</p>
          ) : rows.slice(0, visibleCount).map((row) => {
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
        {rows.length > visibleCount && (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" size="sm" onClick={() => setVisibleCount((n) => n + 5)}>
              Ver mais
            </Button>
          </div>
        )}
      </div>

      <HistoricoDetailModal
        attemptId={detailId}
        open={!!detailId}
        onOpenChange={(v) => { if (!v) setDetailId(null); }}
      />
    </div>
  );
}

const MOTIVATIONS: { title: string; sub: string }[] = [
  { title: "“Tudo posso naquele que me fortalece.”", sub: "Filipenses 4:13" },
  { title: "“O Senhor é o meu pastor, nada me faltará.”", sub: "Salmos 23:1" },
  { title: "“Posso todas as coisas em Cristo que me fortalece.”", sub: "Filipenses 4:13" },
  { title: "“Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.”", sub: "Salmos 37:5" },
  { title: "“Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.”", sub: "Isaías 41:10" },
  { title: "“Os que esperam no Senhor renovarão as suas forças.”", sub: "Isaías 40:31" },
  { title: "“Buscai primeiro o Reino de Deus e a sua justiça, e tudo o mais vos será acrescentado.”", sub: "Mateus 6:33" },
  { title: "“Bem-aventurados os que choram, porque serão consolados.”", sub: "Mateus 5:4" },
  { title: "“Aquietai-vos e sabei que eu sou Deus.”", sub: "Salmos 46:10" },
  { title: "“O Senhor é a minha luz e a minha salvação; a quem temerei?”", sub: "Salmos 27:1" },
  { title: "“Lança o teu cuidado sobre o Senhor, e ele te susterá.”", sub: "Salmos 55:22" },
  { title: "“Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.”", sub: "Provérbios 3:5" },
  { title: "“Sede fortes e corajosos; não temais.”", sub: "Deuteronômio 31:6" },
  { title: "“Tudo tem o seu tempo determinado.”", sub: "Eclesiastes 3:1" },
  { title: "“A alegria do Senhor é a vossa força.”", sub: "Neemias 8:10" },
  { title: "“O amor é paciente, o amor é bondoso.”", sub: "1 Coríntios 13:4" },
  { title: "“Mas os que esperam no Senhor renovarão as forças, subirão com asas como águias.”", sub: "Isaías 40:31" },
  { title: "“Deus é o nosso refúgio e fortaleza, socorro bem presente nas tribulações.”", sub: "Salmos 46:1" },
  { title: "“Não andeis ansiosos por coisa alguma.”", sub: "Filipenses 4:6" },
  { title: "“E conhecereis a verdade, e a verdade vos libertará.”", sub: "João 8:32" },
  { title: "“Pedi, e dar-se-vos-á; buscai, e encontrareis.”", sub: "Mateus 7:7" },
  { title: "“O Senhor pelejará por vós, e vós vos calareis.”", sub: "Êxodo 14:14" },
  { title: "“Eu sou o caminho, a verdade e a vida.”", sub: "João 14:6" },
  { title: "“Tudo coopera para o bem daqueles que amam a Deus.”", sub: "Romanos 8:28" },
  { title: "“Sê forte e corajoso; o Senhor, teu Deus, é contigo por onde quer que andares.”", sub: "Josué 1:9" },
  { title: "“Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.”", sub: "Salmos 119:105" },
  { title: "“Onde está o teu tesouro, aí estará também o teu coração.”", sub: "Mateus 6:21" },
  { title: "“Bem-aventurado o homem que confia no Senhor.”", sub: "Jeremias 17:7" },
  { title: "“Se Deus é por nós, quem será contra nós?”", sub: "Romanos 8:31" },
  { title: "“A paz vos deixo, a minha paz vos dou.”", sub: "João 14:27" },
  { title: "“Examinai tudo. Retende o bem.”", sub: "1 Tessalonicenses 5:21" },
];

function pickDailyIndex(seed: string, len: number) {
  // Hash (FNV-1a) com base no userId + data local (yyyy-mm-dd)
  const today = new Date();
  const day = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const str = `${seed}|${day}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h % len;
}

function DailyMotivationCard({ userId }: { userId: string }) {
  const m = useMemo(() => MOTIVATIONS[pickDailyIndex(userId, MOTIVATIONS.length)], [userId]);
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-mint/10 via-card to-card p-5 shadow-card">
      <h3 className="font-display font-bold text-mint">Versículo do dia</h3>
      <p className="mt-3 text-sm font-medium text-foreground">{m.title}</p>
      <p className="mt-2 text-xs text-muted-foreground">{m.sub}</p>
    </div>
  );
}
