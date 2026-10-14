import type { AnnotationOption, AnnotationType, BBox, TransferState } from '../lib/types';
import type { Block } from '../review/model';
import { jaccard, norm, words } from '../review/text';

export interface DetectedAnnotation {
  field_id: string;
  type: AnnotationType;
  label: string;
  options: AnnotationOption[];
  page: number;
  bbox: BBox;
  source_block_idx: number;
  required: boolean;
  transfer_state: TransferState;
  origin: 'detected' | 'transferred';
  confirmed: boolean;
}

const RADIO = /[○◯◦]|\(\s\)/u;
const CHECK = /[☐□▢]|\[\s\]/u;
const BLANK = /_{3,}|\.{6,}/;

export const slug = (s: string) =>
  norm(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || 'field';

/** Geometry of a character range inside a block, from its text spans (character-ratio estimate within a span). */
function rangeBox(b: Block, from: number, to: number): BBox | null {
  if (!b.spans?.length) return b.bbox;
  let pos = 0;
  let box: { x: number; y: number; r: number; b: number } | null = null;
  const joined = b.spans.map((s) => s.text);
  for (let i = 0; i < b.spans.length; i++) {
    const s = b.spans[i];
    const start = pos;
    const end = pos + joined[i].length;
    pos = end + 1; // spans are joined with a space in block text
    if (end <= from || start >= to) continue;
    const a = Math.max(from, start) - start;
    const z = Math.min(to, end) - start;
    const per = s.w / Math.max(1, s.text.length);
    const x = s.x + a * per;
    const r = s.x + z * per;
    box = box ? { x: Math.min(box.x, x), y: Math.min(box.y, s.y), r: Math.max(box.r, r), b: Math.max(box.b, s.y + s.h) } : { x, y: s.y, r, b: s.y + s.h };
  }
  return box ? { x: round(box.x - 2), y: round(box.y - 3), w: round(box.r - box.x + 4), h: round(box.b - box.y + 6) } : b.bbox;
}

const round = (n: number) => Math.round(n * 10) / 10;

function spanText(b: Block) {
  return b.spans?.length ? b.spans.map((s) => s.text).join(' ') : b.text;
}

/** Proposes the four annotation types from layout cues. Ambiguous regions are marked uncertain for review. */
export function detectFields(blocks: Block[]): DetectedAnnotation[] {
  const out: DetectedAnnotation[] = [];
  const used = new Set<string>();
  const uniqueId = (base: string) => {
    let id = base;
    for (let i = 2; used.has(id); i++) id = `${base}_${i}`;
    used.add(id);
    return id;
  };
  for (const b of blocks) {
    if (b.page == null || !b.bbox) continue;
    const text = spanText(b);
    const section = slug(b.section_title ?? 'document');
    const labelMatch = /^(.{1,60}?):/.exec(text);
    const label = norm(labelMatch?.[1] ?? text.split(/[○◯◦☐□▢_[(]/u)[0]).replace(/:$/, '') || 'Field';

    if (RADIO.test(text) || CHECK.test(text)) {
      const radio = RADIO.test(text);
      const marker = radio ? /[○◯◦]|\(\s\)/gu : /[☐□▢]|\[\s\]/gu;
      const marks = [...text.matchAll(marker)];
      const options: AnnotationOption[] = marks.map((m, i) => {
        const start = m.index ?? 0;
        const end = i + 1 < marks.length ? (marks[i + 1].index ?? text.length) : text.length;
        const optLabel = norm(text.slice(start + m[0].length, end));
        return { value: slug(optLabel), label: optLabel, bbox: rangeBox(b, start, start + m[0].length + optLabel.length + 1)! };
      });
      if (!options.length) continue;
      const xs = options.map((o) => o.bbox);
      out.push({
        field_id: uniqueId(`${section}.${slug(label)}`),
        type: radio ? 'radio' : 'checkbox',
        label,
        options,
        page: b.page,
        bbox: { x: Math.min(...xs.map((o) => o.x)) - 6, y: Math.min(...xs.map((o) => o.y)) - 4, w: Math.max(...xs.map((o) => o.x + o.w)) - Math.min(...xs.map((o) => o.x)) + 12, h: Math.max(...xs.map((o) => o.y + o.h)) - Math.min(...xs.map((o) => o.y)) + 8 },
        source_block_idx: b.idx,
        required: false,
        transfer_state: 'new',
        origin: 'detected',
        confirmed: false,
      });
      continue;
    }
    const blank = BLANK.exec(text);
    if (blank) {
      const bbox = rangeBox(b, blank.index, blank.index + blank[0].length) ?? b.bbox;
      out.push({
        field_id: uniqueId(`${section}.${slug(label)}`),
        type: 'text_box',
        label,
        options: [],
        page: b.page,
        bbox: { ...bbox, y: bbox.y - 4, h: Math.max(bbox.h + 4, 18) },
        source_block_idx: b.idx,
        required: true,
        transfer_state: 'new',
        origin: 'detected',
        confirmed: false,
      });
      continue;
    }
    if (b.kind === 'paragraph' || b.kind === 'list' || b.kind === 'table') {
      out.push({
        field_id: uniqueId(`${section}.paragraph`),
        type: 'paragraph',
        label: b.section_title ?? 'Paragraph',
        options: [],
        page: b.page,
        bbox: b.bbox,
        source_block_idx: b.idx,
        required: false,
        transfer_state: 'new',
        origin: 'detected',
        confirmed: true,
      });
    }
  }
  return out;
}

/** Content-based transfer from an earlier version's approved annotations (page numbers may shift). */
export function transferStates(
  detected: DetectedAnnotation[],
  blocks: Block[],
  previous: { field_id: string; label: string; type: AnnotationType; text: string }[],
) {
  if (!previous.length) return detected;
  const textOf = new Map(blocks.map((b) => [b.idx, b.text]));
  return detected.map((d) => {
    const t = textOf.get(d.source_block_idx) ?? '';
    const exact = previous.find((p) => norm(p.text) === norm(t) && p.type === d.type);
    if (exact) return { ...d, field_id: exact.field_id, transfer_state: 'matched' as const, origin: 'transferred' as const, confirmed: true };
    const near = previous
      .map((p) => ({ p, s: jaccard(new Set(words(p.text)), new Set(words(t))) }))
      .sort((a, b) => b.s - a.s)[0];
    if (near && near.s >= 0.6) return { ...d, field_id: near.p.type === d.type ? near.p.field_id : d.field_id, transfer_state: 'changed' as const, origin: 'transferred' as const, confirmed: false };
    return d;
  });
}

export interface QaProblem {
  field_id: string;
  problem: string;
}

/** Deterministic annotation QA: four types, unique IDs, geometry inside the page, grouped options. */
export function annotationQa(
  anns: { field_id: string; type: string; page: number; bbox: BBox; options: AnnotationOption[]; source_block_idx: number | null }[],
  pages: Map<number, { width: number; height: number }>,
) {
  const problems: QaProblem[] = [];
  const seen = new Set<string>();
  for (const a of anns) {
    if (!['paragraph', 'text_box', 'radio', 'checkbox'].includes(a.type)) problems.push({ field_id: a.field_id, problem: `Unsupported type ${a.type}` });
    if (seen.has(a.field_id)) problems.push({ field_id: a.field_id, problem: 'Duplicate field ID' });
    seen.add(a.field_id);
    const p = pages.get(a.page);
    if (!p || a.bbox.x < 0 || a.bbox.y < 0 || a.bbox.x + a.bbox.w > p.width + 1 || a.bbox.y + a.bbox.h > p.height + 1) problems.push({ field_id: a.field_id, problem: 'Region is outside the page' });
    if ((a.type === 'radio' || a.type === 'checkbox') && a.options.length < (a.type === 'radio' ? 2 : 1)) problems.push({ field_id: a.field_id, problem: 'Choice group needs options' });
    if (a.source_block_idx == null) problems.push({ field_id: a.field_id, problem: 'No source anchor' });
  }
  return problems;
}
