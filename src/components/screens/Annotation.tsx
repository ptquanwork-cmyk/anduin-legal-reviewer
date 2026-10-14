'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, CircleDot, Eye, FileText, Info, Lock, Maximize, Minus, PenLine, Plus, SquareCheck, TextCursorInput, TriangleAlert, Trash2, ZoomIn } from 'lucide-react';
import { annotationQa, slug } from '../../digitize/fields';
import { useNav } from '../../lib/nav';
import { supabase } from '../../lib/supabase';
import type { AnnotationRow, AnnotationType, BBox } from '../../lib/types';
import { useWorkspace } from '../../lib/workspace';
import { PdfPage, usePdf } from '../pdf/PdfViewer';
import { StageStrip } from '../shell/Chrome';
import { Modal } from '../ui';
import { Empty, Fade, HeaderArt, Panel, Title } from './Screen';

export const TYPES: { id: AnnotationType; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { id: 'paragraph', label: 'Paragraph', icon: FileText, color: '#1f6bd6', bg: 'rgba(31,107,214,.08)' },
  { id: 'text_box', label: 'Text box', icon: TextCursorInput, color: '#1aa597', bg: 'rgba(26,165,151,.08)' },
  { id: 'radio', label: 'Radio box', icon: CircleDot, color: '#3557d6', bg: 'rgba(53,87,214,.07)' },
  { id: 'checkbox', label: 'Checkbox', icon: SquareCheck, color: '#8a35d6', bg: 'rgba(138,53,214,.07)' },
];
const typeOf = (t: AnnotationType) => TYPES.find((x) => x.id === t)!;

