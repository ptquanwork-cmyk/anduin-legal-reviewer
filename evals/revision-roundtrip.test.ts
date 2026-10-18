// Offline check of "Create revised PDF" (step 05) on every readable demo contract, no model and no network:
// apply the pre-filled spelling corrections, render the revised PDF, read it back like a new upload and re-run the rules.
// Pass: no word lost; every corrected finding gone; every untouched finding still matched the way Compare matches it
// (same evidence fingerprint, or same category and title). Run: npx vitest run --dir evals → evals/results/revision-roundtrip-latest.json
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { textRendition } from '../src/digitize/pdfkit';
import { runRules, type Speller } from '../src/review/checks';
import { blocksFromDocx, extractPdf, inspectDocx } from '../src/review/extract';
import type { Block } from '../src/review/model';
import { applyEdits, proposedText } from '../src/review/revise';
import { detectLanguage } from '../src/review/text';
import { validate } from '../src/review/validate';

const DIR = 'data/demo-contracts';
async function speller(lang: 'en' | 'vi'): Promise<Speller> {
  const nspell = (await import('nspell')).default;
  const dict = lang === 'vi' ? (await import('dictionary-vi')).default : (await import('dictionary-en')).default;
  return nspell(dict as never) as unknown as Speller;
}
const words = (bs: { kind: string; text: string }[]) => bs.filter((b) => b.kind !== 'header' && b.kind !== 'footer').flatMap((b) => b.text.split(/\s+/).filter(Boolean));

it('revised PDFs keep the text and let Compare tell fixed from remaining findings', async () => {
  const rows = [];
  for (const file of readdirSync(DIR).filter((f) => /\.(pdf|docx)$/.test(f) && !/scanned|corrupted/.test(f))) {
    const buf = new Uint8Array(readFileSync(`${DIR}/${file}`));
    const blocks: Block[] = file.endsWith('.pdf') ? (await extractPdf(buf)).blocks : blocksFromDocx((await inspectDocx(buf)).paragraphs);
    const lang = detectLanguage(blocks.map((b) => b.text).join(' '));
    const sp = await speller(lang);
    const review = (bs: Block[]) => validate(runRules(bs, lang, sp).findings, bs).findings;
    const before = review(blocks);
    const edits = before.flatMap((f) => f.evidence.filter((e) => e.matched).map((e) => ({ block_idx: e.block_idx, quote: e.quote, text: proposedText(f, e.quote) }))).filter((e) => e.text !== e.quote);
    const r = applyEdits(blocks, edits);
    const t0 = performance.now();
    const out = await extractPdf(new Uint8Array(await textRendition(r.blocks, file)));
    const renderMs = Math.round(performance.now() - t0);
    const after = review(out.blocks);
    const fps = new Set(after.map((f) => f.fingerprint));
    const keys = new Set(after.map((f) => `${f.category}|${f.title}`));
    const corrected = before.filter((f) => f.category === 'typo' && edits.some((e) => f.evidence.some((x) => x.quote === e.quote)));
    const untouched = before.filter((f) => !f.evidence.some((x) => edits.some((e) => e.quote === x.quote)));
    const row = {
      file,
      words: [words(r.blocks).length, words(out.blocks).length],
      findings: before.length,
      edits: [r.applied, edits.length],
      corrected_still_present: corrected.filter((f) => fps.has(f.fingerprint)).map((f) => f.title),
      untouched_not_matched: untouched.filter((f) => !fps.has(f.fingerprint) && !keys.has(`${f.category}|${f.title}`)).map((f) => f.title),
      new_in_revision: after.filter((f) => !before.some((b) => b.fingerprint === f.fingerprint || (b.category === f.category && b.title === f.title))).map((f) => f.title),
      render_and_read_ms: renderMs,
    };
    rows.push(row);
    console.log(JSON.stringify(row));
  }
  writeFileSync('evals/results/revision-roundtrip-latest.json', `${JSON.stringify({ date: new Date().toISOString().slice(0, 10), rows }, null, 2)}\n`);
  for (const row of rows) {
    expect(row.words[1], row.file).toBe(row.words[0]);
    expect(row.edits[0], row.file).toBe(row.edits[1]);
    expect(row.corrected_still_present, row.file).toEqual([]);
    expect(row.untouched_not_matched, row.file).toEqual([]);
  }
}, 600000);
