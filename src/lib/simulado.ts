// Simulado state — multiple stations run in sequence, persisted in localStorage.
// Storage is keyed per user so simulados from one account don't leak to another.

export type SimuladoStationState = {
  id: string;
  title: string;
  specialty: string;
  checks: Record<string, number>;
  score: number;
  maxScore: number;
  completed: boolean;
};

export type Simulado = {
  id: string;
  name: string;
  createdAt: number;
  currentIndex: number;
  finished: boolean;
  stations: SimuladoStationState[];
  roomId?: string;
  roomCode?: string;
};

const BASE_KEY = "estacao:simulados";
function keyFor(userId: string | null | undefined) {
  return userId ? `${BASE_KEY}:${userId}` : BASE_KEY;
}

function readAll(userId: string | null | undefined): Record<string, Simulado> {
  if (typeof window === "undefined" || !userId) return {};
  try {
    return JSON.parse(localStorage.getItem(keyFor(userId)) ?? "{}") as Record<string, Simulado>;
  } catch {
    return {};
  }
}

function writeAll(userId: string, map: Record<string, Simulado>) {
  localStorage.setItem(keyFor(userId), JSON.stringify(map));
  window.dispatchEvent(new Event("estacao:simulados"));
}

export function listSimulados(userId: string | null | undefined): Simulado[] {
  if (!userId) return [];
  return Object.values(readAll(userId)).sort((a, b) => b.createdAt - a.createdAt);
}

export function getSimulado(userId: string | null | undefined, id: string): Simulado | null {
  if (!userId) return null;
  return readAll(userId)[id] ?? null;
}

export function saveSimulado(userId: string, sim: Simulado) {
  const all = readAll(userId);
  all[sim.id] = sim;
  writeAll(userId, all);
}

export function deleteSimulado(userId: string, id: string) {
  const all = readAll(userId);
  delete all[id];
  writeAll(userId, all);
}

export function createSimulado(
  userId: string,
  name: string,
  stations: { id: string; title: string; specialty: string }[],
): Simulado {
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
  saveSimulado(userId, sim);
  return sim;
}
