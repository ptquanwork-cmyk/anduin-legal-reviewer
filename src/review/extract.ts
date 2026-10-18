import type { Block } from './model';
import { assignSections } from './sections';
import { norm } from './text';

interface Item {
  str: string;
  x: number;
  y: number; // top, PDF points from page top
  w: number;
  h: number;
  font: string;
  bold: boolean;
}

interface Line {
  items: Item[];
  y: number;
  h: number;
  x: number;
  r: number;
}

export interface PdfExtraction {
  blocks: Block[];
  pages: { n: number; width: number; height: number; chars: number }[];
  fonts: string[];
}

/** Text items in reading order with geometry and real font names (subset prefixes removed). */
export async function extractPdf(data: Uint8Array): Promise<PdfExtraction> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({ data: data.slice(), disableFontFace: true, fontExtraProperties: true, useSystemFonts: false, verbosity: 0 });
  const doc = await task.promise;
  const blocks: Block[] = [];
  const pages: PdfExtraction['pages'] = [];
  const fonts = new Set<string>();

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    await page.getOperatorList(); // loads fonts into commonObjs so real names are available
    const tc = await page.getTextContent();
    const fontName = new Map<string, string>();
    const items: Item[] = [];
    for (const raw of tc.items as { str: string; transform: number[]; width: number; height: number; fontName: string }[]) {
      if (!raw.str || !raw.str.trim()) continue;
      if (!fontName.has(raw.fontName)) {
        let name = raw.fontName;
        try {
          const f = page.commonObjs.get(raw.fontName) as { name?: string } | undefined;
          if (f?.name) name = f.name.replace(/^[A-Z]{6}\+/, '');
        } catch {}
        fontName.set(raw.fontName, name);
        fonts.add(name);
      }
      const size = Math.hypot(raw.transform[2], raw.transform[3]) || raw.height || 10;
      const font = fontName.get(raw.fontName)!;
      items.push({ str: raw.str, x: raw.transform[4], y: vp.height - raw.transform[5] - size * 0.82, w: raw.width, h: size, font, bold: /bold|black|heavy|semibold/i.test(font) });
    }
    pages.push({ n, width: vp.width, height: vp.height, chars: items.reduce((s, i) => s + i.str.length, 0) });
    for (const b of linesToBlocks(groupLines(items), n, vp.height)) blocks.push({ ...b, idx: blocks.length });
  }
  await task.destroy();
  return { blocks: assignSections(blocks), pages, fonts: [...fonts] };
}

function groupLines(items: Item[]): Line[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: Line[] = [];
  for (const it of sorted) {
    const line = lines.find((l) => Math.abs(l.y - it.y) < Math.max(2, it.h * 0.45));
    if (line) {
      line.items.push(it);
      line.x = Math.min(line.x, it.x);
      line.r = Math.max(line.r, it.x + it.w);
      line.h = Math.max(line.h, it.h);
    } else lines.push({ items: [it], y: it.y, h: it.h, x: it.x, r: it.x + it.w });
  }
  for (const l of lines) l.items.sort((a, b) => a.x - b.x);
  return lines.sort((a, b) => a.y - b.y);
}

function lineText(l: Line) {
  let s = '';
  let prevEnd = -Infinity;
  for (const it of l.items) {
    if (s && it.x - prevEnd > it.h * 0.12 && !s.endsWith(' ') && !it.str.startsWith(' ')) s += ' ';
    s += it.str;
    prevEnd = it.x + it.w;
  }
  return norm(s);
}

/** A line starting like this opens a new block (numbered clause or heading). */
export const BLOCK_START = /^(\d+(\.\d+)*[.)]|section|article|điều|exhibit|schedule|phụ lục)\s/i;

