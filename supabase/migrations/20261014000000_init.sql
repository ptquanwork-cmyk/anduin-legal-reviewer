-- Anduin Legal Reviewer: initial application schema.
-- Every row belongs to the signed-in (possibly anonymous) user; RLS restricts access to owner = auth.uid().

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  family_key text not null,
  created_at timestamptz not null default now()
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  document_id uuid not null references public.documents on delete cascade,
  version_no int not null,
  parent_id uuid references public.document_versions on delete set null,
  file_name text not null,
  file_path text not null,
  pdf_path text,
  mime text not null,
  sha256 text not null,
  size_bytes bigint not null,
  language text,
  status text not null default 'uploaded',
  source_status text check (source_status in ('verified', 'needs_review', 'blocked')),
  source_report jsonb not null default '{}',
  routing jsonb not null default '{}',
  source_accepted_at timestamptz,
  annotations_approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (document_id, version_no)
);
create index document_versions_owner_sha on public.document_versions (owner, sha256);
create index document_versions_document on public.document_versions (document_id);

create table public.source_blocks (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  version_id uuid not null references public.document_versions on delete cascade,
  idx int not null,
  page int,
  section_ref text,
  section_title text,
  kind text not null check (kind in ('title', 'heading', 'paragraph', 'list', 'table', 'header', 'footer')),
  text text not null,
  bbox jsonb,
  unique (version_id, idx)
);

create table public.graph_edges (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  version_id uuid not null references public.document_versions on delete cascade,
  from_ref text not null,
  to_ref text not null,
  relation text not null check (relation in ('contains', 'references', 'defines', 'uses_term', 'proposed_conflict')),
  status text not null check (status in ('parsed', 'proposed', 'verified', 'unresolved')),
  evidence jsonb not null default '{}'
);
create index graph_edges_version on public.graph_edges (version_id);

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  version_id uuid not null references public.document_versions on delete cascade,
  seq int not null,
  category text not null check (category in ('typo', 'missing_reference', 'undefined_term', 'contradiction', 'ambiguity')),
  title text not null,
  rationale text not null,
  question text not null,
  suggestion text,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  evidence jsonb not null,
  provenance jsonb not null default '{}',
  evidence_status text not null check (evidence_status in ('matched', 'partial')),
  fingerprint text not null,
  created_at timestamptz not null default now(),
  unique (version_id, seq)
);
create index findings_version on public.findings (version_id);

-- Append-only decision history. Current status is the latest event per finding.
create table public.decision_events (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  finding_id uuid not null references public.findings on delete cascade,
  action text not null check (action in ('confirm', 'dismiss', 'clarify', 'resolve', 'reopen')),
  reason text,
  note text,
  actor_role text not null default 'reviewer',
  use_as_example boolean not null default false,
  created_at timestamptz not null default now()
);
create index decision_events_finding on public.decision_events (finding_id, created_at desc);

create view public.finding_status with (security_invoker = true) as
  select distinct on (finding_id) finding_id, action, reason, note, created_at
  from public.decision_events
  order by finding_id, created_at desc;

create table public.annotations (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  version_id uuid not null references public.document_versions on delete cascade,
  field_id text not null,
  type text not null check (type in ('paragraph', 'text_box', 'radio', 'checkbox')),
  label text not null,
  options jsonb not null default '[]',
  page int not null,
  bbox jsonb not null,
  source_block_idx int,
  required boolean not null default false,
  transfer_state text not null default 'new' check (transfer_state in ('matched', 'changed', 'new', 'uncertain')),
  origin text not null default 'detected' check (origin in ('detected', 'manual', 'transferred', 'template')),
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (version_id, field_id)
);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  family_key text not null,
  name text not null,
  source_version_id uuid references public.document_versions on delete set null,
  fields jsonb not null,
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  version_id uuid not null references public.document_versions on delete cascade,
  answers jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  updated_at timestamptz not null default now(),
  unique (owner, version_id)
);

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  version_id uuid not null references public.document_versions on delete cascade,
  kind text not null check (kind in ('draft', 'final', 'review_report')),
  file_path text not null,
  qa jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  version_id uuid not null references public.document_versions on delete cascade,
  task text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed', 'offline')),
  steps jsonb not null default '[]',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_owner_created on public.jobs (owner, created_at desc);

-- Row level security: owner-only access.
do $$
declare t text;
begin
  foreach t in array array['documents','document_versions','source_blocks','graph_edges','findings',
                           'annotations','templates','submissions','exports','jobs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated
                    using (owner = (select auth.uid())) with check (owner = (select auth.uid()))',
                   t || '_owner', t);
  end loop;
end $$;

alter table public.decision_events enable row level security;
create policy decision_events_select on public.decision_events for select to authenticated
  using (owner = (select auth.uid()));
create policy decision_events_insert on public.decision_events for insert to authenticated
  with check (owner = (select auth.uid()));
create policy decision_events_update_example on public.decision_events for update to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

-- Private storage: objects live under "<auth.uid()>/...".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('sources', 'sources', false, 20971520,
   array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('exports', 'exports', false, 20971520, array['application/pdf', 'application/json', 'text/markdown']);

create policy storage_owner_select on storage.objects for select to authenticated
  using (bucket_id in ('sources', 'exports') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('sources', 'exports') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy storage_owner_update on storage.objects for update to authenticated
  using (bucket_id in ('sources', 'exports') and (storage.foldername(name))[1] = (select auth.uid())::text);

alter publication supabase_realtime add table public.jobs;
