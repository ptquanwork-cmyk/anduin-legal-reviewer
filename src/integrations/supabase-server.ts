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
      return Response.json({ error: e instanceof Error ? e.message : 'Unexpected error' }, { status });
    }
  };
}

export async function download(sb: SupabaseClient, bucket: string, path: string) {
  const { data, error } = await sb.storage.from(bucket).download(path);
  if (error || !data) throw new HttpError(404, `Could not read ${bucket}/${path}: ${error?.message ?? 'missing'}`);
  return new Uint8Array(await data.arrayBuffer());
}
