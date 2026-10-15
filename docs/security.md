# Security review

Status date: 15 October 2026. Covers the web application (Vercel), Supabase and the worker on the owner's machine. Re-run the checks listed at the end after changing any of them.

## Controls in place

| Area | Control |
| --- | --- |
| Identity | Every visitor gets an anonymous Supabase session; API routes require it (`requireUser`) and act as that user, never with a service key |
| Data isolation | Row-level security on every table (`owner = auth.uid()`); private `sources`/`exports` buckets limited to the user's own folder, 20 MB, PDF/DOCX (and PDF/JSON/Markdown for exports) |
| Upload handling | Path must start with the caller's id; magic bytes must match the extension; exact duplicates reopen the earlier record |
| Abuse limits | Processing (uploads and re-runs) capped at 30 per workspace per hour; semantic review capped per verified user (12/h) and overall (60/h) in the worker; worker jobs capped at 8 running, 3 per user |
| Untrusted Word files | Parsed as XML before Word opens them: macros, DTDs, external and absolute links, remote/DDE fields, embedded objects, altChunk imports, SVG and file/UNC values are refused; Word runs with macros off and link/field updates off |
| Untrusted contract text | Sent to reviewers as data in a separate section; fixed instructions and output schema live in the worker; every finding must quote the source exactly; the Codex CLI runs with tools, shell, browser and web search disabled |
| Browser | Production Content-Security-Policy (scripts only from this origin, data only to this app and the project's Supabase, no plugins, no framing), `Permissions-Policy`, `X-Frame-Options: DENY`, `nosniff`, strict referrer; Word HTML preview passes an allow-list sanitiser |
| Worker endpoint | Address published only with a secret whose hash is stored in Supabase, and only for `*.trycloudflare.com`; the app checks the same pattern before sending a session token; every worker call needs a verified Supabase session |
| Errors | Only deliberate messages reach the browser; unexpected server errors are logged, not returned |

## Findings of the 15 October review and what was done

| Finding | Severity | Outcome |
| --- | --- | --- |
| Unexpected server errors returned internal messages to the browser | Low | Fixed: generic message, details in the server log |
| No limit on uploads or re-runs per workspace (each costs worker time) | Medium | Fixed: 30 per hour per workspace (429) |
| Report "questions for counsel" text unbounded | Low | Fixed: capped at 4,000 characters |
| No Content-Security-Policy or Permissions-Policy | Medium | Fixed in production builds; verified on a local production build (3D hub, upload, Word preview, PDF viewer, no violations) |
| Theme URL parameter not restricted | Informational | Fixed: only `light`/`dark` accepted |
| Several worker issues raised by automated reviews (Word sanitiser bypasses, unbounded jobs, quota accounting) | Medium–High | Fixed; see the 15 October build log |
| `sprintf-js` (via `mammoth` → `argparse`) denial-of-service advisory | Moderate (npm audit) | Not reachable: only `mammoth`'s command-line tool loads `argparse`; the library code the app uses does not. No patched version exists |
| Supabase advisor: anonymous-access policies on all tables | Warning | Intentional (anonymous workspaces); every policy is owner-scoped |
| Supabase advisor: `set_worker_url` callable by `anon` | Warning | Intentional: requires the worker's 32-byte secret (hash compared server-side) and a tunnel address |
| Supabase advisor: leaked-password protection off | Warning | Not applicable: the app has no passwords |

## Accepted limitations

- Anonymous sign-up is open, so many anonymous workspaces could together use the worker's 8 job slots; the per-user caps limit any single workspace. Supabase's own sign-in rate limits apply per IP.
- An anonymous workspace lives in one browser; clearing site data loses access to it.
- The worker is the owner's laptop behind a quick tunnel: availability is not guaranteed, and the tunnel provider sees the traffic in transit (TLS to Cloudflare).
- No OCR: scanned pages are reported as unread rather than reviewed.

## How to re-check

- `npm audit --omit=dev` and the Supabase security advisor.
- `python worker/test_sanitize.py` and `python worker/test_semantic_quota.py` (from `worker/`).
- `curl -sI https://anduin-legal-reviewer.vercel.app/` for the security headers.
