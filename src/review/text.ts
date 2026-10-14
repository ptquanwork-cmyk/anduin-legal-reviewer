/** Text helpers shared by extraction, checks and the evidence validator. */

export function norm(s: string) {
  return s
    .normalize('NFC')
    .replace(/[“”„«»]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function words(s: string) {
  return norm(s).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function sentences(s: string) {
  return norm(s)
    .split(/(?<=[.!?;])\s+(?=["'(\p{Lu}\d])/u)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function jaccard<T>(a: Set<T>, b: Set<T>) {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function shingles(text: string, k = 4) {
  const w = words(text);
  const out = new Set<string>();
  for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(' '));
  if (w.length && w.length < k) out.add(w.join(' '));
  return out;
}

const VI_CHARS = /[ăâđêôơưàảãáạằẳẵắặầẩẫấậèẻẽéẹềểễếệìỉĩíịòỏõóọồổỗốộờởỡớợùủũúụừửữứựỳỷỹýỵ]/giu;

export function detectLanguage(text: string): 'vi' | 'en' {
  const sample = text.slice(0, 20000);
  const vi = sample.match(VI_CHARS)?.length ?? 0;
  const letters = sample.match(/\p{L}/gu)?.length ?? 1;
  return vi / letters > 0.02 ? 'vi' : 'en';
}

/** Simple non-cryptographic fingerprint for deduplicating findings across versions. */
export function fingerprint(parts: string[]) {
  let h = 2166136261;
  for (const ch of parts.map((p) => norm(p).toLowerCase()).sort().join('|')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
