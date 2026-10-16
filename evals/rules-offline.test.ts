// Offline evaluation of the deterministic layer (extraction → rules → evidence validator), no model and no network.
// Scores the planted problems in data/demo-contracts/expected.json and the cases in datasets/legal-review-cases-v1.jsonl,
// times each stage, and checks that the evidence gate rejects fabricated quotes.
// Run: npx vitest run --dir evals   → writes evals/results/rules-offline-latest.json
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { it } from 'vitest';
import { runRules, type Speller } from '../src/review/checks';
import { blocksFromDocx, extractPdf, inspectDocx } from '../src/review/extract';
import type { Block, Candidate, Finding } from '../src/review/model';
import { assignSections } from '../src/review/sections';
import { detectLanguage } from '../src/review/text';
import { validate } from '../src/review/validate';

const DIR = 'data/demo-contracts';
const RUNS = 5;
const EXPECTED = JSON.parse(readFileSync(path.join(DIR, 'expected.json'), 'utf8'));

async function speller(lang: 'en' | 'vi'): Promise<Speller> {
  const nspell = (await import('nspell')).default;
  const dict = lang === 'vi' ? (await import('dictionary-vi')).default : (await import('dictionary-en')).default;
  return nspell(dict as never) as unknown as Speller;
}

const text = (f: Finding) => [f.title, f.rationale, ...f.evidence.map((e) => e.quote)].join(' ');
const hits = (fs: Finding[], item: { category: string; pattern: string }) => fs.some((f) => f.category === item.category && new RegExp(item.pattern, 'iu').test(text(f)));
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const ms = (n: number) => Math.round(n * 10) / 10;

/** Fabricated variants of real findings: altered quote, and a one-passage contradiction. Every one must be rejected. */
function fabricate(fs: Finding[]): Candidate[] {
  return fs.flatMap((f) => {
    const base = { ...f, evidence: f.evidence.map((e) => ({ quote: e.quote, block_idx: e.block_idx })) };
    const out: Candidate[] = [{ ...base, title: `FAKE ${f.title}`, evidence: base.evidence.map((e) => ({ ...e, quote: `${e.quote} unless waived in writing by the Fund` })) }];
    if (f.category === 'contradiction') out.push({ ...base, title: `ONE-SIDED ${f.title}`, evidence: base.evidence.slice(0, 1) });
    return out;
  });
}

