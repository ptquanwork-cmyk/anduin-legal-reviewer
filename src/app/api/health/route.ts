import { workerHealth } from '../../../integrations/worker';

export const dynamic = 'force-dynamic';

/** Live status for the footer; the daily cron call also keeps the free worker Space awake. */
export async function GET() {
  let worker: unknown = 'unconfigured';
  try {
    worker = await workerHealth();
  } catch (e) {
    worker = { error: e instanceof Error ? e.message : String(e) };
  }
  return Response.json({ worker, semantic: process.env.OPENAI_API_KEY ? 'configured' : 'unconfigured' });
}
