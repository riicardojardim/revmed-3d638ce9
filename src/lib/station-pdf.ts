import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "@/assets/logo-estacao-revalida.png";

// Cache the logo as a data URL so we only fetch it once.
let _logoDataUrl: string | null = null;
let _logoDims: { w: number; h: number } | null = null;
async function getLogoDataUrl(): Promise<{ data: string; w: number; h: number } | null> {
  try {
    if (!_logoDataUrl) {
      const res = await fetch(logoUrl);
      const blob = await res.blob();
      _logoDataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      _logoDims = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 600, h: 160 });
        img.src = _logoDataUrl!;
      });
    }
    return { data: _logoDataUrl!, w: _logoDims!.w, h: _logoDims!.h };
  } catch {
    return null;
  }
}

// ============ Types (loose, matching the editor route shape) ============
interface PatientProfile {
  name?: string; age?: string; sex?: string; city?: string; profession?: string;
  chiefComplaint?: string; hpi?: string; personalHistory?: string;
  medications?: string; allergies?: string; familyHistory?: string;
  habits?: string; symptoms?: string; vitals?: string; previousExams?: string;
  spontaneous?: string; onlyIfAsked?: string; doNotReveal?: string;
  emotionalTone?: string; actingTips?: string;
}

interface DeliverableMaterial {
  id: string;
  name: string;
  type: string;
  description?: string;
  content: string;
  imageUrl?: string;
}

interface ChecklistLevel { label: string; points: number; description?: string }
interface ChecklistItem {
  id: string;
  description: string;
  category: string;
  points: number;
  helper_text: string | null;
  order_index: number;
  levels: ChecklistLevel[];
}

interface StationLike {
  title: string;
  specialty: string;
  duration_minutes: number;
  case_description: string | null;
  candidate_task: string;
  support_materials: string | null;
  patient_profile: PatientProfile | null;
  deliverable_materials: DeliverableMaterial[];
}

// ============ Layout constants ============
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 14;
const MARGIN_TOP = 14;
const MARGIN_BOTTOM = 14;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

// Brand colors (match src/styles.css)
const C_NIGHT: [number, number, number] = [7, 17, 31];
const C_MEDICAL: [number, number, number] = [15, 76, 129];
const C_MINT: [number, number, number] = [0, 194, 168];
const C_TEXT: [number, number, number] = [25, 30, 40];
const C_MUTED: [number, number, number] = [110, 116, 130];
const C_BORDER: [number, number, number] = [220, 226, 234];
const C_SUBBG: [number, number, number] = [245, 248, 252];

function setText(d: jsPDF, c: [number, number, number]) { d.setTextColor(c[0], c[1], c[2]); }
function setFill(d: jsPDF, c: [number, number, number]) { d.setFillColor(c[0], c[1], c[2]); }
function setStroke(d: jsPDF, c: [number, number, number]) { d.setDrawColor(c[0], c[1], c[2]); }

// ============ Gradient banner (faux linear-gradient(135deg, night, medical, mint)) ============
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function mix(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))];
}
function gradientColorAt(t: number): [number, number, number] {
  // 0 → night, 0.6 → medical, 1 → mint  (matches bg-gradient-hero stops)
  if (t <= 0.6) return mix(C_NIGHT, C_MEDICAL, t / 0.6);
  return mix(C_MEDICAL, C_MINT, (t - 0.6) / 0.4);
}
function drawGradientBanner(doc: jsPDF, x: number, y: number, w: number, h: number) {
  const steps = 60;
  const sw = w / steps;
  for (let i = 0; i < steps; i++) {
    const c = gradientColorAt(i / (steps - 1));
    setFill(doc, c);
    // Slight overlap to avoid hairline gaps
    doc.rect(x + i * sw, y, sw + 0.2, h, "F");
  }
}

// ============ Inline text renderer that supports **bold** ============
type Seg = { text: string; bold: boolean };
function parseBoldSegments(line: string): Seg[] {
  const out: Seg[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) out.push({ text: line.slice(last, m.index), bold: false });
    out.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), bold: false });
  if (out.length === 0) out.push({ text: line, bold: false });
  return out;
}

