import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Development-only alignment aid: serves the approved design PNGs for ?overlay=NN.
const LIGHT: Record<string, string> = {
  '00': 'homepage/anduin-3d-workflow-hub-v1.png',
  '01': 'interfaces/01-intake.png',
  '02': 'interfaces/02-source-quality.png',
  '03': 'interfaces/03-document-map.png',
  '04': 'interfaces/04-legal-review.png',
  '05': 'interfaces/05-decision-report.png',
  '06': 'interfaces/06-annotation.png',
  '07': 'interfaces/07-form-preview.png',
  '08': 'interfaces/08-responses.png',
  '09': 'interfaces/09-pdf-qa-export.png',
};

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  if (process.env.NODE_ENV !== 'development') return new Response('Not found', { status: 404 });
  const { name } = await ctx.params;
  const m = /^(light|dark)-(\d\d)\.png$/.exec(name);
  const rel = m && LIGHT[m[2]];
  if (!m || !rel) return new Response('Not found', { status: 404 });
  const file = m[1] === 'dark' ? `dark-mode/${path.basename(rel).replace('anduin-3d-workflow-hub-v1', '00-homepage')}` : rel;
  const data = await readFile(path.join(process.cwd(), 'design', file));
  return new Response(new Uint8Array(data), { headers: { 'content-type': 'image/png' } });
}
