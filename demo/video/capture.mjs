// Captures the footage for the introduction video: real screens of the app driven in Chrome with the synthetic demo
// agreement (v1, then its revision v2), plus the on-screen position of every element the video's cursor clicks.
// Writes public/shots/*.jpg and public/shots/manifest.json (positions in 1920 × 1080 CSS pixels).
// Usage (local production build running, worker online): node capture.mjs [baseUrl]
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] ?? 'http://localhost:3100';
const OUT = new URL('./public/shots/', import.meta.url);
const at = (name) => fileURLToPath(new URL(name, OUT));
const W = 1920;
const H = 1080;
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const env = Object.fromEntries((await readFile(new URL('../../.env.supabase.local', import.meta.url), 'utf8')).split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]));

const browser = await chromium.launch({ channel: 'chrome' });
// bypassCSP: Playwright's wait helpers evaluate strings, which the app's production CSP rightly refuses.
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, bypassCSP: true });
await ctx.addInitScript(() => localStorage.getItem('theme') || localStorage.setItem('theme', 'light'));
const page = await ctx.newPage();
page.setDefaultTimeout(45000);
page.on('pageerror', (e) => console.log('pageerror', String(e).slice(0, 160)));
const manifest = {};
const wait = (ms) => page.waitForTimeout(ms);
const box = async (locator) => {
  const b = await locator.first().boundingBox().catch(() => null);
  return b ? { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2), w: Math.round(b.width), h: Math.round(b.height) } : null;
};
async function shot(name, targets = {}, p = page) {
  await p.waitForTimeout(700);
  await p.screenshot({ path: at(`${name}.jpg`), type: 'jpeg', quality: 90, timeout: 180000 });
  manifest[name] = { targets };
  console.log('shot', name, JSON.stringify(targets));
}
/** One optional step: a failure is logged and the run continues without that shot. */
async function opt(name, fn) {
  try {
    await fn();
  } catch (e) {
    console.log('SKIPPED', name, String(e.message ?? e).split('\n')[0].slice(0, 160));
    await page.keyboard.press('Escape').catch(() => {});
  }
}
const go = async (s, v) => {
  // static: the approved station stills instead of live WebGL, which a headless browser renders slowly in software.
  await page.goto(`${BASE}/?static&s=${s}${v ? `&v=${v}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await wait(4000);
  await page.mouse.move(W - 2, H - 2);
};
const button = (name) => page.getByRole('button', { name, exact: false });

// ---- Hub and guide ----------------------------------------------------------------------------------------------------
await page.goto(`${BASE}/?static`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await wait(9000);
await page.mouse.move(W - 2, H - 2);
await shot('hub', { review: await box(page.locator('[data-art="review"]')), guide: await box(button('How to use')) });
const station = await box(page.locator('[data-art="review"]'));
await page.mouse.move(station.x, station.y);
await wait(1200);
await page.screenshot({ path: at('hub-hover.jpg'), type: 'jpeg', quality: 90, timeout: 180000 });
manifest['hub-hover'] = { targets: { review: station } };
await opt('guide', async () => {
  await button('How to use').click();
  await shot('guide', {});
  await page.keyboard.press('Escape');
});

// ---- Intake -------------------------------------------------------------------------------------------------------------
await go('intake');
await shot('intake', { demo: await box(button('Use demo')) });
await button('Use demo').click();
await page.waitForFunction(() => /[?&]v=/.test(location.search), null, { timeout: 60000 });
const v = new URL(page.url()).searchParams.get('v');
await wait(5000);
await shot('intake-running', { status: await box(page.getByText('Job status')) });
await page.waitForFunction(() => /Re-run checks|Resume job/.test(document.body.innerText), null, { timeout: 480000, polling: 3000 });
if (!/input field\(s\)/.test(await page.innerText('body'))) throw new Error('Demo processed without field detection (worker busy or offline); run again.');
await shot('intake-done', { status: await box(page.getByText('Job status')) });

const session = await page.evaluate(() => JSON.parse(Object.entries(localStorage).find(([k]) => k.endsWith('-auth-token'))[1]));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, { global: { headers: { Authorization: `Bearer ${session.access_token}` } }, auth: { persistSession: false } });
const call = async (route, body) => {
  const res = await fetch(`${BASE}${route}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body ?? {}) });
  if (!res.ok) throw new Error(`${route} ${res.status} ${await res.text()}`);
  return res.json();
};

// ---- Source quality -----------------------------------------------------------------------------------------------------
await go('source', v);
await shot('source', { word: await box(page.getByText('Original (Word)')), pdf: await box(page.getByText('Converted (PDF)')), fonts: await box(page.getByRole('tab', { name: 'Fonts' })) });
await opt('source-fonts', async () => {
  await page.getByRole('tab', { name: 'Fonts' }).click();
  await shot('source-fonts', {});
});

// ---- Document map -------------------------------------------------------------------------------------------------------
await go('map', v);
await opt('map-outline', async () => {
  await page.getByText(/finding\(s\)/).first().click();
  await wait(800);
  await shot('map-outline', { section: await box(page.getByText(/finding\(s\)/).first()) });
});
for (const [tab, name] of [['Relationships', 'map-graph'], ['Page map', 'map-pages']]) {
  await opt(name, async () => {
    await page.getByRole('tab', { name: tab }).or(page.getByRole('button', { name: tab, exact: true })).first().click();
    await wait(2000);
    await shot(name, { tab: await box(page.getByRole('tab', { name: tab }).or(page.getByRole('button', { name: tab, exact: true }))) });
  });
}

// ---- Legal review: filters, dismiss with reason, ask counsel, confirm ----------------------------------------------------
await go('review', v);
await shot('review', { quote: await box(page.locator('[data-highlight]')), confirm: await box(button('Confirm issue')) });
await opt('review-filter', async () => {
  const chip = page.getByRole('button', { name: 'References', exact: true });
  const t = await box(chip);
  await chip.click();
  await shot('review-filter', { chip: t });
  await page.getByRole('button', { name: 'All', exact: true }).click();
});
const pick = async (re) => {
  await page.locator('button').filter({ hasText: re }).first().click();
  await wait(900);
};
await opt('review-dismiss', async () => {
  await pick(/Vague wording/);
  const t = await box(button('Dismiss'));
  await button('Dismiss').first().click();
  await page.getByText('Not applicable to this contract').click();
  await page.locator('textarea').fill('Delivery timing is fixed in the separate service schedule.');
  await page.getByText(/Use as a reviewed example/).click();
  await shot('review-dismiss', { open: t, submit: await box(button('Dismiss with reason')) });
  await button('Dismiss with reason').click();
  await wait(1500);
});
await opt('review-clarify', async () => {
  await pick(/not defined/);
  const t = await box(button('Needs clarification'));
  await button('Needs clarification').first().click();
  await wait(600);
  await shot('review-clarify', { open: t });
  await page.locator('[role="dialog"] button.btn-primary').last().click();
  await wait(1500);
});
await opt('review-confirm', async () => {
  await pick(/Conflicting/);
  const t = await box(button('Confirm issue'));
  await button('Confirm issue').click();
  await wait(1800);
  await shot('review-confirmed', { confirm: t });
});

// Remaining findings are confirmed through the API, as a reviewer would in the panel.
const { data: findings } = await sb.from('findings').select('id, title').eq('version_id', v);
const { data: decided } = await sb.from('decision_events').select('finding_id').in('finding_id', findings.map((f) => f.id));
for (const f of findings.filter((f) => !decided.some((d) => d.finding_id === f.id))) await sb.from('decision_events').insert({ finding_id: f.id, action: 'confirm' });

// ---- Decision / report, then the revision v2 and the comparison ------------------------------------------------------------
await go('report', v);
await shot('report', { outcome: await box(page.getByText(/Needs clarification|Revision needed|Review in progress/).first()), questions: await box(page.getByText('Questions for counsel')), compare: await box(button('Compare v1')) });
await opt('compare', async () => {
  const { data: ver } = await sb.from('document_versions').select('document_id').eq('id', v).single();
  const bytes = await readFile(new URL('../../public/demo/demo-agreement-v2.docx', import.meta.url));
  const path = `${session.user.id}/${randomUUID()}/Demo agreement v2.docx`;
  const up = await sb.storage.from('sources').upload(path, bytes, { contentType: DOCX });
  if (up.error) throw up.error;
  const reg = await call('/api/versions', { path, fileName: 'Demo agreement v2.docx', mime: DOCX, size: bytes.length, documentId: ver.document_id });
  for (let i = 0; i < 160; i++) {
    const { data } = await sb.from('jobs').select('status').eq('version_id', reg.versionId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data && ['done', 'failed'].includes(data.status)) break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  await go('report', v);
  const t = await box(button('Compare v1'));
  await button('Compare v1').click();
  await page.getByText(/mark resolved|Still present/).first().waitFor({ timeout: 30000 });
  await shot('compare', { open: t, resolve: await box(page.getByText(/mark resolved/).first()) });
  await page.getByText(/mark resolved/).first().click();
  await wait(1800);
  await shot('compare-resolved', {});
  await page.keyboard.press('Escape');
});
// The reviewer accepts what is left as recorded exceptions so digitization may continue.
{
  const { data: all } = await sb.from('decision_events').select('finding_id, action, reason, created_at').in('finding_id', findings.map((f) => f.id)).order('created_at');
  const last = new Map(all.map((d) => [d.finding_id, d]));
  for (const f of findings) {
    const d = last.get(f.id);
    if (d && (d.action === 'dismiss' || d.action === 'resolve' || d.reason === 'exception')) continue;
    await sb.from('decision_events').insert({ finding_id: f.id, action: 'confirm', reason: 'exception', note: 'Accepted as a recorded exception' });
  }
}

// ---- Annotation: editor, draw mode, confirm uncertain regions, approve -----------------------------------------------------
await go('annotation', v);
await shot('annotation', { types: await box(button('Checkbox')), next: await box(page.getByRole('button', { name: 'Next field' })) });
await opt('annotation-draw', async () => {
  const t = await box(button('Draw region'));
  await button('Draw region').click();
  await wait(600);
  await shot('annotation-draw', { draw: t });
  await button('Draw region').or(button('Drawing')).first().click();
});
await opt('approve', async () => {
  for (let i = 0; i < 6; i++) {
    const warn = page.getByText(/need(s)? source confirmation/);
    if (!(await warn.count())) break;
    await warn.first().click();
    await wait(700);
    await button('Confirm source correspondence').click();
    await wait(1500);
  }
  await button('Approve and continue').click();
  await wait(4000);
});

// ---- Form preview, plain-language help, the exported HTML form ----------------------------------------------------------------
await go('form', v);
await shot('form', { export: await box(button('Export HTML form')), help: await box(page.getByText('Plain-language help')) });
await opt('form-help', async () => {
  await page.getByText('Plain-language help').click();
  await page.waitForFunction(() => !document.querySelector('.animate-spin'), null, { timeout: 90000, polling: 1000 });
  await wait(800);
  await shot('form-help', {});
});
await opt('html-form', async () => {
  const html = await page.evaluate(async () => {
    let href = null;
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { href = this.href; };
    [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Export HTML form')).click();
    HTMLAnchorElement.prototype.click = orig;
    return href ? fetch(href).then((r) => r.text()) : null;
  });
  const formPage = await ctx.newPage();
  await formPage.setContent(html, { waitUntil: 'load' });
  await shot('html-form', { next: await formPage.locator('#next').boundingBox().then((b) => b && { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }) }, formPage);
  await formPage.click('#next');
  await formPage.waitForTimeout(900);
  await formPage.keyboard.type('Harbor Holdings LLC', { delay: 30 });
  await formPage.check('#only');
  await shot('html-form-next', {}, formPage);
  await formPage.close();
});

// ---- Responses, PDF QA catching a clipped answer, then a passing export -----------------------------------------------------------
const { data: anns } = await sb.from('annotations').select('field_id, type, label, options').eq('version_id', v);
const answers = (name) => {
  const a = {};
  for (const f of anns.filter((x) => x.type !== 'paragraph')) {
    if (f.type === 'radio') a[f.field_id] = f.options[1]?.value ?? f.options[0]?.value;
    else if (f.type === 'checkbox') a[f.field_id] = f.options.slice(0, 1).map((o) => o.value);
    else if (/date/i.test(f.label)) a[f.field_id] = '2026-10-18';
    else a[f.field_id] = name;
  }
  return a;
};
const LONG = 'Harbor Holdings International Growth Opportunities Master Fund LLC acting for its Series B Feeder Vehicle and Parallel Accounts';
await sb.from('submissions').upsert({ version_id: v, answers: answers(LONG) }, { onConflict: 'owner,version_id' });
await go('responses', v);
await shot('responses', { create: await box(button('Create draft PDF')), review: await box(button('Review answers')) });
await opt('export-clipped', async () => {
  await call(`/api/versions/${v}/fill`, { final: false });
  await go('export', v);
  await shot('export-clipped', { checks: await box(page.getByText('QA checklist')) });
});
await sb.from('submissions').upsert({ version_id: v, answers: answers('Harbor Holdings LLC') }, { onConflict: 'owner,version_id' });
await call(`/api/versions/${v}/fill`, { final: false });
await go('export', v);
await shot('export', { final: await box(button(/Download final PDF|Export final PDF/)), checks: await box(page.getByText('QA checklist')) });
await opt('export-final', async () => {
  await call(`/api/versions/${v}/fill`, { final: true, confirmed: true });
  await go('export', v);
  await shot('export-final', {});
});

// ---- Memory: feedback and templates ----------------------------------------------------------------------------------------
await go('feedback', v);
await shot('feedback', {});
await go('templates', v);
await shot('templates', {});

// ---- Full-screen workspace with step navigation ------------------------------------------------------------------------------
await go('review', v);
const full = await box(page.locator('[aria-label="Full screen"]'));
await page.click('[aria-label="Full screen"]');
await wait(1800);
await shot('review-full', { full, next: await box(page.getByRole('button', { name: 'Next', exact: true })) });
await opt('full-next', async () => {
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await wait(2500);
  await shot('full-next', {});
});

// ---- Dark theme -----------------------------------------------------------------------------------------------------------------
await page.evaluate(() => localStorage.setItem('theme', 'dark'));
await page.goto(`${BASE}/?static&theme=dark`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await wait(8000);
await page.mouse.move(W - 2, H - 2);
await shot('dark-hub', {});
await page.goto(`${BASE}/?static&s=review&v=${v}&theme=dark`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await wait(4500);
await shot('dark-review', {});

await writeFile(new URL('manifest.json', OUT), JSON.stringify({ width: W, height: H, version: v, shots: manifest }, null, 2));
console.log('done', v, Object.keys(manifest).length, 'shots');
await browser.close();
