/**
 * Skeleton de carregamento do dashboard.
 * Reproduz a estrutura visual (boas-vindas, desempenho, histórico) enquanto
 * os dados reais estão sendo buscados — sem usar mensagens de "preparando".
 */
export function DashboardSkeleton() {
  return (
    <div
      className="relative mx-auto max-w-7xl space-y-6 animate-pulse"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando dashboard"
    >
      {/* Top row: welcome + 2 stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-card">
          <div className="h-3 w-24 rounded bg-muted/60" />
          <div className="mt-3 h-7 w-48 rounded-md bg-muted/70" />
          <div className="mt-4 h-3 w-3/4 rounded bg-muted/40" />
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-card">
          <div className="h-3 w-20 rounded bg-muted/60" />
          <div className="mt-3 h-9 w-24 rounded-md bg-muted/70" />
          <div className="mt-4 h-2 w-full rounded-full bg-muted/40" />
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-card">
          <div className="h-3 w-28 rounded bg-muted/60" />
          <div className="mt-3 h-9 w-20 rounded-md bg-muted/70" />
          <div className="mt-4 h-3 w-2/3 rounded bg-muted/40" />
        </div>
      </div>

      {/* Desempenho por especialidade */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div className="h-5 w-56 rounded-md bg-muted/60" />
          <div className="h-7 w-20 rounded-md bg-muted/40" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3 w-32 rounded bg-muted/50" />
                <div className="h-3 w-10 rounded bg-muted/50" />
              </div>
              <div className="h-2 w-full rounded-full bg-muted/30" />
            </div>
          ))}
        </div>
      </div>

      {/* Histórico */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 rounded-md bg-muted/60" />
          <div className="h-7 w-24 rounded-md bg-muted/40" />
        </div>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-border/50 p-3"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="h-9 w-9 shrink-0 rounded-full bg-muted/50" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3 w-2/3 rounded bg-muted/60" />
                  <div className="h-2.5 w-1/3 rounded bg-muted/40" />
                </div>
              </div>
              <div className="h-6 w-12 shrink-0 rounded-md bg-muted/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
