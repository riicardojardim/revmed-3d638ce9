import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Frown, Meh, Smile, List, X } from "lucide-react";
import { DeckCover } from "@/components/flashcards/DeckCover";
import { FlashcardFace } from "@/components/flashcards/FlashcardFace";
import { toast } from "sonner";
import { getSpecialtyMeta } from "@/lib/specialtyMeta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/flashcards")({
  component: FlashcardsPage,
  head: () => ({ meta: [{ title: "Flashcards — Estação Revalida" }] }),
});

type Deck = {
  id: string;
  title: string;
  specialty: string;
  topic: string | null;
  cover_image_url: string | null;
};
type Card = { id: string; front: string; back: string; position: number };
type Review = { card_id: string; ease: number; interval_days: number; reviews_count: number };

type Step = "list" | "cover" | "play";

function FlashcardsPage() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cardCounts, setCardCounts] = useState<Map<string, number>>(new Map());
  const [specialty, setSpecialty] = useState("Todas");
  const [step, setStep] = useState<Step>("list");
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: ds } = await supabase
        .from("flashcard_decks")
        .select("id, title, specialty, topic, cover_image_url")
        .eq("published", true)
        .order("title", { ascending: true });
      const list = (ds ?? []) as Deck[];
      setDecks(list);
      const ids = list.map((d) => d.id);
      if (ids.length) {
        const { data: fcs } = await supabase.from("flashcards").select("deck_id").in("deck_id", ids);
        const m = new Map<string, number>();
        (fcs ?? []).forEach((f) => {
          const k = f.deck_id as string;
          if (k) m.set(k, (m.get(k) ?? 0) + 1);
        });
        setCardCounts(m);
      }
    })();
  }, []);

  const specialties = useMemo(
    () => ["Todas", ...Array.from(new Set(decks.map((d) => d.specialty)))],
    [decks],
  );

  const filtered = useMemo(
    () => decks.filter((d) => specialty === "Todas" || d.specialty === specialty),
    [decks, specialty],
  );

  async function openDeck(d: Deck) {
    setActiveDeck(d);
    setStep("cover");
    setIndex(0);
    setRevealed(false);
    const { data } = await supabase
      .from("flashcards")
      .select("id, front, back, position")
      .eq("deck_id", d.id)
      .eq("published", true)
      .order("position", { ascending: true });
    setCards((data ?? []) as Card[]);
  }

  function close() {
    setStep("list");
    setActiveDeck(null);
    setCards([]);
    setIndex(0);
    setRevealed(false);
  }

  async function rate(quality: 0 | 3 | 5) {
    const current = cards[index];
    if (!current || !user) return;
    const { data: prevRow } = await supabase
      .from("flashcard_reviews")
      .select("ease, interval_days, reviews_count")
      .eq("user_id", user.id).eq("card_id", current.id).maybeSingle();
    const prev = prevRow as Review | null;
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
      user_id: user.id, card_id: current.id, ease, interval_days: interval,
      next_review_at: next, last_quality: quality,
      reviews_count: (prev?.reviews_count ?? 0) + 1,
    }, { onConflict: "user_id,card_id" });
    if (error) toast.error(error.message);
    setRevealed(false);
    setIndex((i) => Math.min(i + 1, cards.length - 1));
  }

  // ===== LIST =====
  if (step === "list") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <List className="h-4 w-4" />
            <span className="font-display font-bold text-foreground">Todos os Flashcards</span>
          </div>
        </div>

        <div className="flex justify-end">
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {specialties.map((s) => <SelectItem key={s} value={s}>{s === "Todas" ? "Todas as Áreas" : s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          {filtered.length} Flashcard{filtered.length === 1 ? "" : "s"}
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_80px_120px] gap-4 px-5 py-3 text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
            <div>Flashcard</div>
            <div className="text-center">Cards</div>
            <div className="text-center">Nota</div>
            <div className="text-right">Treinar</div>
          </div>
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nenhum flashcard publicado ainda. Volte em breve!
            </div>
          ) : filtered.map((d) => {
            const meta = getSpecialtyMeta(d.specialty);
            return (
              <div key={d.id} className="grid grid-cols-[1fr_80px_80px_120px] gap-4 items-center px-5 py-3 border-b border-border/60 last:border-0 hover:bg-muted/20">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn("inline-flex h-6 w-9 items-center justify-center rounded-md text-[11px] font-bold shrink-0", meta.badge)}>
                    {meta.code}
                  </span>
                  <span className="truncate font-medium">{d.title}</span>
                </div>
                <div className="text-center text-sm text-muted-foreground">{cardCounts.get(d.id) ?? 0}</div>
                <div className="text-center text-sm text-muted-foreground">–</div>
                <div className="text-right">
                  <Button size="sm" variant="hero" onClick={() => openDeck(d)}>Iniciar</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ===== COVER =====
  if (step === "cover" && activeDeck) {
    return (
      <FlashcardModalShell title={`FlashCards | ${activeDeck.title}`} onClose={close}>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-[min(100%,70svh)] max-w-md">
            <DeckCover
              title={activeDeck.title}
              specialty={activeDeck.specialty}
              topic={activeDeck.topic}
              size="lg"
            />
            <div className="mt-4 rounded-2xl bg-primary/15 ring-1 ring-primary/30 py-4 text-center">
              <div className="font-display font-bold text-lg uppercase tracking-wide">{activeDeck.title}</div>
            </div>
            <Button
              variant="outline"
              className="mt-4 w-full"
              disabled={cards.length === 0}
              onClick={() => { setStep("play"); setIndex(0); setRevealed(false); }}
            >
              {cards.length === 0 ? "Sem cards publicados" : "Iniciar Flashcard"}
            </Button>
          </div>
        </div>
      </FlashcardModalShell>
    );
  }

  // ===== PLAY =====
  if (step === "play" && activeDeck) {
    const current = cards[index];
    const done = !current;
    return (
      <FlashcardModalShell title={`FlashCards | ${activeDeck.title}`} onClose={close}>
        <div className="flex-1 flex items-center px-2 sm:px-8 relative">
          <button
            onClick={() => { if (index > 0) { setIndex(index - 1); setRevealed(false); } }}
            disabled={index === 0}
            className="absolute left-2 sm:left-6 p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={() => { if (index < cards.length - 1) { setIndex(index + 1); setRevealed(false); } }}
            disabled={index >= cards.length - 1}
            className="absolute right-2 sm:right-6 p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Próximo"
          >
            <ChevronRight className="h-8 w-8" />
          </button>

          <div className="mx-auto w-[min(100%,65svh)] max-w-md">
            {done ? (
              <div className="rounded-2xl border border-border bg-card p-10 text-center">
                <Smile className="mx-auto h-10 w-10 text-mint" />
                <h2 className="mt-3 font-display text-xl font-bold">Deck concluído!</h2>
                <p className="mt-2 text-sm text-muted-foreground">Você revisou todos os cards deste deck.</p>
                <Button variant="hero" className="mt-4" onClick={close}>Voltar</Button>
              </div>
            ) : (
              <>
                <FlashcardFace
                  side={revealed ? "back" : "front"}
                  counter={`${index + 1} | ${cards.length}`}
                >
                  <div className="flex-1 flex items-center justify-center text-center whitespace-pre-wrap overflow-y-auto" style={{ padding: "6cqi" }}>
                    <div className="font-medium" style={{ fontSize: "max(14px, 5cqi)", lineHeight: 1.35 }}>
                      {revealed ? current.back : current.front}
                    </div>
                  </div>
                </FlashcardFace>

                {revealed && user && (
                  <div className="mt-4 rounded-2xl bg-card ring-1 ring-border p-4">
                    <p className="text-center text-sm font-medium text-medical">Como foi sua resposta?</p>
                    <div className="mt-3 flex justify-center gap-6">
                      <button onClick={() => rate(0)} className="h-12 w-12 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 flex items-center justify-center transition" title="Errei">
                        <Frown className="h-6 w-6" />
                      </button>
                      <button onClick={() => rate(3)} className="h-12 w-12 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 flex items-center justify-center transition" title="Difícil">
                        <Meh className="h-6 w-6" />
                      </button>
                      <button onClick={() => rate(5)} className="h-12 w-12 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 flex items-center justify-center transition" title="Fácil">
                        <Smile className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => setRevealed((r) => !r)}
                >
                  {revealed ? "Ver Pergunta" : "Ver Resposta"}
                </Button>
              </>
            )}
          </div>
        </div>
      </FlashcardModalShell>
    );
  }

  return null;
}

function FlashcardModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="inline-flex items-center gap-2 text-sm">
          <List className="h-4 w-4 text-muted-foreground" />
          <span className="font-display font-bold">{title}</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 flex flex-col py-8 overflow-y-auto">
        {children}
      </div>
      <div className="flex justify-end px-6 py-3 border-t border-border">
        <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
}
