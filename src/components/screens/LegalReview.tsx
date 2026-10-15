'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronLeft, ChevronRight, CircleMinus, Clock, FileText, Info, Loader2, MessageSquareMore, SlidersHorizontal } from 'lucide-react';
import { useNav } from '../../lib/nav';
import { supabase } from '../../lib/supabase';
import type { Category, DecisionAction, FindingRow } from '../../lib/types';
import { useWorkspace } from '../../lib/workspace';
import { PdfPage, scrollWithin, TextPaper, usePdf, type Highlight } from '../pdf/PdfViewer';
import { StageStrip } from '../shell/Chrome';
import { CATEGORY, CategoryChip, fmtTime, Modal, reviewState, STATE } from '../ui';
import { Empty, Fade, HeaderArt, Panel, Title } from './Screen';
import { refLabel } from './DocumentMap';

const FILTERS: (Category | 'all')[] = ['all', 'typo', 'missing_reference', 'contradiction', 'ambiguity', 'undefined_term'];
export const DISMISS_REASONS = ['Insufficient evidence', 'Not applicable to this contract', 'Duplicate of another finding', 'Model or rule error', 'Real issue, accepted as written'];

export function LegalReview() {
  const nav = useNav();
  const ws = useWorkspace();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [selId, setSelId] = useState<string | null>(null);
  const [modal, setModal] = useState<'dismiss' | 'clarify' | 'history' | 'confidence' | null>(null);
  const [menu, setMenu] = useState(false);
  const { doc } = usePdf('sources', ws.version?.pdf_path);

  const list = ws.findings.filter((f) => filter === 'all' || f.category === filter);
  const sel = ws.findings.find((f) => f.id === selId) ?? list[0] ?? null;
  const idx = sel ? ws.findings.indexOf(sel) : -1;
  const state = sel ? reviewState(sel, ws.decisions) : 'open';
  const demo = ws.version?.file_name.toLowerCase().startsWith('demo agreement');
  const running = ws.job?.status === 'running' || ws.job?.status === 'queued';
  const cov = ws.version?.source_report.coverage;

  const decide = async (action: DecisionAction, reason?: string | null, note?: string | null, useAsExample = false) => {
    if (!sel) return;
    const { error } = await supabase().from('decision_events').insert({ finding_id: sel.id, action, reason: reason ?? null, note: note ?? null, use_as_example: useAsExample });
    if (error) return nav.notify(error.message, 'error');
    await ws.reload();
    const next = ws.findings.slice(idx + 1).find((f) => reviewState(f, ws.decisions) === 'open');
    if (next && action !== 'reopen') setSelId(next.id);
    nav.notify(action === 'confirm' ? 'Issue confirmed. It stays open until a revision resolves it.' : action === 'dismiss' ? 'Finding dismissed with reason; recorded in history.' : action === 'clarify' ? 'Clarification requested. The question is added to the counsel list.' : 'Finding reopened.');
  };

  return (
    <>
      <StageStrip x={132} y={155} w={1360} />
      <Title x={172} y={226}>
        Legal review
      </Title>
      <Fade x={600} y={253}>
        <span className="chip h-[40px] px-4 text-[17px]" style={{ background: 'var(--panel)', border: '1px solid var(--panel-border)', color: 'var(--ink)' }}>
          {demo ? 'Synthetic demo' : ws.version?.source_status === 'verified' || ws.version?.source_accepted_at ? 'Source checked' : 'Source needs review'}
        </span>
      </Fade>
      <Fade x={174} y={298}>
        <p className="text-[30px]" style={{ color: 'var(--ink)' }}>
          {ws.document ? `${ws.document.title} · v${ws.version?.version_no}` : 'No document open'}
        </p>
      </Fade>
      <HeaderArt id="review" x={1010} y={206} w={392} h={150} />

      <Panel i={0} x={134} y={358} w={370} h={600} className="flex flex-col p-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="flex items-center gap-3 text-[21px] font-semibold" style={{ color: 'var(--ink)' }}>
            Findings
            <span className="grid h-7 min-w-7 place-items-center rounded-full px-2 text-[15px]" style={{ background: 'var(--panel-2)' }}>
              {ws.findings.length}
            </span>
          </h2>
          <span className="pill grid h-10 w-10 place-items-center" title="Ordered by category, then by the decision agent's impact estimate">
            <SlidersHorizontal size={18} />
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 px-1">
          {FILTERS.map((f) => {
            const on = filter === f;
            const count = f === 'all' ? ws.findings.length : ws.findings.filter((x) => x.category === f).length;
            if (f === 'undefined_term' && !count) return null;
            return (
              <button key={f} onClick={() => setFilter(f)} className="h-[34px] rounded-xl px-3.5 text-[14px] transition-colors" style={on ? { background: 'var(--primary)', color: 'var(--primary-ink)' } : { background: 'var(--panel-2)', color: 'var(--ink)' }}>
                {f === 'all' ? 'All' : CATEGORY[f].filter}
              </button>
            );
          })}
        </div>
        <div className="scroll-thin mt-3 flex-1 space-y-2 overflow-auto px-1 pb-1">
          {running && !ws.findings.length && (
            <div className="flex items-center gap-2 p-4 text-[14px]" style={{ color: 'var(--muted)' }}>
              <Loader2 size={18} className="animate-spin" /> Review checks running…
            </div>
          )}
          {!running && ws.version && !ws.findings.length && <Empty title="No findings" detail="No issue was found with source evidence. A clean result is allowed; check the coverage note below before relying on it." />}
          {!ws.version && <Empty title="No document open" detail="Upload or open a document first." action={<button className="btn-primary mt-3 h-10 px-5" onClick={() => nav.go('intake')}>Go to intake</button>} />}
          {list.map((f) => {
            const on = f.id === sel?.id;
            const st = reviewState(f, ws.decisions);
            return (
              <motion.button
                layout
                key={f.id}
                onClick={() => setSelId(f.id)}
                className="flex w-full items-start gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors"
                style={{ background: on ? 'var(--selected)' : 'var(--panel)', borderColor: on ? 'var(--brand-blue)' : 'var(--panel-border)' }}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-semibold" style={{ background: 'var(--panel-2)', color: 'var(--ink)' }}>
                  {String(f.seq).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-tight" style={{ color: 'var(--ink)' }}>
                    {f.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[13px] leading-[17px]" style={{ color: 'var(--muted)' }}>
                    {f.rationale}
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <CategoryChip c={f.category} />
                    {st !== 'open' && <span className="h-2 w-2 rounded-full" style={{ background: STATE[st].dot }} title={STATE[st].label} />}
                  </span>
                </span>
                <ChevronRight size={20} className="mt-2 shrink-0" style={{ color: 'var(--ink)' }} />
              </motion.button>
            );
          })}
        </div>
      </Panel>

      <Panel i={1} x={514} y={358} w={575} h={600} className="flex flex-col overflow-hidden">
        <Viewer finding={sel} doc={doc} />
      </Panel>

      <Panel i={2} x={1100} y={358} w={395} h={600} className="flex flex-col p-5">
        {!sel ? (
          <Empty title="Select a finding" detail="Findings appear here with exact source anchors." />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={sel.id} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }} className="flex h-full flex-col">
              <div className="flex items-center justify-between">
                <h2 className="text-[21px] font-semibold" style={{ color: 'var(--ink)' }}>
                  Finding {String(sel.seq).padStart(2, '0')}
                </h2>
                <div className="pill flex">
                  <button className="grid h-9 w-10 place-items-center" disabled={idx <= 0} onClick={() => setSelId(ws.findings[idx - 1]?.id)} aria-label="Previous finding">
                    <ChevronLeft size={18} />
                  </button>
                  <button className="grid h-9 w-10 place-items-center border-l" style={{ borderColor: 'var(--panel-border)' }} disabled={idx >= ws.findings.length - 1} onClick={() => setSelId(ws.findings[idx + 1]?.id)} aria-label="Next finding">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <div className="relative mt-3 flex items-center gap-3">
                <span className="chip h-[30px] shrink-0 px-4 text-[13.5px]" style={{ background: CATEGORY[sel.category].bg, color: CATEGORY[sel.category].ink }}>
                  {CATEGORY[sel.category].label === 'References' ? 'Missing reference' : CATEGORY[sel.category].label === 'Typos' ? 'Typo' : CATEGORY[sel.category].label === 'Ambiguities' ? 'Ambiguity' : CATEGORY[sel.category].label}
                </span>
                <button onClick={() => setMenu((m) => !m)} className="flex h-[30px] items-center gap-2 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium" style={{ borderColor: 'var(--panel-border)', color: 'var(--ink)' }} aria-expanded={menu}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATE[state].dot }} /> {STATE[state].label} <ChevronDown size={15} />
                </button>
                {menu && (
                  <div className="panel absolute left-24 top-9 z-30 w-64 p-2 text-[14px]" onMouseLeave={() => setMenu(false)}>
                    <MenuItem onClick={() => { setMenu(false); setModal('history'); }}>View decision history</MenuItem>
                    {state !== 'open' && <MenuItem onClick={() => { setMenu(false); decide('reopen'); }}>Reopen finding</MenuItem>}
                    {state === 'confirmed' && <MenuItem onClick={() => { setMenu(false); decide('confirm', 'exception', 'Accepted as a recorded exception'); }}>Approve as exception</MenuItem>}
                  </div>
                )}
              </div>
              {/* Long rationales scroll here so the actions below always keep their size. */}
              <div className="scroll-thin -mr-2 min-h-0 flex-1 overflow-auto pr-2">
              <Block title="Rationale">{sel.rationale}</Block>
              <Block title="Question">{sel.question}</Block>
              <div className="mt-3 text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
                Document anchors
              </div>
              <div className="mt-1.5 space-y-2">
                {sel.evidence.map((e, i) => (
                  <button key={i} onClick={() => { const el = document.querySelector<HTMLElement>(`[data-highlight="${sel.id}-${i}"]`) ?? document.querySelector<HTMLElement>(`[data-highlight="t${e.block_idx}"]`); scrollWithin(el?.closest<HTMLElement>('[data-scroller]') ?? null, el); }} className="flex h-[40px] w-full items-center gap-3 rounded-xl border px-4 text-[14.5px] hover:bg-[var(--selected)]" style={{ borderColor: 'var(--panel-border)', color: 'var(--ink)' }}>
                    <FileText size={20} /> Page {e.page ?? '–'} · {anchorLabel(ws.blocks.find((b) => b.idx === e.block_idx)?.section_ref)}
                    {!e.matched && <span className="text-[12px]" style={{ color: 'var(--error-ink)' }}>quote not matched</span>}
                    <ChevronRight size={18} className="ml-auto" />
                  </button>
                ))}
              </div>
              </div>
              <div className="mt-3 shrink-0 text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
                Actions
              </div>
              <button className="btn-primary mt-2 h-[40px] shrink-0 text-[15.5px]" onClick={() => decide('confirm')} disabled={state === 'confirmed'}>
                Confirm issue
              </button>
              <button className="btn-outline mt-2 flex h-[40px] shrink-0 items-center justify-center gap-2 text-[15.5px]" onClick={() => setModal('dismiss')}>
                <CircleMinus size={18} /> Dismiss
              </button>
              <button className="btn-outline mt-2 flex h-[40px] shrink-0 items-center justify-center gap-2 text-[15.5px]" onClick={() => setModal('clarify')}>
                <MessageSquareMore size={18} /> Needs clarification
              </button>
              <button className="flex shrink-0 items-center gap-2 pt-3 text-left text-[13px]" style={{ color: 'var(--muted)' }} onClick={() => setModal('confidence')}>
                <Info size={18} fill="var(--muted)" color="var(--panel)" /> Confidence: not calibrated · {sel.evidence_status === 'matched' ? 'quotes match source' : 'partial evidence'}
              </button>
            </motion.div>
          </AnimatePresence>
        )}
      </Panel>

      <Fade x={30} y={984} w={460}>
        <p className="flex items-center gap-2 text-[14px]" style={{ color: 'var(--ink)' }}>
          <Info size={18} fill="var(--ink)" color="var(--canvas)" /> Source coverage: {cov ? `${cov.read_pages} of ${cov.total_pages} pages read` : 'not measured'}
        </p>
      </Fade>
      <Fade x={905} y={976} w={330} h={38} className="flex gap-3">
        <button className="pill flex flex-1 items-center justify-center gap-2 text-[14px] font-medium" onClick={() => setModal('history')}>
          <Clock size={18} /> Decision history
        </button>
        <button className="pill flex flex-1 items-center justify-center gap-2 text-[14px] font-medium" onClick={() => nav.go('report')}>
          <FileText size={18} /> Review report
        </button>
      </Fade>

      {sel && <DismissModal open={modal === 'dismiss'} onClose={() => setModal(null)} onSubmit={(r, n, ex) => { setModal(null); decide('dismiss', r, n, ex); }} />}
      {sel && <ClarifyModal open={modal === 'clarify'} question={sel.question} onClose={() => setModal(null)} onSubmit={(q) => { setModal(null); decide('clarify', null, q); }} />}
      <HistoryModal open={modal === 'history'} onClose={() => setModal(null)} />
      {sel && <ConfidenceModal open={modal === 'confidence'} finding={sel} onClose={() => setModal(null)} />}
    </>
  );
}

