import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/app/entrar/$code")({
  component: JoinRoom,
  head: () => ({ meta: [{ title: "Entrando na sala — Estação Revalida" }] }),
});

function JoinRoom() {
  const { code } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);

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
        .select("id, role")
        .eq("room_id", room.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        const { error: insErr } = await supabase
          .from("training_room_participants")
          .insert({ room_id: room.id, user_id: user.id, role: targetRole });
        if (insErr) {
          setError(insErr.message);
          return;
        }
      }

      nav({
        to: "/app/sala/$code",
        params: { code },
        replace: true,
      });
    })();
  }, [loading, user?.id, code]);

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
