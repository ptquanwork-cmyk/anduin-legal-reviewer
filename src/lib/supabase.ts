'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function supabase() {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

/** Ensures a session exists. Visitors get a private anonymous workspace. */
export async function ensureSession() {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session;
  const { data: signed, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  return signed.session!;
}

/** Calls an app route with the user's access token so the server acts under the same RLS scope. */
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const session = await ensureSession();
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json as T;
}

export async function signedUrl(bucket: 'sources' | 'exports', path: string) {
  const { data, error } = await supabase().storage.from(bucket).createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}
