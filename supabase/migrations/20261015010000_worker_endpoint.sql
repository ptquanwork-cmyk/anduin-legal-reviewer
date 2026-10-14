-- Current public URL of the owner's worker (Word conversion + decision agent), which runs behind a tunnel
-- whose address changes on restart. Anyone signed in may read the URL; only the holder of the worker's
-- local secret can change it. The secret itself is never stored, only its SHA-256 hash.
create extension if not exists pgcrypto with schema extensions;

create table public.worker_endpoint (
  id int primary key default 1 check (id = 1),
  url text,
  secret_hash text,
  updated_at timestamptz not null default now()
);
insert into public.worker_endpoint (id) values (1);

alter table public.worker_endpoint enable row level security;
create policy worker_endpoint_read on public.worker_endpoint for select to anon, authenticated using (true);
revoke update, insert, delete on public.worker_endpoint from anon, authenticated;
-- Column-level read: the hash is not exposed through the API.
revoke select on public.worker_endpoint from anon, authenticated;
grant select (id, url, updated_at) on public.worker_endpoint to anon, authenticated;

-- First start of the worker claims the endpoint; later calls must present the same secret.
create function public.claim_worker(p_secret text) returns boolean
language sql security definer set search_path = public, extensions as $$
  update public.worker_endpoint set secret_hash = encode(digest(p_secret, 'sha256'), 'hex')
  where id = 1 and secret_hash is null and length(p_secret) >= 32
  returning true;
$$;

create function public.set_worker_url(p_secret text, p_url text) returns boolean
language sql security definer set search_path = public, extensions as $$
  update public.worker_endpoint set url = p_url, updated_at = now()
  where id = 1 and secret_hash = encode(digest(p_secret, 'sha256'), 'hex') and p_url ~ '^https://[a-z0-9.-]+$'
  returning true;
$$;

revoke all on function public.claim_worker(text) from public;
revoke all on function public.set_worker_url(text, text) from public;
grant execute on function public.claim_worker(text) to anon;
grant execute on function public.set_worker_url(text, text) to anon;

revoke execute on function public.claim_worker(text) from authenticated;
revoke execute on function public.set_worker_url(text, text) from authenticated;
