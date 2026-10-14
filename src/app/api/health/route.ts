import { workerHealth } from '../../../integrations/worker';
import { semanticEngine } from '../../../review/semantic';

export const dynamic = 'force-dynamic';

/** Live status for the footer; the daily cron call also checks the worker. */
export async function GET() {
  let worker: unknown = 'unconfigured';
  try {
    worker = await workerHealth();
  } catch (e) {
    worker = { error: e instanceof Error ? e.message : String(e) };
  }
  return Response.json({ worker, semantic: semanticEngine() === 'openai' ? 'openai-api (codex-cli fallback)' : 'codex-cli via worker' });
}
