export type ParsedChecklistLevel = {
  label: string;
  points: number;
  description: string;
};

export type ParsedChecklistItem = {
  description: string;
  category: string;
  points: number;
  levels: ParsedChecklistLevel[];
};

export type ParsedImportedStation = {
  title: string;
  specialty: string;
  difficulty: "Fácil" | "Intermediário" | "Avançado";
  duration_minutes: number;
  clinical_case: string;
  candidate_task: string;
  patient_info: string | null;
  support_materials: string | null;
  patient_script: string | null;
  evaluator_notes: string | null;
  scoring_criteria: string | null;
  post_materials: string | null;
  competencies: string[];
  checklist_items: ParsedChecklistItem[];
};

type SectionKey =
  | "clinical_case"
  | "candidate_task"
  | "patient_info"
  | "patient_script"
  | "support_materials"
  | "pep";

const SECTION_LABELS: Array<{ key: SectionKey; aliases: string[] }> = [
  { key: "clinical_case", aliases: ["CENARIO DE ATUACAO"] },
  { key: "candidate_task", aliases: ["TAREFAS DO CANDIDATO", "TAREFAS"] },
  { key: "patient_info", aliases: ["DESCRICAO DO CASO"] },
  {
    key: "patient_script",
    aliases: [
      "ORIENTACOES DO ATRIZ/ATOR",
      "ORIENTACOES DO ATOR/ATRIZ",
      "ORIENTACOES AO ATOR/ATRIZ",
      "ORIENTACOES AO ATOR",
      "ORIENTACOES A ATRIZ",
    ],
  },
  { key: "support_materials", aliases: ["IMPRESSOS"] },
  { key: "pep", aliases: ["PEP", "CHECKLIST", "PEP CHECKLIST DE AVALIACAO", "PADRAO ESPERADO DE PROCEDIMENTO"] },
];

const STATION_MARKER_RE = /^\s*(?:=+\s*)?ESTA[ÇC]A?O\s*\d{0,3}.*$/i;

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMultilineText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

function emptyToNull(value: string | null | undefined): string | null {
  const cleaned = cleanMultilineText(value ?? "");
  if (!cleaned) return null;
  return /^nao informado$/i.test(normalizeHeader(cleaned)) ? null : cleaned;
}

function roundPoint(value: number): number {
  return Math.round(value * 100) / 100;
}

