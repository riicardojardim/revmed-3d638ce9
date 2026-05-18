import { useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Props = {
  scope: "flashcards" | "attempts";
  label?: string;
  onDone?: () => void;
};

export function ResetStatsButton({ scope, label = "Resetar estatísticas", onDone }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleReset() {
    if (!user) return;
    setLoading(true);
    const table = scope === "flashcards" ? "flashcard_reviews" : "attempts";
    const { error } = await supabase.from(table).delete().eq("user_id", user.id);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Estatísticas resetadas");
    setOpen(false);
    onDone?.();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/30">
          <RotateCcw className="h-4 w-4 mr-1.5" /> {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resetar estatísticas?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação apaga permanentemente {scope === "flashcards" ? "todo o seu progresso nos flashcards" : "todo o seu histórico de estações"} e não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); handleReset(); }} disabled={loading} className="bg-rose-500 hover:bg-rose-600">
            {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
            Sim, resetar tudo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
