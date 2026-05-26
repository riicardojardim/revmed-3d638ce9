import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Upload, Image as ImageIcon, Check, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/admin/estacoes/imagens")({
  component: PendingImagesPage,
});

type Material = {
  id?: string;
  name?: string;
  type?: string;
  description?: string;
  content?: string;
  imageUrl?: string;
  autoDeliver?: boolean;
};

type PendingItem = {
  stationId: string;
  stationTitle: string;
  specialty: string | null;
  materialIndex: number;
  materialName: string;
  page: number | null;
  day: string | null;
  rawPlaceholder: string;
  content: string;
};

const PLACEHOLDER_RE =
  /\[IMAGEM[^\]]*?(?:CAPTURAR\s*TELA|CAPTURA\s*DE\s*TELA|SCREENSHOT|IMAGEM\s*NECESS[ÁA]RIA)[^\]]*\]/i;
const PAGE_RE = /P[ÁA]GINA\s*(\d+)/i;
const DAY_RE = /DIA\s*(\d+)/i;

function detectPlaceholder(content: string | undefined): {
  match: string;
  page: number | null;
  day: string | null;
} | null {
  if (!content) return null;
  const m = content.match(PLACEHOLDER_RE);
  if (!m) return null;
  const text = m[0];
  const p = text.match(PAGE_RE);
  const d = text.match(DAY_RE);
  return {
    match: text,
    page: p ? Number(p[1]) : null,
    day: d ? d[1] : null,
  };
}

function PendingImagesPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [q, setQ] = useState("");
  const [dayFilter, setDayFilter] = useState<string>("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("custom_stations")
      .select("id, title, specialty, deliverable_materials")
      .not("deliverable_materials", "is", null)
      .order("title");
    if (error) {
      toast.error("Erro ao carregar", { description: error.message });
      setLoading(false);
      return;
    }
    const out: PendingItem[] = [];
    for (const row of data ?? []) {
      const mats = Array.isArray(row.deliverable_materials)
        ? (row.deliverable_materials as Material[])
        : [];
      mats.forEach((m, idx) => {
        if (m?.imageUrl) return;
        const det = detectPlaceholder(m?.content);
        if (!det) return;
        out.push({
          stationId: row.id,
          stationTitle: row.title,
          specialty: (row as { specialty?: string }).specialty ?? null,
          materialIndex: idx,
          materialName: m?.name || `Impresso ${idx + 1}`,
          page: det.page,
          day: det.day,
          rawPlaceholder: det.match,
          content: m?.content ?? "",
        });
      });
    }
    setItems(out);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const days = useMemo(() => {
    const s = new Set<string>();
    items.forEach((it) => it.day && s.add(it.day));
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const norm = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const term = norm(q.trim());
    return items.filter((it) => {
      if (dayFilter && it.day !== dayFilter) return false;
      if (!term) return true;
      return (
        norm(it.stationTitle).includes(term) ||
        norm(it.materialName).includes(term)
      );
    });
  }, [items, q, dayFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, PendingItem[]>();
    filtered.forEach((it) => {
      const key = it.day ? `Dia ${it.day}` : "Sem dia identificado";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.page ?? 9999) - (b.page ?? 9999));
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  function removeItem(stationId: string, materialIndex: number) {
    setItems((prev) =>
      prev.filter(
        (it) => !(it.stationId === stationId && it.materialIndex === materialIndex),
      ),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            to="/app/admin/estacoes"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar para checklists
          </Link>
          <h2 className="font-display text-xl font-bold">Impressos pendentes de imagem</h2>
          <p className="text-sm text-muted-foreground">
            Lista todos os impressos marcados com{" "}
            <code className="rounded bg-muted px-1">[IMAGEM - CAPTURAR TELA...]</code> e ainda sem imagem.
            Faça a captura e envie aqui — sem precisar abrir cada estação.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? "Carregando..." : "Recarregar"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por estação ou impresso..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          value={dayFilter}
          onChange={(e) => setDayFilter(e.target.value)}
        >
          <option value="">Todos os dias</option>
          {days.map((d) => (
            <option key={d} value={d}>
              Dia {d}
            </option>
          ))}
        </select>
        <Badge variant="secondary">
          {filtered.length} pendente{filtered.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Carregando impressos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <Check className="mx-auto mb-2 h-6 w-6 text-green-500" />
          Nenhum impresso pendente. Tudo certo!
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, group]) => (
            <div key={day} className="space-y-2">
              <h3 className="font-display text-sm font-semibold text-muted-foreground">
                {day} · {group.length} impresso{group.length === 1 ? "" : "s"}
              </h3>
              <div className="space-y-2">
                {group.map((it) => (
                  <PendingRow
                    key={`${it.stationId}-${it.materialIndex}`}
                    item={it}
                    onDone={() => removeItem(it.stationId, it.materialIndex)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingRow({ item, onDone }: { item: PendingItem; onDone: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 10MB).");
      return;
    }
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? "anon";
      const ext = file.name.split(".").pop() || "png";
      const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("station-materials")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("station-materials").getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      // Re-fetch current materials, patch the target index, save back.
      const { data: row, error: getErr } = await supabase
        .from("custom_stations")
        .select("deliverable_materials")
        .eq("id", item.stationId)
        .maybeSingle();
      if (getErr) throw getErr;
      const mats = Array.isArray(row?.deliverable_materials)
        ? ([...(row!.deliverable_materials as Material[])])
        : [];
      const target = mats[item.materialIndex];
      if (!target) throw new Error("Impresso não encontrado (índice mudou).");
      const cleanedContent = (target.content ?? "")
        .replace(PLACEHOLDER_RE, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      mats[item.materialIndex] = {
        ...target,
        imageUrl: publicUrl,
        content: cleanedContent,
      };
      const { error: updErr } = await supabase
        .from("custom_stations")
        .update({ deliverable_materials: mats as unknown as never })
        .eq("id", item.stationId);
      if (updErr) throw updErr;

      setDone(true);
      toast.success("Imagem enviada e salva.");
      setTimeout(onDone, 600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Falha no upload", { description: msg });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
      <ImageIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/app/admin/estacoes/$id"
            params={{ id: item.stationId }}
            className="truncate font-medium hover:underline"
            title={item.stationTitle}
          >
            {item.stationTitle}
          </Link>
          <Badge variant="outline" className="text-xs">
            {item.materialName}
          </Badge>
          {item.page !== null && (
            <Badge variant="secondary" className="text-xs">
              Página {item.page}
            </Badge>
          )}
          {item.day && (
            <Badge variant="secondary" className="text-xs">
              Dia {item.day}
            </Badge>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{item.rawPlaceholder}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      {done ? (
        <Badge className="gap-1 bg-green-500/15 text-green-600">
          <Check className="h-3 w-3" /> Enviado
        </Badge>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4" /> {uploading ? "Enviando..." : "Enviar imagem"}
        </Button>
      )}
    </div>
  );
}