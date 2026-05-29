import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { revealSecrets } from "@/lib/reveal-secrets.functions";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/admin/export-secrets")({
  component: ExportSecrets,
});

function ExportSecrets() {
  const fn = useServerFn(revealSecrets);
  const { data, isLoading, error } = useQuery({
    queryKey: ["reveal-secrets"],
    queryFn: () => fn({}),
  });

  if (isLoading) return <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Lendo secrets...</div>;
  if (error) return <div className="text-sm text-destructive">Erro: {(error as Error).message}</div>;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
        ⚠️ Página temporária — copie os valores e <strong>delete este arquivo</strong> (<code>src/routes/app.admin.export-secrets.tsx</code> + <code>src/lib/reveal-secrets.functions.ts</code>) depois.
      </div>
      <div className="space-y-3">
        {Object.entries(data ?? {}).map(([name, value]) => (
          <div key={name} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold">{name}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(value ?? "");
                  toast.success(`${name} copiado`);
                }}
                disabled={!value}
              >
                <Copy className="mr-1 h-3 w-3" /> Copiar
              </Button>
            </div>
            <pre className="mt-2 max-w-full overflow-x-auto rounded bg-background p-2 font-mono text-xs">
              {value ?? "(não configurado)"}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}