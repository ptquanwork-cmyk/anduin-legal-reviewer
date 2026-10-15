'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp, CircleAlert, CircleCheck, ExternalLink, FileText, Info, Loader2, Upload } from 'lucide-react';
import { buildForm, validateAnswers } from '../../digitize/form';
import { parseAnswersFile } from '../../digitize/htmlForm';
import { useNav } from '../../lib/nav';
import { api, supabase } from '../../lib/supabase';
import { useWorkspace } from '../../lib/workspace';
import { PdfPage, usePdf } from '../pdf/PdfViewer';
import { StageStrip } from '../shell/Chrome';
import { Modal } from '../ui';
import { Control } from './FormPreview';
import { Empty, Fade, HeaderArt, Panel, Title } from './Screen';

type Answers = Record<string, string | string[]>;

export function Responses() {
  const nav = useNav();
  const ws = useWorkspace();
  const { doc } = usePdf('sources', ws.version?.pdf_path);
  const form = useMemo(() => buildForm(ws.blocks, ws.annotations), [ws.blocks, ws.annotations]);
  const [answers, setAnswers] = useState<Answers>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const [creating, setCreating] = useState(false);
  const [missingOpen, setMissingOpen] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  // Answers file from the exported HTML form: only fields of this exact form version are taken.
  const importAnswers = async (file: File) => {
    if (!ws.version) return;
    try {
      const { answers: got, skipped } = parseAnswersFile(await file.text(), ws.version.id, form.fields);
      const next = { ...answers, ...got };
      setAnswers(next);
      setTouched(true);
      await save(next);
      nav.notify(`${Object.keys(got).length} answer(s) imported${skipped ? `, ${skipped} ignored (not in this form)` : ''}. Review them before creating the draft PDF.`);
    } catch (e) {
      nav.notify(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  useEffect(() => {
    setAnswers((ws.submission?.answers as Answers) ?? {});
    setSavedAt(ws.submission?.updated_at ?? null);
  }, [ws.submission?.id, ws.version?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (next: Answers, status: 'draft' | 'confirmed' = 'draft') => {
    if (!ws.version) return;
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase().from('submissions').upsert({ version_id: ws.version.id, answers: next, status, updated_at: now }, { onConflict: 'owner,version_id' });
    setSaving(false);
    if (error) nav.notify(error.message, 'error');
    else setSavedAt(now);
  };

  const change = (fid: string, v: string | string[]) => {
    const next = { ...answers, [fid]: v };
    setAnswers(next);
    setTouched(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(next), 800);
  };

  const problems = validateAnswers(form.fields, answers);
  const enabled = !!ws.version?.annotations_approved_at && form.unmapped.length === 0;
  const fieldSection = form.sections.find((s) => s.items.some((i) => i.kind === 'field'));
  const context = fieldSection?.items.find((i) => i.kind === 'paragraph');
  const focusAnn = form.fields.find((f) => f.field_id === focus) ?? form.fields[0];

  const createDraft = async () => {
    if (!ws.version) return;
    setCreating(true);
    try {
      if (timer.current) clearTimeout(timer.current);
      await save(answers);
      await api(`/api/versions/${ws.version.id}/fill`, {});
      await ws.reload();
      nav.go('export');
    } catch (e) {
      nav.notify(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <HeaderArt id="responses" x={176} y={148} w={210} h={156} />
      <Title x={424} y={176} size={56}>
        Responses
      </Title>
      <Fade x={424} y={238} w={700}>
        <p className="flex items-center gap-4 text-[26px]" style={{ color: 'var(--navy)' }}>
          {ws.document?.title ?? 'No document'} · v{ws.version?.version_no ?? '–'}
          <span className="chip h-8 px-4 text-[16px]" style={{ background: 'var(--selected)', color: 'var(--navy)' }}>
            {saving ? 'Saving…' : savedAt ? `Draft · saved ${new Date(savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Draft · not saved yet'}
          </span>
        </p>
      </Fade>
      <StageStrip x={142} y={304} w={1350} />

      <Panel i={0} x={140} y={377} w={868} h={500} className="flex flex-col px-7 py-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[26px] font-semibold" style={{ color: 'var(--ink)' }}>
            Fill and review
          </h2>
          <div className="flex gap-2">
            <button className="pill flex h-[44px] items-center gap-2 px-5 text-[16px] font-medium" disabled={!enabled} onClick={() => importInput.current?.click()} title="Load the answers file saved by the exported HTML form">
              <Upload size={18} /> Import answers
            </button>
            <input ref={importInput} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importAnswers(f); }} />
            <button className="pill flex h-[44px] items-center gap-2 px-5 text-[16px] font-medium" onClick={() => nav.go('form')}>
              Show full contract <ExternalLink size={18} />
            </button>
          </div>
        </div>
        {!enabled ? (
          <Empty title="Responses are not enabled yet" detail="Approve annotations and complete source mapping in Form preview first." action={<button className="btn-primary mt-3 h-10 px-5" onClick={() => nav.go('form')}>Open form preview</button>} />
        ) : !form.fields.length ? (
          <Empty title="No input fields" detail="This form has only readable content; nothing to fill in." />
        ) : (
          <div className="scroll-thin mt-4 flex-1 overflow-auto pr-2">
            {context && context.kind === 'paragraph' && (
              <p className="rounded-2xl px-5 py-3 text-[17px] leading-[24px]" style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>
                {context.block.text}
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-6">
              {form.fields.map((f) => (
                <div key={f.id} className={f.type === 'text_box' && !/date|ngày/i.test(f.label) && form.fields.indexOf(f) === 0 ? 'col-span-2' : ''} onFocus={() => setFocus(f.field_id)} onClick={() => setFocus(f.field_id)}>
                  <Control ann={f} value={answers[f.field_id]} onChange={(v) => change(f.field_id, v)} error={touched || answers[f.field_id] !== undefined || savedAt ? problems.find((p) => p.field_id === f.field_id)?.problem : undefined} />
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>

      <Panel i={1} x={1022} y={390} w={470} h={problems.length ? (missingOpen ? 135 : 72) : 72} className="overflow-hidden px-5 py-4" style={problems.length ? { background: 'var(--error-bg)', borderColor: 'var(--error-line)' } : { background: 'var(--info-bg)' }}>
        <button className="flex w-full items-center gap-3 text-left" onClick={() => setMissingOpen((o) => !o)} aria-expanded={missingOpen}>
          {problems.length ? <CircleAlert size={30} fill="#e5383b" color="#fff" /> : <CircleCheck size={30} style={{ color: 'var(--mint-dark)' }} />}
          <span className="flex-1 text-[20px] font-semibold" style={{ color: 'var(--ink)' }}>
            {problems.length ? `${problems.length === 1 ? 'One' : problems.length} required answer${problems.length > 1 ? 's' : ''} missing` : 'All required answers present'}
          </span>
          {problems.length > 0 && (missingOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />)}
        </button>
        {missingOpen && problems.length > 0 && (
          <div className="scroll-thin mt-2 max-h-[60px] overflow-auto pl-1">
            {problems.map((p) => (
              <button key={p.field_id} className="flex w-full items-start gap-3 text-left" onClick={() => setFocus(p.field_id)}>
                <CalendarDays size={24} style={{ color: 'var(--primary)' }} />
                <span>
                  <span className="block text-[16px] font-medium" style={{ color: 'var(--ink)' }}>
                    {p.label}
                  </span>
                  <span className="text-[13.5px]" style={{ color: 'var(--muted)' }}>
                    {p.problem === 'Required' ? `Please provide the ${p.label.toLowerCase()} to continue.` : p.problem}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </Panel>

      <Panel i={2} x={1022} y={545} w={470} h={330} className="flex flex-col px-5 py-4">
        <h2 className="flex items-center gap-3 text-[20px] font-semibold" style={{ color: 'var(--ink)' }}>
          <FileText size={24} /> Source in contract
        </h2>
        <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-2xl border p-3" style={{ borderColor: 'var(--panel-border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[17px] font-medium" style={{ color: 'var(--ink)' }}>
              Page {focusAnn?.page ?? '–'} · {ws.blocks.find((b) => b.idx === focusAnn?.source_block_idx)?.section_title ?? 'Source'}
            </span>
            <button className="flex items-center gap-2 rounded-full px-4 py-1.5 text-[14.5px]" style={{ background: 'var(--selected)', color: 'var(--primary)' }} onClick={() => nav.go('form')}>
              Open source <ExternalLink size={16} />
            </button>
          </div>
          <div className="scroll-thin mt-2 min-h-0 flex-1 overflow-auto rounded-xl" style={{ background: 'var(--panel-2)' }}>
            {doc && focusAnn ? <SourceCrop doc={doc} page={focusAnn.page} y={focusAnn.bbox.y} highlights={[{ id: 'f', page: focusAnn.page, bbox: focusAnn.bbox, tone: 'warn' as const }]} /> : <Empty title="No source" detail="Select a field." />}
          </div>
        </div>
      </Panel>

      <Fade i={3} x={140} y={890} w={1352} h={62}>
        <div className="flex h-full items-center gap-3 px-6">
          <Info size={26} fill="var(--navy)" color="var(--panel)" />
          <span className="flex-1 text-[15px]" style={{ color: 'var(--ink)' }}>
            Answers belong to form v{ws.version?.version_no ?? '–'} · Template changes require revalidation.
          </span>
          <button className="btn-outline h-[48px] w-[186px] text-[18px]" onClick={() => save(answers)} disabled={!enabled}>
            {saving ? <Loader2 className="mx-auto animate-spin" size={20} /> : 'Save draft'}
          </button>
          <button className="btn-primary h-[48px] w-[174px] text-[18px]" onClick={() => setReview(true)} disabled={!enabled}>
            Review answers
          </button>
          <button className="btn-primary flex h-[48px] w-[238px] items-center justify-center gap-2 text-[17px]" disabled={!enabled || problems.length > 0 || creating} onClick={createDraft}>
            {creating ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />} Create draft PDF
          </button>
        </div>
      </Fade>

      <Modal open={review} onClose={() => setReview(false)} title="Review answers" width={640}>
        <table className="w-full text-[14.5px]">
          <tbody>
            {form.fields.map((f) => {
              const v = answers[f.field_id];
              const p = problems.find((x) => x.field_id === f.field_id);
              const shown = Array.isArray(v) ? f.options.filter((o) => v.includes(o.value)).map((o) => o.label).join(', ') : f.type === 'radio' ? f.options.find((o) => o.value === v)?.label : v;
              return (
                <tr key={f.id} className="border-b" style={{ borderColor: 'var(--panel-border)' }}>
                  <td className="py-2 pr-4 font-medium">{f.label}</td>
                  <td className="py-2" style={{ color: p ? '#e5383b' : 'var(--ink)' }}>
                    {shown || '—'} {p && `(${p.problem})`}
                  </td>
                  <td className="py-2 text-right text-[12px]" style={{ color: 'var(--muted)' }}>
                    {f.field_id}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-4 flex justify-end gap-3">
          <button className="btn-outline h-10 px-5" onClick={() => setReview(false)}>
            Keep editing
          </button>
          <button
            className="btn-primary h-10 px-5"
            disabled={problems.length > 0}
            onClick={async () => {
              await save(answers, 'confirmed');
              setReview(false);
              nav.notify('Answers confirmed for this form version. Create the draft PDF to run QA.');
            }}
          >
            Confirm answers
          </button>
        </div>
      </Modal>
    </>
  );
}

function SourceCrop({ doc, page, y, highlights }: { doc: NonNullable<ReturnType<typeof usePdf>['doc']>; page: number; y: number; highlights: { id: string; page: number; bbox: { x: number; y: number; w: number; h: number }; tone: 'warn' }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ top: Math.max(0, y * (390 / 612) - 70), behavior: 'smooth' }), 300);
    return () => clearTimeout(t);
  }, [y]);
  return (
    <div ref={ref} className="scroll-thin h-full overflow-auto p-2">
      <PdfPage doc={doc} page={page} width={390} highlights={highlights} />
    </div>
  );
}
