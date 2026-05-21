import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/app/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Admin — REVMED" }] }),
});

function AdminLayout() {
  const { roles, loading } = useAuth();
  const nav = useNavigate();

  const allowed = roles.includes("admin");

  useEffect(() => {
    if (!loading && !allowed) nav({ to: "/app" });
  }, [loading, allowed, nav]);

  if (loading) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-mint" />
        <h2 className="mt-3 font-display text-xl font-bold">Área administrativa</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sua conta não tem permissão.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3 py-1 text-xs font-medium text-medical">
          <ShieldCheck className="h-3.5 w-3.5" /> Painel administrativo
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">Gestão da plataforma</h1>
      </div>
      <Outlet />
    </div>
  );
}
