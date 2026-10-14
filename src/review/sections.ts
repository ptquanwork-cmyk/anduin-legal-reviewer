import type { Block } from './model';
import { norm } from './text';

/** Normalized key for a section/exhibit so references and headings can be matched. */
export function refKey(kind: string, id: string) {
  const k = kind.toLowerCase();
  const family = /^(exhibit|schedule|appendix|annex|phụ lục)/u.test(k) ? 'annex' : 'sec';
  return `${family}:${id.replace(/\.$/, '').toLowerCase()}`;
}

const HEADING_PATTERNS: { re: RegExp; kind: (m: RegExpExecArray) => string; id: (m: RegExpExecArray) => string; title: (m: RegExpExecArray) => string }[] = [
  // "Section 2. Payment", "Article 4 - Delivery", "Clause 4.2 Notices"
  { re: /^(section|article|clause)\s+(\d+(?:\.\d+)*)\.?\s*[-:.]?\s*(.*)$/iu, kind: (m) => m[1], id: (m) => m[2], title: (m) => m[3] },
  // "Điều 3. Thanh toán", "Mục 2", "Chương I"
  { re: /^(điều|mục|chương|phần)\s+([\dIVXLC]+(?:\.\d+)*)\.?\s*[-:.]?\s*(.*)$/iu, kind: (m) => m[1], id: (m) => m[2], title: (m) => m[3] },
  // "Exhibit A - Services", "Schedule 1", "Phụ lục 01"
  { re: /^(exhibit|schedule|appendix|annex|phụ lục)\s+([\dA-Z]+)\b\.?\s*[-:.]?\s*(.*)$/iu, kind: (m) => m[1], id: (m) => m[2], title: (m) => m[3] },
  // "2. Payment", "4.2 Notices"
  { re: /^(\d+(?:\.\d+)*)[.)]?\s+(\p{Lu}[^.]{1,80})$/u, kind: () => 'section', id: (m) => m[1], title: (m) => m[2] },
];

export function parseHeading(text: string) {
  const t = norm(text);
  if (t.length > 110) return null;
  for (const p of HEADING_PATTERNS) {
    const m = p.re.exec(t);
    if (m) return { key: refKey(p.kind(m), p.id(m)), id: p.id(m), title: norm(p.title(m)) || t };
  }
  return null;
}

/** Marks headings and assigns each block to its enclosing section. Mutates and returns blocks. */
export function assignSections(blocks: Block[]) {
  let ref: string | null = null;
  let title: string | null = null;
  for (const b of blocks) {
    const h = b.kind === 'title' ? null : parseHeading(b.text);
    const shortBold = b.bold && b.text.length < 70 && !/[.;:]$/.test(b.text.trim());
    if (h || (shortBold && b.kind === 'paragraph')) {
      b.kind = 'heading';
      ref = h ? h.key : `heading:${b.idx}`;
      title = h ? h.title : norm(b.text);
    }
    b.section_ref = ref;
    b.section_title = title;
  }
  return blocks;
}

export interface Reference {
  key: string;
  label: string;
  block_idx: number;
  quote: string;
}

const REF_PATTERNS = [
  /\b(sections?|clauses?|articles?)\s+(\d+(?:\.\d+)*)/giu,
  /\b(exhibit|schedule|appendix|annex)\s+([A-Z0-9]+)\b/gu,
  /(?<![\p{L}])(điều|khoản|mục)\s+(\d+(?:\.\d+)*)/giu,
  /(?<![\p{L}])(phụ lục)\s+([\dA-Z]+)/giu,
];

export function findReferences(blocks: Block[]): Reference[] {
  const out: Reference[] = [];
  for (const b of blocks) {
    if (b.kind === 'heading' || b.kind === 'title') continue;
    for (const re of REF_PATTERNS) {
      re.lastIndex = 0;
      for (let m = re.exec(b.text); m; m = re.exec(b.text)) {
        const kind = m[1].replace(/s$/i, '');
        out.push({ key: refKey(kind, m[2]), label: `${cap(kind)} ${m[2]}`, block_idx: b.idx, quote: sentenceAround(b.text, m.index) });
      }
    }
  }
  return out;
}

/** Keys of every section/exhibit heading present, including parents of sub-numbered headings. */
export function presentKeys(blocks: Block[]) {
  const keys = new Set<string>();
  for (const b of blocks) {
    if (b.kind !== 'heading' || !b.section_ref) continue;
    keys.add(b.section_ref);
    const m = /^sec:(\d+)\./.exec(b.section_ref);
    if (m) keys.add(`sec:${m[1]}`);
  }
  // Inline numbered clauses like "4.2 The Provider shall..." also count as present targets.
  for (const b of blocks) {
    const m = /^(\d+\.\d+(?:\.\d+)*)\s/.exec(norm(b.text));
    if (m) keys.add(`sec:${m[1]}`);
  }
  return keys;
}

export interface Definition {
  term: string;
  block_idx: number;
  quote: string;
}

export function findDefinitions(blocks: Block[]): Definition[] {
  const out: Definition[] = [];
  const add = (term: string, b: Block, at: number) => {
    const t = norm(term);
    if (t.length > 1 && t.length < 60 && !out.some((d) => d.term.toLowerCase() === t.toLowerCase())) out.push({ term: t, block_idx: b.idx, quote: sentenceAround(b.text, at) });
  };
  for (const b of blocks) {
    const text = norm(b.text);
    // Quoted terms inside parentheses: (the "Agreement"), (each a "Party" and together the "Parties")
    for (const paren of text.matchAll(/\(([^()]{0,200})\)/g)) {
      for (const q of paren[1].matchAll(/"([^"]{2,60})"/g)) add(q[1], b, paren.index ?? 0);
    }
    // "Term" means ... / “Thuật ngữ” có nghĩa là ...
    for (const m of text.matchAll(/"([^"]{2,60})"\s+(?:means|shall mean|refers to|has the meaning|includes|có nghĩa là|được hiểu là|là)\b/giu)) add(m[1], b, m.index ?? 0);
    // (sau đây gọi là "Bên A")
    for (const m of text.matchAll(/gọi là\s+"([^"]{2,60})"/giu)) add(m[1], b, m.index ?? 0);
  }
  return out;
}

export function sentenceAround(text: string, at: number) {
  const t = norm(text);
  const start = Math.max(t.lastIndexOf('. ', at) + 1, 0);
  const endDot = t.indexOf('. ', at);
  const end = endDot === -1 ? t.length : endDot + 1;
  return t.slice(start, end).trim();
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
