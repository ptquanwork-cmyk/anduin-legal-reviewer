'use client';
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Download, FileText, Info, Loader2, Maximize, RotateCw, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { buildForm } from '../../digitize/form';
import { useNav } from '../../lib/nav';
import { api, signedUrl } from '../../lib/supabase';
import type { ExportRow, QaCheck } from '../../lib/types';
import { useWorkspace } from '../../lib/workspace';
import { PdfPage, usePdf } from '../pdf/PdfViewer';
import { StageStrip } from '../shell/Chrome';
import { Modal } from '../ui';
import { Control } from './FormPreview';
import { Empty, Fade, HeaderArt, Panel, Title } from './Screen';

type Tab = 'Source' | 'Form' | 'Answers' | 'Draft PDF';
const STATUS: Record<QaCheck['status'], { label: string; bg: string; ink: string }> = {
  pending: { label: 'Pending', bg: 'var(--warn-bg)', ink: 'var(--warn-ink)' },
  pass: { label: 'Passed', bg: 'var(--info-bg)', ink: 'var(--info-ink)' },
  needs_review: { label: 'Needs review', bg: 'var(--warn-bg)', ink: '#c2410c' },
  issue: { label: 'Issue found', bg: 'var(--error-bg)', ink: 'var(--error-ink)' },
};

