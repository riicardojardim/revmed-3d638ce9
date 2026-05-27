export type ImportedDeliverableMaterial = {
  id?: string;
  name: string;
  type: string;
  description: string;
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
  autoDeliver?: boolean;
};

/** Retorna a lista completa de imagens de um impresso, mesclando o campo
 * legado `imageUrl` (single) com `imageUrls` (array) e removendo duplicatas.
 */
export function getMaterialImages(
  m: { imageUrl?: string | null; imageUrls?: string[] | null } | null | undefined,
): string[] {
  if (!m) return [];
  const arr = Array.isArray(m.imageUrls) ? m.imageUrls.filter(Boolean) : [];
  const single = m.imageUrl ? [m.imageUrl] : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of [...arr, ...single]) {
    if (url && !seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

function cleanBlock(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/^\s+|\s+$/g, "").replace(/\n{3,}/g, "\n\n");
}

function inferMaterialType(title: string, content: string): string {
  const source = `${title} ${content}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/\becg\b|eletrocardiograma/.test(source)) return "ECG";
  if (/ectoscopia|exame fisico|sinais vitais|inspecao|palpacao|ausculta/.test(source)) return "Exame físico";
  if (/radiografia|tomografia|ressonancia|ultrassom|ultrasonografia|usg|rx\b|tc\b|rm\b|imagem/.test(source)) {
    return "Exame de imagem";
  }
  if (/hemograma|leucocitos|plaquetas|creatinina|ureia|sodio|potassio|laboratorial|gasometria|glicemia|beta hcg|bhcg/.test(source)) {
    return "Exame laboratorial";
  }
  return "Impresso";
}

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isPatientInfoMaterial(title: string): boolean {
  const normalized = normalizeForMatch(title);
  return /(ficha do paciente|ficha de atendimento|ficha de acolhimento|ficha clinica|prontuario|dados do paciente|historia clinica)/.test(normalized);
}

export function splitCaseDescriptionAndTaskBlock(
  caseDescription: string | null | undefined,
  candidateTask: string | null | undefined,
): { caseDescription: string | null; candidateTask: string } {
  let nextCase = cleanBlock(caseDescription ?? "") || null;
  let nextTask = cleanBlock(candidateTask ?? "");

  if (nextCase) {
    const taskMatch = nextCase.match(/Nos\s+\d+\s+minutos[\s\S]*$/i);
    if (taskMatch) {
      if (!nextTask) nextTask = taskMatch[0].trim();
      nextCase = cleanBlock(nextCase.slice(0, taskMatch.index)) || null;
    }
  }

  if (nextTask) {
    nextTask = cleanBlock(
      nextTask.replace(
        /^\s*Nos\s+\d+\s+minutos[^\n:]*?(?:de dura[cç][aã]o[^\n:]*)?(?:da esta[cç][aã]o)?[^\n:]*tarefas?\s*:?\s*\n*/i,
        "",
      ),
    );
  }

  return {
    caseDescription: nextCase,
    candidateTask: nextTask,
  };
}

export function parseDeliverableMaterialsFromSupportText(
  value: string | null | undefined,
): ImportedDeliverableMaterial[] {
  const text = cleanBlock(value ?? "");
  if (!text) return [];

  const normalizedText = text
    .replace(/(?:^|\n)\s*((?:(?:MATERIAL\s*\/??\s*)?IMPRESSO)\s*\d{1,3}\b)/gi, "\n$1")
    .replace(/(?:^|\n)\s*(===\s*(?:(?:MATERIAL\s*\/??\s*)?IMPRESSO)\s*\d{1,3}\b)/gi, "\n$1");
  const lines = normalizedText.split("\n");
  const markerRegex = /^(?:=+\s*)?(?:MATERIAL\s*\/??\s*)?IMPRESSO\s*(\d{1,3})\b(?:\s*[-–—:]\s*(.+?))?\s*(?:=+)?$/i;
  const markers: Array<{ index: number; title: string }> = [];

  lines.forEach((line, index) => {
    const match = line.trim().match(markerRegex);
    if (!match) return;
    markers.push({
      index,
      title: cleanBlock(match[2] ?? ""),
    });
  });

  const blocks = markers.length
    ? markers.map((marker, idx) => ({
        title: marker.title,
        body: lines.slice(marker.index + 1, idx + 1 < markers.length ? markers[idx + 1].index : lines.length).join("\n"),
      }))
    : [{ title: "", body: text }];

  const materials: ImportedDeliverableMaterial[] = [];

  blocks.forEach((block, index) => {
      const cleanedBody = cleanBlock(
        block.body
          .replace(/^\[IMAGEM NECESS[ÁA]RIA:\s*(SIM|N[ÃA]O)\]\s*$/gim, "")
          .replace(/^(?:\/\s*)?IMPRESSOS?\s*:?\s*$/gim, "")
          .replace(/^MATERIAIS?(?:\s+ENTREG[ÁA]VEIS)?\s*:?\s*$/gim, ""),
      );
      const title = cleanBlock(block.title).replace(/^(TITULO|T[IÍ]TULO)\s*$/i, "") || `Impresso ${index + 1}`;
      if (!cleanedBody && !title) return;
      materials.push({
        id: `imp${index + 1}`,
        name: title,
        type: inferMaterialType(title, cleanedBody),
        description: "",
        content: cleanedBody,
        autoDeliver: false,
      });
  });

  return materials.filter((item) => Boolean(item.name || item.content));
}

export function extractPatientInfoFromSupportText(
  value: string | null | undefined,
): string | null {
  const material = parseDeliverableMaterialsFromSupportText(value).find(
    (item) => isPatientInfoMaterial(item.name) && cleanBlock(item.content),
  );
  return material ? cleanBlock(material.content) : null;
}

export function mergeDeliverableMaterials(
  explicitMaterials: ImportedDeliverableMaterial[] | null | undefined,
  supportText: string | null | undefined,
): ImportedDeliverableMaterial[] {
  const parsedMaterials = parseDeliverableMaterialsFromSupportText(supportText);
  const merged = new Map<string, ImportedDeliverableMaterial>();

  [...(explicitMaterials ?? []), ...parsedMaterials].forEach((material, index) => {
    const key = normalizeForMatch(material.name || material.content || `impresso-${index + 1}`);
    const previous = merged.get(key);
    merged.set(key, {
      id: material.id ?? previous?.id ?? `imp${merged.size + 1}`,
      name: material.name || previous?.name || `Impresso ${merged.size + 1}`,
      type: material.type || previous?.type || "Impresso",
      description: material.description || previous?.description || "",
      content: material.content || previous?.content || "",
      imageUrl: material.imageUrl ?? previous?.imageUrl,
      imageUrls: material.imageUrls ?? previous?.imageUrls,
      autoDeliver: material.autoDeliver ?? previous?.autoDeliver ?? false,
    });
  });

  return Array.from(merged.values()).filter((item) => Boolean(item.name || item.content));
}