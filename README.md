# Anduin Legal Reviewer

**Review contracts before you digitize: source-linked findings, human decisions and verified exports.**

Built by [Quan / Jayson](https://github.com/ptquanwork-cmyk) for **The Legal Reviewer** challenge of Anduin's Cybernetics hackathon.

**[Live application](https://anduin-legal-reviewer.vercel.app)** · **[Vercel project](https://vercel.com/jayson3/anduin-legal-reviewer)** · **[Supabase dashboard](https://supabase.com/dashboard/project/hxucmhlssgasjthxaklr)**

Open the live link, choose **Use demo** (a synthetic agreement) or upload your own `.pdf`/`.docx`. Every visitor gets a private anonymous workspace. Do not upload real confidential contracts to a hackathon build.

## The problem

Contract digitization teams need to catch flawed inputs before downstream work begins: typos, missing references, contradictory clauses and ambiguous terms that must be confirmed with legal counsel. Rework happens when these are found late.

## What the application does

One page: a 3D workflow hub (stations modelled in Blender, rendered live with three.js) opens nine workspaces. Clicking a station flies its object into the workspace header.

| # | Workspace | What actually happens |
| --- | --- | --- |
| 01 | Intake | Upload to private storage, SHA-256 identity (exact duplicates reopen the earlier record), live job steps, related-version candidates by content similarity, block diff and "treat as new version" |
| 02 | Source quality | Word original rendered beside the converted PDF; real font-substitution and text-loss detection (declared Word fonts vs fonts embedded in the PDF); page coverage; manual-comparison confirmation gate |
| 03 | Document map | Outline from numbered headings (English and Vietnamese), parsed references/definitions, proposed conflicts as dashed edges, page map, source drawer |
| 04 | Legal review | Typos, missing references, contradictions, ambiguities and undefined terms with exact quotes and page anchors; confirm / dismiss with reason / request clarification; separated confidence signals |
| 05 | Decision / report | Outcome (ready, needs clarification, revision needed, approved with exceptions, blocked by source quality), questions for counsel, review report PDF, v1→v2 comparison where a missing finding is only *proposed* resolved until the reviewer confirms |
| 06 | Annotation | Exactly four types (paragraph, text box, radio box, checkbox); detection from layout, double-checked by the decision agent; drag/resize/draw editor; content-based transfer between versions; QA gate |
| 07 | Form preview | Full original text in order with controls; unmapped blocks block responses; plain-language help kept separate from contract text |
| 08 | Responses | Version-bound answers with autosave and validation; draft PDF only when required answers are present |
| 09 | PDF QA / export | Answers written into the PDF at annotation geometry, then the output is re-read: content coverage, field mapping, answer values, page render (e.g. *answer clipped*). Final export only after QA passes and the reviewer confirms |

Templates (approved field structure, no answers) and Feedback (decision history; selected decisions guide later semantic reviews in the workspace) are management pages.

## How findings are produced

1. **Deterministic rules** (`src/review/checks.ts`): numeric contradictions between near-identical obligations, references to sections/exhibits/annexes that do not exist (incl. *Điều/Khoản/Phụ lục*), vague obligation terms, capitalised terms without definitions, spelling (Hunspell dictionaries plus a high-precision list).
2. **Semantic reviewer** (OpenAI Responses API with a strict JSON schema, `src/review/semantic.ts`, prompt [`contract-review-v2`](prompts/review/contract-review-v2.md)): contradictions, ambiguities and undefined terms. Contract text is sent as data; the reviewer may return nothing. Runs only when `OPENAI_API_KEY` is configured.
3. **Evidence validator** (`src/review/validate.ts`): every quote must match the extracted source text; contradictions need two matched passages; duplicates are merged. Unsupported candidates are rejected and listed as limitations.
4. **Decision agent** ([Laya](https://github.com/NandhaKishorM/laya), Apache-2.0) in the worker: routes steps (document type, fillable fields, need for semantic review), orders findings (needs counsel, impact) and double-checks annotation types. Its `answer_confidence` is shown as **not calibrated**.

No score is presented as a probability of correctness, and no confirmation is presented as a resolution.

## Architecture

```text
Browser (Next.js single page, three.js stations, pdf.js viewer)
  │  Supabase anonymous session (RLS: owner = auth.uid()), direct upload to private storage
  ▼
Vercel functions (Next.js route handlers; pipeline runs after the response, job steps via Realtime)
  ├─ src/review    extraction, rules, semantic adapter, evidence validator, report
  ├─ src/digitize  field detection, annotation QA, form model, PDF fill + QA
  └─ worker (owner's machine behind a Cloudflare quick tunnel; URL published to Supabase)
        /convert  Word → PDF with Microsoft Word (or LibreOffice in the Docker image)
        /decide   Laya typed decisions, batched
        Access: requests carry the caller's Supabase session, verified with Supabase Auth
```

When the worker is offline the application still reviews Word text (without page geometry) and says so on every affected screen.

## Running locally

Requirements: Node 24, the project's `.env.supabase.local` (public URL and publishable key; machine-wide Supabase variables may belong to other projects) and optionally `OPENAI_API_KEY` in `.env.local`.

```bash
npm install
```

```bash
npm run dev
```

Worker (Laya + Word conversion + tunnel), from the repository root on the owner's Windows machine, using the local Laya environment:

```bash
laya\.venv\Scripts\python.exe worker\run_local.py
```

The runner starts the worker on port 7860, opens a Cloudflare quick tunnel, waits until the address answers, publishes it to Supabase (`worker_endpoint`, protected by a local secret file that is never committed) and recreates the tunnel if it stops answering. `worker/Dockerfile` packages the same service with LibreOffice for a container host.

Checks:

```bash
npm test
```

```bash
npx tsc --noEmit
```

Developer aids: `?overlay=04` lays an approved design over the page (development only), `?theme=dark|light`, `?static` forces the PNG stations, `scripts/shot.ps1` takes headless screenshots, `scripts/pdf-text.mjs` prints the text of an exported PDF.

## Status — 15 October 2026

| Deliverable | Status |
| --- | --- |
| Single-page application on Vercel | Built; preview deployments READY (see build log for production verification) |
| Supabase schema, RLS, private storage, Realtime | Applied (`supabase/migrations/`); security advisor warnings only for intentional anonymous access and the secret-gated worker RPCs |
| End-to-end flow on the synthetic demo | Verified locally on 15 Oct 2026: upload → Word conversion → 4 findings → decisions → report PDF → v2 revision → annotation QA → responses → clipping caught → QA passed → confirmed final PDF |
| Blender stations | 9 modules built by `design/blender/build_modules.py`, exported as Draco GLB; approximations of the approved stills, which remain the fallback |
| Semantic reviewer (OpenAI) | Implemented; runs where `OPENAI_API_KEY` is configured |
| Decision agent (Laya) | Running in the worker; CPU latency measured at about 2–18 s per batched call on the owner's machine |
| Model-quality evaluation on real contracts | Not done; no calibration claim |
| Worker availability | Depends on the owner's machine being on; otherwise the app reports it offline |

## Start here

1. [Judge reading guide](docs/judging/README.md) and the three primary specifications: [Overall Plan](docs/project/01-first-overall-plan.md), [design.md](design/design.md), [UI Master](design/UI%20Master.md).
2. [Build log](progress/build-log/2026-10-15.md) — what was built and verified, with actual results and limitations.
3. [Deployment and backend setup](docs/deployment/setup.md) — Vercel, Supabase, worker.
4. [Prompt library](prompts/README.md) and [evaluation plan](evals/README.md).
5. [References](references/README.md) — upstream provenance and licences.

## Repository layout

```text
anduin-legal-reviewer/
├── src/app/          # Next.js App Router: single page + API routes
├── src/components/   # Shell, hub, nine workspaces, PDF viewer, three.js stations
├── src/review/       # Extraction, rules, semantic adapter, validator, pipeline
├── src/digitize/     # Field detection, annotation QA, form model, PDF fill and QA
├── src/integrations/ # Supabase (server), worker client
├── worker/           # FastAPI worker (Laya, Word/LibreOffice), local tunnel runner, Dockerfile
├── supabase/         # Migrations
├── design/           # Approved designs, Blender build script and .blend, prompts, manifests
├── public/3d/        # Station GLB models and PNG fallbacks
├── tests/            # Deterministic tests
├── data/ evals/      # Synthetic documents, schema, evaluation cases
├── docs/ context/ prompts/ progress/ references/ openai/
```

## Keeping GitHub up to date

[AGENTS.md](AGENTS.md) records the owner's standing instruction: each task updates the relevant artifacts and build log, checks the changes, then commits and pushes to this public repository. Real contracts, credentials, uploads, local secrets and private planning material stay untracked; published examples are synthetic.
