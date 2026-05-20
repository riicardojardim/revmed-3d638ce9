import { useState } from "react";
import { Printer, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadCandidatePDF } from "@/lib/station-pdf";

interface Props {
  stationId: string;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "ghost" | "secondary";
  iconOnly?: boolean;
}

export function StationPDFButton({ stationId, size = "sm", variant = "outline", iconOnly = false }: Props) {
  const [loading, setLoading] = useState(false);

  async function fetchData() {
    const [{ data: station, error: e1 }, { data: items, error: e2 }] = await Promise.all([
      supabase.from("custom_stations").select("*").eq("id", stationId).maybeSingle(),
      supabase
        .from("station_checklist_items")
        .select("*")
        .eq("station_id", stationId)
        .order("order_index"),
    ]);
    if (e1 || e2 || !station) throw new Error(e1?.message || e2?.message || "Estação não encontrada");
    return { station, items: items ?? [] };
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size={size}
          variant={variant}
          onClick={(e) => e.stopPropagation()}
          title="Gerar PDF para impressão"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          {!iconOnly && <span className="ml-1.5 hidden sm:inline">PDF</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel>Imprimir esta estação</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!!loading}
          onClick={async () => {
            try {
              setLoading(true);
              const { station, items } = await fetchData();
              await downloadCandidatePDF(station as never, items as never);
              toast.success("PDF do candidato gerado");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Falha ao gerar PDF");
            } finally {
              setLoading(false);
            }
          }}
        >
          <User className="h-4 w-4" /> PDF do candidato
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
