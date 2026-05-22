import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, BookOpen, ClipboardList, Layers, CheckCircle2, FileText,
  AlertCircle, Stethoscope, Play, TrendingUp, DollarSign, UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IntroOverlay, type IntroRole } from "@/components/room/IntroOverlay";
import { useSiteSettings, refreshSiteSettings } from "@/hooks/use-site-settings";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/stagger";
import { MotionCard } from "@/components/motion/MotionPrimitives";
import { AnimatedNumber } from "@/components/AnimatedNumber";

export const Route = createFileRoute("/app/admin/")({
  component: AdminOverview,
});

const CHART_COLORS = ["hsl(var(--mint))", "hsl(var(--medical))", "hsl(var(--primary))", "#f59e0b", "#ef4444", "#8b5cf6"];

interface PlanBucket { plan: string; count: number; price_cents: number }
interface TopStation { station_id: string; station_title: string; count: number }
interface DailyPoint { date: string; label: string; value: number }

function AdminOverview() {
  const [testRole, setTestRole] = useState<IntroRole | null>(null);
  const { settings } = useSiteSettings();

  // === Banner do grupo de WhatsApp (topo do app) ===
  const [waEnabled, setWaEnabled] = useState(true);
  const [waLabel, setWaLabel] = useState("");
  const [waUrl, setWaUrl] = useState("");
  const [savingWa, setSavingWa] = useState(false);
  useEffect(() => {
    if (!settings) return;
    setWaEnabled(settings.whatsapp_banner_enabled !== false);
    setWaLabel(settings.whatsapp_banner_label ?? "");
    setWaUrl(settings.whatsapp_banner_url ?? "");
  }, [settings?.id, settings?.whatsapp_banner_enabled, settings?.whatsapp_banner_label, settings?.whatsapp_banner_url]);
  async function saveWa() {
    if (!settings?.id) return;
    setSavingWa(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        whatsapp_banner_enabled: waEnabled,
        whatsapp_banner_label: waLabel || null,
        whatsapp_banner_url: waUrl || null,
      })
      .eq("id", settings.id);
    setSavingWa(false);
    if (error) return toast.error("Erro ao salvar", { description: error.message });
    await refreshSiteSettings();
    toast.success("Banner do WhatsApp atualizado");
  }

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0, attempts: 0, attempts7: 0, attempts30: 0,
    stationsPublished: 0, stationsDraft: 0, flashcards: 0, summaries: 0,
    pendingReviews: 0, activeSubs: 0, freeUsers: 0, mrrCents: 0,
  });
  const [planBuckets, setPlanBuckets] = useState<PlanBucket[]>([]);
  const [topStations, setTopStations] = useState<TopStation[]>([]);
  const [signupSeries, setSignupSeries] = useState<DailyPoint[]>([]);
  const [attemptSeries, setAttemptSeries] = useState<DailyPoint[]>([]);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
      const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();

      const [u, aAll, a7, a30, sPub, sDraft, fc, sum, pend, subs, plans, recentAttempts, profiles30, attempts30list, internalRoles] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("attempts").select("id", { count: "exact", head: true }),
        supabase.from("attempts").select("id", { count: "exact", head: true }).gte("created_at", d7),
        supabase.from("attempts").select("id", { count: "exact", head: true }).gte("created_at", d30),
        supabase.from("custom_stations").select("id", { count: "exact", head: true }).eq("published", true),
        supabase.from("custom_stations").select("id", { count: "exact", head: true }).eq("published", false),
        supabase.from("flashcard_decks").select("id", { count: "exact", head: true }),
        supabase.from("summaries").select("id", { count: "exact", head: true }),
        supabase.from("attempts").select("id", { count: "exact", head: true }).eq("status", "aguardando_correcao"),
        supabase.from("user_subscriptions").select("plan_id, status, user_id").eq("status", "active"),
        supabase.from("plans").select("id, name, slug, price_cents"),
        supabase.from("attempts").select("station_id, station_title").gte("created_at", d30).limit(2000),
        supabase.from("profiles").select("created_at").gte("created_at", d30).limit(5000),
        supabase.from("attempts").select("created_at").gte("created_at", d30).limit(5000),
        supabase.from("user_roles").select("user_id").in("role", ["admin", "professor", "mentor"]),
      ]);

      // IDs de contas internas (admin / professor / mentor) — NÃO contam em métricas
      const internalIds = new Set<string>((internalRoles.data ?? []).map((r: any) => r.user_id));

      // Plan buckets + MRR
      const planMap = new Map<string, { name: string; slug: string; price_cents: number }>();
      (plans.data ?? []).forEach((p: any) => planMap.set(p.id, p));
      const buckets = new Map<string, { count: number; price_cents: number }>();
      let mrr = 0;
      let freeCount = 0;
      const externalSubs = (subs.data ?? []).filter((s: any) => !internalIds.has(s.user_id));
      externalSubs.forEach((s: any) => {
        const plan = planMap.get(s.plan_id);
        const name = plan?.name ?? "Sem plano";
        const price = plan?.price_cents ?? 0;
        if (plan?.slug === "free" || price === 0) freeCount += 1;
        else mrr += price;
        const prev = buckets.get(name) ?? { count: 0, price_cents: price };
        buckets.set(name, { count: prev.count + 1, price_cents: price });
      });

      setPlanBuckets(
        Array.from(buckets, ([plan, v]) => ({ plan, count: v.count, price_cents: v.price_cents }))
          .sort((a, b) => b.count - a.count),
      );

      // Top stations
      const tops = new Map<string, { title: string; count: number }>();
      (recentAttempts.data ?? []).forEach((a: any) => {
        const key = a.station_id as string;
        const prev = tops.get(key);
        tops.set(key, { title: a.station_title ?? key, count: (prev?.count ?? 0) + 1 });
      });
      setTopStations(
        Array.from(tops, ([station_id, v]) => ({ station_id, station_title: v.title, count: v.count }))
          .sort((a, b) => b.count - a.count).slice(0, 5),
      );

      // Daily series
      const buildSeries = (rows: { created_at: string }[]) => {
        const map = new Map<string, number>();
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 86400000);
          const key = d.toISOString().slice(0, 10);
          map.set(key, 0);
        }
        rows.forEach((r) => {
          const key = r.created_at.slice(0, 10);
          if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
        });
        return Array.from(map, ([date, value]) => ({
          date, value,
          label: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        }));
      };
      setSignupSeries(buildSeries((profiles30.data ?? []) as any));
      setAttemptSeries(buildSeries((attempts30list.data ?? []) as any));

      // Total de usuários "reais" (exclui admins/professores/mentores)
      const totalUsers = Math.max((u.count ?? 0) - internalIds.size, 0);
      const activeSubs = externalSubs.length;
      setStats({
        users: totalUsers,
        attempts: aAll.count ?? 0,
        attempts7: a7.count ?? 0,
        attempts30: a30.count ?? 0,
        stationsPublished: sPub.count ?? 0,
        stationsDraft: sDraft.count ?? 0,
        flashcards: fc.count ?? 0,
        summaries: sum.count ?? 0,
        pendingReviews: pend.count ?? 0,
        activeSubs,
        freeUsers: Math.max(totalUsers - (activeSubs - freeCount), 0),
        mrrCents: mrr,
      });

      setLoading(false);
    })();
  }, []);

  const paidVsFree = useMemo(() => {
    const paid = stats.activeSubs - planBuckets.filter((p) => p.price_cents === 0).reduce((s, p) => s + p.count, 0);
    return [
      { name: "Pagantes", value: Math.max(paid, 0) },
      { name: "Free/Trial", value: Math.max(stats.users - paid, 0) },
    ];
  }, [stats, planBuckets]);

  const fmtBRL = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const cards = [
    { label: "Usuários totais", value: stats.users, icon: Users, color: "text-medical" },
    { label: "Assinantes ativos", value: stats.activeSubs, icon: UserPlus, color: "text-mint" },
    { label: "MRR estimado", value: fmtBRL(stats.mrrCents), icon: DollarSign, color: "text-success", isText: true },
    { label: "Tentativas — 30 dias", value: stats.attempts30, icon: TrendingUp, color: "text-mint" },
    { label: "Checklists publicados", value: stats.stationsPublished, icon: CheckCircle2, color: "text-success" },
    { label: "Checklists rascunho", value: stats.stationsDraft, icon: Layers, color: "text-warning" },
    { label: "Decks de Flashcards", value: stats.flashcards, icon: BookOpen, color: "text-mint" },
    { label: "Resumos", value: stats.summaries, icon: FileText, color: "text-mint" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-mint/30 bg-mint/5 p-4 space-y-3 sm:p-5 sm:space-y-4">
        <div>
          <h3 className="font-display text-sm font-semibold flex items-center gap-2 sm:text-base">
            <Play className="h-4 w-4 text-mint" /> Animação de entrada da estação
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Animação institucional REVMED exibida para o candidato e para o ator ao iniciar uma estação. Use os botões abaixo para pré-visualizar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center mr-1">Pré-visualizar:</span>
          <Button size="sm" variant="outline" onClick={() => setTestRole("candidato")}>
            <Play className="h-3.5 w-3.5" /> Ver como Candidato
          </Button>
          <Button size="sm" variant="outline" onClick={() => setTestRole("paciente")}>
            <Play className="h-3.5 w-3.5" /> Ver como Ator
          </Button>
        </div>
      </div>

      {testRole && (
        <IntroOverlay
          role={testRole}
          stationTitle="Estação de Teste — Dor Torácica Aguda"
          specialty="Clínica Médica"
          displayName={testRole === "candidato" ? "Dr. João Silva" : "João Silva"}
          onComplete={() => setTestRole(null)}
        />
      )}

      {/* Banner do grupo de WhatsApp (topo do app) */}
      <div className="rounded-2xl border border-mint/30 bg-mint/5 p-4 space-y-3 sm:p-5 sm:space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-semibold sm:text-base">Banner do grupo de WhatsApp (topo do app)</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Controla o link clicável que aparece no topo de todas as páginas do app, ao lado da nota de corte.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={waEnabled} onCheckedChange={setWaEnabled} id="wa-enabled" />
            <Label htmlFor="wa-enabled" className="text-xs">{waEnabled ? "Ativo" : "Desativado"}</Label>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Frase exibida</Label>
            <Input
              value={waLabel}
              onChange={(e) => setWaLabel(e.target.value)}
              placeholder="Grupo Premium 2026.1 · WhatsApp (Grupo 6)"
              disabled={!waEnabled}
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Link do grupo</Label>
            <Input
              type="url"
              value={waUrl}
              onChange={(e) => setWaUrl(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              disabled={!waEnabled}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-mint/20">
          <span className="text-xs text-muted-foreground">
            {waEnabled
              ? "Pré-visualização: " + (waLabel || "(sem texto)")
              : "Banner desativado — não aparece no topo."}
          </span>
          <Button
            onClick={saveWa}
            disabled={
              savingWa ||
              (waEnabled === (settings?.whatsapp_banner_enabled !== false) &&
                waLabel === (settings?.whatsapp_banner_label ?? "") &&
                waUrl === (settings?.whatsapp_banner_url ?? ""))
            }
          >
            {savingWa ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>


      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid gap-3 grid-cols-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {cards.map((c) => (
          <motion.div key={c.label} variants={staggerItem}>
            <MotionCard lift={3} glow className="rounded-2xl border border-border bg-card p-3 shadow-card sm:p-5">
              <c.icon className={`h-5 w-5 ${c.color}`} />
              <div className="mt-2 text-xl font-bold font-display sm:mt-3 sm:text-2xl">
                {loading ? "—" : c.isText ? c.value : <AnimatedNumber value={Number(c.value)} />}
              </div>
              <div className="text-[11px] text-muted-foreground sm:text-sm">{c.label}</div>
            </MotionCard>
          </motion.div>
        ))}
      </motion.div>

      {stats.pendingReviews > 0 && (
        <Link to="/app/professor/correcoes" className="block">
          <div className="flex items-center gap-3 rounded-2xl border border-warning/40 bg-warning/5 p-5">
            <AlertCircle className="h-6 w-6 text-warning" />
            <div className="flex-1">
              <div className="font-semibold">{stats.pendingReviews} tentativa(s) aguardando correção</div>
              <div className="text-xs text-muted-foreground">Clique para abrir a fila de correções.</div>
            </div>
          </div>
        </Link>
      )}

      {/* Charts row 1: signups + attempts */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-3 shadow-card sm:p-5">
          <h3 className="font-display text-sm font-semibold mb-2 sm:text-base">Novos cadastros (30 dias)</h3>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signupSeries}>
                <defs>
                  <linearGradient id="gSign" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--mint))" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="hsl(var(--mint))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--mint))" fill="url(#gSign)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 shadow-card sm:p-5">
          <h3 className="font-display text-sm font-semibold mb-2 sm:text-base">Tentativas por dia (30 dias)</h3>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attemptSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--medical))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts row 2: plan distribution + paid vs free */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-3 shadow-card sm:p-5">
          <h3 className="font-display text-sm font-semibold mb-2 sm:text-base">Distribuição de assinantes por plano</h3>
          {planBuckets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum assinante ativo ainda.</p>
          ) : (
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="plan" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {planBuckets.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 shadow-card sm:p-5">
          <h3 className="font-display text-sm font-semibold mb-2 sm:text-base">Pagantes vs Free</h3>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paidVsFree} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  <Cell fill="hsl(var(--mint))" />
                  <Cell fill="hsl(var(--muted))" />
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top stations */}
      <div className="rounded-2xl border border-border bg-card p-3 shadow-card sm:p-5">
        <h3 className="font-display text-sm font-semibold flex items-center gap-2 sm:text-base">
          <Stethoscope className="h-4 w-4 text-mint" /> Top 5 checklists (30 dias)
        </h3>
        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Carregando...</p>
        ) : topStations.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Sem tentativas registradas no período.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {topStations.map((s, i) => (
              <li key={s.station_id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2">
                <span className="text-sm">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">#{i + 1}</span>
                  {s.station_title}
                </span>
                <Badge variant="outline">{s.count}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-3 shadow-card flex flex-wrap items-center justify-between gap-3 sm:p-5">
        <div>
          <h3 className="font-display text-sm font-semibold flex items-center gap-2 sm:text-base">
            <DollarSign className="h-4 w-4 text-mint" /> Pagamentos
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Gerencie assinaturas, veja receita e atribua planos manualmente.</p>
        </div>
        <Link to="/app/admin/pagamentos">
          <Button>Abrir Pagamentos</Button>
        </Link>
      </div>
    </div>
  );
}
