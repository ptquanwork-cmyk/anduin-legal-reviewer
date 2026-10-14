import type { Evidence } from '../lib/types';
import type { Block, Candidate, Finding } from './model';
import { fingerprint, norm } from './text';

export interface ValidationResult {
  findings: Finding[];
  rejected: { title: string; reason: string }[];
}

/**
 * Evidence gate: every quote must appear verbatim (after whitespace/quote normalization) in the source.
 * Unsupported candidates are rejected and reported as limitations; contradictions need two passages.
 */
export function validate(candidates: Candidate[], blocks: Block[]): ValidationResult {
  const byIdx = new Map(blocks.map((b) => [b.idx, b]));
  const findings: Finding[] = [];
  const rejected: ValidationResult['rejected'] = [];

  for (const c of candidates) {
    const evidence: Evidence[] = c.evidence.map((e) => locate(e.quote, e.block_idx, byIdx, blocks));
    const matched = evidence.filter((e) => e.matched);
    if (!matched.length) {
      rejected.push({ title: c.title, reason: 'No quote matched the source text.' });
      continue;
    }
    if (c.category === 'contradiction' && new Set(matched.map((e) => e.block_idx)).size < 2) {
      rejected.push({ title: c.title, reason: 'A contradiction needs two matched source passages.' });
      continue;
    }
    const f: Finding = {
      ...c,
      evidence,
      evidence_status: matched.length === evidence.length ? 'matched' : 'partial',
      fingerprint: fingerprint([c.category, ...matched.map((e) => e.quote)]),
    };
    const dup = findings.find((x) => x.category === f.category && overlaps(x.evidence, f.evidence));
    if (dup) {
      rejected.push({ title: c.title, reason: `Duplicate of "${dup.title}".` });
      continue;
    }
    findings.push(f);
  }
  return { findings, rejected };
}

function locate(quote: string, idx: number, byIdx: Map<number, Block>, blocks: Block[]): Evidence {
  const q = norm(quote).toLowerCase();
  const hit = (b?: Block) => !!b && q.length > 0 && norm(b.text).toLowerCase().includes(q);
  const block = hit(byIdx.get(idx)) ? byIdx.get(idx)! : blocks.find(hit);
  if (!block) return { quote: norm(quote), block_idx: idx, page: byIdx.get(idx)?.page ?? null, section: byIdx.get(idx)?.section_title ?? null, bbox: null, matched: false };
  return { quote: norm(quote), block_idx: block.idx, page: block.page, section: block.section_title, bbox: block.bbox, matched: true };
}

function overlaps(a: Evidence[], b: Evidence[]) {
  const qa = a.filter((e) => e.matched).map((e) => norm(e.quote).toLowerCase());
  return b.some((e) => e.matched && qa.some((q) => q.includes(norm(e.quote).toLowerCase()) || norm(e.quote).toLowerCase().includes(q)));
}
