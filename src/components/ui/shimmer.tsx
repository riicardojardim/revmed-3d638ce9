/**
 * Skeleton com shimmer mint reutilizável.
 *
 * Uso:
 *   <Shimmer className="h-14 rounded-xl" />          // 1 bloco
 *   <Shimmer rows={3} className="h-14 rounded-xl" /> // 3 blocos em coluna
 */
export function Shimmer({
  className = "h-12 rounded-xl",
  rows = 1,
}: {
  className?: string;
  rows?: number;
}) {
  const items = Array.from({ length: Math.max(1, rows) });
  return (
    <div className="space-y-2.5">
      {items.map((_, i) => (
        <div
          key={i}
          className={`relative overflow-hidden border border-border/60 bg-muted/30 ${className}`}
          aria-hidden
        >
          <div className="absolute inset-0 -translate-x-full animate-[er_shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-mint/15 to-transparent" />
        </div>
      ))}
      <style>{`@keyframes er_shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
    </div>
  );
}
