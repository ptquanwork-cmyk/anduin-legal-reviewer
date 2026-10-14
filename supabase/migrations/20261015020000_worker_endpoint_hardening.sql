-- Security review follow-up: no anonymous claim path, and only Cloudflare quick-tunnel hosts can be published.
-- The secret hash was set by the owner's first worker run before this migration; on a fresh project, seed it
-- out of band as the database owner:
--   update public.worker_endpoint set secret_hash = encode(extensions.digest('<contents of worker/.worker-secret>', 'sha256'), 'hex') where id = 1;
drop function if exists public.claim_worker(text);

create or replace function public.set_worker_url(p_secret text, p_url text) returns boolean
language sql security definer set search_path = public, extensions as $$
  update public.worker_endpoint set url = p_url, updated_at = now()
  where id = 1
    and secret_hash is not null
    and secret_hash = encode(digest(p_secret, 'sha256'), 'hex')
    and p_url ~ '^https://[a-z0-9-]+\.trycloudflare\.com$'
  returning true;
$$;
revoke all on function public.set_worker_url(text, text) from public, authenticated;
grant execute on function public.set_worker_url(text, text) to anon;
