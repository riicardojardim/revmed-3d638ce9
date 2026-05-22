import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, PlayCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LessonCover } from "@/components/lessons/LessonCover";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/videoaulas")({
  component: VideoAulas,
  head: () => ({ meta: [{ title: "Vídeo Aulas — REVMED" }] }),
});

type Lesson = {
  id: string;
  title: string;
  specialty: string;
  topic: string | null;
  description: string | null;
  video_url: string;
  duration_seconds: number;
  cover_image_url: string | null;
};

const SPECIALTIES = [
  "Clínica Médica",
  "Cirurgia",
  "Pediatria",
  "Ginecologia e Obstetrícia",
  "Medicina de Família e Comunidade",
  "Preventiva",
];

function VideoAulas() {
  const [items, setItems] = useState<Lesson[]>([]);
  const [q, setQ] = useState("");
  const [spec, setSpec] = useState("all");
  const [playing, setPlaying] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("video_lessons")
        .select("id,title,specialty,topic,description,video_url,duration_seconds,cover_image_url")
        .eq("published", true)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      setItems((data ?? []) as Lesson[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((l) => {
      if (spec !== "all" && l.specialty !== spec) return false;
      if (q.trim() && !`${l.title} ${l.topic ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, q, spec]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Vídeo Aulas</h1>
        <p className="text-sm text-muted-foreground">Aulas em vídeo curadas pela equipe REVMED.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar aula..."
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <Select value={spec} onValueChange={setSpec}>
          <SelectTrigger className="sm:w-64"><SelectValue placeholder="Especialidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas especialidades</SelectItem>
            {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-muted/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <PlayCircle className="mx-auto h-10 w-10 text-mint" />
          <h2 className="mt-3 font-display text-lg font-bold">Nenhuma aula encontrada</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tente ajustar a busca ou a especialidade.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setPlaying(l)}
              className="group flex flex-col text-left transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-mint"
            >
              <LessonCover
                title={l.title}
                specialty={l.specialty}
                topic={l.topic}
                durationSeconds={l.duration_seconds}
                imageUrl={l.cover_image_url}
              />
              <div className="mt-2 line-clamp-2 min-h-[2.5rem] px-1 text-sm font-medium leading-tight">{l.title}</div>
              <div className="px-1 text-xs text-muted-foreground">{l.specialty}</div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!playing} onOpenChange={(o) => !o && setPlaying(null)}>
        <DialogContent className="max-w-4xl border-border bg-background p-0">
          {playing && (
            <div className="flex flex-col">
              <div className="aspect-video w-full bg-black">
                <video
                  src={playing.video_url}
                  controls
                  autoPlay
                  className="h-full w-full"
                />
              </div>
              <div className="space-y-2 p-5">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{playing.specialty}</Badge>
                  {playing.topic && <Badge variant="outline">{playing.topic}</Badge>}
                </div>
                <h2 className="font-display text-xl font-bold">{playing.title}</h2>
                {playing.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{playing.description}</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}