# Supabase backend

- Project: `anduin-legal-reviewer`, reference `hxucmhlssgasjthxaklr`, Singapore (`ap-southeast-1`). [Dashboard](https://supabase.com/dashboard/project/hxucmhlssgasjthxaklr).
- Used by the application for anonymous authentication, Postgres with row-level security, private storage and Realtime job status.

## Migrations

Applied in order (also recorded in the project's migration history):

| File | Contents |
| --- | --- |
| `migrations/20261014000000_init.sql` | Application tables, owner-only RLS (`owner = auth.uid()`), append-only `decision_events` with `finding_status` view, private `sources`/`exports` buckets with per-user folder policies, Realtime on `jobs` |
| `migrations/20261015000000_annotation_agent_and_help.sql` | Decision-agent answer per annotation; cached plain-language help per version |
| `migrations/20261015010000_worker_endpoint.sql` | `worker_endpoint` registry (public URL readable, secret hash hidden) with `claim_worker` / `set_worker_url` functions for the owner's worker |

Anonymous sign-ins are enabled so each visitor gets a private workspace without an account. Public demo data is synthetic; do not upload real contracts.

Credentials live only in ignored local configuration and service environment settings. See [deployment setup](../docs/deployment/setup.md).
