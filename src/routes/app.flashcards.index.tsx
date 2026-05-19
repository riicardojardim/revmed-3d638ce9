import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, List, X, Pencil, Clock, Timer, Search, Brain, ArrowRight, TrendingUp, ListChecks } from "lucide-react";
import { DeckCover } from "@/components/flashcards/DeckCover";
import { FlashcardFace } from "@/components/flashcards/FlashcardFace";
import { toast } from "sonner";
import { getSpecialtyMeta, sortSpecialties } from "@/lib/specialtyMeta";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/stagger";
import { createSimulado } from "@/lib/simulado";

export const Route = createFileRoute("/app/flashcards/")({
  component: FlashcardsPage,
  head: () => ({ meta: [{ title: "Flashcards — Estação Revalida" }] }),
});

type Deck = {
  id: string;
  title: string;
  specialty: string;
  topic: string | null;
  cover_image_url: string | null;
  station_id: string | null;
};
type Card = { id: string; front: string; back: string; position: number };
type Review = { card_id: string; ease: number; interval_days: number; reviews_count: number };
type SuggestedStation = { id: string; title: string; specialty: string; checklistCount: number };

type Step = "list" | "cover" | "play";

function FlashcardsPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [specialty, setSpecialty] = useState("Todas");
  const [search, setSearch] = useState("");
  
  const [step, setStep] = useState<Step>("list");
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [suggestedStation, setSuggestedStation] = useState<SuggestedStation | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // Stats da sessão
  const [outcomes, setOutcomes] = useState<Array<0 | 3 | 5>>([]);
  const [perCardSeconds, setPerCardSeconds] = useState<number[]>([]);
  const [cardStartedAt, setCardStartedAt] = useState<number>(() => Date.now());

  const { data: decksData } = useQuery({
    queryKey: ["flashcard-decks", "published"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: ds } = await supabase
        .from("flashcard_decks")
        .select("id, title, specialty, topic, cover_image_url, station_id")
        .eq("published", true)
        .order("created_at", { ascending: false });
      const list = (ds ?? []) as Deck[];
      const ids = list.map((d) => d.id);
      const m = new Map<string, number>();
      if (ids.length) {
        const { data: fcs } = await supabase.from("flashcards").select("deck_id").in("deck_id", ids);
        (fcs ?? []).forEach((f) => {
          const k = f.deck_id as string;
          if (k) m.set(k, (m.get(k) ?? 0) + 1);
        });
      }
      return { decks: list, counts: m };
    },
  });
  const decks = decksData?.decks ?? [];
  const cardCounts = decksData?.counts ?? new Map<string, number>();


  const specialties = useMemo(
    () => ["Todas", ...sortSpecialties(Array.from(new Set(decks.map((d) => d.specialty))))],
    [decks],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return decks.filter((d) => {
      if (specialty !== "Todas" && d.specialty !== specialty) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        (d.topic ?? "").toLowerCase().includes(q)
      );
    });
  }, [decks, specialty, search]);


  async function openDeck(d: Deck) {
    setActiveDeck(d);
    setStep("cover");
    setIndex(0);
    setRevealed(false);
    setSuggestedStation(null);
    const [{ data: cardData }, stationRes] = await Promise.all([
      supabase
        .from("flashcards")
        .select("id, front, back, position")
        .eq("deck_id", d.id)
        .eq("published", true)
        .order("position", { ascending: true }),
      d.station_id
        ? supabase
            .from("custom_stations")
            .select("id, title, specialty, published")
            .eq("id", d.station_id)
            .maybeSingle()
        : Promise.resolve({ data: null as null | { id: string; title: string; specialty: string; published: boolean } }),
    ]);
    setCards((cardData ?? []) as Card[]);
    const st = stationRes?.data;
    if (st && st.published) {
      const { count } = await supabase
        .from("station_checklist_items")
        .select("id", { count: "exact", head: true })
        .eq("station_id", st.id);
      setSuggestedStation({ id: st.id, title: st.title, specialty: st.specialty, checklistCount: count ?? 0 });
    }
  }

  function close() {
    setStep("list");
    setActiveDeck(null);
    setCards([]);
    setSuggestedStation(null);
    setIndex(0);
    setRevealed(false);
    setOutcomes([]);
    setPerCardSeconds([]);
  }

  function startSuggestedStation() {
    if (!suggestedStation) return;
    if (!user) { toast.error("Faça login para iniciar."); return; }
    const sim = createSimulado(user.id, suggestedStation.title, [
      { id: suggestedStation.id, title: suggestedStation.title, specialty: suggestedStation.specialty },
    ]);
    nav({ to: "/app/sala/$code", params: { code: sim.id } });
  }

  function startSession() {
    setStep("play");
    setIndex(0);
    setRevealed(false);
    setOutcomes([]);
    setPerCardSeconds([]);
    setCardStartedAt(Date.now());
  }

  async function rate(quality: 0 | 3 | 5) {
    const current = cards[index];
    if (!current || !user) return;
    const elapsed = Math.max(0, Math.round((Date.now() - cardStartedAt) / 1000));
    setOutcomes((arr) => [...arr, quality]);
    setPerCardSeconds((arr) => [...arr, elapsed]);

    const { data: prevRow } = await supabase
      .from("flashcard_reviews")
      .select("ease, interval_days, reviews_count, total_time_seconds")
      .eq("user_id", user.id).eq("card_id", current.id).maybeSingle();
    const prev = prevRow as (Review & { total_time_seconds?: number }) | null;
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
      last_time_seconds: elapsed,
      total_time_seconds: (prev?.total_time_seconds ?? 0) + elapsed,
    }, { onConflict: "user_id,card_id" });
    if (error) toast.error(error.message);
    setRevealed(false);
    setCardStartedAt(Date.now());
    setIndex((i) => i + 1);
  }

  // ===== LIST =====
  if (step === "list") {
    return <FlashcardsList
      decks={decks}
      filtered={filtered}
      cardCounts={cardCounts}
      specialties={specialties}
      search={search}
      setSearch={setSearch}
      specialty={specialty}
      setSpecialty={setSpecialty}
      openDeck={openDeck}
    />;
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
              onClick={startSession}
            >
              {cards.length === 0 ? "Sem cards publicados" : "Iniciar Flashcard"}
            </Button>

            {suggestedStation && (
              <div className="mt-4 rounded-2xl border border-mint/30 bg-mint/5 p-4 shadow-card">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-medical">
                  <ListChecks className="h-3.5 w-3.5" /> Checklist sugerido
                </div>
                <div className="mt-2 line-clamp-2 font-display text-sm font-bold leading-snug">
                  {suggestedStation.title}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {suggestedStation.specialty} · {suggestedStation.checklistCount} {suggestedStation.checklistCount === 1 ? "item" : "itens"}
                </div>
                <Button size="sm" variant="hero" className="mt-3 w-full" onClick={startSuggestedStation}>
                  Treinar checklist <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </FlashcardModalShell>
    );
  }

  // ===== PLAY =====
  if (step === "play" && activeDeck) {
    const current = cards[index];
    const done = index >= cards.length || !current;
    // Sessão concluída → mostra estatísticas no estilo wemeds
    const totalAnswered = outcomes.length;
    const acertei = outcomes.filter((q) => q === 5).length;
    const quase = outcomes.filter((q) => q === 3).length;
    const naoSei = outcomes.filter((q) => q === 0).length;
    const pctAcertos = totalAnswered > 0 ? Math.round((acertei / totalAnswered) * 100) : 0;
    const totalSec = perCardSeconds.reduce((s, n) => s + n, 0);
    const avgSec = totalAnswered > 0 ? Math.round(totalSec / totalAnswered) : 0;
    const fmtSec = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${s % 60}s` : `${s} seg`);
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
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-card">
                <h2 className="text-center font-display text-xl font-bold">Revisão concluída</h2>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  {activeDeck.title}
                </p>

                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
                  {/* Anel de % de acertos */}
                  <div className="mx-auto">
                    <div
                      className="relative grid h-36 w-36 place-items-center rounded-full"
                      style={{
                        background: `conic-gradient(hsl(var(--mint, 160 80% 50%)) ${pctAcertos * 3.6}deg, hsl(var(--muted)) 0)`,
                      }}
                    >
                      <div className="grid h-28 w-28 place-items-center rounded-full bg-card text-center">
                        <div>
                          <div className="font-display text-3xl font-bold tabular-nums">{pctAcertos}%</div>
                          <div className="text-[11px] text-muted-foreground">de acertos</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <Pencil className="mx-auto h-5 w-5 text-mint" />
                      <div className="mt-1 font-display text-lg font-bold tabular-nums">{totalAnswered}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Respondidos</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <Clock className="mx-auto h-5 w-5 text-amber-500" />
                      <div className="mt-1 font-display text-lg font-bold tabular-nums">{fmtSec(avgSec)}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Média / card</div>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <Timer className="mx-auto h-5 w-5 text-medical" />
                      <div className="mt-1 font-display text-lg font-bold tabular-nums">{fmtSec(totalSec)}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Tempo total</div>
                    </div>
                  </div>
                </div>

                {/* Contadores por resposta */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-600">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">{acertei}</span>
                    Acertei
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-semibold text-amber-600">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-[11px] font-bold text-white">{quase}</span>
                    Quase
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-semibold text-rose-600">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[11px] font-bold text-white">{naoSei}</span>
                    Não sei
                  </span>
                </div>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button variant="outline" onClick={startSession}>Refazer deck</Button>
                  <Button variant="hero" onClick={close}>Voltar aos flashcards</Button>
                </div>
              </div>
            ) : (
              <>
                <FlashcardFace
                  side={revealed ? "back" : "front"}
                  counter={`${index + 1} | ${cards.length}`}
                >
                  {(() => {
                    const text = revealed ? current.back : current.front;
                    const isShort = text.length <= 80;
                    return (
                      <div
                        className="flex-1 flex items-center justify-center overflow-y-auto"
                        style={{ padding: "clamp(16px, 5cqi, 32px)" }}
                      >
                        <p
                          lang="pt-BR"
                          className={cn(
                            "font-medium whitespace-pre-wrap hyphens-auto [text-wrap:pretty] [overflow-wrap:anywhere]",
                            isShort ? "text-center" : "text-left",
                          )}
                          style={{
                            fontSize: "clamp(15px, 4.6cqi, 22px)",
                            lineHeight: 1.45,
                            letterSpacing: "-0.005em",
                          }}
                        >
                          {text}
                        </p>
                      </div>
                    );
                  })()}
                </FlashcardFace>

                {revealed && user && (
                  <div className="mt-4 rounded-2xl bg-card ring-1 ring-border p-4 sm:p-5">
                    <p className="text-center text-sm font-medium text-medical">
                      Como foi sua resposta?
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                      <button
                        onClick={() => rate(0)}
                        title="Não sei — volta em ~10 min"
                        className="rounded-xl border-2 border-rose-500/40 bg-card px-2 py-3 text-center font-display font-bold text-rose-500 transition hover:bg-rose-500/10 active:scale-[0.97]"
                      >
                        <div className="text-[15px]">Não sei</div>
                      </button>
                      <button
                        onClick={() => rate(3)}
                        title="Quase — curto prazo"
                        className="rounded-xl border-2 border-amber-500/40 bg-card px-2 py-3 text-center font-display font-bold text-amber-500 transition hover:bg-amber-500/10 active:scale-[0.97]"
                      >
                        <div className="text-[15px]">Quase</div>
                      </button>
                      <button
                        onClick={() => rate(5)}
                        title="Acertei — intervalo maior"
                        className="rounded-xl border-2 border-mint bg-card px-2 py-3 text-center font-display font-bold text-mint transition hover:bg-mint/10 active:scale-[0.97]"
                      >
                        <div className="text-[15px]">Acertei</div>
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

type FlashcardsListProps = {
  decks: Deck[];
  filtered: Deck[];
  cardCounts: Map<string, number>;
  specialties: string[];
  search: string;
  setSearch: (v: string) => void;
  specialty: string;
  setSpecialty: (v: string) => void;
  openDeck: (d: Deck) => void;
};

function FlashcardsList({
  decks, filtered, cardCounts, specialties, search, setSearch, specialty, setSpecialty, openDeck,
}: FlashcardsListProps) {
  const [allOpen, setAllOpen] = useState(false);
  const [allSearch, setAllSearch] = useState("");
  const [allSpec, setAllSpec] = useState<string>("Todas");

  const allFiltered = useMemo(() => {
    const q = allSearch.trim().toLowerCase();
    return decks.filter((d) => {
      if (allSpec !== "Todas" && d.specialty !== allSpec) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        (d.topic ?? "").toLowerCase().includes(q)
      );
    });
  }, [decks, allSpec, allSearch]);

  return (
    <div className="relative mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Banco de Flashcards</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha um deck e treine com cards no estilo Pense Revalida.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main column */}
        <div className="min-w-0 space-y-5">
          {/* Search */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, tema ou especialidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 pl-9 text-base"
              />
            </div>
          </div>

          {/* Specialty filters */}
          {(() => {
            const order = ["Cirurgia", "Pediatria", "Clínica Médica", "Ginecologia e Obstetrícia", "Medicina de Família e Comunidade"];
            const others = specialties.filter((s) => s !== "Todas");
            const row1 = order.slice(0, 3).filter((s) => others.includes(s));
            const row2 = order.slice(3).filter((s) => others.includes(s));
            const renderChip = (s: string, mobile: boolean) => {
              const meta = getSpecialtyMeta(s);
              const active = specialty === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpecialty(s)}
                  title={s}
                  className={cn(
                    mobile
                      ? "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border px-2 text-[11px] font-medium leading-tight transition-all"
                      : "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    active
                      ? "border-foreground/20 bg-card text-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-mint/40",
                  )}
                >
                  <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", meta.solid)} />
                  <span className="truncate text-center">{s}</span>
                </button>
              );
            };
            return (
              <div className="space-y-2 lg:space-y-0">
                {/* Mobile/Tablet */}
                <div className="space-y-2 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setSpecialty("Todas")}
                    className={cn(
                      "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-all",
                      specialty === "Todas"
                        ? "border-mint bg-mint/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-mint/40",
                    )}
                  >
                    Todas
                  </button>
                  {row1.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">{row1.map((s) => renderChip(s, true))}</div>
                  )}
                  {row2.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">{row2.map((s) => renderChip(s, true))}</div>
                  )}
                </div>
                {/* Desktop */}
                <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSpecialty("Todas")}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      specialty === "Todas"
                        ? "border-mint bg-mint/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-mint/40",
                    )}
                  >
                    Todas
                  </button>
                  {others.map((s) => renderChip(s, false))}
                </div>
              </div>
            );
          })()}




          {/* Deck covers grid */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
              Nenhum flashcard encontrado{search ? ` para "${search}"` : ""}.
            </div>
          ) : (
            <motion.div
              key={filtered.slice(0, 4).map((d) => d.id).join("|")}
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
            >
              {filtered.slice(0, 4).map((d) => (
                <motion.button
                  key={d.id}
                  variants={staggerItem}
                  type="button"
                  onClick={() => openDeck(d)}
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="group relative flex min-w-0 flex-col gap-2 rounded-2xl border border-border bg-card/80 p-2 text-left shadow-card backdrop-blur-sm transition-all hover:shadow-elegant sm:gap-3 sm:p-3"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-xl">
                    <DeckCover title={d.title} specialty={d.specialty} topic={d.topic} />
                  </div>
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0">
                      <div className="truncate font-display text-xs font-bold leading-tight sm:text-sm">{d.title}</div>
                      <div className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-[11px]">
                        {d.specialty}{d.topic ? ` · ${d.topic}` : ""}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-mint/10 px-1.5 py-0.5 text-[9px] font-semibold text-mint sm:px-2 sm:text-[10px]">
                      {cardCounts.get(d.id) ?? 0}
                    </span>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}

          {filtered.length > 4 && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => { setAllSearch(""); setAllSpec("Todas"); setAllOpen(true); }}>
                Ver todos os {filtered.length} flashcards <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>



        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">

          <Link
            to="/app/flashcards/desempenho"
            className="block overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-colors hover:border-mint/60"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-display text-lg font-bold">Meu Desempenho</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Veja suas estatísticas e evolução nos flashcards.
            </p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-mint">
              Ver detalhes <ChevronRight className="h-4 w-4" />
            </div>
          </Link>
        </aside>
      </div>

      <Dialog open={allOpen} onOpenChange={setAllOpen}>
        <DialogContent className="flex w-[calc(100vw-2rem)] max-w-3xl max-h-[calc(100dvh-3rem)] flex-col overflow-y-auto rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-mint" />
              Todos os flashcards
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={allSearch}
                onChange={(e) => setAllSearch(e.target.value)}
                placeholder="Buscar flashcard..."
                className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2 lg:space-y-0">
              <button
                type="button"
                onClick={() => setAllSpec("Todas")}
                className={cn(
                  "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors lg:hidden",
                  allSpec === "Todas"
                    ? "border-foreground/20 bg-card text-foreground shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-mint/40",
                )}
              >
                Todas
              </button>
              <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-nowrap lg:items-center lg:gap-1">
                <button
                  type="button"
                  onClick={() => setAllSpec("Todas")}
                  className={cn(
                    "hidden lg:inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors",
                    allSpec === "Todas"
                      ? "border-foreground/20 bg-card text-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:border-mint/40",
                  )}
                >
                  Todas
                </button>
                {specialties.filter((s) => s !== "Todas").map((s) => {
                  const meta = getSpecialtyMeta(s);
                  const active = allSpec === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAllSpec(s)}
                      title={s}
                      className={cn(
                        "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors lg:h-auto lg:w-auto lg:min-w-0 lg:flex-1 lg:px-2 lg:py-1 lg:text-[11px] lg:leading-tight",
                        active
                          ? "border-foreground/20 bg-card text-foreground shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-mint/40",
                      )}
                    >
                      <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full lg:h-1.5 lg:w-1.5", meta.solid)} />
                      <span className="whitespace-nowrap lg:hidden">{meta.code}</span>
                      <span className="hidden truncate lg:inline">{s}</span>
                    </button>
                  );
                })}
              </div>

            </div>


            <ul className="max-h-[55vh] divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card">
              {allFiltered.map((d) => {
                const m = getSpecialtyMeta(d.specialty);
                return (
                  <li key={d.id} className="flex min-w-0 items-center gap-3 px-3 py-2.5">
                    <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 font-mono text-[10px] font-bold", m.badge)}>{m.code}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{d.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {d.specialty}{d.topic ? ` • ${d.topic}` : ""} • {cardCounts.get(d.id) ?? 0} cards
                      </div>
                    </div>
                    <Button size="sm" variant="hero" onClick={() => { setAllOpen(false); openDeck(d); }}>
                      Iniciar <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
              {allFiltered.length === 0 && (
                <li className="px-3 py-10 text-center text-xs text-muted-foreground">Nenhum flashcard encontrado.</li>
              )}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

