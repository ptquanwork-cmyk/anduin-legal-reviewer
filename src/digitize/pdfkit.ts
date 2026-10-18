import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { BLOCK_START } from '../review/extract';

/**
 * Liberation Sans 1.07 (SIL OFL, shipped with pdfjs-dist) has no Vietnamese letters beyond Đ/đ, so flowing text that
 * may quote the document (reports, revised drafts) uses DejaVu Sans (`wide`). Form fill keeps Liberation (its box
 * widths and clipping QA were measured with it) and switches to DejaVu only for answers with letters Liberation lacks.
 */
export async function embedFonts(doc: PDFDocument, wide = false) {
  doc.registerFontkit(fontkit);
  const dir = path.join(process.cwd(), 'src/assets/fonts');
  const [r, b] = wide ? ['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf'] : ['LiberationSans-Regular.ttf', 'LiberationSans-Bold.ttf'];
  const [regular, bold] = await Promise.all([readFile(path.join(dir, r)), readFile(path.join(dir, b))]);
  return { regular: await doc.embedFont(regular, { subset: true }), bold: await doc.embedFont(bold, { subset: true }) };
}

/**
 * Plain-text rendition of source blocks in reading order, keeping the original page breaks. Lines are wrapped so that
 * re-reading the PDF gives the same blocks (no continuation line starts like a clause). Layout, styling and form fields
 * of the original are not copied (ponytail: text only; rewriting the original PDF in place needs per-quote geometry).
 */
export async function textRendition(blocks: { page: number | null; kind: string; text: string }[], title: string) {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setProducer('Anduin Legal Reviewer');
  const w = new Writer(doc, await embedFonts(doc, true));
  let page: number | null = null;
  for (const b of blocks) {
    if (b.kind === 'header' || b.kind === 'footer' || !b.text.trim()) continue;
    if (b.page != null && page != null && b.page > page) w.pageBreak();
    page = b.page ?? page;
    const head = b.kind === 'title' || b.kind === 'heading';
    w.text(b.text.replace(/\t/g, ' '), { size: b.kind === 'title' ? 16 : head ? 12 : 10.5, bold: head, gap: head ? 6 : 5, avoid: BLOCK_START });
  }
  return doc.save();
}

/** Wraps to width. With `avoid`, a continuation line never starts with text matching it (one more word moves down). */
export function wrap(text: string, font: PDFFont, size: number, max: number, avoid?: RegExp) {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    const ws = para.split(/\s+/).filter(Boolean);
    let line: string[] = [];
    ws.forEach((word, i) => {
      if (!line.length || font.widthOfTextAtSize([...line, word].join(' '), size) <= max) return void line.push(word);
      const carry: string[] = [];
      while (avoid && line.length > 1 && avoid.test(`${[...carry, ...ws.slice(i, i + 2)].join(' ')} `)) carry.unshift(line.pop()!);
      lines.push(line.join(' '));
      line = [...carry, word];
    });
    lines.push(line.join(' '));
  }
  return lines;
}

/** Simple flowing text writer for generated reports (A4, top-left cursor). */
export class Writer {
  page: PDFPage;
  y: number;
  constructor(
    public doc: PDFDocument,
    public fonts: { regular: PDFFont; bold: PDFFont },
    public margin = 56,
  ) {
    this.page = doc.addPage([595.28, 841.89]);
    this.y = this.page.getHeight() - margin;
  }
  get width() {
    return this.page.getWidth() - this.margin * 2;
  }
  ensure(h: number) {
    if (this.y - h < this.margin) {
      this.page = this.doc.addPage([595.28, 841.89]);
      this.y = this.page.getHeight() - this.margin;
    }
  }
  text(s: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number; gap?: number; avoid?: RegExp } = {}) {
    const size = opts.size ?? 10.5;
    const font = opts.bold ? this.fonts.bold : this.fonts.regular;
    const indent = opts.indent ?? 0;
    for (const line of wrap(s, font, size, this.width - indent, opts.avoid)) {
      this.ensure(size * 1.4);
      this.page.drawText(line, { x: this.margin + indent, y: this.y - size, size, font, color: rgb(...(opts.color ?? [0.09, 0.16, 0.22])) });
      this.y -= size * 1.4;
    }
    this.y -= opts.gap ?? 4;
  }
  /** Starts a new page unless the current one is still empty. */
  pageBreak() {
    if (this.y < this.page.getHeight() - this.margin) this.ensure(Infinity);
  }
  rule() {
    this.ensure(10);
    this.page.drawLine({ start: { x: this.margin, y: this.y - 4 }, end: { x: this.margin + this.width, y: this.y - 4 }, thickness: 0.6, color: rgb(0.82, 0.87, 0.93) });
    this.y -= 12;
  }
}
