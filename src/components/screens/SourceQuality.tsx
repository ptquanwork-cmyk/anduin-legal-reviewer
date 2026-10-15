'use client';
import { useContext, useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, ArrowRight, ChevronDown, ChevronUp, CircleAlert, CircleCheck, Eye, Info, Loader2, Maximize, Minus, Plus, RotateCw } from 'lucide-react';
import { useNav } from '../../lib/nav';
import { PanelScale } from '../../lib/panel';
import { api, signedUrl, supabase } from '../../lib/supabase';
import type { SourceIssue } from '../../lib/types';
import { useWorkspace } from '../../lib/workspace';
import { PdfPage, scrollWithin, TextPaper, usePdf } from '../pdf/PdfViewer';
import { StageStrip } from '../shell/Chrome';
import { FileBadge, Modal } from '../ui';
import { Empty, Fade, HeaderArt, Panel, Title } from './Screen';

type Tab = 'Text' | 'Layout' | 'Fonts';

export function SourceQuality() {
  const nav = useNav();
  const ws = useWorkspace();
  const v = ws.version;
  const report = v?.source_report ?? {};
  const issues = report.issues ?? [];
  const [tab, setTab] = useState<Tab>('Text');
  const [open, setOpen] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [focusIssue, setFocusIssue] = useState<SourceIssue | null>(null);
  const [zoomL, setZoomL] = useState(100);
  const [zoomR, setZoomR] = useState(100);
  const [full, setFull] = useState<'word' | 'pdf' | null>(null);
  const [retrying, setRetrying] = useState(false);
  const { doc } = usePdf('sources', v?.pdf_path);
  const word = useDocxHtml(v?.mime.includes('word') ? v.file_path : null);

  useEffect(() => setOpen(issues[0]?.id ?? null), [v?.id, issues.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const accepted = !!v?.source_accepted_at;
  const ok = v?.source_status === 'verified' || accepted;
  const confirmable = issues.filter((i) => i.kind !== 'conversion_failed' && i.kind !== 'unreadable' && i.kind !== 'password');
  const status = !v ? null : ok ? (accepted && v.source_status !== 'verified' ? 'Accepted after manual comparison' : 'Verified') : v.source_status === 'blocked' ? 'Blocked' : 'Needs review';

  const confirm = async (id: string) => {
    const next = new Set(checked).add(id);
    setChecked(next);
    if (v && confirmable.length === issues.length && issues.every((i) => next.has(i.id))) {
      await supabase().from('document_versions').update({ source_accepted_at: new Date().toISOString() }).eq('id', v.id);
      await ws.reload();
      nav.notify('Source accepted after manual comparison. The decision is recorded on this version.');
    }
  };

  const retry = async () => {
    if (!v) return;
    setRetrying(true);
    try {
      await api(`/api/versions/${v.id}/process`, {});
      await ws.reload();
      nav.notify('Conversion and checks restarted. Earlier findings on this version are regenerated.');
    } catch (e) {
      nav.notify(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setRetrying(false);
    }
  };

  const focusPage = focusIssue?.page ?? issues.find((i) => i.page)?.page ?? 1;
  const hl = issues
    .filter((i) => i.block_idx != null)
    .map((i) => ws.blocks.find((b) => b.idx === i.block_idx))
    .filter((b): b is NonNullable<typeof b> => !!b?.bbox && b.page != null)
    .map((b) => ({ id: `b${b.idx}`, page: b.page!, bbox: b.bbox!, tone: 'warn' as const, label: issues.find((i) => i.block_idx === b.idx)?.title }));
  const focusText = (focusIssue ?? issues.find((i) => i.quote))?.quote;

  return (
    <>
      <HeaderArt id="source" x={160} y={146} w={186} h={136} />
      <Title x={373} y={156} size={52}>
        Source quality
      </Title>
      {status && (
        <Fade x={760} y={165}>
          <span className="chip h-[42px] px-4 text-[15px]" style={ok ? { background: 'var(--info-bg)', color: 'var(--info-ink)' } : v?.source_status === 'blocked' ? { background: 'var(--error-bg)', color: 'var(--error-ink)' } : { background: 'var(--warn-bg)', color: 'var(--warn-ink)' }}>
            {ok ? <CircleCheck size={20} /> : <CircleAlert size={20} fill="var(--warn-dot)" color="var(--panel)" />} {status}
          </span>
        </Fade>
      )}
      <Fade x={377} y={215} w={560}>
        <p className="text-[18px] leading-[25px]" style={{ color: 'var(--ink)' }}>
          Check the converted document for completeness and accuracy before continuing.
        </p>
      </Fade>
      <StageStrip x={140} y={290} w={1350} />

      <Panel i={0} x={145} y={350} w={1030} h={525} className="flex flex-col px-4 pb-3 pt-2">
        {!v ? (
          <Empty title="No document selected" detail="Register an original in Intake first." action={<button className="btn-primary mt-3 h-10 px-5" onClick={() => nav.go('intake')}>Go to intake</button>} />
        ) : (
          <>
            <div className="flex items-center justify-between border-b px-2" style={{ borderColor: 'var(--panel-border)' }}>
              <div className="flex gap-1" role="tablist">
                {(['Text', 'Layout', 'Fonts'] as Tab[]).map((t) => (
                  <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="relative px-6 py-3 text-[16px]" style={{ color: tab === t ? 'var(--primary)' : 'var(--ink)', fontWeight: tab === t ? 600 : 400 }}>
                    {t}
                    {tab === t && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full" style={{ background: 'var(--primary)' }} />}
                  </button>
                ))}
              </div>
              <button className="flex items-center gap-2 text-[15px]" style={{ color: 'var(--primary)' }} onClick={() => nav.go('intake')}>
                <ArrowLeftRight size={18} /> Compare related version
              </button>
            </div>
            {tab === 'Text' && (
              <div className="mt-2 grid min-h-0 flex-1 grid-cols-2 gap-3">
                <Pane
                  icon={<FileBadge mime={v.mime} size={34} />}
                  title={v.mime.includes('word') ? 'Original (Word)' : 'Original (PDF)'}
                  sub={`${v.file_name}${report.pages ? ` · ${report.pages} page(s)` : ''}`}
                  zoom={zoomL}
                  setZoom={setZoomL}
                  onFull={() => setFull('word')}
                  focus={{ text: focusText, key: `${v.id}:${!!word}:${!!doc}:${zoomL}` }}
                >
                  {v.mime.includes('word') ? (
                    word ? <WordPaper html={word} zoom={zoomL} /> : <Loader2 className="m-8 animate-spin" />
                  ) : doc ? (
                    <PdfPage doc={doc} page={focusPage} width={(450 * zoomL) / 100} highlights={hl} />
                  ) : null}
                </Pane>
                <Pane icon={<FileBadge mime="application/pdf" size={34} />} title={v.mime.includes('word') ? 'Converted (PDF)' : 'Extracted text'} sub={v.mime.includes('word') ? `${doc ? `Page ${focusPage} of ${doc.numPages} · ` : ''}${report.converted_by ?? 'not converted'}` : `${ws.blocks.length} blocks`} zoom={zoomR} setZoom={setZoomR} onFull={() => setFull('pdf')} focus={{ text: focusText, key: `${v.id}:${!!doc}:${focusPage}:${zoomR}` }}>
                  {v.mime.includes('word') ? (
                    doc ? (
                      <PdfPage doc={doc} page={focusPage} width={(450 * zoomR) / 100} highlights={hl} />
                    ) : (
                      <TextPaper blocks={ws.blocks} width={(450 * zoomR) / 100} highlightIdx={issues.map((i) => i.block_idx ?? -1)} />
                    )
                  ) : (
                    <TextPaper blocks={ws.blocks.filter((b) => (b.page ?? 1) === focusPage)} width={(450 * zoomR) / 100} />
                  )}
                </Pane>
              </div>
            )}
            {tab === 'Layout' && (
              <div className="scroll-thin mt-3 flex min-h-0 flex-1 gap-4 overflow-auto p-2">
                {doc ? Array.from({ length: doc.numPages }, (_, i) => <PdfPage key={i} doc={doc} page={i + 1} width={300} highlights={hl} className="shrink-0" />) : <Empty title="No converted PDF" detail="Layout checks need a PDF with page geometry." />}
              </div>
            )}
            {tab === 'Fonts' && <Fonts declared={report.declared_fonts ?? []} embedded={report.embedded_fonts ?? []} />}
          </>
        )}
      </Panel>

      <Panel i={1} x={1185} y={350} w={305} h={525} className="scroll-thin flex flex-col gap-3 overflow-auto p-3">
        <h2 className="px-1 text-[21px] font-semibold" style={{ color: 'var(--ink)' }}>
          Issues
        </h2>
        {v && !issues.length && (
          <div className="rounded-2xl p-3 text-[14px]" style={{ background: 'var(--info-bg)', color: 'var(--info-ink)' }}>
            No conversion or extraction issues were detected.
          </div>
        )}
        {issues.map((i) => {
          const isOpen = open === i.id;
          // A warning (e.g. a font substituted while the text is identical) is a note: nothing to confirm.
          const note = i.severity === 'warning';
          const done = checked.has(i.id) || accepted || note;
          return (
            <div key={i.id} className="rounded-2xl border p-3" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel)' }}>
              <button className="flex w-full items-start gap-2 text-left" onClick={() => setOpen(isOpen ? null : i.id)} aria-expanded={isOpen}>
{note ? <Info size={26} className="shrink-0" fill="var(--primary)" color="var(--panel)" /> : done ? <CircleCheck size={26} className="shrink-0" style={{ color: 'var(--mint-dark)' }} /> : <CircleAlert size={26} className="shrink-0" fill="#e5383b" color="#fff" />}
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold leading-[20px]" style={{ color: 'var(--ink)' }}>
                    {i.page ? `Page ${i.page} · ` : ''}
                    {i.title}
                  </span>
                  <span className="block text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>
                    {note ? 'Note · no action needed' : done ? 'Manual comparison recorded' : i.kind === 'conversion_failed' ? 'Retry required' : 'Manual comparison required'}
                  </span>
                </span>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {isOpen && (
                <div className="mt-2">
                  <p className="text-[12px] leading-[16px]" style={{ color: 'var(--muted)' }}>
                    {i.detail}
                  </p>
                  {i.quote && (
                    <div className="paper mt-2 rounded-lg px-3 py-1.5 font-[family-name:var(--font-paper)] text-[12.5px] leading-[17px]" style={{ background: 'var(--highlight)' }}>
                      {i.quote}
                    </div>
                  )}
                  {i.kind !== 'conversion_failed' && (
                    <button className="btn-outline mt-2 flex h-9 w-full items-center justify-center gap-2 text-[13.5px]" onClick={() => setFocusIssue(i)}>
                      <Eye size={18} /> View source region
                    </button>
                  )}
                  {!done && i.kind !== 'conversion_failed' && i.kind !== 'unreadable' && i.kind !== 'password' && (
                    <button className="btn-outline mt-2 h-9 w-full text-[13.5px]" onClick={() => confirm(i.id)}>
                      Confirm manual comparison
                    </button>
                  )}
                  {!note && (
                    <button className="btn-primary mt-2 flex h-9 w-full items-center justify-center gap-2 text-[13.5px]" onClick={retry} disabled={retrying || ws.job?.status === 'running'}>
                      {retrying ? <Loader2 size={18} className="animate-spin" /> : <RotateCw size={18} />} Retry conversion
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {v && (
          <div className="rounded-2xl border p-3" style={{ borderColor: 'var(--panel-border)' }}>
            <div className="flex items-start gap-2">
              <Info size={24} className="shrink-0" fill="var(--primary)" color="var(--panel)" />
              <div>
                <div className="text-[16px] font-semibold" style={{ color: 'var(--ink)' }}>
                  Extraction coverage
                </div>
                <div className="text-[15px]" style={{ color: 'var(--ink)' }}>
                  {report.coverage ? `${report.coverage.read_pages} of ${report.coverage.total_pages} pages read` : 'Not measured'}
                </div>
                <p className="mt-1 text-[12.5px] leading-[17px]" style={{ color: 'var(--muted)' }}>
                  {report.coverage
                    ? `${report.blocks ?? 0} text blocks with page anchors.${report.coverage.unread_pages.length ? ` Unread pages: ${report.coverage.unread_pages.join(', ')} (no OCR in this build).` : ''} Coverage counts readable pages; it is not a legal review result.`
                    : 'Full extraction coverage could not be measured because no PDF geometry is available.'}
                </p>
                {(report.limitations ?? []).slice(0, 2).map((l) => (
                  <p key={l} className="mt-1 text-[12px]" style={{ color: 'var(--warn-ink)' }}>
                    {l}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </Panel>

      <Fade i={2} x={140} y={885} w={1350} h={68}>
        <div className="flex h-full items-center gap-4 rounded-[22px] border px-5" style={ok ? { background: 'var(--info-bg)', borderColor: 'transparent' } : { background: 'var(--error-bg)', borderColor: 'var(--error-line)' }}>
          {ok ? <CircleCheck size={30} style={{ color: 'var(--mint-dark)' }} /> : <CircleAlert size={30} fill="#e5383b" color="#fff" />}
          <div className="flex-1">
            <div className="text-[17px] font-semibold" style={{ color: ok ? 'var(--info-ink)' : 'var(--error-ink)' }}>
              {ok ? 'Source ready for review' : 'Resolve source issues before review'}
            </div>
            <div className="text-[14px]" style={{ color: 'var(--ink)' }}>
              {ok ? 'Source quality is recorded on this version. Legal review is a separate check.' : 'Please address the issues above or retry conversion to continue.'}
            </div>
          </div>
          <button className="btn-primary flex h-[44px] w-[282px] items-center justify-center gap-2 text-[16px]" disabled={!ok} onClick={() => nav.go('map')}>
            Continue to document map <ArrowRight size={18} />
          </button>
        </div>
      </Fade>

      <Modal open={!!full} onClose={() => setFull(null)} title={full === 'word' ? 'Original' : 'Converted PDF'} width={900}>
        <div className="flex flex-col items-center gap-4">
          {full === 'word' && word && v?.mime.includes('word') ? <div className="paper docx-html w-full px-10 py-8" dangerouslySetInnerHTML={{ __html: word }} /> : doc && Array.from({ length: doc.numPages }, (_, i) => <PdfPage key={i} doc={doc} page={i + 1} width={760} highlights={hl} />)}
        </div>
      </Modal>
      <Modal open={!!focusIssue} onClose={() => setFocusIssue(null)} title={`Source region · ${focusIssue?.title ?? ''}`} width={820}>
        {doc && focusIssue?.page ? <PdfPage doc={doc} page={focusIssue.page} width={740} highlights={hl} /> : <p style={{ color: 'var(--muted)' }}>{focusIssue?.quote}</p>}
      </Modal>
    </>
  );
}

const norm = (t: string) => t.replace(/[s ]+/g, ' ').trim();

function Pane({ icon, title, sub, zoom, setZoom, onFull, focus, children }: { icon: React.ReactNode; title: string; sub: string; zoom: number; setZoom: (z: number) => void; onFull: () => void; focus?: { text?: string; key: string }; children: React.ReactNode }) {
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let tries = 0;
    const t = setInterval(() => {
      const box = body.current;
      if (!box || tries++ > 40) return clearInterval(t);
      let el = box.querySelector<HTMLElement>('[data-highlight]');
      if (!el && focus?.text) {
        const needle = norm(focus.text).slice(0, 48);
        el = [...box.querySelectorAll<HTMLElement>('p')].find((p) => norm(p.textContent ?? '').includes(needle)) ?? null;
        el?.classList.add('source-focus');
      }
      if (!el) return;
      clearInterval(t);
      scrollWithin(box, el);
    }, 150);
    return () => clearInterval(t);
  }, [focus?.key, focus?.text]);
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--panel-border)' }}>
      <div className="flex items-center gap-3 px-4 py-3">
        {icon}
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-medium" style={{ color: 'var(--ink)' }}>
            {title}
          </div>
          <div className="truncate text-[12.5px]" style={{ color: 'var(--muted)' }}>
            {sub}
          </div>
        </div>
        <button className="pill grid h-8 w-8 place-items-center" onClick={() => setZoom(Math.max(50, zoom - 10))} aria-label="Zoom out">
          <Minus size={16} />
        </button>
        <span className="w-12 text-center text-[13px]">{zoom}%</span>
        <button className="pill grid h-8 w-8 place-items-center" onClick={() => setZoom(Math.min(200, zoom + 10))} aria-label="Zoom in">
          <Plus size={16} />
        </button>
        <button className="pill grid h-8 w-8 place-items-center" onClick={onFull} aria-label="Full screen">
          <Maximize size={15} />
        </button>
      </div>
      <div ref={body} className="scroll-thin relative min-h-0 flex-1 overflow-auto px-3 pb-3" style={{ background: 'var(--panel-2)' }}>
        {children}
      </div>
    </div>
  );
}

function Fonts({ declared, embedded }: { declared: string[]; embedded: string[] }) {
  const key = (f: string) => f.replace(/[-,](regular|bold|italic|bolditalic)$/i, '').replace(/[\s_-]/g, '').toLowerCase();
  const emb = new Set(embedded.map(key));
  return (
    <div className="scroll-thin mt-3 grid min-h-0 flex-1 grid-cols-2 gap-6 overflow-auto p-2 text-[14px]">
      <div>
        <h3 className="mb-2 font-semibold">Declared in the original</h3>
        {declared.length ? declared.map((f) => (
          <div key={f} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: emb.has(key(f)) ? 'var(--info-bg)' : 'var(--warn-bg)' }}>
            <span>{f}</span>
            <span className="text-[12.5px]">{emb.has(key(f)) ? 'Embedded' : 'Substituted'}</span>
          </div>
        )) : <p style={{ color: 'var(--muted)' }}>Not available for PDF inputs.</p>}
      </div>
      <div>
        <h3 className="mb-2 font-semibold">Embedded in the PDF</h3>
        {embedded.map((f) => (
          <div key={f} className="rounded-xl px-3 py-2" style={{ background: 'var(--panel-2)' }}>
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

const ALLOWED = new Set(['P', 'STRONG', 'EM', 'B', 'I', 'U', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BR', 'SUP', 'SUB', 'SPAN', 'A', 'IMG']);

/** Contract files are untrusted: keep only structural tags, safe links and inline data images. */
function sanitize(html: string) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild!;
  for (const el of [...root.querySelectorAll('*')]) {
    if (!ALLOWED.has(el.tagName)) {
      el.replaceWith(...el.childNodes);
      continue;
    }
    for (const attr of [...el.attributes]) {
      const keep = (attr.name === 'href' && /^(https?:|mailto:|#)/i.test(attr.value)) || (attr.name === 'src' && /^data:image\/(png|jpe?g|gif);/i.test(attr.value)) || attr.name === 'colspan' || attr.name === 'rowspan';
      if (!keep) el.removeAttribute(attr.name);
    }
    if (el.tagName === 'A') el.setAttribute('rel', 'noopener noreferrer nofollow');
  }
  return root.innerHTML;
}

/** Renders the Word original in the browser (approximate HTML view of the source; the file is unchanged). */
function useDocxHtml(path: string | null) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    setHtml(null);
    if (!path) return;
    let live = true;
    (async () => {
      const url = await signedUrl('sources', path);
      const buf = await (await fetch(url)).arrayBuffer();
      const mammoth = (await import('mammoth')).default;
      const res = await mammoth.convertToHtml({ arrayBuffer: buf });
      if (live) setHtml(sanitize(res.value));
    })().catch(() => live && setHtml('<p>Could not render the Word file in the browser.</p>'));
    return () => {
      live = false;
    };
  }, [path]);
  return html;
}

/** Sanitised Word HTML at the pane zoom, grown with the panel when it is opened full screen (like the PDF beside it). */
function WordPaper({ html, zoom }: { html: string; zoom: number }) {
  const scale = useContext(PanelScale);
  return <div className="paper docx-html px-8 py-6" style={{ zoom: (zoom / 100) * scale }} dangerouslySetInnerHTML={{ __html: html }} />;
}
