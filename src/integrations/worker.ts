import { AsyncLocalStorage } from 'node:async_hooks';
import type { DecisionAgentAnswer } from '../lib/types';

export class WorkerUnavailable extends Error {}

// The worker runs on the owner's machine behind a tunnel whose address changes on restart; it publishes the
// current address to Supabase (worker_endpoint). WORKER_URL overrides it for local development.
let cached: { url: string | null; at: number } | null = null;

async function baseUrl() {
  if (process.env.WORKER_URL) return process.env.WORKER_URL.replace(/\/$/, '');
  if (cached && Date.now() - cached.at < 30_000) return cached.url;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/worker_endpoint?select=url,updated_at&id=eq.1`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    const rows = (await res.json()) as { url: string | null }[];
    const url = rows[0]?.url?.replace(/\/$/, '') ?? null;
    // Session tokens are only ever sent to a Cloudflare quick-tunnel host (same rule as the database function).
    cached = { url: url && /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(url) ? url : null, at: Date.now() };
  } catch {
    cached = { url: null, at: Date.now() };
  }
  return cached.url;
}

// The caller's Supabase session token authenticates each request (the worker verifies it with Supabase Auth).
// AsyncLocalStorage keeps concurrent pipeline runs on a shared function instance from mixing sessions.
const session = new AsyncLocalStorage<string>();
export const withWorkerSession = <T>(token: string, fn: () => Promise<T>) => session.run(token, fn);
const headers = (): Record<string, string> => {
  const t = process.env.WORKER_TOKEN || session.getStore();
  return t ? { authorization: `Bearer ${t}` } : {};
};

async function call(path: string, init: RequestInit, timeoutMs: number) {
  const base = await baseUrl();
  if (!base) throw new WorkerUnavailable('Worker is offline (no published address).');
  try {
    const res = await fetch(`${base}${path}`, { ...init, headers: { ...headers(), ...(init.headers ?? {}) }, signal: AbortSignal.timeout(timeoutMs) });
    if (res.status === 530 || res.status === 1033) throw new WorkerUnavailable(`Worker tunnel is not connected (${res.status}).`);
    if (res.status === 503 || res.status === 502 || res.status === 504) throw new WorkerUnavailable(`Worker ${path} unavailable (${res.status}).`);
    if (!res.ok) throw new Error(`Worker ${path} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    return res;
  } catch (e) {
    if (e instanceof WorkerUnavailable) throw e;
    if (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError' || /fetch failed|ECONN|ENOTFOUND/i.test(e.message))) throw new WorkerUnavailable(`Worker unreachable: ${e.message}`);
    throw e;
  }
}

/**
 * Long work runs as a worker job: the Cloudflare quick tunnel ends any request after about 100 seconds, so the call
 * only starts the job and the result is fetched by polling.
 */
async function runJob(path: string, init: RequestInit, timeoutMs: number) {
  const started = Date.now();
  let first: Response | null = null;
  for (let tries = 0; !first; tries++) {
    try {
      first = await call(path, init, 60000);
    } catch (e) {
      if (!(e instanceof Error && e.message.includes('(429)')) || tries >= 20) throw e;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  const { job } = (await first.json()) as { job: string };
  let misses = 0;
  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, 2500));
    try {
      const res = await call(`/jobs/${job}`, { method: 'GET' }, 30000);
      if (res.status !== 202) return res;
      misses = 0;
    } catch (e) {
      // Quick tunnels drop the odd request (502/530, reset); the job keeps running, so a few misses are retried.
      if (!(e instanceof WorkerUnavailable) || ++misses > 4) throw e;
    }
  }
  throw new WorkerUnavailable(`Worker ${path} did not finish within ${Math.round(timeoutMs / 1000)} s.`);
}

export async function workerHealth() {
  const res = await call('/health', { method: 'GET' }, 8000);
  return (await res.json()) as { decision_agent: string; converter: string; error: string | null };
}

/** DOCX → PDF in the worker (Microsoft Word on the owner's machine, or LibreOffice in a container). */
export async function convertDocx(data: Uint8Array, name: string) {
  const form = new FormData();
  form.append('file', new Blob([data as BlobPart]), name);
  const res = await runJob('/jobs/convert', { method: 'POST', body: form }, 200000);
  return { pdf: new Uint8Array(await res.arrayBuffer()), converter: res.headers.get('x-converter') ?? 'libreoffice', elapsedMs: Number(res.headers.get('x-elapsed-ms') ?? 0) };
}

/** Semantic review by the owner's Codex CLI in the worker. Only data is sent; instructions and schema are fixed there. */
export async function semanticViaWorker(body: { document: { id: number; section: string | null; text: string }[]; index: unknown; guidance: string; language: 'en' | 'vi' }) {
  const res = await runJob('/jobs/semantic', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, 240000);
  return (await res.json()) as { result: unknown; engine: string; elapsed_ms: number };
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

interface LayaResult {
  answers: Record<string, LayaAnswer>;
  routing?: { model?: string };
  usage?: { truncated?: boolean };
}

function normalize(json: LayaResult, model: string) {
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
    out[k] = { value, confidence: a.answer_confidence ?? null, checkpoint, field: 'answer_confidence', truncated: !!json.usage?.truncated };
  }
  return out;
}

/** Typed decisions from the Laya decision agent. Text is passed as state only; the question set is fixed by the caller. */
export async function decide(state: string, questions: Record<string, Question>, lang: 'en' | 'vi') {
  const model = lang === 'vi' ? 'multilingual' : 'english';
  const res = await runJob(
    '/jobs/decide',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state: state.slice(0, 30000), questions, model, max_len: state.length > 3500 ? 4096 : 1024 }) },
    150000,
  );
  const json = (await res.json()) as LayaResult & { elapsed_ms?: number };
  return { answers: normalize(json, model), elapsedMs: json.elapsed_ms ?? null };
}

/** Many short states with one question set in a single batched call (findings, proposed fields). */
export async function decideBatch(states: string[], questions: Record<string, Question>, lang: 'en' | 'vi') {
  if (!states.length) return { answers: [] as Record<string, DecisionAgentAnswer>[], elapsedMs: 0 };
  const model = lang === 'vi' ? 'multilingual' : 'english';
  const res = await runJob('/jobs/decide', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ states: states.map((s) => s.slice(0, 4000)), questions, model }) }, 180000);
  const json = (await res.json()) as { results: LayaResult[]; elapsed_ms?: number };
  return { answers: json.results.map((r) => normalize(r, model)), elapsedMs: json.elapsed_ms ?? null };
}
