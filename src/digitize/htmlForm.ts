import type { AnnotationRow } from '../lib/types';
import { isDateField, type FormSection } from './form';

/** Answers file written by the exported form and read back by Responses → Import answers. */
export const ANSWERS_FORMAT = 'anduin-form-answers/v1';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function control(a: AnnotationRow) {
  const id = esc(a.field_id);
  const req = a.required ? ' data-required="1"' : '';
  const badge = a.required ? '<span class="pill req">Required</span>' : '<span class="pill">Optional</span>';
  const head = `<div class="fhead"><span class="label">${esc(a.label)}</span>${badge}</div>`;
  if (a.type === 'radio' || a.type === 'checkbox') {
    const opts = a.options
      .map((o) => `<label class="opt"><input type="${a.type}" name="${id}" value="${esc(o.value)}"><span>${esc(o.label)}</span></label>`)
      .join('');
    return `<fieldset class="field" data-field="${id}" data-type="${a.type}"${req}><legend class="sr">${esc(a.label)}</legend>${head}<div class="opts">${opts}</div><div class="hint">${a.type === 'radio' ? 'Choose one' : 'Choose all that apply'}</div><div class="err"></div></fieldset>`;
  }
  const type = isDateField(a.label) ? 'date' : 'text';
  return `<div class="field" data-field="${id}" data-type="text"${req}><label>${head}<input type="${type}" name="${id}" autocomplete="off"></label><div class="err"></div></div>`;
}

/**
 * A single self-contained HTML page: the full contract text in order with its fields, like the in-app form. No network
 * access, no external files. A header shows progress and jumps to the next field to fill; the contents list can show
 * only the sections that need input. Submit checks required fields, then saves an answers file to import in Responses.
 * All contract text is escaped; the only script is the fixed one below.
 */
