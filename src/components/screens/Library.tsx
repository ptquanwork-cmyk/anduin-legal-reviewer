'use client';
import { useEffect, useState } from 'react';
import { Box, MessageSquareMore } from 'lucide-react';
import { useNav } from '../../lib/nav';
import { supabase } from '../../lib/supabase';
import type { AnnotationType } from '../../lib/types';
import { useWorkspace } from '../../lib/workspace';
import { fmtTime } from '../ui';
import { Empty, Fade, Panel, Title } from './Screen';

interface Template {
  id: string;
  family_key: string;
  name: string;
  created_at: string;
  fields: { field_id: string; type: AnnotationType; label: string; required: boolean; options: { value: string; label: string }[] }[];
}

export function Templates() {
  const nav = useNav();
  const ws = useWorkspace();
  const [rows, setRows] = useState<Template[] | null>(null);
  const [sel, setSel] = useState<Template | null>(null);
  useEffect(() => {
    supabase()
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRows((data ?? []) as Template[]);
        setSel(((data ?? []) as Template[])[0] ?? null);
      });
  }, []);

  // Structure reuse only: field IDs and requirements transfer by label and type; answers never do.
  const apply = async (t: Template) => {
    let n = 0;
    for (const a of ws.annotations) {
      const f = t.fields.find((x) => x.type === a.type && x.label.toLowerCase() === a.label.toLowerCase() && x.type !== 'paragraph');
      if (!f || f.field_id === a.field_id) continue;
      const { error } = await supabase().from('annotations').update({ field_id: f.field_id, required: f.required, origin: 'template', transfer_state: 'matched' }).eq('id', a.id);
      if (!error) n++;
    }
    await ws.reload();
    nav.notify(n ? `${n} field(s) renamed from the template. Review them in Annotation.` : 'No matching fields to update in the current version.');
  };

  return (
    <>
      <Header icon={<Box size={44} />} title="Templates" sub="Approved field structures, reusable for later versions. Answers are never stored here." />
      <Panel i={0} x={140} y={300} w={440} h={640} className="scroll-thin overflow-auto p-4">
        {!rows ? null : !rows.length ? (
          <Empty title="No templates yet" detail="Approving annotations saves their structure as a template for this document family." />
        ) : (
          rows.map((t) => (
            <button key={t.id} onClick={() => setSel(t)} className="mb-2 w-full rounded-2xl border px-4 py-3 text-left" style={{ borderColor: sel?.id === t.id ? 'var(--primary)' : 'var(--panel-border)', background: sel?.id === t.id ? 'var(--selected)' : undefined }}>
              <div className="text-[16px] font-semibold" style={{ color: 'var(--ink)' }}>
                {t.name}
              </div>
              <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
                {t.fields.filter((f) => f.type !== 'paragraph').length} input field(s) · {fmtTime(t.created_at)}
              </div>
            </button>
          ))
        )}
      </Panel>
      <Panel i={1} x={595} y={300} w={895} h={640} className="scroll-thin overflow-auto p-6">
        {!sel ? (
          <Empty title="Select a template" detail="Field structure appears here." />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-[22px] font-semibold" style={{ color: 'var(--ink)' }}>
                {sel.name}
              </h2>
              <button className="btn-primary h-10 px-5" disabled={!ws.annotations.length} onClick={() => apply(sel)}>
                Apply field names to current version
              </button>
            </div>
            <table className="mt-4 w-full text-[14.5px]">
              <thead>
                <tr className="text-left text-[12px] uppercase" style={{ color: 'var(--muted)' }}>
                  <th className="py-2">Field ID</th>
                  <th>Type</th>
                  <th>Label</th>
                  <th>Required</th>
                  <th>Options</th>
                </tr>
              </thead>
              <tbody>
                {sel.fields
                  .filter((f) => f.type !== 'paragraph')
                  .map((f) => (
                    <tr key={f.field_id} className="border-t" style={{ borderColor: 'var(--panel-border)' }}>
                      <td className="py-2 pr-3">{f.field_id}</td>
                      <td>{f.type.replace('_', ' ')}</td>
                      <td>{f.label}</td>
                      <td>{f.required ? 'yes' : 'no'}</td>
                      <td>{f.options.map((o) => o.label).join(', ')}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <p className="mt-3 text-[13px]" style={{ color: 'var(--muted)' }}>
              {sel.fields.filter((f) => f.type === 'paragraph').length} paragraph region(s) are part of the structure as readable content.
            </p>
          </>
        )}
      </Panel>
    </>
  );
}

interface FeedbackRow {
  id: string;
  action: string;
  reason: string | null;
  note: string | null;
  use_as_example: boolean;
  created_at: string;
  finding_title: string | null;
  finding_category: string | null;
  findings: { title: string; category: string; version_id: string } | null;
}

export function Feedback() {
  const nav = useNav();
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);
  const load = () =>
    supabase()
      .from('decision_events')
      .select('id, action, reason, note, use_as_example, created_at, finding_title, finding_category, findings(title, category, version_id)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => setRows((data ?? []) as unknown as FeedbackRow[]));
  useEffect(() => {
    load();
  }, []);
  const toggle = async (r: FeedbackRow) => {
    const { error } = await supabase().from('decision_events').update({ use_as_example: !r.use_as_example }).eq('id', r.id);
    if (error) nav.notify(error.message, 'error');
    load();
  };
  const examples = rows?.filter((r) => r.use_as_example).length ?? 0;
  return (
    <>
      <Header icon={<MessageSquareMore size={44} />} title="Feedback" sub="Every reviewer decision is stored with its scope. Selected examples guide later reviews in this workspace." />
      <Panel i={0} x={140} y={300} w={420} h={640} className="p-6">
        <h2 className="text-[19px] font-semibold" style={{ color: 'var(--ink)' }}>
          How feedback is used
        </h2>
        {[
          ['Decision memory', 'Active', 'Each confirm, dismiss, clarification and resolution is stored as an event on its version.'],
          ['Reviewed examples', `Active · ${examples} selected`, 'Examples you select are added to the semantic reviewer’s guidance for later documents in this workspace. This does not change model weights.'],
          ['Training and calibration', 'Not active', 'Needs a labelled dataset, held-out evaluation and rollback before any model changes. No automatic retraining from clicks.'],
        ].map(([t, s, d]) => (
          <div key={t} className="mt-4 rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--panel-border)' }}>
            <div className="flex justify-between text-[15.5px] font-semibold">
              <span>{t}</span>
              <span className="text-[13px] font-medium" style={{ color: s.startsWith('Not') ? 'var(--muted)' : 'var(--info-ink)' }}>
                {s}
              </span>
            </div>
            <p className="mt-1 text-[13.5px]" style={{ color: 'var(--muted)' }}>
              {d}
            </p>
          </div>
        ))}
      </Panel>
      <Panel i={1} x={575} y={300} w={915} h={640} className="scroll-thin overflow-auto p-6">
        <h2 className="text-[19px] font-semibold" style={{ color: 'var(--ink)' }}>
          Decision events
        </h2>
        {rows && !rows.length && <Empty title="No feedback yet" detail="Decisions made in Legal review appear here." />}
        <table className="mt-3 w-full text-[14px]">
          <tbody>
            {rows?.map((r) => (
              <tr key={r.id} className="border-t align-top" style={{ borderColor: 'var(--panel-border)' }}>
                <td className="py-2.5 pr-3">
                  <div className="font-medium">{r.findings?.title ?? r.finding_title ?? 'Finding'}</div>
                  <div className="text-[12.5px]" style={{ color: 'var(--muted)' }}>
                    {(r.findings?.category ?? r.finding_category ?? '').replace('_', ' ')}{r.findings ? '' : ' · checks re-run since'} · {fmtTime(r.created_at)}
                  </div>
                </td>
                <td className="py-2.5 pr-3 capitalize">{r.reason === 'exception' ? 'exception' : r.action}</td>
                <td className="py-2.5 pr-3" style={{ color: 'var(--muted)' }}>
                  {[r.reason !== 'exception' ? r.reason : null, r.note].filter(Boolean).join(' — ') || '—'}
                </td>
                <td className="py-2.5 text-right">
                  <label className="flex items-center justify-end gap-2 whitespace-nowrap text-[13px]">
                    <input type="checkbox" checked={r.use_as_example} onChange={() => toggle(r)} disabled={r.action === 'clarify' || r.action === 'reopen'} /> Use as example
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

function Header({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <>
      <Fade x={160} y={160} w={90} h={90}>
        <div className="grid h-full w-full place-items-center rounded-3xl" style={{ background: 'var(--selected)', color: 'var(--primary)' }}>
          {icon}
        </div>
      </Fade>
      <Title x={275} y={158} size={52}>
        {title}
      </Title>
      <Fade x={277} y={222} w={900}>
        <p className="text-[19px]" style={{ color: 'var(--ink)' }}>
          {sub}
        </p>
      </Fade>
    </>
  );
}
