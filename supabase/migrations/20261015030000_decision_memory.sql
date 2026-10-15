-- Reviewer decisions are the workspace's memory. Keep them when findings are regenerated (re-running checks deletes and
-- recreates a version's findings), keep what they were about, and keep the history append-only.

alter table public.decision_events
  add column finding_title text,
  add column finding_category text;

update public.decision_events d
set finding_title = f.title, finding_category = f.category
from public.findings f
where f.id = d.finding_id;

-- A regenerated finding no longer deletes the decisions made on it; the link is cleared instead.
alter table public.decision_events alter column finding_id drop not null;
alter table public.decision_events drop constraint decision_events_finding_id_fkey;
alter table public.decision_events
  add constraint decision_events_finding_id_fkey foreign key (finding_id) references public.findings on delete set null;

-- Snapshot of the finding at decision time (read with the inserting user's own row-level security).
create or replace function public.decision_events_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select f.title, f.category into new.finding_title, new.finding_category
  from public.findings f
  where f.id = new.finding_id;
  return new;
end;
$$;

create trigger decision_events_snapshot
  before insert on public.decision_events
  for each row execute function public.decision_events_snapshot();

-- Append-only: after insert, only the "use as example" flag may change.
revoke update on public.decision_events from anon, authenticated;
grant update (use_as_example) on public.decision_events to authenticated;
