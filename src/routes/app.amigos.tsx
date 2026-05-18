import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { Search, UserPlus, Users, Check, X, DoorOpen, Inbox, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { InviteFriendToRoomDialog } from "@/components/InviteFriendToRoomDialog";

export const Route = createFileRoute("/app/amigos")({
  component: AmigosPage,
  head: () => ({ meta: [{ title: "Amigos — Estação Revalida" }] }),
});

type Friend = { id: string; full_name: string | null; username: string | null; avatar_url: string | null };
type Request = {
  id: string;
  from_user: string;
  to_user: string;
  status: string;
  created_at: string;
  profile?: Friend;
};

function AmigosPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [received, setReceived] = useState<Request[]>([]);
  const [sent, setSent] = useState<Request[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Friend[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  async function loadAll() {
    if (!user) return;
    // Friendships
    const { data: fs } = await supabase
      .from("friendships")
      .select("user_a, user_b")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
    const friendIds = (fs ?? []).map((f) => (f.user_a === user.id ? f.user_b : f.user_a));
    if (friendIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", friendIds);
      setFriends((profs ?? []) as Friend[]);
    } else setFriends([]);

    // Requests
    const { data: reqs } = await supabase
      .from("friend_requests")
      .select("id, from_user, to_user, status, created_at")
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    const list = (reqs ?? []) as Request[];
    const otherIds = Array.from(new Set(list.map((r) => (r.from_user === user.id ? r.to_user : r.from_user))));
    let profMap: Record<string, Friend> = {};
    if (otherIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", otherIds);
      (profs ?? []).forEach((p) => { profMap[p.id] = p as Friend; });
    }
    setReceived(list.filter((r) => r.to_user === user.id).map((r) => ({ ...r, profile: profMap[r.from_user] })));
    setSent(list.filter((r) => r.from_user === user.id).map((r) => ({ ...r, profile: profMap[r.to_user] })));
  }

  useEffect(() => { void loadAll(); }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`amigos-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // Search
  useEffect(() => {
    if (!user || !search.trim()) { setResults([]); return; }
    const q = search.trim();
    const handle = setTimeout(async () => {
      setSearching(true);
      const friendIds = new Set(friends.map((f) => f.id));
      friendIds.add(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(20);
      setResults(((data ?? []) as Friend[]).filter((p) => !friendIds.has(p.id)));
      setSearching(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [search, user?.id, friends]);

  const sentTo = useMemo(() => new Set(sent.map((r) => r.to_user)), [sent]);

  async function sendRequest(toUserId: string) {
    if (!user) return;
    const { error } = await supabase.rpc("send_friend_request", { _to_user: toUserId });
    if (error) { toast.error(error.message); return; }
    toast.success("Pedido enviado!");
    void loadAll();
  }

  async function acceptRequest(reqId: string) {
    const { error } = await supabase.rpc("accept_friend_request", { _request_id: reqId });
    if (error) { toast.error(error.message); return; }
    toast.success("Vocês agora são amigos!");
    void loadAll();
  }

  async function declineRequest(reqId: string) {
    await supabase.from("friend_requests").update({ status: "declined", responded_at: new Date().toISOString() }).eq("id", reqId);
    void loadAll();
  }

  async function cancelRequest(reqId: string) {
    await supabase.from("friend_requests").update({ status: "cancelled", responded_at: new Date().toISOString() }).eq("id", reqId);
    void loadAll();
  }

  async function removeFriend(otherId: string) {
    if (!user) return;
    if (!confirm("Remover este amigo?")) return;
    const a = user.id < otherId ? user.id : otherId;
    const b = user.id < otherId ? otherId : user.id;
    await supabase.from("friendships").delete().eq("user_a", a).eq("user_b", b);
    void loadAll();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Amigos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Adicione amigos para convidá-los a treinar estações com você.
        </p>
      </div>

      <Tabs defaultValue="friends">
        <TabsList>
          <TabsTrigger value="friends">
            <Users className="mr-1.5 h-3.5 w-3.5" /> Meus amigos
            <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px]">{friends.length}</span>
          </TabsTrigger>
          <TabsTrigger value="requests">
            <Inbox className="mr-1.5 h-3.5 w-3.5" /> Solicitações
            {received.length > 0 && (
              <span className="ml-1.5 rounded-full bg-mint px-1.5 text-[10px] text-night">{received.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="mr-1.5 h-3.5 w-3.5" /> Buscar
          </TabsTrigger>
        </TabsList>

        {/* MY FRIENDS */}
        <TabsContent value="friends" className="mt-4 space-y-2">
          {friends.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Você ainda não tem amigos. Use a aba <strong>Buscar</strong>.
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {friends.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <UserAvatar avatarUrl={f.avatar_url} name={f.full_name ?? f.username ?? "?"} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{f.full_name ?? "—"}</div>
                    {f.username && <div className="truncate text-xs text-muted-foreground">@{f.username}</div>}
                  </div>
                  <Button size="sm" variant="hero" onClick={() => setInviteOpen(true)}>
                    <DoorOpen className="h-3.5 w-3.5" /> Convidar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeFriend(f.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* REQUESTS */}
        <TabsContent value="requests" className="mt-4 space-y-4">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recebidas</h3>
            {received.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Sem pedidos pendentes.
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                {received.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <UserAvatar avatarUrl={r.profile?.avatar_url ?? null} name={r.profile?.full_name ?? "?"} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.profile?.full_name ?? "—"}</div>
                      {r.profile?.username && <div className="truncate text-xs text-muted-foreground">@{r.profile.username}</div>}
                    </div>
                    <Button size="sm" variant="hero" onClick={() => acceptRequest(r.id)}>
                      <Check className="h-3.5 w-3.5" /> Aceitar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => declineRequest(r.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enviadas</h3>
            {sent.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Nenhuma enviada.
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                {sent.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <UserAvatar avatarUrl={r.profile?.avatar_url ?? null} name={r.profile?.full_name ?? "?"} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.profile?.full_name ?? "—"}</div>
                      {r.profile?.username && <div className="truncate text-xs text-muted-foreground">@{r.profile.username}</div>}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">pendente</span>
                    <Button size="sm" variant="ghost" onClick={() => cancelRequest(r.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>

        {/* SEARCH */}
        <TabsContent value="search" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou @username"
              className="pl-9"
            />
          </div>
          {!search.trim() ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Digite o nome ou @username de quem você quer adicionar.
            </div>
          ) : searching ? (
            <div className="text-xs text-muted-foreground">Buscando...</div>
          ) : results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Nenhum usuário encontrado para "{search}".
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {results.map((p) => {
                const already = sentTo.has(p.id);
                return (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <UserAvatar avatarUrl={p.avatar_url} name={p.full_name ?? p.username ?? "?"} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.full_name ?? "—"}</div>
                      {p.username && <div className="truncate text-xs text-muted-foreground">@{p.username}</div>}
                    </div>
                    <Button size="sm" variant={already ? "outline" : "hero"} disabled={already} onClick={() => sendRequest(p.id)}>
                      {already ? <><Send className="h-3.5 w-3.5" /> Enviado</> : <><UserPlus className="h-3.5 w-3.5" /> Adicionar</>}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <InviteFriendToRoomDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
