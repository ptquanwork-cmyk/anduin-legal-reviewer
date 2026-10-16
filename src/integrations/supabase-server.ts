import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Supabase client acting as the calling user, so every query stays inside that user's RLS scope. */
export async function requireUser(req: Request): Promise<{ sb: SupabaseClient; user: User; token: string }> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Sign-in required.');
  const sb = clientFor(token);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Session expired. Reload the page.');
  return { sb, user: data.user, token };
}

export function clientFor(token: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function handle(fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      // Only deliberate HttpError messages reach the browser; anything unexpected stays in the server log.
      return Response.json({ error: e instanceof HttpError ? e.message : 'Unexpected server error. Please try again.' }, { status });
    }
  };
}

/**
 * Each upload or re-run spends conversion, decision-agent and review time on the owner's worker, and every visitor is an
 * anonymous workspace, so processing is capped per workspace and hour (RLS makes the count per user).
 */
export async function limitProcessing(sb: SupabaseClient, perHour = 30) {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count, error } = await sb.from('jobs').select('id', { count: 'exact', head: true }).gte('created_at', since);
  if (error) throw new HttpError(500, error.message);
  if ((count ?? 0) >= perHour) throw new HttpError(429, 'Processing limit reached for this workspace; please try again later.');
}

export async function download(sb: SupabaseClient, bucket: string, path: string) {
  // One retry: a transient network error must not fail a fill or export whose file is there.
  let last: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await sb.storage.from(bucket).download(path);
    if (data) return new Uint8Array(await data.arrayBuffer());
    last = error?.message;
    if (/not.?found/i.test(last ?? '')) break;
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new HttpError(404, `Could not read ${bucket}/${path}: ${last ?? 'missing'}`);
}