// Word-wrap segments to fit width, returning visual lines (each is an array of segments).
function wrapSegments(doc: jsPDF, segs: Seg[], maxW: number, fontSize: number): Seg[][] {
  doc.setFontSize(fontSize);
  // Tokenize each segment into word/space tokens preserving bold flag.
  type Tok = { text: string; bold: boolean; space: boolean };
  const toks: Tok[] = [];
  for (const s of segs) {
    const parts = s.text.split(/(\s+)/);
    for (const p of parts) {
      if (!p) continue;
      toks.push({ text: p, bold: s.bold, space: /^\s+$/.test(p) });
    }
  }
  const lines: Seg[][] = [];
  let cur: Seg[] = [];
  let curW = 0;
  const widthOf = (t: Tok) => {
    doc.setFont("helvetica", t.bold ? "bold" : "normal");
    return doc.getTextWidth(t.text);
  };
  for (const t of toks) {
    const w = widthOf(t);
    if (curW + w > maxW && cur.length && !t.space) {
      lines.push(cur);
      cur = []; curW = 0;
    }
    if (curW === 0 && t.space) continue; // skip leading spaces
    cur.push({ text: t.text, bold: t.bold });
    curW += w;
  }
  if (cur.length) lines.push(cur);
  return lines;
}

function drawSegLine(doc: jsPDF, segs: Seg[], x: number, y: number, fontSize: number) {
  doc.setFontSize(fontSize);
  setText(doc, C_TEXT);
  let cx = x;
  for (const s of segs) {
    doc.setFont("helvetica", s.bold ? "bold" : "normal");
    doc.text(s.text, cx, y);
    cx += doc.getTextWidth(s.text);
  }
}

// ============ Card (PRBlock-style) ============
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN_BOTTOM) {
    drawFooter(doc);
    doc.addPage();
    return MARGIN_TOP;
  }
  return y;
}

