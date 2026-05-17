import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DoorOpen, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/entrar/")({
  component: EntrarCodigo,
  head: () => ({ meta: [{ title: "Entrar em checklist — Estação Revalida" }] }),
});

function EntrarCodigo() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/5 px-3 py-1 text-xs font-medium text-medical">
          <DoorOpen className="h-3.5 w-3.5" /> Acesso rápido
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold md:text-3xl">Entrar em um checklist</h1>
        <p className="text-sm text-muted-foreground">Digite ou cole o código compartilhado.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <label className="block text-xs uppercase tracking-wider text-muted-foreground">Código</label>
        <div className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex: A1B2C3"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm uppercase tracking-wider outline-none focus:border-mint"
          />
          <Button
            variant="hero"
            onClick={() => {
              const c = code.trim();
              if (!c) return toast.error("Digite um código.");
              nav({ to: "/app/entrar/$code", params: { code: c } });
            }}
          >
            <Search className="h-4 w-4" /> Buscar
          </Button>
        </div>
      </div>
    </div>
  );
}
