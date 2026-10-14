import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

/** Liberation Sans (SIL OFL, shipped with pdfjs-dist) covers Vietnamese and other Latin scripts. */
export async function embedFonts(doc: PDFDocument) {
  doc.registerFontkit(fontkit);
  const dir = path.join(process.cwd(), 'src/assets/fonts');
  const [regular, bold] = await Promise.all([readFile(path.join(dir, 'LiberationSans-Regular.ttf')), readFile(path.join(dir, 'LiberationSans-Bold.ttf'))]);
  return { regular: await doc.embedFont(regular, { subset: true }), bold: await doc.embedFont(bold, { subset: true }) };
}

export function wrap(text: string, font: PDFFont, size: number, max: number) {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= max || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
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
  text(s: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number; gap?: number } = {}) {
    const size = opts.size ?? 10.5;
    const font = opts.bold ? this.fonts.bold : this.fonts.regular;
    const indent = opts.indent ?? 0;
    for (const line of wrap(s, font, size, this.width - indent)) {
      this.ensure(size * 1.4);
      this.page.drawText(line, { x: this.margin + indent, y: this.y - size, size, font, color: rgb(...(opts.color ?? [0.09, 0.16, 0.22])) });
      this.y -= size * 1.4;
    }
    this.y -= opts.gap ?? 4;
  }
  rule() {
    this.ensure(10);
    this.page.drawLine({ start: { x: this.margin, y: this.y - 4 }, end: { x: this.margin + this.width, y: this.y - 4 }, thickness: 0.6, color: rgb(0.82, 0.87, 0.93) });
    this.y -= 12;
  }
}
