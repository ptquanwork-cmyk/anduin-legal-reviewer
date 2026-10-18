import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { textRendition } from '../src/digitize/pdfkit';
import { runRules } from '../src/review/checks';
import { extractPdf } from '../src/review/extract';
import type { Block } from '../src/review/model';
import { applyEdits, proposedText } from '../src/review/revise';
import { transferStates } from '../src/digitize/fields';
import { allRows } from '../src/lib/rows';
import { assignSections } from '../src/review/sections';
import { validate } from '../src/review/validate';

function sampleBlocks(file: string): Block[] {
  const blocks: Block[] = [];
  let page = 1;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const h = /^Page (\d+), Section (\d+) [—-] (.+)$/.exec(line);
    if (h) page = Number(h[1]);
    blocks.push({ idx: blocks.length, page, kind: h ? 'heading' : 'paragraph', text: h ? `Section ${h[2]}. ${h[3]}` : line, bbox: null, fonts: [], section_ref: null, section_title: null });
  }
  return assignSections(blocks);
}

const review = (blocks: Block[]) => validate(runRules(blocks, 'en', null).findings, blocks).findings;

describe('revised version', () => {
  it('matches normalized quotes in raw text and reports edits an earlier edit made unreachable', () => {
    const blocks = [{ idx: 0, text: 'The “Investor” shall pay – promptly –  the fee.' }];
    const r = applyEdits(blocks, [
      { block_idx: 0, quote: 'The "Investor" shall pay - promptly - the fee.', text: 'The "Investor" shall pay within 5 Business Days.' },
      { block_idx: 0, quote: 'pay - promptly', text: 'pay soon' },
      { block_idx: 9, quote: 'x', text: 'y' },
    ]);
    expect(r.blocks[0].text).toBe('The "Investor" shall pay within 5 Business Days.');
    expect(r.applied).toBe(1);
    expect(r.missed).toHaveLength(2);
    expect(blocks[0].text).toContain('promptly'); // input untouched
  });

  it('pre-fills spelling fixes only, as whole words', () => {
    expect(proposedText({ category: 'typo', title: 'Spelling: teh', suggestion: 'the' }, 'Pay teh fee to tehran.')).toBe('Pay the fee to tehran.');
    expect(proposedText({ category: 'ambiguity', title: 'Vague', suggestion: 'Define the deadline.' }, 'promptly')).toBe('promptly');
  });

  it('renders a re-readable PDF in which fixed findings disappear and the rest keep their fingerprints', async () => {
    const blocks = sampleBlocks('data/synthetic/sample-with-defects.txt');
    const before = review(blocks);
    const typo = before.find((f) => f.category === 'typo')!;
    expect(typo).toBeTruthy();
    const e = typo.evidence[0];
    const edits = [{ block_idx: e.block_idx, quote: e.quote, text: proposedText(typo, e.quote) }];
    expect(edits[0].text).not.toBe(e.quote);

    const r = applyEdits(blocks, edits);
    expect(r.applied).toBe(1);
    const pdf = await extractPdf(new Uint8Array(await textRendition([...r.blocks, { page: 99, kind: 'paragraph', text: 'Tick ☐ yes · Vietnamese: Điều 5 — Phụ lục.' }], 'Sample · revised')));
    expect(pdf.pages.length).toBe(Math.max(...blocks.map((b) => b.page ?? 1)) + 1); // original page breaks kept
    const text = pdf.blocks.map((b) => b.text).join(' ');
    expect(text).toContain('Điều 5');
    for (const b of r.blocks) for (const w of b.text.split(/\s+/).slice(0, 3)) expect(text).toContain(w);

    const after = review(pdf.blocks).map((f) => f.fingerprint);
    expect(after).not.toContain(typo.fingerprint);
    const kept = before.filter((f) => f !== typo);
    expect(kept.filter((f) => after.includes(f.fingerprint)).length).toBe(kept.length);
  });
});

describe('field transfer to a new version', () => {
  it('maps repeated lines one to one and never repeats a field ID', () => {
    const ann = (field_id: string, idx: number) => ({ field_id, type: 'text_box' as const, label: 'Signature', options: [], page: 1, bbox: { x: 0, y: idx * 20, w: 200, h: 14 }, source_block_idx: idx, required: false, transfer_state: 'new' as const, origin: 'detected' as const, confirmed: false });
    const blocks = [0, 1, 2].map((idx) => ({ idx, page: 1, kind: 'paragraph' as const, text: idx < 2 ? 'Signature: ________' : 'Name: ________', bbox: null, fonts: [], section_ref: null, section_title: null }));
    const previous = [
      { field_id: 'sig.a', label: 'Signature', type: 'text_box' as const, text: 'Signature: ________' },
      { field_id: 'sig.b', label: 'Signature', type: 'text_box' as const, text: 'Signature: ________' },
    ];
    const out = transferStates([ann('sec.signature', 0), ann('sec.signature-2', 1), ann('sig.a', 2)], blocks, previous);
    expect(out.map((d) => d.field_id)).toEqual(['sig.a', 'sig.b', 'sig.a-2']);
    expect(out.slice(0, 2).every((d) => d.transfer_state === 'matched')).toBe(true);
    expect(new Set(out.map((d) => d.field_id)).size).toBe(out.length);
  });
});

describe('reading long documents', () => {
  it('reads every row past the 1000-row page limit', async () => {
    const rows = Array.from({ length: 2345 }, (_, i) => i);
    const calls: [number, number][] = [];
    const r = await allRows<number>(async (a, b) => (calls.push([a, b]), { data: rows.slice(a, b + 1), error: null }));
    expect(r.data).toEqual(rows);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
    expect((await allRows(async () => ({ data: null, error: { message: 'denied' } }))).error?.message).toBe('denied');
  });
});
