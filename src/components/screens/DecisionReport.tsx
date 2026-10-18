'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronRight, CircleAlert, CircleCheck, Copy, Download, FilePen, FileText, Files, Info, Loader2, RotateCw, Upload } from 'lucide-react';
import { useNav } from '../../lib/nav';
import { reviewOutcome } from '../../lib/outcome';
import { api, ensureSession, signedUrl, supabase } from '../../lib/supabase';
import type { DecisionAction, FindingRow, VersionRow } from '../../lib/types';
import { ACCEPT, uploadSource } from '../../lib/upload';
import { proposedText, type Edit } from '../../review/revise';
import { useWorkspace } from '../../lib/workspace';
import { StageStrip } from '../shell/Chrome';
import { fmtTime, Modal, reviewState, STATE, StateChip, type ReviewState } from '../ui';
import { ClarifyModal, DismissModal } from './LegalReview';
import { Empty, Fade, HeaderArt, Panel, Title } from './Screen';

const TONE = {
  ready: ['var(--info-bg)', 'var(--info-ink)', 'var(--mint-dark)'],
  exceptions: ['var(--violet-bg)', 'var(--violet-ink)', 'var(--violet-ink)'],
  clarify: ['var(--warn-bg)', 'var(--warn-ink)', 'var(--warn-dot)'],
  revision: ['var(--warn-bg)', 'var(--warn-ink)', 'var(--warn-dot)'],
  in_progress: ['var(--warn-bg)', 'var(--warn-ink)', 'var(--warn-dot)'],
  blocked: ['var(--error-bg)', 'var(--error-ink)', '#e5383b'],
} as const;

