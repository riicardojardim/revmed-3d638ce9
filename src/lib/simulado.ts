// Simulado state — multiple stations run in sequence, persisted in localStorage.
// Single-station runs are temporary Estações and stay out of the saved Simulados list.

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
const SINGLE_STATION_KEY = "estacao:estacoes-ativas";
function keyFor(userId: string | null | undefined) {
  return userId ? `${BASE_KEY}:${userId}` : BASE_KEY;
}

function singleStationKeyFor(userId: string | null | undefined) {
  return userId ? `${SINGLE_STATION_KEY}:${userId}` : SINGLE_STATION_KEY;
}

function readAll(userId: string | null | undefined): Record<string, Simulado> {
  if (typeof window === "undefined" || !userId) return {};
  try {
    return JSON.parse(localStorage.getItem(keyFor(userId)) ?? "{}") as Record<string, Simulado>;
  } catch {
    return {};
  }
}

function readSingleStations(userId: string | null | undefined): Record<string, Simulado> {
  if (typeof window === "undefined" || !userId) return {};
  try {
    return JSON.parse(sessionStorage.getItem(singleStationKeyFor(userId)) ?? "{}") as Record<string, Simulado>;
  } catch {
    return {};
  }
}

function writeAll(userId: string, map: Record<string, Simulado>) {
  localStorage.setItem(keyFor(userId), JSON.stringify(map));
  window.dispatchEvent(new Event("estacao:simulados"));
}

function writeSingleStations(userId: string, map: Record<string, Simulado>) {
  sessionStorage.setItem(singleStationKeyFor(userId), JSON.stringify(map));
  window.dispatchEvent(new Event("estacao:simulados"));
}

export function listSimulados(userId: string | null | undefined): Simulado[] {
  if (!userId) return [];
  return Object.values(readAll(userId))
    .filter((sim) => sim.stations.length >= 2)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getSimulado(userId: string | null | undefined, id: string): Simulado | null {
  if (!userId) return null;
  return readAll(userId)[id] ?? readSingleStations(userId)[id] ?? null;
}

export function saveSimulado(userId: string, sim: Simulado) {
  if (sim.stations.length < 2) {
    const temporary = readSingleStations(userId);
    temporary[sim.id] = sim;
    writeSingleStations(userId, temporary);
    return;
  }
  const all = readAll(userId);
  all[sim.id] = sim;
  writeAll(userId, all);
}

export function deleteSimulado(userId: string, id: string) {
  const all = readAll(userId);
  delete all[id];
  writeAll(userId, all);
  const temporary = readSingleStations(userId);
  delete temporary[id];
  writeSingleStations(userId, temporary);
}

export function createSimulado(
  userId: string,
  name: string,
  stations: { id: string; title: string; specialty: string }[],
): Simulado {
  const sim: Simulado = {
    id: (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-4${Math.random().toString(16).slice(2, 5)}-${Math.random().toString(16).slice(2, 6)}-${Math.random().toString(16).slice(2, 14)}`,
    name: name.trim() || (stations.length >= 2 ? "Simulado" : "Estação"),
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