function drawFooter(doc: jsPDF) {
  setText(doc, C_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("estacaorevalida.com.br", MARGIN_X, PAGE_H - 6);
  doc.text(`Página ${doc.getNumberOfPages()}`, PAGE_W - MARGIN_X, PAGE_H - 6, { align: "right" });
}

// Render a PRBlock-style card. Returns new y. Renders the gradient header,
// then the body content via the provided renderer (which gets bodyX, bodyY,
// bodyW and returns the new y after rendering content).
function drawCard(
  doc: jsPDF,
  y: number,
  title: string,
  rightBadge: string | null,
  render: (bx: number, by: number, bw: number) => number,
): number {
  const headerH = 10;
  const bodyPadX = 5;
  const bodyPadY = 5;

  // Move to next page if not enough room for header + at least one line
  y = ensureSpace(doc, y, headerH + 14);

  // Header banner (gradient)
  drawGradientBanner(doc, MARGIN_X, y, CONTENT_W, headerH);
  // Title text
  setText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  const titleLines = doc.splitTextToSize(title, CONTENT_W - 10 - (rightBadge ? 24 : 0));
  // Single-line if possible; if title wraps, only first line shows (banner is fixed height)
  doc.text(titleLines[0], MARGIN_X + 4, y + 6.6);
  if (rightBadge) {
    doc.setFontSize(9);
    doc.text(rightBadge, PAGE_W - MARGIN_X - 4, y + 6.6, { align: "right" });
  }

  // Body — render content with auto-pagination support; on overflow inside render(),
  // it should call ensureSpace itself. To keep things simple, we render then if it
  // crossed page, the new content already drew on the new page. We also stroke a
  // border around just the FIRST page's body block.
  const bodyStartY = y + headerH;
  const bodyTop = bodyStartY + bodyPadY;
  const newY = render(MARGIN_X + bodyPadX, bodyTop, CONTENT_W - bodyPadX * 2);
  // If still on the same page (no page break happened inside render), draw a side border
  // for visual coherence. We can't easily detect that; use a light bottom border instead.
  const finalY = newY + bodyPadY;
  setStroke(doc, C_BORDER);
  doc.setLineWidth(0.3);
  // Draw left + right + bottom border (skip top — it touches the gradient header)
  // Only safe to draw if finalY is on the same page as bodyStartY; we approximate by
  // drawing on the current page from the body top to finalY.
  const currentPageHeight = finalY - bodyStartY;
  if (currentPageHeight > 0 && finalY <= PAGE_H - MARGIN_BOTTOM) {
    doc.line(MARGIN_X, bodyStartY, MARGIN_X, finalY);
    doc.line(PAGE_W - MARGIN_X, bodyStartY, PAGE_W - MARGIN_X, finalY);
    doc.line(MARGIN_X, finalY, PAGE_W - MARGIN_X, finalY);
  }
  return finalY + 4;
}

// ============ Script text renderer (preserves blank lines + **bold**) ============
function renderScriptText(doc: jsPDF, text: string, x: number, y: number, w: number): number {
  const fontSize = 10;
  const lineH = 5.2;
  const paraGap = 2;
  const lines = (text ?? "").replace(/\r\n/g, "\n").split("\n");
  for (const raw of lines) {
    if (!raw.trim()) {
      y += paraGap + 1.5;
      continue;
    }
    const segs = parseBoldSegments(raw);
    const wrapped = wrapSegments(doc, segs, w, fontSize);
    for (const ln of wrapped) {
      y = ensureSpace(doc, y, lineH);
      drawSegLine(doc, ln, x, y, fontSize);
      y += lineH;
    }
  }
  return y;
}

// Render a sub-block (like the "SubBlock" component) — small uppercase label
// inside a faint box, then content.
function renderSubBlock(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string,
  body: (bx: number, by: number, bw: number) => number,
): number {
  y += 2;
  y = ensureSpace(doc, y, 14);
  // label
  setText(doc, C_MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(label.toUpperCase(), x + 3, y + 4);
  const headerEndY = y + 6;
  // body content
  const innerX = x + 3;
  const innerW = w - 6;
  const endY = body(innerX, headerEndY + 2, innerW);
  // outline-only border around the sub-block (no fill, so text remains visible)
  setStroke(doc, C_BORDER);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, endY - y + 2, 1.5, 1.5, "S");
  // left accent stripe
  setFill(doc, C_MINT);
  doc.rect(x, y, 1, endY - y + 2, "F");
  return endY + 3;
}


// ============ Page header (brand strip + logo on every page top) ============
function drawPageHeader(
  doc: jsPDF,
  station: StationLike,
  kind: "ATOR" | "CANDIDATO",
  logo: { data: string; w: number; h: number } | null,
) {
  // Gradient brand strip (taller, hosts the white logo)
  const stripH = 14;
  drawGradientBanner(doc, 0, 0, PAGE_W, stripH);

  // Logo on the left inside the strip (rendered in white via overlay — png has dark logo,
  // so instead we draw on a white pill so it stays readable on the dark gradient).
  if (logo) {
    const targetH = 8;
    const ratio = logo.w / logo.h;
    const targetW = targetH * ratio;
    // white pill background for legibility
    setFill(doc, [255, 255, 255]);
    doc.roundedRect(MARGIN_X - 1.5, (stripH - targetH) / 2 - 1.5, targetW + 3, targetH + 3, 1.5, 1.5, "F");
    try {
      doc.addImage(logo.data, "PNG", MARGIN_X, (stripH - targetH) / 2, targetW, targetH);
    } catch {
      /* ignore */
    }
  }

  // Right side: kind badge + specialty · duration
  setText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const kindLabel = kind === "ATOR" ? "ATOR / ATRIZ" : "CANDIDATO";
  doc.text(kindLabel, PAGE_W - MARGIN_X, 6, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `${station.specialty.toUpperCase()} · ${station.duration_minutes} min`,
    PAGE_W - MARGIN_X,
    11,
    { align: "right" },
  );

  // Station title under the strip
  setText(doc, C_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const title = kind === "ATOR" ? `${station.title} — ATOR` : station.title;
  const wrapped = doc.splitTextToSize(title, CONTENT_W);
  doc.text(wrapped[0], MARGIN_X, stripH + 6);
  // subtle divider
  setStroke(doc, C_BORDER);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, stripH + 8.5, PAGE_W - MARGIN_X, stripH + 8.5);
}

// ============ formatPatientProfile (local copy, mirrors src/components/station/shared.tsx) ============
function formatPatientProfileLocal(p: PatientProfile): string {
  const out: string[] = [];
  const boldLabelLines = (raw?: string): string[] => {
    if (!raw) return [];
    return raw.split("\n").map((ln) => {
      const t = ln.trim();
      if (!t) return "";
      const m = t.match(/^([^:]{1,60}):\s*(.*)$/);
      if (m) return `- **${m[1].trim()}:** ${m[2].trim()}`;
      return `- ${t}`;
    }).filter(Boolean);
  };
  const dadosParts: string[] = [];
  if (p.name) dadosParts.push(p.name);
  if (p.age) dadosParts.push(`${p.age} de idade`);
  if (p.profession) dadosParts.push(String(p.profession).toLowerCase());
  if (dadosParts.length) { out.push("**DADOS PESSOAIS:**"); out.push(`- ${dadosParts.join(", ")}.`); out.push(""); }
  if (p.chiefComplaint) { out.push("**MOTIVO DE CONSULTA:**"); out.push(`- ${p.chiefComplaint}`); out.push(""); }
  if (p.hpi) { out.push("**HISTÓRIA DA DOENÇA ATUAL:**"); out.push(...boldLabelLines(p.hpi)); out.push(""); }
  if (p.symptoms) { out.push("**SINTOMAS ASSOCIADOS:**"); out.push(...boldLabelLines(p.symptoms)); out.push(""); }
  if (p.onlyIfAsked) {
    out.push("**SE PERGUNTADO:**");
    out.push(`- ${p.onlyIfAsked}`); out.push("");
  }
  const antecedentes: string[] = [];
  if (p.personalHistory) antecedentes.push(...boldLabelLines(p.personalHistory));
  if (p.medications) antecedentes.push(`- **Medicamentos:** ${p.medications}`);
  if (p.allergies) antecedentes.push(`- **Alergias:** ${p.allergies}`);
  if (p.familyHistory) antecedentes.push(`- **História familiar:** ${p.familyHistory}`);
  if (antecedentes.length) { out.push("**ANTECEDENTES PESSOAIS:**"); out.push(...antecedentes); out.push(""); }
  if (p.habits) { out.push("**HÁBITOS:**"); out.push(...boldLabelLines(p.habits)); out.push(""); }
  if (p.vitals) { out.push("**SINAIS VITAIS:**"); out.push(`- ${p.vitals}`); out.push(""); }
  if (p.previousExams) { out.push("**EXAMES PRÉVIOS:**"); out.push(`- ${p.previousExams}`); out.push(""); }
  return out.join("\n").trimEnd();
}

// ============ ACTOR PDF ============
async function buildActorPDF(station: StationLike): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await getLogoDataUrl();
  drawPageHeader(doc, station, "ATOR", logo);
  let y = 26;

  // 1) Cenário de atuação
  if (station.support_materials?.trim()) {
    y = drawCard(doc, y, "Cenário de atuação", null, (x, yy, w) =>
      renderScriptText(doc, station.support_materials!.trim(), x, yy + 3, w),
    );
  }

  // 2) Descrição do caso
  if (station.case_description?.trim()) {
    y = drawCard(doc, y, "Descrição do caso", null, (x, yy, w) =>
      renderScriptText(doc, station.case_description!.trim(), x, yy + 3, w),
    );
  }

  // 3) Tarefas
  if (station.candidate_task?.trim()) {
    y = drawCard(
      doc,
      y,
      `Nos ${station.duration_minutes} minutos de duração da estação, você deverá executar as seguintes tarefas`,
      null,
      (x, yy, w) => renderScriptText(doc, station.candidate_task.trim(), x, yy + 3, w),
    );
  }

  // 4) Orientações do Ator/Atriz
  const p = station.patient_profile;
  if (p) {
    y = drawCard(doc, y, "Orientações do Ator/Atriz", null, (x, yy, w) => {
      let cy = yy + 3;
      const scriptText = formatPatientProfileLocal(p);
      if (scriptText) cy = renderScriptText(doc, scriptText, x, cy, w);

      if (p.spontaneous?.trim()) {
        cy = renderSubBlock(doc, x, cy, w, "O que falar espontaneamente", (bx, by, bw) =>
          renderScriptText(doc, p.spontaneous!.trim(), bx, by, bw),
        );
      }
      if (p.doNotReveal?.trim()) {
        cy = renderSubBlock(doc, x, cy, w, "Nunca revelar", (bx, by, bw) =>
          renderScriptText(doc, p.doNotReveal!.trim(), bx, by, bw),
        );
      }
      if (p.emotionalTone?.trim() || p.actingTips?.trim()) {
        cy = renderSubBlock(doc, x, cy, w, "Tom emocional e atuação", (bx, by, bw) => {
          let yy2 = by;
          if (p.emotionalTone?.trim())
            yy2 = renderScriptText(doc, `**Tom:** ${p.emotionalTone.trim()}`, bx, yy2, bw);
          if (p.actingTips?.trim())
            yy2 = renderScriptText(doc, `**Dicas:** ${p.actingTips.trim()}`, bx, yy2, bw);
          return yy2;
        });
      }
      return cy;
    });
  }

  // 5) Impressos para entregar ao candidato (somente no PDF do ator)
  const printable = (station.deliverable_materials ?? []).filter(
    (m) => m && (m.content?.trim() || m.description?.trim() || m.imageUrl),
  );
  if (printable.length > 0) {
    y = drawCard(doc, y, "Impressos para entregar ao candidato", `${printable.length}`, (x, yy, w) => {
      let cy = yy + 2;
      printable.forEach((m, idx) => {
        const title = `Impresso ${idx + 1}${m.name ? ` — ${m.name}` : ""}`;
        cy = renderSubBlock(doc, x, cy, w, title, (bx, by, bw) => {
          let yy2 = by;
          if (m.description?.trim()) yy2 = renderScriptText(doc, m.description.trim(), bx, yy2, bw);
          if (m.content?.trim()) yy2 = renderScriptText(doc, m.content.trim(), bx, yy2, bw);
          if (m.imageUrl) yy2 = renderScriptText(doc, `_Imagem anexa: ${m.imageUrl}_`, bx, yy2, bw);
          return yy2;
        });
      });
      return cy;
    });
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) { doc.setPage(i); drawFooter(doc); }
  return doc;
}

