import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
const MARGIN_X = 20;
const MARGIN_TOP = 18;
const MARGIN_BOTTOM = 18;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const COLOR_TEXT: [number, number, number] = [25, 30, 40];
const COLOR_MUTED: [number, number, number] = [110, 116, 130];
const COLOR_BRAND: [number, number, number] = [13, 67, 113];
const COLOR_ACCENT: [number, number, number] = [180, 36, 56];
const COLOR_LIGHT_BG: [number, number, number] = [240, 244, 250];
const COLOR_BORDER: [number, number, number] = [210, 218, 230];

// ============ Helpers ============
function setText(doc: jsPDF, c: [number, number, number]) { doc.setTextColor(c[0], c[1], c[2]); }
function setFill(doc: jsPDF, c: [number, number, number]) { doc.setFillColor(c[0], c[1], c[2]); }
function setStroke(doc: jsPDF, c: [number, number, number]) { doc.setDrawColor(c[0], c[1], c[2]); }

function drawPageHeader(doc: jsPDF, station: StationLike, kind: "ATOR" | "PARTICIPANTE" | "IMPRESSO" | "PEP") {
  // top brand band
  setFill(doc, COLOR_BRAND);
  doc.rect(0, 0, PAGE_W, 10, "F");
  setText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ESTAÇÃO REVALIDA", MARGIN_X, 6.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Material de simulação para impressão", PAGE_W - MARGIN_X, 6.8, { align: "right" });

  // kind chip
  const chipY = 14;
  setFill(doc, kind === "ATOR" ? COLOR_ACCENT : COLOR_BRAND);
  doc.roundedRect(MARGIN_X, chipY, 26, 6, 1.5, 1.5, "F");
  setText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(kind, MARGIN_X + 13, chipY + 4.2, { align: "center" });

  // title
  setText(doc, COLOR_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const titleSuffix = kind === "ATOR" ? " — ATOR" : "";
  const title = `${station.title}${titleSuffix}`;
  const wrapped = doc.splitTextToSize(title, CONTENT_W - 32);
  doc.text(wrapped, MARGIN_X + 30, chipY + 4.8);

  // specialty under title
  setText(doc, COLOR_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Estação: ${station.specialty.toUpperCase()} · ${station.duration_minutes} min`, MARGIN_X, chipY + 12);

  // divider
  setStroke(doc, COLOR_BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, chipY + 15, PAGE_W - MARGIN_X, chipY + 15);

  return chipY + 21;
}

function drawPageFooter(doc: jsPDF) {
  const pageNum = doc.getNumberOfPages();
  setText(doc, COLOR_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("estacaorevalida.com.br", MARGIN_X, PAGE_H - 8);
  doc.text(`Página ${pageNum}`, PAGE_W - MARGIN_X, PAGE_H - 8, { align: "right" });
}

function sectionHeading(doc: jsPDF, y: number, label: string): number {
  if (y > PAGE_H - MARGIN_BOTTOM - 18) {
    drawPageFooter(doc);
    doc.addPage();
    y = MARGIN_TOP;
  }
  setFill(doc, COLOR_LIGHT_BG);
  doc.rect(MARGIN_X, y, CONTENT_W, 7, "F");
  setText(doc, COLOR_BRAND);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(label.toUpperCase(), MARGIN_X + 3, y + 5);
  return y + 11;
}

function paragraph(doc: jsPDF, y: number, text: string, opts?: { bold?: boolean; size?: number; indent?: number }): number {
  const size = opts?.size ?? 10;
  const indent = opts?.indent ?? 0;
  doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
  doc.setFontSize(size);
  setText(doc, COLOR_TEXT);
  const lines = doc.splitTextToSize(text, CONTENT_W - indent);
  for (const line of lines) {
    if (y > PAGE_H - MARGIN_BOTTOM - 6) {
      drawPageFooter(doc);
      doc.addPage();
      y = MARGIN_TOP;
    }
    doc.text(line, MARGIN_X + indent, y);
    y += size * 0.5;
  }
  return y + 1.5;
}

function labeledRow(doc: jsPDF, y: number, label: string, value: string): number {
  if (!value || !value.trim()) return y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  setText(doc, COLOR_BRAND);
  doc.text(`${label}:`, MARGIN_X, y);
  doc.setFont("helvetica", "normal");
  setText(doc, COLOR_TEXT);
  const labelW = doc.getTextWidth(`${label}: `);
  const lines = doc.splitTextToSize(value, CONTENT_W - labelW);
  doc.text(lines[0] ?? "", MARGIN_X + labelW, y);
  let cy = y + 5;
  for (let i = 1; i < lines.length; i++) {
    if (cy > PAGE_H - MARGIN_BOTTOM - 6) {
      drawPageFooter(doc); doc.addPage(); cy = MARGIN_TOP;
    }
    doc.text(lines[i], MARGIN_X, cy);
    cy += 5;
  }
  return cy + 1;
}

// ============ ACTOR PDF ============
export function generateActorPDF(station: StationLike): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = drawPageHeader(doc, station, "ATOR");

  y = sectionHeading(doc, y, "Instruções ao ator");
  y = paragraph(
    doc,
    y,
    "Você é o(a) ator(atriz) desta estação. Mantenha-se no personagem e responda conforme o roteiro abaixo. Só revele as informações marcadas como 'somente se perguntado' quando o candidato perguntar especificamente. Nunca revele as informações marcadas como 'não revelar'.",
  );

  const p = station.patient_profile ?? {};

  if (p.name || p.age || p.sex || p.profession || p.city) {
    y = sectionHeading(doc, y, "Dados pessoais");
    const parts: string[] = [];
    if (p.name) parts.push(p.name);
    if (p.age) parts.push(`${p.age} anos`);
    if (p.sex) parts.push(p.sex);
    if (p.profession) parts.push(p.profession);
    if (p.city) parts.push(p.city);
    y = paragraph(doc, y, parts.join(" · "));
  }

  if (p.chiefComplaint) {
    y = sectionHeading(doc, y, "Motivo da consulta");
    y = paragraph(doc, y, `"${p.chiefComplaint}"`);
  }

  if (p.hpi || p.symptoms) {
    y = sectionHeading(doc, y, "História da doença atual");
    if (p.hpi) y = paragraph(doc, y, p.hpi);
    if (p.symptoms) y = labeledRow(doc, y, "Sintomas associados", p.symptoms);
  }

  const hasAntecedentes = p.personalHistory || p.medications || p.allergies || p.familyHistory;
  if (hasAntecedentes) {
    y = sectionHeading(doc, y, "Antecedentes");
    if (p.personalHistory) y = labeledRow(doc, y, "Pessoais", p.personalHistory);
    if (p.medications) y = labeledRow(doc, y, "Medicações", p.medications);
    if (p.allergies) y = labeledRow(doc, y, "Alergias", p.allergies);
    if (p.familyHistory) y = labeledRow(doc, y, "Familiares", p.familyHistory);
  }

  if (p.habits) {
    y = sectionHeading(doc, y, "Hábitos de vida");
    y = paragraph(doc, y, p.habits);
  }

  if (p.vitals || p.previousExams) {
    y = sectionHeading(doc, y, "Informações clínicas");
    if (p.vitals) y = labeledRow(doc, y, "Sinais vitais", p.vitals);
    if (p.previousExams) y = labeledRow(doc, y, "Exames prévios", p.previousExams);
  }

  if (p.spontaneous || p.onlyIfAsked || p.doNotReveal) {
    y = sectionHeading(doc, y, "Roteiro de revelação");
    if (p.spontaneous) y = labeledRow(doc, y, "Falar espontaneamente", p.spontaneous);
    if (p.onlyIfAsked) y = labeledRow(doc, y, "Só se perguntado", p.onlyIfAsked);
    if (p.doNotReveal) y = labeledRow(doc, y, "Não revelar", p.doNotReveal);
  }

  if (p.emotionalTone || p.actingTips) {
    y = sectionHeading(doc, y, "Atuação");
    if (p.emotionalTone) y = labeledRow(doc, y, "Tom emocional", p.emotionalTone);
    if (p.actingTips) y = labeledRow(doc, y, "Dicas", p.actingTips);
  }

  drawPageFooter(doc);
  return doc;
}

// ============ CANDIDATE PDF ============
export function generateCandidatePDF(station: StationLike, items: ChecklistItem[]): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // ---------- Page 1: Instruções ao Participante ----------
  let y = drawPageHeader(doc, station, "PARTICIPANTE");

  y = sectionHeading(doc, y, "Instruções ao participante");
  y = paragraph(
    doc,
    y,
    `Você terá ${station.duration_minutes} minutos para realizar esta estação. Leia atentamente a descrição do caso, execute as tarefas propostas e solicite os impressos quando pertinente.`,
  );

  if (station.support_materials && station.support_materials.trim()) {
    y = sectionHeading(doc, y, "Cenário de atendimento");
    y = paragraph(doc, y, station.support_materials);
  }

  if (station.case_description && station.case_description.trim()) {
    y = sectionHeading(doc, y, "Descrição do caso");
    y = paragraph(doc, y, station.case_description);
  }

  if (station.candidate_task && station.candidate_task.trim()) {
    y = sectionHeading(doc, y, "Tarefas do candidato");
    y = paragraph(doc, y, station.candidate_task);
  }

  drawPageFooter(doc);

  // ---------- Impressos (one per page) ----------
  const printable = (station.deliverable_materials ?? []).filter(m => m && (m.content?.trim() || m.description?.trim() || m.imageUrl));
  printable.forEach((m, idx) => {
    doc.addPage();
    let py = drawPageHeader(doc, station, "IMPRESSO");
    py = sectionHeading(doc, py, `Impresso ${idx + 1} — ${m.name || m.type}`);
    if (m.type) {
      setText(doc, COLOR_MUTED);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text(m.type, MARGIN_X, py);
      py += 6;
    }
    if (m.description?.trim()) {
      py = paragraph(doc, py, m.description, { bold: true });
    }
    if (m.content?.trim()) {
      py = paragraph(doc, py, m.content);
    }
    if (m.imageUrl) {
      setText(doc, COLOR_MUTED);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.text(`Imagem anexa: ${m.imageUrl}`, MARGIN_X, py + 2);
    }
    drawPageFooter(doc);
  });

  // ---------- PEP ----------
  if (items.length > 0) {
    doc.addPage();
    let py = drawPageHeader(doc, station, "PEP");
    py = sectionHeading(doc, py, "Padrão esperado de procedimento (PEP)");
    py = paragraph(
      doc,
      py,
      "O desempenho do participante é avaliado conforme os itens abaixo, com pontuação por nível de desempenho.",
    );

    // Build table rows: each row = [n. descrição (+ helper), level1 pts, level2 pts, level3 pts]
    // Many checklists have 2 or 3 levels — we normalize to 3 columns: Inadequado / Parcialmente adequado / Adequado.
    const head = [["#", "Item de desempenho avaliado", "Inadequado", "Parcial.\nadequado", "Adequado"]];
    const body = items
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((it, idx) => {
        const lv = it.levels ?? [];
        // Sort levels by points ascending so Inadequado=lowest, Adequado=highest
        const sorted = lv.slice().sort((a, b) => (a.points ?? 0) - (b.points ?? 0));
        const inad = sorted[0];
        const adeq = sorted[sorted.length - 1];
        const parc = sorted.length >= 3 ? sorted[Math.floor(sorted.length / 2)] : null;

        // Cell content: description + helper text + level descriptions inline
        let cell = it.description || "";
        if (it.helper_text?.trim()) cell += `\n${it.helper_text.trim()}`;
        const levelHints = sorted
          .filter(s => s.description?.trim())
          .map(s => `${s.label}: ${s.description?.trim()}`)
          .join("\n");
        if (levelHints) cell += `\n${levelHints}`;

        return [
          String(idx + 1),
          cell,
          inad ? inad.points.toFixed(2) : "—",
          parc ? parc.points.toFixed(2) : (sorted.length === 2 ? "—" : "—"),
          adeq ? adeq.points.toFixed(2) : "—",
        ];
      });

    autoTable(doc, {
      startY: py,
      head,
      body,
      margin: { left: MARGIN_X, right: MARGIN_X, bottom: MARGIN_BOTTOM + 4, top: MARGIN_TOP },
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: 2,
        lineColor: COLOR_BORDER,
        lineWidth: 0.2,
        textColor: COLOR_TEXT,
        valign: "top",
      },
      headStyles: {
        fillColor: COLOR_BRAND,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 22, halign: "center" },
      },
      alternateRowStyles: { fillColor: [248, 250, 253] },
      didDrawPage: () => {
        // Re-draw header on new pages caused by table overflow
        const pageNum = doc.getNumberOfPages();
        if (pageNum > 1) {
          // header was drawn manually for the first PEP page; for subsequent pages added by autotable, re-draw a slim header
          // Note: autoTable adds new pages without our header; redraw it
        }
        drawPageFooter(doc);
      },
    });

    // Total row
    const totalPts = items.reduce((s, it) => s + (it.points ?? 0), 0);
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? py;
    let ty = finalY + 6;
    if (ty > PAGE_H - MARGIN_BOTTOM - 10) { doc.addPage(); ty = MARGIN_TOP; }
    setFill(doc, COLOR_LIGHT_BG);
    doc.rect(MARGIN_X, ty, CONTENT_W, 8, "F");
    setText(doc, COLOR_BRAND);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Pontuação total da estação: ${totalPts.toFixed(2)} pontos`, MARGIN_X + 3, ty + 5.5);
  }

  return doc;
}

// ============ Public download helpers ============
function safeSlug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase()
    .slice(0, 80) || "estacao";
}

export function downloadActorPDF(station: StationLike) {
  const doc = generateActorPDF(station);
  doc.save(`${safeSlug(station.title)}_ator.pdf`);
}

export function downloadCandidatePDF(station: StationLike, items: ChecklistItem[]) {
  const doc = generateCandidatePDF(station, items);
  doc.save(`${safeSlug(station.title)}.pdf`);
}
