import { fillAndCheck } from '../../../../../digitize/fill';
import { validateAnswers } from '../../../../../digitize/form';
import { download, handle, HttpError, requireUser } from '../../../../../integrations/supabase-server';
import type { AnnotationRow, BlockRow } from '../../../../../lib/types';

export const maxDuration = 120;

/** Draft: fill + QA (always allowed, marked unverified). Final: only after QA passes and the user confirms. */
export const POST = handle(async (req, ctx) => {
  const { sb, user } = await requireUser(req);
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { final?: boolean; confirmed?: boolean };
  const { data: v } = await sb.from('document_versions').select('*').eq('id', id).maybeSingle();
  if (!v?.pdf_path) throw new HttpError(409, 'A source PDF is required.');
  if (!v.annotations_approved_at) throw new HttpError(409, 'Approve annotations before generating a PDF.');
  const [{ data: anns }, { data: blocks }, { data: sub }] = await Promise.all([
    sb.from('annotations').select('*').eq('version_id', id),
    sb.from('source_blocks').select('*').eq('version_id', id).order('idx'),
    sb.from('submissions').select('*').eq('version_id', id).maybeSingle(),
  ]);
  const answers = (sub?.answers ?? {}) as Record<string, string | string[]>;
  const fields = ((anns ?? []) as AnnotationRow[]).filter((a) => a.type !== 'paragraph');
  const problems = validateAnswers(fields, answers);
  if (problems.length) throw new HttpError(422, `Answers incomplete: ${problems.map((p) => `${p.label} (${p.problem})`).join(', ')}`);
  if (body.final && !body.confirmed) throw new HttpError(400, 'Final export needs your confirmation.');

  const source = await download(sb, 'sources', v.pdf_path);
  const res = await fillAndCheck(source, (anns ?? []) as AnnotationRow[], (blocks ?? []) as BlockRow[], answers, !!body.final);
  if (body.final && !res.passed) throw new HttpError(409, 'QA has not passed; the final PDF was not produced.');
  const kind = body.final ? 'final' : 'draft';
  const path = `${user.id}/${id}/${kind}-${Date.now()}.pdf`;
  const up = await sb.storage.from('exports').upload(path, res.bytes, { contentType: 'application/pdf' });
  if (up.error) throw new HttpError(500, up.error.message);
  const qa = { checks: res.checks, issues: res.issues, answers_snapshot: answers, confirmed_by_user: !!body.confirmed, submission_updated_at: sub?.updated_at ?? null };
  const { data: row, error } = await sb.from('exports').insert({ version_id: id, kind, file_path: path, qa }).select('*').single();
  if (error) throw new HttpError(500, error.message);
  return Response.json(row);
});