const anchorLabel = (ref?: string | null) => (ref?.startsWith('sec:') || ref?.startsWith('annex:') ? refLabel(ref) : 'section');

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-[var(--selected)]">
      {children}
    </button>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <div className="mt-3 text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
        {title}
      </div>
      <div className="mt-1.5 rounded-xl px-4 py-2.5 text-[14px] leading-[19px]" style={{ background: 'var(--panel-2)', color: 'var(--ink)' }}>
        {children}
      </div>
    </>
  );
}

function Viewer({ finding, doc }: { finding: FindingRow | null; doc: ReturnType<typeof usePdf>['doc'] }) {
  const ws = useWorkspace();
  const scroller = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const pages = doc?.numPages ?? Math.max(1, ...ws.blocks.map((b) => b.page ?? 1));
  const highlights: Highlight[] = useMemo(
    () => (finding ? finding.evidence.filter((e) => e.page && e.bbox).map((e, i) => ({ id: `${finding.id}-${i}`, page: e.page!, bbox: e.bbox!, tone: 'warn' as const, label: `Page ${e.page} · ${anchorLabel(ws.blocks.find((b) => b.idx === e.block_idx)?.section_ref)}` })) : []),
    [finding, ws.blocks],
  );

  // Jump to the first passage of the selected finding; both passages of a contradiction stay visible in the scroll.
  useEffect(() => {
    const first = highlights[0];
    if (first) setPage(first.page);
    const firstIdx = finding?.evidence[0]?.block_idx;
    if (!first && firstIdx == null) return;
    const t = setTimeout(() => {
      const box = scroller.current;
      scrollWithin(box, (first && box?.querySelector<HTMLElement>(`[data-highlight="${first.id}"]`)) || (box?.querySelector<HTMLElement>(`[data-highlight="t${firstIdx}"]`) ?? null));
    }, 350);
    return () => clearTimeout(t);
  }, [highlights, finding, doc, ws.blocks.length]);

  const go = (p: number) => {
    setPage(p);
    const box = scroller.current;
    const el = box?.querySelector<HTMLElement>(`[data-page="${p}"]`);
    if (box && el) box.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' });
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b px-5 py-3" style={{ borderColor: 'var(--panel-border)' }}>
        <FileText size={20} />
        <span className="truncate text-[15.5px] font-medium" style={{ color: 'var(--ink)' }}>
          {ws.version ? ws.version.file_name.replace(/\.docx$/i, '.pdf') : 'No document'}
        </span>
        <span className="chip" style={{ background: 'var(--panel-2)' }}>
          v{ws.version?.version_no ?? '–'} <ChevronDown size={14} />
        </span>
        <span className="ml-auto text-[14px]" style={{ color: 'var(--ink)' }}>
          Page {page} of {pages}
        </span>
        <div className="pill flex">
          <button className="grid h-8 w-9 place-items-center" onClick={() => go(Math.max(1, page - 1))} aria-label="Previous page">
            <ChevronLeft size={17} />
          </button>
          <button className="grid h-8 w-9 place-items-center border-l" style={{ borderColor: 'var(--panel-border)' }} onClick={() => go(Math.min(pages, page + 1))} aria-label="Next page">
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div ref={scroller} data-scroller className="scroll-thin relative flex-1 overflow-auto px-6 py-4" style={{ background: 'var(--panel-2)' }}>
        {doc ? (
          <div className="flex flex-col items-center gap-4">
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PdfPage key={i} doc={doc} page={i + 1} width={505} highlights={highlights} />
            ))}
          </div>
        ) : ws.blocks.length ? (
          <TextPaper blocks={ws.blocks} width={505} highlightIdx={finding?.evidence.map((e) => e.block_idx) ?? []} />
        ) : (
          <Empty title="No source loaded" detail="The source viewer shows the original or converted PDF once extraction finishes." />
        )}
      </div>
    </>
  );
}

