import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/app/entrar/$code")({
  component: JoinRoom,
  head: () => ({ meta: [{ title: "Entrando na sala — REVMED" }] }),
});

function JoinRoom() {
  const { code } = Route.useParams();
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const displayName =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    (user?.user_metadata?.name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    null;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Salva onde voltar depois do login
      try { sessionStorage.setItem("post_login_redirect", `/app/entrar/${code}`); } catch { /* ignore */ }
      nav({ to: "/login" });
      return;
    }
    (async () => {
      const { data: room, error: rErr } = await supabase
        .from("training_rooms")
        .select("id, code, host_id")
        .eq("code", code)
        .maybeSingle();
      if (rErr || !room) {
        setError("Sala não encontrada. Confirme o link com quem te convidou.");
        return;
      }
      // Se o usuário é o próprio ator (host), entra como paciente
      const targetRole = user.id === room.host_id ? "paciente" : "candidato";

      const { data: existing } = await supabase
        .from("training_room_participants")
        .select("id, role, display_name")
        .eq("room_id", room.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        const { error: insErr } = await supabase
          .from("training_room_participants")
          .insert({ room_id: room.id, user_id: user.id, role: targetRole, display_name: displayName });
        if (insErr) {
          setError(insErr.message);
          return;
        }
      } else if (!existing.display_name && displayName) {
        await supabase
          .from("training_room_participants")
          .update({ display_name: displayName })
          .eq("id", existing.id);
      }

      // Candidato vai direto para a sua sala (sem passar pela tela "Escolha seu papel").
      // Host/ator continua indo para a página da sala para iniciar/gerenciar.
      if (targetRole === "candidato") {
        nav({ to: "/app/sala/$code/candidato", params: { code }, replace: true });
      } else {
        nav({ to: "/app/sala/$code", params: { code }, replace: true });
      }
    })();
  }, [loading, user?.id, profile?.full_name, code]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-20 text-center">
      {error ? (
        <div className="space-y-3">
          <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" />
          <div className="text-sm text-foreground">{error}</div>
        </div>
      ) : (
        <div className="space-y-3">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-mint" />
          <div className="text-sm text-muted-foreground">Entrando na estação...</div>
        </div>
      )}
    </div>
  );
}
