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
  { key: "clinical_case", aliases: ["CENARIO DE ATUACAO", "CENARIO"] },
  {
    key: "candidate_task",
    aliases: [
      "TAREFAS DO CANDIDATO",
      "TAREFA DO CANDIDATO",
      "ATIVIDADES DO CANDIDATO",
      "TAREFAS",
      "NOS PROXIMOS",
      "O CANDIDATO DEVERA",
      "VOCE DEVERA",
      "INFORMACOES PARA O PARTICIPANTE",
      "INFORMACOES PARA O CANDIDATO",
      "INSTRUCOES PARA O PARTICIPANTE",
      "INSTRUCOES PARA O A PARTICIPANTE",
    ],
  },
  {
    key: "patient_info",
    aliases: [
      "DESCRICAO DO CASO",
      "DESCRICAO DO CASO CLINICO",
      "HISTORIA CLINICA",
      "QUADRO CLINICO",
      "FICHA DO PACIENTE",
      "FICHA DE ATENDIMENTO",
      "FICHA DE ACOLHIMENTO",
    ],
  },
  {
    key: "patient_script",
    aliases: [
      "ORIENTACOES DO ATRIZ/ATOR",
      "ORIENTACOES DO ATOR/ATRIZ",
      "ORIENTACOES AO ATOR/ATRIZ",
      "ORIENTACOES AO ATOR",
      "ORIENTACOES A ATRIZ",
      "INSTRUCOES PARA O ATOR",
      "INSTRUCOES PARA O ATO",
    ],
  },
  {
    key: "support_materials",
    aliases: [
      "IMPRESSOS",
      "IMPRESSO",
      "MATERIAL/IMPRESSO",
      "MATERIAL IMPRESSO",
      "IMPRESSOS E MATERIAIS ENTREGAVEIS",
      "MATERIAIS ENTREGAVEIS",
      "MATERIAIS DE APOIO",
      "MATERIAL DE APOIO",
      "MATERIAL IMPRESSO",
    ],
  },
  {
    key: "pep",
    aliases: [
      "PEP",
      "CHECKLIST",
      "PEP CHECKLIST DE AVALIACAO",
      "PADRAO ESPERADO DE PROCEDIMENTO",
      "PADRAO ESPERADO DE RESPOSTA",
      "PADRAO ESPERADO",
      "ITENS DE DESEMPENHO AVALIADOS",
    ],
  },
];

const STATION_START_ALIASES = [
  "INSTRUCOES PARA O PARTICIPANTE",
  "INSTRUCOES PARA O A PARTICIPANTE",
  "INSTRUCOES AO PARTICIPANTE",
  "INSTRUCOES PARA O CANDIDATO",
  "INFORMACOES PARA O PARTICIPANTE",
  "INFORMACOES PARA O CANDIDATO",
];

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isStationMarker(line: string): boolean {
  const normalized = normalizeHeader(line).replace(/^=+\s*|\s*=+$/g, "");
  return /^ESTACAO\s*\d{0,3}\b/.test(normalized);
}

function isStationStartLine(line: string): boolean {
  const normalized = normalizeHeader(line);
  return isStationMarker(line) || STATION_START_ALIASES.includes(normalized);
}

function isStationMetaLine(line: string): boolean {
  const normalized = normalizeHeader(line);
  return Boolean(
    normalized &&
      (/^AREA\b/.test(normalized) ||
        /^ESPECIALIDADE\b/.test(normalized) ||
        /^ESTACAO\b/.test(normalized) ||
        /^AVALIACAO DE HABILIDADES CLINICAS/.test(normalized)),
  );
}

function cleanMultilineText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

function isDividerLine(value: string): boolean {
  return /^[=\-_.~*]{3,}$/.test(value.trim());
}