export function DismissModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (reason: string, note: string, example: boolean) => void }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [example, setExample] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Dismiss finding">
      <p className="mb-3 text-[14px]" style={{ color: 'var(--muted)' }}>
        A reason is required. Different reasons are stored as different feedback labels; a dismissal applies to this contract only.
      </p>
      <div className="space-y-2">
        {DISMISS_REASONS.map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-[14.5px]" style={{ borderColor: reason === r ? 'var(--primary)' : 'var(--panel-border)', background: reason === r ? 'var(--selected)' : undefined }}>
            <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} /> {r}
          </label>
        ))}
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for the record" className="mt-3 h-20 w-full rounded-xl border p-3 text-[14px]" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel)' }} />
      <label className="mt-2 flex items-center gap-2 text-[13.5px]" style={{ color: 'var(--muted)' }}>
        <input type="checkbox" checked={example} onChange={(e) => setExample(e.target.checked)} /> Use as a reviewed example for future reviews in this workspace
      </label>
      <div className="mt-4 flex justify-end gap-3">
        <button className="btn-outline h-10 px-5" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary h-10 px-5" disabled={!reason} onClick={() => onSubmit(reason, note, example)}>
          Dismiss with reason
        </button>
      </div>
    </Modal>
  );
}

export function ClarifyModal({ open, question, onClose, onSubmit }: { open: boolean; question: string; onClose: () => void; onSubmit: (q: string) => void }) {
  const [q, setQ] = useState(question);
  useEffect(() => setQ(question), [question]);
  return (
    <Modal open={open} onClose={onClose} title="Request clarification">
      <p className="mb-3 text-[14px]" style={{ color: 'var(--muted)' }}>
        The question joins the list for counsel in Decision / report. Nothing is sent outside this workspace.
      </p>
      <textarea value={q} onChange={(e) => setQ(e.target.value)} className="h-28 w-full rounded-xl border p-3 text-[14.5px]" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel)' }} />
      <div className="mt-4 flex justify-end gap-3">
        <button className="btn-outline h-10 px-5" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary h-10 px-5" disabled={!q.trim()} onClick={() => onSubmit(q.trim())}>
          Add to questions
        </button>
      </div>
    </Modal>
  );
}

function HistoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ws = useWorkspace();
  const rows = [...ws.decisions].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <Modal open={open} onClose={onClose} title="Decision history" width={640}>
      {!rows.length && <p style={{ color: 'var(--muted)' }}>No decisions recorded yet.</p>}
      <ol className="space-y-3">
        {rows.map((d) => {
          const f = ws.findings.find((x) => x.id === d.finding_id);
          return (
            <li key={d.id} className="rounded-xl border px-4 py-3 text-[14px]" style={{ borderColor: 'var(--panel-border)' }}>
              <div className="flex justify-between gap-3">
                <span className="font-semibold">
                  {d.action === 'confirm' ? (d.reason === 'exception' ? 'Approved as exception' : 'Issue confirmed') : d.action === 'dismiss' ? 'Dismissed' : d.action === 'clarify' ? 'Clarification requested' : d.action === 'resolve' ? 'Resolved after revision' : 'Reopened'}
                </span>
                <span style={{ color: 'var(--muted)' }}>{fmtTime(d.created_at)}</span>
              </div>
              <div style={{ color: 'var(--muted)' }}>
                {f ? `Finding ${String(f.seq).padStart(2, '0')} · ${f.title}` : 'Finding'} · {d.actor_role}
              </div>
              {(d.reason || d.note) && <div className="mt-1">{[d.reason !== 'exception' ? d.reason : null, d.note].filter(Boolean).join(' — ')}</div>}
            </li>
          );
        })}
      </ol>
    </Modal>
  );
}

