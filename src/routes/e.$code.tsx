import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/e/$code")({
  component: ShortInvite,
  head: () => ({ meta: [{ title: "Entrar na sala — Estação Revalida" }] }),
});

function ShortInvite() {
  const { code } = Route.useParams();
  const nav = useNavigate();
  useEffect(() => {
    nav({ to: "/app/entrar/$code", params: { code }, replace: true });
  }, [code, nav]);
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Abrindo sua sala…
    </div>
  );
}
