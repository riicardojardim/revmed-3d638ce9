import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Check, UserPlus, DoorOpen, Sparkles, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type NotificationRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [responding, setRespondingId] = useState<string | null>(null);
  const [responded, setResponded] = useState<Record<string, "accepted" | "declined">>({});

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      const rows = (data ?? []) as NotificationRow[];
      if (!mounted) return;
      setItems(rows);

      // Resolve status of any room invites already responded to
      const inviteIds = rows
        .filter((n) => n.type === "room_invite_received")
        .map((n) => n.payload?.invite_id as string | undefined)
        .filter((x): x is string => !!x);
      if (inviteIds.length > 0) {
        const { data: invs } = await supabase
          .from("room_invites")
          .select("id, status")
          .in("id", inviteIds);
        if (mounted && invs) {
          const map: Record<string, "accepted" | "declined"> = {};
          for (const n of rows) {
            const iid = n.payload?.invite_id as string | undefined;
            const inv = invs.find((x) => x.id === iid);
            if (inv && (inv.status === "accepted" || inv.status === "declined")) {
              map[n.id] = inv.status;
            }
          }
          setResponded((s) => ({ ...s, ...map }));
        }
      }
    })();

    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as NotificationRow;
          setItems((prev) => [row, ...prev].slice(0, 20));
          const name = (row.payload?.from_name as string) || "Alguém";
          if (row.type === "room_invite_accepted") {
            toast.success(`${name} aceitou seu convite e entrou na sala`);
          } else if (row.type === "room_invite_declined") {
            toast.info(`${name} recusou seu convite`);
          } else if (row.type === "room_invite_received") {
            toast(`${name} te convidou pra uma estação`);
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const unread = items.filter((n) => !n.read_at).length;

  async function markAllRead() {
    if (!user || unread === 0) return;
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n)));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
  }

  function iconFor(type: string) {
    if (type === "friend_request_received") return UserPlus;
    if (type === "friend_request_accepted") return Check;
    if (type === "room_invite_received") return DoorOpen;
    if (type === "room_invite_accepted") return Check;
    if (type === "room_invite_declined") return X;
    return Sparkles;
  }

  function labelFor(n: NotificationRow): { title: string; href?: string } {
    const p = n.payload ?? {};
    const name = (p.from_name as string) || (p.name as string) || "Alguém";
    if (n.type === "room_invite_received") {
      const spec = p.specialty as string | undefined;
      return { title: `${name} te convidou pra uma estação${spec ? ` de ${spec}` : ""}` };
    }
    if (n.type === "room_invite_accepted") {
      return { title: `${name} aceitou seu convite e entrou na sala` };
    }
    if (n.type === "room_invite_declined") {
      return { title: `${name} recusou seu convite` };
    }
    return { title: n.type };
  }

  async function respondInvite(n: NotificationRow, accept: boolean) {
    const inviteId = n.payload?.invite_id as string | undefined;
    if (!inviteId) return;
    setRespondingId(n.id);
    try {
      const { data, error } = await supabase.rpc("respond_room_invite", {
        _invite_id: inviteId,
        _accept: accept,
      });
      if (error) throw error;
      setResponded((s) => ({ ...s, [n.id]: accept ? "accepted" : "declined" }));
      if (accept) {
        const code = (data?.[0] as { room_code?: string } | undefined)?.room_code
          ?? (n.payload?.room_code as string | undefined);
        toast.success("Convite aceito! Entrando na sala…");
        setOpen(false);
        if (code) nav({ to: "/app/entrar/$code", params: { code } });
      } else {
        toast.info("Convite recusado.");
      }
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg.includes("not pending") ? "Convite já respondido." : "Não foi possível responder ao convite.");
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={(v) => { setOpen(v); if (v) void markAllRead(); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificações" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-mint px-1 text-[10px] font-bold text-night">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-semibold">Notificações</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              Sem notificações por enquanto.
            </div>
          ) : (
            items.map((n) => {
              const Icon = iconFor(n.type);
              const { title, href } = labelFor(n);
              const isRoomInvite = n.type === "room_invite_received";
              const localState = responded[n.id];
              const inviteResolved = isRoomInvite && !!localState;

              const body = (
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-foreground">{title}</div>
                  <div className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</div>
                  {isRoomInvite && !inviteResolved && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="hero"
                        className="h-7 px-3 text-xs"
                        disabled={responding === n.id}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); void respondInvite(n, true); }}
                      >
                        <Check className="h-3 w-3" /> Aceitar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 text-xs"
                        disabled={responding === n.id}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); void respondInvite(n, false); }}
                      >
                        <X className="h-3 w-3" /> Recusar
                      </Button>
                    </div>
                  )}
                  {inviteResolved && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {localState === "accepted" ? "Convite aceito" : "Convite recusado"}
                    </div>
                  )}
                </div>
              );

              const content = (
                <div
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 text-sm",
                    !isRoomInvite && href && "hover:bg-muted/50 cursor-pointer",
                    !n.read_at && "bg-mint/5",
                  )}
                >
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mint/15 text-mint">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {body}
                </div>
              );

              if (href && !isRoomInvite) {
                return (
                  <Link key={n.id} to={href} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                );
              }
              return <div key={n.id}>{content}</div>;
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
