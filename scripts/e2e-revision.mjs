// End-to-end check of "Create revised PDF" and Vietnamese form fill against a running app, with fresh anonymous workspaces:
// confirm every finding, build the corrections the dialog pre-fills (spelling fixes; contradictions made consistent),
// get the revised PDF, upload it as v2, compare the way the Compare dialog does, then fill v1 with Vietnamese answers and
// read the final PDF back. Usage: node scripts/e2e-revision.mjs [baseUrl] [file ...]   (needs .env.supabase.local)
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const BASE = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:3000';
const picked = process.argv.slice(2).filter((a) => !a.startsWith('http'));
const FILES = picked.length ? picked : ['07-subscription-form-fillable.pdf', '06-thoa-thuan-dang-ky-gop-von.docx'];
const env = Object.fromEntries((await readFile('.env.supabase.local', 'utf8')).split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const VI = 'Nguyễn Thị Ánh Hồng';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const norm = (s) => s.normalize('NFC').replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function workspace() {
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  const token = data.session.access_token;
  const post = (route, body) => fetch(`${BASE}${route}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body ?? {}) });
  const call = async (route, body) => {
    const res = await post(route, body);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${route} → ${res.status} ${json.error ?? ''}`);
    return json;
  };
  const upload = async (bytes, name, mime, documentId) => {
    const path = `${data.user.id}/${randomUUID()}/${name}`;
    const up = await sb.storage.from('sources').upload(path, bytes, { contentType: mime });
    if (up.error) throw up.error;
    return call('/api/versions', { path, fileName: name, mime, size: bytes.length, documentId });
  };
  const waitJob = async (versionId) => {
    for (let i = 0; i < 200; i++) {
      const { data: j } = await sb.from('jobs').select('status').eq('version_id', versionId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (j && ['done', 'failed'].includes(j.status)) return j.status;
      await new Promise((r) => setTimeout(r, 3000));
    }
    return 'timeout';
  };
  return { sb, post, call, upload, waitJob };
}

async function pdfText(bytes) {
  const doc = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise; // pdf.js takes ownership of the buffer it is given
  let out = '';
  for (let n = 1; n <= doc.numPages; n++) out += (await (await doc.getPage(n)).getTextContent()).items.map((i) => i.str).join(' ') + ' ';
  return norm(out);
}

for (const file of FILES) {
  console.log(`--- ${file}`);
  const ws = await workspace();
  const mime = file.endsWith('.pdf') ? 'application/pdf' : DOCX;
  const v1 = await ws.upload(await readFile(`data/demo-contracts/${file}`), file, mime);
  check(`${file}: v1 processed`, (await ws.waitJob(v1.versionId)) === 'done');
  const { data: v1row } = await ws.sb.from('document_versions').select('source_status, routing').eq('id', v1.versionId).single();
  console.log(`  source ${v1row.source_status}, agent ${v1row.routing?.agent}, semantic ${v1row.routing?.semantic_review}`);
  const { data: f1 } = await ws.sb.from('findings').select('id, category, title, suggestion, fingerprint, evidence, provenance').eq('version_id', v1.versionId).order('seq');
  const ins = await ws.sb.from('decision_events').insert(f1.map((f) => ({ finding_id: f.id, action: 'confirm' })));
  check(`${file}: ${f1.length} findings confirmed`, !ins.error && f1.length > 0, ins.error?.message ?? '');

  // Corrections as the dialog builds them: one per passage, spelling fixes folded in; a contradiction's second passage
  // takes the first passage's wording.
  const passages = new Map();
  const fixed = new Set();
  for (const f of f1)
    for (const e of f.evidence.filter((x) => x.matched)) {
      const key = `${e.block_idx}|${e.quote}`;
      if (!passages.has(key)) passages.set(key, { block_idx: e.block_idx, quote: e.quote, text: e.quote });
    }
  for (const f of f1) {
    const ev = f.evidence.filter((x) => x.matched);
    if (f.category === 'typo' && f.suggestion) {
      const p = passages.get(`${ev[0].block_idx}|${ev[0].quote}`);
      const word = f.title.replace(/^Spelling:\s*/, '');
      const next = p.text.replace(new RegExp(`(?<![\\p{L}\\d])${esc(word)}(?![\\p{L}\\d])`, 'u'), f.suggestion);
      if (next !== p.text) (p.text = next), fixed.add(f.id);
    } else if (f.category === 'contradiction' && ev.length > 1) {
      passages.get(`${ev[1].block_idx}|${ev[1].quote}`).text = ev[0].quote;
      fixed.add(f.id);
    }
  }
  const edits = [...passages.values()].filter((p) => p.text !== p.quote);
  const res = await ws.post(`/api/versions/${v1.versionId}/revise`, { edits });
  const bytes = new Uint8Array(await res.arrayBuffer());
  check(`${file}: revised PDF returned`, res.ok && res.headers.get('content-type') === 'application/pdf' && Buffer.from(bytes.slice(0, 5)).toString() === '%PDF-', `${res.status}, ${bytes.length} bytes`);
  check(`${file}: every correction applied`, res.headers.get('x-applied') === String(edits.length) && res.headers.get('x-missed') === '0', `applied ${res.headers.get('x-applied')}/${edits.length}`);
  const text = await pdfText(bytes);
  check(`${file}: corrections present in the revised PDF`, edits.every((e) => text.includes(norm(e.text))), '');

  const v2 = await ws.upload(bytes, file.replace(/\.(pdf|docx)$/, ' (revised from v1).pdf'), 'application/pdf', v1.documentId);
  check(`${file}: revised PDF registered as v2`, !v2.duplicateOf);
  check(`${file}: v2 processed`, (await ws.waitJob(v2.versionId)) === 'done');
  const { data: v2row } = await ws.sb.from('document_versions').select('version_no, source_status, status').eq('id', v2.versionId).single();
  check(`${file}: v2 source verified`, v2row.version_no === 2 && v2row.source_status === 'verified', `v${v2row.version_no} ${v2row.source_status}`);
  const { data: f2 } = await ws.sb.from('findings').select('category, title, fingerprint').eq('version_id', v2.versionId);
  const still = (f) => f2.some((x) => x.fingerprint === f.fingerprint || (x.category === f.category && x.title === f.title));
  // Rule findings are deterministic and must be found again; semantic findings are reworded between runs, so a missing one
  // is only Compare's proposal (the reviewer decides) and is listed, not failed.
  const wrongGone = f1.filter((f) => !fixed.has(f.id) && !still(f) && f.provenance?.source === 'rules').map((f) => f.title);
  const semanticGone = f1.filter((f) => !fixed.has(f.id) && !still(f) && f.provenance?.source !== 'rules').map((f) => f.title);
  if (semanticGone.length) console.log(`  semantic findings not found again (Compare proposes, reviewer decides): ${semanticGone.join('; ')}`);
  const wrongKept = f1.filter((f) => fixed.has(f.id) && still(f)).map((f) => f.title);
  check(`${file}: Compare shows corrected findings as gone (${fixed.size})`, !wrongKept.length, wrongKept.join('; '));
  check(`${file}: Compare keeps uncorrected rule findings`, !wrongGone.length, wrongGone.join('; '));
  const resolved = await ws.sb.from('decision_events').insert([...fixed].map((id) => ({ finding_id: id, action: 'resolve', note: 'Not present in v2 after re-running checks.' })));
  check(`${file}: corrected findings marked resolved`, !resolved.error, resolved.error?.message ?? '');

  // Vietnamese answers in v1's form (original layout), read back from the final PDF.
  const { data: anns } = await ws.sb.from('annotations').select('field_id, type, label, options, required, bbox').eq('version_id', v1.versionId);
  const fields = (anns ?? []).filter((a) => a.type !== 'paragraph');
  if (!fields.length) {
    console.log('  no input fields detected; fill skipped');
    continue;
  }
  await ws.sb.from('annotations').update({ confirmed: true, transfer_state: 'new' }).eq('version_id', v1.versionId);
  await ws.sb.from('document_versions').update({ annotations_approved_at: new Date().toISOString() }).eq('id', v1.versionId);
  const answers = {};
  let vi = null;
  for (const f of fields) {
    if (f.type === 'radio') answers[f.field_id] = f.options[0]?.value;
    else if (f.type === 'checkbox') answers[f.field_id] = f.options.slice(0, 1).map((o) => o.value);
    else if (/\b(date|dated|ngày)\b/i.test(f.label)) answers[f.field_id] = '2025-06-30';
    else if (/e-?mail/i.test(f.label)) answers[f.field_id] = 'investor@example.com';
    else if (/percent|%/i.test(f.label)) answers[f.field_id] = '25%';
    else if (/amount|commitment|vốn|số tiền/i.test(f.label)) answers[f.field_id] = '1.000.000';
    else if (!vi && f.bbox.w >= 120) (answers[f.field_id] = VI), (vi = f.field_id);
    else answers[f.field_id] = 'Example LP';
  }
  const sub = await ws.sb.from('submissions').upsert({ version_id: v1.versionId, answers }, { onConflict: 'owner,version_id' });
  check(`${file}: answers saved (${fields.length} fields, Vietnamese in ${vi ?? 'none'})`, !sub.error && !!vi, sub.error?.message ?? '');
  try {
    const draft = await ws.call(`/api/versions/${v1.versionId}/fill`, { final: false });
    const failing = draft.qa.checks.filter((c) => c.status !== 'pass').map((c) => `${c.label}: ${c.status}${c.detail ? ` (${c.detail})` : ''}`);
    check(`${file}: draft QA passes`, !failing.length, failing.join('; ') + (draft.qa.issues.length ? ` | ${draft.qa.issues.map((i) => i.title).join('; ')}` : ''));
    const final = await ws.call(`/api/versions/${v1.versionId}/fill`, { final: true, confirmed: true });
    const { data: blob } = await ws.sb.storage.from('exports').download(final.file_path);
    const out = await pdfText(new Uint8Array(await blob.arrayBuffer()));
    check(`${file}: final PDF contains the Vietnamese answer letter for letter`, out.includes(VI), out.includes(VI) ? VI : `not found; nearest: ${out.match(/Nguy\S*\s\S+\s\S+\s\S+/)?.[0] ?? 'none'}`);
  } catch (e) {
    check(`${file}: fill`, false, e.message);
  }
  const rep = await ws.call(`/api/versions/${v1.versionId}/report`, {}).catch((e) => ({ error: e.message }));
  check(`${file}: review report exported`, !!rep.path, rep.error ?? '');
}
const failed = results.filter((r) => !r.ok);
console.log(`REVISION ${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
