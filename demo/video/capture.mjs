// Captures the footage for the introduction video: real screens of the app driven in Chrome with the synthetic demo
// agreement, plus the on-screen position of every element the video's cursor clicks. Writes public/shots/*.jpg and
// public/shots/manifest.json (positions in 1920 × 1080 CSS pixels).
// Usage (app running locally, worker online): node capture.mjs [baseUrl]
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = new URL('./public/shots/', import.meta.url);
const at = (name) => fileURLToPath(new URL(name, OUT));
const W = 1920;
const H = 1080;
const env = Object.fromEntries((await readFile(new URL('../../.env.supabase.local', import.meta.url), 'utf8')).split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]));

const browser = await chromium.launch({ channel: 'chrome' });
// bypassCSP: Playwright's wait helpers evaluate strings, which the app's production CSP rightly refuses.
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, bypassCSP: true });
await ctx.addInitScript(() => localStorage.setItem('theme', 'light'));
const page = await ctx.newPage();
page.setDefaultTimeout(60000);
page.on('pageerror', (e) => console.log('pageerror', String(e).slice(0, 160)));
const manifest = {};
const wait = (ms) => page.waitForTimeout(ms);
const box = async (locator) => {
  const b = await locator.first().boundingBox();
  return b ? { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2), w: Math.round(b.width), h: Math.round(b.height) } : null;
};
async function shot(name, targets = {}) {
  await wait(600);
  await page.mouse.move(W - 2, H - 2); // keep the real cursor out of hover states unless a scene wants one
  await page.screenshot({ path: at(`${name}.jpg`), type: 'jpeg', quality: 92 });
  manifest[name] = { targets };
  console.log('shot', name, JSON.stringify(targets));
}
const go = async (s, v) => {
  await page.goto(`${BASE}/?s=${s}${v ? `&v=${v}` : ''}`, { waitUntil: 'domcontentloaded' });
  await wait(4000);
};

// 1. Hub (3D stations), then hovering Legal review
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await wait(6000);
await shot('hub', { review: await box(page.locator('[data-art="review"]')), upload: await box(page.getByRole('button', { name: 'Upload contract' })) });
const station = await box(page.locator('[data-art="review"]'));
await page.mouse.move(station.x, station.y);
await wait(1200);
await page.screenshot({ path: at('hub-hover.jpg'), type: 'jpeg', quality: 92 });
manifest['hub-hover'] = { targets: { review: station } };

// 2. Intake: Use demo, job running, job done
await go('intake');
await shot('intake', { demo: await box(page.getByRole('button', { name: 'Use demo' })) });
await page.getByRole('button', { name: 'Use demo' }).click();
await page.waitForFunction(() => /[?&]v=/.test(location.search), null, { timeout: 60000 });
const v = new URL(page.url()).searchParams.get('v');
await wait(5000);
await shot('intake-running', { status: await box(page.getByText('Job status')) });
await page.waitForFunction(() => /Re-run checks|Resume job/.test(document.body.innerText), null, { timeout: 420000, polling: 3000 });
if (!/input field\(s\)/.test(await page.innerText('body'))) throw new Error('Demo processed without field detection (worker busy or offline); run again.');
await shot('intake-done', { status: await box(page.getByText('Job status')), next: await box(page.getByRole('button', { name: /Continue to source quality/ })) });

