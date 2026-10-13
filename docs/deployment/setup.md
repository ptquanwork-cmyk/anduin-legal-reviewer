# Deployment and backend setup

Verified on 2026-10-13.

| Service | Project/link | Verified scope |
| --- | --- | --- |
| GitHub | [ptquanwork-cmyk/anduin-legal-reviewer](https://github.com/ptquanwork-cmyk/anduin-legal-reviewer) | Public repository; `main` published |
| Vercel site | [anduin-legal-reviewer.vercel.app](https://anduin-legal-reviewer.vercel.app) | Public static hub; HTTP 200 and expected content |
| Vercel dashboard | [jayson3/anduin-legal-reviewer](https://vercel.com/jayson3/anduin-legal-reviewer) | Project connected to the GitHub repository |
| Supabase dashboard | [anduin-legal-reviewer](https://supabase.com/dashboard/project/hxucmhlssgasjthxaklr) | Dedicated project; database and Auth API connectivity |
| Supabase API base | [hxucmhlssgasjthxaklr.supabase.co](https://hxucmhlssgasjthxaklr.supabase.co) | Service endpoint, not a user-facing web page |

## Vercel

- Scope: `jayson3`; project: `anduin-legal-reviewer`.
- Framework: static HTML, no dependency installation or application build required.
- Public output: `src/app/public/`, configured in root `vercel.json`.
- Git integration: connected to this repository. Verify the production result after pushing site changes.
- Local `.vercel/` contains the project link and is ignored.
- `.vercelignore` excludes local checkouts, environments, credentials, private data, and QA artifacts.

To connect a fresh checkout or deploy manually with an authenticated CLI:

```powershell
vercel link --yes --project anduin-legal-reviewer --scope jayson3
vercel deploy --prod --yes --scope jayson3
```

Always check the public alias content after deployment; a ready deployment alone is not sufficient. See [Vercel CLI deployment documentation](https://vercel.com/docs/cli/deploy).

## Supabase

- Project reference: `hxucmhlssgasjthxaklr`.
- Region: Singapore, `ap-southeast-1`.
- Created with the free-plan option; no paid upgrade was requested or performed.
- Verified database access with `SELECT 1 AS connection_ok` and Auth settings access using the project's publishable/anon key.
- No application tables, contract buckets, migrations, or review-data access policies were created yet.

Local configuration is stored in ignored `.env.supabase.local` and `.env.local`. The dedicated Supabase file preserves configuration independently of Vercel's environment pull. Do not use global variables from unrelated projects.

Vercel Production and Preview have `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` configured. The static hub does not call Supabase; these variables prepare future server/app integration. The database password is kept locally and was not uploaded to Vercel or committed. No service-role key is required by the hub.

Names and placeholders are in root `.env.example`. Provisioning used the [Supabase Management API](https://supabase.com/docs/reference/api/v1-create-a-project). Add migrations and reviewed access policies alongside the future application, then verify actual reads/writes before claiming application persistence.

## Current limitation

The hosting and backend projects exist and are reachable. The hosted page is a project hub, and Supabase is provisioned infrastructure. Contract upload, AI review, authentication flows, and review persistence remain implementation work.
