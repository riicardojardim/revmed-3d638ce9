import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/app/sala/$code/")({
  component: RoomEntry,
});

/**
 * Lobby removido. Quando alguém acessa /app/sala/$code/ pelo link de convite,
 * ele é automaticamente registrado como candidato e redirecionado para a
 * tela de candidato. O host (ator) controla tudo a partir do seu painel.
 */
function RoomEntry() {
  const { code } = Route.useParams();
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (loading || !user || ran.current) return;
    ran.current = true;
    (async () => {
      const { data: r } = await supabase
        .from("training_rooms")
        .select("id, host_id")
        .eq("code", code)
        .maybeSingle();
      if (!r) {
        toast.error("Sala não encontrada");
        nav({ to: "/app/checklists", replace: true });
        return;
      }
      // Host vai direto pro painel de ator/paciente
      if (r.host_id === user.id) {
        nav({ to: "/app/sala/$code/paciente", params: { code }, replace: true });
        return;
      }
      // Garante participação como candidato
      const { data: existing } = await supabase
        .from("training_room_participants")
        .select("id, role")
        .eq("room_id", r.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) {
        await supabase.from("training_room_participants").insert({
          room_id: r.id,
          user_id: user.id,
          role: "candidato",
          is_ready: true,
          display_name: profile?.full_name ?? null,
        });
      } else if (existing.role !== "candidato") {
        await supabase
          .from("training_room_participants")
          .update({ role: "candidato", is_ready: true })
          .eq("id", existing.id);
      } else if (!existing) {
        // nada
      }
      nav({ to: "/app/sala/$code/candidato", params: { code }, replace: true });
    })();
  }, [loading, user?.id, code]);

  return (
    <div className="p-6 text-sm text-muted-foreground">Entrando na sala…</div>
  );
}
