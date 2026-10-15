import type { AnnotationRow } from '../lib/types';
import { isDateField, type FormSection } from './form';

/** Answers file written by the exported form and read back by Responses → Import answers. */
export const ANSWERS_FORMAT = 'anduin-form-answers/v1';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function control(a: AnnotationRow) {
  const id = esc(a.field_id);
  const req = a.required ? ' data-required="1"' : '';
  const label = `<span class="label">${esc(a.label)}${a.required ? ' <b class="req">*</b>' : ''}</span>`;
  if (a.type === 'radio' || a.type === 'checkbox') {
    const opts = a.options
      .map((o) => `<label class="opt"><input type="${a.type}" name="${id}" value="${esc(o.value)}"> ${esc(o.label)}</label>`)
      .join('');
    return `<fieldset class="field" data-field="${id}" data-type="${a.type}"${req}><legend>${label}</legend>${opts}<div class="err"></div></fieldset>`;
  }
  const type = isDateField(a.label) ? 'date' : 'text';
  return `<div class="field" data-field="${id}" data-type="text"${req}><label>${label}<input type="${type}" name="${id}" autocomplete="off"></label><div class="err"></div></div>`;
}

/**
 * A single self-contained HTML page: the full contract text in order with its fields, like the in-app form. No network
 * access, no external files. Submit checks required fields, then saves an answers file to import in Responses.
 * All contract text is escaped; the only script is the fixed one below.
 */
export function formHtml(form: { title: string; sections: FormSection[] }, meta: { documentTitle: string; versionNo: number; versionId: string }) {
  const body = form.sections
    .map((s) => {
      const items = s.items.map((it) => (it.kind === 'field' ? control(it.ann) : `<p>${esc(it.block.text)}</p>`)).join('\n');
      return `<section><h2>${esc(s.title)}</h2>\n${items}</section>`;
    })
    .join('\n');
  const title = `${meta.documentTitle} · form v${meta.versionNo}`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{--ink:#14223b;--muted:#5d6b82;--line:#d7e0ec;--primary:#0068fe;--bg:#eef3f9;--err:#c62828}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Arial,sans-serif}
main{max-width:820px;margin:32px auto;padding:0 16px}header,section,.done{background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px 26px;margin-bottom:16px}
h1{font-size:26px;margin:0 0 4px}h2{font-size:19px;margin:0 0 10px}.muted{color:var(--muted);font-size:14px}p{margin:8px 0;color:#2b3950}
.field{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:12px 0;background:#f8fbff}fieldset.field{min-width:0}
.label{font-weight:600}.req{color:var(--err)}input[type=text],input[type=date]{display:block;width:100%;margin-top:6px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font:inherit}
.opt{display:block;margin:4px 0}.err{color:var(--err);font-size:14px}.bad{border-color:var(--err);background:#fff6f6}
button{font:inherit;font-weight:600;border:0;border-radius:999px;padding:12px 26px;background:var(--primary);color:#fff;cursor:pointer}
.bar{position:sticky;bottom:0;background:linear-gradient(transparent,var(--bg) 40%);padding:18px 0;display:flex;gap:12px;align-items:center}
.done{display:none}@media print{.bar{display:none}body{background:#fff}}
</style></head>
<body><main>
<header><h1>${esc(meta.documentTitle)}</h1><div class="muted">Form version ${meta.versionNo}. Fill in the fields marked in blue; * means required. When you submit, an answers file is saved to your computer: send it back to the person who shared this form.</div></header>
<form id="f" novalidate>
${body}
<div class="bar"><button type="submit">Submit answers</button><span class="muted" id="status"></span></div>
</form>
<div class="done" id="done"><h2>Thank you, your answers are saved</h2><p>The file <b id="fname"></b> was downloaded. Send it back to the person who shared this form. You can also print this page or save it as PDF.</p></div>
</main>
<script>
(function(){
  var VERSION=${JSON.stringify(meta.versionId)}, FORMAT=${JSON.stringify(ANSWERS_FORMAT)};
  var f=document.getElementById('f');
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var answers={}, bad=null;
    document.querySelectorAll('.field').forEach(function(box){
      var id=box.getAttribute('data-field'), type=box.getAttribute('data-type'), v;
      if(type==='checkbox'){v=[];box.querySelectorAll('input:checked').forEach(function(i){v.push(i.value)});}
      else if(type==='radio'){var c=box.querySelector('input:checked');v=c?c.value:'';}
      else{v=box.querySelector('input').value.trim();}
      var empty=Array.isArray(v)?!v.length:!v;
      var err=box.querySelector('.err');
      if(box.hasAttribute('data-required')&&empty){box.classList.add('bad');err.textContent='Required';bad=bad||box;}
      else{box.classList.remove('bad');err.textContent='';}
      if(!empty)answers[id]=v;
    });
    if(bad){document.getElementById('status').textContent='Please complete the required fields.';bad.scrollIntoView({behavior:'smooth',block:'center'});return;}
    var name='answers-'+VERSION.slice(0,8)+'.json';
    var blob=new Blob([JSON.stringify({format:FORMAT,version_id:VERSION,submitted_at:new Date().toISOString(),answers:answers},null,2)],{type:'application/json'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();
    document.getElementById('fname').textContent=name;document.getElementById('done').style.display='block';
    document.getElementById('status').textContent='Saved '+name;document.getElementById('done').scrollIntoView({behavior:'smooth'});
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