function isPageMarkerLine(value: string): boolean {
  return /^\s*-{2,}\s*P[aá]gina\s+\d+\s*-{0,}\s*$/i.test(value.trim());
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

function extractPointValuesFromLine(value: string): number[] {
  return Array.from(value.matchAll(/\b(\d+(?:[.,]\d+)?)\b/g))
    .map((match) => Number(match[1].replace(",", ".")))
    .filter((point) => Number.isFinite(point));
}

// Extrai pontuações inline do tipo:
//   "INADEQUADO = 0 | PARCIALMENTE ADEQUADO = 0,5 | ADEQUADO = 1"
//   "Inadequado: 0   Adequado: 1,0"
// Retorna mapa rótulo->pontos quando encontrado.
function extractInlineLevelScores(value: string): Record<string, number> {
  const result: Record<string, number> = {};
  const regex = /(PARCIALMENTE\s+ADEQUADO|INADEQUADO|ADEQUADO)\s*[:=\-–—]\s*(\d+(?:[.,]\d+)?)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value)) !== null) {
    const normalized = normalizeHeader(match[1]);
    const label =
      normalized === "PARCIALMENTE ADEQUADO"
        ? "Parcialmente adequado"
        : normalized === "ADEQUADO"
          ? "Adequado"
          : "Inadequado";
    const points = Number(match[2].replace(",", "."));
    if (Number.isFinite(points)) result[label] = points;
  }
  return result;
}

// Remove o trecho "PONTUAÇÃO (...): INADEQUADO = X | ADEQUADO = Y" de uma linha de título.
function stripInlineScoringFromHeading(value: string): string {
  return value
    .replace(/PONTUA[CÇ][AÃ]O[^:]*:\s*/i, "")
    .replace(/(PARCIALMENTE\s+ADEQUADO|INADEQUADO|ADEQUADO)\s*[:=]\s*\d+(?:[.,]\d+)?\s*\|?\s*/gi, "")
    .replace(/\s*\|\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseDurationMinutes(value: string): number {
  const match = value.match(/(\d{1,2})\s*(?:min|minutos?)/i);
  if (!match) return 10;
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(3, Math.min(30, Math.round(parsed)));
}

function mapNormalizedSpecialty(normalized: string): ParsedImportedStation["specialty"] | null {
  if (!normalized) return null;
  if (/\bCIRURG(?:IA|ICA|ICO)?\b|\bCG\b/.test(normalized)) return "Cirurgia";
  if (/\bPEDIATR(?:IA|ICO|ICA)?\b|\bPED\b/.test(normalized)) return "Pediatria";
  if (/GINECO|OBST|\bGO\b|TOCOGINECO/.test(normalized)) return "Ginecologia e Obstetrícia";
  if (/FAMILIA|COMUNIDADE|\bMFC\b|ATENCAO PRIMARIA|APS\b|UBS\b|PSF\b|SAUDE DA FAMILIA/.test(normalized)) {
    return "Medicina de Família e Comunidade";
  }
  if (/CLINICA MEDICA|\bCM\b|MEDICINA INTERNA/.test(normalized)) return "Clínica Médica";
  return null;
}

function normalizeSpecialty(value: string | undefined): ParsedImportedStation["specialty"] {
  return mapNormalizedSpecialty(normalizeHeader(value ?? "")) ?? "Clínica Médica";
}

function inferSpecialtyFromStationContent(station: ParsedImportedStation): ParsedImportedStation["specialty"] {
  return normalizeSpecialty([
    station.specialty,
    station.title,
    station.clinical_case,
    station.patient_info,
    station.candidate_task,
  ].filter(Boolean).join("\n"));
}

function extractHeaderSpecialtyContext(body: string): string {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const headerLines: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (headerLines.length > 0) break;
      continue;
    }
    if (isDividerLine(line) || isPageMarkerLine(line)) continue;
    if (detectSection(line)) break;
    headerLines.push(line);
    if (headerLines.length >= 12) break;
  }

  return headerLines.join("\n");
}

