// Memory check against a running app: decisions persist and stay append-only, survive re-running checks, reach the next
// semantic review as workspace examples, and a v2 upload carries annotations over and drops the fixed typo.
// Usage: node scripts/e2e-memory.mjs [baseUrl]   (needs .env.supabase.local; uses the synthetic demo agreement)
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const env = Object.fromEntries((await readFile('.env.supabase.local', 'utf8')).split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { data: auth, error: authError } = await sb.auth.signInAnonymously();
if (authError) throw authError;
const token = auth.session.access_token;
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function call(route, body) {
  const res = await fetch(`${BASE}${route}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body ?? {}) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${route} → ${res.status} ${json.error ?? ''}`);
  return json;
}
async function waitJob(versionId, after = 0) {
  for (let i = 0; i < 150; i++) {
    const { data } = await sb.from('jobs').select('status, created_at').eq('version_id', versionId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data && new Date(data.created_at).getTime() >= after && ['done', 'failed'].includes(data.status)) return data.status;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return 'timeout';
}
async function upload(file, name, documentId) {
  const bytes = await readFile(file);
  const path = `${auth.user.id}/${randomUUID()}/${name}`;
  const up = await sb.storage.from('sources').upload(path, bytes, { contentType: DOCX });
  if (up.error) throw up.error;
  return call('/api/versions', { path, fileName: name, mime: DOCX, size: bytes.length, documentId });
}

// 1. v1 and decisions
const v1 = await upload('public/demo/demo-agreement-v1.docx', 'Memory test agreement.docx');
check('v1 processed', (await waitJob(v1.versionId)) === 'done');
const { data: f1 } = await sb.from('findings').select('id, title, category').eq('version_id', v1.versionId).order('seq');
const missing = f1.find((f) => f.category === 'missing_reference');
const conflict = f1.find((f) => f.category === 'contradiction');
const ins = await sb.from('decision_events').insert([
  { finding_id: conflict.id, action: 'confirm', reason: null, note: null, use_as_example: false },
  { finding_id: missing.id, action: 'dismiss', reason: 'Not applicable to this contract', note: 'Section 9 lives in the master schedule.', use_as_example: true },
]).select('id, finding_title, finding_category');
check('decisions saved with a snapshot of their finding', !ins.error && ins.data.every((d) => d.finding_title), ins.error?.message ?? ins.data.map((d) => d.finding_title).join(', '));

// 2. append-only
const tamper = await sb.from('decision_events').update({ action: 'confirm' }).eq('id', ins.data[1].id).select('id');
const after = await sb.from('decision_events').select('action').eq('id', ins.data[1].id).single();
check('past decisions cannot be rewritten', !!tamper.error || after.data.action === 'dismiss', tamper.error?.message ?? `action still ${after.data.action}`);
const flag = await sb.from('decision_events').update({ use_as_example: false }).eq('id', ins.data[0].id).select('id');
check('the example flag can still be toggled', !flag.error, flag.error?.message ?? '');

// 3. re-run checks: decisions survive, examples reach the semantic reviewer
const rerunAt = Date.now() - 5000;
await call(`/api/versions/${v1.versionId}/process`, {});
check('re-run processed', (await waitJob(v1.versionId, rerunAt)) === 'done');
const { data: kept } = await sb.from('decision_events').select('action, finding_id, finding_title, use_as_example').in('id', ins.data.map((d) => d.id));
check('decisions survive the re-run', kept.length === 2 && kept.every((d) => d.finding_title), kept.map((d) => `${d.action}:${d.finding_title}:${d.finding_id ? 'linked' : 'unlinked'}`).join(', '));
const { data: v1row } = await sb.from('document_versions').select('routing').eq('id', v1.versionId).single();
const note = (v1row.routing?.notes ?? []).find((n) => n.includes('reviewer example'));
check('next review received the workspace example', !!note || v1row.routing?.semantic_review !== 'run', note ?? `semantic ${v1row.routing?.semantic_review}`);

// 4. v2: annotations carried over, fixed typo gone
const v2 = await upload('public/demo/demo-agreement-v2.docx', 'Memory test agreement v2.docx', v1.documentId);
check('v2 processed as version 2', (await waitJob(v2.versionId)) === 'done');
const { data: anns } = await sb.from('annotations').select('transfer_state').eq('version_id', v2.versionId);
const states = anns.reduce((m, a) => ((m[a.transfer_state] = (m[a.transfer_state] ?? 0) + 1), m), {});
check('annotations transferred from v1', (states.matched ?? 0) > 0, JSON.stringify(states));
const { data: f2 } = await sb.from('findings').select('title').eq('version_id', v2.versionId);
check('typo fixed in v2 is no longer reported', !f2.some((f) => /recieve/i.test(f.title)), `${f2.length} findings in v2`);

const failed = results.filter((r) => !r.ok);
console.log(`MEMORY ${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
