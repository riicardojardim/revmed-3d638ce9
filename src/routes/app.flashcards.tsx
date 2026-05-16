import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sparkles, RotateCw, ChevronRight, Check, X, Brain } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/flashcards")({
  component: FlashcardsPage,
  head: () => ({ meta: [{ title: "Flashcards — Estação Revalida" }] }),
});

type Card = {
  id: string;
  specialty: string;
  topic: string | null;
  deck: string | null;
  front: string;
  back: string;
};
type Review = {
  card_id: string;
  ease: number;
  interval_days: number;
  next_review_at: string;
  reviews_count: number;
};

function FlashcardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [reviews, setReviews] = useState<Map<string, Review>>(new Map());
  const [specialty, setSpecialty] = useState<string>("Todas");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  async function load() {
    const { data: cs } = await supabase
      .from("flashcards")
      .select("id, specialty, topic, deck, front, back")
      .eq("published", true)
      .order("created_at", { ascending: false });
    setCards((cs ?? []) as Card[]);

    if (user) {
      const { data: rs } = await supabase
        .from("flashcard_reviews")
        .select("card_id, ease, interval_days, next_review_at, reviews_count")
        .eq("user_id", user.id);
      const m = new Map<string, Review>();
      (rs ?? []).forEach((r) => m.set(r.card_id, r as Review));
      setReviews(m);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const specialties = useMemo(
    () => ["Todas", ...Array.from(new Set(cards.map((c) => c.specialty)))],
    [cards],
  );

  const queue = useMemo(() => {
    const now = Date.now();
    return cards
      .filter((c) => specialty === "Todas" || c.specialty === specialty)
      .sort((a, b) => {
        const ra = reviews.get(a.id);
        const rb = reviews.get(b.id);
        const ta = ra ? new Date(ra.next_review_at).getTime() : 0;
        const tb = rb ? new Date(rb.next_review_at).getTime() : 0;
        const aDue = ta <= now ? 0 : 1;
        const bDue = tb <= now ? 0 : 1;
        if (aDue !== bDue) return aDue - bDue;
        return ta - tb;
      });
  }, [cards, reviews, specialty]);

  const current = queue[index];
  const due = queue.filter((c) => {
    const r = reviews.get(c.id);
    return !r || new Date(r.next_review_at).getTime() <= Date.now();
  }).length;

  async function rate(quality: 0 | 3 | 5) {
    if (!current || !user) return;
    const prev = reviews.get(current.id);
    let ease = prev?.ease ?? 2.5;
    let interval = prev?.interval_days ?? 0;
    if (quality < 3) {
      interval = 1;
      ease = Math.max(1.3, ease - 0.2);
    } else {
      interval = interval === 0 ? 1 : interval === 1 ? 3 : Math.round(interval * ease);
      ease = Math.min(2.8, ease + (quality === 5 ? 0.1 : 0));
    }
    const next = new Date(Date.now() + interval * 86400000).toISOString();
    const { error } = await supabase.from("flashcard_reviews").upsert({
      user_id: user.id,
      card_id: current.id,
      ease,
      interval_days: interval,
      next_review_at: next,
      last_quality: quality,
      reviews_count: (prev?.reviews_count ?? 0) + 1,
    }, { onConflict: "user_id,card_id" });
    if (error) toast.error(error.message);
    setReviews((m) => new Map(m).set(current.id, {
      card_id: current.id, ease, interval_days: interval, next_review_at: next, reviews_count: (prev?.reviews_count ?? 0) + 1,
    }));
    setRevealed(false);
    setIndex((i) => Math.min(i + 1, queue.length - 1));
  }

  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 text-center">
        <Brain className="mx-auto h-8 w-8 text-mint" />
        <h2 className="mt-3 font-display text-xl font-bold">Nenhum flashcard publicado ainda</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Os professores ainda não publicaram flashcards. Volte em breve!
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3 py-1 text-xs font-medium text-medical">
            <Sparkles className="h-3.5 w-3.5" /> Revisão espaçada
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">Flashcards</h1>
          <p className="mt-1 text-sm text-muted-foreground">{due} cartão(ões) para revisar agora.</p>
        </div>
        <select value={specialty} onChange={(e) => { setSpecialty(e.target.value); setIndex(0); setRevealed(false); }}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
          {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {current ? (
        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-card min-h-[260px] flex flex-col">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{current.specialty}{current.topic ? ` · ${current.topic}` : ""}</span>
              <span>{index + 1} / {queue.length}</span>
            </div>
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <div className="text-lg font-medium md:text-xl">{current.front}</div>
                {revealed && (
                  <div className="mt-6 border-t border-border pt-6 text-base text-muted-foreground whitespace-pre-wrap">
                    {current.back}
                  </div>
                )}
              </div>
            </div>
          </div>
          {!revealed ? (
            <Button variant="hero" className="w-full" onClick={() => setRevealed(true)}>
              Mostrar resposta <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => rate(0)} className="border-rose-300 text-rose-600 hover:bg-rose-50">
                <X className="mr-1 h-4 w-4" /> Errei
              </Button>
              <Button variant="outline" onClick={() => rate(3)}>
                <RotateCw className="mr-1 h-4 w-4" /> Difícil
              </Button>
              <Button variant="hero" onClick={() => rate(5)}>
                <Check className="mr-1 h-4 w-4" /> Fácil
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <Check className="mx-auto h-8 w-8 text-mint" />
          <h2 className="mt-3 font-display text-xl font-bold">Tudo em dia!</h2>
          <p className="mt-2 text-sm text-muted-foreground">Você revisou todos os cartões desta categoria.</p>
        </div>
      )}
    </div>
  );
}
