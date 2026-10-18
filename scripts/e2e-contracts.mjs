// End-to-end check: runs every file in data/demo-contracts/ through the real pipeline of a running app (local dev
// server by default) with fresh anonymous workspaces, then prints the job steps, findings, fields and report export.
// Usage: node scripts/e2e-contracts.mjs [baseUrl] [file ...]
// Needs the project's .env.supabase.local (public URL and publishable key only).
import { readdir, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const BASE = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:3000';
const DIR = path.resolve('data/demo-contracts');
const only = process.argv.slice(2).filter((a) => !a.startsWith('http'));
const env = Object.fromEntries((await readFile('.env.supabase.local', 'utf8')).split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
// The worker caps semantic review per user, so files are spread over a few anonymous workspaces.
const PER_WORKSPACE = 3;
// Planted problems (data/demo-contracts/expected.json): recall of what must be found, and false alarms to avoid.
const EXPECTED = JSON.parse(await readFile(path.join(DIR, 'expected.json'), 'utf8'));

function score(name, findings, anns, source) {
  let exp = EXPECTED[name];
  if (exp?.same_as) exp = EXPECTED[exp.same_as];
  if (!exp) return null;
  const text = (f) => [f.title, f.rationale, ...(f.evidence ?? []).map((e) => e.quote)].join(' ');
  const hits = (item) => findings.some((f) => f.category === item.category && new RegExp(item.pattern, 'iu').test(text(f)));
  const missed = exp.find.filter((i) => !hits(i)).map((i) => `${i.category}: ${i.pattern}${i.semantic ? ' (semantic)' : ''}`);
  const falseAlarms = (exp.avoid ?? []).filter(hits).map((i) => `${i.category}: ${i.pattern}`);
  const fieldsWrong = exp.fields ? Object.entries(exp.fields).filter(([t, n]) => (anns ?? []).filter((a) => a.type === t).length !== n).map(([t, n]) => `${t} expected ${n}`) : [];
  const sourceWrong = exp.source && !new RegExp(`^(${exp.source})$`).test(source ?? '') ? `source ${source ?? 'none'}, expected ${exp.source}` : null;
  return { found: exp.find.length - missed.length, of: exp.find.length, missed, falseAlarms, fieldsWrong, sourceWrong };
}

// This machine's network drops the odd request; the script retries its own calls so a blip is not reported as an app
// failure (the app's pipeline has its own retries).
async function retry(fn, label) {
  for (let i = 0; ; i++) {
    try {
      const r = await fn();
      if (r?.error && /fetch failed|network|ECONNRESET/i.test(r.error.message ?? '') && i < 3) throw new Error(r.error.message);
      return r;
    } catch (e) {
      if (i >= 3 || !/fetch failed|network|ECONNRESET|ETIMEDOUT/i.test(String(e?.message ?? e))) throw e;
      console.error(`retrying ${label}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

// PostgREST returns at most 1000 rows per request; long documents have more annotations than that.
async function allRows(page) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

async function workspace() {
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await retry(() => sb.auth.signInAnonymously(), 'sign-in');
  if (error) throw error;
  return { sb, user: data.user, token: data.session.access_token };
}

async function call(ws, route, body) {
  const res = await retry(() => fetch(`${BASE}${route}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${ws.token}` }, body: JSON.stringify(body ?? {}) }), route);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${route} → ${res.status} ${json.error ?? ''}`);
  return json;
}

// Stands in for the reviewer on screens 06–09: confirms every proposed region, approves the annotations, saves
// synthetic answers, then asks for a draft PDF (fill + QA) and, when QA passes, the confirmed final PDF.
async function fillPdf(ws, versionId) {
  const anns = await allRows((a, b) => ws.sb.from('annotations').select('id, field_id, type, label, options, required').eq('version_id', versionId).order('id').range(a, b));
  const fields = (anns ?? []).filter((a) => a.type !== 'paragraph');
  if (!fields.length) return 'no input fields';
  const upd = await retry(() => ws.sb.from('annotations').update({ confirmed: true, transfer_state: 'new' }).eq('version_id', versionId), 'confirm');
  if (upd.error) return `confirm failed: ${upd.error.message}`;
  const approve = await retry(() => ws.sb.from('document_versions').update({ annotations_approved_at: new Date().toISOString() }).eq('id', versionId), 'approve');
  if (approve.error) return `approve failed: ${approve.error.message}`;
  const answers = {};
  for (const f of fields) {
    if (f.type === 'radio') answers[f.field_id] = f.options[0]?.value;
    else if (f.type === 'checkbox') answers[f.field_id] = f.options.slice(0, 1).map((o) => o.value);
    // Realistic answers by label; an over-long answer would be caught by PDF QA as clipped (that check is exercised too).
    else if (/\b(date|dated|ngày)\b/i.test(f.label)) answers[f.field_id] = '2025-06-30';
    else if (/percent|%/i.test(f.label)) answers[f.field_id] = '25%';
    else if (/amount|commitment|vốn/i.test(f.label)) answers[f.field_id] = '1,000,000';
    else if (/e-?mail/i.test(f.label)) answers[f.field_id] = 'investor@example.com';
    else answers[f.field_id] = 'Example Investor LP';
  }
  const sub = await retry(() => ws.sb.from('submissions').upsert({ version_id: versionId, answers }, { onConflict: 'owner,version_id' }), 'answers');
  if (sub.error) return `answers failed: ${sub.error.message}`;
  try {
    let draft = await call(ws, `/api/versions/${versionId}/fill`, { final: false });
    // A reviewer shortens an answer that QA reports as clipped (a narrow table cell, for example) and runs QA again.
    const clipped = (draft.qa?.issues ?? []).filter((i) => i.field_id && /clipped/i.test(i.title)).map((i) => i.field_id);
    if (clipped.length) {
      for (const id of clipped) answers[id] = 'LP';
      const again = await retry(() => ws.sb.from('submissions').upsert({ version_id: versionId, answers }, { onConflict: 'owner,version_id' }), 'answers');
      if (again.error) return `answers failed: ${again.error.message}`;
      draft = await call(ws, `/api/versions/${versionId}/fill`, { final: false });
    }
    const note = clipped.length ? `; QA caught ${clipped.length} clipped answer(s), shortened` : '';
    const failed = (draft.qa?.checks ?? []).filter((c) => c.status !== 'pass').map((c) => `${c.label} (${c.status})`);
    if (failed.length) return `draft QA: ${failed.join(', ')}; ${draft.qa.issues.length} issue(s), final blocked${note}`;
    const final = await call(ws, `/api/versions/${versionId}/fill`, { final: true, confirmed: true });
    return `${fields.length} fields filled${note}; draft QA passed; final ${final.kind}`;
  } catch (e) {
    return `fill failed: ${e.message}`;
  }
}

async function run(ws, name) {
  const started = Date.now();
  const bytes = await readFile(path.join(DIR, name));
  const mime = name.endsWith('.pdf') ? 'application/pdf' : DOCX;
  const storagePath = `${ws.user.id}/${randomUUID()}/${name}`;
  const up = await retry(() => ws.sb.storage.from('sources').upload(storagePath, bytes, { contentType: mime }), 'upload');
  if (up.error) throw up.error;
  const reg = await call(ws, '/api/versions', { path: storagePath, fileName: name, mime, size: bytes.length });
  let job;
  for (let i = 0; i < 200; i++) {
    ({ data: job } = await ws.sb.from('jobs').select('status, steps, error').eq('version_id', reg.versionId).order('created_at', { ascending: false }).limit(1).maybeSingle());
    if (job && ['done', 'failed'].includes(job.status)) break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  const { data: v } = await ws.sb.from('document_versions').select('source_status, routing, source_report, language').eq('id', reg.versionId).single();
  const { data: findings } = await ws.sb.from('findings').select('category, title, rationale, evidence, provenance, evidence_status').eq('version_id', reg.versionId).order('seq');
  const anns = await allRows((a, b) => ws.sb.from('annotations').select('type, transfer_state').eq('version_id', reg.versionId).order('id').range(a, b));
  let report = 'not run';
  try {
    report = (await call(ws, `/api/versions/${reg.versionId}/report`, {})).path ? 'exported' : 'no path';
  } catch (e) {
    report = `failed: ${e.message}`;
  }
  const digitise = job?.status === 'done' ? await fillPdf(ws, reg.versionId) : 'skipped';
  const count = (t) => (anns ?? []).filter((a) => a.type === t).length;
  const cov = v.source_report?.coverage;
  return {
    file: name,
    seconds: Math.round((Date.now() - started) / 1000),
    job: job?.status ?? 'timeout',
    error: job?.error ?? null,
    steps: (job?.steps ?? []).map((s) => `${s.key}: ${s.status}${s.detail ? ` (${s.detail})` : ''}`),
    language: v.language,
    source: v.source_status,
    coverage: cov ? `${cov.read_pages}/${cov.total_pages} pages read${cov.unread_pages?.length ? `, unread ${cov.unread_pages.join(',')}` : ''}` : 'n/a',
    issues: (v.source_report?.issues ?? []).map((i) => `${i.page ? `p${i.page} ` : ''}${i.title}`),
    semantic: v.routing?.semantic_review ?? 'n/a',
    semanticNote: (v.source_report?.limitations ?? []).find((l) => l.startsWith('Semantic review did not complete')) ?? null,
    agent: v.routing?.agent ?? 'n/a',
    findings: (findings ?? []).map((f) => `${f.category}: ${f.title} [${f.provenance?.source}${f.provenance?.model ? `/${f.provenance.model}` : ''}, ${f.evidence_status}]`),
    fields: `${count('text_box')} text, ${count('radio')} radio, ${count('checkbox')} checkbox, ${count('paragraph')} paragraph; ${(anns ?? []).filter((a) => a.transfer_state === 'uncertain').length} uncertain`,
    report,
    digitise,
    accuracy: score(name, findings ?? [], anns, v.source_status),
    versionId: reg.versionId,
  };
}

const files = (await readdir(DIR)).filter((f) => /\.(pdf|docx)$/i.test(f) && (!only.length || only.includes(f))).sort();
let ws;
const results = [];
for (const [i, name] of files.entries()) {
  if (i % PER_WORKSPACE === 0) ws = await workspace();
  try {
    const r = await run(ws, name);
    results.push(r);
    console.log(JSON.stringify(r, null, 2));
  } catch (e) {
    results.push({ file: name, job: 'error', error: e.message });
    console.log(JSON.stringify({ file: name, error: e.message }));
  }
}
console.log('SUMMARY');
for (const r of results) {
  const a = r.accuracy;
  console.log(`${r.file}: job ${r.job}${r.error ? ` (${r.error})` : ''}, ${r.seconds ?? '?'} s, ${r.findings?.length ?? 0} findings, planted ${a ? `${a.found}/${a.of}` : '-'}${a?.missed.length ? ` missed [${a.missed.join('; ')}]` : ''}${a?.falseAlarms.length ? ` FALSE ALARMS [${a.falseAlarms.join('; ')}]` : ''}${a?.fieldsWrong.length ? ` FIELDS [${a.fieldsWrong.join('; ')}]` : ''}${a?.sourceWrong ? ` SOURCE [${a.sourceWrong}]` : ''}, source ${r.source ?? '-'} (${r.coverage ?? '-'}), report ${r.report ?? '-'}, ${r.digitise ?? '-'}`);
}
const all = results.map((r) => r.accuracy).filter(Boolean);
const found = all.reduce((n, a) => n + a.found, 0);
const of = all.reduce((n, a) => n + a.of, 0);
console.log(`TOTAL planted problems found ${found}/${of} (${Math.round((100 * found) / Math.max(1, of))}%), false alarms ${all.reduce((n, a) => n + a.falseAlarms.length, 0)}, total time ${results.reduce((n, r) => n + (r.seconds ?? 0), 0)} s`);
