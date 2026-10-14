'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { diffArrays } from 'diff';
import { ArrowRight, CircleCheck, CloudUpload, FileText, Globe, History, Info, Loader2, Lock, MoreVertical, Pencil, RotateCw, TriangleAlert } from 'lucide-react';
import { useNav } from '../../lib/nav';
import { api, supabase } from '../../lib/supabase';
import type { DuplicateCandidate, JobStep } from '../../lib/types';
import { ACCEPT, demoFile, uploadSource } from '../../lib/upload';
import { useWorkspace } from '../../lib/workspace';
import { StageStrip } from '../shell/Chrome';
import { FileBadge, fmtTime, Modal } from '../ui';
import { Fade, HeaderArt, Panel, Title } from './Screen';

export function Intake() {
  const nav = useNav();
  const ws = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [all, setAll] = useState(false);
  const [compare, setCompare] = useState<DuplicateCandidate | null>(null);

  const upload = async (file: File | null, label: string) => {
    setBusy(label);
    try {
      const f = file ?? (await demoFile());
      const res = await uploadSource(f);
      ws.setVersionId(res.versionId);
      if (res.duplicateOf) nav.notify('Exact duplicate of an earlier upload. The existing record was opened and not processed again.');
      await ws.reloadRecent();
    } catch (e) {
      nav.notify(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const v = ws.version;
  const steps: JobStep[] = ws.job?.steps ?? [];
  const running = ws.job?.status === 'running' || ws.job?.status === 'queued';
  const related = (v?.source_report?.duplicates ?? []).filter((d) => d.version_id !== v?.id);

  return (
    <>
      <HeaderArt id="intake" x={160} y={140} w={225} h={150} />
      <Title x={414} y={168}>
        Intake
      </Title>
      <Fade x={414} y={240}>
        <p className="text-[26px]" style={{ color: 'var(--ink)' }}>
          Start from an original document.
        </p>
      </Fade>
      <StageStrip x={414} y={292} w={1078} />

      <Panel i={0} x={145} y={350} w={705} h={415} className="p-[22px]">
        <div
          className="flex h-full flex-col items-center justify-center rounded-[18px] text-center transition-colors"
          style={{ border: `2px dashed ${drag ? 'var(--primary)' : 'var(--brand-blue)'}`, background: drag ? 'var(--selected)' : 'var(--panel-2)' }}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f) upload(f, 'drop');
          }}
        >
          {busy ? <Loader2 size={64} className="animate-spin" style={{ color: 'var(--primary)' }} /> : <CloudUpload size={78} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />}
          <p className="mt-4 text-[22px] font-semibold" style={{ color: 'var(--ink)' }}>
            {busy ? 'Uploading and registering…' : 'Drop a PDF or Word file'}
          </p>
          <p className="mt-1 text-[16px]" style={{ color: 'var(--muted)' }}>
            Supports .pdf and .docx
          </p>
          <div className="mt-8 flex gap-4">
            <button className="btn-primary flex h-[48px] w-[210px] items-center justify-center gap-3 text-[17px]" onClick={() => input.current?.click()} disabled={!!busy}>
              <FileText size={20} /> Choose file
            </button>
            <button className="btn-outline h-[48px] w-[130px] text-[16px]" onClick={() => upload(null, 'demo')} disabled={!!busy}>
              Use demo
            </button>
          </div>
          <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'file')} />
        </div>
      </Panel>

      <Panel i={1} x={863} y={350} w={627} h={415} className="flex flex-col px-6 py-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[19px] font-semibold" style={{ color: 'var(--ink)' }}>
            Document details
          </h2>
          {v && (
            <button className="flex items-center gap-2 text-[15px]" style={{ color: 'var(--primary)' }} onClick={() => api(`/api/versions/${v.id}/process`, {}).then(() => ws.reload()).catch((e) => nav.notify(String(e.message), 'error'))} disabled={running}>
              {running ? <Loader2 size={18} className="animate-spin" /> : <History size={18} />} {running ? 'Processing' : ws.job?.status === 'failed' || ws.job?.status === 'offline' ? 'Resume job' : 'Re-run checks'}
            </button>
          )}
        </div>
        {!v ? (
          <p className="mt-6 text-[15px]" style={{ color: 'var(--muted)' }}>
            Upload an original or choose a recent document. The original is stored unchanged and every later step refers to its version.
          </p>
        ) : (
          <>
            <div className="mt-3 flex items-center gap-4 border-b pb-4" style={{ borderColor: 'var(--panel-border)' }}>
              <span className="grid h-[68px] w-[60px] place-items-center rounded-xl shadow-sm" style={{ background: 'var(--panel-2)' }}>
                <FileBadge mime={v.mime} size={38} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[19px] font-semibold" style={{ color: 'var(--ink)' }}>
                  <span className="truncate">{v.file_name}</span> <Pencil size={16} />
                </div>
                <div className="text-[15px]" style={{ color: 'var(--muted)' }}>
                  Original · v{v.version_no}
                </div>
                <div className="mt-2 flex gap-2">
                  <span className="chip" style={{ background: 'var(--panel-2)', color: 'var(--ink)' }}>
                    <Globe size={14} /> {v.language === 'vi' ? 'Vietnamese' : v.language === 'en' ? 'English' : 'Detecting…'}
                  </span>
                  <span className="chip" style={{ background: 'var(--panel-2)', color: 'var(--ink)' }}>
                    <Lock size={14} /> Private workspace
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
              Job status
            </div>
            <ol className="scroll-thin mt-1 flex-1 overflow-auto pr-1">
              {steps.map((s, i) => (
                <li key={s.key} className="relative flex gap-3 py-[5px]">
                  {i < steps.length - 1 && <span className="absolute left-[11px] top-[26px] h-[calc(100%-14px)] w-px" style={{ background: 'var(--panel-border)' }} />}
                  <StepDot status={s.status} />
                  <div className="min-w-0">
                    <div className="text-[14.5px] font-medium" style={{ color: 'var(--ink)' }}>
                      {s.label}
                      {s.status === 'queued' && ' queued'}
                      {s.status === 'offline' && ' · offline'}
                      {s.status === 'skipped' && ' · skipped'}
                    </div>
                    {s.detail && (
                      <div className="truncate text-[12.5px]" style={{ color: 'var(--muted)' }} title={s.detail}>
                        {s.detail}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-2 flex items-start gap-3 rounded-2xl px-4 py-2.5" style={{ background: 'var(--selected)' }}>
              <Info size={20} className="mt-0.5 shrink-0" fill="var(--primary)" color="var(--panel)" />
              <div>
                <div className="text-[14.5px] font-semibold" style={{ color: 'var(--ink)' }}>
                  Original file retained unchanged.
                </div>
                <div className="text-[12.5px]" style={{ color: 'var(--muted)' }}>
                  SHA-256 {v.sha256.slice(0, 16)}… · {(v.size_bytes / 1024).toFixed(0)} KB
                </div>
              </div>
            </div>
          </>
        )}
      </Panel>

      <Panel i={2} x={143} y={778} w={632} h={172} className="px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>
            Recent documents
          </h2>
          <button className="text-[14px]" style={{ color: 'var(--primary)' }} onClick={() => setAll(true)}>
            View all
          </button>
        </div>
        <RecentTable rows={ws.recent.slice(0, 2)} />
      </Panel>

      <Panel i={3} x={787} y={778} w={703} h={128} className="px-5 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold" style={{ color: 'var(--ink)' }}>
              Possible related version
            </h2>
            <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
              Compare before reuse.
            </p>
          </div>
          {related.length > 1 && (
            <span className="text-[14px]" style={{ color: 'var(--primary)' }}>
              {related.length} matches
            </span>
          )}
        </div>
        <div className="mt-2 grid grid-cols-[1fr_70px_150px_120px_150px] items-center gap-2 rounded-xl px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wide" style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>
          <span>Name</span>
          <span>Version</span>
          <span>Uploaded</span>
          <span>Details</span>
          <span />
        </div>
        {related.length ? (
          <div className="grid grid-cols-[1fr_70px_150px_120px_150px] items-center gap-2 px-3 py-1.5 text-[13.5px]" style={{ color: 'var(--ink)' }}>
            <span className="flex min-w-0 items-center gap-2">
              <FileBadge mime={related[0].file_name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'docx'} size={24} />
              <span className="truncate">{related[0].file_name}</span>
            </span>
            <span>v{related[0].version_no}</span>
            <span>{fmtTime(related[0].created_at)}</span>
            <span>{related[0].kind === 'exact' ? 'Identical file' : `Similar content (${Math.round(related[0].score * 100)}%)`}</span>
            <button className="btn-outline h-9 text-[13.5px]" onClick={() => setCompare(related[0])}>
              Open comparison
            </button>
          </div>
        ) : (
          <p className="px-3 py-2 text-[13.5px]" style={{ color: 'var(--muted)' }}>
            {v ? (running ? 'Duplicate lookup in progress…' : 'No related versions found in your workspace.') : 'Shown after a document is registered.'}
          </p>
        )}
      </Panel>

      <Fade i={4} x={1237} y={925} w={265} h={48}>
        <button className="btn-primary flex h-full w-full items-center justify-center gap-2 text-[17px] shadow-[0_10px_20px_rgba(0,104,254,.3)]" disabled={!v} onClick={() => nav.go('source')}>
          Continue to source quality <ArrowRight size={20} />
        </button>
      </Fade>

      <Modal open={all} onClose={() => setAll(false)} title="All documents" width={760}>
        <RecentTable rows={ws.recent} onPick={() => setAll(false)} />
      </Modal>
      <CompareModal candidate={compare} onClose={() => setCompare(null)} />
    </>
  );
}

function StepDot({ status }: { status: JobStep['status'] }) {
  if (status === 'done') return <CircleCheck size={23} className="shrink-0" fill="var(--primary)" color="var(--panel)" />;
  if (status === 'running') return <Loader2 size={23} className="shrink-0 animate-spin" style={{ color: 'var(--primary)' }} />;
  if (status === 'failed' || status === 'offline') return <TriangleAlert size={23} className="shrink-0" style={{ color: status === 'failed' ? 'var(--error-ink)' : 'var(--warn-dot)' }} />;
  return <span className="mt-0.5 h-[22px] w-[22px] shrink-0 rounded-full border-2" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel)', opacity: status === 'skipped' ? 0.5 : 1 }} />;
}

function RecentTable({ rows, onPick }: { rows: ReturnType<typeof useWorkspace>['recent']; onPick?: () => void }) {
  const ws = useWorkspace();
  const statusOf = (s: string, src: string | null) =>
    s === 'processing' || s === 'extracted' ? { label: 'Checks running', dot: 'var(--warn-dot)' } : src === 'blocked' ? { label: 'Source blocked', dot: 'var(--error-ink)' } : src === 'needs_review' ? { label: 'Source check pending', dot: 'var(--warn-dot)' } : { label: 'Ready to inspect', dot: 'var(--mint-dark)' };
  return (
    <div className="mt-2">
      <div className="grid grid-cols-[1fr_70px_150px_170px_24px] gap-2 rounded-xl px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>
        <span>Name</span>
        <span>Version</span>
        <span>Uploaded</span>
        <span>Status</span>
        <span />
      </div>
      {rows.length === 0 && (
        <p className="px-3 py-3 text-[13.5px]" style={{ color: 'var(--muted)' }}>
          No documents yet.
        </p>
      )}
      {rows.map((r) => {
        const st = statusOf(r.status, r.source_status);
        return (
          <button
            key={r.id}
            onClick={() => {
              ws.setVersionId(r.id);
              onPick?.();
            }}
            className="grid w-full grid-cols-[1fr_70px_150px_170px_24px] items-center gap-2 rounded-xl px-3 py-2 text-left text-[13.5px] hover:bg-[var(--selected)]"
            style={{ color: 'var(--ink)', background: r.id === ws.versionId ? 'var(--selected)' : undefined }}
          >
            <span className="flex min-w-0 items-center gap-2">
              <FileBadge mime={r.mime} size={24} />
              <span className="truncate">{r.file_name}</span>
            </span>
            <span>v{r.version_no}</span>
            <span>{fmtTime(r.created_at)}</span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: st.dot }} /> {st.label}
            </span>
            <MoreVertical size={16} />
          </button>
        );
      })}
    </div>
  );
}

