import type { DecisionAgentAnswer } from '../lib/types';

export class WorkerUnavailable extends Error {}

const url = () => process.env.WORKER_URL?.replace(/\/$/, '');
const headers = () => (process.env.WORKER_TOKEN ? { authorization: `Bearer ${process.env.WORKER_TOKEN}` } : ({} as Record<string, string>));

async function call(path: string, init: RequestInit, timeoutMs: number) {
  const base = url();
  if (!base) throw new WorkerUnavailable('Worker is not configured (WORKER_URL).');
  try {
    const res = await fetch(`${base}${path}`, { ...init, headers: { ...headers(), ...(init.headers ?? {}) }, signal: AbortSignal.timeout(timeoutMs) });
    if (res.status === 503 || res.status === 502 || res.status === 504) throw new WorkerUnavailable(`Worker ${path} unavailable (${res.status}).`);
    if (!res.ok) throw new Error(`Worker ${path} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    return res;
  } catch (e) {
    if (e instanceof WorkerUnavailable) throw e;
    if (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError' || /fetch failed|ECONN|ENOTFOUND/i.test(e.message))) throw new WorkerUnavailable(`Worker unreachable: ${e.message}`);
    throw e;
  }
}

export async function workerHealth() {
  const res = await call('/health', { method: 'GET' }, 8000);
  return (await res.json()) as { decision_agent: string; converter: string; error: string | null };
}

/** DOCX → PDF with LibreOffice in the worker container. */
export async function convertDocx(data: Uint8Array, name: string) {
  const form = new FormData();
  form.append('file', new Blob([data as BlobPart]), name);
  const res = await call('/convert', { method: 'POST', body: form }, 150000);
  return { pdf: new Uint8Array(await res.arrayBuffer()), converter: res.headers.get('x-converter') ?? 'libreoffice', elapsedMs: Number(res.headers.get('x-elapsed-ms') ?? 0) };
}

type Question =
  | { type: 'choice'; instructions: string; criteria: Record<string, string> }
  | { type: 'noul'; instructions: string }
  | { type: 'score'; instructions: string; criteria: string[] };

interface LayaAnswer {
  choice?: string;
  noul?: number;
  score?: number;
  legend?: Record<string, string>;
  probabilities?: Record<string, number>;
  answer_confidence?: number;
  confidence?: number;
}

/** Typed decisions from the Laya decision agent. Text is passed as state only; the question set is fixed by the caller. */
export async function decide(state: string, questions: Record<string, Question>, lang: 'en' | 'vi') {
  const model = lang === 'vi' ? 'multilingual' : 'english';
  const res = await call(
    '/decide',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state: state.slice(0, 30000), questions, model, max_len: state.length > 3500 ? 4096 : 1024 }) },
    45000,
  );
  const json = (await res.json()) as { answers: Record<string, LayaAnswer>; routing?: { model?: string; truncated?: boolean }; elapsed_ms?: number };
  const checkpoint = json.routing?.model ?? model;
  const out: Record<string, DecisionAgentAnswer> = {};
  for (const [k, a] of Object.entries(json.answers)) {
    let value: string | number | boolean = '';
    if (a.choice !== undefined) value = a.choice;
    else if (a.noul !== undefined) value = a.noul;
    else if (a.score !== undefined && a.probabilities) {
      const top = Object.entries(a.probabilities).sort((x, y) => y[1] - x[1])[0][0];
      value = a.legend?.[top] ?? top;
    }
    out[k] = { value, confidence: a.answer_confidence ?? null, checkpoint, field: 'answer_confidence', truncated: !!json.routing?.truncated };
  }
  return { answers: out, elapsedMs: json.elapsed_ms ?? null };
}
