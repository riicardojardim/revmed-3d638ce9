import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Users2, MessagesSquare, ArrowUpRight, Heart, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useOnlinePresence } from "@/hooks/use-online-presence";
import { UserAvatar } from "@/components/UserAvatar";

type Friend = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type PostAuthor = { id: string; full_name: string | null; username: string | null; avatar_url: string | null };
type Post = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author?: PostAuthor | null;
  likes: number;
  comments: number;
};

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function OnlineFriendsCard() {
  const { user } = useAuth();
  const online = useOnlinePresence();
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("list_my_friends").then(({ data }) => {
      setFriends((data as Friend[] | null) ?? []);
    });
  }, [user]);

  const onlineFriends = friends.filter((f) => online.has(f.id)).slice(0, 8);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users2 className="h-4 w-4 text-medical" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wide">Amigos online</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {onlineFriends.length}
          </span>
        </div>
      </header>

      {onlineFriends.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum amigo online no momento. Adicione amigos no painel lateral.
        </p>
      ) : (
        <ul className="space-y-2">
          {onlineFriends.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted/50">
              <div className="relative">
                <UserAvatar name={f.full_name ?? f.username ?? "?"} src={f.avatar_url} size="md" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{f.full_name ?? f.username ?? "Sem nome"}</div>
                <div className="text-[11px] text-success">online agora</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CommunityFeedCard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rawPosts } = await supabase
        .from("community_posts")
        .select("id, content, created_at, author_id")
        .order("created_at", { ascending: false })
        .limit(4);
      const list = (rawPosts ?? []) as Pick<Post, "id" | "content" | "created_at" | "author_id">[];
      if (list.length === 0) {
        if (!cancelled) { setPosts([]); setLoading(false); }
        return;
      }
      const ids = list.map((p) => p.id);
      const authorIds = Array.from(new Set(list.map((p) => p.author_id)));
      const [{ data: authors }, { data: likes }, { data: comments }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", authorIds),
        supabase.from("community_post_likes").select("post_id").in("post_id", ids),
        supabase.from("community_post_comments").select("post_id").in("post_id", ids),
      ]);
      const authorMap = new Map<string, PostAuthor>(((authors ?? []) as PostAuthor[]).map((a) => [a.id, a]));
      const likeCount = new Map<string, number>();
      ((likes ?? []) as { post_id: string }[]).forEach((r) => likeCount.set(r.post_id, (likeCount.get(r.post_id) ?? 0) + 1));
      const commentCount = new Map<string, number>();
      ((comments ?? []) as { post_id: string }[]).forEach((r) => commentCount.set(r.post_id, (commentCount.get(r.post_id) ?? 0) + 1));
      if (!cancelled) {
        setPosts(list.map((p) => ({
          ...p,
          author: authorMap.get(p.author_id) ?? null,
          likes: likeCount.get(p.id) ?? 0,
          comments: commentCount.get(p.id) ?? 0,
        })));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-medical" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wide">Da comunidade</h3>
        </div>
        <Link to="/app/comunidade" className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
          Ver tudo <ArrowUpRight className="h-3 w-3" />
        </Link>
      </header>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : posts.length === 0 ? (
        <p className="text-xs text-muted-foreground">Ainda não há posts. Seja o primeiro!</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Link to="/app/comunidade" className="block rounded-lg p-2 transition-colors hover:bg-muted/50">
                <div className="flex items-start gap-2.5">
                    <UserAvatar name={p.author?.full_name ?? p.author?.username ?? "?"} src={p.author?.avatar_url ?? null} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="truncate text-xs font-semibold">
                        {p.author?.full_name ?? p.author?.username ?? "Alguém"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">· {timeAgo(p.created_at)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.content}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{p.likes}</span>
                      <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{p.comments}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}