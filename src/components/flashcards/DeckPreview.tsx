import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Eye, Frown, Meh, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeckCover } from "./DeckCover";
import { FlashcardFace } from "./FlashcardFace";
import { cn } from "@/lib/utils";

type Card = { id: string; front: string; back: string };

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  specialty: string;
  topic?: string | null;
  cards: Card[];
};

type Step = "cover" | "play";

/**
 * Pré-visualização "exatamente como o aluno vê" — capa + cards (frente/verso).
 * Usa os mesmos componentes (DeckCover / FlashcardFace) da tela de estudo.
 */
export function DeckPreview({ open, onClose, title, specialty, topic, cards }: Props) {
  const [step, setStep] = useState<Step>("cover");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (!open) return null;

  const current = cards[index];
  const done = step === "play" && !current;

  function reset() {
    setStep("cover");
    setIndex(0);
    setRevealed(false);
  }
  function handleClose() {
    reset();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="inline-flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4 text-mint" />
          <span className="font-display font-bold">Pré-visualização do aluno</span>
          <span className="text-muted-foreground">· {title}</span>
        </div>
        <button
          onClick={handleClose}
          className="inline-flex items-center gap-1.5 rounded-full bg-card ring-1 ring-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
          Fechar
        </button>
      </div>

      <div className="flex-1 flex flex-col py-6 overflow-y-auto">
        {step === "cover" && (
          <div
            className="flex-1 flex items-center justify-center px-4"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
          >
            <div className="w-[min(100%,70svh)] max-w-md" onClick={(e) => e.stopPropagation()}>
              <DeckCover title={title || "Título do deck"} specialty={specialty} topic={topic} />
              <div className="mt-4 rounded-2xl bg-primary/15 ring-1 ring-primary/30 py-4 text-center">
                <div className="font-display font-bold text-lg uppercase tracking-wide">
                  {title || "Título do deck"}
                </div>
              </div>
              <Button
                variant="outline"
                className="mt-4 w-full"
                disabled={cards.length === 0}
                onClick={() => { setStep("play"); setIndex(0); setRevealed(false); }}
              >
                {cards.length === 0 ? "Sem cards para visualizar" : "Iniciar Flashcard"}
              </Button>
            </div>
          </div>
        )}

        {step === "play" && (
          <div
            className="flex-1 flex items-center px-2 sm:px-8 relative"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
          >
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

            <div className="mx-auto w-[min(100%,65svh)] max-w-md" onClick={(e) => e.stopPropagation()}>
              {done ? (
                <div className="rounded-2xl border border-border bg-card p-10 text-center">
                  <p className="text-sm text-muted-foreground">Fim da pré-visualização.</p>
                  <Button variant="hero" className="mt-4" onClick={reset}>Ver capa novamente</Button>
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
                            {text || (revealed ? "(resposta vazia)" : "(pergunta vazia)")}
                          </p>
                        </div>
                      );
                    })()}
                  </FlashcardFace>

                  {revealed && (
                    <div className="mt-4 rounded-2xl bg-card ring-1 ring-border p-4 sm:p-5">
                      <p className="text-center text-sm font-medium text-medical">
                        Como foi sua resposta?
                      </p>
                      <p className="mt-1 text-center text-[11px] text-muted-foreground">
                        Pré-visualização — sem efeito no agendamento
                      </p>
                      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => { setRevealed(false); setIndex((i) => Math.min(i + 1, cards.length)); }}
                          className="flex flex-col items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500/40 px-2 py-3 transition active:scale-[0.97]"
                        >
                          <Frown className="h-6 w-6 text-rose-500" />
                          <span className="text-[13px] font-semibold text-rose-500">Errei</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRevealed(false); setIndex((i) => Math.min(i + 1, cards.length)); }}
                          className="flex flex-col items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500/40 px-2 py-3 transition active:scale-[0.97]"
                        >
                          <Meh className="h-6 w-6 text-amber-500" />
                          <span className="text-[13px] font-semibold text-amber-500">Difícil</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRevealed(false); setIndex((i) => Math.min(i + 1, cards.length)); }}
                          className="flex flex-col items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/40 px-2 py-3 transition active:scale-[0.97]"
                        >
                          <Smile className="h-6 w-6 text-emerald-500" />
                          <span className="text-[13px] font-semibold text-emerald-500">Fácil</span>
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
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-t border-border text-xs text-muted-foreground">
        <div className="flex gap-2">
          {step === "play" && (
            <Button variant="ghost" size="sm" onClick={reset}>Voltar para a capa</Button>
          )}
        </div>
        <span>
          {step === "cover" ? "Tela de capa" : done ? "Final" : `Card ${index + 1} de ${cards.length} · ${revealed ? "Resposta" : "Pergunta"}`}
        </span>
      </div>
    </div>
  );
}
