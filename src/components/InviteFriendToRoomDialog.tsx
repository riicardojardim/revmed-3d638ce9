import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { ArrowRight, Search, Users, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SPECIALTIES, type Specialty } from "@/data/stations";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Friend = { id: string; full_name: string | null; username: string | null; avatar_url: string | null };
type StationLite = { id: string; title: string; specialty: Specialty };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected checklist (skips step 1) */
  preselectedStation?: StationLite | null;
};

export function InviteFriendToRoomDialog({ open, onOpenChange, preselectedStation }: Props) {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<"station" | "friend">(preselectedStation ? "friend" : "station");
  const [station, setStation] = useState<StationLite | null>(preselectedStation ?? null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [stations, setStations] = useState<StationLite[]>([]);
  const [stationSearch, setStationSearch] = useState("");
  const [spec, setSpec] = useState<Specialty | "Todas">("Todas");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(preselectedStation ? "friend" : "station");
    setStation(preselectedStation ?? null);
    setFriendSearch("");
    setStationSearch("");
    setSpec("Todas");
  }, [open, preselectedStation]);

  // Load friends
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data: fs } = await supabase
        .from("friendships")
        .select("user_a, user_b")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
      const ids = (fs ?? []).map((f) => (f.user_a === user.id ? f.user_b : f.user_a));
      if (ids.length === 0) { setFriends([]); return; }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", ids);
      setFriends((profs ?? []) as Friend[]);
    })();
  }, [open, user?.id]);

  // Load stations when needed
  useEffect(() => {
    if (!open || preselectedStation) return;
    (async () => {
      const { data } = await supabase
        .from("custom_stations")
        .select("id, title, specialty")
        .eq("published", true)
        .order("updated_at", { ascending: false });
      setStations((data ?? []) as StationLite[]);
    })();
  }, [open, preselectedStation]);

  const filteredStations = useMemo(() => {
    return stations.filter(
      (s) =>
        (spec === "Todas" || s.specialty === spec) &&
        s.title.toLowerCase().includes(stationSearch.toLowerCase()),
    );
  }, [stations, spec, stationSearch]);

  const filteredFriends = useMemo(() => {
    const q = friendSearch.toLowerCase();
    return friends.filter(
      (f) =>
        (f.full_name ?? "").toLowerCase().includes(q) ||
        (f.username ?? "").toLowerCase().includes(q),
    );
  }, [friends, friendSearch]);

  async function sendInvite(friend: Friend) {
    if (!user || !station) return;
    setSubmitting(true);
    try {
      // 1. Cria a sala como ator (host)
      const code = Array.from({ length: 6 }, () =>
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(Math.floor(Math.random() * 32)),
      ).join("");
      const { data: room, error: roomErr } = await supabase
        .from("training_rooms")
        .insert({
          code,
          host_id: user.id,
          station_id: station.id,
          station_title: station.title,
          mode: "dupla",
          status: "waiting",
        })
        .select("id, code")
        .single();
      if (roomErr || !room) throw roomErr ?? new Error("Falha ao criar sala");

      // 2. Host entra como "paciente" (ator)
      await supabase.from("training_room_participants").insert({
        room_id: room.id,
        user_id: user.id,
        role: "paciente",
        display_name: profile?.full_name ?? null,
      });

      // 3. Envia convite (RPC valida amizade + host)
      const { error: invErr } = await supabase.rpc("send_room_invite", {
        _to_user: friend.id,
        _room_id: room.id,
        _station_id: station.id,
      });
      if (invErr) throw invErr;

      toast.success(`Convite enviado para ${friend.full_name ?? friend.username}`);
      onOpenChange(false);
      // Leva o host pra sala (ele entra como ator)
      nav({ to: "/app/sala/$code", params: { code: room.code } });
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível enviar o convite.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-mint" />
            Convidar amigo pra estação
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => !preselectedStation && setStep("station")}
            className={cn(
              "rounded-full px-2.5 py-1 font-medium",
              step === "station" ? "bg-mint text-night" : "bg-muted text-muted-foreground",
            )}
          >
            1. Checklist
          </button>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <button
            type="button"
            onClick={() => station && setStep("friend")}
            className={cn(
              "rounded-full px-2.5 py-1 font-medium",
              step === "friend" ? "bg-mint text-night" : "bg-muted text-muted-foreground",
            )}
          >
            2. Amigo
          </button>
        </div>

        {step === "station" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={stationSearch}
                onChange={(e) => setStationSearch(e.target.value)}
                placeholder="Buscar checklist..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSpec("Todas")}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium",
                  spec === "Todas"
                    ? "border-mint bg-mint/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-mint/40",
                )}
              >
                Todas
              </button>
              {SPECIALTIES.map((s) => {
                const m = getSpecialtyMeta(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpec(s)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                      spec === s
                        ? "border-foreground/20 bg-card text-foreground shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-mint/40",
                    )}
                  >
                    <span className={cn("inline-block h-1.5 w-1.5 rounded-full", m.solid)} />
                    {s}
                  </button>
                );
              })}
            </div>
            <ul className="max-h-[40vh] divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card">
              {filteredStations.map((s) => {
                const m = getSpecialtyMeta(s.specialty);
                return (
                  <li key={s.id} className="flex min-w-0 items-center gap-3 px-3 py-2.5">
                    <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 font-mono text-[10px] font-bold", m.badge)}>{m.code}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{s.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{s.specialty}</div>
                    </div>
                    <Button size="sm" variant="hero" onClick={() => { setStation(s); setStep("friend"); }}>
                      Escolher
                    </Button>
                  </li>
                );
              })}
              {filteredStations.length === 0 && (
                <li className="px-3 py-10 text-center text-xs text-muted-foreground">Nenhum checklist encontrado.</li>
              )}
            </ul>
          </div>
        )}

        {step === "friend" && station && (
          <div className="space-y-3">
            <div className="rounded-xl border border-mint/30 bg-mint/5 px-3 py-2 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5 text-mint" />
                Checklist: <strong className="text-foreground">{station.title}</strong>
              </span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                placeholder="Buscar amigo..."
                className="pl-9"
              />
            </div>
            <ul className="max-h-[40vh] divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card">
              {filteredFriends.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-3 py-2.5">
                  <UserAvatar avatarUrl={f.avatar_url} name={f.full_name ?? f.username ?? "?"} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{f.full_name ?? "—"}</div>
                    {f.username && <div className="truncate text-xs text-muted-foreground">@{f.username}</div>}
                  </div>
                  <Button size="sm" variant="hero" disabled={submitting} onClick={() => sendInvite(f)}>
                    Convidar <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
              {filteredFriends.length === 0 && (
                <li className="px-3 py-10 text-center text-xs text-muted-foreground">
                  Você ainda não tem amigos. <a href="/app/amigos" className="text-mint hover:underline">Adicionar agora</a>
                </li>
              )}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
