import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "@/assets/logo-estacao-revalida.png";

// ============ Types (kept loose to match the editor route) ============
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
const MARGIN_BOTTOM = 16;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const COLOR_TEXT: [number, number, number] = [30, 35, 45];
const COLOR_MUTED: [number, number, number] = [110, 116, 130];
const COLOR_BRAND: [number, number, number] = [31, 169, 131];      // green primary
const COLOR_BRAND_DARK: [number, number, number] = [23, 138, 106]; // header band
const COLOR_BRAND_LIGHT: [number, number, number] = [191, 229, 214]; // light chip
const COLOR_BORDER: [number, number, number] = [43, 182, 115];

// ============ Helpers ============
function setText(doc: jsPDF, c: [number, number, number]) { doc.setTextColor(c[0], c[1], c[2]); }
function setFill(doc: jsPDF, c: [number, number, number]) { doc.setFillColor(c[0], c[1], c[2]); }
function setStroke(doc: jsPDF, c: [number, number, number]) { doc.setDrawColor(c[0], c[1], c[2]); }

let cachedLogo: string | null = null;
async function loadLogoDataURL(): Promise<string | null> {
  if (cachedLogo) return cachedLogo;
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    cachedLogo = dataUrl;
    return dataUrl;
  } catch {
    return null;
  }
}

function drawTopBand(doc: jsPDF) {
  setFill(doc, COLOR_BRAND);
  doc.rect(0, 0, PAGE_W, 6, "F");
}

