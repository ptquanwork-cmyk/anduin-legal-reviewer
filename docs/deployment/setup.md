# Deployment and backend setup

Updated 15 October 2026. Earlier infrastructure checks are recorded in the 13 October build log.

| Service | Project/link | Role |
| --- | --- | --- |
| GitHub | [ptquanwork-cmyk/anduin-legal-reviewer](https://github.com/ptquanwork-cmyk/anduin-legal-reviewer) | Public source; `main` deploys to production, other branches to protected previews |
| Vercel | [jayson3/anduin-legal-reviewer](https://vercel.com/jayson3/anduin-legal-reviewer) → [anduin-legal-reviewer.vercel.app](https://anduin-legal-reviewer.vercel.app) | Next.js application and API routes |
| Supabase | [hxucmhlssgasjthxaklr](https://supabase.com/dashboard/project/hxucmhlssgasjthxaklr) (Singapore) | Auth (anonymous sign-in), Postgres with RLS, private storage, Realtime |
| Worker | Owner's machine, Cloudflare quick tunnel | Word → PDF conversion and Laya typed decisions |

## Vercel

- Framework preset **Next.js**; build, install and output settings use the framework defaults. (On 15 Oct the project-level output directory `src/app/public` left from the static hub was cleared; it had made the first preview fail.)
- Node 24 (`package.json` engines). `postinstall` copies the pdf.js worker and Draco decoders from installed packages into `public/`.
- Daily cron `GET /api/health` (vercel.json) — status check of the worker.
- Environment variables:
  - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (existing; exposed to the browser as `NEXT_PUBLIC_*` through `next.config.ts` because the publishable key is designed for clients).
  - `OPENAI_API_KEY` (secret, entered by the owner) and optional `OPENAI_MODEL` (default `gpt-5-mini`). Without the key the semantic reviewer is reported as not configured and the deterministic rules still run.
  - `WORKER_URL` is **not** needed in production: the worker publishes its address to Supabase. Set it only to override locally.
- Locally, `next.config.ts` prefers `.env.supabase.local`, because machine-wide `SUPABASE_*` variables on the owner's machine point at another project.

## Supabase

Migrations live in `supabase/migrations/` and were applied with the Supabase MCP:

1. `20261014000000_init.sql` — documents, versions, source blocks, graph edges, findings, append-only decision events, annotations, templates, submissions, exports, jobs; owner-only RLS (`owner = auth.uid()`); private `sources` and `exports` buckets with per-user folder policies; Realtime on `jobs`.
2. `20261015000000_annotation_agent_and_help.sql` — decision-agent answer per annotation; cached plain-language help.
3. `20261015010000_worker_endpoint.sql` — single-row `worker_endpoint` (readable URL, hidden secret hash) and two SECURITY DEFINER functions for the worker: `claim_worker` (first claim stores the hash) and `set_worker_url` (requires the same secret).

Authentication: **Allow anonymous sign-ins** is enabled (owner action, 15 Oct). Each visitor's data is isolated by RLS. Security advisor notes after the migrations: warnings for anonymous-access policies (intentional) and for the two anon-callable worker functions (intentional, secret-gated); no errors.

## Worker on the owner's machine

Hugging Face now requires a paid plan for Docker Spaces, so the owner chose to run the worker locally (decision of 15 Oct). Start it from the repository root:

```bash
laya\.venv\Scripts\python.exe worker\run_local.py
```

- Starts FastAPI on `127.0.0.1:7860` with Laya (checkpoints cached from Hugging Face on first run).
- Converts Word with Microsoft Word through COM (LibreOffice is used instead when installed, e.g. in `worker/Dockerfile`).
- Opens a Cloudflare quick tunnel (`cloudflared`, installed with winget), waits until the public address answers, then publishes it with `set_worker_url`. A watchdog recreates the tunnel when it stops answering; quick tunnels have no uptime guarantee.
- `worker/.worker-secret` is created on first run and git-ignored; only its SHA-256 hash is stored in Supabase.
- Requests are accepted only with a valid Supabase session of an app user (verified against Supabase Auth) or an optional `WORKER_TOKEN`.

When the machine is off, `/api/health` and the footer report the decision agent offline, Word uploads are reviewed from their text without page geometry, and the screens say so.

## Verifying a deployment

1. Vercel deployment state READY (Vercel dashboard or MCP).
2. `https://anduin-legal-reviewer.vercel.app` loads the hub; footer shows the live status.
3. `https://anduin-legal-reviewer.vercel.app/api/health` returns the worker status and whether the semantic reviewer is configured.
4. Run **Use demo** and follow it to Legal review.
