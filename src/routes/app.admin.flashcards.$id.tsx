import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Upload, ImageIcon, Save, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/admin/flashcards/$id")({
  component: AdminFlashcardEditor,
});

const SPECIALTIES = [
  "Clínica Médica",
  "Cirurgia",
  "Pediatria",
  "Ginecologia e Obstetrícia",
  "Preventiva",
  "Medicina da Família",
  "Urgência e Emergência",
];

type Deck = {
  id: string;
  title: string;
  specialty: string;
  topic: string | null;
  description: string | null;
  cover_image_url: string | null;
  published: boolean;
};

type Card = {
  id: string;
  front: string;
  back: string;
  position: number;
  _dirty?: boolean;
  _new?: boolean;
};

function AdminFlashcardEditor() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: d }, { data: cs }] = await Promise.all([
      supabase.from("flashcard_decks").select("*").eq("id", id).maybeSingle(),
      supabase.from("flashcards").select("id, front, back, position").eq("deck_id", id).order("position", { ascending: true }),
    ]);
    if (!d) {
      toast.error("Deck não encontrado");
      nav({ to: "/app/admin/flashcards" });
      return;
    }
    setDeck(d as Deck);
    setCards(((cs ?? []) as Card[]).map((c) => ({ ...c })));
    setLoading(false);
  }
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [id]);

  function patchDeck(patch: Partial<Deck>) {
    setDeck((d) => (d ? { ...d, ...patch } : d));
  }

  async function saveDeck() {
    if (!deck) return;
    const { error } = await supabase.from("flashcard_decks").update({
      title: deck.title,
      specialty: deck.specialty,
      topic: deck.topic,
      description: deck.description,
      cover_image_url: deck.cover_image_url,
      published: deck.published,
    }).eq("id", deck.id);
    if (error) throw error;
  }

  async function saveCards() {
    if (!user || !deck) return;
    const toInsert = cards.filter((c) => c._new && (c.front.trim() || c.back.trim()));
    const toUpdate = cards.filter((c) => !c._new && c._dirty);

    if (toInsert.length) {
      const { error } = await supabase.from("flashcards").insert(
        toInsert.map((c) => ({
          deck_id: deck.id,
          created_by: user.id,
          specialty: deck.specialty,
          topic: deck.topic,
          front: c.front,
          back: c.back,
          position: c.position,
          published: deck.published,
        })),
      );
      if (error) throw error;
    }
    for (const c of toUpdate) {
      const { error } = await supabase.from("flashcards").update({
        front: c.front, back: c.back, position: c.position,
        specialty: deck.specialty, topic: deck.topic,
      }).eq("id", c.id);
      if (error) throw error;
    }
  }

  async function saveAll() {
    if (!deck) return;
    setSaving(true);
    try {
      await saveDeck();
      await saveCards();
      toast.success("Salvo");
      await load();
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e?.message });
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    if (!deck) return;
    const next = !deck.published;
    const { error } = await supabase.from("flashcard_decks").update({ published: next }).eq("id", deck.id);
    if (error) return toast.error(error.message);
    // also propagate published flag to cards
    await supabase.from("flashcards").update({ published: next }).eq("deck_id", deck.id);
    patchDeck({ published: next });
    toast.success(next ? "Deck publicado" : "Deck despublicado");
  }

  async function uploadCover(file: File) {
    if (!deck) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${deck.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("flashcard-covers").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("flashcard-covers").getPublicUrl(path);
      patchDeck({ cover_image_url: data.publicUrl });
      await supabase.from("flashcard_decks").update({ cover_image_url: data.publicUrl }).eq("id", deck.id);
      toast.success("Capa atualizada");
    } catch (e: any) {
      toast.error("Erro no upload", { description: e?.message });
    } finally {
      setUploading(false);
    }
  }

  function addCard() {
    const pos = cards.length ? Math.max(...cards.map((c) => c.position)) + 1 : 0;
    setCards((cs) => [
      ...cs,
      { id: `new-${crypto.randomUUID()}`, front: "", back: "", position: pos, _new: true, _dirty: true },
    ]);
  }

  async function removeCard(c: Card) {
    if (c._new) {
      setCards((cs) => cs.filter((x) => x.id !== c.id));
      return;
    }
    if (!confirm("Excluir este card?")) return;
    const { error } = await supabase.from("flashcards").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    setCards((cs) => cs.filter((x) => x.id !== c.id));
  }

  function patchCard(id: string, patch: Partial<Card>) {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch, _dirty: true } : c)));
  }

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= cards.length) return;
    const next = [...cards];
    [next[idx], next[j]] = [next[j], next[idx]];
    setCards(next.map((c, i) => ({ ...c, position: i, _dirty: true })));
  }

  if (loading || !deck) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/admin/flashcards" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para decks
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={togglePublish}>
            {deck.published ? <><EyeOff className="h-4 w-4" /> Despublicar</> : <><Eye className="h-4 w-4" /> Publicar</>}
          </Button>
          <Button variant="hero" onClick={saveAll} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar tudo"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Deck meta */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h3 className="font-display font-bold">Capa do deck</h3>
            <div className="relative aspect-square rounded-xl overflow-hidden bg-primary/10 ring-1 ring-border flex items-center justify-center">
              {deck.cover_image_url ? (
                <img src={deck.cover_image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  <ImageIcon className="h-8 w-8 mx-auto" />
                  <p className="text-xs mt-2">Sem capa</p>
                </div>
              )}
            </div>
            <label className="block">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadCover(f);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" className="w-full" disabled={uploading} asChild>
                <span><Upload className="h-4 w-4" /> {uploading ? "Enviando..." : "Trocar capa"}</span>
              </Button>
            </label>
            <p className="text-[11px] text-muted-foreground">Recomendado: imagem quadrada, mínimo 600×600.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h3 className="font-display font-bold">Informações</h3>
            <div>
              <label className="text-xs text-muted-foreground">Título</label>
              <Input value={deck.title} onChange={(e) => patchDeck({ title: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Área / Especialidade</label>
              <Select value={deck.specialty} onValueChange={(v) => patchDeck({ specialty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tópico (opcional)</label>
              <Input value={deck.topic ?? ""} onChange={(e) => patchDeck({ topic: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Descrição (opcional)</label>
              <Textarea rows={3} value={deck.description ?? ""} onChange={(e) => patchDeck({ description: e.target.value })} />
            </div>
          </div>
        </aside>

        {/* Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Cards · {cards.length}</h3>
            <Button variant="outline" onClick={addCard}><Plus className="h-4 w-4" /> Adicionar card</Button>
          </div>

          {cards.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhum card ainda. Clique em "Adicionar card".</p>
            </div>
          )}

          {cards.map((c, i) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Card {i + 1} / {cards.length}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === cards.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => removeCard(c)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-primary">Pergunta</label>
                  <Textarea
                    rows={5}
                    placeholder="Escreva a pergunta..."
                    value={c.front}
                    onChange={(e) => patchCard(c.id, { front: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-amber-500">Resposta</label>
                  <Textarea
                    rows={5}
                    placeholder="Escreva a resposta..."
                    value={c.back}
                    onChange={(e) => patchCard(c.id, { back: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}

          {cards.length > 0 && (
            <Button variant="outline" onClick={addCard} className="w-full"><Plus className="h-4 w-4" /> Adicionar card</Button>
          )}
        </div>
      </div>
    </div>
  );
}
