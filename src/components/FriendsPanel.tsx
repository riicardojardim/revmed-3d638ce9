import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, MessageCircle, Send, UserPlus, Users, X, Video } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/components/UserAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useOnlinePresence } from "@/hooks/use-online-presence";
import { cn } from "@/lib/utils";

type Buddy = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  shared_rooms: number;
  last_shared_at: string | null;
  is_friend: boolean;
  request_status: string | null;
  request_id: string | null;
  request_from: string | null;
  unread_count: number;
};

type Friend = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  friended_at: string;
  unread_count: number;
  last_message_at: string | null;
};

type PendingReq = {
  request_id: string;
  from_user: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
};

type Message = {
  id: string;
  from_user: string;
  to_user: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

type ChatTarget = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function FriendsPanel() {
  const { user } = useAuth();
  const online = useOnlinePresence();
  const [open, setOpen] = useState(false);
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pending, setPending] = useState<PendingReq[]>([]);
  const [chat, setChat] = useState<ChatTarget | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);

  const reload = useCallback(async () => {
    if (!user) return;
    const [b, f, p] = await Promise.all([
      supabase.rpc("list_station_buddies"),
      supabase.rpc("list_my_friends"),
      supabase.rpc("list_pending_friend_requests"),
    ]);
    if (!b.error) setBuddies((b.data as Buddy[]) ?? []);
    if (!f.error) setFriends((f.data as Friend[]) ?? []);
    if (!p.error) setPending((p.data as PendingReq[]) ?? []);
  }, [user]);

  // Lightweight unread poll so the badge updates even when sheet is closed
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("to_user", user.id)
        .is("read_at", null);
      if (mounted) setTotalUnread(count ?? 0);
    };
    fetchUnread();
    const ch = supabase
      .channel("dm-unread:" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages", filter: `to_user=eq.${user.id}` },
        () => fetchUnread(),
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [user]);

  useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  async function addFriend(targetId: string) {
    const { error } = await supabase.rpc("send_friend_request", { _to_user: targetId });
    if (error) toast.error(error.message);
    else {
      toast.success("Pedido enviado");
      reload();
    }
  }

  async function acceptRequest(requestId: string) {
    const { error } = await supabase.rpc("accept_friend_request", { _request_id: requestId });
    if (error) toast.error(error.message);
    else {
      toast.success("Amizade aceita");
      reload();
    }
  }

  async function declineRequest(requestId: string) {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", requestId);
    if (error) toast.error(error.message);
    else reload();
  }

  const headerName = (n: string | null, u: string | null) => n || u || "Usuário";

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setChat(null); }}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 hover:bg-muted/60 hover:text-foreground"
          aria-label="Amigos"
        >
          <Users className="h-5 w-5" />
          {totalUnread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-mint px-1 text-[10px] font-bold text-night ring-2 ring-background">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {chat ? (
          <ChatView
            target={chat}
            onBack={() => { setChat(null); reload(); }}
            meId={user?.id ?? ""}
            online={online}
          />
        ) : (
          <>
            <SheetHeader className="border-b border-border px-4 py-3">
              <SheetTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-mint" /> Amigos
              </SheetTitle>
            </SheetHeader>
            <Tabs defaultValue="station" className="flex min-h-0 flex-1 flex-col">
              <TabsList className="mx-3 mt-3 grid grid-cols-3">
                <TabsTrigger value="station">Da estação</TabsTrigger>
                <TabsTrigger value="friends">
                  Amigos {friends.length ? `(${friends.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pedidos {pending.length ? `(${pending.length})` : ""}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="station" className="m-0 min-h-0 flex-1">
                <ScrollArea className="h-full">
                  <div className="space-y-1 p-3">
                    {buddies.length === 0 && (
                      <EmptyState text="Quando você participar de uma estação, as pessoas aparecem aqui." />
                    )}
                    {buddies.map((b) => (
                      <Row
                        key={b.id}
                        userId={b.id}
                        name={headerName(b.full_name, b.username)}
                        avatarUrl={b.avatar_url}
                        online={online.has(b.id)}
                        subtitle={`${b.shared_rooms} sala${b.shared_rooms > 1 ? "s" : ""} • ${timeAgo(b.last_shared_at)}`}
                        unread={b.unread_count}
                        onChat={() => setChat({ id: b.id, name: headerName(b.full_name, b.username), avatar_url: b.avatar_url })}
                        action={
                          b.is_friend ? (
                            <span className="rounded-full bg-mint/10 px-2 py-0.5 text-[10px] font-semibold text-mint">Amigo</span>
                          ) : b.request_status === "pending" && b.request_from === b.id ? (
                            <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => acceptRequest(b.request_id!)}>
                              <Check className="mr-1 h-3 w-3" /> Aceitar
                            </Button>
                          ) : b.request_status === "pending" ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Pendente</span>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => addFriend(b.id)}>
                              <UserPlus className="mr-1 h-3 w-3" /> Adicionar
                            </Button>
                          )
                        }
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="friends" className="m-0 min-h-0 flex-1">
                <ScrollArea className="h-full">
                  <div className="space-y-1 p-3">
                    {friends.length === 0 && (
                      <EmptyState text="Você ainda não tem amigos confirmados." />
                    )}
                    {friends.map((f) => (
                      <Row
                        key={f.id}
                        userId={f.id}
                        name={headerName(f.full_name, f.username)}
                        avatarUrl={f.avatar_url}
                        online={online.has(f.id)}
                        subtitle={f.last_message_at ? `Última msg: ${timeAgo(f.last_message_at)}` : "Comece uma conversa"}
                        unread={f.unread_count}
                        onChat={() => setChat({ id: f.id, name: headerName(f.full_name, f.username), avatar_url: f.avatar_url })}
                        action={
                          <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => setChat({ id: f.id, name: headerName(f.full_name, f.username), avatar_url: f.avatar_url })}>
                            <MessageCircle className="mr-1 h-3 w-3" /> Conversar
                          </Button>
                        }
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="pending" className="m-0 min-h-0 flex-1">
                <ScrollArea className="h-full">
                  <div className="space-y-1 p-3">
                    {pending.length === 0 && (
                      <EmptyState text="Sem pedidos pendentes." />
                    )}
                    {pending.map((p) => (
                      <Row
                        key={p.request_id}
                        userId={p.from_user}
                        name={headerName(p.full_name, p.username)}
                        avatarUrl={p.avatar_url}
                        online={online.has(p.from_user)}
                        subtitle={`Pedido há ${timeAgo(p.created_at)}`}
                        action={
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 px-2 text-xs" onClick={() => acceptRequest(p.request_id)}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => declineRequest(p.request_id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        }
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}

function Row({
  userId,
  name,
  avatarUrl,
  online,
  subtitle,
  action,
  unread,
  onChat,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
  online: boolean;
  subtitle: string;
  action: React.ReactNode;
  unread?: number;
  onChat?: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40">
      <button type="button" onClick={onChat} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <UserAvatar avatarUrl={avatarUrl} name={name} size="md" online={online} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{name}</span>
            {unread !== undefined && unread > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-mint px-1 text-[10px] font-bold text-night">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </button>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function ChatView({
  target,
  onBack,
  meId,
  online,
}: {
  target: ChatTarget;
  onBack: () => void;
  meId: string;
  online: Set<string>;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  // Load thread + mark as read
  useEffect(() => {
    if (!meId) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(from_user.eq.${meId},to_user.eq.${target.id}),and(from_user.eq.${target.id},to_user.eq.${meId})`,
        )
        .order("created_at", { ascending: true })
        .limit(200);
      if (!mounted) return;
      setMessages((data ?? []) as Message[]);
      scrollToBottom();
      await supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("from_user", target.id)
        .eq("to_user", meId)
        .is("read_at", null);
    })();
    return () => { mounted = false; };
  }, [meId, target.id, scrollToBottom]);

  // Realtime subscribe
  useEffect(() => {
    if (!meId) return;
    const ch = supabase
      .channel(`dm:${[meId, target.id].sort().join(":")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as Message;
          const isThisThread =
            (m.from_user === meId && m.to_user === target.id) ||
            (m.from_user === target.id && m.to_user === meId);
          if (!isThisThread) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          scrollToBottom();
          if (m.to_user === meId) {
            supabase
              .from("direct_messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", m.id);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [meId, target.id, scrollToBottom]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      from_user: meId,
      to_user: target.id,
      body,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    scrollToBottom();
    const { data, error } = await supabase
      .from("direct_messages")
      .insert({ from_user: meId, to_user: target.id, body })
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } else if (data) {
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? (data as Message) : m)));
    }
    setSending(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <UserAvatar avatarUrl={target.avatar_url} name={target.name} size="md" online={online.has(target.id)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{target.name}</p>
          <p className="text-[11px] text-muted-foreground">{online.has(target.id) ? "Online agora" : "Offline"}</p>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-xs text-muted-foreground">Nenhuma mensagem ainda. Diga oi!</p>
        )}
        {messages.map((m) => {
          const mine = m.from_user === meId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-1.5 text-sm shadow-sm",
                  mine
                    ? "rounded-br-sm bg-mint text-night"
                    : "rounded-bl-sm bg-muted text-foreground",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cn("mt-0.5 text-right text-[10px]", mine ? "text-night/60" : "text-muted-foreground")}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="flex items-center gap-2 border-t border-border bg-background/60 px-3 py-2"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mensagem..."
          className="h-9"
          maxLength={4000}
        />
        <Button type="submit" size="icon" className="h-9 w-9" disabled={!text.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