function CompareModal({ candidate, onClose }: { candidate: DuplicateCandidate | null; onClose: () => void }) {
  const ws = useWorkspace();
  const nav = useNav();
  const [other, setOther] = useState<string[] | null>(null);
  useEffect(() => {
    setOther(null);
    if (!candidate) return;
    supabase()
      .from('source_blocks')
      .select('text')
      .eq('version_id', candidate.version_id)
      .order('idx')
      .then(({ data }) => setOther((data ?? []).map((b) => b.text)));
  }, [candidate]);
  const parts = useMemo(() => (other ? diffArrays(other, ws.blocks.map((b) => b.text)) : []), [other, ws.blocks]);
  const changed = parts.filter((p) => p.added || p.removed).reduce((s, p) => s + p.count, 0);

  const link = async () => {
    if (!candidate || !ws.version) return;
    const { data: max } = await supabase().from('document_versions').select('version_no').eq('document_id', candidate.document_id).order('version_no', { ascending: false }).limit(1).single();
    const { error } = await supabase()
      .from('document_versions')
      .update({ document_id: candidate.document_id, version_no: (max?.version_no ?? 0) + 1, parent_id: candidate.version_id })
      .eq('id', ws.version.id);
    if (error) nav.notify(error.message, 'error');
    else {
      nav.notify('Linked as a new version. Changed blocks still need review; nothing was reused automatically.');
      await ws.reload();
      await ws.reloadRecent();
      onClose();
    }
  };

  return (
    <Modal open={!!candidate} onClose={onClose} title={`Compare with ${candidate?.file_name ?? ''}`} width={860}>
      {!other ? (
        <Loader2 className="mx-auto animate-spin" />
      ) : (
        <>
          <p className="mb-3 text-[14px]" style={{ color: 'var(--muted)' }}>
            {changed ? `${changed} block(s) differ. Similar content is a candidate only; changed and dependent clauses must be reviewed again.` : 'All extracted blocks match. Layout and annotation positions must still be checked.'}
          </p>
          <div className="scroll-thin max-h-[52vh] overflow-auto rounded-xl border p-3 text-[13.5px]" style={{ borderColor: 'var(--panel-border)' }}>
            {parts.map((p, i) =>
              p.value.map((t, j) => (
                <p key={`${i}-${j}`} className="rounded px-2 py-1" style={p.added ? { background: 'var(--info-bg)', color: 'var(--info-ink)' } : p.removed ? { background: 'var(--error-bg)', color: 'var(--error-ink)', textDecoration: 'line-through' } : { color: 'var(--muted)' }}>
                  {p.added ? '+ ' : p.removed ? '− ' : '  '}
                  {t}
                </p>
              )),
            )}
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button className="btn-outline h-10 px-5" onClick={onClose}>
              Keep separate
            </button>
            {candidate && candidate.document_id !== ws.version?.document_id && (
              <button className="btn-primary flex h-10 items-center gap-2 px-5" onClick={link}>
                <RotateCw size={16} /> Treat as new version
              </button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
