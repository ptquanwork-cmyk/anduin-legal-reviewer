import { PDFDocument, rgb, degrees, type PDFFont } from 'pdf-lib';
import type { AnnotationRow, BlockRow, QaCheck, QaIssue } from '../lib/types';
import { extractPdf } from '../review/extract';
import { norm } from '../review/text';
import { embedFonts } from './pdfkit';

const MIN_SIZE = 8;

function fit(text: string, font: PDFFont, max: number, h: number) {
  let size = Math.min(11, Math.max(MIN_SIZE, h * 0.62));
  while (size > MIN_SIZE && font.widthOfTextAtSize(text, size) > max) size -= 0.5;
  if (font.widthOfTextAtSize(text, size) <= max) return { size, shown: text, clipped: false };
  // Too long even at the minimum size: draw what fits and report it. Nothing is silently shortened.
  let shown = text;
  while (shown.length > 1 && font.widthOfTextAtSize(shown, size) > max) shown = shown.slice(0, -1);
  return { size, shown: shown.trimEnd(), clipped: true };
}

/**
 * Writes answers into the source PDF at the approved annotation geometry, then re-reads the output to check
 * content coverage, field mapping, answer values and rendering. Final output is produced only when QA passes.
 */
export async function fillAndCheck(source: Uint8Array, anns: AnnotationRow[], blocks: BlockRow[], answers: Record<string, string | string[]>, final: boolean) {
  const doc = await PDFDocument.load(source, { ignoreEncryption: false });
  // Fillable source PDFs: their widgets would sit on top of the drawn answers, so they are flattened first.
  if (doc.getForm().getFields().length) doc.getForm().flatten();
  const fonts = await embedFonts(doc);
  const pages = doc.getPages();
  const issues: QaIssue[] = [];
  const drawn: { field_id: string; page: number; text: string; clipped: boolean }[] = [];
  const fields = anns.filter((a) => a.type !== 'paragraph');

  for (const a of fields) {
    const v = answers[a.field_id];
    const page = pages[a.page - 1];
    if (!page) {
      issues.push({ field_id: a.field_id, title: `Field ${a.field_id} points to a missing page`, detail: `Page ${a.page} does not exist in the source PDF.` });
      continue;
    }
    const H = page.getHeight();
    const toY = (y: number, h: number) => H - y - h;
    if (a.type === 'text_box' && typeof v === 'string' && v.trim()) {
      const padX = 3;
      const f = fit(v.trim(), fonts.regular, a.bbox.w - padX * 2, a.bbox.h);
      page.drawRectangle({ x: a.bbox.x, y: toY(a.bbox.y, a.bbox.h) + 2, width: a.bbox.w, height: a.bbox.h - 3, color: rgb(1, 1, 1) });
      page.drawText(f.shown, { x: a.bbox.x + padX, y: toY(a.bbox.y, a.bbox.h) + (a.bbox.h - f.size) / 2 + 1, size: f.size, font: fonts.regular, color: rgb(0.05, 0.1, 0.3) });
      drawn.push({ field_id: a.field_id, page: a.page, text: f.shown, clipped: f.clipped });
      if (f.clipped) {
        if (!final) page.drawRectangle({ x: a.bbox.x - 2, y: toY(a.bbox.y, a.bbox.h) - 2, width: a.bbox.w + 4, height: a.bbox.h + 4, borderColor: rgb(0.9, 0.22, 0.25), borderWidth: 1.2 });
        issues.push({ field_id: a.field_id, page: a.page, title: `Answer clipped in ${a.field_id}`, detail: `The answer "${v.trim()}" exceeds the available space even at ${MIN_SIZE} pt; the PDF shows "${f.shown}".` });
      }
    }
    if ((a.type === 'radio' || a.type === 'checkbox') && v) {
      const chosen = Array.isArray(v) ? v : [v];
      for (const o of a.options.filter((x) => chosen.includes(x.value))) {
        const s = Math.min(o.bbox.h, 12);
        const cx = o.bbox.x + s / 2 + 1;
        const cy = toY(o.bbox.y, o.bbox.h) + o.bbox.h / 2;
        if (a.type === 'radio') page.drawCircle({ x: cx, y: cy, size: s * 0.28, color: rgb(0.05, 0.1, 0.3) });
        else page.drawText('X', { x: cx - s * 0.28, y: cy - s * 0.36, size: s * 0.8, font: fonts.bold, color: rgb(0.05, 0.1, 0.3) });
        drawn.push({ field_id: a.field_id, page: a.page, text: o.label, clipped: false });
      }
    }
  }
  if (!final) {
    for (const p of pages) p.drawText('DRAFT - NOT VERIFIED', { x: p.getWidth() - 170, y: p.getHeight() - 30, size: 11, font: fonts.bold, color: rgb(0.85, 0.2, 0.25), rotate: degrees(0) });
  }
  const bytes = await doc.save();

  // QA: read the output back.
  const out = await extractPdf(bytes);
  const outText = norm(out.blocks.map((b) => b.text).join(' ')).toLowerCase();
  const sourceBlocks = blocks.filter((b) => b.kind !== 'header' && b.kind !== 'footer');
  const isField = new Set(fields.map((f) => f.source_block_idx));
  const missing = sourceBlocks.filter((b) => !isField.has(b.idx) && !outText.includes(norm(b.text).toLowerCase().slice(0, 50)));
  const unmappedRequired = fields.filter((f) => f.required && !answers[f.field_id]);
  const valueProblems = drawn.filter((d) => !d.clipped && d.text.length > 2 && !outText.includes(norm(d.text).toLowerCase()));
  const clipped = drawn.filter((d) => d.clipped);
  const unknownKeys = Object.keys(answers).filter((k) => !fields.some((f) => f.field_id === k));

  const checks: QaCheck[] = [
    { key: 'content', label: 'Content coverage', status: missing.length ? 'issue' : 'pass', detail: missing.length ? `${missing.length} source block(s) not found in the output` : `${sourceBlocks.length} source blocks present` },
    { key: 'mapping', label: 'Field mapping', status: unknownKeys.length || unmappedRequired.length ? 'needs_review' : 'pass', detail: unknownKeys.length ? `${unknownKeys.length} answer(s) without a field in this version` : unmappedRequired.length ? `${unmappedRequired.length} required field(s) empty` : `${fields.length} field(s) mapped to this version` },
    { key: 'values', label: 'Answer values', status: valueProblems.length || clipped.length ? 'issue' : 'pass', detail: clipped.length ? `${clipped.length} value(s) clipped` : valueProblems.length ? `${valueProblems.length} value(s) not found when re-reading the PDF` : 'All written values read back' },
    { key: 'render', label: 'Page render', status: clipped.length || out.pages.length !== pages.length ? 'issue' : 'pass', detail: out.pages.length !== pages.length ? 'Page count changed' : clipped.length ? 'Text overflows its field' : `${pages.length} page(s) rendered` },
  ];
  for (const b of missing.slice(0, 5)) issues.push({ page: b.page ?? undefined, title: 'Source text missing in output', detail: b.text.slice(0, 160) });
  for (const k of unknownKeys) issues.push({ field_id: k, title: `Answer ${k} has no field`, detail: 'The template changed after answering; revalidate answers.' });
  return { bytes, checks, issues, passed: checks.every((c) => c.status === 'pass') };
}
