import { norm } from './text';

/** One reviewer correction: replace an evidence quote inside its source block. */
export interface Edit {
  block_idx: number;
  quote: string;
  text: string;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Matches a normalized evidence quote in raw block text, folding quotes, dashes and whitespace the way norm() does. */
function pattern(quote: string) {
  const src = [...norm(quote)].map((c) => (c === '"' ? '["“”„«»]' : c === "'" ? "['‘’‚]" : c === '-' ? '[-–—]' : c === ' ' ? '\\s+' : esc(c))).join('');
  return new RegExp(src, 'iu');
}

/** Starting wording for a correction: spelling findings carry the fix, everything else starts from the original quote. */
export function proposedText(f: { category: string; title: string; suggestion: string | null }, quote: string) {
  if (f.category !== 'typo' || !f.suggestion) return quote;
  const word = f.title.replace(/^Spelling:\s*/, '');
  return quote.replace(new RegExp(`(?<![\\p{L}\\d])${esc(word)}(?![\\p{L}\\d])`, 'u'), () => f.suggestion!);
}

/** Applies corrections in order. An edit whose quote is no longer found (for example rewritten by an earlier edit) is returned as missed. */
export function applyEdits<B extends { idx: number; text: string }>(blocks: B[], edits: Edit[]) {
  const out = blocks.map((b) => ({ ...b, text: b.text.normalize('NFC') }));
  const byIdx = new Map(out.map((b) => [b.idx, b]));
  const missed: Edit[] = [];
  let applied = 0;
  for (const e of edits) {
    const re = pattern(e.quote);
    const b = byIdx.get(e.block_idx);
    if (!b || !norm(e.quote) || !re.test(b.text)) {
      missed.push(e);
      continue;
    }
    b.text = b.text.replace(re, () => e.text.trim());
    applied++;
  }
  return { blocks: out, applied, missed };
}