function splitStationBlocks(text: string): Array<{ header: string; body: string }> {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const explicitMarkers = new Set<number>();
  const fallbackMarkers = new Set<number>();

  const collectMarker = (index: number) => {
    let start = index;
    for (let back = index - 1; back >= Math.max(0, index - 3); back--) {
      const trimmed = lines[back].trim();
      if (!trimmed) continue;
      const normalized = normalizeHeader(trimmed);
      const prevNormalized = back > 0 ? normalizeHeader(lines[back - 1]) : "";
      if (
        isStationMetaLine(lines[back]) ||
        /^(AREA|ESPECIALIDADE)\b/.test(normalized) ||
        (/^(AREA|ESPECIALIDADE)$/.test(prevNormalized) && trimmed.length > 0)
      ) {
        start = back;
      }
      else break;
    }
    return start;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (isStationMarker(trimmed)) {
      explicitMarkers.add(collectMarker(index));
      return;
    }
    if (STATION_START_ALIASES.includes(normalizeHeader(trimmed))) {
      fallbackMarkers.add(collectMarker(index));
    }
  });

  const activeMarkers = explicitMarkers.size > 0 ? explicitMarkers : fallbackMarkers;
  const sortedMarkers = Array.from(activeMarkers).sort((a, b) => a - b);

  if (sortedMarkers.length === 0) {
    return [{ header: "", body: text }];
  }

  return sortedMarkers.map((start, index) => {
    const end = index + 1 < sortedMarkers.length ? sortedMarkers[index + 1] : lines.length;
    const header = lines.slice(start, Math.min(end, start + 2)).filter((line) => line.trim()).join(" — ").trim();
    return {
      header,
      body: lines.slice(start, end).join("\n"),
    };
  });
}

function detectSection(line: string): { key: SectionKey; inline: string } | null {
  const normalized = normalizeHeader(line);
  const trimmedLine = line.trim();
  for (const section of SECTION_LABELS) {
    for (const alias of section.aliases) {
      if (
        normalized === alias ||
        normalized.startsWith(`${alias} `) ||
        normalized.startsWith(`${alias}:`) ||
        (alias === "NOS PROXIMOS" && /^NOS PROXIMOS\s+\d{1,2}\s+MINUTOS/.test(normalized)) ||
        (alias === "IMPRESSO" && /^IMPRESSO\s*\d{1,3}\b/.test(normalized)) ||
        (alias === "MATERIAL/IMPRESSO" && /^MATERIAL\/?IMPRESSO\s*\d{1,3}\b/.test(normalized))
      ) {
        const inline =
          alias === "NOS PROXIMOS" || alias === "IMPRESSO" || alias === "MATERIAL/IMPRESSO"
            ? trimmedLine
            : trimmedLine
                .slice(Math.min(trimmedLine.length, alias.length))
                .replace(/^[:\-–—\s]+/, "")
                .trim();
        return { key: section.key, inline };
      }
    }
  }
  return null;
}