export function formHtml(form: { title: string; sections: FormSection[] }, meta: { documentTitle: string; versionNo: number; versionId: string }) {
  const sections = form.sections.map((s, i) => {
    const fields = s.items.filter((it) => it.kind === 'field').length;
    const items = s.items.map((it) => (it.kind === 'field' ? control(it.ann) : `<p>${esc(it.block.text)}</p>`)).join('\n');
    return { id: `s${i + 1}`, title: s.title, fields, html: `<section id="s${i + 1}" class="card${fields ? ' has-fields' : ''}" data-fields="${fields}"><h2>${esc(s.title)}${fields ? `<span class="count">${fields} to fill</span>` : ''}</h2>\n${items}</section>` };
  });
  const toc = sections
    .map((s) => `<a href="#${s.id}" data-target="${s.id}" class="${s.fields ? 'has-fields' : ''}"><span class="t">${esc(s.title)}</span>${s.fields ? `<span class="n">${s.fields}</span>` : ''}</a>`)
    .join('');
  const title = `${meta.documentTitle} · form v${meta.versionNo}`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{--ink:#0e1a44;--text:#2b3a57;--muted:#5d6b82;--line:#dbe4f0;--soft:#f4f7fc;--primary:#0068fe;--primary-soft:#e8f1ff;--brand:#48aff0;--ok:#0f9f6e;--err:#c62828;--bg:#eef3f9}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:96px}
body{margin:0;background:var(--bg);color:var(--text);font:15.5px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
header.top{position:sticky;top:0;z-index:10;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.top .in{max-width:1240px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:18px}
.brand{display:flex;align-items:baseline;gap:8px;white-space:nowrap}.brand b{font-size:24px;font-weight:800;letter-spacing:-.02em;color:var(--ink)}
.brand span{font-size:15px;color:var(--muted)}.sep{width:1px;height:30px;background:var(--line)}
.doc{min-width:0;flex:1}.doc .name{font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.doc .ver{font-size:13px;color:var(--muted)}
.prog{width:190px}.prog .lbl{font-size:12.5px;color:var(--muted);display:flex;justify-content:space-between}.bar{height:6px;border-radius:9px;background:var(--line);overflow:hidden;margin-top:4px}.bar i{display:block;height:100%;background:var(--primary);transform:scaleX(0);transform-origin:left;transition:transform .3s}
.btn{font:inherit;font-weight:600;border:0;border-radius:999px;padding:10px 18px;background:var(--primary);color:#fff;cursor:pointer;white-space:nowrap}
.btn.ghost{background:var(--primary-soft);color:var(--primary)}.btn:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid rgba(0,104,254,.35);outline-offset:2px}
.layout{max-width:1240px;margin:0 auto;padding:22px 20px 120px;display:grid;grid-template-columns:270px minmax(0,1fr);gap:22px}
nav.toc{position:sticky;top:92px;align-self:start;max-height:calc(100vh - 110px);display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px}
.toc h3{margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.toc .switch{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--ink);margin-bottom:10px;cursor:pointer}
.toc .list{overflow:auto;margin:0 -6px;padding:0 6px}.toc a{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:9px;color:var(--text);text-decoration:none;font-size:13.5px;line-height:1.35}
.toc a:hover{background:var(--soft)}.toc a.on{background:var(--primary-soft);color:var(--primary);font-weight:600}.toc a .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.toc a .n{font-size:11.5px;font-weight:700;border-radius:999px;padding:1px 8px;background:var(--primary-soft);color:var(--primary)}.toc a.done .n{background:#e3f7ef;color:var(--ok)}.toc a.done .n::before{content:"✓ "}
.only-fill .card:not(.has-fields),.only-fill .toc a:not(.has-fields){display:none}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:22px 26px;margin-bottom:14px}
.card h2{display:flex;align-items:center;gap:10px;margin:0 0 8px;font-size:18px;color:var(--ink)}.card h2 .count{font-size:12px;font-weight:700;color:var(--primary);background:var(--primary-soft);border-radius:999px;padding:2px 10px}
.card p{margin:8px 0}
.intro{background:linear-gradient(135deg,#0e43a0,#0068fe);color:#fff;border:0}.intro h1{margin:0 0 6px;font-size:26px;line-height:1.25}.intro p{color:#dbe9ff;margin:0}
.field{border:1px solid #cfe0fb;border-radius:12px;padding:12px 16px;margin:14px 0;background:#f7faff;min-width:0}
.field.filled{border-color:#b8e5d1;background:#f4fbf7}.field.bad{border-color:#f2b8b8;background:#fff6f6}
.fhead{display:flex;align-items:center;gap:10px;margin-bottom:6px}.label{font-weight:650;color:var(--ink)}
.pill{font-size:11.5px;font-weight:700;border-radius:999px;padding:1px 9px;background:var(--soft);color:var(--muted)}.pill.req{background:#ffecec;color:var(--err)}
input[type=text],input[type=date]{display:block;width:100%;padding:11px 13px;border:1px solid var(--line);border-radius:10px;font:inherit;background:#fff;color:var(--ink)}
.opts{display:flex;flex-wrap:wrap;gap:8px}.opt{display:flex;align-items:center;gap:8px;border:1px solid var(--line);background:#fff;border-radius:10px;padding:8px 12px;cursor:pointer}
.opt:has(input:checked){border-color:var(--primary);background:var(--primary-soft);color:var(--primary);font-weight:600}
.hint{font-size:12.5px;color:var(--muted);margin-top:6px}.err{color:var(--err);font-size:13.5px;font-weight:600}
.submitbar{position:fixed;left:0;right:0;bottom:0;z-index:10;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border-top:1px solid var(--line)}
.submitbar .in{max-width:1240px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:14px}.submitbar .msg{flex:1;color:var(--muted);font-size:14px}
.done{display:none;border-color:#bfe8d6;background:#f1fbf6}.done h2{color:var(--ok)}
@media (max-width:980px){.layout{grid-template-columns:1fr}nav.toc{position:static;max-height:none}.prog{display:none}}
@media (max-width:640px){.brand span,.sep{display:none}.top .in{gap:10px}}
@media print{header.top,.submitbar,nav.toc{display:none}.layout{display:block;padding:0}body{background:#fff}.card{break-inside:avoid;border-color:#ccc}}
</style></head>
<body>
<header class="top"><div class="in">
  <div class="brand" aria-label="Anduin Legal Reviewer"><b>Anduin</b><span>Legal Reviewer</span></div>
  <div class="sep"></div>
  <div class="doc"><div class="name">${esc(meta.documentTitle)}</div><div class="ver">Investor form · version ${meta.versionNo}</div></div>
  <div class="prog" aria-live="polite"><div class="lbl"><span>Required answers</span><b id="pcount">0/0</b></div><div class="bar"><i id="pbar"></i></div></div>
  <button class="btn" type="button" id="next">Next field to fill ↓</button>
</div></header>
<div class="layout">
  <nav class="toc" aria-label="Contents">
    <h3>Contents</h3>
    <label class="switch"><input type="checkbox" id="only"> Only sections to fill</label>
    <div class="list">${toc}</div>
  </nav>
  <main>
    <section class="card intro"><h1>${esc(meta.documentTitle)}</h1><p>Read the agreement and complete the fields highlighted in blue. Required fields are marked. Use “Next field to fill” to jump between them; when you submit, an answers file is saved to your computer to send back to the person who shared this form.</p></section>
    <form id="f" novalidate>
${sections.map((s) => s.html).join('\n')}
    </form>
    <section class="card done" id="done"><h2>Thank you, your answers are saved</h2><p>The file <b id="fname"></b> was downloaded. Send it back to the person who shared this form. You can also print this page or save it as PDF.</p><button class="btn ghost" type="button" onclick="window.print()">Print or save as PDF</button></section>
  </main>
</div>
<div class="submitbar"><div class="in"><span class="msg" id="status">Your answers stay on this computer until you submit.</span><button class="btn" type="submit" form="f">Submit answers</button></div></div>
<script>
(function(){
  var VERSION=${JSON.stringify(meta.versionId)}, FORMAT=${JSON.stringify(ANSWERS_FORMAT)};
  var f=document.getElementById('f'), boxes=[].slice.call(document.querySelectorAll('.field'));
  function value(box){var t=box.getAttribute('data-type');
    if(t==='checkbox'){var v=[];box.querySelectorAll('input:checked').forEach(function(i){v.push(i.value)});return v;}
    if(t==='radio'){var c=box.querySelector('input:checked');return c?c.value:'';}
    return box.querySelector('input').value.trim();}
  function empty(v){return Array.isArray(v)?!v.length:!v;}
  function progress(){
    var req=boxes.filter(function(b){return b.hasAttribute('data-required')}), done=req.filter(function(b){return !empty(value(b))}).length;
    document.getElementById('pcount').textContent=done+'/'+req.length;
    document.getElementById('pbar').style.transform='scaleX('+(req.length?done/req.length:1)+')';
    boxes.forEach(function(b){b.classList.toggle('filled',!empty(value(b)))});
    document.querySelectorAll('section.has-fields').forEach(function(s){
      var all=[].slice.call(s.querySelectorAll('.field')).every(function(b){return !b.hasAttribute('data-required')||!empty(value(b))});
      var link=document.querySelector('.toc a[data-target="'+s.id+'"]');if(link)link.classList.toggle('done',all);});
  }
  f.addEventListener('input',progress);f.addEventListener('change',progress);progress();
  document.getElementById('next').addEventListener('click',function(){
    var target=boxes.filter(function(b){return b.hasAttribute('data-required')&&empty(value(b))})[0]||boxes.filter(function(b){return empty(value(b))})[0];
    if(!target){document.getElementById('status').textContent='Every field has an answer. Review, then submit.';return;}
    target.scrollIntoView({behavior:'smooth',block:'center'});var i=target.querySelector('input');if(i)setTimeout(function(){i.focus({preventScroll:true})},350);
  });
  document.getElementById('only').addEventListener('change',function(e){document.body.classList.toggle('only-fill',e.target.checked)});
  if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){
    document.querySelectorAll('.toc a.on').forEach(function(a){a.classList.remove('on')});
    var a=document.querySelector('.toc a[data-target="'+en.target.id+'"]');if(a){a.classList.add('on');a.scrollIntoView({block:'nearest'});}}})},{rootMargin:'-30% 0px -60% 0px'});
    document.querySelectorAll('main section.card[id]').forEach(function(s){io.observe(s)});}
  f.addEventListener('submit',function(e){
    e.preventDefault();var answers={},bad=null;
    boxes.forEach(function(box){var v=value(box),err=box.querySelector('.err');
      if(box.hasAttribute('data-required')&&empty(v)){box.classList.add('bad');err.textContent='Required';bad=bad||box;}
      else{box.classList.remove('bad');err.textContent='';}
      if(!empty(v))answers[box.getAttribute('data-field')]=v;});
    if(bad){document.getElementById('status').textContent='Please complete the required fields.';document.body.classList.remove('only-fill');document.getElementById('only').checked=false;bad.scrollIntoView({behavior:'smooth',block:'center'});return;}
    var name='answers-'+VERSION.slice(0,8)+'.json';
    var blob=new Blob([JSON.stringify({format:FORMAT,version_id:VERSION,submitted_at:new Date().toISOString(),answers:answers},null,2)],{type:'application/json'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();
    document.getElementById('fname').textContent=name;document.getElementById('done').style.display='block';
    document.getElementById('status').textContent='Saved '+name+'. Send this file back.';document.getElementById('done').scrollIntoView({behavior:'smooth'});
  });
})();
</script>
</body></html>`;
}

/** Reads an answers file from the exported form; only answers for fields of this form version are kept. */
export function parseAnswersFile(text: string, versionId: string, fields: AnnotationRow[]) {
  const data = JSON.parse(text) as { format?: string; version_id?: string; answers?: Record<string, unknown> };
  if (data.format !== ANSWERS_FORMAT || !data.answers || typeof data.answers !== 'object') throw new Error('This is not an answers file from an exported form.');
  if (data.version_id !== versionId) throw new Error('These answers belong to a different form version.');
  const known = new Map(fields.map((f) => [f.field_id, f]));
  const answers: Record<string, string | string[]> = {};
  let skipped = 0;
  for (const [k, v] of Object.entries(data.answers)) {
    const f = known.get(k);
    if (!f) skipped++;
    else if (f.type === 'checkbox' && Array.isArray(v)) answers[k] = v.map(String).slice(0, 50);
    else if (typeof v === 'string') answers[k] = v.slice(0, 2000);
    else skipped++;
  }
  return { answers, skipped };
}
