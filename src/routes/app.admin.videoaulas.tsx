import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Upload, Trash2, Eye, EyeOff, Loader2, PlayCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LessonCover } from "@/components/lessons/LessonCover";

export const Route = createFileRoute("/app/admin/videoaulas")({
  component: AdminVideoAulas,
  head: () => ({ meta: [{ title: "Vídeo Aulas — Admin" }] }),
});

import { REVALIDA_SPECIALTIES } from "@/lib/specialtyMeta";
const SPECIALTIES = REVALIDA_SPECIALTIES;

type Lesson = {
  id: string;
  title: string;
  specialty: string | null;
  topic: string | null;
  description: string | null;
  video_url: string;
  duration_seconds: number;
  cover_image_url: string | null;
  published: boolean;
  created_at: string;
};

function AdminVideoAulas() {
  const { user } = useAuth();
  const [items, setItems] = useState<Lesson[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // form state
  const [title, setTitle] = useState("");
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("video_lessons")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Lesson[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function resetForm() {
    setTitle(""); setTopic(""); setDescription(""); setFile(null); setProgress(0);
  }

  async function probeDuration(f: File): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(f);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Math.round(v.duration || 0)); };
      v.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
      v.src = url;
    });
  }

  async function signedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage.from("lesson-videos").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (error) throw error;
    return data.signedUrl;
  }

  async function handleUpload() {
    if (!user) return;
    if (!title.trim()) return toast.error("Informe um título");
    if (!file) return toast.error("Selecione um arquivo de vídeo");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      setProgress(10);
      const { error: upErr } = await supabase.storage.from("lesson-videos").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type || "video/mp4",
      });
      if (upErr) throw upErr;
      setProgress(70);
      const url = await signedUrl(path);
      const duration = await probeDuration(file);
      setProgress(90);
      const { error: insErr } = await supabase.from("video_lessons").insert({
        title: title.trim(),
        specialty,
        topic: topic.trim() || null,
        description: description.trim() || null,
        video_url: url,
        duration_seconds: duration,
        published: false,
        created_by: user.id,
      });
      if (insErr) throw insErr;
      setProgress(100);
      toast.success("Aula enviada!");
      setOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar");
    } finally {
      setUploading(false);
    }
  }

  async function togglePublish(l: Lesson) {
    const { error } = await supabase.from("video_lessons").update({ published: !l.published }).eq("id", l.id);
    if (error) return toast.error(error.message);
    toast.success(l.published ? "Despublicada" : "Publicada");
    load();
  }

  async function remove(l: Lesson) {
    if (!confirm(`Excluir "${l.title}"?`)) return;
    const { error } = await supabase.from("video_lessons").delete().eq("id", l.id);
    if (error) return toast.error(error.message);
    toast.success("Excluída");
    load();
  }

  const filtered = items.filter((l) =>
    !q.trim() ? true : `${l.title} ${l.specialty} ${l.topic ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Vídeo Aulas</h2>
          <p className="text-sm text-muted-foreground">Faça upload e gerencie as aulas em vídeo.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Nova aula</Button>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-card">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="flex-1 bg-transparent text-sm outline-none" />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <PlayCircle className="mx-auto h-10 w-10 text-mint" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma vídeo aula ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <div key={l.id} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
              <LessonCover title={l.title} specialty={l.specialty} topic={l.topic} durationSeconds={l.duration_seconds} imageUrl={l.cover_image_url} />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={l.published ? "default" : "secondary"}>{l.published ? "Publicada" : "Rascunho"}</Badge>
                </div>
                <div className="line-clamp-2 text-sm font-medium">{l.title}</div>
                <div className="text-xs text-muted-foreground">{l.specialty}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => togglePublish(l)} className="flex-1">
                  {l.published ? <><EyeOff className="mr-1 h-3.5 w-3.5" /> Despublicar</> : <><Eye className="mr-1 h-3.5 w-3.5" /> Publicar</>}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(l)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!uploading) { setOpen(o); if (!o) resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova vídeo aula</DialogTitle>
            <DialogDescription>Faça upload do arquivo de vídeo e preencha os metadados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Abordagem da dor torácica" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Especialidade</Label>
                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tópico</Label>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Resumo da aula..." rows={3} />
            </div>
            <div className="space-y-1">
              <Label>Arquivo de vídeo</Label>
              <Input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {file && <p className="text-xs text-muted-foreground">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
            </div>
            {uploading && (
              <div className="space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-mint transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">Enviando... {progress}%</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading || !file || !title.trim()}>
              {uploading ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Enviando</> : <><Upload className="mr-1 h-4 w-4" /> Enviar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}