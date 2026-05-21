import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarHeart,
  ChevronDown,
  ChevronRight,
  Clock,
  Flame,
  ListOrdered,
  RotateCcw,
  Sparkles,
  Target,
  Lock,
  Check,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  NOTA_DE_CORTE,
  NOTA_DE_CORTE_EDICAO,
  NOTA_DE_CORTE_ESCALA10,
  MEDAL_SPECIALTIES,
  getSpecAvg,
  MIN_STATIONS_PER_SPECIALTY,
  type SpecStats,
} from "@/components/SpecialtyMedals";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { AtorDashboard } from "@/components/AtorDashboard";
import { Button } from "@/components/ui/button";
import { HistoricoDetailModal } from "@/components/HistoricoDetailModal";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { FlashcardsPerformanceCard } from "@/components/FlashcardsPerformanceCard";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/stagger";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Painel — REVMED" }] }),
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

// Posto/patente hierárquica REVMED — substitui "Conquistas" e "Troféus"
const RANKS: { key: string; label: string; min: number; tagline: string }[] = [
  { key: "interno", label: "Interno", min: 0, tagline: "Os primeiros passos no centro." },
  { key: "plantonista", label: "Plantonista", min: 10, tagline: "Plantão dominado." },
  { key: "residente", label: "Residente", min: 30, tagline: "Raciocínio clínico afiado." },
  { key: "especialista", label: "Especialista", min: 70, tagline: "Repertório de quem treina sério." },
  { key: "mestre", label: "Mestre", min: 150, tagline: "Pronto para qualquer estação." },
];

function getRank(total: number) {
  let current = RANKS[0];
  let next: typeof RANKS[number] | null = RANKS[1] ?? null;
  for (let i = 0; i < RANKS.length; i++) {
    if (total >= RANKS[i].min) {
      current = RANKS[i];
      next = RANKS[i + 1] ?? null;
    }
  }
  return { current, next };
}

