-- Decision-agent answer for each proposed annotation, and cached plain-language help per form section.
alter table public.annotations add column agent jsonb;
alter table public.document_versions add column plain_help jsonb not null default '{}';
