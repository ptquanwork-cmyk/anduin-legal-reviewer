import type { AnnotationRow, BlockRow } from '../lib/types';

export type FormItem =
  | { kind: 'paragraph'; block: BlockRow; mapped: boolean }
  | { kind: 'field'; block: BlockRow | null; ann: AnnotationRow };

export interface FormSection {
  ref: string;
  title: string;
  page: number | null;
  items: FormItem[];
}

/**
 * Full-content form: every source block keeps its place, in order. Input annotations render as controls,
 * paragraph annotations as original text; blocks with no annotation stay visible and count as unmapped.
 */
export function buildForm(blocks: BlockRow[], anns: AnnotationRow[]) {
  const byBlock = new Map<number, AnnotationRow[]>();
  for (const a of anns) if (a.source_block_idx != null) byBlock.set(a.source_block_idx, [...(byBlock.get(a.source_block_idx) ?? []), a]);
  const sections: FormSection[] = [];
  let cur: FormSection | null = null;
  const unmapped: BlockRow[] = [];
  let title = '';
  for (const b of blocks) {
    if (b.kind === 'header' || b.kind === 'footer') continue;
    if (b.kind === 'title') {
      title = title ? `${title} · ${b.text}` : b.text;
      continue;
    }
    if (b.kind === 'heading' || !cur) {
      cur = { ref: b.section_ref ?? `s${b.idx}`, title: b.kind === 'heading' ? (b.section_title ?? b.text) : 'Preamble', page: b.page, items: [] };
      sections.push(cur);
      if (b.kind === 'heading') continue;
    }
    const here = byBlock.get(b.idx) ?? [];
    const inputs = here.filter((a) => a.type !== 'paragraph');
    if (inputs.length) for (const a of inputs) cur.items.push({ kind: 'field', block: b, ann: a });
    else {
      const mapped = here.some((a) => a.type === 'paragraph');
      cur.items.push({ kind: 'paragraph', block: b, mapped });
      if (!mapped) unmapped.push(b);
    }
  }
  // Manually drawn inputs without a source block still appear (in the section of their page).
  for (const a of anns.filter((x) => x.type !== 'paragraph' && x.source_block_idx == null)) (sections.find((s) => s.page === a.page) ?? sections[0])?.items.push({ kind: 'field', block: null, ann: a });
  const fields = anns.filter((a) => a.type !== 'paragraph');
  return { title, sections, unmapped, fields };
}

export function isDateField(label: string) {
  return /\b(date|dated|ngày)\b/i.test(label);
}

export function validateAnswers(fields: AnnotationRow[], answers: Record<string, string | string[]>) {
  const problems: { field_id: string; label: string; problem: string }[] = [];
  for (const f of fields) {
    const v = answers[f.field_id];
    const empty = v == null || (Array.isArray(v) ? v.length === 0 : !String(v).trim());
    if (f.required && empty) problems.push({ field_id: f.field_id, label: f.label, problem: 'Required' });
    else if (!empty && f.type === 'radio' && !f.options.some((o) => o.value === v)) problems.push({ field_id: f.field_id, label: f.label, problem: 'Choose one of the listed options' });
    else if (!empty && f.type === 'checkbox' && (!Array.isArray(v) || v.some((x) => !f.options.some((o) => o.value === x)))) problems.push({ field_id: f.field_id, label: f.label, problem: 'Unknown option selected' });
    else if (!empty && f.type === 'text_box' && isDateField(f.label) && Number.isNaN(Date.parse(String(v)))) problems.push({ field_id: f.field_id, label: f.label, problem: 'Enter a valid date' });
  }
  return problems;
}