function drawHeader(
  doc: jsPDF,
  station: StationLike,
  kind: "ATOR" | "PARTICIPANTE" | "IMPRESSO" | "PEP",
  logo: string | null,
): number {
  drawTopBand(doc);

  // Logo block (centered horizontally in left 70% area)
  const logoTop = 10;
  if (logo) {
    try {
      // logo is wide horizontal; place at top-left, scaled
      doc.addImage(logo, "PNG", MARGIN_X, logoTop, 56, 14, undefined, "FAST");
    } catch {
      // ignore image errors
    }
  }
  // Subtitle text under logo
  setText(doc, COLOR_TEXT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Plataforma de simulação para o Revalida", MARGIN_X, logoTop + 19);
  doc.text("Material para impressão e uso presencial", MARGIN_X, logoTop + 23);

  // Right-side kind band
  const bandY = logoTop + 12;
  const bandH = 8;
  setFill(doc, COLOR_BRAND_DARK);
  doc.rect(PAGE_W - 50, bandY, 50, bandH, "F");
  setText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(kind, PAGE_W - 25, bandY + 5.6, { align: "center" });

  // Specialty / Title chips
  const chipsY = logoTop + 28;
  // ESTAÇÃO chip (left, light green)
  const leftChipW = 32;
  setFill(doc, COLOR_BRAND_LIGHT);
  doc.rect(MARGIN_X, chipsY, leftChipW, 11, "F");
  setText(doc, COLOR_BRAND_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("ESTAÇÃO", MARGIN_X + leftChipW / 2, chipsY + 7.2, { align: "center" });

  // Specialty/title chip (right, lighter bg)
  const rightX = MARGIN_X + leftChipW + 2;
  const rightW = CONTENT_W - leftChipW - 2;
  setFill(doc, [232, 246, 240]);
  doc.rect(rightX, chipsY, rightW, 11, "F");
  setText(doc, [60, 70, 80]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const spec = (station.specialty || "").toUpperCase();
  doc.text(spec, rightX + 4, chipsY + 7.4);

  // Station title (smaller, below chips)
  const titleY = chipsY + 17;
  setText(doc, COLOR_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const titleLines = doc.splitTextToSize(station.title, CONTENT_W);
  doc.text(titleLines, MARGIN_X, titleY);

  return titleY + titleLines.length * 5 + 3;
}

function drawSectionBar(doc: jsPDF, y: number, label: string): number {
  if (y > PAGE_H - MARGIN_BOTTOM - 14) {
    drawFooter(doc);
    doc.addPage();
    drawTopBand(doc);
    y = 14;
  }
  setFill(doc, COLOR_BRAND);
  doc.rect(MARGIN_X, y, CONTENT_W, 8, "F");
  setText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(label.toUpperCase(), MARGIN_X + 4, y + 5.6);
  return y + 11;
}

function drawFooter(doc: jsPDF) {
  // Bottom green band with brand text
  setFill(doc, COLOR_BRAND);
  doc.rect(0, PAGE_H - 8, PAGE_W, 8, "F");
  setText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ESTAÇÃO REVALIDA — estacaorevalida.com.br", PAGE_W / 2, PAGE_H - 3, { align: "center" });

  setText(doc, COLOR_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Página ${doc.getNumberOfPages()}`, PAGE_W - MARGIN_X, PAGE_H - 10, { align: "right" });
}

// Wrap a content block in a green-bordered rounded rectangle.
// Caller draws content with the provided drawer; we measure height and stroke the border.
function drawBorderedBox(doc: jsPDF, yStart: number, drawer: (innerX: number, innerY: number, innerW: number) => number): number {
  const padX = 5;
  const padY = 5;
  const innerX = MARGIN_X + padX;
  const innerW = CONTENT_W - padX * 2;
  const contentTopY = yStart + padY;
  const endY = drawer(innerX, contentTopY, innerW);
  const boxH = endY - yStart + padY;
  setStroke(doc, COLOR_BORDER);
  doc.setLineWidth(0.5);
  doc.rect(MARGIN_X, yStart, CONTENT_W, boxH, "S");
  return yStart + boxH + 3;
}

// Render an "ATOR-style" content section: each entry is { title, lines: [[label?, value]] }
interface BoxSection {
  title: string;
  // Each line either:
  //  - { label, value } => "- **Label:** value"
  //  - { text }         => "- text" (no bold label)
  //  - { paragraph }    => plain paragraph (no bullet)
  lines: Array<{ label?: string; value?: string; text?: string; paragraph?: string }>;
}

function renderBoxSections(
  doc: jsPDF,
  startY: number,
  sections: BoxSection[],
): number {
  let y = startY;
  // Auto page-break helper inside box rendering: we render simply, then if overflow add page.
  const renderInner = (innerX: number, innerY: number, innerW: number): number => {
    let cy = innerY;
    const lineH = 5;
    sections.forEach((sec, i) => {
      // section title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      setText(doc, COLOR_TEXT);
      if (cy > PAGE_H - MARGIN_BOTTOM - 12) {
        drawFooter(doc); doc.addPage(); drawTopBand(doc); cy = 14;
      }
      doc.text(sec.title.toUpperCase() + ":", innerX, cy);
      cy += lineH + 0.5;

      sec.lines.forEach((ln) => {
        if (ln.paragraph) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          setText(doc, COLOR_TEXT);
          const wrapped = doc.splitTextToSize(ln.paragraph, innerW);
          for (const w of wrapped) {
            if (cy > PAGE_H - MARGIN_BOTTOM - 10) {
              drawFooter(doc); doc.addPage(); drawTopBand(doc); cy = 14;
            }
            doc.text(w, innerX, cy);
            cy += lineH;
          }
          return;
        }
        // bullet line
        const bullet = "- ";
        const label = ln.label ? `${ln.label}:` : "";
        const value = ln.value ?? ln.text ?? "";
        const indent = doc.getTextWidth(bullet);
        // measure label width in bold
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        const labelW = label ? doc.getTextWidth(label + " ") : 0;
        const firstLineW = innerW - indent - labelW;

        doc.setFont("helvetica", "normal");
        const valueLines = doc.splitTextToSize(value, firstLineW > 20 ? firstLineW : innerW - indent);
        // wrap continuation lines using full inner width minus bullet indent
        let firstLine = valueLines[0] ?? "";
        let rest: string[] = valueLines.slice(1);
        // if value too long even for firstLineW, re-split rest with broader width
        if (valueLines.length > 1) {
          rest = doc.splitTextToSize(valueLines.slice(1).join(" "), innerW - indent);
        }

        if (cy > PAGE_H - MARGIN_BOTTOM - 10) {
          drawFooter(doc); doc.addPage(); drawTopBand(doc); cy = 14;
        }
        // bullet
        doc.setFont("helvetica", "normal");
        setText(doc, COLOR_TEXT);
        doc.text(bullet, innerX, cy);
        // label bold
        if (label) {
          doc.setFont("helvetica", "bold");
          doc.text(label, innerX + indent, cy);
        }
        // value normal
        doc.setFont("helvetica", "normal");
        doc.text(firstLine, innerX + indent + labelW, cy);
        cy += lineH;
        for (const r of rest) {
          if (cy > PAGE_H - MARGIN_BOTTOM - 10) {
            drawFooter(doc); doc.addPage(); drawTopBand(doc); cy = 14;
          }
          doc.text(r, innerX + indent, cy);
          cy += lineH;
        }
      });

      if (i < sections.length - 1) cy += 2;
    });
    return cy;
  };

  y = drawBorderedBox(doc, y, renderInner);
  return y;
}

// Parse a free-form string into bullet lines. If text contains lines that look
// like "Label: value" or "- Label: value", we split them into label/value lines.
function parseBulletLines(text: string): Array<{ label?: string; value?: string; text?: string }> {
  const out: Array<{ label?: string; value?: string; text?: string }> = [];
  const raw = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of raw) {
    const cleaned = line.replace(/^[-•*]\s*/, "");
    const m = cleaned.match(/^([^:]{1,60}):\s*(.*)$/);
    if (m) out.push({ label: m[1].trim(), value: m[2].trim() });
    else out.push({ text: cleaned });
  }
  return out;
}

// ============ ACTOR PDF ============
async function buildActorPDF(station: StationLike): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await loadLogoDataURL();

  let y = drawHeader(doc, station, "ATOR", logo);
  y = drawSectionBar(doc, y, "Instruções ao ator");

  const p = station.patient_profile ?? {};
  const sections: BoxSection[] = [];

  // Intro paragraph
  sections.push({
    title: "Orientações",
    lines: [{
      paragraph:
        "Você é o(a) ator(atriz) desta estação. Mantenha-se no personagem e responda conforme o roteiro abaixo. Só revele as informações marcadas como “somente se perguntado” quando o candidato perguntar especificamente. Nunca revele as informações marcadas como “não revelar”.",
    }],
  });

  // Dados pessoais
  const dadosLines: BoxSection["lines"] = [];
  const dadosParts: string[] = [];
  if (p.name) dadosParts.push(p.name);
  if (p.age) dadosParts.push(`${p.age} anos`);
  if (p.sex) dadosParts.push(p.sex);
  if (p.profession) dadosParts.push(p.profession);
  if (p.city) dadosParts.push(p.city);
  if (dadosParts.length) dadosLines.push({ text: dadosParts.join(", ") + "." });
  if (dadosLines.length) sections.push({ title: "Dados pessoais", lines: dadosLines });

  if (p.chiefComplaint) {
    sections.push({
      title: "Motivo de consulta",
      lines: [{ text: `“${p.chiefComplaint}”` }],
    });
  }

  if (p.hpi || p.symptoms) {
    const lines: BoxSection["lines"] = [];
    if (p.hpi) lines.push(...parseBulletLines(p.hpi));
    if (p.symptoms) lines.push(...parseBulletLines(p.symptoms));
    sections.push({ title: "História da doença atual", lines });
  }

  if (p.personalHistory || p.medications || p.allergies) {
    const lines: BoxSection["lines"] = [];
    if (p.personalHistory) lines.push({ label: "Comorbidades", value: p.personalHistory });
    if (p.medications) lines.push({ label: "Uso de medicamentos", value: p.medications });
    if (p.allergies) lines.push({ label: "Alergias", value: p.allergies });
    sections.push({ title: "Antecedentes pessoais", lines });
  }

  if (p.familyHistory) {
    sections.push({ title: "Antecedentes familiares", lines: parseBulletLines(p.familyHistory) });
  }

  if (p.habits) {
    sections.push({ title: "Hábitos", lines: parseBulletLines(p.habits) });
  }

  if (p.vitals || p.previousExams) {
    const lines: BoxSection["lines"] = [];
    if (p.vitals) lines.push({ label: "Sinais vitais", value: p.vitals });
    if (p.previousExams) lines.push({ label: "Exames prévios", value: p.previousExams });
    sections.push({ title: "Informações clínicas", lines });
  }

  if (p.spontaneous || p.onlyIfAsked || p.doNotReveal) {
    const lines: BoxSection["lines"] = [];
    if (p.spontaneous) lines.push({ label: "Falar espontaneamente", value: p.spontaneous });
    if (p.onlyIfAsked) lines.push({ label: "Só se perguntado", value: p.onlyIfAsked });
    if (p.doNotReveal) lines.push({ label: "Não revelar", value: p.doNotReveal });
    sections.push({ title: "Roteiro de revelação", lines });
  }

  if (p.emotionalTone || p.actingTips) {
    const lines: BoxSection["lines"] = [];
    if (p.emotionalTone) lines.push({ label: "Tom emocional", value: p.emotionalTone });
    if (p.actingTips) lines.push({ label: "Dicas", value: p.actingTips });
    sections.push({ title: "Atuação", lines });
  }

  renderBoxSections(doc, y, sections);

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) { doc.setPage(i); drawFooter(doc); }
  return doc;
}

// ============ CANDIDATE PDF ============
async function buildCandidatePDF(station: StationLike, items: ChecklistItem[]): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await loadLogoDataURL();

  // ---- Page 1: Instruções ao participante ----
  let y = drawHeader(doc, station, "PARTICIPANTE", logo);
  y = drawSectionBar(doc, y, "Instruções ao participante");

  const sections: BoxSection[] = [];
  sections.push({
    title: "Tempo da estação",
    lines: [{ text: `${station.duration_minutes} minutos para completar a estação.` }],
  });

  if (station.support_materials?.trim()) {
    sections.push({ title: "Cenário de atendimento", lines: [{ paragraph: station.support_materials }] });
  }
  if (station.case_description?.trim()) {
    sections.push({ title: "Descrição do caso", lines: [{ paragraph: station.case_description }] });
  }
  if (station.candidate_task?.trim()) {
    sections.push({ title: "Tarefas do candidato", lines: parseBulletLines(station.candidate_task) });
  }

  renderBoxSections(doc, y, sections);

  // ---- Impressos (one per page) ----
  const printable = (station.deliverable_materials ?? []).filter(
    (m) => m && (m.content?.trim() || m.description?.trim() || m.imageUrl),
  );
  for (let idx = 0; idx < printable.length; idx++) {
    const m = printable[idx];
    doc.addPage();
    let py = drawHeader(doc, station, "IMPRESSO", logo);
    py = drawSectionBar(doc, py, `Impresso ${idx + 1} — ${m.name || m.type}`);
    const lines: BoxSection["lines"] = [];
    if (m.type) lines.push({ label: "Tipo", value: m.type });
    if (m.description?.trim()) lines.push({ paragraph: m.description });
    if (m.content?.trim()) lines.push({ paragraph: m.content });
    if (m.imageUrl) lines.push({ label: "Imagem anexa", value: m.imageUrl });
    renderBoxSections(doc, py, [{ title: m.name || m.type || "Impresso", lines }]);
  }

  // ---- PEP ----
  if (items.length > 0) {
    doc.addPage();
    let py = drawHeader(doc, station, "PEP", logo);
    py = drawSectionBar(doc, py, "Padrão esperado de procedimento (PEP)");

    const head = [["#", "Item de desempenho avaliado", "Inadequado", "Parcial.\nadequado", "Adequado"]];
    const body = items
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((it, idx) => {
        const lv = it.levels ?? [];
        const sorted = lv.slice().sort((a, b) => (a.points ?? 0) - (b.points ?? 0));
        const inad = sorted[0];
        const adeq = sorted[sorted.length - 1];
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
      startY: py,
      head,
      body,
      margin: { left: MARGIN_X, right: MARGIN_X, bottom: MARGIN_BOTTOM + 6, top: 14 },
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2, lineColor: COLOR_BORDER, lineWidth: 0.2, textColor: COLOR_TEXT, valign: "top" },
      headStyles: { fillColor: COLOR_BRAND, textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 22, halign: "center" },
      },
      alternateRowStyles: { fillColor: [240, 250, 246] },
    });

    const totalPts = items.reduce((s, it) => s + (it.points ?? 0), 0);
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? py;
    let ty = finalY + 5;
    if (ty > PAGE_H - MARGIN_BOTTOM - 12) { doc.addPage(); drawTopBand(doc); ty = 18; }
    setFill(doc, COLOR_BRAND_LIGHT);
    doc.rect(MARGIN_X, ty, CONTENT_W, 9, "F");
    setText(doc, COLOR_BRAND_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(`Pontuação total: ${totalPts.toFixed(2)} pontos`, MARGIN_X + 4, ty + 6);
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
