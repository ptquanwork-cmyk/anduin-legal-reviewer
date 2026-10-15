import OpenAI from 'openai';
import { semanticViaWorker } from '../integrations/worker';
import PROMPT from './contract-review-v2.json';
import type { Block, Candidate } from './model';
import type { Definition } from './sections';

// One prompt file is shared by both engines (also read by the worker); see prompts/review/contract-review-v2.md.
export const PROMPT_VERSION = PROMPT.version;
export const DEVELOPER_PROMPT = PROMPT.instructions;

export interface Example {
  category: string;
  title: string;
  action: string;
  reason: string | null;
}

interface RawFinding {
  category: Candidate['category'];
  title: string;
  rationale: string;
  question: string;
  suggestion: string;
  severity: Candidate['severity'];
  model_score: number;
  evidence: { block_id: number; quote: string }[];
}

/** OpenAI API when a key is configured, unless SEMANTIC_ENGINE=codex; otherwise the owner's Codex CLI through the worker. */
export function semanticEngine(): 'openai' | 'codex' {
  return process.env.OPENAI_API_KEY && process.env.SEMANTIC_ENGINE !== 'codex' ? 'openai' : 'codex';
}

/** Chunks by section so long contracts keep cross-references through the definitions index. */
function chunks(blocks: Block[], maxChars = 24000) {
  const out: Block[][] = [];
  let cur: Block[] = [];
  let size = 0;
  for (const b of blocks) {
    if (size + b.text.length > maxChars && cur.length && b.kind === 'heading') {
      out.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(b);
    size += b.text.length;
  }
  if (cur.length) out.push(cur);
  return out;
}

/** The detected language is stated explicitly; left to itself the CLI engine sometimes answers in its user's language. */
export const languageLine = (lang: 'en' | 'vi') =>
  `The document is written in ${lang === 'vi' ? 'Vietnamese' : 'English'}. Write title, rationale, question and suggestion in ${lang === 'vi' ? 'Vietnamese' : 'English'}.`;

export async function semanticReview(blocks: Block[], defs: Definition[], examples: Example[], lang: 'en' | 'vi') {
  let engine = semanticEngine();
  const index = {
    definitions: defs.map((d) => d.term),
    sections: blocks.filter((b) => b.kind === 'heading').map((b) => `${b.section_ref}: ${b.section_title}`),
  };
  const guidance = examples.length
    ? `Reviewer feedback from earlier documents in this workspace (scope: this workspace only; use as calibration, not as rules):\n${examples
        .map((e) => `- ${e.action} "${e.title}" (${e.category})${e.reason ? `: ${e.reason}` : ''}`)
        .join('\n')}`
    : '';
  const parts = chunks(blocks.filter((b) => b.kind !== 'header' && b.kind !== 'footer'));
  const candidates: Candidate[] = [];
  let model = '';
  let reviewed = 0;
  const toDoc = (part: Block[]) => part.map((b) => ({ id: b.idx, section: b.section_title, text: b.text }));
  const add = (found: RawFinding[], by: string) => {
    for (const f of found) {
      candidates.push({
        category: f.category,
        title: f.title,
        rationale: f.rationale,
        question: f.question,
        suggestion: f.suggestion || null,
        severity: f.severity,
        evidence: f.evidence.map((e) => ({ quote: e.quote, block_idx: e.block_id })),
        provenance: { source: 'semantic', model: by, prompt_version: PROMPT_VERSION, model_score: Math.max(0, Math.min(1, f.model_score)) },
      });
    }
  };
  if (engine === 'codex') {
    // The worker reviews up to two chunks at once, so a long document costs about one chunk's time.
    const chosen = parts.slice(0, 2);
    const results = await Promise.all(chosen.map((part) => semanticViaWorker({ document: toDoc(part), index, guidance, language: lang })));
    for (const res of results) add((res.result as { findings: RawFinding[] }).findings, (model = res.engine));
    return { candidates, model, truncated: parts.length > chosen.length };
  }
  for (const part of parts) {
    // The CLI path is slower per call, so it reviews fewer chunks within the function time limit.
    if (reviewed >= (engine === 'openai' ? 6 : 2)) break;
    reviewed++;
    const doc = toDoc(part);
    let found: RawFinding[] = [];
    if (engine === 'openai') {
      model = process.env.OPENAI_MODEL || 'gpt-5-mini';
      try {
        const res = await new OpenAI().responses.create({
          model,
          input: [
            { role: 'developer', content: `${DEVELOPER_PROMPT}\n\n${languageLine(lang)}${guidance ? `\n\n${guidance}` : ''}` },
            { role: 'user', content: `Index of the whole document (for cross-references):\n${JSON.stringify(index)}\n\n<document>\n${JSON.stringify(doc)}\n</document>` },
          ],
          text: { format: { type: 'json_schema', name: 'review_findings', schema: PROMPT.schema as Record<string, unknown>, strict: true } },
        });
        found = (JSON.parse(res.output_text) as { findings: RawFinding[] }).findings;
      } catch (e) {
        // A rejected or unfunded key falls back to the owner's Codex CLI for the rest of this review.
        if (!(e instanceof OpenAI.APIError && (e.status === 401 || (e.status === 429 && e.code === 'insufficient_quota')))) throw e;
        engine = 'codex';
      }
    }
    if (engine === 'codex') {
      // The worker owns the instructions and schema; only data (document, index, workspace examples) is sent.
      const res = await semanticViaWorker({ document: doc, index, guidance, language: lang });
      model = res.engine;
      found = (res.result as { findings: RawFinding[] }).findings;
    }
    add(found, model);
  }
  return { candidates, model, truncated: parts.length > reviewed };
}
