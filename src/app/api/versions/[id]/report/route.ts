import { PDFDocument } from 'pdf-lib';
import { embedFonts, Writer } from '../../../../../digitize/pdfkit';
import { handle, HttpError, requireUser } from '../../../../../integrations/supabase-server';
import { reviewOutcome } from '../../../../../lib/outcome';
import type { DecisionRow, FindingRow, VersionRow } from '../../../../../lib/types';

const ACTION: Record<string, string> = { confirm: 'Issue confirmed', dismiss: 'Dismissed', clarify: 'Clarification requested', resolve: 'Resolved after revision', reopen: 'Reopened' };

/** Builds the review report PDF: evidence, decisions, questions for counsel, unresolved items and trace. */
export const POST = handle(async (req, ctx) => {
  const { sb, user } = await requireUser(req);
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { questions?: string };
  const { data: v } = await sb.from('document_versions').select('*, documents(title)').eq('id', id).maybeSingle();
  if (!v) throw new HttpError(404, 'Version not found.');
  const version = v as VersionRow & { documents: { title: string } };
  const { data: findings } = await sb.from('findings').select('*').eq('version_id', id).order('seq');
  const ids = (findings ?? []).map((f) => f.id);
  const { data: decisions } = ids.length ? await sb.from('decision_events').select('*').in('finding_id', ids).order('created_at') : { data: [] };
  const fs = (findings ?? []) as FindingRow[];
  const ds = (decisions ?? []) as DecisionRow[];
  const outcome = reviewOutcome(version, fs, ds);

  const doc = await PDFDocument.create();
  doc.setTitle(`Review report · ${version.documents.title} v${version.version_no}`);
  doc.setProducer('Anduin Legal Reviewer');
  const w = new Writer(doc, await embedFonts(doc));
  w.text('Review report', { size: 22, bold: true, gap: 2 });
  w.text(`${version.documents.title} · version ${version.version_no} · ${version.file_name}`, { size: 11, color: [0.33, 0.38, 0.48] });
  w.text(`Generated ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC · SHA-256 ${version.sha256.slice(0, 16)}…`, { size: 9, color: [0.33, 0.38, 0.48], gap: 10 });
  w.text(`Outcome: ${outcome.label}`, { size: 14, bold: true });
  w.text(outcome.detail, { gap: 6 });
  const cov = version.source_report?.coverage;
  w.text(`Source: ${version.source_status ?? 'unknown'}${version.source_accepted_at ? ' (accepted after manual comparison)' : ''} · Coverage: ${cov ? `${cov.read_pages} of ${cov.total_pages} pages read` : 'not measured'}`, { size: 9.5 });
  for (const l of version.source_report?.limitations ?? []) w.text(`Limitation: ${l}`, { size: 9, color: [0.55, 0.35, 0] });
  w.text('Confirming an issue does not resolve it. Model scores are not calibrated probabilities.', { size: 9, color: [0.33, 0.38, 0.48], gap: 8 });
  w.rule();

  w.text(`Findings (${fs.length})`, { size: 15, bold: true, gap: 6 });
  if (!fs.length) w.text('No findings with matched source evidence were produced for this version.');
  for (const f of fs) {
    const hist = ds.filter((d) => d.finding_id === f.id);
    const last = hist[hist.length - 1];
    w.text(`${String(f.seq).padStart(2, '0')}. ${f.title}`, { size: 12, bold: true, gap: 1 });
    w.text(`${f.category.replace('_', ' ')} · severity ${f.severity} · ${last ? (last.reason === 'exception' ? 'Approved with exception' : ACTION[last.action]) : 'Open · needs confirmation'} · source: ${f.provenance.source === 'rules' ? f.provenance.rule : `${f.provenance.model} (${f.provenance.prompt_version})`}`, { size: 9, color: [0.33, 0.38, 0.48] });
    w.text(f.rationale, { indent: 10 });
    for (const e of f.evidence) w.text(`“${e.quote}” — page ${e.page ?? '–'}${e.section ? `, ${e.section}` : ''}${e.matched ? '' : ' (not matched)'}`, { size: 9.5, indent: 18, color: [0.2, 0.25, 0.35] });
    w.text(`Question: ${f.question}`, { indent: 10, size: 10 });
    for (const d of hist) w.text(`${new Date(d.created_at).toISOString().slice(0, 16).replace('T', ' ')} · ${d.reason === 'exception' ? 'Approved with exception' : ACTION[d.action]}${d.reason && d.reason !== 'exception' ? ` — ${d.reason}` : ''}${d.note ? ` — ${d.note}` : ''}`, { indent: 18, size: 9 });
    w.y -= 6;
  }
  w.rule();
  w.text('Questions for counsel', { size: 15, bold: true, gap: 6 });
  w.text(body.questions?.trim().slice(0, 4000) || 'No open questions.', { gap: 8 });
  w.text('Prepared for confirmation by the responsible reviewer or counsel. This report does not give legal advice and was not sent to anyone by the application.', { size: 9, color: [0.33, 0.38, 0.48] });

  const bytes = await doc.save();
  const path = `${user.id}/${id}/review-report-${Date.now()}.pdf`;
  const up = await sb.storage.from('exports').upload(path, bytes, { contentType: 'application/pdf' });
  if (up.error) throw new HttpError(500, up.error.message);
  await sb.from('exports').insert({ version_id: id, kind: 'review_report', file_path: path, qa: { outcome: outcome.key } });
  return Response.json({ path });
});