function ConfidenceModal({ open, finding, onClose }: { open: boolean; finding: FindingRow; onClose: () => void }) {
  const ws = useWorkspace();
  const p = finding.provenance;
  const st = reviewState(finding, ws.decisions);
  const agent = p.agent;
  const pct = (n?: number | null) => (n == null ? '—' : `${Math.round(n * 100)}%`);
  return (
    <Modal open={open} onClose={onClose} title="Why this finding is shown" width={600}>
      <div className="space-y-3 text-[14px]">
        <Signal title="Model score" value={p.source === 'rules' ? 'Not applicable (deterministic rule)' : `${pct(p.model_score)} · not calibrated`} detail={p.source === 'rules' ? `Rule ${p.rule}` : `Semantic reviewer ${p.model ?? ''} · prompt ${p.prompt_version ?? ''}. An uncalibrated self-estimate, not a probability of being correct.`} />
        <Signal
          title="Decision agent"
          value={agent?.needs_counsel ? `Needs counsel: ${pct(Number(agent.needs_counsel.value))} · impact ${String(agent.impact?.value ?? '—')}` : ws.version?.routing.agent === 'offline' ? 'Offline when this review ran' : 'Not run'}
          detail={agent?.needs_counsel ? `${agent.needs_counsel.field} ${pct(agent.needs_counsel.confidence)} on the ${agent.needs_counsel.checkpoint} checkpoint. Not calibrated on legal-review data; used for ordering only.` : 'Typed decisions are optional and never replace evidence checks.'}
        />
        <Signal title="Evidence check" value={finding.evidence_status === 'matched' ? `All ${finding.evidence.length} quote(s) match the source` : 'Some quotes did not match the source'} detail={finding.category === 'contradiction' ? 'Contradictions require two matched passages.' : 'Quotes are compared with the extracted source text of this version.'} />
        <Signal title="Reviewer status" value={STATE[st].label} detail="Confirming an issue does not resolve it; resolution needs a revised version." />
        <Signal title="Calibration" value="Not calibrated" detail="No labelled legal-review dataset has been evaluated for this configuration yet, so no percentage of correctness is claimed." />
      </div>
    </Modal>
  );
}

function Signal({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border px-4 py-3" style={{ borderColor: 'var(--panel-border)' }}>
      <div className="flex justify-between gap-4">
        <span className="font-semibold">{title}</span>
        <span className="text-right">{value}</span>
      </div>
      <div className="mt-1 text-[12.5px]" style={{ color: 'var(--muted)' }}>
        {detail}
      </div>
    </div>
  );
}
