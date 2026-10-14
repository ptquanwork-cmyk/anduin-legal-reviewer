import type { Block, Candidate, Edge } from './model';
import { findDefinitions, findReferences, presentKeys, sentenceAround, type Definition } from './sections';
import { jaccard, sentences, words } from './text';

export interface Speller {
  correct: (word: string) => boolean;
  suggest: (word: string) => string[];
}

const RULES = 'rules-v1';
const body = (blocks: Block[]) => blocks.filter((b) => b.kind !== 'heading' && b.kind !== 'title' && b.kind !== 'header' && b.kind !== 'footer');

// High-precision misspellings seen in contracts (checked even without a dictionary).
const COMMON: Record<string, string> = {
  recieve: 'receive', recieved: 'received', recieves: 'receives', occured: 'occurred', occuring: 'occurring', seperate: 'separate',
  untill: 'until', accomodate: 'accommodate', liabilty: 'liability', aggreement: 'agreement', agreemnet: 'agreement', comission: 'commission',
  paymnet: 'payment', teh: 'the', wich: 'which', enviroment: 'environment', goverment: 'government', indemnfy: 'indemnify',
  responsability: 'responsibility', termintion: 'termination', confidentail: 'confidential', obligaton: 'obligation', notwithstading: 'notwithstanding',
  thier: 'their', recipt: 'receipt', reciept: 'receipt', acknowledgement: 'acknowledgment', arbitation: 'arbitration', garantee: 'guarantee',
};
const LEGAL_OK = new Set(
  'hereinafter herein hereof hereto hereunder thereof thereto therein thereunder whereof whereas indemnitee indemnitor licensor licensee lessor lessee sublicense subcontractor subcontractors assignee assignor counterparts nonexclusive sublicensable mutatis mutandis bona fide pro rata forthwith notwithstanding'.split(
    ' ',
  ),
);

export function checkSpelling(blocks: Block[], speller: Speller | null, defined: Set<string>): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const b of body(blocks)) {
    for (const m of b.text.matchAll(/(?<![\p{L}\d'-])(\p{L}[\p{Ll}']{2,})(?![\p{L}\d-])/gu)) {
      const word = m[1].replace(/'s$/, '');
      const lower = word.toLowerCase();
      if (seen.has(lower) || LEGAL_OK.has(lower) || defined.has(lower) || /^\p{Lu}/u.test(word)) continue;
      let fix: string | undefined = COMMON[lower];
      if (!fix && speller && word.length >= 4 && !speller.correct(word) && !speller.correct(lower)) fix = speller.suggest(lower)[0];
      if (!fix) continue;
      seen.add(lower);
      out.push({
        category: 'typo',
        title: `Spelling: ${word}`,
        rationale: `Possible spelling error: "${word}" should be "${fix}".`,
        question: `Should "${word}" read "${fix}"?`,
        suggestion: fix,
        severity: 'low',
        evidence: [{ quote: sentenceAround(b.text, m.index ?? 0), block_idx: b.idx }],
        provenance: { source: 'rules', rule: `${RULES}:spelling`, model_score: null },
      });
    }
  }
  return out;
}

export function checkReferences(blocks: Block[]): { findings: Candidate[]; edges: Edge[] } {
  const present = presentKeys(blocks);
  const findings: Candidate[] = [];
  const edges: Edge[] = [];
  const missing = new Set<string>();
  for (const r of findReferences(blocks)) {
    const from = blocks.find((b) => b.idx === r.block_idx)?.section_ref ?? 'doc';
    const ok = present.has(r.key);
    edges.push({ from_ref: from, to_ref: r.key, relation: 'references', status: ok ? 'parsed' : 'unresolved', evidence: { quote: r.quote, block_idx: r.block_idx } });
    if (ok || missing.has(r.key)) continue;
    missing.add(r.key);
    findings.push({
      category: 'missing_reference',
      title: `Missing ${r.label}`,
      rationale: `${r.label} is referenced but not found in the document.`,
      question: `Which provision should the reference to ${r.label} point to, or is a part of the document missing?`,
      suggestion: null,
      severity: 'high',
      evidence: [{ quote: r.quote, block_idx: r.block_idx }],
      provenance: { source: 'rules', rule: `${RULES}:references`, model_score: null },
    });
  }
  return { findings, edges };
}

const ROLE_WORDS = new Set(
  'client provider service provider customer supplier buyer seller contractor company party parties agreement licensor licensee employer employee lender borrower landlord tenant purchaser vendor consultant bên a bên b'.split(' '),
);
const ROLE_PHRASES = ['service provider', 'bên a', 'bên b'];

export function checkUndefinedTerms(blocks: Block[], defs: Definition[]): { findings: Candidate[]; edges: Edge[] } {
  const defined = new Set(defs.map((d) => d.term.toLowerCase()));
  const headings = new Set(blocks.filter((b) => b.kind === 'heading').map((b) => (b.section_title ?? '').toLowerCase()));
  const uses = new Map<string, { block_idx: number; quote: string }[]>();
  const edges: Edge[] = [];
  for (const b of body(blocks)) {
    for (const m of b.text.matchAll(/\bthe\s+((?:\p{Lu}[\p{Ll}]+)(?:\s+\p{Lu}[\p{Ll}]+){0,3})/gu)) {
      const term = m[1];
      const key = term.toLowerCase();
      if (defined.has(key)) {
        edges.push({ from_ref: b.section_ref ?? 'doc', to_ref: `term:${key}`, relation: 'uses_term', status: 'parsed', evidence: { term, block_idx: b.idx } });
        continue;
      }
      if (ROLE_WORDS.has(key) || ROLE_PHRASES.includes(key) || headings.has(key) || key.split(' ').length < 2) continue;
      const list = uses.get(term) ?? [];
      list.push({ block_idx: b.idx, quote: sentenceAround(b.text, m.index ?? 0) });
      uses.set(term, list);
    }
  }
  const findings: Candidate[] = [...uses.entries()].map(([term, at]) => ({
    category: 'undefined_term' as const,
    title: `Undefined term: ${term}`,
    rationale: `"${term}" is capitalised like a defined term but no definition was found in the document.`,
    question: `What does "${term}" mean, and where should it be defined?`,
    suggestion: null,
    severity: 'medium' as const,
    evidence: [at[0]],
    provenance: { source: 'rules' as const, rule: `${RULES}:undefined-terms`, model_score: null },
  }));
  for (const d of defs) edges.push({ from_ref: blocks.find((b) => b.idx === d.block_idx)?.section_ref ?? 'doc', to_ref: `term:${d.term.toLowerCase()}`, relation: 'defines', status: 'parsed', evidence: { term: d.term, block_idx: d.block_idx, quote: d.quote } });
  return { findings, edges };
}