export function Annotation() {
  const nav = useNav();
  const ws = useWorkspace();
  const { doc } = usePdf('sources', ws.version?.pdf_path);
  const [local, setLocal] = useState<AnnotationRow[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [zoomPct, setZoomPct] = useState(100);
  const [draw, setDraw] = useState(false);
  const [drawType, setDrawType] = useState<AnnotationType>('text_box');
  const [qa, setQa] = useState<{ field_id: string; problem: string }[] | null>(null);
  const [compare, setCompare] = useState(false);
  const [verOpen, setVerOpen] = useState(false);

  useEffect(() => setLocal(ws.annotations), [ws.annotations]);
  const ordered = useMemo(() => [...local].sort((a, b) => a.page - b.page || a.bbox.y - b.bbox.y), [local]);
  const sel = ordered.find((a) => a.id === selId) ?? ordered.find((a) => a.type !== 'paragraph') ?? ordered[0];
  useEffect(() => {
    if (sel) setPage(sel.page);
  }, [sel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pageSizes = new Map((ws.version?.source_report as { page_sizes?: { n: number; width: number; height: number }[] })?.page_sizes?.map((p) => [p.n, p]) ?? []);
  const counts = { matched: 0, changed: 0, new: 0, uncertain: 0 } as Record<string, number>;
  for (const a of local) if (a.type !== 'paragraph') counts[a.transfer_state]++;
  const needConfirm = local.filter((a) => (a.transfer_state === 'uncertain' || a.transfer_state === 'changed') && !a.confirmed);
  const approved = !!ws.version?.annotations_approved_at;
  const pages = doc?.numPages ?? 1;
  const width = Math.round((800 * zoomPct) / 100);

  const save = async (id: string, patch: Partial<AnnotationRow>) => {
    setLocal((l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    const { error } = await supabase().from('annotations').update(patch).eq('id', id);
    if (error) nav.notify(error.message.includes('duplicate') ? 'That field ID is already used in this version.' : error.message, 'error');
    if (ws.version?.annotations_approved_at) await supabase().from('document_versions').update({ annotations_approved_at: null }).eq('id', ws.version.id);
  };

  const create = async (bbox: BBox) => {
    if (!ws.version) return;
    const block = ws.blocks.filter((b) => b.page === page && b.bbox).sort((a, b) => Math.abs(a.bbox!.y - bbox.y) - Math.abs(b.bbox!.y - bbox.y))[0];
    const base = `${slug(block?.section_title ?? 'document')}.${drawType === 'paragraph' ? 'paragraph' : 'new_field'}`;
    let id = base;
    for (let i = 2; local.some((a) => a.field_id === id); i++) id = `${base}_${i}`;
    const row = { version_id: ws.version.id, field_id: id, type: drawType, label: drawType === 'paragraph' ? (block?.section_title ?? 'Paragraph') : 'New field', options: drawType === 'radio' || drawType === 'checkbox' ? [{ value: 'option_1', label: 'Option 1', bbox }, { value: 'option_2', label: 'Option 2', bbox }] : [], page, bbox, source_block_idx: block?.idx ?? null, required: false, transfer_state: 'new', origin: 'manual', confirmed: true };
    const { data, error } = await supabase().from('annotations').insert(row).select('*').single();
    if (error) return nav.notify(error.message, 'error');
    setLocal((l) => [...l, data as AnnotationRow]);
    setSelId(data.id);
    setDraw(false);
  };

  const remove = async (a: AnnotationRow) => {
    await supabase().from('annotations').delete().eq('id', a.id);
    setLocal((l) => l.filter((x) => x.id !== a.id));
    setSelId(null);
  };

  const approve = async () => {
    const problems = annotationQa(local, pageSizes.size ? pageSizes : new Map(Array.from({ length: pages }, (_, i) => [i + 1, { width: 612, height: 792 }])));
    const blockIdx = new Set(local.map((a) => a.source_block_idx));
    const unmapped = ws.blocks.filter((b) => (b.kind === 'paragraph' || b.kind === 'list' || b.kind === 'table') && !blockIdx.has(b.idx));
    const all = [...problems, ...unmapped.slice(0, 5).map((b) => ({ field_id: `block ${b.idx}`, problem: `Source text not anchored: "${b.text.slice(0, 60)}…"` })), ...needConfirm.map((a) => ({ field_id: a.field_id, problem: 'Needs source confirmation' }))];
    if (all.length) return setQa(all);
    if (!ws.version || !ws.document) return;
    await supabase().from('document_versions').update({ annotations_approved_at: new Date().toISOString() }).eq('id', ws.version.id);
    await supabase().from('templates').insert({ family_key: ws.document.family_key, name: `${ws.document.title} v${ws.version.version_no}`, source_version_id: ws.version.id, fields: local.map(({ field_id, type, label, options, required }) => ({ field_id, type, label, options: options.map((o) => ({ value: o.value, label: o.label })), required })) });
    await ws.reload();
    nav.notify('Annotations approved and saved as a reusable template (structure only, no answers).');
    nav.go('form');
  };

  return (
    <>
      <StageStrip x={145} y={148} w={1330} />
      <Title x={168} y={216} size={54}>
        Annotation
      </Title>
      <Fade x={168} y={278}>
        <p className="text-[22px]" style={{ color: 'var(--ink)' }}>
          Anchor four field types on your document.
        </p>
      </Fade>
      <HeaderArt id="annotation" x={795} y={196} w={290} h={140} />

      <Fade x={162} y={338} w={690} h={50} className="flex gap-3">
        {TYPES.map((t) => {
          const Icon = t.icon;
          const active = draw ? drawType === t.id : sel?.type === t.id;
          return (
            <button
              key={t.id}
              onClick={() => (draw || !sel ? setDrawType(t.id) : save(sel.id, { type: t.id, options: t.id === 'radio' || t.id === 'checkbox' ? (sel.options.length ? sel.options : [{ value: 'option_1', label: 'Option 1', bbox: sel.bbox }]) : [] }))}
              className="flex h-[50px] w-[160px] items-center justify-center gap-3 rounded-[14px] border-2 text-[16px] font-medium transition-shadow"
              style={{ borderColor: t.color, color: 'var(--ink)', background: active ? t.bg : 'var(--panel)', boxShadow: active ? `0 0 0 3px ${t.bg}` : undefined }}
              title={sel && !draw ? `Change the selected region to ${t.label}` : `Draw a new ${t.label}`}
            >
              <Icon size={24} style={{ color: t.color }} /> {t.label}
            </button>
          );
        })}
      </Fade>
      <Fade x={1087} y={306} w={155} h={42}>
        <div className="relative h-full">
          <button className="pill flex h-full w-full items-center justify-center gap-2 text-[15px] font-medium" onClick={() => setVerOpen((o) => !o)}>
            <FileText size={18} /> Source v{ws.version?.version_no ?? '–'} <ChevronDown size={16} />
          </button>
          {verOpen && (
            <div className="panel absolute left-0 top-12 z-30 w-56 p-2 text-[14px]" onMouseLeave={() => setVerOpen(false)}>
              {ws.siblings.map((s) => (
                <button key={s.id} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-[var(--selected)]" onClick={() => { ws.setVersionId(s.id); setVerOpen(false); }}>
                  Source v{s.version_no} · {s.file_name}
                </button>
              ))}
            </div>
          )}
        </div>
      </Fade>
      <Fade x={1253} y={306} w={232} h={42}>
        <button className="pill flex h-full w-full items-center justify-center gap-2 text-[14.5px] font-medium disabled:opacity-60" disabled={!ws.version?.parent_id} onClick={() => setCompare(true)}>
          <FileText size={18} /> {ws.version?.parent_id ? `Compare annotations from v${(ws.version.version_no ?? 2) - 1}` : 'No earlier version'}
        </button>
      </Fade>

      <Panel i={0} x={155} y={405} w={900} h={545} className="flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b px-5 py-2.5" style={{ borderColor: 'var(--panel-border)' }}>
          <FileText size={20} />
          <button className="grid h-8 w-8 place-items-center" onClick={() => setPage(Math.max(1, page - 1))} aria-label="Previous page">
            <ChevronLeft size={18} />
          </button>
          <span className="rounded-lg border px-4 py-1 text-[14px]" style={{ borderColor: 'var(--panel-border)' }}>
            {page}
          </span>
          <span className="text-[14px]">/ {pages}</span>
          <button className="grid h-8 w-8 place-items-center" onClick={() => setPage(Math.min(pages, page + 1))} aria-label="Next page">
            <ChevronRight size={18} />
          </button>
          <span className="mx-2 h-6 w-px" style={{ background: 'var(--panel-border)' }} />
          <button onClick={() => setZoomPct(Math.max(60, zoomPct - 10))} aria-label="Zoom out">
            <Minus size={16} />
          </button>
          <span className="w-12 text-center text-[14px]">{zoomPct}%</span>
          <button onClick={() => setZoomPct(Math.min(160, zoomPct + 10))} aria-label="Zoom in">
            <Plus size={16} />
          </button>
          <div className="ml-auto flex items-center gap-4">
            <button onClick={() => setDraw((d) => !d)} className="flex items-center gap-2 rounded-full px-3 py-1 text-[13.5px]" style={draw ? { background: 'var(--primary)', color: 'var(--primary-ink)' } : { color: 'var(--ink)' }} title="Draw a new region">
              <PenLine size={17} /> {draw ? `Drawing ${typeOf(drawType).label}` : 'Draw region'}
            </button>
            <ZoomIn size={20} />
            <Maximize size={18} />
            {sel && (
              <button onClick={() => remove(sel)} aria-label="Delete selected region" title="Delete selected region">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
        <div className="scroll-thin flex-1 overflow-auto px-12 pt-2" style={{ background: 'var(--panel-2)' }}>
          {!ws.version ? (
            <Empty title="No document open" detail="Open a reviewed document to annotate it." />
          ) : !doc ? (
            <Empty title="A PDF is needed" detail="Annotation needs page geometry. Retry conversion in Source quality if the converter was offline." />
          ) : (
            <PdfPage
              doc={doc}
              page={page}
              width={width}
              className="mx-auto"
              overlay={(scale) => <Regions anns={local.filter((a) => a.page === page)} selId={sel?.id} scale={scale} draw={draw} onSelect={setSelId} onChange={save} onCreate={create} />}
            />
          )}
        </div>
      </Panel>

      <Panel i={1} x={1075} y={358} w={420} h={320} className="flex flex-col px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>
            Selected field
          </h2>
          <div className="flex items-center gap-2 text-[14px]">
            <button className="pill grid h-8 w-8 place-items-center" onClick={() => sel && setSelId(ordered[Math.max(0, ordered.indexOf(sel) - 1)]?.id)} aria-label="Previous field">
              <ChevronLeft size={16} />
            </button>
            {sel ? ordered.indexOf(sel) + 1 : 0} of {ordered.length}
            <button className="pill grid h-8 w-8 place-items-center" onClick={() => sel && setSelId(ordered[Math.min(ordered.length - 1, ordered.indexOf(sel) + 1)]?.id)} aria-label="Next field">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        {!sel ? (
          <Empty title="No regions" detail={ws.version?.routing.has_fillable && Number(ws.version.routing.has_fillable.value) < 0.3 ? 'The decision agent predicted no fillable fields. Draw regions if needed.' : 'Draw a region on the page to start.'} />
        ) : (
          <FieldProps key={sel.id} a={sel} onSave={(p) => save(sel.id, p)} sourceLabel={`Page ${sel.page} · ${ws.blocks.find((b) => b.idx === sel.source_block_idx)?.section_title ?? 'unanchored'}`} />
        )}
      </Panel>

      <Panel i={2} x={1075} y={690} w={420} h={265} className="flex flex-col px-5 py-4">
        <h2 className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>
          Transfer to form
        </h2>
        {needConfirm.length > 0 ? (
          <button className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] font-medium" style={{ background: 'var(--warn-bg)', color: 'var(--warn-ink)' }} onClick={() => setSelId(needConfirm[0].id)}>
            <TriangleAlert size={20} /> {needConfirm.length === 1 ? 'One region needs' : `${needConfirm.length} regions need`} source confirmation. <ChevronRight size={16} className="ml-auto" />
          </button>
        ) : (
          <div className="mt-2 rounded-xl px-3 py-2 text-[14px]" style={{ background: approved ? 'var(--info-bg)' : 'var(--panel-2)', color: approved ? 'var(--info-ink)' : 'var(--ink)' }}>
            {approved ? 'Approved for this version.' : 'All regions confirmed. Approval runs the annotation QA.'}
          </div>
        )}
        <div className="mt-2 space-y-1 text-[14.5px]">
          {(
            [
              ['matched', 'Matched', 'var(--mint-dark)'],
              ['changed', 'Changed', 'var(--warn-dot)'],
              ['new', 'New', 'var(--primary)'],
              ['uncertain', 'Uncertain', '#8a35d6'],
            ] as const
          ).map(([k, l, c]) => (
            <div key={k} className="flex items-center gap-3 px-1">
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: c }} /> {l}
              <span className="ml-auto font-medium">{counts[k]}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto flex gap-3">
          <button className="btn-outline flex h-[50px] flex-1 items-center justify-center gap-2 text-[16px]" onClick={() => nav.go('form')} disabled={!local.length}>
            <Eye size={20} /> Preview form
          </button>
          <button className="btn-primary flex h-[50px] flex-1 flex-col items-center justify-center text-[15px] leading-tight" disabled={!local.length || needConfirm.length > 0 || approved} onClick={approve}>
            <span className="flex items-center gap-2">
              {needConfirm.length ? <Lock size={16} /> : null} {approved ? 'Approved' : 'Approve and continue'}
            </span>
            {needConfirm.length > 0 && <span className="text-[10.5px]">Resolve uncertain regions first.</span>}
          </button>
        </div>
      </Panel>

      <Modal open={!!qa} onClose={() => setQa(null)} title="Annotation QA found problems">
        <ul className="space-y-2 text-[14px]">
          {qa?.map((p, i) => (
            <li key={i} className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--panel-border)' }}>
              <span className="font-medium">{p.field_id}</span> — {p.problem}
            </li>
          ))}
        </ul>
      </Modal>
      <Modal open={compare} onClose={() => setCompare(false)} title="Annotations compared with the earlier version" width={640}>
        <ul className="space-y-2 text-[14px]">
          {ordered.filter((a) => a.type !== 'paragraph').map((a) => (
            <li key={a.id} className="flex justify-between rounded-xl border px-3 py-2" style={{ borderColor: 'var(--panel-border)' }}>
              <span>{a.field_id}</span>
              <span className="capitalize">{a.transfer_state}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px]" style={{ color: 'var(--muted)' }}>
          Regions are matched by source text, not page numbers, so inserted pages do not break the mapping. Answers are never copied with the structure.
        </p>
      </Modal>
    </>
  );
}

function FieldProps({ a, onSave, sourceLabel }: { a: AnnotationRow; onSave: (p: Partial<AnnotationRow>) => void; sourceLabel: string }) {
  const [fid, setFid] = useState(a.field_id);
  const [label, setLabel] = useState(a.label);
  const agent = (a as AnnotationRow & { agent?: { value: string; confidence: number | null } }).agent;
  const row = 'grid grid-cols-[100px_1fr] items-center gap-2 text-[13.5px]';
  return (
    <div className="mt-2 flex flex-1 flex-col gap-1.5">
      <label className={row}>
        <span>Field ID</span>
        <input value={fid} onChange={(e) => setFid(e.target.value.replace(/[^\w.]/g, '_'))} onBlur={() => fid && fid !== a.field_id && onSave({ field_id: fid })} className="h-8 rounded-lg border px-2" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel)' }} />
      </label>
      <label className={row}>
        <span>Label</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => label !== a.label && onSave({ label })} className="h-8 rounded-lg border px-2" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel)' }} />
      </label>
      <label className={row}>
        <span>Type</span>
        <select value={a.type} onChange={(e) => onSave({ type: e.target.value as AnnotationType })} className="h-8 rounded-lg border px-2" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-2)' }}>
          {TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <div className={row}>
        <span>Source</span>
        <span className="truncate">{sourceLabel}</span>
      </div>
      {a.type !== 'paragraph' && (
        <label className={row}>
          <span>Required</span>
          <select value={a.required ? (a.confirmed ? 'yes' : 'proposed') : 'no'} onChange={(e) => onSave({ required: e.target.value !== 'no' })} className="h-8 rounded-lg border px-2" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-2)' }}>
            {!a.confirmed && <option value="proposed">proposed</option>}
            <option value="yes">yes</option>
            <option value="no">no</option>
          </select>
        </label>
      )}
      {(a.type === 'radio' || a.type === 'checkbox') && (
        <div className="text-[13px]">
          Group options: {a.options.map((o) => o.label).join(' · ') || 'none'}
        </div>
      )}
      {a.type === 'text_box' && (
        <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
          Group (for choice widgets): None (standalone field)
        </div>
      )}
      {agent && (
        <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
          Decision agent: {String(agent.value).replace('_', ' ')} · {agent.confidence != null ? `${Math.round(agent.confidence * 100)}%` : '—'} (not calibrated)
        </div>
      )}
      {(a.transfer_state === 'uncertain' || a.transfer_state === 'changed') && !a.confirmed ? (
        <button className="btn-primary mt-auto h-9 text-[14px]" onClick={() => onSave({ confirmed: true })}>
          Confirm source correspondence
        </button>
      ) : (
        <div className="mt-auto flex items-start gap-2 rounded-xl px-3 py-2 text-[12.5px]" style={{ background: 'var(--selected)' }}>
          <Info size={16} className="mt-0.5 shrink-0" fill="var(--primary)" color="var(--panel)" />
          <span>
            <b>Paragraph is content, not an answer field.</b> Use Paragraph for text, and the other field types for information to capture.
          </span>
        </div>
      )}
    </div>
  );
}

/** Region overlay in PDF points; supports select, move, corner resize and drawing new regions. */
function Regions({ anns, selId, scale, draw, onSelect, onChange, onCreate }: { anns: AnnotationRow[]; selId?: string; scale: number; draw: boolean; onSelect: (id: string) => void; onChange: (id: string, p: Partial<AnnotationRow>) => void; onCreate: (b: BBox) => void }) {
  const { zoom } = useNav();
  const [live, setLive] = useState<{ id: string; bbox: BBox } | null>(null);
  const [rubber, setRubber] = useState<BBox | null>(null);
  const layer = useRef<HTMLDivElement>(null);
  const k = scale * zoom;

  const start = (e: React.PointerEvent, a: AnnotationRow, mode: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
    e.stopPropagation();
    onSelect(a.id);
    const x0 = e.clientX;
    const y0 = e.clientY;
    const b0 = a.bbox;
    let cur = b0;
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - x0) / k;
      const dy = (ev.clientY - y0) / k;
      cur =
        mode === 'move'
          ? { ...b0, x: b0.x + dx, y: b0.y + dy }
          : {
              x: mode.includes('w') ? b0.x + dx : b0.x,
              y: mode.includes('n') ? b0.y + dy : b0.y,
              w: Math.max(8, mode.includes('w') ? b0.w - dx : b0.w + dx),
              h: Math.max(8, mode.includes('n') ? b0.h - dy : b0.h + dy),
            };
      setLive({ id: a.id, bbox: cur });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setLive(null);
      if (cur !== b0) onChange(a.id, { bbox: { x: round(cur.x), y: round(cur.y), w: round(cur.w), h: round(cur.h) } });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const drawStart = (e: React.PointerEvent) => {
    if (!draw || !layer.current) return;
    const r = layer.current.getBoundingClientRect();
    const x0 = (e.clientX - r.left) / k;
    const y0 = (e.clientY - r.top) / k;
    let box: BBox = { x: x0, y: y0, w: 0, h: 0 };
    const move = (ev: PointerEvent) => {
      const x1 = (ev.clientX - r.left) / k;
      const y1 = (ev.clientY - r.top) / k;
      box = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
      setRubber(box);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setRubber(null);
      if (box.w > 6 && box.h > 6) onCreate({ x: round(box.x), y: round(box.y), w: round(box.w), h: round(box.h) });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div ref={layer} className="absolute inset-0" style={{ cursor: draw ? 'crosshair' : undefined }} onPointerDown={drawStart}>
      {anns.map((a) => {
        const b = live?.id === a.id ? live.bbox : a.bbox;
        const t = typeOf(a.type);
        const on = a.id === selId;
        const pending = (a.transfer_state === 'uncertain' || a.transfer_state === 'changed') && !a.confirmed;
        return (
          <div
            key={a.id}
            onPointerDown={(e) => !draw && start(e, a, 'move')}
            className="absolute rounded-[4px]"
            style={{
              left: b.x * scale,
              top: b.y * scale,
              width: b.w * scale,
              height: b.h * scale,
              border: `${on ? 2 : 1.5}px ${a.type === 'paragraph' && !on ? 'dotted' : 'dashed'} ${pending ? '#8a35d6' : t.color}`,
              background: on ? 'rgba(0,104,254,.10)' : a.type === 'paragraph' ? 'transparent' : t.bg,
              opacity: a.type === 'paragraph' && !on ? 0.45 : 1,
              cursor: draw ? 'crosshair' : 'move',
            }}
            title={`${a.field_id} · ${t.label}${pending ? ' · needs confirmation' : ''}`}
          >
            {on &&
              (['nw', 'ne', 'sw', 'se'] as const).map((c) => (
                <span key={c} onPointerDown={(e) => start(e, a, c)} className="absolute h-3 w-3 border-2 bg-white" style={{ borderColor: t.color, [c.includes('n') ? 'top' : 'bottom']: -7, [c.includes('w') ? 'left' : 'right']: -7, cursor: `${c}-resize` }} />
              ))}
          </div>
        );
      })}
      {rubber && <div className="pointer-events-none absolute border-2 border-dashed" style={{ left: rubber.x * scale, top: rubber.y * scale, width: rubber.w * scale, height: rubber.h * scale, borderColor: 'var(--primary)' }} />}
    </div>
  );
}

const round = (n: number) => Math.round(n * 10) / 10;
