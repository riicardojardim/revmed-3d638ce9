import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { STATIONS } from "@/data/stations";
import { Button } from "@/components/ui/button";
import { Users, Sparkles, ArrowRight, Hash, Stethoscope, UserRound, ClipboardCheck, GraduationCap, Theater, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { toast } from "sonner";

export const Route = createFileRoute("/app/treinar")({
  component: TrainPage,
  head: () => ({ meta: [{ title: "Treinar — Estação Revalida" }] }),
});

function genCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

const MODES = [
  {
    id: "individual",
    title: "Treino individual",
    desc: "Você treina sozinho e se autoavalia pelo checklist.",
    icon: Sparkles,
    cta: "Começar agora",
  },
  {
    id: "dupla",
    title: "Treino em dupla",
    desc: "Um colega assume o papel de avaliador ou paciente.",
    icon: Users,
    cta: "Criar sala",
  },
  {
    id: "completa",
    title: "Treino completo",
    desc: "Três pessoas: candidato, paciente/ator e médico avaliador.",
    icon: GraduationCap,
    cta: "Criar sala completa",
  },
  {
    id: "correcao",
    title: "Correção com professor",
    desc: "Faça a estação sozinho e envie a tentativa para um professor corrigir.",
    icon: ClipboardCheck,
    cta: "Treinar e enviar",
  },
] as const;

const ROLE_PREVIEW = [
  {
    title: "Sou candidato",
    desc: "Vejo o caso clínico, a tarefa da estação, o cronômetro e o campo de anotações. Não vejo o checklist.",
    icon: Stethoscope,
    accent: "from-mint/15 to-medical/10",
  },
  {
    title: "Sou paciente / ator",
    desc: "Vejo apenas o roteiro do paciente: queixa, história, emoções e o que só revelar se for perguntado.",
    icon: UserRound,
    accent: "from-rose-200/30 to-amber-100/20",
  },
  {
    title: "Sou médico avaliador",
    desc: "Vejo o checklist completo, marco itens, comento, dou nota e finalizo a correção.",
    icon: ClipboardCheck,
    accent: "from-indigo-200/30 to-mint/10",
  },
] as const;

function TrainPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { plan, isPrivileged } = useSubscription();
  // Plano Ator tem precedência sobre o papel admin/professor para a UI
  const isAtorOnly = plan?.slug === "ator";
  void isPrivileged;
  const [stationId, setStationId] = useState(STATIONS[0].id);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);

  async function createRoom(mode: "dupla" | "completa", autoRole?: "paciente" | "avaliador") {
    if (!user) return toast.error("Faça login para criar uma sala.");
    const st = STATIONS.find((s) => s.id === stationId)!;
    setBusy(true);
    const code = genCode();
    const { data, error } = await supabase.from("training_rooms")
      .insert({ code, host_id: user.id, station_id: st.id, station_title: st.title, mode })
      .select("id, code").single();
    if (error || !data) {
      setBusy(false);
      return toast.error(error?.message ?? "Falha ao criar sala.");
    }
    if (autoRole) {
      await supabase.from("training_room_participants")
        .insert({ room_id: data.id, user_id: user.id, role: autoRole });
    }
    setBusy(false);
    setLastCode(data.code);
    nav({ to: "/app/sala/$code", params: { code: data.code } });
  }

  async function startMode(mode: typeof MODES[number]["id"]) {
    if (mode === "individual") {
      nav({ to: "/app/simulacao/$id", params: { id: stationId } });
      return;
    }
    if (mode === "correcao") {
      nav({ to: "/app/simulacao/$id", params: { id: stationId }, search: { review: 1 } as never });
      return;
    }
    await createRoom(mode as "dupla" | "completa");
  }

  async function joinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    const { data } = await supabase.from("training_rooms").select("code").eq("code", code).maybeSingle();
    if (!data) return toast.error("Sala não encontrada.");
    nav({ to: "/app/sala/$code", params: { code: data.code } });
  }

  function copyLastCode() {
    if (!lastCode) return;
    navigator.clipboard.writeText(lastCode);
    toast.success("Código copiado");
  }

  // ============== ATOR-ONLY VIEW (estilo Pense Revalida) ==============
  if (isAtorOnly) {
    return <AtorTreinarView busy={busy} createRoom={createRoom} lastCode={lastCode} copyLastCode={copyLastCode} />;
  }

  // ============== DEFAULT (candidato / completo / admin) VIEW ==============
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3 py-1 text-xs font-medium text-medical">
          <Sparkles className="h-3.5 w-3.5" /> Modos de simulação
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">Como você quer treinar hoje?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha a estação, defina o modo e convide colegas para uma simulação realista.
        </p>
      </header>

      <section className="grid gap-3 rounded-3xl border border-border bg-card p-5 shadow-card md:grid-cols-[1fr_auto]">
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Estação</label>
          <select value={stationId} onChange={(e) => setStationId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {STATIONS.map((s) => <option key={s.id} value={s.id}>{s.title} · {s.specialty}</option>)}
          </select>
        </div>
        <div className="self-end">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Entrar em sala existente</label>
          <div className="mt-1 flex gap-2">
            <div className="relative flex-1">
              <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="EX: A2B4CD" maxLength={8}
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 font-mono text-sm tracking-widest" />
            </div>
            <Button variant="outline" onClick={joinRoom}>Entrar</Button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-bold">4 modos de treino</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {MODES.map((m) => (
            <button key={m.id} onClick={() => startMode(m.id)} disabled={busy}
              className="group rounded-3xl border border-border bg-gradient-card p-6 text-left transition-all hover:-translate-y-0.5 hover:border-mint/40 hover:shadow-elegant">
              <m.icon className="h-7 w-7 text-mint" />
              <div className="mt-4 font-display text-lg font-bold">{m.title}</div>
              <div className="mt-2 text-sm text-muted-foreground">{m.desc}</div>
              <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-medical">
                {m.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-bold">Os papéis da simulação</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada perfil só vê o que precisa. Assim a simulação fica realista — como na prova prática.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {ROLE_PREVIEW.map((r) => (
            <div key={r.title} className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card">
              <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${r.accent} opacity-60`} />
              <r.icon className="h-7 w-7 text-mint" />
              <div className="mt-4 font-display text-lg font-bold">{r.title}</div>
              <div className="mt-2 text-sm text-muted-foreground">{r.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-semibold">Estações populares</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {STATIONS.slice(0, 4).map((s) => (
            <Link key={s.id} to="/app/simulacao/$id" params={{ id: s.id }}
              className="rounded-2xl border border-border bg-card p-4 transition-all hover:border-mint/40 hover:shadow-card">
              <div className="text-xs text-muted-foreground">{s.specialty}</div>
              <div className="mt-1 font-medium">{s.title}</div>
              <div className="mt-2 text-xs text-muted-foreground">{s.durationMinutes} min · {s.difficulty}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// ===================== Ator view (Pense Revalida style) =====================

const SPECIALTY_BADGE: Record<string, { code: string; cls: string }> = {
  "Clínica Médica":           { code: "CM", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30" },
  "Pediatria":                { code: "PE", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-400/30" },
  "Ginecologia e Obstetrícia":{ code: "GO", cls: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-400/30" },
  "Cirurgia":                 { code: "CR", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30" },
  "Medicina da Família":      { code: "MF", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/30" },
  "Urgência e Emergência":    { code: "UE", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/30" },
};

function AtorTreinarView({
  busy, createRoom, lastCode, copyLastCode,
}: {
  busy: boolean;
  createRoom: (mode: "dupla" | "completa", autoRole?: "paciente" | "avaliador") => Promise<void>;
  lastCode: string | null;
  copyLastCode: () => void;
}) {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState<string>("all");
  const [role, setRole] = useState<"avaliador" | "paciente">("avaliador");

  const specialties = Array.from(new Set(STATIONS.map((s) => s.specialty)));
  const filtered = STATIONS.filter((s) => {
    const matchText = s.title.toLowerCase().includes(search.toLowerCase());
    const matchSpec = specialty === "all" || s.specialty === specialty;
    return matchText && matchSpec;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top header bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-mint/30 bg-gradient-to-r from-mint/10 to-medical/5 px-5 py-3">
        <Theater className="h-5 w-5 text-mint" />
        <span className="text-sm font-semibold text-foreground">Painel do Ator · Estações</span>
        <span className="ml-auto rounded-full bg-mint/15 px-3 py-1 text-xs font-mono font-bold text-mint">
          {filtered.length}/{STATIONS.length}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left column — search + table */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-semibold">Buscar uma estação</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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

            {/* Role toggle */}
            <div className="mt-4 inline-flex rounded-xl border border-border bg-muted/30 p-1 text-xs font-semibold">
              <button
                onClick={() => setRole("avaliador")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                  role === "avaliador" ? "bg-mint text-night shadow-card" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ClipboardCheck className="h-3.5 w-3.5" /> Entrar como Avaliador
              </button>
              <button
                onClick={() => setRole("paciente")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                  role === "paciente" ? "bg-mint text-night shadow-card" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserRound className="h-3.5 w-3.5" /> Entrar como Paciente
              </button>
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
                    <div className="text-center text-xs text-muted-foreground md:text-sm">{s.durationMinutes} min</div>
                    <div className="text-center text-xs text-muted-foreground md:text-sm">{s.difficulty}</div>
                    <div className="md:text-right">
                      <Button
                        size="sm"
                        variant="hero"
                        disabled={busy}
                        onClick={() => createRoom("dupla", role)}
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
          <div className="rounded-3xl border border-border bg-gradient-hero p-6 text-white shadow-elegant">
            <div className="text-xs uppercase tracking-wider text-white/70">Disponíveis</div>
            <div className="mt-1 font-display text-4xl font-bold">{STATIONS.length}</div>
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
                <li>4. Você entra direto como {role === "avaliador" ? "Avaliador" : "Paciente"}.</li>
              </ol>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