const VAGUE_EN = ['as soon as possible', 'as soon as practicable', 'from time to time', 'best efforts', 'reasonable efforts', 'in a timely manner', 'promptly', 'soon', 'timely', 'reasonable', 'reasonably', 'approximately', 'substantially', 'as appropriate', 'as necessary'];
const VAGUE_VI = ['sớm nhất có thể', 'trong thời gian sớm nhất', 'kịp thời', 'hợp lý', 'phù hợp', 'khi cần thiết', 'khoảng', 'sớm'];
const OBLIGATION = /\b(shall|must|will|agrees? to|is required to|undertakes? to)\b|(?<![\p{L}])(phải|có trách nhiệm|có nghĩa vụ|cam kết)(?![\p{L}])/iu;

export function checkVagueTerms(blocks: Block[], lang: 'en' | 'vi'): Candidate[] {
  const list = lang === 'vi' ? VAGUE_VI : VAGUE_EN;
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const b of body(blocks)) {
    for (const s of sentences(b.text)) {
      if (!OBLIGATION.test(s)) continue;
      const hit = list.find((v) => new RegExp(`(?<![\\p{L}])${v}(?![\\p{L}])`, 'iu').test(s));
      // One finding per vague term per section keeps long contracts readable.
      if (!hit || seen.has(`${b.section_ref}|${hit}`)) continue;
      seen.add(`${b.section_ref}|${hit}`);
      out.push({
        category: 'ambiguity',
        title: `Ambiguous ${b.section_title ? b.section_title.toLowerCase() : 'obligation'}`,
        rationale: `The obligation uses "${hit}", which is open to interpretation.`,
        question: `What specific deadline or standard should replace "${hit}"?`,
        suggestion: null,
        severity: 'medium',
        evidence: [{ quote: s, block_idx: b.idx }],
        provenance: { source: 'rules', rule: `${RULES}:vague-terms`, model_score: null },
      });
    }
  }
  return out;
}

/** Near-identical obligations that state different numbers (deadlines, amounts, percentages). */
export function checkNumericConflicts(blocks: Block[]): Candidate[] {
  const items: { s: string; block: Block; shape: Set<string>; nums: string[] }[] = [];
  for (const b of body(blocks)) {
    for (const s of sentences(b.text)) {
      const nums = s.match(/\d+(?:[.,]\d+)?/g) ?? [];
      const w = words(s);
      if (!nums.length || w.length < 6) continue;
      items.push({ s, block: b, nums, shape: new Set(w.filter((t) => !/^\d/.test(t))) });
    }
  }
  const out: Candidate[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const c = items[j];
      if (a.block.idx === c.block.idx || jaccard(a.shape, c.shape) < 0.8) continue;
      if (a.nums.join('|') === c.nums.join('|')) continue;
      const sa = a.block.section_title ?? 'one section';
      const sc = c.block.section_title ?? 'another section';
      out.push({
        category: 'contradiction',
        title: `Conflicting ${topic(a.s)}`,
        rationale: `${sa} and ${sc} state the same obligation with different values (${a.nums.join(', ')} vs ${c.nums.join(', ')}).`,
        question: `Which value should apply: ${a.nums.join(', ')} (${sa}) or ${c.nums.join(', ')} (${sc})?`,
        suggestion: null,
        severity: 'high',
        evidence: [
          { quote: a.s, block_idx: a.block.idx },
          { quote: c.s, block_idx: c.block.idx },
        ],
        provenance: { source: 'rules', rule: `${RULES}:numeric-conflict`, model_score: null },
      });
    }
  }
  return out;
}

function topic(s: string) {
  if (/\b(pay|payment|invoice|thanh toán)/iu.test(s)) return 'payment deadlines';
  if (/\b(deliver|delivery|giao)/iu.test(s)) return 'delivery terms';
  if (/\b(terminat|notice|chấm dứt)/iu.test(s)) return 'notice periods';
  return 'values';
}

export function definedTermSet(defs: Definition[]) {
  return new Set(defs.flatMap((d) => [d.term.toLowerCase(), ...d.term.toLowerCase().split(/\s+/)]));
}

export function runRules(blocks: Block[], lang: 'en' | 'vi', speller: Speller | null) {
  const defs = findDefinitions(blocks);
  const refs = checkReferences(blocks);
  const terms = checkUndefinedTerms(blocks, defs);
  const findings = [
    ...checkNumericConflicts(blocks),
    ...refs.findings,
    ...checkVagueTerms(blocks, lang),
    ...terms.findings,
    ...checkSpelling(blocks, speller, definedTermSet(defs)),
  ];
  return { findings, edges: [...refs.edges, ...terms.edges], definitions: defs };
}