// ============ CANDIDATE PDF ============
async function buildCandidatePDF(station: StationLike, items: ChecklistItem[]): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await getLogoDataUrl();
  drawPageHeader(doc, station, "CANDIDATO", logo);
  let y = 26;

  if (station.support_materials?.trim()) {
    y = drawCard(doc, y, "Cenário de atuação", null, (x, yy, w) =>
      renderScriptText(doc, station.support_materials!.trim(), x, yy + 3, w),
    );
  }
  if (station.case_description?.trim()) {
    y = drawCard(doc, y, "Descrição do caso", null, (x, yy, w) =>
      renderScriptText(doc, station.case_description!.trim(), x, yy + 3, w),
    );
  }
  if (station.candidate_task?.trim()) {
    y = drawCard(
      doc,
      y,
      `Nos ${station.duration_minutes} minutos de duração da estação, você deverá executar as seguintes tarefas`,
      null,
      (x, yy, w) => renderScriptText(doc, station.candidate_task.trim(), x, yy + 3, w),
    );
  }



  // CHECKLIST (PEP)
  if (items.length > 0) {
    y = drawCard(doc, y, "CHECKLIST ( PEP )", `${items.length} itens`, (x, yy, w) => {
      // We render a normal table; let autoTable take over from yy
      const head = [["#", "Item avaliado", "Inadeq.", "Parcial", "Adeq."]];
      const body = items
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((it, idx) => {
          const sorted = (it.levels ?? []).slice().sort((a, b) => (a.points ?? 0) - (b.points ?? 0));
          const inad = sorted[0]; const adeq = sorted[sorted.length - 1];
          const parc = sorted.length >= 3 ? sorted[Math.floor(sorted.length / 2)] : null;
          let cell = it.description || "";
          if (it.helper_text?.trim()) cell += `\n${it.helper_text.trim()}`;
          const hints = sorted.filter((s) => s.description?.trim()).map((s) => `${s.label}: ${s.description?.trim()}`).join("\n");
          if (hints) cell += `\n${hints}`;
          return [
            String(idx + 1),
            cell,
            inad ? inad.points.toFixed(2) : "—",
            parc ? parc.points.toFixed(2) : "—",
            adeq ? adeq.points.toFixed(2) : "—",
          ];
        });
      autoTable(doc, {
        startY: yy,
        head, body,
        margin: { left: x, right: MARGIN_X, bottom: MARGIN_BOTTOM + 4, top: MARGIN_TOP },
        styles: { font: "helvetica", fontSize: 8.5, cellPadding: 1.8, lineColor: C_BORDER, lineWidth: 0.2, textColor: C_TEXT, valign: "top" },
        headStyles: { fillColor: C_MEDICAL, textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
        columnStyles: {
          0: { cellWidth: 7, halign: "center" },
          1: { cellWidth: "auto" },
          2: { cellWidth: 18, halign: "center" },
          3: { cellWidth: 18, halign: "center" },
          4: { cellWidth: 18, halign: "center" },
        },
        alternateRowStyles: { fillColor: [248, 251, 254] },
        tableWidth: w,
      });
      const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? yy;
      // total row
      const total = items.reduce((s, it) => s + (it.points ?? 0), 0);
      let ty = finalY + 3;
      ty = ensureSpace(doc, ty, 8);
      setFill(doc, [240, 246, 252]);
      doc.rect(x, ty, w, 7, "F");
      setText(doc, C_MEDICAL);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Pontuação total: ${total.toFixed(2)} pontos`, x + 3, ty + 4.8);
      return ty + 8;
    });
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) { doc.setPage(i); drawFooter(doc); }
  return doc;
}

// ============ Public helpers ============
function safeSlug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase()
    .slice(0, 80) || "estacao";
}

export async function downloadActorPDF(station: StationLike) {
  const doc = await buildActorPDF(station);
  doc.save(`${safeSlug(station.title)}_ator.pdf`);
}

export async function downloadCandidatePDF(station: StationLike, items: ChecklistItem[]) {
  const doc = await buildCandidatePDF(station, items);
  doc.save(`${safeSlug(station.title)}.pdf`);
}
