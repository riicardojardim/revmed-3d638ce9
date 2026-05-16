// Simulado state — multiple stations run in sequence, persisted in localStorage.
// Next station unlocks only when current PEP is fully scored.

export type SimuladoStationState = {
  id: string;            // station id (uuid or mock id)
  title: string;
  specialty: string;
  checks: Record<string, number>; // checklist item id -> chosen level points
  score: number;         // sum of selected points
  maxScore: number;      // sum of max points
  completed: boolean;    // all items scored
};

export type Simulado = {
  id: string;
  name: string;
  createdAt: number;
  currentIndex: number;
  finished: boolean;
  stations: SimuladoStationState[];
};

const KEY = "estacao:simulados";

function readAll(): Record<string, Simulado> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, Simulado>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, Simulado>) {
  localStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new Event("estacao:simulados"));
}

export function listSimulados(): Simulado[] {
  return Object.values(readAll()).sort((a, b) => b.createdAt - a.createdAt);
}

export function getSimulado(id: string): Simulado | null {
  return readAll()[id] ?? null;
}

export function saveSimulado(sim: Simulado) {
  const all = readAll();
  all[sim.id] = sim;
  writeAll(all);
}

export function deleteSimulado(id: string) {
  const all = readAll();
  delete all[id];
  writeAll(all);
}

export function createSimulado(name: string, stations: { id: string; title: string; specialty: string }[]): Simulado {
  const sim: Simulado = {
    id: Math.random().toString(36).slice(2, 10),
    name: name.trim() || "Simulado",
    createdAt: Date.now(),
    currentIndex: 0,
    finished: false,
    stations: stations.map((s) => ({
      id: s.id,
      title: s.title,
      specialty: s.specialty,
      checks: {},
      score: 0,
      maxScore: 0,
      completed: false,
    })),
  };
  saveSimulado(sim);
  return sim;
}
