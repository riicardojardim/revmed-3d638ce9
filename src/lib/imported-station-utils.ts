export type ImportedDeliverableMaterial = {
  id?: string;
  name: string;
  type: string;
  description: string;
  content: string;
  imageUrl?: string;
  autoDeliver?: boolean;
};

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

  const lines = text.split("\n");
  const markerRegex = /^(?:=+\s*)?IMPRESSO\s*(\d{1,3})\b(?:\s*[-–—:]\s*(.+?))?\s*(?:=+)?$/i;
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
          .replace(/^IMPRESSOS?\s*:?\s*$/gim, ""),
      );
      const title = cleanBlock(block.title) || `Impresso ${index + 1}`;
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