function extractPoints(value: string): number | null {
  const match = value.match(/(\d+(?:[.,]\d+)?)\s*(?:pt|pts|pontos?)?\b/i);
  if (!match) return null;
  const parsed = Number(match[1].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDurationMinutes(value: string): number {
  const match = value.match(/(\d{1,2})\s*(?:min|minutos?)/i);
  if (!match) return 10;
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(3, Math.min(30, Math.round(parsed)));
}

function normalizeSpecialty(value: string | undefined): ParsedImportedStation["specialty"] {
  const normalized = normalizeHeader(value ?? "");
  if (/CIRURG/.test(normalized)) return "Cirurgia";
  if (/PEDIATR/.test(normalized)) return "Pediatria";
  if (/GINECO|OBST|GO\b/.test(normalized)) return "Ginecologia e Obstetrícia";
  if (/FAMILIA|COMUNIDADE|PREVENTIVA|ATENCAO PRIMARIA|UBS|PSF/.test(normalized)) return "Medicina de Família e Comunidade";
  return "Clínica Médica";
}

function splitStationBlocks(text: string): Array<{ header: string; body: string }> {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const markers: number[] = [];

  lines.forEach((line, index) => {
    if (STATION_MARKER_RE.test(line.trim())) markers.push(index);
  });

  if (markers.length === 0) {
    return [{ header: "", body: text }];
  }

  return markers.map((start, index) => {
    const end = index + 1 < markers.length ? markers[index + 1] : lines.length;
    return {
      header: lines[start].trim(),
      body: lines.slice(start + 1, end).join("\n"),
    };
  });
}

function detectSection(line: string): { key: SectionKey; inline: string } | null {
  const normalized = normalizeHeader(line);
  for (const section of SECTION_LABELS) {
    for (const alias of section.aliases) {
      if (normalized === alias || normalized.startsWith(`${alias} `)) {
        const inline = line.includes(":") ? line.slice(line.indexOf(":") + 1).trim() : "";
        return { key: section.key, inline };
      }
    }
  }
  return null;
}

function countRecognizedHeaders(text: string): number {
  const seen = new Set<SectionKey>();
  text.replace(/\r\n/g, "\n").split("\n").forEach((line) => {
    const section = detectSection(line);
    if (section) seen.add(section.key);
  });
  return seen.size;
}

function isChecklistItemStart(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || /^\(\d+\)/.test(trimmed)) return false;
  return /^(?:#\d+|\d{1,3}\s*[.)\-–—]\s+\S+|\d{1,3}\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ])/.test(trimmed);
}

function splitChecklistBlocks(text: string): string[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (isChecklistItemStart(line) && current.some((entry) => entry.trim())) {
      blocks.push(current.join("\n"));
      current = [line];
      continue;
    }
    current.push(line);
  }

  if (current.some((entry) => entry.trim())) {
    blocks.push(current.join("\n"));
  }

  return blocks;
}

function parseLevelLabel(line: string): { label: string; remainder: string } | null {
  const match = line.match(/^(Inadequado|Parcialmente adequado|Adequado)\b\s*[:\-–—]?\s*(.*)$/i);
  if (!match) return null;
  const normalized = normalizeHeader(match[1]);
  const label = normalized === "PARCIALMENTE ADEQUADO" ? "Parcialmente adequado" : normalized === "ADEQUADO" ? "Adequado" : "Inadequado";
  return { label, remainder: match[2]?.trim() ?? "" };
}

function parseChecklistItem(block: string): ParsedChecklistItem | null {
  const rawLines = block.split(/\r?\n/).map((line) => line.replace(/\s+$/g, ""));
  const firstIndex = rawLines.findIndex((line) => line.trim());
  if (firstIndex === -1) return null;

  const heading = rawLines[firstIndex].trim();
  const headingPoints = extractPoints(heading) ?? 0;
  const category = heading
    .replace(/^#/, "")
    .replace(/^\d{1,3}\s*[.)\-–—]?\s*/, "")
    .replace(/\(?\d+(?:[.,]\d+)?\s*(?:pt|pts|pontos?)\)?/gi, "")
    .replace(/\s*[:\-–—]\s*$/g, "")
    .trim();

  const descriptionLines: string[] = [];
  const levels: ParsedChecklistLevel[] = [];
  let currentLevel: { label: string; points: number | null; descriptionLines: string[] } | null = null;

  const flushLevel = () => {
    if (!currentLevel) return;
    levels.push({
      label: currentLevel.label,
      points: currentLevel.points ?? 0,
      description: cleanMultilineText(currentLevel.descriptionLines.join("\n")),
    });
    currentLevel = null;
  };

  for (const line of rawLines.slice(firstIndex + 1)) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentLevel) currentLevel.descriptionLines.push("");
      else if (descriptionLines.length > 0) descriptionLines.push("");
      continue;
    }

    const level = parseLevelLabel(trimmed);
    if (level) {
      flushLevel();
      const sameLinePoints = extractPoints(level.remainder);
      const cleanedRemainder = sameLinePoints == null ? level.remainder : level.remainder.replace(/(\d+(?:[.,]\d+)?)\s*(?:pt|pts|pontos?)?/i, "").replace(/^[:\-–—]\s*/, "").trim();
      currentLevel = {
        label: level.label,
        points: sameLinePoints,
        descriptionLines: cleanedRemainder ? [cleanedRemainder] : [],
      };
      continue;
    }

    if (currentLevel) {
      if (currentLevel.points == null) {
        const linePoints = extractPoints(trimmed);
        const isPointsOnly = /^\d+(?:[.,]\d+)?$/.test(trimmed);
        if (linePoints != null && isPointsOnly) {
          currentLevel.points = linePoints;
          continue;
        }
      }
      currentLevel.descriptionLines.push(line);
      continue;
    }

    descriptionLines.push(line);
  }

  flushLevel();

  let maxPoints = Math.max(headingPoints, ...levels.map((level) => level.points), 0);
  const adequateIndex = levels.findIndex((level) => normalizeHeader(level.label) === "ADEQUADO");
  const partialIndex = levels.findIndex((level) => normalizeHeader(level.label) === "PARCIALMENTE ADEQUADO");

  if (adequateIndex >= 0 && levels[adequateIndex].points <= 0 && maxPoints > 0) {
    levels[adequateIndex] = { ...levels[adequateIndex], points: maxPoints };
  }
  if (partialIndex >= 0 && levels[partialIndex].points <= 0 && maxPoints > 0) {
    levels[partialIndex] = { ...levels[partialIndex], points: roundPoint(maxPoints / 2) };
  }

  maxPoints = Math.max(headingPoints, ...levels.map((level) => level.points), 0);

  return {
    category: category || "Sem categoria",
    description: cleanMultilineText(descriptionLines.join("\n")),
    points: maxPoints,
    levels,
  };
}

function parsePepChecklist(text: string): ParsedChecklistItem[] {
  const cleaned = emptyToNull(text);
  if (!cleaned) return [];
  return splitChecklistBlocks(cleaned)
    .map(parseChecklistItem)
    .filter((item): item is ParsedChecklistItem => Boolean(item));
}

