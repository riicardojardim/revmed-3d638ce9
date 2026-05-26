import { supabase } from "@/integrations/supabase/client";

// Lazy-init pdfjs to avoid SSR issues
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export interface RenderProgress {
  phase: "render" | "upload";
  current: number;
  total: number;
}

export interface RenderedPdfAsset {
  pagePaths: string[];
  extractedText: string;
}

const SCALE = 2.0; // ~144 DPI — equilíbrio entre fidelidade e tamanho
const JPEG_QUALITY = 0.72;
const UPLOAD_CONCURRENCY = 4;

function sanitizeStorageSegment(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");

  return normalized || `job-${Date.now()}`;
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar JPEG da página"))),
      "image/jpeg",
      quality,
    );
  });
}

function extractPageText(content: unknown): string {
  const items = ((content as { items?: unknown[] }).items ?? []) as Array<{
    str?: string;
    hasEOL?: boolean;
    transform?: number[];
  }>;
  const lines: string[] = [];
  let currentLine: string[] = [];
  let currentY: number | null = null;

  const flush = () => {
    const text = currentLine.join(" ").replace(/\s+/g, " ").trim();
    if (text) lines.push(text);
    currentLine = [];
    currentY = null;
  };

  for (const item of items) {
    const raw = typeof item.str === "string" ? item.str.trim() : "";
    const y = Array.isArray(item.transform) ? Math.round(item.transform[5] ?? 0) : null;

    if (raw) {
      if (currentY != null && y != null && Math.abs(currentY - y) > 2) {
        flush();
      }
      if (currentY == null && y != null) currentY = y;
      currentLine.push(raw);
    }

    if (item.hasEOL) {
      flush();
    }
  }

  flush();
  return lines.join("\n").trim();
}

/**
 * Renderiza cada página do PDF como JPEG e faz upload direto pro bucket
 * pdf-pages. Retorna os paths salvos.
 */
export async function renderAndUploadPdf(
  file: File,
  jobId: string,
  variant: "main" | "actor",
  onProgress?: (p: RenderProgress) => void,
): Promise<RenderedPdfAsset> {
  const safeJobId = sanitizeStorageSegment(jobId);
  const pdfjs = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const total = doc.numPages;
  const textParts: string[] = [];

  // Render → blobs (sequencial: 1 canvas por vez pra não estourar memória do browser)
  const blobs: Blob[] = [];
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não disponível neste navegador.");

  for (let i = 1; i <= total; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = extractPageText(textContent);
    if (pageText) {
      textParts.push(`--- Página ${i} ---\n${pageText}`);
    }
    const viewport = page.getViewport({ scale: SCALE });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    blobs.push(await canvasToBlob(canvas, JPEG_QUALITY));
    onProgress?.({ phase: "render", current: i, total });
    page.cleanup();
  }
  doc.destroy();

  // Upload em paralelo limitado
  const paths: string[] = new Array(total);
  let uploaded = 0;
  const queue = Array.from({ length: total }, (_, i) => i);

  async function worker() {
    while (queue.length) {
      const i = queue.shift();
      if (i === undefined) break;
      const path = `${safeJobId}/${variant}/${String(i + 1).padStart(3, "0")}.jpg`;
      const { error } = await supabase.storage.from("pdf-pages").upload(path, blobs[i], {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (error) throw new Error(`Upload da página ${i + 1} falhou: ${error.message}`);
      paths[i] = path;
      uploaded++;
      onProgress?.({ phase: "upload", current: uploaded, total });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(UPLOAD_CONCURRENCY, total) }, () => worker()),
  );

  return {
    pagePaths: paths,
    extractedText: textParts.join("\n\n"),
  };
}