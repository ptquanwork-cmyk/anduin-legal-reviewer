import { after } from 'next/server';
import { handle, HttpError, requireUser } from '../../../../../integrations/supabase-server';
import { initialSteps, runPipeline } from '../../../../../review/pipeline';

export const maxDuration = 300;

/** Re-runs conversion, extraction and checks for a version (e.g. after the worker comes back online). */
export const POST = handle(async (req, ctx) => {
  const { sb, user } = await requireUser(req);
  const { id } = await ctx.params;
  const { data: v } = await sb.from('document_versions').select('id').eq('id', id).maybeSingle();
  if (!v) throw new HttpError(404, 'Version not found.');
  // Derived records are regenerated; decisions on old findings are removed with them.
  for (const t of ['findings', 'graph_edges', 'source_blocks', 'annotations'] as const) {
    const del = await sb.from(t).delete().eq('version_id', id);
    if (del.error) throw new HttpError(500, del.error.message);
  }
  await sb.from('document_versions').update({ status: 'processing', source_accepted_at: null, annotations_approved_at: null }).eq('id', id);
  const { data: job, error } = await sb.from('jobs').insert({ version_id: id, task: 'reprocess', status: 'queued', steps: initialSteps() }).select('id').single();
  if (error) throw new HttpError(500, error.message);
  after(() => runPipeline(sb, user.id, id, job.id));
  return Response.json({ jobId: job.id });
});
