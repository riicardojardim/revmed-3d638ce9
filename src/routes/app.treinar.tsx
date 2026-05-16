import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { STATIONS } from "@/data/stations";
import { Button } from "@/components/ui/button";
import { Users, Sparkles, ArrowRight, Hash } from "lucide-react";
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

function TrainPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [stationId, setStationId] = useState(STATIONS[0].id);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function createRoom() {
    if (!user) return toast.error("Faça login para criar uma sala.");
    const st = STATIONS.find((s) => s.id === stationId)!;
    setBusy(true);
    const code = genCode();
    const { data, error } = await supabase.from("training_rooms")
      .insert({ code, host_id: user.id, station_id: st.id, station_title: st.title })
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Modos de treino</h1>
        <p className="mt-1 text-muted-foreground">Escolha como quer treinar hoje.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/app/simulacao/$id" params={{ id: STATIONS[0].id }} className="group">
          <div className="h-full rounded-3xl border border-border bg-gradient-hero p-6 text-white shadow-elegant transition-all group-hover:-translate-y-1">
            <Sparkles className="h-7 w-7 text-mint" />
            <h3 className="mt-4 font-display text-xl font-bold">Treino individual</h3>
            <p className="mt-2 text-sm text-white/70">
              Inicie a estação recomendada agora e simule com cronômetro e checklist.
            </p>
            <div className="mt-6 inline-flex items-center gap-1 font-medium text-mint">
              Começar <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </Link>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <Users className="h-7 w-7 text-medical" />
          <h3 className="mt-4 font-display text-xl font-bold">Sala de treino em dupla</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie uma sala, escolha a estação e compartilhe o código com seu colega.
          </p>
          <select value={stationId} onChange={(e) => setStationId(e.target.value)}
            className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            {STATIONS.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <Button variant="hero" className="mt-3 w-full" disabled={busy} onClick={createRoom}>
            Criar sala
          </Button>
          <div className="mt-5 border-t border-border pt-4">
            <label className="text-xs text-muted-foreground">Entrar com código</label>
            <div className="mt-1 flex gap-2">
              <div className="relative flex-1">
                <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="EX: A2B4CD" maxLength={8}
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm font-mono tracking-widest" />
              </div>
              <Button variant="outline" onClick={joinRoom}>Entrar</Button>
            </div>
          </div>
        </div>
      </div>

      <div>
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
      </div>
    </div>
  );
}
