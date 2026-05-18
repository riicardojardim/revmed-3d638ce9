import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, Search } from "lucide-react";

export const Route = createFileRoute("/app/aulas")({
  component: Aulas,
  head: () => ({ meta: [{ title: "Aulas — Estação Revalida" }] }),
});

const areas = [
  { name: "Clínica", color: "from-blue-500/80 to-blue-600" },
  { name: "Cirurgia", color: "from-violet-500/80 to-violet-600" },
  { name: "Pediatria", color: "from-amber-500/80 to-amber-600" },
  { name: "G.O.", color: "from-pink-500/80 to-pink-600" },
  { name: "MFC", color: "from-emerald-500/80 to-emerald-600" },
  { name: "Preventiva", color: "from-orange-500/80 to-orange-600" },
];

function Aulas() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Aulas</h1>
        <p className="text-sm text-muted-foreground">Esqueletos das grandes áreas e procedimentos.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input placeholder="Buscar uma aula..." className="flex-1 bg-transparent text-sm outline-none" />
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-bold">Esqueletos das Grandes Áreas</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3">
          {areas.map((a) => (
            <div
              key={a.name}
              className={`group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br ${a.color} p-4 text-white shadow-card transition-transform hover:scale-[1.02]`}
            >
              <GraduationCap className="absolute right-4 top-4 h-7 w-7 opacity-50" />
              <div className="font-display text-xl font-bold">{a.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
