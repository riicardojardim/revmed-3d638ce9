import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { Search, Send, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOnlinePresence } from "@/hooks/use-online-presence";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type UserResult = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  email: string | null;
  allows_candidato: boolean | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  stationId: string;
};

export function InviteUserDialog({ open, onOpenChange, roomId, stationId }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const online = useOnlinePresence();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
      setInvitedIds(new Set());
    }
  }, [open]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("search_users_for_invite", { _q: term });
      setLoading(false);
      if (error) {
        console.error(error);
        return;
      }
      setResults((data ?? []) as UserResult[]);
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  async function invite(u: UserResult) {
    setSendingId(u.id);
    try {
      const { error } = await supabase.rpc("send_room_invite", {
        _to_user: u.id,
        _room_id: roomId,
        _station_id: stationId,
      });
      if (error) throw error;
      setInvitedIds((s) => new Set(s).add(u.id));
      toast.success(`Convite enviado para ${u.full_name ?? u.username ?? "usuário"}`);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível enviar o convite.");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Convidar amigo</DialogTitle>
          <DialogDescription>
            Busque por nome, @usuário ou e-mail. A bolinha verde indica que está online.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome, @usuario ou e-mail..."
            className="pl-9"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card">
          {results.map((u) => {
            const isOnline = online.has(u.id);
            const invited = invitedIds.has(u.id);
            return (
              <li key={u.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="relative">
                  <UserAvatar avatarUrl={u.avatar_url} name={u.full_name ?? u.username ?? "?"} size="sm" />
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
                      isOnline ? "bg-emerald-500" : "bg-muted-foreground/40",
                    )}
                    title={isOnline ? "Online" : "Offline"}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{u.full_name ?? "—"}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {u.username ? `@${u.username}` : u.email ?? ""}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={invited ? "outline" : "hero"}
                  disabled={invited || sendingId === u.id}
                  onClick={() => invite(u)}
                >
                  {sendingId === u.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : invited ? (
                    "Convidado"
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" /> Convidar
                    </>
                  )}
                </Button>
              </li>
            );
          })}
          {!loading && q.trim().length >= 2 && results.length === 0 && (
            <li className="px-3 py-10 text-center text-xs text-muted-foreground">
              Nenhum usuário encontrado.
            </li>
          )}
          {q.trim().length < 2 && (
            <li className="px-3 py-10 text-center text-xs text-muted-foreground">
              Digite pelo menos 2 caracteres.
            </li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
