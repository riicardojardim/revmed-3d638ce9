import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Clock,
  ListOrdered,
  RotateCcw,
  Flame,
  Target,
  Check,
  CalendarHeart,
  Trophy,
  Award,
  Lock,
  Stethoscope,
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
import { DashboardBackground } from "@/components/DashboardBackground";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { motion } from "framer-motion";

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
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
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

    // streak (dias consecutivos com ao menos 1 tentativa, terminando hoje ou ontem)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = toKey(today);
    const didToday = dayCounts.has(todayKey);
    let streak = 0;
    const cursor = new Date(today);
    if (!didToday) cursor.setDate(cursor.getDate() - 1); // permite manter streak se ainda não estudou hoje
    while (dayCounts.has(toKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    // melhor sequência (qualquer período)
    const sortedKeys = Array.from(dayCounts.keys()).sort();
    let bestStreak = 0;
    let curBest = 0;
    let prev: Date | null = null;
    for (const k of sortedKeys) {
      const [y, mo, da] = k.split("-").map(Number);
      const d = new Date(y, mo - 1, da);
      if (prev) {
        const diff = Math.round((d.getTime() - prev.getTime()) / 86400000);
        curBest = diff === 1 ? curBest + 1 : 1;
      } else curBest = 1;
      if (curBest > bestStreak) bestStreak = curBest;
      prev = d;
    }

    // heatmap: últimas 12 semanas (84 dias) em colunas semanais
    const HEAT_DAYS = 84;
    const heatStart = new Date(today);
    heatStart.setDate(heatStart.getDate() - (HEAT_DAYS - 1));
    // ajusta para domingo
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

    // métricas para badges
    const maxScore = attempts.reduce((m, a) => Math.max(m, Number(a.score) || 0), 0);
    const maxDayCount = Array.from(dayCounts.values()).reduce((m, n) => Math.max(m, n), 0);
    const simGroups = new Map<string, { total: number; stations: number }>();
    for (const a of attempts) {
      if (!a.simulado_id || (a.simulado_total_stations ?? 0) <= 1) continue;
      const g = simGroups.get(a.simulado_id) ?? { total: a.simulado_total_stations ?? 0, stations: 0 };
      g.stations += 1;
      simGroups.set(a.simulado_id, g);
    }
    const simulatedCompleted = Array.from(simGroups.values()).filter((g) => g.stations >= g.total && g.total > 0).length;
    const specialtiesTouched = new Set(MEDAL_SPECIALTIES.filter((s) => getSpecAvg(bySpec, s.key).n > 0).map((s) => s.key)).size;
    const specialtiesMastered = MEDAL_SPECIALTIES.filter((s) => {
      const { avg, n } = getSpecAvg(bySpec, s.key);
      return n >= 5 && avg >= 7;
    }).length;
    const aboveCut = attempts.some((a) => Number(a.score) >= NOTA_DE_CORTE_ESCALA10);

    return {
      bySpec, total, avg, streak, didToday, heatCells, activeDays,
      bestStreak, maxScore, maxDayCount, simulatedCompleted, specialtiesTouched, specialtiesMastered, aboveCut,
    };
  }, [attempts]);

  // Próxima ação recomendada: especialidade mais fraca entre as medalhas
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

  if (subLoading) {
    // Skeleton leve em vez de bloquear com texto — sensação de instantâneo.
    return (
      <div className="mx-auto max-w-5xl animate-pulse space-y-4">
        <div className="h-7 w-48 rounded-md bg-muted/60" />
        <div className="h-32 rounded-2xl bg-muted/40" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="h-24 rounded-2xl bg-muted/40" />
          <div className="h-24 rounded-2xl bg-muted/40" />
          <div className="h-24 rounded-2xl bg-muted/40" />
        </div>
      </div>
    );
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
    <div className="relative mx-auto max-w-7xl space-y-6">
      <DashboardBackground />


      {/* Top row: welcome + stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-mint/5 p-4 shadow-card sm:p-6"
        >
          {/* Shine sutil passando por cima */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-mint/15 to-transparent"
            initial={{ x: "-50%" }}
            animate={{ x: "400%" }}
            transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 6, ease: "easeInOut" }}
          />
          <h2 className="text-balance font-display text-lg font-bold leading-tight sm:text-xl md:text-2xl">
            <span className="text-mint">{profile?.title && profile.title !== "Sem título" ? greetingName : `Olá, ${displayName}`}</span>{" "}
            <span className="text-foreground">sua média geral está em </span>
            <span className="text-mint"><AnimatedNumber value={stats.avg} decimals={1} /></span>
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
            Com nossos treinamentos vamos trabalhar para manter sua média sempre acima da última nota de corte do Revalida.
          </p>
          <div className="mt-5">
            <SpecialtyMedals stats={stats.bySpec} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <DailyMotivationCard userId={user?.id ?? "anon"} streak={stats.streak} didToday={stats.didToday} />
        </motion.div>
      </motion.div>


      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
      >
        <BadgesCard stats={stats} />
      </motion.div>





      {/* Meu Desempenho */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -2 }}
      >
      <Link
        to="/app/progresso"
        className="group block rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-mint/60 sm:p-6"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <BarChart3 className="h-5 w-5 shrink-0 text-mint" />
            <h3 className="truncate font-display text-base font-bold sm:text-lg">Meu Desempenho</h3>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setResetOpen(true); }}
                  className="inline-flex items-center gap-1 rounded-md border border-border p-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive hover:text-destructive sm:px-2 sm:py-1"
                  aria-label="Resetar desempenho"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Resetar</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Resetar desempenho?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso vai apagar permanentemente todas as suas tentativas, notas e histórico de estações. Esta ação não pode ser desfeita.
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
                      if (!error) {
                        setAttempts([]);
                        setResetOpen(false);
                      }
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {resetting ? "Resetando..." : "Sim, resetar tudo"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors group-hover:text-mint">
              <span className="hidden sm:inline">Ver detalhes</span>
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-xl border border-border/60 bg-background p-2.5 transition-colors hover:border-mint/40 sm:p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-[11px]">Tentativas</div>
            <div className="mt-1 font-display text-xl font-bold sm:text-3xl"><AnimatedNumber value={stats.total} /></div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background p-2.5 transition-colors hover:border-mint/40 sm:p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-[11px]">Nota média</div>
            <div className="mt-1 font-display text-xl font-bold text-medical sm:text-3xl"><AnimatedNumber value={stats.avg} decimals={1} /></div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background p-2.5 transition-colors hover:border-mint/40 sm:p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-[11px]">Corte INEP</div>
            <div className="mt-1 font-display text-xl font-bold text-mint sm:text-3xl">{stats.total > 0 ? NOTA_DE_CORTE_ESCALA10.toFixed(2) : NOTA_DE_CORTE.toFixed(3)}</div>
            <div className="mt-1 hidden text-[10px] text-muted-foreground sm:block">
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
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`inline-flex h-6 min-w-[2rem] shrink-0 items-center justify-center rounded-md px-1.5 text-[10px] font-bold tracking-wider ${meta.badge}`}>
                        {s.short}
                      </span>
                      <span className="truncate font-medium">{s.label}</span>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-2 text-xs text-muted-foreground">
                      <span className="whitespace-nowrap">{n} est.</span>
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
      </motion.div>

      {/* Histórico */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-border bg-card p-5 shadow-card"
      >
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
            <div className="space-y-2.5" aria-label="Carregando histórico">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="relative h-14 overflow-hidden rounded-xl border border-border/60 bg-muted/30"
                >
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-mint/15 to-transparent" />
                </div>
              ))}
              <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
            </div>
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