// Session of this browser, to record the reviewer's later decisions through the API like the app does.
const session = await page.evaluate(() => JSON.parse(Object.entries(localStorage).find(([k]) => k.endsWith('-auth-token'))[1]));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, { global: { headers: { Authorization: `Bearer ${session.access_token}` } }, auth: { persistSession: false } });
const call = async (route, body) => {
  const res = await fetch(`${BASE}${route}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body ?? {}) });
  if (!res.ok) throw new Error(`${route} ${res.status} ${await res.text()}`);
  return res.json();
};

// 3. Source quality and document map
await go('source', v);
await shot('source', { word: await box(page.getByText('Original (Word)')), pdf: await box(page.getByText('Converted (PDF)')), note: await box(page.getByText(/Font substituted, text identical/).last()) });
await go('map', v);
await page.getByRole('tab', { name: 'Relationships' }).or(page.getByRole('button', { name: 'Relationships' })).first().click();
await wait(2000);
await shot('map', { graph: await box(page.locator('.react-flow')) });

// 4. Legal review: the first finding, then Confirm issue
await go('review', v);
await shot('review', { quote: await box(page.locator('[data-highlight]')), confirm: await box(page.getByRole('button', { name: 'Confirm issue' })) });
await page.getByRole('button', { name: 'Confirm issue' }).click();
await wait(2500);
await shot('review-confirmed', {});

// The reviewer accepts the remaining wording as recorded exceptions (synthetic demo), so digitization may continue.
const { data: findings } = await sb.from('findings').select('id').eq('version_id', v);
for (const f of findings) {
  const r = await sb.from('decision_events').insert({ finding_id: f.id, action: 'confirm', reason: 'exception', note: 'Accepted as a recorded exception', use_as_example: false });
  if (r.error) throw r.error;
}

// 5. Decision / report
await go('report', v);
await shot('report', { outcome: await box(page.getByText(/Approved with exceptions/).first()), export: await box(page.getByRole('button', { name: /Export review report/ })), next: await box(page.getByRole('button', { name: /Continue to annotation/ })) });

// 6. Annotation, then approval (regions confirmed through the API as a reviewer would in the panel)
await go('annotation', v);
await shot('annotation', { page: await box(page.locator('[data-page]')), types: await box(page.getByRole('button', { name: 'Checkbox' })) });
await sb.from('annotations').update({ confirmed: true }).eq('version_id', v);
await sb.from('document_versions').update({ annotations_approved_at: new Date().toISOString() }).eq('id', v);

// 7. Form preview and the exported HTML form
await go('form', v);
await shot('form', { export: await box(page.getByRole('button', { name: /Export HTML form/ })), enable: await box(page.getByRole('button', { name: /Enable responses/ })) });
const html = await page.evaluate(async () => {
  let href = null;
  const orig = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { href = this.href; };
  [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Export HTML form')).click();
  HTMLAnchorElement.prototype.click = orig;
  return href ? fetch(href).then((r) => r.text()) : null;
});
const formPage = await ctx.newPage();
await formPage.setContent(html, { waitUntil: 'domcontentloaded' });
await formPage.fill('input[name*="client_legal_name"]', 'Harbor Holdings LLC').catch(() => {});
await formPage.waitForTimeout(500);
await formPage.screenshot({ path: at('html-form.jpg'), type: 'jpeg', quality: 92 });
manifest['html-form'] = { targets: { next: await formPage.locator('#next').boundingBox() } };
await formPage.close();

// 8. Responses with answers, then the draft PDF and its QA, then the final export
const { data: anns } = await sb.from('annotations').select('field_id, type, label, options').eq('version_id', v);
const answers = {};
for (const f of anns.filter((a) => a.type !== 'paragraph')) {
  if (f.type === 'radio') answers[f.field_id] = f.options[1]?.value ?? f.options[0]?.value;
  else if (f.type === 'checkbox') answers[f.field_id] = f.options.slice(0, 1).map((o) => o.value);
  else if (/date/i.test(f.label)) answers[f.field_id] = '2026-10-18';
  else answers[f.field_id] = 'Harbor Holdings LLC';
}
await sb.from('submissions').upsert({ version_id: v, answers }, { onConflict: 'owner,version_id' });
await go('responses', v);
await shot('responses', { create: await box(page.getByRole('button', { name: /Create draft PDF/ })) });
await call(`/api/versions/${v}/fill`, { final: false });
await go('export', v);
await shot('export', { final: await box(page.getByRole('button', { name: /Export final PDF|Download final PDF/ })), checks: await box(page.getByText('QA checklist')) });
await call(`/api/versions/${v}/fill`, { final: true, confirmed: true });
await go('export', v);
await shot('export-final', {});

// 9. Full-screen mode on Legal review
await go('review', v);
const full = await box(page.locator('[aria-label="Full screen"]'));
await page.click('[aria-label="Full screen"]');
await wait(1500);
await shot('review-full', {});
manifest.review.targets.full = full;

await writeFile(new URL('manifest.json', OUT), JSON.stringify({ width: W, height: H, version: v, shots: manifest }, null, 2));
console.log('done', v);
await browser.close();
