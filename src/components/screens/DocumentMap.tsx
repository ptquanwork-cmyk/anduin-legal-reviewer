'use client';
import { useContext, useMemo, useState } from 'react';
import { ReactFlow, Handle, Position, BaseEdge, EdgeLabelRenderer, getBezierPath, type Edge as RFEdge, type Node as RFNode, type NodeProps, type EdgeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowUpRight, ChevronRight, FileText, ListFilter, ShieldCheck, TriangleAlert, Wallet, Clock3, Users, X, ExternalLink } from 'lucide-react';
import { useNav } from '../../lib/nav';
import { PanelScale } from '../../lib/panel';
import type { BlockRow } from '../../lib/types';
import { useWorkspace } from '../../lib/workspace';
import { PdfPage, usePdf } from '../pdf/PdfViewer';
import { StageStrip } from '../shell/Chrome';
import { CATEGORY, Modal } from '../ui';
import { Empty, Fade, HeaderArt, Panel, Title } from './Screen';

type Tab = 'Outline' | 'Relationships' | 'Page map';

interface Section {
  ref: string;
  title: string;
  label: string;
  page: number | null;
  blocks: BlockRow[];
}

export function DocumentMap() {
  const nav = useNav();
  const ws = useWorkspace();
  const [tab, setTab] = useState<Tab>('Relationships');
  const [sel, setSel] = useState<string | null>(null);
  const [filter, setFilter] = useState<'References' | 'Definitions' | 'Proposed findings'>('References');
  const [source, setSource] = useState<BlockRow | null>(null);
  const { doc } = usePdf('sources', ws.version?.pdf_path);

  const sections = useMemo<Section[]>(() => {
    const map = new Map<string, Section>();
    for (const b of ws.blocks) {
      if (!b.section_ref) continue;
      const s = map.get(b.section_ref) ?? { ref: b.section_ref, title: b.section_title ?? 'Section', label: refLabel(b.section_ref), page: b.page, blocks: [] };
      if (b.kind !== 'heading') s.blocks.push(b);
      map.set(b.section_ref, s);
    }
    return [...map.values()];
  }, [ws.blocks]);

  const findingsBySection = useMemo(() => {
    const m = new Map<string, typeof ws.findings>();
    for (const f of ws.findings)
      for (const e of f.evidence) {
        const ref = ws.blocks.find((b) => b.idx === e.block_idx)?.section_ref;
        if (ref) m.set(ref, [...(m.get(ref) ?? []).filter((x) => x.id !== f.id), f]);
      }
    return m;
  }, [ws.findings, ws.blocks]);

  const conflictRef = ws.edges.find((e) => e.relation === 'proposed_conflict')?.from_ref;
  const selected = sections.find((s) => s.ref === sel) ?? sections.find((s) => s.ref === conflictRef) ?? sections.find((s) => findingsBySection.has(s.ref)) ?? sections[0];

  return (
    <>
      <StageStrip x={140} y={158} w={1350} />
      <HeaderArt id="map" x={158} y={226} w={170} h={134} />
      <Title x={342} y={236} size={48}>
        Document map
      </Title>
      <Fade x={344} y={293}>
        <p className="text-[21px]" style={{ color: 'var(--ink)' }}>
          See how sections relate, and review exact sources.
        </p>
      </Fade>
      <Fade x={342} y={336} w={425} h={42} keep>
        <div className="pill flex h-full items-center p-1" role="tablist">
          {(['Outline', 'Relationships', 'Page map'] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="h-full flex-1 rounded-full text-[15.5px] font-medium transition-colors" style={tab === t ? { background: 'var(--primary)', color: 'var(--primary-ink)' } : { color: 'var(--ink)' }}>
              {t}
            </button>
          ))}
        </div>
      </Fade>

      <Panel i={0} x={137} y={388} w={308} h={560} className="flex flex-col p-4">
        <div className="mb-2 flex items-center justify-between px-2">
          <h2 className="text-[18px] font-semibold" style={{ color: 'var(--ink)' }}>
            Document outline
          </h2>
          <span className="pill grid h-9 w-9 place-items-center">
            <ListFilter size={18} />
          </span>
        </div>
        <div className="scroll-thin flex-1 space-y-2 overflow-auto pr-1">
          {!sections.length && <Empty title="No sections yet" detail={ws.version ? 'Sections appear after extraction finishes.' : 'Open a document first.'} />}
          {sections.map((s, i) => {
            const on = s.ref === selected?.ref;
            return (
              <button key={s.ref} onClick={() => setSel(s.ref)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors" style={{ background: on ? 'var(--selected)' : 'var(--panel-2)' }}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px] font-semibold" style={on ? { background: 'var(--primary)', color: 'var(--primary-ink)' } : { background: 'var(--panel)', color: 'var(--ink)' }}>
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-medium" style={{ color: on ? 'var(--primary)' : 'var(--ink)' }}>
                    {s.title}
                  </span>
                  <span className="text-[12.5px]" style={{ color: 'var(--muted)' }}>
                    Page {s.page ?? '–'}
                    {findingsBySection.get(s.ref)?.length ? ` · ${findingsBySection.get(s.ref)!.length} finding(s)` : ''}
                  </span>
                </span>
                <ChevronRight size={18} style={{ color: 'var(--muted)' }} />
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel i={1} x={455} y={388} w={600} h={560} className="flex flex-col overflow-hidden p-5">
        {tab === 'Relationships' && (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[19px] font-semibold" style={{ color: 'var(--ink)' }}>
                  Section relationships
                </h2>
                <p className="text-[14.5px]" style={{ color: 'var(--muted)' }}>
                  How key sections connect in this document.
                </p>
              </div>
              <div className="rounded-xl border px-4 py-1.5 text-[13px]" style={{ borderColor: 'var(--panel-border)', color: 'var(--ink)' }}>
                <div className="flex items-center gap-3">
                  <span className="h-px w-10" style={{ background: 'var(--muted)' }} /> Parsed
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-10 border-t-2 border-dashed" style={{ borderColor: 'var(--muted)' }} /> Proposed
                </div>
              </div>
            </div>
            <Graph sections={sections} findingsBySection={findingsBySection} selected={selected?.ref} onSelect={setSel} />
          </>
        )}
        {tab === 'Outline' && selected && (
          <div className="scroll-thin flex-1 overflow-auto">
            <h2 className="text-[19px] font-semibold" style={{ color: 'var(--ink)' }}>
              {selected.title}
            </h2>
            <p className="mb-3 text-[14px]" style={{ color: 'var(--muted)' }}>
              Full source text of this section; nothing is summarised away.
            </p>
            {selected.blocks.map((b) => (
              <button key={b.id} onClick={() => setSource(b)} className="paper mb-2 block w-full rounded-xl px-4 py-3 text-left font-[family-name:var(--font-paper)] text-[15px] hover:outline hover:outline-2 hover:outline-[var(--primary)]">
                {b.text}
                <span className="mt-1 block font-[family-name:var(--font-sans)] text-[12px]" style={{ color: 'var(--primary)' }}>
                  Page {b.page ?? '–'} · {selected.label}
                </span>
              </button>
            ))}
          </div>
        )}
        {tab === 'Page map' && (
          <div className="scroll-thin flex flex-1 flex-wrap content-start gap-5 overflow-auto">
            {doc ? (
              Array.from({ length: doc.numPages }, (_, i) => (
                <div key={i}>
                  <PdfPage
                    doc={doc}
                    page={i + 1}
                    width={250}
                    highlights={[
                      ...ws.findings.flatMap((f) => f.evidence.filter((e) => e.bbox && e.page).map((e, j) => ({ id: `${f.id}-${j}`, page: e.page!, bbox: e.bbox!, tone: f.category === 'contradiction' ? ('error' as const) : ('warn' as const) }))),
                      ...ws.annotations.filter((a) => a.type !== 'paragraph').map((a) => ({ id: a.id, page: a.page, bbox: a.bbox, tone: 'info' as const })),
                    ]}
                  />
                  <p className="mt-1 text-center text-[13px]">Page {i + 1}</p>
                </div>
              ))
            ) : (
              <Empty title="No page geometry" detail="The page map needs a PDF (original or converted)." />
            )}
            <div className="w-full text-[12.5px]" style={{ color: 'var(--muted)' }}>
              Red: proposed contradiction · Amber: other findings · Blue: input fields
              {ws.version?.source_report.coverage?.unread_pages.length ? ` · Unread pages: ${ws.version.source_report.coverage.unread_pages.join(', ')}` : ''}
            </div>
          </div>
        )}
      </Panel>

      <Panel i={2} x={1066} y={388} w={428} h={560} className="flex flex-col p-5">
        {!selected ? (
          <Empty title="Select a section" detail="Choose a section in the outline or graph." />
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[26px] font-semibold" style={{ color: 'var(--ink)' }}>
                  {selected.title} · {selected.label}
                </h2>
                <p className="text-[15px]" style={{ color: 'var(--muted)' }}>
                  Anchor: Page {selected.page ?? '–'} · {selected.label.replace('§', 'Section ')}
                </p>
              </div>
              <button onClick={() => setSel(null)} aria-label="Clear selection">
                <X size={22} />
              </button>
            </div>
            {selected.blocks[0] && (
              <div className="mt-3 flex gap-3 rounded-2xl px-4 py-3" style={{ background: 'var(--panel-2)' }}>
                <span className="font-display text-[34px] leading-none" style={{ color: 'var(--faint)' }}>
                  “
                </span>
                <p className="line-clamp-3 text-[17px] leading-[25px]" style={{ color: 'var(--ink)' }}>
                  {selected.blocks[0].text}
                </p>
              </div>
            )}
            <button className="btn-outline mt-3 flex h-[42px] w-[194px] items-center justify-center gap-2 text-[16px]" onClick={() => selected.blocks[0] && setSource(selected.blocks[0])} disabled={!selected.blocks[0]}>
              <ExternalLink size={18} /> Open source
            </button>
            <div className="mt-5 flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--panel-border)' }}>
              <h3 className="text-[16.5px] font-semibold" style={{ color: 'var(--ink)' }}>
                References in document
              </h3>
              <ListFilter size={18} />
            </div>
            <div className="mt-2 flex gap-2">
              {(['References', 'Definitions', 'Proposed findings'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className="rounded-full border px-4 py-1.5 text-[13.5px]" style={filter === f ? { borderColor: 'var(--primary)', color: 'var(--primary)', background: 'var(--selected)' } : { borderColor: 'var(--panel-border)', color: 'var(--ink)' }}>
                  {f}
                </button>
              ))}
            </div>
            <RefList filter={filter} section={selected} findings={findingsBySection.get(selected.ref) ?? []} onOpen={setSource} />
            <button className="btn-primary mt-auto flex h-[54px] w-full items-center justify-center gap-3 text-[18px]" onClick={() => nav.go('review')}>
              <ArrowUpRight size={22} /> Open legal review
            </button>
          </>
        )}
      </Panel>

      <Fade x={600} y={978}>
        <p className="text-[14px]" style={{ color: 'var(--ink)' }}>
          ⓘ Hover to explore · Click a section for details
        </p>
      </Fade>

      <Modal open={!!source} onClose={() => setSource(null)} title={`Source · Page ${source?.page ?? '–'}`} width={780}>
        {doc && source?.page && source.bbox ? (
          <PdfPage doc={doc} page={source.page} width={700} highlights={[{ id: 's', page: source.page, bbox: source.bbox, tone: 'warn' }]} />
        ) : (
          <p className="paper rounded-xl p-4 font-[family-name:var(--font-paper)]">{source?.text}</p>
        )}
      </Modal>
    </>
  );
}

function RefList({ filter, section, findings, onOpen }: { filter: string; section: Section; findings: ReturnType<typeof useWorkspace>['findings']; onOpen: (b: BlockRow) => void }) {
  const ws = useWorkspace();
  const items =
    filter === 'References'
      ? ws.edges.filter((e) => e.relation === 'references' && (e.from_ref === section.ref || e.to_ref === section.ref)).map((e) => ({ k: e.to_ref + (e.evidence.block_idx ?? ''), title: `${e.from_ref === section.ref ? '→' : '←'} ${refLabel(e.from_ref === section.ref ? e.to_ref : e.from_ref)}${e.status === 'unresolved' ? ' (not found)' : ''}`, quote: e.evidence.quote ?? '', idx: e.evidence.block_idx }))
      : filter === 'Definitions'
        ? ws.edges.filter((e) => (e.relation === 'defines' || e.relation === 'uses_term') && e.from_ref === section.ref).map((e) => ({ k: e.to_ref + e.relation + (e.evidence.block_idx ?? ''), title: `${e.relation === 'defines' ? 'Defines' : 'Uses'} "${e.evidence.term}"`, quote: e.evidence.quote ?? '', idx: e.evidence.block_idx }))
        : findings.map((f) => ({ k: f.id, title: `${CATEGORY[f.category].label}: ${f.title}`, quote: f.evidence[0]?.quote ?? '', idx: f.evidence[0]?.block_idx }));
  const unique = items.filter((x, i) => items.findIndex((y) => y.k === x.k) === i);
  return (
    <div className="scroll-thin mt-3 max-h-[170px] space-y-2 overflow-auto">
      {!unique.length && (
        <p className="text-[13.5px]" style={{ color: 'var(--muted)' }}>
          None found in this section.
        </p>
      )}
      {unique.map((x) => (
        <button key={x.k} onClick={() => { const b = ws.blocks.find((bb) => bb.idx === x.idx); if (b) onOpen(b); }} className="w-full rounded-xl border px-3 py-2 text-left text-[13.5px] hover:bg-[var(--selected)]" style={{ borderColor: 'var(--panel-border)' }}>
          <span className="font-medium" style={{ color: 'var(--ink)' }}>
            {x.title}
          </span>
          {x.quote && (
            <span className="block truncate text-[12.5px]" style={{ color: 'var(--muted)' }}>
              {x.quote}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function refLabel(ref: string) {
  const [kind, id] = ref.split(':');
  if (kind === 'sec') return `§${id}`;
  if (kind === 'annex') return `Annex ${id.toUpperCase()}`;
  return '§';
}

const ICONS = [Users, Wallet, Clock3, ShieldCheck, FileText];

function SectionNode({ data }: NodeProps<RFNode<{ title: string; sub: string; tone: 'root' | 'normal' | 'risk' | 'missing'; selected: boolean; icon: number }>>) {
  const Icon = data.tone === 'root' ? FileText : data.tone === 'risk' || data.tone === 'missing' ? TriangleAlert : ICONS[data.icon % ICONS.length];
  const bg = data.tone === 'risk' || data.tone === 'missing' ? 'var(--error-bg)' : 'var(--panel)';
  return (
    <div
      className="flex w-[158px] flex-col items-center rounded-2xl px-3 py-3 text-center shadow-[0_8px_20px_rgba(30,70,140,.12)] transition-transform hover:-translate-y-0.5"
      style={{ background: bg, border: `${data.selected ? 2 : 1}px ${data.tone === 'missing' ? 'dashed' : 'solid'} ${data.selected ? 'var(--primary)' : data.tone === 'missing' ? 'var(--error-ink)' : 'var(--panel-border)'}` }}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Icon size={30} style={{ color: data.tone === 'risk' || data.tone === 'missing' ? '#e5383b' : data.tone === 'root' ? 'var(--primary)' : 'var(--brand-blue)' }} />
      <div className="mt-1 text-[16px] font-semibold leading-tight" style={{ color: 'var(--ink)' }}>
        {data.title}
      </div>
      <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
        {data.sub}
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      <Handle id="l" type="source" position={Position.Left} className="!opacity-0" />
      <Handle id="r" type="target" position={Position.Right} className="!opacity-0" />
      <Handle id="rs" type="source" position={Position.Right} className="!opacity-0" />
      <Handle id="lt" type="target" position={Position.Left} className="!opacity-0" />
    </div>
  );
}

function ConflictEdge(p: EdgeProps) {
  const [path, lx, ly] = getBezierPath({ ...p, curvature: 0 });
  return (
    <>
      <BaseEdge id={p.id} path={path} style={{ stroke: '#e5383b', strokeWidth: 2, strokeDasharray: '7 6' }} markerEnd={p.markerEnd} markerStart={p.markerStart} />
      <EdgeLabelRenderer>
        <div className="nodrag nopan absolute rounded px-1 text-[13px] font-medium" style={{ transform: `translate(-50%, 6px) translate(${lx}px,${ly}px)`, color: '#e5383b', background: 'var(--panel)' }}>
          Proposed conflict
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { section: SectionNode };
const edgeTypes = { conflict: ConflictEdge };

function Graph({ sections, findingsBySection, selected, onSelect }: { sections: Section[]; findingsBySection: Map<string, unknown[]>; selected?: string; onSelect: (r: string) => void }) {
  const ws = useWorkspace();
  const { nodes, edges } = useMemo(() => {
    const rel = ws.edges.filter((e) => e.relation === 'references' || e.relation === 'proposed_conflict');
    const involved = new Set<string>();
    for (const e of rel) {
      involved.add(e.from_ref);
      involved.add(e.to_ref);
    }
    for (const r of findingsBySection.keys()) involved.add(r);
    // Key sections: those with relations or findings (document order), plus missing reference targets.
    let key = sections.filter((s) => involved.has(s.ref));
    if (key.length < 2) key = sections.slice(0, 4);
    // At most four sections keep the cards readable: conflicts, broken references and references first.
    const touches = (r: string, e: (typeof rel)[number]) => e.from_ref === r || e.to_ref === r;
    const score = (r: string) =>
      (rel.some((e) => e.relation === 'proposed_conflict' && touches(r, e)) ? 4 : 0) +
      (rel.some((e) => e.from_ref === r && e.status === 'unresolved') ? 2 : 0) +
      (rel.some((e) => e.relation === 'references' && touches(r, e)) ? 1 : 0) +
      Math.min(0.9, (findingsBySection.get(r)?.length ?? 0) / 4);
    const top = new Set([...key].sort((a, b) => score(b.ref) - score(a.ref)).slice(0, 4).map((s) => s.ref));
    key = key.filter((s) => top.has(s.ref));
    const cols = 2;
    // A section that points at a missing target is a risk card that names the target it could not find.
    const all = key.map((s) => {
      const lost = rel.find((e) => e.from_ref === s.ref && e.status === 'unresolved');
      return { ref: s.ref, title: s.title, sub: lost ? `Cites ${refLabel(lost.to_ref)} · not found` : `Page ${s.page ?? '–'} · ${s.label.replace('§', 'Section ')}`, tone: lost ? 'risk' : 'normal' };
    });
    const nodes: RFNode[] = [{ id: 'root', type: 'section', position: { x: 200, y: 0 }, data: { title: 'Agreement', sub: 'Entire document', tone: 'root', selected: false, icon: 0 } }];
    all.forEach((n, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      nodes.push({ id: n.ref, type: 'section', position: { x: col === 0 ? 30 : 370, y: 150 + row * 175 }, data: { title: n.title, sub: n.sub, tone: n.tone, selected: n.ref === selected, icon: i + 1 } });
    });
    const ids = new Set(nodes.map((n) => n.id));
    const edges: RFEdge[] = [];
    all.slice(0, cols).forEach((n) => edges.push({ id: `root-${n.ref}`, source: 'root', target: n.ref, type: 'default', style: { stroke: 'var(--muted)', strokeWidth: 1.5 }, markerEnd: { type: 'arrowclosed' as never, color: '#8a97ad' } }));
    for (const e of rel) {
      if (!ids.has(e.from_ref) || !ids.has(e.to_ref) || e.from_ref === e.to_ref) continue;
      const id = `${e.relation}-${e.from_ref}-${e.to_ref}`;
      if (edges.some((x) => x.id === id)) continue;
      // Conflict edges join the facing sides of the two cards.
      const ltr = (nodes.find((n) => n.id === e.from_ref)?.position.x ?? 0) < (nodes.find((n) => n.id === e.to_ref)?.position.x ?? 0);
      if (e.relation === 'proposed_conflict') edges.push({ id, source: e.from_ref, sourceHandle: ltr ? 'rs' : 'l', target: e.to_ref, targetHandle: ltr ? 'lt' : 'r', type: 'conflict', markerEnd: { type: 'arrowclosed' as never, color: '#e5383b' }, markerStart: { type: 'arrowclosed' as never, color: '#e5383b' } });
      else edges.push({ id, source: e.from_ref, target: e.to_ref, style: { stroke: 'var(--muted)', strokeWidth: 1.5, strokeDasharray: e.status === 'unresolved' ? '6 5' : undefined }, markerEnd: { type: 'arrowclosed' as never, color: '#8a97ad' } });
    }
    // Remaining key sections hang off the root in document order (containment, parsed).
    all.slice(cols).forEach((n, i) => {
      if (edges.some((x) => x.target === n.ref)) return;
      const above = all[i];
      edges.push({ id: `c-${n.ref}`, source: above ? above.ref : 'root', target: n.ref, style: { stroke: 'var(--muted)', strokeWidth: 1.2, opacity: 0.6 }, markerEnd: { type: 'arrowclosed' as never, color: '#8a97ad' } });
    });
    return { nodes, edges };
  }, [sections, findingsBySection, selected, ws.edges, ws.findings, ws.blocks]);

  const scale = useContext(PanelScale);
  if (!sections.length) return <Empty title="No relationships yet" detail="Relationships appear after extraction." />;
  return (
    <div className="mt-2 min-h-0 flex-1">
      <ReactFlow
        key={scale} // re-fit the graph when its panel opens full screen
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.08 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_, n) => n.id !== 'root' && onSelect(n.id)}
        minZoom={0.3}
        maxZoom={1.5}
      />
    </div>
  );
}
