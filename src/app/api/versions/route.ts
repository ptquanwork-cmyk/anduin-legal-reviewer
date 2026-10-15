import { createHash } from 'node:crypto';
import { after } from 'next/server';
import { download, handle, HttpError, limitProcessing, requireUser } from '../../../integrations/supabase-server';
import { initialSteps, runPipeline } from '../../../review/pipeline';
import { withWorkerSession } from '../../../integrations/worker';

export const maxDuration = 300;

const MIMES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

/** Registers an uploaded original: hash, exact-duplicate lookup, immutable version, then background processing. */
export const POST = handle(async (req) => {
  const { sb, user, token } = await requireUser(req);
  const body = (await req.json()) as { path?: string; fileName?: string; mime?: string; size?: number; documentId?: string };
  if (!body.path?.startsWith(`${user.id}/`) || !body.fileName || !MIMES.includes(body.mime ?? '')) throw new HttpError(400, 'Invalid upload.');

  const data = await download(sb, 'sources', body.path);
  const magicOk = body.mime === 'application/pdf' ? Buffer.from(data.slice(0, 5)).toString() === '%PDF-' : data[0] === 0x50 && data[1] === 0x4b;
  if (!magicOk) throw new HttpError(415, 'The file content does not match its .pdf/.docx extension.');
  const sha256 = createHash('sha256').update(data).digest('hex');

  // Exact identity: reopen the earlier record instead of processing again (its status is kept, never upgraded).
  await limitProcessing(sb);
  const { data: same } = await sb.from('document_versions').select('id, document_id').eq('sha256', sha256).order('created_at').limit(1).maybeSingle();
  if (same) return Response.json({ versionId: same.id, documentId: same.document_id, duplicateOf: same.id });

  let documentId = body.documentId ?? null;
  let versionNo = 1;
  let parentId: string | null = null;
  if (documentId) {
    const { data: prev } = await sb.from('document_versions').select('id, version_no').eq('document_id', documentId).order('version_no', { ascending: false }).limit(1).maybeSingle();
    if (!prev) throw new HttpError(404, 'Document not found.');
    versionNo = prev.version_no + 1;
    parentId = prev.id;
  } else {
    const title = body.fileName.replace(/\.(pdf|docx)$/i, '').replace(/[-_ ]+v\d+$/i, '').trim() || 'Untitled';
    const { data: doc, error } = await sb.from('documents').insert({ title, family_key: title.toLowerCase() }).select('id').single();
    if (error) throw new HttpError(500, error.message);
    documentId = doc.id;
  }

  const { data: version, error } = await sb
    .from('document_versions')
    .insert({ document_id: documentId, version_no: versionNo, parent_id: parentId, file_name: body.fileName, file_path: body.path, mime: body.mime, sha256, size_bytes: data.length, status: 'processing', source_report: { duplicates: [] } })
    .select('id')
    .single();
  if (error) throw new HttpError(500, error.message);
  const { data: job, error: jobErr } = await sb.from('jobs').insert({ version_id: version.id, task: 'process', status: 'queued', steps: initialSteps() }).select('id').single();
  if (jobErr) throw new HttpError(500, jobErr.message);

  after(() => withWorkerSession(token, () => runPipeline(sb, user.id, version.id, job.id)));
  return Response.json({ versionId: version.id, documentId, duplicateOf: null });
});
