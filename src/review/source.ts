import { diffArrays } from 'diff';
import type { SourceIssue, SourceReport } from '../lib/types';
import type { Block } from './model';
import { norm, words } from './text';

const fontKey = (f: string) =>
  f
    .replace(/^[A-Z]{6}\+/, '')
    .replace(/[-,](regular|bold|italic|bolditalic|oblique|roman|book|medium|light|semibold|mt|ps|psmt)+$/i, '')
    .replace(/(mt|ps|psmt)$/i, '')
    .replace(/[\s_-]/g, '')
    .toLowerCase();

/** Compares Word text/fonts with the converted PDF. Known representation differences are recorded, not hidden. */
export function compareConversion(
  docx: { text: string; declared: string[]; paragraphs: { text: string; fonts: string[] }[] },
  pdf: { blocks: Block[]; fonts: string[] },
): Pick<SourceReport, 'issues' | 'declared_fonts' | 'embedded_fonts' | 'text_diff'> {
  const issues: SourceIssue[] = [];
  const embedded = new Set(pdf.fonts.map(fontKey));

  for (const declared of docx.declared) {
    if (embedded.has(fontKey(declared))) continue;
    const para = docx.paragraphs.find((p) => p.fonts.includes(declared));
    const block = para ? findBlock(pdf.blocks, para.text) : undefined;
    const used = block?.fonts.filter((f) => !docx.declared.some((d) => fontKey(d) === fontKey(f)));
    issues.push({
      id: `font-${fontKey(declared)}`,
      kind: 'font_substitution',
      title: 'Font substitution',
      detail: `The converted PDF does not use "${declared}"${used?.length ? `; it was rendered with ${used.join(', ')}` : ''}. Verify that text content, formatting and meaning are consistent.`,
      page: block?.page ?? undefined,
      quote: block?.text ?? para?.text,
      block_idx: block?.idx,
      severity: 'blocking',
    });
  }

  // Word-level comparison. Leading list numbers are a known representation difference.
  const strip = (t: string) => words(t.replace(/(^|\s)\d+(\.\d+)*[.)](?=\s)/g, ' '));
  const a = strip(docx.text);
  const b = strip(pdf.blocks.filter((x) => x.kind !== 'header' && x.kind !== 'footer').map((x) => x.text).join(' '));
  const missing: string[] = [];
  const extra: string[] = [];
  for (const part of diffArrays(a, b)) {
    if (part.removed) missing.push(part.value.join(' '));
    if (part.added) extra.push(part.value.join(' '));
  }
  if (missing.length || extra.length) {
    issues.push({
      id: 'text-diff',
      kind: 'text_mismatch',
      title: 'Text differs after conversion',
      detail: `${missing.length} passage(s) missing and ${extra.length} added in the converted PDF.`,
      quote: missing[0] ?? extra[0],
      severity: 'blocking',
    });
  }
  return {
    issues,
    declared_fonts: docx.declared,
    embedded_fonts: pdf.fonts,
    text_diff: { missing: missing.slice(0, 20), extra: extra.slice(0, 20), normalized: ['Leading list numbers ignored', 'Whitespace and quote styles normalized'] },
  };
}

function findBlock(blocks: Block[], text: string) {
  const t = norm(text).toLowerCase();
  return blocks.find((b) => norm(b.text).toLowerCase().includes(t.slice(0, 60))) ?? blocks.find((b) => t.includes(norm(b.text).toLowerCase().slice(0, 40)));
}

export function coverage(pages: { n: number; chars: number }[]) {
  const unread = pages.filter((p) => p.chars < 20).map((p) => p.n);
  return { read_pages: pages.length - unread.length, total_pages: pages.length, unread_pages: unread };
}

export function sourceStatus(issues: SourceIssue[]): 'verified' | 'needs_review' | 'blocked' {
  if (issues.some((i) => i.kind === 'conversion_failed' || i.kind === 'unreadable' || i.kind === 'password')) return 'blocked';
  return issues.length ? 'needs_review' : 'verified';
}