function parseStationTitle(header: string, fallback: string): string {
  const cleaned = header.replace(/^=+\s*|\s*=+$/g, "").trim();
  if (cleaned) return cleaned;
  return fallback;
}

export function normalizeImportedStations<T extends ParsedImportedStation>(stations: T[]): T[] {
  return stations.map((station) => {
    const checklistItems = (station.checklist_items ?? []).map((item) => {
      const levels = (item.levels ?? []).map((level) => ({
        label: (level.label ?? "").trim(),
        points: Number.isFinite(level.points) ? roundPoint(level.points) : 0,
        description: cleanMultilineText(level.description ?? ""),
      }));

      let maxPoints = Math.max(Number(item.points) || 0, ...levels.map((level) => level.points), 0);
      const adequateIndex = levels.findIndex((level) => normalizeHeader(level.label) === "ADEQUADO");
      const partialIndex = levels.findIndex((level) => normalizeHeader(level.label) === "PARCIALMENTE ADEQUADO");

      if (adequateIndex >= 0 && levels[adequateIndex].points <= 0 && maxPoints > 0) {
        levels[adequateIndex] = { ...levels[adequateIndex], points: maxPoints };
      }
      if (partialIndex >= 0 && levels[partialIndex].points <= 0 && maxPoints > 0) {
        levels[partialIndex] = { ...levels[partialIndex], points: roundPoint(maxPoints / 2) };
      }

      maxPoints = Math.max(Number(item.points) || 0, ...levels.map((level) => level.points), 0);

      return {
        ...item,
        category: cleanMultilineText(item.category ?? "") || "Sem categoria",
        description: cleanMultilineText(item.description ?? ""),
        points: maxPoints,
        levels,
      };
    });

    return {
      ...station,
      title: cleanMultilineText(station.title || "Estação sem título") || "Estação sem título",
      clinical_case: cleanMultilineText(station.clinical_case ?? ""),
      candidate_task: cleanMultilineText(station.candidate_task ?? ""),
      patient_info: emptyToNull(station.patient_info),
      support_materials: emptyToNull(station.support_materials),
      patient_script: emptyToNull(station.patient_script),
      evaluator_notes: emptyToNull(station.evaluator_notes),
      scoring_criteria: emptyToNull(station.scoring_criteria),
      post_materials: emptyToNull(station.post_materials),
      duration_minutes: Math.max(3, Math.min(30, Math.round(Number(station.duration_minutes) || 10))),
      checklist_items: checklistItems,
    };
  });
}

export function parseStructuredStationsFromText(text: string, sourceLabel = "Texto colado"): ParsedImportedStation[] {
  if (countRecognizedHeaders(text) < 2) return [];

  return splitStationBlocks(text)
    .map((block, index) => {
      const sections: Record<SectionKey, string[]> = {
        clinical_case: [],
        candidate_task: [],
        patient_info: [],
        patient_script: [],
        support_materials: [],
        pep: [],
      };
      const meta: Record<string, string> = {};
      let currentSection: SectionKey | null = null;

      block.body.split(/\r?\n/).forEach((line) => {
        const section = detectSection(line);
        if (section) {
          currentSection = section.key;
          if (section.inline) sections[section.key].push(section.inline);
          return;
        }

        if (!currentSection) {
          const metaMatch = line.match(/^\s*([A-Za-zÀ-ÿ /]+)\s*:\s*(.+)\s*$/);
          if (metaMatch) {
            meta[normalizeHeader(metaMatch[1])] = metaMatch[2].trim();
          }
          return;
        }

        sections[currentSection].push(line);
      });

      const station: ParsedImportedStation = {
        title: parseStationTitle(block.header, `${sourceLabel} — Estação ${index + 1}`),
        specialty: normalizeSpecialty(meta.AREA),
        difficulty: "Intermediário",
        duration_minutes: parseDurationMinutes(meta.TEMPO ?? sections.candidate_task.join("\n")),
        clinical_case: cleanMultilineText(sections.clinical_case.join("\n")),
        candidate_task: cleanMultilineText(sections.candidate_task.join("\n")),
        patient_info: emptyToNull(sections.patient_info.join("\n")),
        support_materials: emptyToNull(sections.support_materials.join("\n")),
        patient_script: emptyToNull(sections.patient_script.join("\n")),
        evaluator_notes: null,
        scoring_criteria: null,
        post_materials: null,
        competencies: [],
        checklist_items: parsePepChecklist(sections.pep.join("\n")),
      };

      return station;
    })
    .filter((station) => {
      return Boolean(
        station.clinical_case ||
          station.candidate_task ||
          station.patient_info ||
          station.patient_script ||
          station.support_materials ||
          station.checklist_items.length,
      );
    });
}