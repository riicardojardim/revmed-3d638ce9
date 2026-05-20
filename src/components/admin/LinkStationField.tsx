import { useEffect, useMemo, useState } from "react";
import { Link2, X, Check, ChevronsUpDown, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type StationOpt = { id: string; title: string; specialty: string };

export function LinkStationField({
  table,
  rowId,
  stationId,
  onChange,
}: {
  table: "flashcard_decks" | "summaries";
  rowId: string;
  stationId: string | null;
  onChange: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [stations, setStations] = useState<StationOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("custom_stations")
        .select("id, title, specialty")
        .order("title", { ascending: true })
        .limit(500);
      if (!cancelled) {
        setStations(((data ?? []) as StationOpt[]).filter((s) => s.title?.trim()));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = useMemo(
    () => stations.find((s) => s.id === stationId) ?? null,
    [stations, stationId],
  );

  async function setStation(nextId: string | null) {
    setBusy(true);
    const { error } = await supabase
      .from(table)
      .update({ station_id: nextId })
      .eq("id", rowId);
    setBusy(false);
    if (error) {
      toast.error("Falha ao conectar", { description: error.message });
      return;
    }
    onChange(nextId);
    toast.success(nextId ? "Conectado à estação" : "Conexão removida");
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Estação conectada
        </span>
      </div>

      {stationId && current ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 space-y-2">
          <div className="text-sm font-medium leading-snug">{current.title}</div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">{current.specialty}</Badge>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Link
              to="/app/admin/estacoes/$id"
              params={{ id: current.id }}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold hover:bg-muted"
            >
              <ExternalLink className="h-3 w-3" /> Abrir estação
            </Link>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]">
                  Trocar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0" align="start">
                <StationPicker
                  stations={stations}
                  loading={loading}
                  selectedId={stationId}
                  onSelect={(id) => void setStation(id)}
                />
              </PopoverContent>
            </Popover>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700"
              disabled={busy}
              onClick={() => void setStation(null)}
            >
              <X className="h-3 w-3" /> Desconectar
            </Button>
          </div>
        </div>
      ) : stationId && !current ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs">
          Conectado a uma estação que não foi encontrada (id: {stationId.slice(0, 8)}…).{" "}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1 text-[11px] text-rose-600"
            onClick={() => void setStation(null)}
          >
            Desconectar
          </Button>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span className="inline-flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> Conectar à estação
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <StationPicker
              stations={stations}
              loading={loading}
              selectedId={stationId}
              onSelect={(id) => void setStation(id)}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function StationPicker({
  stations,
  loading,
  selectedId,
  onSelect,
}: {
  stations: StationOpt[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Command>
      <CommandInput placeholder="Buscar estação por título..." />
      <CommandList>
        {loading && <div className="p-3 text-xs text-muted-foreground">Carregando...</div>}
        <CommandEmpty>Nenhuma estação encontrada.</CommandEmpty>
        <CommandGroup>
          {stations.map((s) => (
            <CommandItem
              key={s.id}
              value={`${s.title} ${s.specialty}`}
              onSelect={() => onSelect(s.id)}
              className="flex items-start gap-2"
            >
              <Check
                className={cn(
                  "mt-0.5 h-4 w-4",
                  selectedId === s.id ? "opacity-100" : "opacity-0",
                )}
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{s.title}</div>
                <div className="text-[11px] text-muted-foreground">{s.specialty}</div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
