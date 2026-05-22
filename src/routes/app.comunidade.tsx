import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Send, Trash2, Users2, Image as ImageIcon, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { listContainer, listItem } from "@/components/motion/MotionPrimitives";
import { STAGGER } from "@/lib/stagger";

export const Route = createFileRoute("/app/comunidade")({
  component: ComunidadePage,
});

type Profile = { id: string; full_name: string | null; username: string | null; avatar_url: string | null };
type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: Profile;
};
type Post = {
  id: string;
  author_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author?: Profile;
  likes_count: number;
  liked_by_me: boolean;
  comments_count: number;
  comments?: Comment[];
};

function ComunidadePage() {
  const { user, profile } = useAuth();
  // Cache em memória entre navegações para feed aparecer instantâneo ao voltar.
  const [posts, setPosts] = useState<Post[]>(() => feedCache.posts);
  const [loading, setLoading] = useState(() => feedCache.posts.length === 0);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImage, setShowImage] = useState(false);
  const [posting, setPosting] = useState(false);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    // Só mostra "Carregando…" no primeiro fetch — refetches são silenciosos.
    setLoading((prev) => (posts.length === 0 ? true : prev));
    const { data: rawPosts, error } = await supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      toast.error("Erro ao carregar posts");
      setLoading(false);
      return;
    }
    const list = rawPosts ?? [];
    const authorIds = Array.from(new Set(list.map((p) => p.author_id)));
    const postIds = list.map((p) => p.id);

    const [profilesRes, likesRes, commentsCountRes] = await Promise.all([
      authorIds.length
        ? supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", authorIds)
        : Promise.resolve({ data: [] as Profile[], error: null }),
      postIds.length
        ? supabase.from("community_post_likes").select("post_id, user_id").in("post_id", postIds)
        : Promise.resolve({ data: [] as { post_id: string; user_id: string }[], error: null }),
      postIds.length
        ? supabase.from("community_post_comments").select("post_id").in("post_id", postIds)
        : Promise.resolve({ data: [] as { post_id: string }[], error: null }),
    ]);

    const profileMap = new Map<string, Profile>(
      (profilesRes.data ?? []).map((p: any) => [p.id, p as Profile]),
    );
    const likesByPost = new Map<string, { count: number; liked: boolean }>();
    (likesRes.data ?? []).forEach((l: any) => {
      const cur = likesByPost.get(l.post_id) ?? { count: 0, liked: false };
      cur.count += 1;
      if (l.user_id === user.id) cur.liked = true;
      likesByPost.set(l.post_id, cur);
    });
    const commentsByPost = new Map<string, number>();
    (commentsCountRes.data ?? []).forEach((c: any) => {
      commentsByPost.set(c.post_id, (commentsByPost.get(c.post_id) ?? 0) + 1);
    });

    const next = list.map((p: any) => ({
      ...p,
      author: profileMap.get(p.author_id),
      likes_count: likesByPost.get(p.id)?.count ?? 0,
      liked_by_me: likesByPost.get(p.id)?.liked ?? false,
      comments_count: commentsByPost.get(p.id) ?? 0,
    })) as Post[];
    feedCache.posts = next;
    setPosts(next);
    setLoading(false);
  }, [user, posts.length]);

  // Debounce de reloads disparados por realtime — evita refetch em rajada.
  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => {
      reloadTimer.current = null;
      load();
    }, 600);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("community-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_post_likes" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_post_comments" }, scheduleReload)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, [scheduleReload]);

  async function createPost() {
    if (!user) return;
    const text = content.trim();
    if (!text) return;
    if (text.length > 2000) {
      toast.error("Máximo 2000 caracteres");
      return;
    }
    setPosting(true);
    const { error } = await supabase.from("community_posts").insert({
      author_id: user.id,
      content: text,
      image_url: showImage && imageUrl.trim() ? imageUrl.trim() : null,
    });
    setPosting(false);
    if (error) {
      toast.error("Não foi possível publicar");
      return;
    }
    setContent("");
    setImageUrl("");
    setShowImage(false);
    toast.success("Publicado!");
  }

  async function toggleLike(post: Post) {
    if (!user) return;
    // optimistic
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.likes_count + (p.liked_by_me ? -1 : 1) }
          : p,
      ),
    );
    if (post.liked_by_me) {
      await supabase.from("community_post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("community_post_likes").insert({ post_id: post.id, user_id: user.id });
    }
  }

  async function deletePost(post: Post) {
    if (!confirm("Apagar este post?")) return;
    const { error } = await supabase.from("community_posts").delete().eq("id", post.id);
    if (error) toast.error("Erro ao apagar");
    else setPosts((prev) => prev.filter((p) => p.id !== post.id));
  }

  const me = useMemo(
    () => ({
      name: profile?.full_name ?? user?.email ?? "Você",
      avatar: profile?.avatar_url ?? null,
    }),
    [profile, user],
  );

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 py-2">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-mint/15 p-2 text-mint">
          <Users2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Comunidade</h1>
          <p className="text-sm text-muted-foreground">Compartilhe, comente e troque ideias com a galera.</p>
        </div>
      </div>

      {/* Composer */}
      <Card className="p-4">
        <div className="flex gap-3">
          <UserAvatar avatarUrl={me.avatar} name={me.name} size="md" />
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="No que você está pensando?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              maxLength={2000}
              className="resize-none border-0 bg-muted/40 focus-visible:ring-1"
            />
            {showImage && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="URL da imagem (https://...)"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowImage(false);
                    setImageUrl("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImage((v) => !v)}
                className="text-muted-foreground"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Imagem
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{content.length}/2000</span>
                <Button onClick={createPost} disabled={posting || !content.trim()}>
                  <Send className="mr-2 h-4 w-4" />
                  Publicar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Feed */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Carregando…</div>
      ) : posts.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Ainda sem posts. Seja o primeiro a publicar! 🎉
        </Card>
      ) : (
        <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-3">
          <AnimatePresence initial={false}>
            {posts.map((p) => (
              <motion.div
                key={p.id}
                variants={listItem}
                layout
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              >
                <PostCard
                  post={p}
                  currentUserId={user.id}
                  onToggleLike={() => toggleLike(p)}
                  onDelete={() => deletePost(p)}
                  onCommentAdded={load}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function PostCard({
  post,
  currentUserId,
  onToggleLike,
  onDelete,
  onCommentAdded,
}: {
  post: Post;
  currentUserId: string;
  onToggleLike: () => void;
  onDelete: () => void;
  onCommentAdded: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  const authorName = post.author?.full_name || post.author?.username || "Usuário";

  async function loadComments() {
    setLoadingComments(true);
    const { data: cs } = await supabase
      .from("community_post_comments")
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    const list = cs ?? [];
    const ids = Array.from(new Set(list.map((c: any) => c.author_id)));
    let profMap = new Map<string, Profile>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", ids);
      profMap = new Map((profs ?? []).map((p: any) => [p.id, p as Profile]));
    }
    setComments(list.map((c: any) => ({ ...c, author: profMap.get(c.author_id) })));
    setLoadingComments(false);
  }

  function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) loadComments();
  }

  async function submitComment() {
    const text = newComment.trim();
    if (!text) return;
    setSending(true);
    const { error } = await supabase.from("community_post_comments").insert({
      post_id: post.id,
      author_id: currentUserId,
      content: text,
    });
    setSending(false);
    if (error) {
      toast.error("Erro ao comentar");
      return;
    }
    setNewComment("");
    await loadComments();
    onCommentAdded();
  }

  async function deleteComment(c: Comment) {
    const { error } = await supabase.from("community_post_comments").delete().eq("id", c.id);
    if (error) toast.error("Erro ao apagar");
    else {
      setComments((prev) => prev.filter((x) => x.id !== c.id));
      onCommentAdded();
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <UserAvatar avatarUrl={post.author?.avatar_url ?? null} name={authorName} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{authorName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
              {post.author_id === currentUserId && (
                <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>
            {post.image_url && (
              <img
                src={post.image_url}
                alt=""
                className="mt-3 max-h-[480px] w-full rounded-lg border object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1 border-t pt-2">
          <Button variant="ghost" size="sm" onClick={onToggleLike} className={cn("group", post.liked_by_me && "text-rose-500")}>
            <motion.span
              key={post.liked_by_me ? "liked" : "unliked"}
              initial={{ scale: 0.6 }}
              animate={{ scale: post.liked_by_me ? [1, 1.4, 1] : 1 }}
              transition={{ duration: 0.35, ease: STAGGER.ease }}
              className="mr-2 inline-flex"
            >
              <Heart className={cn("h-4 w-4 transition-transform group-hover:scale-110", post.liked_by_me && "fill-current")} />
            </motion.span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={post.likes_count}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -6, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="inline-block"
              >
                {post.likes_count > 0 ? `${post.likes_count} ` : ""}
              </motion.span>
            </AnimatePresence>
            Curtir
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleComments}>
            <MessageCircle className="mr-2 h-4 w-4" />
            {post.comments_count > 0 ? post.comments_count : ""} Comentar
          </Button>
        </div>
      </div>

      {showComments && (
        <motion.div
          key="comments"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.28, ease: STAGGER.ease }}
          className="overflow-hidden border-t bg-muted/20"
        >
          <div className="space-y-3 p-4">
          {loadingComments ? (
            <p className="text-center text-xs text-muted-foreground">Carregando comentários…</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">Nenhum comentário ainda.</p>
          ) : (
            comments.map((c) => {
              const name = c.author?.full_name || c.author?.username || "Usuário";
              return (
                <div key={c.id} className="flex items-start gap-2">
                  <UserAvatar avatarUrl={c.author?.avatar_url ?? null} name={name} size="sm" />
                  <div className="flex-1 rounded-2xl bg-background px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold">{name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                        {c.author_id === currentUserId && (
                          <button onClick={() => deleteComment(c)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.content}</p>
                  </div>
                </div>
              );
            })
          )}

          <div className="flex items-center gap-2">
            <Input
              placeholder="Escreva um comentário…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitComment();
                }
              }}
              maxLength={1000}
            />
            <Button size="sm" onClick={submitComment} disabled={sending || !newComment.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          </div>
        </motion.div>
      )}
    </Card>
  );
}