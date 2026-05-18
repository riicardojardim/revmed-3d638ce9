import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, UserPlus, DoorOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

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
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);

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
      if (mounted) setItems((data ?? []) as NotificationRow[]);
    })();

    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setItems((prev) => [payload.new as NotificationRow, ...prev].slice(0, 20));
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
    return Sparkles;
  }

  function labelFor(n: NotificationRow): { title: string; href?: string } {
    const p = n.payload ?? {};
    const name = (p.from_name as string) || (p.name as string) || "Alguém";
    if (n.type === "room_invite_received") {
      const code = p.room_code as string | undefined;
      const spec = p.specialty as string | undefined;
      return {
        title: `${name} te convidou pra uma estação${spec ? ` de ${spec}` : ""}`,
        href: code ? `/app/entrar/${code}` : undefined,
      };
    }
    return { title: n.type };
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
      <DropdownMenuContent align="end" className="w-80 p-0">
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
              const content = (
                <div
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 cursor-pointer",
                    !n.read_at && "bg-mint/5",
                  )}
                >
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mint/15 text-mint">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-foreground">{title}</div>
                    <div className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              );
              return href ? (
                <Link key={n.id} to={href} onClick={() => setOpen(false)}>
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