function Dashboard() {
  const { user, profile } = useAuth();
  const { isCompletoLike, isAtorOnly, loading: subLoading } = useSubscription();
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSim, setOpenSim] = useState<Record<string, boolean>>({});
  const [detailId, setDetailId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  useEffect(() => { setVisibleCount(5); }, [search]);

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
    const dayCounts = new Map<string, number>();
    const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    attempts.forEach((a) => {
      const k = a.specialty ?? "Outras";
      const cur = bySpec.get(k) ?? { sum: 0, n: 0 };
      cur.sum += Number(a.score) || 0;
      cur.n += 1;
      bySpec.set(k, cur);
      const dk = toKey(new Date(a.created_at));
      dayCounts.set(dk, (dayCounts.get(dk) ?? 0) + 1);
    });
    const total = attempts.length;
    const avg = total ? attempts.reduce((s, a) => s + Number(a.score), 0) / total : 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = toKey(today);
    const didToday = dayCounts.has(todayKey);
    let streak = 0;
    const cursor = new Date(today);
    if (!didToday) cursor.setDate(cursor.getDate() - 1);
    while (dayCounts.has(toKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    const HEAT_DAYS = 84;
    const heatStart = new Date(today);
    heatStart.setDate(heatStart.getDate() - (HEAT_DAYS - 1));
    heatStart.setDate(heatStart.getDate() - heatStart.getDay());
    const heatCells: { date: Date; key: string; count: number }[] = [];
    const totalCells = Math.ceil((today.getTime() - heatStart.getTime()) / 86400000) + 1;
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(heatStart);
      d.setDate(d.getDate() + i);
      const k = toKey(d);
      heatCells.push({ date: d, key: k, count: dayCounts.get(k) ?? 0 });
    }
    const activeDays = Array.from(dayCounts.keys()).filter((k) => {
      const [y, m, day] = k.split("-").map(Number);
      const d = new Date(y, m - 1, day);
      return d >= heatStart && d <= today;
    }).length;
    return { bySpec, total, avg, streak, didToday, heatCells, activeDays };
  }, [attempts]);

  const recommendation = useMemo(() => {
    let weakest: { key: string; label: string; avg: number; n: number } | null = null;
    for (const s of MEDAL_SPECIALTIES) {
      const { avg, n } = getSpecAvg(stats.bySpec, s.key);
      if (n === 0) return { key: s.key, label: s.label, avg: 0, n: 0, reason: "nunca treinada" as const };
      if (!weakest || avg < weakest.avg) weakest = { key: s.key, label: s.label, avg, n };
    }
    return weakest ? { ...weakest, reason: "média mais baixa" as const } : null;
  }, [stats.bySpec]);

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
  const hour = new Date().getHours();
  const salutation = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const todayLabel = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const delta = stats.avg - NOTA_DE_CORTE_ESCALA10;

  if (subLoading || loading) return <DashboardSkeleton />;
  if (isAtorOnly) return <AtorDashboard />;
  if (!isCompletoLike) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Bem-vindo(a)</p>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Olá, {displayName}!</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-7xl">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* ============ HERO EDITORIAL ============ */}
        <motion.section
          variants={staggerItem}
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-background"
        >
          {/* faixa âmbar superior */}
          <div className="h-1 w-full bg-gradient-to-r from-medical via-mint to-medical" />
          <div className="grid gap-6 p-6 sm:p-10 lg:grid-cols-[1.4fr_1fr]">
            <div className="flex flex-col justify-between gap-6">
              <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <span className="inline-block h-px w-8 bg-medical" />
                Painel · {todayLabel}
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
                  {salutation},<br />
                  <span className="text-medical">{greetingName}.</span>
                </h1>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Sua bancada particular de treino para o Revalida — sem firula, com método.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/app/checklists"
                  className="group inline-flex items-center gap-2 rounded-full bg-medical px-5 py-2.5 text-sm font-semibold text-night transition-all hover:shadow-glow"
                >
                  Começar treino agora
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/app/progresso"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-medical hover:text-foreground"
                >
                  Ver progresso detalhado
                </Link>
              </div>
            </div>

            {/* Painel KPI lateral */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <KpiTile
                eyebrow="Média geral"
                value={<AnimatedNumber value={stats.avg} decimals={1} />}
                hint={
                  delta >= 0
                    ? <span className="text-success">+{delta.toFixed(1)} acima do corte</span>
                    : <span className="text-medical">{delta.toFixed(1)} para o corte</span>
                }
                emphasis
              />
              <KpiTile
                eyebrow="Estações"
                value={<AnimatedNumber value={stats.total} />}
                hint={<span>concluídas no total</span>}
              />
              <KpiTile
                eyebrow="Sequência"
                value={
                  <span className="inline-flex items-baseline gap-1">
                    <AnimatedNumber value={stats.streak} />
                    <span className="text-base font-normal text-muted-foreground">{stats.streak === 1 ? "dia" : "dias"}</span>
                  </span>
                }
                hint={stats.didToday ? <span className="text-success">treinou hoje</span> : <span className="text-medical">treine hoje para manter</span>}
                icon={<Flame className="h-3.5 w-3.5 text-medical" />}
              />
              <KpiTile
                eyebrow="Corte INEP"
                value={NOTA_DE_CORTE_ESCALA10.toFixed(2)}
                hint={<span className="text-[10px]">{NOTA_DE_CORTE_EDICAO}</span>}
              />
            </div>
          </div>
        </motion.section>

        {/* ============ ROW 2: INSÍGNIA + PRÓXIMA AÇÃO + FLASHCARDS ============ */}
        <motion.section variants={staggerItem} className="grid gap-4 lg:grid-cols-3">
          <InsigniaCard bySpec={stats.bySpec} />
          <RecommendationCard rec={recommendation} />
          <FlashcardsPerformanceCard />
        </motion.section>

        {/* ============ DESEMPENHO POR EIXO ============ */}
        <motion.section variants={staggerItem} className="rounded-2xl border border-border bg-card">
          <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-6 py-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Desempenho</div>
              <h3 className="font-display text-xl font-bold">Por eixo de prova</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Meta: <span className="font-semibold text-foreground">≥ {NOTA_DE_CORTE_ESCALA10.toFixed(2)}</span>
              </span>
              <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Resetar
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Resetar desempenho?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso vai apagar permanentemente todas as suas tentativas, notas e histórico. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={resetting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={resetting}
                      onClick={async (e) => {
                        e.preventDefault();
                        if (!user) return;
                        setResetting(true);
                        const { error } = await supabase.from("attempts").delete().eq("user_id", user.id);
                        setResetting(false);
                        if (!error) { setAttempts([]); setResetOpen(false); }
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {resetting ? "Resetando..." : "Sim, resetar tudo"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </header>
          <ul className="divide-y divide-border">
            {MEDAL_SPECIALTIES.map((s) => {
              const meta = getSpecialtyMeta(s.key);
              const { avg, n } = getSpecAvg(stats.bySpec, s.key);
              const pct = Math.max(0, Math.min(100, (avg / 10) * 100));
              const hit = avg >= NOTA_DE_CORTE_ESCALA10 && n > 0;
              return (
                <li key={s.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-4">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg font-display text-xs font-bold ${meta.badge}`}>
                    {s.short}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold">{s.label}</div>
                      <div className="text-[11px] text-muted-foreground">{n} {n === 1 ? "estação" : "estações"}</div>
                    </div>
                    <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className={`h-full rounded-full ${meta.solid}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      />
                      <div
                        className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-foreground/40"
                        style={{ left: `${NOTA_DE_CORTE}%` }}
                        title={`Corte INEP — ${NOTA_DE_CORTE.toFixed(3)}`}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-display text-2xl font-bold tabular-nums ${hit ? meta.text : "text-foreground"}`}>
                      {avg.toFixed(1)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </motion.section>

        {/* ============ CONSTÂNCIA ============ */}
        <motion.section variants={staggerItem}>
          <ActivityHeatmap cells={stats.heatCells} activeDays={stats.activeDays} />
        </motion.section>

        {/* ============ HISTÓRICO ============ */}
        <motion.section variants={staggerItem} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Arquivo</div>
              <h3 className="flex items-center gap-2 font-display text-xl font-bold">
                <Clock className="h-5 w-5 text-medical" /> Histórico
              </h3>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar estação ou simulado..."
              className="w-full max-w-xs rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-medical"
            />
          </div>

          <div className="mt-5 space-y-2.5">
            {rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum treinamento ainda — bora começar?</p>
            ) : rows.slice(0, visibleCount).map((row) => {
              if (row.kind === "single") {
                const a = row.attempt;
                const meta = getSpecialtyMeta(a.specialty);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setDetailId(a.id)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-border bg-background/40 px-4 py-3 text-left transition-colors hover:border-medical/60 hover:bg-background"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${meta.badge}`}>
                      {meta.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{a.station_title ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString("pt-BR")} · {Math.round(a.used_seconds / 60)} min
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg font-bold text-medical tabular-nums">{Number(a.score).toFixed(1)}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
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
                    <ListOrdered className="h-4 w-4 text-medical" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{g.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {g.stations.length}/{totalStations} estações · {new Date(g.lastAt).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg font-bold text-medical tabular-nums">{g.avg.toFixed(1)}</div>
                    </div>
                    {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {open && (
                    <ul className="divide-y divide-border">
                      {g.stations.map((a, i) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => setDetailId(a.id)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/30"
                          >
                            <span className="text-xs text-muted-foreground">{(a.simulado_station_index ?? i) + 1}.</span>
                            <span className="flex-1 truncate">{a.station_title ?? "—"}</span>
                            <span className="text-xs text-muted-foreground">{Math.round(a.used_seconds / 60)} min</span>
                            <span className="font-display font-bold text-medical tabular-nums">{Number(a.score).toFixed(1)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
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
        </motion.section>
      </motion.div>

      <HistoricoDetailModal
        attemptId={detailId}
        open={!!detailId}
        onOpenChange={(v) => { if (!v) setDetailId(null); }}
      />
    </div>
  );
}

/* ============================================================ */
/* Subcomponents                                                */
/* ============================================================ */

function KpiTile({
  eyebrow, value, hint, icon, emphasis,
}: {
  eyebrow: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className={`flex flex-col justify-between rounded-2xl border p-4 ${emphasis ? "border-medical/40 bg-medical/5" : "border-border bg-background/50"}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {icon}{eyebrow}
      </div>
      <div className={`mt-2 font-display font-bold tabular-nums ${emphasis ? "text-medical text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function InsigniaCard({ total }: { total: number }) {
  const { current, next } = getRank(total);
  const progress = next ? Math.min(100, ((total - current.min) / (next.min - current.min)) * 100) : 100;
  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-medical/10 p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Insígnia atual</div>
        <Sparkles className="h-4 w-4 text-medical" />
      </div>
      <div className="mt-4 flex items-center gap-4">
        {/* hexágono insígnia */}
        <div className="relative h-16 w-16 shrink-0">
          <div
            className="absolute inset-0 bg-gradient-to-br from-medical via-mint to-medical shadow-glow"
            style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
          />
          <div
            className="absolute inset-[3px] flex items-center justify-center bg-card font-display text-xl font-bold text-medical"
            style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
          >
            {current.label[0]}
          </div>
        </div>
        <div className="min-w-0">
          <div className="font-display text-xl font-bold leading-tight">{current.label}</div>
          <div className="text-[11px] text-muted-foreground">{current.tagline}</div>
        </div>
      </div>
      {next ? (
        <div className="mt-5">
          <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
            <span>Rumo a <span className="font-semibold text-foreground">{next.label}</span></span>
            <span className="tabular-nums">{total}/{next.min}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-medical to-mint"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-medical">Patente máxima atingida</div>
      )}
      <div className="mt-5 flex gap-1.5">
        {RANKS.map((r) => (
          <div
            key={r.key}
            className={`h-1 flex-1 rounded-full ${total >= r.min ? "bg-medical" : "bg-muted"}`}
            title={r.label}
          />
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: { key: string; label: string; avg: number; n: number; reason: "nunca treinada" | "média mais baixa" } | null }) {
  if (!rec) {
    return (
      <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Próxima ação</div>
          <h3 className="mt-2 font-display text-xl font-bold">Faça sua 1ª estação</h3>
          <p className="mt-2 text-xs text-muted-foreground">Comece para receber recomendações personalizadas.</p>
        </div>
        <Link to="/app/checklists" className="mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-medical px-4 py-2 text-xs font-semibold text-night hover:shadow-glow">
          Treinar agora <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }
  const meta = getSpecialtyMeta(rec.key);
  return (
    <div className={`flex flex-col justify-between rounded-2xl border p-5 ${meta.card}`}>
      <div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          <Target className="h-3 w-3" /> Foco recomendado
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-md text-[11px] font-bold ${meta.badge}`}>{meta.code}</span>
          <h3 className="font-display text-xl font-bold leading-tight">{rec.label}</h3>
        </div>
        <p className={`mt-3 text-xs ${meta.text}`}>
          {rec.reason === "nunca treinada" ? "Você ainda não treinou esse eixo." : `Média atual: ${rec.avg.toFixed(1)} · ${rec.n} ${rec.n === 1 ? "estação" : "estações"}`}
        </p>
      </div>
      <Link
        to="/app/checklists"
        className="mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-90"
      >
        Treinar {rec.label} <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function ActivityHeatmap({ cells, activeDays }: { cells: { date: Date; key: string; count: number }[]; activeDays: number }) {
  const weeks: { date: Date; key: string; count: number }[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const intensity = (c: number) => {
    if (c === 0) return "bg-muted/40";
    if (c === 1) return "bg-medical/30";
    if (c === 2) return "bg-medical/55";
    if (c === 3) return "bg-medical/80";
    return "bg-medical";
  };
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((w, i) => {
    const first = w[0];
    if (first && first.date.getMonth() !== lastMonth) {
      lastMonth = first.date.getMonth();
      monthLabels.push({ col: i, label: first.date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") });
    }
  });
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">Constância</div>
          <h3 className="flex items-center gap-2 font-display text-xl font-bold">
            <CalendarHeart className="h-5 w-5 text-medical" /> Últimas 12 semanas
          </h3>
        </div>
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{activeDays}</span> dias ativos
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="inline-block">
          <div className="mb-1 flex gap-[3px] pl-7 text-[10px] text-muted-foreground">
            {weeks.map((_, i) => {
              const ml = monthLabels.find((m) => m.col === i);
              return <div key={i} className="w-[14px]">{ml ? ml.label : ""}</div>;
            })}
          </div>
          <div className="flex gap-[3px]">
            <div className="flex flex-col gap-[3px] pr-1 text-[10px] text-muted-foreground">
              {["", "Seg", "", "Qua", "", "Sex", ""].map((d, i) => (
                <div key={i} className="h-[14px] leading-[14px]">{d}</div>
              ))}
            </div>
            {weeks.map((w, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }).map((_, di) => {
                  const cell = w[di];
                  if (!cell) return <div key={di} className="h-[14px] w-[14px]" />;
                  return (
                    <div
                      key={di}
                      className={`h-[14px] w-[14px] rounded-[3px] ${intensity(cell.count)}`}
                      title={`${cell.date.toLocaleDateString("pt-BR")} — ${cell.count} ${cell.count === 1 ? "estação" : "estações"}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        <span>Menos</span>
        <div className="h-[10px] w-[10px] rounded-[2px] bg-muted/40" />
        <div className="h-[10px] w-[10px] rounded-[2px] bg-medical/30" />
        <div className="h-[10px] w-[10px] rounded-[2px] bg-medical/55" />
        <div className="h-[10px] w-[10px] rounded-[2px] bg-medical/80" />
        <div className="h-[10px] w-[10px] rounded-[2px] bg-medical" />
        <span>Mais</span>
      </div>
    </div>
  );
}
