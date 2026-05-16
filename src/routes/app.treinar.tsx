import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { STATIONS } from "@/data/stations";
import { Button } from "@/components/ui/button";
import { Users, Sparkles, ArrowRight, Hash, Stethoscope, UserRound, ClipboardCheck, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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
  const [stationId, setStationId] = useState(STATIONS[0].id);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function startMode(mode: typeof MODES[number]["id"]) {
    if (mode === "individual") {
      nav({ to: "/app/simulacao/$id", params: { id: stationId } });
      return;
    }
    if (mode === "correcao") {
      // Run simulation; result page will let user request review
      nav({ to: "/app/simulacao/$id", params: { id: stationId }, search: { review: 1 } as never });
      return;
    }
    if (!user) return toast.error("Faça login para criar uma sala.");
    const st = STATIONS.find((s) => s.id === stationId)!;
    setBusy(true);
    const code = genCode();
    const { data, error } = await supabase.from("training_rooms")
      .insert({ code, host_id: user.id, station_id: st.id, station_title: st.title, mode })
      .select("code").single();
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "Falha ao criar sala.");
    nav({ to: "/app/sala/$code", params: { code: data.code } });
  }

  async function joinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    const { data } = await supabase.from("training_rooms").select("code").eq("code", code).maybeSingle();
    if (!data) return toast.error("Sala não encontrada.");
    nav({ to: "/app/sala/$code", params: { code: data.code } });
  }

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