function extractPepFallbackFromBlock(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const startIndex = lines.findIndex((line) => /\b(PEP|CHECKLIST|PADRAO ESPERADO(?: DE (?:PROCEDIMENTO|RESPOSTA))?|ITENS DE DESEMPENHO AVALIADOS)\b/i.test(normalizeHeader(line)));
  if (startIndex === -1) return "";
  return lines.slice(startIndex).join("\n");
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
    const normalizedLine = normalizeHeader(line);
    if (
      isDividerLine(line) ||
      isPageMarkerLine(line) ||
      /^\s*(PEP|CHECKLIST|PADRAO ESPERADO(?: DE (?:PROCEDIMENTO|RESPOSTA))?)\s*$/i.test(normalizedLine) ||
      /^(PEP\s+CHECKLIST\s+DE\s+AVALIACAO|PADRAO\s+ESPERADO|ITENS\s+DE\s+DESEMPENHO\s+AVALIADOS)\b/.test(normalizedLine)
    ) {
      continue;
    }
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
  const headingPoints = (heading.match(/(\d+(?:[.,]\d+)?)\s*(?:pt|pts|pontos?)\b/i)?.[1] ? Number(heading.match(/(\d+(?:[.,]\d+)?)\s*(?:pt|pts|pontos?)\b/i)?.[1]?.replace(",", ".")) : null) ?? 0;
  const headingInlineScores = extractInlineLevelScores(heading);
  const category = stripInlineScoringFromHeading(
    heading
      .replace(/^#/, "")
      .replace(/^\d{1,3}\s*[.)\-–—]?\s*/, "")
      .replace(/\(?\d+(?:[.,]\d+)?\s*(?:pt|pts|pontos?)\)?/gi, "")
      .replace(/\s*[:\-–—]\s*$/g, ""),
  );

  // Coleta pontuações inline encontradas em qualquer linha do bloco (heading, "Itens:", etc.)
  const inlineScores: Record<string, number> = { ...headingInlineScores };
  for (const line of rawLines) {
    const scores = extractInlineLevelScores(line);
    for (const [label, points] of Object.entries(scores)) {
      if (inlineScores[label] == null) inlineScores[label] = points;
    }
  }

  const descriptionLines: string[] = [];
  const levels: ParsedChecklistLevel[] = [];
  const numericOnlyValues: number[] = [];
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

    if (/^\d+(?:[.,]\d+)?$/.test(trimmed)) {
      const linePoints = extractPoints(trimmed);
      if (linePoints != null) {
        numericOnlyValues.push(linePoints);
        if (currentLevel && currentLevel.points == null) currentLevel.points = linePoints;
        continue;
      }
    }

    const compactPoints = extractPointValuesFromLine(trimmed);
    if (compactPoints.length >= 2 && compactPoints.length <= 3 && trimmed.replace(/[0-9.,\s\t]+/g, "").length === 0) {
      numericOnlyValues.push(...compactPoints);
      continue;
    }

    if (currentLevel) {
      currentLevel.descriptionLines.push(line);
      continue;
    }

    descriptionLines.push(line);
  }

  flushLevel();

  // Garante que todos os níveis com pontuação inline existam, mesmo sem descrição própria.
  for (const [label, points] of Object.entries(inlineScores)) {
    const existingIndex = levels.findIndex((level) => level.label === label);
    if (existingIndex === -1) {
      levels.push({ label, points, description: "" });
    } else if (levels[existingIndex].points <= 0) {
      levels[existingIndex] = { ...levels[existingIndex], points };
    }
  }

  // Reordena para Inadequado → Parcialmente adequado → Adequado.
  const labelOrder: Record<string, number> = { Inadequado: 0, "Parcialmente adequado": 1, Adequado: 2 };
  levels.sort((a, b) => (labelOrder[a.label] ?? 99) - (labelOrder[b.label] ?? 99));

  let maxPoints = Math.max(headingPoints, ...levels.map((level) => level.points), 0);
  const adequateIndex = levels.findIndex((level) => normalizeHeader(level.label) === "ADEQUADO");
  const partialIndex = levels.findIndex((level) => normalizeHeader(level.label) === "PARCIALMENTE ADEQUADO");
  const inadequateIndex = levels.findIndex((level) => normalizeHeader(level.label) === "INADEQUADO");

  if (numericOnlyValues.length >= 2 && adequateIndex >= 0 && inadequateIndex >= 0 && partialIndex === -1) {
    levels[inadequateIndex] = { ...levels[inadequateIndex], points: 0 };
    levels[adequateIndex] = { ...levels[adequateIndex], points: numericOnlyValues[numericOnlyValues.length - 1] };
  }
  if (numericOnlyValues.length >= 3 && adequateIndex >= 0 && inadequateIndex >= 0 && partialIndex >= 0) {
    levels[inadequateIndex] = { ...levels[inadequateIndex], points: 0 };
    levels[partialIndex] = { ...levels[partialIndex], points: numericOnlyValues[1] };
    levels[adequateIndex] = { ...levels[adequateIndex], points: numericOnlyValues[2] };
  }

  if (inadequateIndex >= 0) {
    levels[inadequateIndex] = { ...levels[inadequateIndex], points: 0 };
  }

  if (adequateIndex >= 0 && levels[adequateIndex].points <= 0 && maxPoints > 0) {
    levels[adequateIndex] = { ...levels[adequateIndex], points: maxPoints };
  }
  if (partialIndex >= 0 && levels[partialIndex].points <= 0 && maxPoints > 0) {
    levels[partialIndex] = { ...levels[partialIndex], points: roundPoint(maxPoints / 2) };
  }

  maxPoints = Math.max(headingPoints, ...levels.map((level) => level.points), 0);

  const normalizedCategory = normalizeHeader(category);
  if (
    /^(PEP|CHECKLIST|PADRAO ESPERADO(?: DE (?:PROCEDIMENTO|RESPOSTA))?|ITENS DE DESEMPENHO AVALIADOS)\b/.test(normalizedCategory) ||
    (!cleanMultilineText(descriptionLines.join("\n")) && levels.length === 0 && maxPoints <= 0)
  ) {
    return null;
  }

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

