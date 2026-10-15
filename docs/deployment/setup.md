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
  - `OPENAI_API_KEY` (secret, entered by the owner) and optional `OPENAI_MODEL` (default `gpt-5-mini`). Without the key — or when the key is rejected or has no quota — the semantic reviewer runs through the Codex CLI on the worker; when the worker is offline as well, the deterministic rules still run and the report says the semantic review did not run. Optional `SEMANTIC_ENGINE=codex` forces the CLI engine.
  - `WORKER_URL` is **not** needed in production: the worker publishes its address to Supabase. Set it only to override locally.
- Locally, `next.config.ts` prefers `.env.supabase.local`, because machine-wide `SUPABASE_*` variables on the owner's machine point at another project.

## Supabase

Migrations live in `supabase/migrations/` and were applied with the Supabase MCP:

1. `20261014000000_init.sql` — documents, versions, source blocks, graph edges, findings, append-only decision events, annotations, templates, submissions, exports, jobs; owner-only RLS (`owner = auth.uid()`); private `sources` and `exports` buckets with per-user folder policies; Realtime on `jobs`.
2. `20261015000000_annotation_agent_and_help.sql` — decision-agent answer per annotation; cached plain-language help.
3. `20261015010000_worker_endpoint.sql` — single-row `worker_endpoint` (readable URL, hidden secret hash) and SECURITY DEFINER functions for the worker.
4. `20261015020000_worker_endpoint_hardening.sql` — after a security review: the anonymous claim function is removed (the hash had already been set by the owner's first run; on a fresh project the owner seeds it with SQL), and `set_worker_url` only accepts `https://*.trycloudflare.com` addresses. The app applies the same host check before sending any session token to the worker.

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
- Untrusted uploads: before Word or LibreOffice opens a file, the worker checks each part by its declared content type (not its file name); allowlisted binaries that contain XML are checked as XML too. XML parts are parsed after a pass that refuses DOCTYPE/ENTITY in any encoding. Relationship parts are read by exact attribute names (as Word reads them); they lose every external or absolute target (remote templates, OLE links, frames, linked images, `file:` and UNC paths) except http(s)/mailto hyperlinks, and internal targets need an allowlisted type whose target content type fits (images are images, headers are XML). Field markup is read only in the WordprocessingML namespaces (look-alikes elsewhere are rejected); every field instruction — simple, complex or nested — must start with an allowlisted keyword such as PAGE, REF, TOC or HYPERLINK, must not be empty, must not take its keyword from a nested field, and must not continue after its separator. Internal relationship targets fail closed: they must name an existing part, without `%`, `?`, `#` or backslashes; part names with those characters, empty/`.`/`..` segments or case-insensitive duplicates reject the package. Attributes whose names end in `href` or `src` (linked pictures and fills), attribute values that resolve (after removing whitespace and percent-decoding) to a drive letter, `file:`, UNC or network path, URL-like values (`scheme://`, `mhtml:`, `ms-…:` and similar) other than the standard schema identifiers in `uri` attributes, SVG images, macro-enabled packages, altChunk imports, embedded objects, ActiveX controls, sub-documents, mail-merge data sources, `fldData`, and HTML/RTF/MHT/text parts are rejected. Word runs with macros forced off (`AutomationSecurity = 3`), read-only, without password or encoding prompts, and with link and field updates switched off during conversion (the owner's Word options are restored afterwards). Check: `python test_sanitize.py` from the worker folder.
- Word conversion and semantic review run as background jobs (`POST /jobs/convert`, `POST /jobs/semantic`, then `GET /jobs/{id}` until done; results kept 15 minutes, visible only to the caller). A Cloudflare quick tunnel ends any request after about 100 seconds, which long booklets and some reviews exceed. The synchronous `/convert` and `/semantic` remain for older app builds.
- Requests are accepted only with a valid Supabase session of an app user (verified against Supabase Auth) or an optional `WORKER_TOKEN`.
- `/semantic` runs the semantic reviewer with the owner's signed-in Codex CLI (`codex` on PATH) while the OpenAI key is unfunded. The worker reads the fixed instructions and schema from `src/review/contract-review-v2.json`; callers send only document blocks, the section index and workspace examples (≤ 60 000 characters per call). Codex runs with `--ignore-user-config`, a read-only sandbox, shell, apps, browser, image and web-search features disabled, in an empty temporary directory, one call at a time. Caller data (workspace feedback, index ≤ 20 000 characters, document) goes into delimited sections after the fixed instructions. Because any visitor can hold an anonymous session, calls are capped at 12 per verified user and 60 overall per hour (in memory; a document uses up to 2); check with `python test_semantic_quota.py` from the worker folder. `/semantic/health` reports whether the CLI and prompt file are present.

When the machine is off, `/api/health` and the footer report the decision agent offline, Word uploads are reviewed from their text without page geometry, and the screens say so.

## Verifying a deployment

1. Vercel deployment state READY (Vercel dashboard or MCP).
2. `https://anduin-legal-reviewer.vercel.app` loads the hub; footer shows the live status.
3. `https://anduin-legal-reviewer.vercel.app/api/health` returns the worker status and the semantic engine (`openai-api (codex-cli fallback)` or `codex-cli via worker`).
4. Run **Use demo** and follow it to Legal review.