function DailyMotivationCard({ userId, streak, didToday }: { userId: string; streak: number; didToday: boolean }) {
  const m = useMemo(() => MOTIVATIONS[pickDailyIndex(userId, MOTIVATIONS.length)], [userId]);
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-gradient-to-br from-mint/10 via-card to-card p-5 shadow-card">
      <h3 className="font-display font-bold text-mint">Versículo do dia</h3>
      <p className="mt-3 text-sm font-medium italic text-foreground">{m.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{m.sub}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/60 bg-background/60 p-3">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Flame className="h-3 w-3 text-orange-500" /> Sequência
          </div>
          <div className="mt-1 font-display text-2xl font-bold">
            {streak}
            <span className="ml-1 text-xs font-normal text-muted-foreground">{streak === 1 ? "dia" : "dias"}</span>
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/60 p-3">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Target className="h-3 w-3 text-mint" /> Meta de hoje
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${didToday ? "border-mint bg-mint text-white" : "border-border bg-background"}`}>
              {didToday && <Check className="h-3.5 w-3.5" />}
            </div>
            <span className="text-xs font-medium">{didToday ? "Concluída!" : "1 estação"}</span>
          </div>
        </div>
      </div>

      {!didToday && (
        <Link to="/app/checklists" className="mt-3 inline-flex items-center justify-center gap-1 rounded-lg bg-mint px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-mint/90">
          Treinar agora <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function ActivityHeatmap({ cells, activeDays }: { cells: { date: Date; key: string; count: number }[]; activeDays: number }) {
  // organiza em colunas (semanas) x 7 linhas (dias)
  const weeks: { date: Date; key: string; count: number }[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  const intensity = (c: number) => {
    if (c === 0) return "bg-muted/40";
    if (c === 1) return "bg-mint/30";
    if (c === 2) return "bg-mint/55";
    if (c === 3) return "bg-mint/75";
    return "bg-mint";
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
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarHeart className="h-5 w-5 text-mint" />
          <h3 className="font-display text-lg font-bold">Constância</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{activeDays}</span> dias ativos nas últimas 12 semanas
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="inline-block">
          <div className="mb-1 flex gap-[3px] pl-7 text-[10px] text-muted-foreground">
            {weeks.map((_, i) => {
              const ml = monthLabels.find((m) => m.col === i);
              return (
                <div key={i} className="w-[14px]">{ml ? ml.label : ""}</div>
              );
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
        <div className="h-[10px] w-[10px] rounded-[2px] bg-mint/30" />
        <div className="h-[10px] w-[10px] rounded-[2px] bg-mint/55" />
        <div className="h-[10px] w-[10px] rounded-[2px] bg-mint/75" />
        <div className="h-[10px] w-[10px] rounded-[2px] bg-mint" />
        <span>Mais</span>
      </div>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: { key: string; label: string; avg: number; n: number; reason: "nunca treinada" | "média mais baixa" } | null }) {
  if (!rec) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-mint" />
          <h3 className="font-display text-lg font-bold">Próxima ação</h3>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Comece sua primeira estação para receber recomendações personalizadas.</p>
        <Link to="/app/checklists" className="mt-auto inline-flex items-center justify-center gap-1 rounded-lg bg-mint px-3 py-2 text-sm font-semibold text-white hover:bg-mint/90">
          Treinar agora <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }
  const meta = getSpecialtyMeta(rec.key);
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-gradient-to-br from-card via-card to-mint/5 p-5 shadow-card">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-mint" />
        <h3 className="font-display text-lg font-bold">Próxima ação recomendada</h3>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Foque na sua especialidade mais fraca para subir a média geral.</p>
      <div className={`mt-4 rounded-xl border p-3 ${meta.card}`}>
        <div className={`text-[11px] font-bold uppercase tracking-wider ${meta.text}`}>{rec.reason}</div>
        <div className="mt-1 font-display text-lg font-bold">{rec.label}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {rec.n === 0 ? "Nenhuma estação ainda" : `Média atual: ${rec.avg.toFixed(1)} (${rec.n} ${rec.n === 1 ? "estação" : "estações"})`}
        </div>
      </div>
      <Link
        to="/app/checklists"
        className="mt-auto inline-flex items-center justify-center gap-1 rounded-lg bg-mint px-3 py-2 text-sm font-semibold text-white hover:bg-mint/90"
      >
        Treinar {rec.label} <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

type BadgeStats = {
  total: number; maxScore: number; bestStreak: number; streak: number;
  maxDayCount: number; simulatedCompleted: number; specialtiesTouched: number;
  specialtiesMastered: number; aboveCut: boolean;
};

type BadgeDef = {
  key: string;
  title: string;
  description: string;
  icon: typeof Trophy;
  unlocked: boolean;
  progress?: { current: number; goal: number };
  tone: "gold" | "mint" | "orange" | "blue" | "purple";
};

function buildBadges(s: BadgeStats): BadgeDef[] {
  return [
    { key: "first", title: "Primeira estação", description: "Complete sua 1ª estação", icon: Sparkles, unlocked: s.total >= 1, progress: { current: Math.min(s.total, 1), goal: 1 }, tone: "mint" },
    { key: "ten", title: "10 estações", description: "Complete 10 estações", icon: Trophy, unlocked: s.total >= 10, progress: { current: Math.min(s.total, 10), goal: 10 }, tone: "mint" },
    { key: "fifty", title: "50 estações", description: "Complete 50 estações", icon: Trophy, unlocked: s.total >= 50, progress: { current: Math.min(s.total, 50), goal: 50 }, tone: "blue" },
    { key: "hundred", title: "100 estações", description: "Complete 100 estações", icon: Trophy, unlocked: s.total >= 100, progress: { current: Math.min(s.total, 100), goal: 100 }, tone: "purple" },
    { key: "perfect", title: "Nota 10", description: "Tire nota 10 em uma estação", icon: Award, unlocked: s.maxScore >= 10, tone: "gold" },
    { key: "above", title: "Acima da corte", description: `Nota ≥ ${NOTA_DE_CORTE_ESCALA10.toFixed(2)}`, icon: Target, unlocked: s.aboveCut, tone: "mint" },
    { key: "marathon", title: "Maratonista", description: "5+ estações em um dia", icon: Flame, unlocked: s.maxDayCount >= 5, progress: { current: Math.min(s.maxDayCount, 5), goal: 5 }, tone: "orange" },
    { key: "streak3", title: "3 dias seguidos", description: "Sequência de 3 dias", icon: Flame, unlocked: s.bestStreak >= 3, progress: { current: Math.min(s.bestStreak, 3), goal: 3 }, tone: "orange" },
    { key: "streak7", title: "7 dias seguidos", description: "Sequência de 7 dias", icon: Flame, unlocked: s.bestStreak >= 7, progress: { current: Math.min(s.bestStreak, 7), goal: 7 }, tone: "orange" },
    { key: "streak30", title: "30 dias seguidos", description: "Sequência de 30 dias", icon: Flame, unlocked: s.bestStreak >= 30, progress: { current: Math.min(s.bestStreak, 30), goal: 30 }, tone: "gold" },
    { key: "sim1", title: "Primeiro simulado", description: "Conclua 1 simulado completo", icon: ListOrdered, unlocked: s.simulatedCompleted >= 1, progress: { current: Math.min(s.simulatedCompleted, 1), goal: 1 }, tone: "blue" },
    { key: "sim10", title: "10 simulados", description: "Conclua 10 simulados", icon: ListOrdered, unlocked: s.simulatedCompleted >= 10, progress: { current: Math.min(s.simulatedCompleted, 10), goal: 10 }, tone: "purple" },
    { key: "allSpec", title: "Generalista", description: "Treine todas as especialidades", icon: Stethoscope, unlocked: s.specialtiesTouched >= MEDAL_SPECIALTIES.length, progress: { current: s.specialtiesTouched, goal: MEDAL_SPECIALTIES.length }, tone: "mint" },
    { key: "specialist", title: "Especialista", description: "Média ≥ 7 com 5+ estações em uma especialidade", icon: Award, unlocked: s.specialtiesMastered >= 1, tone: "gold" },
  ];
}

const TONE_CLASSES: Record<BadgeDef["tone"], { bg: string; text: string; ring: string }> = {
  gold:   { bg: "bg-gradient-to-br from-yellow-400 to-amber-600", text: "text-amber-600", ring: "ring-amber-400/40" },
  mint:   { bg: "bg-gradient-to-br from-mint to-emerald-600", text: "text-mint", ring: "ring-mint/40" },
  orange: { bg: "bg-gradient-to-br from-orange-400 to-red-500", text: "text-orange-500", ring: "ring-orange-400/40" },
  blue:   { bg: "bg-gradient-to-br from-sky-400 to-blue-600", text: "text-sky-500", ring: "ring-sky-400/40" },
  purple: { bg: "bg-gradient-to-br from-fuchsia-400 to-purple-600", text: "text-purple-500", ring: "ring-purple-400/40" },
};

function BadgesCard({ stats }: { stats: BadgeStats }) {
  const badges = useMemo(() => buildBadges(stats), [stats]);
  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const [showAll, setShowAll] = useState(false);
  const MOBILE_LIMIT = 6;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-mint" />
          <h3 className="font-display text-lg font-bold">Conquistas</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{unlockedCount}</span> de {badges.length} desbloqueadas
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
        {badges.map((b, i) => {
          const tone = TONE_CLASSES[b.tone];
          const Icon = b.icon;
          const pct = b.progress ? Math.round((b.progress.current / b.progress.goal) * 100) : 0;
          const hideOnMobile = !showAll && i >= MOBILE_LIMIT;
          return (
            <div
              key={b.key}
              className={`group relative flex flex-col items-center rounded-xl border p-3 text-center transition ${
                hideOnMobile ? "hidden sm:flex" : ""
              } ${
                b.unlocked ? `border-border bg-background shadow-sm ring-1 ${tone.ring}` : "border-dashed border-border bg-muted/20"
              }`}
              title={b.description}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  b.unlocked ? `${tone.bg} text-white shadow-elegant` : "bg-muted text-muted-foreground"
                }`}
              >
                {b.unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
              </div>
              <div className={`mt-2 text-[11px] font-bold leading-tight ${b.unlocked ? tone.text : "text-muted-foreground"}`}>
                {b.title}
              </div>
              <div className="mt-0.5 text-[9px] leading-tight text-muted-foreground">{b.description}</div>
              {b.progress && !b.unlocked && (
                <div className="mt-2 w-full">
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${tone.bg}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-0.5 text-[9px] text-muted-foreground">{b.progress.current}/{b.progress.goal}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {badges.length > MOBILE_LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 w-full rounded-xl border border-border bg-background py-2 text-xs font-semibold text-mint hover:bg-muted sm:hidden"
        >
          {showAll ? "Ver menos" : `Ver mais (${badges.length - MOBILE_LIMIT})`}
        </button>
      )}
    </div>
  );
}