function linesToBlocks(lines: Line[], page: number, pageHeight: number): Omit<Block, 'idx'>[] {
  const out: Omit<Block, 'idx'>[] = [];
  const sizes = lines.map((l) => l.h).sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)] ?? 10;
  let cur: { lines: Line[] } | null = null;
  const flush = () => {
    if (!cur) return;
    const ls = cur.lines;
    const text = norm(ls.map(lineText).join(' '));
    if (text) {
      const x = Math.min(...ls.map((l) => l.x));
      const y = ls[0].y;
      const r = Math.max(...ls.map((l) => l.r));
      const bottom = ls[ls.length - 1].y + ls[ls.length - 1].h;
      const all = ls.flatMap((l) => l.items);
      const size = Math.max(...ls.map((l) => l.h));
      const bold = all.filter((i) => i.bold).reduce((s, i) => s + i.str.length, 0) > all.reduce((s, i) => s + i.str.length, 0) * 0.6;
      const margin = y < pageHeight * 0.05 ? 'header' : bottom > pageHeight * 0.95 ? 'footer' : null;
      out.push({
        page,
        kind: margin ?? (page === 1 && out.length < 2 && size > median * 1.35 ? 'title' : /^([-•▪●◦]|\(?[a-z]\)|\(?[ivx]+\))\s/.test(text) ? 'list' : 'paragraph'),
        text,
        bbox: { x: round(x), y: round(y), w: round(r - x), h: round(bottom - y) },
        fonts: [...new Set(all.map((i) => i.font))],
        spans: all.map((i) => ({ text: i.str, x: round(i.x), y: round(i.y), w: round(i.w), h: round(i.h) })),
        fontSize: round(size),
        bold,
        section_ref: null,
        section_title: null,
      });
    }
    cur = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const prev = lines[i - 1];
    const gap = prev ? l.y - (prev.y + prev.h) : 0;
    const prevBold = prev?.items.every((it) => it.bold);
    const thisBold = l.items.every((it) => it.bold);
    const newBlock = !cur || gap > l.h * 0.75 || Math.abs(l.h - prev.h) > 1.5 || prevBold !== thisBold || BLOCK_START.test(lineText(l));
    if (newBlock) {
      flush();
      cur = { lines: [l] };
    } else cur!.lines.push(l);
  }
  flush();
  return out;
}

const round = (n: number) => Math.round(n * 10) / 10;

/** DOCX text and declared fonts, used to verify the converted PDF. */
export async function inspectDocx(data: Uint8Array) {
  const [{ default: mammoth }, { default: JSZip }] = await Promise.all([import('mammoth'), import('jszip')]);
  const buffer = Buffer.from(data);
  const { value: text } = await mammoth.extractRawText({ buffer });
  const zip = await JSZip.loadAsync(buffer);
  const xml = (await zip.file('word/document.xml')?.async('string')) ?? '';
  const styles = (await zip.file('word/styles.xml')?.async('string')) ?? '';
  const theme = (await zip.file('word/theme/theme1.xml')?.async('string')) ?? '';
  const declared = new Set<string>();
  for (const m of (xml + styles).matchAll(/<w:rFonts\b[^>]*?w:(?:ascii|hAnsi)="([^"]+)"/g)) declared.add(m[1]);
  if (/w:asciiTheme="minor/.test(xml + styles) || !declared.size) {
    const minor = /<a:minorFont>\s*<a:latin typeface="([^"]+)"/.exec(theme)?.[1];
    if (minor) declared.add(minor);
  }
  // Paragraph text with the fonts its runs declare, to locate substitutions.
  const paragraphs: { text: string; fonts: string[] }[] = [];
  for (const p of xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)) {
    const t = norm([...p[0].matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => decode(m[1])).join(''));
    if (!t) continue;
    paragraphs.push({ text: t, fonts: [...new Set([...p[0].matchAll(/w:ascii="([^"]+)"/g)].map((m) => m[1]))] });
  }
  return { text: norm(text), declared: [...declared], paragraphs };
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/** Blocks straight from DOCX paragraphs when no converted PDF is available (no geometry). */
export function blocksFromDocx(paragraphs: { text: string; fonts: string[] }[]): Block[] {
  return assignSections(
    paragraphs.map((p, idx) => ({ idx, page: null, kind: 'paragraph' as const, text: p.text, bbox: null, fonts: p.fonts, section_ref: null, section_title: null })),
  );
}