export function PdfQaExport() {
  const nav = useNav();
  const ws = useWorkspace();
  const draft = ws.exports.find((e) => e.kind === 'draft');
  const final = ws.exports.find((e) => e.kind === 'final');
  const [tab, setTab] = useState<Tab>('Draft PDF');
  const [page, setPage] = useState(1);
  const [zoomPct, setZoomPct] = useState(100);
  const [busy, setBusy] = useState<'checks' | 'final' | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const draftPdf = usePdf('exports', draft?.file_path);
  const sourcePdf = usePdf('sources', ws.version?.pdf_path);
  const form = useMemo(() => buildForm(ws.blocks, ws.annotations), [ws.blocks, ws.annotations]);

  const stale = !!draft && !!ws.submission && (draft.qa as { submission_updated_at?: string }).submission_updated_at !== ws.submission.updated_at;
  const checks: QaCheck[] = draft?.qa.checks ?? [
    { key: 'content', label: 'Content coverage', status: 'pending' },
    { key: 'mapping', label: 'Field mapping', status: 'pending' },
    { key: 'values', label: 'Answer values', status: 'pending' },
    { key: 'render', label: 'Page render', status: 'pending' },
  ];
  const issues = draft?.qa.issues ?? [];
  const passed = !!draft && !stale && checks.every((c) => c.status === 'pass');
  const viewer = tab === 'Source' ? sourcePdf.doc : draftPdf.doc;
  const pages = viewer?.numPages ?? 1;
  const issueHl = issues
    .filter((i) => i.field_id)
    .map((i) => ws.annotations.find((a) => a.field_id === i.field_id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => ({ id: a.id, page: a.page, bbox: a.bbox, tone: 'error' as const }));

  const run = async () => {
    if (!ws.version) return;
    setBusy('checks');
    try {
      await api(`/api/versions/${ws.version.id}/fill`, {});
      await ws.reload();
    } catch (e) {
      nav.notify(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const exportFinal = async () => {
    if (!ws.version) return;
    setBusy('final');
    try {
      const row = await api<ExportRow>(`/api/versions/${ws.version.id}/fill`, { final: true, confirmed: true });
      await ws.reload();
      window.open(await signedUrl('exports', row.file_path), '_blank', 'noopener');
      setConfirmOpen(false);
    } catch (e) {
      nav.notify(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <HeaderArt id="export" x={140} y={143} w={196} h={154} />
      <Title x={355} y={156} size={44}>
        PDF QA / export
      </Title>
      <Fade x={357} y={206}>
        <p className="text-[22px]" style={{ color: 'var(--ink)' }}>
          Check before export.
        </p>
      </Fade>
      <StageStrip x={357} y={250} w={1135} />

      <Panel i={0} x={145} y={320} w={840} h={640} className="flex flex-col overflow-hidden">
        <div className="flex gap-2 px-6 pt-3" role="tablist">
          {(['Source', 'Form', 'Answers', 'Draft PDF'] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setPage(1); }} className="relative rounded-t-2xl px-6 py-2.5 text-[16px]" style={tab === t ? { background: 'var(--panel)', color: 'var(--primary)', fontWeight: 600 } : { color: 'var(--ink)' }}>
              {t}
              {tab === t && <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-full" style={{ background: 'var(--primary)' }} />}
            </button>
          ))}
        </div>
        <div className="flex min-h-0 flex-1 gap-3 p-3" style={{ background: 'var(--panel-2)' }}>
          {(tab === 'Draft PDF' || tab === 'Source') && (
            <>
              <div className="scroll-thin w-[130px] shrink-0 space-y-3 overflow-auto pr-1">
                {viewer &&
                  Array.from({ length: pages }, (_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)} className="relative block rounded-xl p-1" style={{ outline: page === i + 1 ? '2px solid var(--primary)' : undefined }}>
                      <PdfPage doc={viewer} page={i + 1} width={108} />
                      <span className="absolute bottom-2 left-2 grid h-6 w-6 place-items-center rounded-md text-[12px] font-semibold" style={page === i + 1 ? { background: 'var(--primary)', color: '#fff' } : { background: 'var(--panel)' }}>
                        {i + 1}
                      </span>
                    </button>
                  ))}
              </div>
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl" style={{ background: 'var(--panel)' }}>
                <div className="flex items-center gap-3 border-b px-4 py-2 text-[14px]" style={{ borderColor: 'var(--panel-border)' }}>
                  <button onClick={() => setPage(Math.max(1, page - 1))} aria-label="Previous page">
                    <ChevronLeft size={18} />
                  </button>
                  <span>
                    {page} / {pages}
                  </span>
                  <button onClick={() => setPage(Math.min(pages, page + 1))} aria-label="Next page">
                    <ChevronRight size={18} />
                  </button>
                  <span className="ml-2 flex items-center gap-2 rounded-lg border px-2 py-1" style={{ borderColor: 'var(--panel-border)' }}>
                    <Search size={16} /> {zoomPct}%
                  </span>
                  <span className="ml-auto flex gap-4">
                    <button onClick={() => setZoomPct(Math.max(60, zoomPct - 10))} aria-label="Zoom out">
                      <ZoomOut size={18} />
                    </button>
                    <button onClick={() => setZoomPct(Math.min(160, zoomPct + 10))} aria-label="Zoom in">
                      <ZoomIn size={18} />
                    </button>
                    <Maximize size={17} />
                  </span>
                </div>
                <div className="scroll-thin relative flex-1 overflow-auto p-4" style={{ background: 'var(--panel-2)' }}>
                  {viewer ? (
                    <div className="relative mx-auto" style={{ width: (590 * zoomPct) / 100 }}>
                      <PdfPage doc={viewer} page={page} width={(590 * zoomPct) / 100} highlights={tab === 'Draft PDF' ? issueHl : []} />
                      {tab === 'Draft PDF' && (
                        <span className="absolute right-4 top-4 rounded-full border px-3 py-1 text-[11.5px] font-semibold" style={{ borderColor: passed ? 'var(--mint-dark)' : '#e5383b', color: passed ? 'var(--info-ink)' : '#e5383b', background: passed ? 'var(--info-bg)' : 'var(--error-bg)' }}>
                          {passed ? 'DRAFT · QA PASSED' : 'DRAFT - NOT VERIFIED'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Empty title={tab === 'Draft PDF' ? 'No draft yet' : 'No source PDF'} detail={tab === 'Draft PDF' ? 'Create a draft PDF from Responses, or run checks.' : 'Convert the source first.'} action={tab === 'Draft PDF' ? <button className="btn-primary mt-3 h-10 px-5" onClick={() => nav.go('responses')}>Go to responses</button> : undefined} />
                  )}
                </div>
              </div>
            </>
          )}
          {tab === 'Form' && (
            <div className="scroll-thin flex-1 space-y-4 overflow-auto rounded-2xl p-5" style={{ background: 'var(--panel)' }}>
              {form.sections.map((s) => (
                <div key={s.ref}>
                  <h3 className="mb-2 text-[18px] font-semibold">{s.title}</h3>
                  {s.items.map((it, i) => (it.kind === 'field' ? <div key={i} className="mb-3"><Control ann={it.ann} value={ws.submission?.answers[it.ann.field_id]} /></div> : <p key={i} className="mb-2 text-[14.5px]">{it.block.text}</p>))}
                </div>
              ))}
            </div>
          )}
          {tab === 'Answers' && (
            <div className="scroll-thin flex-1 overflow-auto rounded-2xl p-5" style={{ background: 'var(--panel)' }}>
              <table className="w-full text-[14.5px]">
                <thead>
                  <tr className="text-left text-[12px] uppercase" style={{ color: 'var(--muted)' }}>
                    <th className="py-2">Field ID</th>
                    <th>Answer (snapshot used for the draft)</th>
                  </tr>
                </thead>
                <tbody>
                  {form.fields.map((f) => {
                    const v = (draft?.qa.answers_snapshot as Record<string, unknown> | undefined)?.[f.field_id] ?? ws.submission?.answers[f.field_id];
                    return (
                      <tr key={f.id} className="border-t" style={{ borderColor: 'var(--panel-border)' }}>
                        <td className="py-2 pr-4">{f.field_id}</td>
                        <td>{Array.isArray(v) ? v.join(', ') : String(v ?? '—')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      <Panel i={1} x={1000} y={320} w={500} h={640} className="scroll-thin flex flex-col gap-3 overflow-auto p-4">
        <div className="flex items-start gap-4 rounded-2xl border px-4 py-3" style={passed ? { background: 'var(--info-bg)', borderColor: 'transparent' } : { background: 'var(--error-bg)', borderColor: 'var(--error-line)' }}>
          {passed ? <CircleCheck size={34} style={{ color: 'var(--mint-dark)' }} /> : <CircleAlert size={34} fill="#e5383b" color="#fff" />}
          <div>
            <div className="text-[20px] font-semibold" style={{ color: passed ? 'var(--info-ink)' : '#d4111e' }}>
              {final ? 'Final PDF exported' : passed ? 'QA passed — confirm to export' : 'Final export blocked'}
            </div>
            <div className="text-[15px]" style={{ color: 'var(--ink)' }}>
              {!draft ? 'Create a draft PDF to run QA.' : stale ? 'Answers changed after this draft. Run checks again.' : passed ? 'Review the draft, then confirm the final export.' : 'Please resolve the issue below before downloading the final PDF.'}
            </div>
          </div>
        </div>
        {issues.slice(0, 3).map((i, k) => (
          <div key={k} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--panel-border)' }}>
            <div className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>
              {i.title}
            </div>
            <p className="text-[14px]" style={{ color: 'var(--muted)' }}>
              {i.detail}
            </p>
            {i.page && (
              <button className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[14.5px]" style={{ background: 'var(--selected)', color: 'var(--ink)' }} onClick={() => { setTab('Draft PDF'); setPage(i.page!); }}>
                <FileText size={18} /> Page {i.page} · {ws.blocks.find((b) => b.idx === ws.annotations.find((a) => a.field_id === i.field_id)?.source_block_idx)?.section_title ?? 'Source'} <ChevronRight size={16} className="ml-auto" />
              </button>
            )}
          </div>
        ))}
        <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--panel-border)' }}>
          <div className="mb-1 text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>
            QA checklist
          </div>
          {checks.map((c) => (
            <div key={c.key} className="flex items-center gap-3 py-1.5 text-[15px]" title={c.detail}>
              {c.status === 'pass' ? <CircleCheck size={22} style={{ color: 'var(--mint-dark)' }} /> : c.status === 'issue' ? <CircleAlert size={22} fill="#e5383b" color="#fff" /> : <span className="h-[22px] w-[22px] rounded-full border-2" style={{ borderColor: 'var(--panel-border)' }} />}
              <span className="flex-1">{c.label}</span>
              <span className="chip" style={{ background: STATUS[stale ? 'pending' : c.status].bg, color: STATUS[stale ? 'pending' : c.status].ink }}>
                {STATUS[stale ? 'pending' : c.status].label}
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-outline flex h-[40px] items-center justify-center gap-2 text-[15px]" onClick={() => nav.go('annotation')}>
            <ArrowLeft size={18} /> Return to annotation
          </button>
          <button className="btn-outline flex h-[40px] items-center justify-center gap-2 text-[15px]" onClick={() => nav.go('responses')}>
            <FileText size={18} /> Review answers
          </button>
        </div>
        <button className="btn-primary flex h-[42px] items-center justify-center gap-2 text-[16px]" onClick={run} disabled={!ws.version || busy !== null}>
          {busy === 'checks' ? <Loader2 size={18} className="animate-spin" /> : <RotateCw size={18} />} Run checks again
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-outline flex h-[56px] flex-col items-center justify-center text-[15px] leading-tight" disabled={!draft} onClick={async () => draft && window.open(await signedUrl('exports', draft.file_path), '_blank', 'noopener')}>
            <span className="flex items-center gap-2">
              <Download size={18} /> Download draft
            </span>
            <span className="text-[12px]" style={{ color: 'var(--muted)' }}>
              {passed ? 'QA passed' : 'Unverified'}
            </span>
          </button>
          <button className="btn-primary flex h-[56px] flex-col items-center justify-center text-[15px] leading-tight" disabled={!passed || busy !== null} onClick={() => (final ? signedUrl('exports', final.file_path).then((u) => window.open(u, '_blank', 'noopener')) : setConfirmOpen(true))}>
            <span className="flex items-center gap-2">
              <Download size={18} /> {final ? 'Download final PDF' : 'Download final PDF'}
            </span>
            <span className="text-[12px]">{passed ? (final ? 'Exported' : 'Confirm to export') : 'Disabled until QA passes'}</span>
          </button>
        </div>
        <p className="flex items-center gap-2 text-[13.5px]" style={{ color: 'var(--ink)' }}>
          <Info size={17} fill="var(--primary)" color="var(--panel)" /> Final export requires QA and human confirmation.
        </p>
      </Panel>

      <Fade x={598} y={977} w={340} h={32}>
        <div className="pill flex h-full items-center justify-center gap-2 text-[13px]" style={{ color: 'var(--ink)' }}>
          Source v{ws.version?.version_no ?? '–'} <ArrowRight size={14} /> Form v{ws.version?.version_no ?? '–'} <ArrowRight size={14} /> Answers v{ws.version?.version_no ?? '–'} <ArrowRight size={14} /> {final ? 'Final PDF' : 'Draft PDF'}
        </div>
      </Fade>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm final export">
        <p className="mb-3 text-[14.5px]" style={{ color: 'var(--muted)' }}>
          All automated checks passed for this draft. The final PDF is generated without the draft mark from the same source version, form and answers.
        </p>
        <label className="flex items-start gap-3 rounded-xl border px-4 py-3 text-[14.5px]" style={{ borderColor: 'var(--panel-border)' }}>
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1" /> I reviewed the draft and confirm it matches the approved source and answers.
        </label>
        <div className="mt-4 flex justify-end gap-3">
          <button className="btn-outline h-10 px-5" onClick={() => setConfirmOpen(false)}>
            Cancel
          </button>
          <button className="btn-primary flex h-10 items-center gap-2 px-5" disabled={!confirm || busy === 'final'} onClick={exportFinal}>
            {busy === 'final' && <Loader2 size={16} className="animate-spin" />} Export final PDF
          </button>
        </div>
      </Modal>
    </>
  );
}