export function DecisionReport() {
  const nav = useNav();
  const ws = useWorkspace();
  const outcome = reviewOutcome(ws.version, ws.findings, ws.decisions);
  const [stateFilter, setStateFilter] = useState<ReviewState | 'all'>('all');
  const [selId, setSelId] = useState<string | null>(null);
  const [questions, setQuestions] = useState('');
  const [exporting, setExporting] = useState(false);
  const [compare, setCompare] = useState(false);
  const [revise, setRevise] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [modal, setModal] = useState<'dismiss' | 'clarify' | null>(null);

  const rows = ws.findings.filter((f) => stateFilter === 'all' || reviewState(f, ws.decisions) === stateFilter);
  const sel = ws.findings.find((f) => f.id === selId) ?? ws.findings.find((f) => ['confirmed', 'clarify', 'open'].includes(reviewState(f, ws.decisions))) ?? ws.findings[0];

  // Questions come from clarification requests (edited wording) and confirmed open issues.
  const generated = useMemo(() => {
    const qs: string[] = [];
    for (const f of ws.findings) {
      const st = reviewState(f, ws.decisions);
      const last = [...ws.decisions].reverse().find((d) => d.finding_id === f.id);
      const anchors = f.evidence.map((e) => `Page ${e.page ?? '–'}${e.section ? ` ${e.section}` : ''}`).join(', ');
      if (st === 'clarify') qs.push(`${last?.note ?? f.question} (${anchors})`);
      else if (st === 'confirmed' || st === 'open') qs.push(`${f.question} (${anchors})`);
    }
    return qs.map((q, i) => `${i + 1}. ${q}`).join('\n');
  }, [ws.findings, ws.decisions]);
  useEffect(() => setQuestions(generated.slice(0, 1000)), [generated]);

  const prepare = async () => {
    const text = `Questions for counsel — ${ws.document?.title ?? ''} v${ws.version?.version_no ?? ''}\n\n${questions}\n`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
    a.download = `questions-for-counsel-v${ws.version?.version_no ?? ''}.md`;
    a.click();
    nav.notify('Question list copied and downloaded. Nothing was sent; sharing it is your decision.');
  };

  const exportReport = async () => {
    if (!ws.version) return;
    setExporting(true);
    try {
      const { path } = await api<{ path: string }>(`/api/versions/${ws.version.id}/report`, { questions });
      window.open(await signedUrl('exports', path), '_blank', 'noopener');
      await ws.reload();
    } catch (e) {
      nav.notify(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setExporting(false);
    }
  };

  // Decisions can be made here as well as in Legal review; both append to the same history.
  const decide = async (action: DecisionAction, reason?: string | null, note?: string | null, useAsExample = false) => {
    if (!sel) return;
    const { error } = await supabase().from('decision_events').insert({ finding_id: sel.id, action, reason: reason ?? null, note: note ?? null, use_as_example: useAsExample });
    if (error) return nav.notify(error.message, 'error');
    await ws.reload();
    nav.notify(reason === 'exception' ? 'Approved as a recorded exception.' : action === 'confirm' ? 'Issue confirmed. It blocks digitization until a revision resolves it or you approve it as an exception.' : action === 'dismiss' ? 'Finding dismissed with reason.' : action === 'clarify' ? 'Clarification requested; the question is in the counsel list.' : 'Finding reopened.');
  };
  const selState = sel ? reviewState(sel, ws.decisions) : 'open';
  const count = (s: ReviewState) => ws.findings.filter((f) => reviewState(f, ws.decisions) === s).length;
  const nextStep =
    outcome.key === 'blocked'
      ? 'Open Source quality and confirm the manual comparison (or fix the source) first.'
      : count('open')
        ? `${count('open')} finding(s) still need a decision: select one on the left and choose Confirm, Dismiss or Needs clarification under the preview.`
        : count('clarify')
          ? `${count('clarify')} finding(s) wait for counsel. Send the question list; when answered, Dismiss, Approve as exception, or upload the revised version.`
          : count('confirmed')
            ? `${count('confirmed')} confirmed issue(s) block digitization: upload the revised document (Compare, top right; Create revised PDF prepares one from your corrections) or Approve as exception to accept the wording.`
            : 'Every finding has a final decision. Export the report if needed, then continue to annotation.';

  const tone = TONE[outcome.key];
  const newer = ws.siblings.filter((s) => ws.version && s.version_no > ws.version.version_no);
  const timeline = sel ? ws.decisions.filter((d) => d.finding_id === sel.id) : [];

  return (
    <>
      <HeaderArt id="report" x={170} y={134} w={192} h={146} />
      <Title x={388} y={146} size={52}>
        Decision / report
      </Title>
      <Fade x={388} y={205} w={440}>
        <p className="text-[19px] leading-[24px]" style={{ color: 'var(--ink)' }}>
          Open source-linked findings. Confirm, dismiss or request clarification.
        </p>
      </Fade>
      <Fade i={1} x={863} y={160} w={375} h={80} keep={258}>
        <div className="flex h-full items-center gap-4 rounded-[22px] border px-5" style={{ background: tone[0], borderColor: 'var(--panel-border)' }}>
          {outcome.canDigitize ? <CircleCheck size={42} style={{ color: tone[2] }} /> : <CircleAlert size={42} fill={tone[2]} color="#fff" />}
          <div>
            <div className="text-[21px] font-semibold" style={{ color: tone[1] }}>
              {outcome.label}
            </div>
            <div className="text-[14.5px]" style={{ color: 'var(--ink)' }}>
              {outcome.detail}
            </div>
          </div>
        </div>
      </Fade>
      <Fade i={1} x={1265} y={170} w={218} h={58} keep={270}>
        <button className="pill flex h-full w-full items-center justify-center gap-3 text-[18px] font-semibold" style={{ color: 'var(--ink)' }} onClick={() => setCompare(true)}>
          <Files size={24} /> Compare v{ws.version?.version_no ?? 1} → v{newer[0]?.version_no ?? (ws.version?.version_no ?? 1) + 1}
        </button>
      </Fade>
      <StageStrip x={142} y={285} w={1348} />

      <Panel i={0} x={140} y={348} w={442} h={600} className="flex flex-col p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[21px] font-semibold" style={{ color: 'var(--ink)' }}>
            Finding status
          </h2>
          <div className="relative">
            <button className="flex h-10 items-center gap-3 rounded-full border px-4 text-[14px]" style={{ borderColor: 'var(--panel-border)' }} onClick={() => setFilterOpen((o) => !o)}>
              {stateFilter === 'all' ? 'All findings' : STATE[stateFilter].label} <ChevronDown size={16} />
            </button>
            {filterOpen && (
              <div className="panel absolute right-0 top-11 z-30 w-60 p-2 text-[14px]" onMouseLeave={() => setFilterOpen(false)}>
                {(['all', 'open', 'confirmed', 'clarify', 'dismissed', 'resolved', 'exception'] as const).map((s) => (
                  <button key={s} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-[var(--selected)]" onClick={() => { setStateFilter(s); setFilterOpen(false); }}>
                    {s === 'all' ? 'All findings' : STATE[s].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_170px_20px] border-b px-3 pb-2 text-[14.5px]" style={{ borderColor: 'var(--panel-border)', color: 'var(--ink)' }}>
          <span>Finding</span>
          <span>Status</span>
        </div>
        <div className="scroll-thin flex-1 overflow-auto">
          {!ws.findings.length && <Empty title="No findings" detail={ws.version ? 'Nothing to decide for this version.' : 'Open a document first.'} />}
          {rows.map((f) => {
            const on = f.id === sel?.id;
            return (
              <button key={f.id} onClick={() => setSelId(f.id)} className="mt-1.5 grid w-full grid-cols-[1fr_170px_20px] items-center gap-2 rounded-2xl border px-3 py-2.5 text-left" style={{ borderColor: on ? 'var(--primary)' : 'transparent', background: on ? 'var(--selected)' : undefined }}>
                <span className="flex min-w-0 items-center gap-3 text-[15px]" style={{ color: 'var(--ink)' }}>
                  <FileText size={20} className="shrink-0" /> <span className="truncate">{f.title}</span>
                </span>
                <StateChip s={reviewState(f, ws.decisions)} short className="justify-center py-1 text-center text-[13.5px] leading-tight" />
                <ChevronRight size={18} />
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel i={1} x={597} y={348} w={488} h={600} className="scroll-thin flex flex-col overflow-auto p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[21px] font-semibold" style={{ color: 'var(--ink)' }}>
            Review report preview
          </h2>
          <span className="chip border text-[13px]" style={{ borderColor: 'var(--panel-border)', color: 'var(--primary)' }}>
            <Info size={15} /> Live preview
          </span>
        </div>
        {!sel ? (
          <Empty title="Nothing selected" detail="Select a finding to preview its report entry." />
        ) : (
          <>
            <ReportEntry f={sel} timeline={timeline} />
            {/* Pinned to the bottom of the scrolling preview so the decision buttons are always in view. */}
            <div className="sticky -bottom-5 -mx-5 -mb-5 mt-auto border-t px-5 pb-4 pt-3" style={{ background: 'var(--panel)', borderColor: 'var(--panel-border)' }}>
              <div className="mb-2 text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>
                Decide on this finding
              </div>
              <div className="flex flex-wrap gap-2">
                {selState !== 'confirmed' && selState !== 'exception' && (
                  <button className="btn-primary h-9 px-4 text-[14px]" onClick={() => decide('confirm')}>
                    Confirm issue
                  </button>
                )}
                {(selState === 'confirmed' || selState === 'clarify') && (
                  <button className="btn-primary h-9 px-4 text-[14px]" onClick={() => decide('confirm', 'exception', 'Accepted as a recorded exception')}>
                    Approve as exception
                  </button>
                )}
                {selState !== 'dismissed' && (
                  <button className="btn-outline h-9 px-4 text-[14px]" onClick={() => setModal('dismiss')}>
                    Dismiss…
                  </button>
                )}
                {selState !== 'clarify' && selState !== 'exception' && selState !== 'dismissed' && (
                  <button className="btn-outline h-9 px-4 text-[14px]" onClick={() => setModal('clarify')}>
                    Needs clarification…
                  </button>
                )}
                {selState !== 'open' && (
                  <button className="btn-outline h-9 px-4 text-[14px]" onClick={() => decide('reopen')}>
                    Reopen
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </Panel>

      <Panel i={2} x={1100} y={348} w={393} h={600} className="flex flex-col p-5">
        <h2 className="text-[21px] font-semibold" style={{ color: 'var(--ink)' }}>
          Questions for counsel
        </h2>
        <p className="text-[14px]" style={{ color: 'var(--muted)' }}>
          Prepare a clear list of questions based on the open findings in this document.
        </p>
        {/* Grows into spare height (full-screen mode); the counter has its own strip so it never covers the text. */}
        <div className="relative mt-2 flex min-h-[118px] flex-1 flex-col">
          <textarea value={questions} onChange={(e) => setQuestions(e.target.value.slice(0, 1000))} className="scroll-thin min-h-0 w-full flex-1 resize-none rounded-xl border p-3 text-[14px] leading-[19px]" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel)', color: 'var(--ink)' }} placeholder="No open questions." />
          <span className="self-end pt-0.5 text-[11px]" style={{ color: 'var(--muted)' }}>
            {questions.length}/1000
          </span>
        </div>
        <button className="btn-outline mt-2 flex h-[38px] items-center justify-center gap-2 text-[15px]" onClick={prepare} disabled={!questions.trim()}>
          <Copy size={17} /> Prepare question list
        </button>
        <div className="my-3 border-t" style={{ borderColor: 'var(--panel-border)' }} />
        <h3 className="text-[20px] font-semibold" style={{ color: 'var(--ink)' }}>
          Export review report
        </h3>
        <p className="text-[14px]" style={{ color: 'var(--muted)' }}>
          Generate a summary of findings, open questions and next steps.
        </p>
        <button className="btn-outline mt-2 flex h-[38px] items-center justify-center gap-2 text-[15px]" onClick={exportReport} disabled={!ws.version || exporting}>
          {exporting ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />} Export review report
        </button>
        <button className="btn-outline mt-2 flex h-[38px] items-center justify-center gap-2 text-[15px]" onClick={() => setRevise(true)} disabled={!ws.version}>
          <FilePen size={17} /> Create revised PDF
        </button>
        {!outcome.canDigitize && (
          <div className="mt-3 flex items-start gap-3 rounded-2xl px-4 py-2.5" style={{ background: tone[0] }}>
            <CircleAlert size={26} className="shrink-0" fill={tone[2]} color="#fff" />
            <div>
              <div className="text-[15px] font-semibold" style={{ color: tone[1] }}>
                {outcome.key === 'blocked' ? 'Source quality blocks digitization' : outcome.key === 'in_progress' ? 'Decisions still pending' : 'Unresolved issue blocks digitization'}
              </div>
              <div className="text-[13px]" style={{ color: 'var(--ink)' }}>
                {outcome.key === 'in_progress' ? 'Confirm, dismiss or clarify every finding.' : 'Resolve or dismiss all open findings, or record exceptions, to continue.'}
              </div>
            </div>
          </div>
        )}
        <button className="btn-primary mt-3 flex h-[40px] items-center justify-center gap-2 text-[15px]" disabled={!outcome.canDigitize} onClick={() => nav.go('annotation')}>
          <ArrowRight size={17} /> Continue to annotation
        </button>
        <p className="mt-auto flex items-start gap-2 pt-2 text-[13.5px] leading-[18px]" style={{ color: 'var(--ink)' }}>
          <Info size={17} className="mt-px shrink-0" fill="var(--primary)" color="var(--panel)" />
          <span>
            <b>Next step:</b> {nextStep}
          </span>
        </p>
      </Panel>

      <CompareModal open={compare} onClose={() => setCompare(false)} newer={newer} />
      <RevisionModal open={revise} onClose={() => setRevise(false)} onUploaded={() => { setRevise(false); setCompare(true); }} />
      {sel && <DismissModal open={modal === 'dismiss'} onClose={() => setModal(null)} onSubmit={(r, n, ex) => { setModal(null); decide('dismiss', r, n, ex); }} />}
      {sel && <ClarifyModal open={modal === 'clarify'} question={sel.question} onClose={() => setModal(null)} onSubmit={(q) => { setModal(null); decide('clarify', null, q); }} />}
    </>
  );
}

function ReportEntry({ f, timeline }: { f: FindingRow; timeline: ReturnType<typeof useWorkspace>['decisions'] }) {
  const steps = [
    { label: 'Issue confirmed', detail: f.rationale, done: timeline.some((d) => d.action === 'confirm') },
    { label: 'Clarification requested', detail: timeline.find((d) => d.action === 'clarify')?.note ?? 'Awaiting guidance if needed.', done: timeline.some((d) => d.action === 'clarify') },
    { label: timeline.some((d) => d.action === 'resolve') ? 'Resolved after revision' : 'Revision pending', detail: timeline.some((d) => d.action === 'resolve') ? 'Verified against a newer version.' : 'Once clarified, the document can be revised.', done: timeline.some((d) => d.action === 'resolve') },
  ];
  const dismissed = timeline.find((d) => d.action === 'dismiss');
  return (
    <>
      <div className="mt-3 flex gap-3 rounded-2xl px-4 py-3" style={{ background: 'var(--selected)' }}>
        <FileText size={26} style={{ color: 'var(--primary)' }} />
        <div>
          <div className="text-[18px] font-semibold" style={{ color: 'var(--ink)' }}>
            {f.title}
          </div>
          <div className="text-[14px]" style={{ color: 'var(--muted)' }}>
            {f.rationale}
          </div>
        </div>
      </div>
      <div className="mt-3 text-[16px] font-semibold" style={{ color: 'var(--ink)' }}>
        Source anchors
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {f.evidence.slice(0, 2).map((e, i) => (
          <div key={i} className="rounded-2xl border p-2" style={{ borderColor: 'var(--panel-border)' }}>
            <div className="flex items-center gap-2 rounded-lg px-2 py-1 text-[13.5px]" style={{ background: 'var(--panel-2)', color: 'var(--primary)' }}>
              <FileText size={16} /> Page {e.page ?? '–'} {e.section ?? ''}
            </div>
            <p className="paper mt-2 line-clamp-3 rounded-lg px-2 py-1 text-[14px]" style={{ color: 'var(--paper-ink)' }}>
              “{e.quote}”
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-2xl px-4 py-3" style={{ background: 'var(--panel-2)' }}>
        <div className="text-[15.5px] font-semibold leading-[21px]" style={{ color: 'var(--ink)' }}>
          {f.question}
        </div>
      </div>
      {dismissed ? (
        <p className="mt-3 text-[14px]" style={{ color: 'var(--muted)' }}>
          Dismissed {fmtTime(dismissed.created_at)} — {dismissed.reason}
          {dismissed.note ? ` · ${dismissed.note}` : ''}
        </p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          {steps.map((s, i) => (
            <li key={i} className="relative flex gap-3">
              {i < steps.length - 1 && <span className="absolute left-[11px] top-6 h-[calc(100%-6px)] w-px" style={{ background: 'var(--panel-border)' }} />}
              <span className="mt-0.5 h-[22px] w-[22px] shrink-0 rounded-full border-[3px]" style={{ borderColor: s.done ? 'var(--primary)' : i === steps.findIndex((x) => !x.done) ? 'var(--warn-dot)' : 'var(--panel-border)', background: s.done ? 'var(--primary)' : 'var(--panel)' }} />
              <div>
                <div className="text-[15.5px] font-semibold" style={{ color: 'var(--ink)' }}>
                  {s.label}
                </div>
                <div className="line-clamp-2 text-[13px]" style={{ color: 'var(--muted)' }}>
                  {s.detail}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function CompareModal({ open, onClose, newer }: { open: boolean; onClose: () => void; newer: VersionRow[] }) {
  const ws = useWorkspace();
  const nav = useNav();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<{ fingerprints: Set<string>; keys: Set<string>; titles: string[]; reviewed: boolean } | null>(null);
  const [tick, setTick] = useState(0);
  const v2 = newer[0];

  // The newer version's own status is read fresh: until its checks finish it has no findings, which must not read as "resolved".
  useEffect(() => {
    setTarget(null);
    if (!open || !v2) return;
    const sb = supabase();
    Promise.all([sb.from('document_versions').select('status').eq('id', v2.id).maybeSingle(), sb.from('findings').select('fingerprint, title, category').eq('version_id', v2.id)]).then(([v, { data }]) =>
      setTarget({ fingerprints: new Set((data ?? []).map((d) => d.fingerprint)), keys: new Set((data ?? []).map((d) => `${d.category}|${d.title}`)), titles: (data ?? []).map((d) => d.title), reviewed: v.data?.status === 'reviewed' }),
    );
  }, [open, v2, tick]);

  const upload = async (file: File) => {
    if (!ws.document) return;
    setBusy(true);
    try {
      await uploadSource(file, ws.document.id);
      await ws.reload();
      nav.notify('Revised version registered. Checks run on it now; compare again when they finish.');
    } catch (e) {
      nav.notify(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const resolve = async (f: FindingRow) => {
    await supabase().from('decision_events').insert({ finding_id: f.id, action: 'resolve', note: `Not present in v${v2.version_no} after re-running checks.` });
    await ws.reload();
  };

  return (
    <Modal open={open} onClose={onClose} title={v2 ? `Compare v${ws.version?.version_no} → v${v2.version_no}` : 'Compare with a revised version'} width={720}>
      {!v2 ? (
        <>
          <p className="mb-4 text-[14.5px]" style={{ color: 'var(--muted)' }}>
            Upload the revised file as the next version of this document. Checks run again on the new version; earlier decisions are not reused automatically.
          </p>
          <button className="btn-primary flex h-11 items-center gap-2 px-5" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />} Upload revised version
          </button>
          <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </>
      ) : !target ? (
        <Loader2 className="mx-auto animate-spin" />
      ) : !target.reviewed ? (
        <div className="space-y-3">
          <p className="text-[14.5px]" style={{ color: 'var(--muted)' }}>
            Checks are still running on v{v2.version_no} (or stopped before finishing). Findings can be compared once they are done.
          </p>
          <div className="flex gap-4">
            <button className="btn-outline flex h-10 items-center gap-2 px-4 text-[14px]" onClick={() => setTick((t) => t + 1)}>
              <RotateCw size={16} /> Check again
            </button>
            <button className="text-[14px]" style={{ color: 'var(--primary)' }} onClick={() => { ws.setVersionId(v2.id); onClose(); }}>
              Open v{v2.version_no} to see its job →
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="mb-2 text-[14px]" style={{ color: 'var(--muted)' }}>
            Findings of v{ws.version?.version_no} compared by evidence with the checks of v{v2.version_no}. A finding absent from v{v2.version_no} is only a proposal until you mark it resolved.
          </p>
          {ws.findings.map((f) => {
            // Same evidence, or the same rule result by name (editing a shared sentence changes the evidence of its other findings).
            const still = target.fingerprints.has(f.fingerprint) || target.keys.has(`${f.category}|${f.title}`);
            const st = reviewState(f, ws.decisions);
            return (
              <div key={f.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-[14px]" style={{ borderColor: 'var(--panel-border)' }}>
                <span className="min-w-0">
                  <span className="block truncate">{f.title}</span>
                  {/* Semantic findings are reworded between runs, so "not found" there needs a read of v2, not just a click. */}
                  {!still && st !== 'resolved' && f.provenance.source !== 'rules' && (
                    <span className="block text-[12.5px]" style={{ color: 'var(--muted)' }}>
                      AI reviewer finding: its wording can change between runs. Check v{v2.version_no} before marking it resolved.
                    </span>
                  )}
                </span>
                {st === 'resolved' ? (
                  <StateChip s="resolved" />
                ) : still ? (
                  <span className="chip" style={{ background: 'var(--warn-bg)', color: 'var(--warn-ink)' }}>
                    Still present in v{v2.version_no}
                  </span>
                ) : (
                  <button className="btn-outline h-9 shrink-0 px-3 text-[13.5px]" onClick={() => resolve(f)}>
                    Not found in v{v2.version_no} · mark resolved
                  </button>
                )}
              </div>
            );
          })}
          <button className="mt-3 text-[14px]" style={{ color: 'var(--primary)' }} onClick={() => { ws.setVersionId(v2.id); onClose(); }}>
            Open v{v2.version_no} ({target.titles.length} finding(s)) →
          </button>
        </div>
      )}
    </Modal>
  );
}

/** Corrections for confirmed and clarification findings → revised draft PDF, downloaded or registered as the next version. */
function RevisionModal({ open, onClose, onUploaded }: { open: boolean; onClose: () => void; onUploaded: () => void }) {
  const ws = useWorkspace();
  const nav = useNav();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'download' | 'upload' | null>(null);
  useEffect(() => setDrafts({}), [ws.version?.id]);

  // One editor per quoted passage: findings that quote the same sentence share it, so their corrections cannot collide.
  const passages: { key: string; block_idx: number; quote: string; page: number | null; section: string | null; findings: FindingRow[] }[] = [];
  for (const f of ws.findings.filter((x) => ['confirmed', 'clarify'].includes(reviewState(x, ws.decisions))))
    for (const e of f.evidence.filter((x) => x.matched)) {
      const key = `${e.block_idx}|${e.quote}`;
      const p = passages.find((x) => x.key === key);
      if (!p) passages.push({ key, block_idx: e.block_idx, quote: e.quote, page: e.page, section: e.section, findings: [f] });
      else if (!p.findings.includes(f)) p.findings.push(f);
    }
  const value = (p: (typeof passages)[number]) => drafts[p.key] ?? p.findings.reduce((t, f) => proposedText(f, t), p.quote);
  const edits: Edit[] = passages.filter((p) => value(p).trim() && value(p).trim() !== p.quote).map((p) => ({ block_idx: p.block_idx, quote: p.quote, text: value(p) }));

  const build = async () => {
    const session = await ensureSession();
    const res = await fetch(`/api/versions/${ws.version!.id}/revise`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ edits }) });
    if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? `Request failed (${res.status})`);
    const missed = Number(res.headers.get('x-missed') ?? 0);
    if (missed) nav.notify(`${missed} change(s) were not applied: their passage overlaps another corrected passage. Put both corrections in one box.`, 'error');
    return res.blob();
  };
  const fileName = () => `${(ws.version?.file_name ?? 'document').replace(/\.(pdf|docx)$/i, '')} (revised from v${ws.version?.version_no}).pdf`;

  const run = async (mode: 'download' | 'upload') => {
    if (!ws.version || !ws.document) return;
    setBusy(mode);
    try {
      const blob = await build();
      if (mode === 'download') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName();
        a.click();
        nav.notify('Revised draft downloaded. Nothing was uploaded.');
      } else {
        const res = await uploadSource(new File([blob], fileName(), { type: 'application/pdf' }), ws.document.id);
        await ws.reload();
        nav.notify(res.duplicateOf ? 'This revision was uploaded before; the existing record is used.' : 'Revised version registered. Checks run on it now; Compare shows which findings it no longer contains.');
        onUploaded();
      }
    } catch (e) {
      nav.notify(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Create revised PDF from v${ws.version?.version_no ?? 1}`} width={820}>
      <p className="mb-4 text-[14px]" style={{ color: 'var(--muted)' }}>
        Write the corrected wording for each confirmed issue (and, once counsel has answered, each clarification). Spelling fixes are filled in for you. The revised PDF is the extracted text of this version with your changes, in reading order and with the original page breaks; layout and form fields of the original are not copied. Upload it as the next version to run every check again, then mark findings resolved in Compare.
      </p>
      {!passages.length ? (
        <Empty title="Nothing to correct" detail="Confirm issues (or request clarification) in Legal review or on this screen first. Dismissed findings and recorded exceptions keep the original wording." />
      ) : (
        <div className="space-y-3">
          {passages.map((p) => {
            const changed = value(p).trim() !== p.quote;
            return (
              <div key={p.key} className="rounded-2xl border p-4" style={{ borderColor: changed ? 'var(--primary)' : 'var(--panel-border)' }}>
                {p.findings.map((f) => (
                  <div key={f.id} className="mb-1 flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
                      {String(f.seq).padStart(2, '0')}. {f.title}
                    </span>
                    <StateChip s={reviewState(f, ws.decisions)} short />
                  </div>
                ))}
                {p.findings
                  .filter((f) => f.category !== 'typo' && f.suggestion)
                  .map((f) => (
                    <p key={f.id} className="text-[13px]" style={{ color: 'var(--muted)' }}>
                      Reviewer suggestion: {f.suggestion}
                    </p>
                  ))}
                <div className="mt-2 text-[12.5px]" style={{ color: 'var(--muted)' }}>
                  Page {p.page ?? '–'} {p.section ?? ''} · original
                </div>
                <p className="paper mt-1 rounded-lg px-3 py-1.5 text-[14px]" style={{ color: 'var(--paper-ink)' }}>
                  “{p.quote}”
                </p>
                <textarea aria-label={`Corrected wording for ${p.findings.map((f) => f.title).join(', ')}`} value={value(p)} onChange={(ev) => setDrafts((d) => ({ ...d, [p.key]: ev.target.value }))} rows={3} className="mt-2 w-full resize-y rounded-xl border p-3 text-[14px] leading-[19px]" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel)', color: 'var(--ink)' }} />
                {changed && (
                  <button className="text-[13px]" style={{ color: 'var(--primary)' }} onClick={() => setDrafts((d) => ({ ...d, [p.key]: p.quote }))}>
                    Keep original wording
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="sticky -bottom-6 -mx-6 -mb-6 mt-4 flex flex-wrap items-center justify-end gap-3 border-t px-6 py-4" style={{ background: 'var(--panel)', borderColor: 'var(--panel-border)' }}>
        <span className="mr-auto text-[14px]" style={{ color: 'var(--ink)' }}>
          {edits.length} change(s)
        </span>
        <button className="btn-outline flex h-10 items-center gap-2 px-4 text-[14.5px]" disabled={!edits.length || !!busy} onClick={() => run('download')}>
          {busy === 'download' ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />} Download revised PDF
        </button>
        <button className="btn-primary flex h-10 items-center gap-2 px-4 text-[14.5px]" disabled={!edits.length || !!busy} onClick={() => run('upload')}>
          {busy === 'upload' ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />} Upload as new version
        </button>
      </div>
    </Modal>
  );
}
