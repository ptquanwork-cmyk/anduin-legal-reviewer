import { textRendition } from '../../../../../digitize/pdfkit';
import { handle, HttpError, requireUser } from '../../../../../integrations/supabase-server';
import { allRows } from '../../../../../lib/rows';
import { applyEdits, type Edit } from '../../../../../review/revise';

/** Builds a revised draft PDF: the version's extracted text with the reviewer's corrections applied. Nothing is stored. */
export const POST = handle(async (req, ctx) => {
  const { sb } = await requireUser(req);
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { edits?: Partial<Edit>[] };
  const edits = (Array.isArray(body.edits) ? body.edits : [])
    .filter((e): e is Edit => Number.isInteger(e?.block_idx) && typeof e?.quote === 'string' && typeof e?.text === 'string' && !!e.quote.trim())
    .slice(0, 300)
    .map((e) => ({ block_idx: e.block_idx, quote: e.quote.slice(0, 5000), text: e.text.slice(0, 5000) }));
  if (!edits.length) throw new HttpError(400, 'No changes to apply.');

  const { data: v } = await sb.from('document_versions').select('version_no, documents(title)').eq('id', id).maybeSingle();
  if (!v) throw new HttpError(404, 'Version not found.');
  const { data: blocks, error } = await allRows<{ idx: number; page: number | null; kind: string; text: string }>((a, b) => sb.from('source_blocks').select('idx, page, kind, text').eq('version_id', id).order('idx').range(a, b));
  if (error) throw new HttpError(500, error.message);
  if (!blocks?.length) throw new HttpError(409, 'This version has no extracted text yet.');

  const r = applyEdits(blocks, edits);
  if (!r.applied) throw new HttpError(409, 'None of the changes matched the source text.');
  const title = (v.documents as unknown as { title: string } | null)?.title ?? 'Document';
  const bytes = await textRendition(r.blocks, `${title} · revised draft of v${v.version_no}`);
  return new Response(new Uint8Array(bytes), { headers: { 'content-type': 'application/pdf', 'cache-control': 'no-store', 'x-applied': String(r.applied), 'x-missed': String(r.missed.length) } });
});
