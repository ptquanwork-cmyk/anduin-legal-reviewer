'use client';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleHelp, Eye, Loader2, Lock, Search, SlidersHorizontal, ExternalLink, ZoomIn, CirclePlus } from 'lucide-react';
import { buildForm, isDateField, type FormSection } from '../../digitize/form';
import { useNav } from '../../lib/nav';
import { api } from '../../lib/supabase';
import type { AnnotationRow } from '../../lib/types';
import { useWorkspace } from '../../lib/workspace';
import { PdfPage, usePdf } from '../pdf/PdfViewer';
import { StageStrip } from '../shell/Chrome';
import { Modal } from '../ui';
import { Empty, Fade, HeaderArt, Panel } from './Screen';

export function FormPreview() {
  const nav = useNav();
  const ws = useWorkspace();
  const { doc } = usePdf('sources', ws.version?.pdf_path);
  const form = useMemo(() => buildForm(ws.blocks, ws.annotations), [ws.blocks, ws.annotations]);
  const [selRef, setSelRef] = useState<string | null>(null);
  const [help, setHelp] = useState<{ open: boolean; text: string | null; loading: boolean; error: string | null }>({ open: false, text: null, loading: false, error: null });
  const [modal, setModal] = useState<'coverage' | 'full' | 'conditional' | null>(null);
  const [page, setPage] = useState(1);

  const sel = form.sections.find((s) => s.ref === selRef) ?? form.sections.find((s) => s.items.some((i) => i.kind === 'field')) ?? form.sections[0];
  useEffect(() => {
    setHelp({ open: false, text: null, loading: false, error: null });
    if (sel?.page) setPage(sel.page);
  }, [sel?.ref]); // eslint-disable-line react-hooks/exhaustive-deps

  const approved = !!ws.version?.annotations_approved_at;
  const coverageOk = form.unmapped.length === 0;
  const canEnable = approved && coverageOk;

  const loadHelp = async () => {
    if (!ws.version || !sel) return;
    if (help.open) return setHelp((h) => ({ ...h, open: false }));
    setHelp({ open: true, text: null, loading: true, error: null });
    try {
      const r = await api<{ text: string }>(`/api/versions/${ws.version.id}/help`, { sectionRef: sel.ref });
      setHelp({ open: true, text: r.text, loading: false, error: null });
    } catch (e) {
      setHelp({ open: true, text: null, loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  };

  const highlights = (sel?.items ?? []).flatMap((i) => {
    const b = i.kind === 'field' ? i.ann : i.block;
    const bbox = i.kind === 'field' ? i.ann.bbox : i.block.bbox;
    const p = i.kind === 'field' ? i.ann.page : i.block.page;
    return bbox && p ? [{ id: `${b.id}`, page: p, bbox, tone: 'info' as const }] : [];
  });

  return (
    <>
      <StageStrip x={140} y={155} w={1340} />
      <Panel i={0} x={138} y={215} w={285} h={640} className="flex flex-col px-3 py-5">
        <h2 className="px-3 text-[22px] font-semibold" style={{ color: 'var(--ink)' }}>
          Form sections
        </h2>
        <div className="scroll-thin mt-3 flex-1 overflow-auto">
          {!form.sections.length && <Empty title="No form yet" detail="Annotate the document first." />}
          {form.sections.map((s, i) => {
            const on = s.ref === sel?.ref;
            const unm = s.items.some((it) => it.kind === 'paragraph' && !it.mapped);
            return (
              <button key={s.ref} onClick={() => setSelRef(s.ref)} className="relative flex w-full items-center gap-4 border-b px-3 py-3 text-left text-[15.5px]" style={{ borderColor: 'var(--panel-border)', background: on ? 'var(--selected)' : undefined, color: on ? 'var(--primary)' : 'var(--ink)' }}>
                {on && <span className="absolute left-0 top-1 h-[calc(100%-8px)] w-[3px] rounded-full" style={{ background: 'var(--primary)' }} />}
                <span className="grid h-8 w-9 shrink-0 place-items-center rounded-lg text-[13.5px]" style={{ background: 'var(--panel-2)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="truncate">{s.title}</span>
                {unm && <CircleAlert size={15} className="ml-auto shrink-0" style={{ color: 'var(--warn-dot)' }} />}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel i={1} x={433} y={215} w={640} h={640} className="flex flex-col overflow-hidden">
        <div className="relative h-[160px] shrink-0">
          <HeaderArt id="form" x={17} y={5} w={140} h={150} />
          <h1 className="absolute left-[174px] top-[22px] font-display text-[44px] font-extrabold tracking-[-0.03em]" style={{ color: 'var(--ink)' }}>
            Form preview
          </h1>
          <p className="absolute left-[174px] top-[78px] text-[19px]" style={{ color: 'var(--muted)' }}>
            {ws.document?.title ?? 'No document'} · v{ws.version?.version_no ?? '–'}
          </p>
          <div className="absolute left-[174px] top-[104px] flex h-[40px] w-[445px] items-center gap-2 rounded-xl px-3 text-[13px]" style={{ background: 'var(--warn-bg)', color: 'var(--warn-ink)' }}>
            <CircleAlert size={18} /> <b>Preview only</b> <span style={{ color: 'var(--ink)' }}>Controls are read-only here; answers are entered in Responses.</span>
          </div>
        </div>
        <div className="scroll-thin flex-1 overflow-auto px-7 pb-6">
          {!sel ? (
            <Empty title="Nothing to preview" detail="Approved annotations produce the form." />
          ) : (
            <>
              <div className="flex items-center justify-between pt-1">
                <h2 className="text-[23px] font-semibold" style={{ color: 'var(--ink)' }}>
                  {sel.title}
                </h2>
                <button onClick={loadHelp} className="flex h-[50px] w-[205px] items-center gap-2 rounded-2xl px-3 text-left" style={{ background: 'var(--selected)' }} aria-expanded={help.open}>
                  <CircleHelp size={22} fill="var(--primary)" color="var(--panel)" />
                  <span className="flex-1 leading-tight">
                    <span className="block text-[13px] font-medium" style={{ color: 'var(--primary)' }}>
                      Plain-language help
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                      Separate from contract text
                    </span>
                  </span>
                  <ChevronDown size={16} />
                </button>
              </div>
              {help.open && (
                <div className="mt-3 rounded-2xl border border-dashed px-4 py-3 text-[14px]" style={{ borderColor: 'var(--primary)', background: 'var(--selected)' }}>
                  <div className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--primary)' }}>
                    Explanation — not contract text
                  </div>
                  {help.loading ? <Loader2 size={18} className="animate-spin" /> : help.error ? <span style={{ color: 'var(--error-ink)' }}>{help.error}</span> : help.text}
                </div>
              )}
              <SectionBody section={sel} />
            </>
          )}
        </div>
      </Panel>

      <Panel i={2} x={1087} y={215} w={405} h={640} className="flex flex-col p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-semibold" style={{ color: 'var(--ink)' }}>
            Source document
          </h2>
          <button className="flex h-[44px] items-center gap-2 rounded-full px-5 text-[15px]" style={{ background: 'var(--selected)', color: 'var(--primary)' }} onClick={() => setModal('full')}>
            Open source <ExternalLink size={18} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[14px]">
          <button className="pill grid h-9 w-9 place-items-center" onClick={() => setPage(Math.max(1, page - 1))} aria-label="Previous page">
            <ChevronLeft size={16} />
          </button>
          <button className="pill grid h-9 w-9 place-items-center" onClick={() => setPage(Math.min(doc?.numPages ?? 1, page + 1))} aria-label="Next page">
            <ChevronRight size={16} />
          </button>
          <span className="rounded-lg border px-4 py-1.5" style={{ borderColor: 'var(--panel-border)' }}>
            Page {page}
          </span>
          <span>of {doc?.numPages ?? '–'}</span>
          <span className="ml-auto flex gap-3">
            <Search size={18} />
            <ZoomIn size={18} />
            <CirclePlus size={18} />
          </span>
        </div>
        <div className="scroll-thin mt-3 flex-1 overflow-auto rounded-xl p-2" style={{ background: 'var(--panel-2)' }}>
          {doc ? <PdfPage doc={doc} page={page} width={345} highlights={highlights} /> : <Empty title="No source PDF" detail="Converted PDF needed." />}
        </div>
      </Panel>

      <Fade i={3} x={140} y={866} w={1350} h={90}>
        <div className="panel flex h-full items-center gap-4 px-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: coverageOk ? 'var(--info-bg)' : 'var(--warn-bg)' }}>
            <CircleAlert size={26} style={{ color: coverageOk ? 'var(--mint-dark)' : 'var(--warn-dot)' }} />
          </span>
          <div className="w-[340px]">
            <div className="text-[16px] font-semibold" style={{ color: coverageOk ? 'var(--info-ink)' : '#d4380d' }}>
              {coverageOk ? 'Every source block is represented' : `${form.unmapped.length} source block${form.unmapped.length > 1 ? 's' : ''} unmapped`}
            </div>
            <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
              {coverageOk ? (approved ? 'Annotations approved for this version.' : 'Approve annotations to enable responses.') : 'Review and map all source text before enabling responses.'}
            </div>
          </div>
          <button className="btn-outline flex h-[48px] w-[178px] items-center justify-center gap-2 text-[16px]" onClick={() => setModal('coverage')}>
            <Search size={19} /> Inspect coverage
          </button>
          <button className="btn-primary flex h-[56px] w-[232px] flex-col items-center justify-center text-[15px] leading-tight" disabled={!canEnable} onClick={() => nav.go('responses')}>
            <span className="flex items-center gap-2">{!canEnable && <Lock size={17} />} Enable responses</span>
            {!canEnable && <span className="text-[12px]">{coverageOk ? 'Approve annotations first' : 'Complete mapping to continue'}</span>}
          </button>
          <span className="mx-1 h-10 w-px" style={{ background: 'var(--panel-border)' }} />
          <button className="pill flex h-[44px] items-center gap-2 px-5 text-[14.5px] font-medium" style={{ color: 'var(--primary)' }} onClick={() => setModal('full')}>
            <Eye size={18} /> Show full original text
          </button>
          <button className="pill flex h-[44px] items-center gap-2 px-5 text-[14.5px] font-medium" style={{ color: 'var(--primary)' }} onClick={() => setModal('conditional')}>
            <SlidersHorizontal size={18} /> Preview conditional sections
          </button>
        </div>
      </Fade>

      <Modal open={modal === 'coverage'} onClose={() => setModal(null)} title="Source-to-form coverage" width={680}>
        <p className="mb-3 text-[14px]" style={{ color: 'var(--muted)' }}>
          {ws.blocks.filter((b) => b.kind !== 'header' && b.kind !== 'footer').length} source blocks · {form.fields.length} input fields · {form.unmapped.length} unmapped
        </p>
        {form.unmapped.map((b) => (
          <div key={b.id} className="mb-2 rounded-xl border px-3 py-2 text-[14px]" style={{ borderColor: 'var(--warn-dot)' }}>
            Page {b.page ?? '–'} · {b.text}
          </div>
        ))}
        {form.unmapped.length > 0 && (
          <button className="btn-primary mt-2 h-10 px-5" onClick={() => nav.go('annotation')}>
            Map in Annotation
          </button>
        )}
      </Modal>
      <Modal open={modal === 'full'} onClose={() => setModal(null)} title="Full original text" width={820}>
        <div className="paper rounded-xl px-8 py-6 font-[family-name:var(--font-paper)] text-[15px] leading-relaxed">
          {ws.blocks.map((b) => (
            <p key={b.id} className={b.kind === 'heading' || b.kind === 'title' ? 'mt-4 font-bold' : 'mt-2'}>
              {b.text}
            </p>
          ))}
        </div>
      </Modal>
      <Modal open={modal === 'conditional'} onClose={() => setModal(null)} title="Conditional sections">
        <p className="text-[14px]" style={{ color: 'var(--muted)' }}>
          No conditional visibility or requirement rules have been approved for this form, so every section is always shown. Rules can only come from the contract or from rules a responsible reviewer approves; the full original text stays accessible either way.
        </p>
      </Modal>
    </>
  );
}

function SectionBody({ section }: { section: FormSection }) {
  return (
    <div className="mt-4 space-y-4">
      {section.items.map((it, i) =>
        it.kind === 'paragraph' ? (
          <p key={i} className="rounded-xl px-1 text-[15.5px] leading-[23px]" style={{ color: 'var(--ink)', outline: it.mapped ? undefined : '2px dashed var(--warn-dot)', outlineOffset: 4 }}>
            {it.block.text}
          </p>
        ) : (
          <Control key={i} ann={it.ann} />
        ),
      )}
    </div>
  );
}

export function Control({ ann, value, onChange, error }: { ann: AnnotationRow; value?: string | string[]; onChange?: (v: string | string[]) => void; error?: string }) {
  const ro = !onChange;
  const input = 'h-[44px] w-full rounded-xl border px-4 text-[15.5px] outline-none focus:border-[var(--primary)]';
  return (
    <div>
      <div className="mb-1.5 text-[16px] font-semibold" style={{ color: 'var(--ink)' }}>
        {ann.label}
        {ann.required && <span className="ml-1" style={{ color: 'var(--error-ink)' }}>*</span>}
      </div>
      {ann.type === 'text_box' && (
        <input
          type={isDateField(ann.label) ? 'date' : 'text'}
          readOnly={ro}
          value={(value as string) ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={ro ? `Enter ${ann.label.toLowerCase()}` : ''}
          className={input}
          style={{ borderColor: error ? '#e5383b' : 'var(--panel-border)', background: 'var(--panel)', color: 'var(--ink)' }}
          aria-invalid={!!error}
        />
      )}
      {(ann.type === 'radio' || ann.type === 'checkbox') && (
        <div className="flex flex-wrap gap-x-10 gap-y-2">
          {ann.options.map((o) => {
            const checked = ann.type === 'radio' ? value === o.value : Array.isArray(value) && value.includes(o.value);
            return (
              <label key={o.value} className="flex cursor-pointer items-center gap-3 text-[15.5px]" style={{ color: 'var(--ink)' }}>
                <input
                  type={ann.type}
                  name={ann.field_id}
                  disabled={ro}
                  checked={checked}
                  onChange={() => {
                    if (!onChange) return;
                    if (ann.type === 'radio') onChange(o.value);
                    else {
                      const cur = Array.isArray(value) ? value : [];
                      onChange(checked ? cur.filter((x) => x !== o.value) : [...cur, o.value]);
                    }
                  }}
                  className="h-6 w-6 accent-[var(--primary)]"
                />
                {o.label}
              </label>
            );
          })}
        </div>
      )}
      {error && (
        <div className="mt-1.5 flex items-center gap-2 text-[14px]" style={{ color: '#e5383b' }}>
          <CircleAlert size={18} fill="#e5383b" color="#fff" /> {error}
        </div>
      )}
    </div>
  );
}