it('scores the deterministic layer', { timeout: 600_000 }, async () => {
  const sp = { en: await speller('en'), vi: await speller('vi') };
  const contracts = [];
  let fakes = 0;
  let fakesRejected = 0;
  let grounded = 0;
  let accepted = 0;

  for (const file of readdirSync(DIR).filter((f) => /\.(pdf|docx)$/.test(f)).sort()) {
    const bytes = new Uint8Array(readFileSync(path.join(DIR, file)));
    const t = { extract: [] as number[], rules: [] as number[], validate: [] as number[] };
    let blocks: Block[] = [];
    let findings: Finding[] = [];
    let pages: number | null = null;
    for (let r = 0; r < RUNS; r++) {
      let t0 = performance.now();
      if (file.endsWith('.pdf')) {
        const pdf = await extractPdf(bytes.slice());
        blocks = pdf.blocks;
        pages = pdf.pages.length;
      } else blocks = blocksFromDocx((await inspectDocx(bytes)).paragraphs); // ponytail: Word text without the worker's PDF conversion
      t.extract.push(performance.now() - t0);
      const lang = detectLanguage(blocks.map((b) => b.text).join(' '));
      t0 = performance.now();
      const rules = runRules(blocks, lang, sp[lang]);
      t.rules.push(performance.now() - t0);
      t0 = performance.now();
      findings = validate(rules.findings, blocks).findings;
      t.validate.push(performance.now() - t0);
    }
    let exp = EXPECTED[file];
    if (exp?.same_as) exp = EXPECTED[exp.same_as];
    const ruleItems = exp.find.filter((i: { semantic?: boolean }) => !i.semantic);
    const missed = ruleItems.filter((i: never) => !hits(findings, i)).map((i: { category: string; pattern: string }) => `${i.category}: ${i.pattern}`);
    const falseAlarms = (exp.avoid ?? []).filter((i: never) => hits(findings, i)).map((i: { category: string; pattern: string }) => `${i.category}: ${i.pattern}`);

    // Grounding: every accepted quote appears verbatim in a source block.
    const src = blocks.map((b) => b.text.replace(/\s+/g, ' ').toLowerCase());
    for (const f of findings) for (const e of f.evidence.filter((x) => x.matched)) {
      accepted++;
      if (src.some((s) => s.includes(e.quote.toLowerCase()))) grounded++;
    }
    const fake = fabricate(findings);
    fakes += fake.length;
    fakesRejected += fake.length - validate(fake, blocks).findings.length;

    contracts.push({
      file,
      pages,
      blocks: blocks.length,
      words: blocks.reduce((n, b) => n + b.text.split(/\s+/).filter(Boolean).length, 0),
      findings: findings.length,
      by_category: Object.fromEntries([...new Set(findings.map((f) => f.category))].map((c) => [c, findings.filter((f) => f.category === c).length])),
      rule_items_found: ruleItems.length - missed.length,
      rule_items: ruleItems.length,
      semantic_only_items: exp.find.length - ruleItems.length,
      missed,
      false_alarms: falseAlarms,
      median_ms: { extract: ms(median(t.extract)), rules: ms(median(t.rules)), validate: ms(median(t.validate)) },
    });
  }

  // Hand-authored cases: each "Page N, Section M: text" segment becomes a "Section M." heading block plus its text block.
  const cases = readFileSync('evals/datasets/legal-review-cases-v1.jsonl', 'utf8').trim().split(/\r?\n/).map((l) => JSON.parse(l));
  const caseResults = cases.map((c) => {
    const lines = c.document_text.split(/(?=Page \d+, Section \d+:)/).flatMap((p: string) => {
      const m = /^Page (\d+), Section (\d+): (.*)$/s.exec(p.trim());
      return m ? [{ page: Number(m[1]), text: `Section ${m[2]}.` }, { page: Number(m[1]), text: m[3].trim() }] : [{ page: 1, text: p.trim() }];
    });
    const blocks = assignSections(lines.map((l: { page: number; text: string }, idx: number) => ({ idx, page: l.page, kind: 'paragraph' as const, text: l.text, bbox: null, fonts: [], section_ref: null, section_title: null })));
    const fs = validate(runRules(blocks, 'en', sp.en).findings, blocks).findings;
    const got = [...new Set(fs.map((f) => f.category))];
    const expected: string[] = c.expected_categories;
    return { id: c.id, expected, got, pass: expected.every((e) => got.includes(e as never)) && got.every((g) => expected.includes(g)) };
  });

  const found = contracts.reduce((n, c) => n + c.rule_items_found, 0);
  const of = contracts.reduce((n, c) => n + c.rule_items, 0);
  const result = {
    run_at: new Date().toISOString(),
    node: process.version,
    runs_per_file: RUNS,
    demo_contracts: { rule_items_found: found, rule_items: of, false_alarms: contracts.reduce((n, c) => n + c.false_alarms.length, 0), contracts },
    evidence_gate: { accepted_quotes: accepted, grounded_verbatim: grounded, fabricated_candidates: fakes, fabricated_rejected: fakesRejected },
    labeled_cases: { pass: caseResults.filter((c) => c.pass).length, of: caseResults.length, cases: caseResults },
  };
  writeFileSync('evals/results/rules-offline-latest.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ ...result, demo_contracts: { ...result.demo_contracts, contracts: contracts.map((c) => `${c.file}: ${c.rule_items_found}/${c.rule_items} ${c.missed.join('; ')} FA ${c.false_alarms.length} ${JSON.stringify(c.median_ms)}`) } }, null, 1));
});