function cleanTitlePart(value: string): string {
  return value
    .replace(/^=+\s*|\s*=+$/g, "")
    .replace(/^[#\-–—*\s]+|[\s\-–—*]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericTitlePlaceholder(value: string): boolean {
  const normalized = normalizeHeader(value);
  return /^(TITULO|TITULO DA ESTACAO|NOME DA ESTACAO|ESTACAO|CASO CLINICO|CHECKLIST)$/.test(normalized);
}

function isTitleNoiseLine(line: string): boolean {
  const normalized = normalizeHeader(line);
  if (!normalized) return true;
  if (/^AREA\b/.test(normalized)) return true;
  if (/^ESPECIALIDADE\b/.test(normalized)) return true;
  if (/^AVALIACAO DE HABILIDADES CLINICAS/.test(normalized)) return true;
  if (/^REVALIDA\b/.test(normalized)) return true;
  if (/^INEP\b/.test(normalized)) return true;
  if (/^MINISTERIO\b/.test(normalized)) return true;
  if (/^P[AÁ]GINA\b/.test(normalized)) return true;
  if (/^\d+\s*$/.test(normalized)) return true;
  return false;
}

function parseStationTitle(body: string, fallback: string, metaTitle?: string): string {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let stationLabel = "";
  let topic = metaTitle && !isGenericTitlePlaceholder(metaTitle) ? cleanTitlePart(metaTitle) : "";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (isDividerLine(line) || isPageMarkerLine(line)) continue;
    if (detectSection(line)) break;
    if (isStationStartLine(line) && !isStationMarker(line)) break;

    if (isStationMarker(line)) {
      const cleaned = cleanTitlePart(line);
      // "ESTAÇÃO 1 — TABAGISMO" → captura tudo
      const inlineMatch = cleaned.match(/^(ESTA[ÇC][ÃA]O\s*\d{1,3})\s*[-–—:.]\s*(.+)$/i);
      if (inlineMatch) {
        stationLabel = inlineMatch[1].trim();
        if (!topic) topic = inlineMatch[2].trim();
      } else {
        stationLabel = cleaned;
      }
      continue;
    }

    if (isTitleNoiseLine(line)) continue;

    if (!topic) {
      const cleaned = cleanTitlePart(line);
      if (cleaned.length >= 3 && !isGenericTitlePlaceholder(cleaned)) topic = cleaned;
    }
    if (stationLabel && topic) break;
  }

  const label = stationLabel ? cleanTitlePart(stationLabel) : "";
  const name = topic ? cleanTitlePart(topic) : "";

  if (label && name) return name;
  if (name) return name;
  if (label) return label;
  return fallback;
}

export function normalizeImportedStations<T extends ParsedImportedStation>(stations: T[]): T[] {
  return stations.map((station) => {
    const checklistItems = (station.checklist_items ?? []).map((item) => {
      const rawLevels = (item.levels ?? []).map((level) => ({
        label: (level.label ?? "").trim(),
        points: Number.isFinite(level.points) ? roundPoint(level.points) : 0,
        description: cleanMultilineText(level.description ?? ""),
      }));

      // Remove "Parcialmente adequado" se vier sem descrição real (provável alucinação).
      const levels = rawLevels.filter((level) => {
        if (normalizeHeader(level.label) !== "PARCIALMENTE ADEQUADO") return true;
        return level.description.trim().length > 0;
      });

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
      specialty: inferSpecialtyFromStationContent(station),
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
  const recognizedHeaders = countRecognizedHeaders(text);
  const hasStationMarker = /esta[çc][ãa]o\s*\d{1,3}/i.test(text);
  if (recognizedHeaders === 0 && !hasStationMarker) return [];

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
      let pendingMetaKey: string | null = null;

      block.body.split(/\r?\n/).forEach((line) => {
        if (isDividerLine(line) || isPageMarkerLine(line)) {
          return;
        }

        if (currentSection === "pep" && isStationStartLine(line.trim())) {
          currentSection = null;
          return;
        }

        const section = detectSection(line);
        if (section) {
          pendingMetaKey = null;
          if (currentSection === "pep" && section.key !== "pep") {
            currentSection = null;
          }
          currentSection = section.key;
          if (section.key === "support_materials" && /^IMPRESSO\s*\d{1,3}\b/i.test(line.trim())) {
            sections[section.key].push(line.trim());
            return;
          }
          if (section.inline) sections[section.key].push(section.inline);
          return;
        }

        if (!currentSection) {
          const normalizedLine = normalizeHeader(line);

          if (/^(AREA|ESPECIALIDADE|TITULO|TITULO DA ESTACAO|NOME DA ESTACAO|TEMPO|DURACAO|TEMPO DA ESTACAO)$/.test(normalizedLine)) {
            pendingMetaKey = normalizedLine;
            return;
          }

          if (pendingMetaKey && line.trim()) {
            meta[pendingMetaKey] = line.trim();
            pendingMetaKey = null;
            return;
          }

          const metaMatch = line.match(/^\s*([A-Za-zÀ-ÿ /]+?)\s*[:\-–—]\s*(.+)\s*$/);
          if (metaMatch) {
            meta[normalizeHeader(metaMatch[1])] = metaMatch[2].trim();
            return;
          }

          const inlineAreaMatch = line.match(/^\s*(?:[ÁA]REA|ESPECIALIDADE)\s+(.+)\s*$/i);
          if (inlineAreaMatch) {
            const value = inlineAreaMatch[1].replace(/^[:\-–—\s]+/, "").trim();
            if (value) {
              meta[/^\s*ESPECIALIDADE/i.test(line) ? "ESPECIALIDADE" : "AREA"] = value;
            }
          }
          return;
        }

        sections[currentSection].push(line);
      });

      const specialtyContext = [meta.AREA, meta.ESPECIALIDADE, extractHeaderSpecialtyContext(block.body)]
        .filter(Boolean)
        .join("\n");
      const metaTitle = meta.TITULO ?? meta["TITULO DA ESTACAO"] ?? meta["NOME DA ESTACAO"];
      const durationContext = [meta.TEMPO, meta.DURACAO, meta["TEMPO DA ESTACAO"], block.body].filter(Boolean).join("\n");

      const pepSource = cleanMultilineText(sections.pep.join("\n")) || extractPepFallbackFromBlock(block.body);

      const station: ParsedImportedStation = {
        title: parseStationTitle(block.body, `${sourceLabel} — Estação ${index + 1}`, metaTitle),
        specialty: normalizeSpecialty(specialtyContext),
        difficulty: "Intermediário",
        duration_minutes: parseDurationMinutes(durationContext),
        clinical_case: cleanMultilineText(sections.clinical_case.join("\n")),
        candidate_task: cleanMultilineText(sections.candidate_task.join("\n")),
        patient_info: emptyToNull(sections.patient_info.join("\n")),
        support_materials: emptyToNull(sections.support_materials.join("\n")),
        patient_script: emptyToNull(sections.patient_script.join("\n")),
        evaluator_notes: null,
        scoring_criteria: null,
        post_materials: null,
        competencies: [],
        checklist_items: parsePepChecklist(pepSource),
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