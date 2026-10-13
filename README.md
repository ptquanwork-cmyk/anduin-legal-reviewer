# Anduin Legal Reviewer

**An evidence-first contract review project for Anduin's Cybernetics hackathon.**

Built by [Quan / Jayson](https://github.com/ptquanwork-cmyk) for **The Legal Reviewer** challenge. This repository records the journey from business problem and context design to prompts, implementation, experiments, and a reviewable demo.

**[Live project hub](https://anduin-legal-reviewer.vercel.app)** · **[Vercel project](https://vercel.com/jayson3/anduin-legal-reviewer)** · **[Supabase dashboard](https://supabase.com/dashboard/project/hxucmhlssgasjthxaklr)**

The live page presents the project and build journey. Contract upload/review is still being implemented. Infrastructure dashboards require the owner's account access.

## The problem

Contract digitization teams need to identify flawed inputs before downstream work begins. The challenge highlights typos, missing references, contradictions, and ambiguous terms that require confirmation with external legal counsel.

## Proposed experience

Upload a contract, inspect findings tied to source passages, and record which issues need clarification. Each finding should explain the suspected problem and ask a specific confirmation question. The reviewer stays in control.

## Current status — 14 October 2026

| Deliverable | Status |
| --- | --- |
| Public repository and project structure | Published; public visibility verified |
| Challenge interpretation and proposed workflow | Documented |
| 3D workflow design package | [Design folder](design/README.md): approved homepage, two reference JSONs, nine interface concepts and nine component references; no Blender scene or interactive implementation |
| Context packs and versioned prompt drafts | Seeded; not evaluated |
| Synthetic evaluation cases and finding schema | Seeded; no model runs |
| Hackathon application in `src/` | Planned; no runtime yet |
| OpenAI API integration and performance metrics | Not implemented or measured |
| Static project hub on Vercel | Live; public HTTP 200 verified |
| Supabase project | Created; database and Auth API connectivity verified |
| Working contract-review demo and portal submission | Pending |

Two independent upstream checkouts already exist in the local workspace. They are documented in [references](references/README.md); their source, environments, and local data are excluded from this repository. They are not the submitted hackathon application.

## Start here

1. [Challenge brief](docs/challenge/brief.md) — what the screenshots establish.
2. [Product scope](docs/product/mvp.md) — proposed reviewer workflow and acceptance criteria.
3. [Context pack](context/briefs/project-context.md) — reusable inputs for development.
4. [Prompt library](prompts/README.md) — development, document review, and evaluation.
5. [OpenAI design notes](openai/README.md) — documentation-grounded concepts and project choices.
6. [Evaluation plan](evals/README.md) — cases, expected findings, and scoring.
7. [Build log](progress/build-log/2026-10-13.md) and [roadmap](progress/roadmap.md) — actual progress and next steps.
8. [Complete folder map](docs/repository-map.md) — every public folder and its purpose.
9. [Design package](design/README.md) — overall specification, approved homepage, nine functional interfaces, nine individual Blender object references and exact prompts. [Homepage preview](design/homepage/anduin-3d-workflow-hub-v1.png).

## Repository layout

```text
anduin-legal-reviewer/
├── .github/ISSUE_TEMPLATE/        # Task intake and review template
├── docs/                        # Challenge, product, architecture, decisions
├── design/                      # Approved hub, screen concepts, object references, prompts
├── context/                     # User briefs and source-backed research
├── prompts/                     # Versioned development/review/evaluation prompts
├── openai/                      # Concepts, integration plan, official sources
├── src/                         # Future app, review pipeline, integrations
├── supabase/                    # Backend project record and migration conventions
├── tests/                       # Future deterministic/application tests
├── data/                        # Synthetic documents and output schema
├── evals/                       # Evaluation inputs, rubric, actual results
├── experiments/                 # Reproducible experiment records
├── demo/                        # Demo assets, script, submission record
├── progress/                    # Build log, roadmap, changelog
└── references/                  # Upstream provenance and reuse boundaries
```

## How the project demonstrates OpenAI understanding

The evidence should connect **context → prompt → output contract → evaluation → revision**. Source documents are treated as data. Prompt drafts have versions; model findings need verifiable excerpts; results are recorded only after a run. A structured response helps validation, but it does not establish that a finding is correct. See [OpenAI notes](openai/concepts.md), grounded in [Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), and [evaluation guidance](https://developers.openai.com/api/docs/guides/evals).

These notes describe the proposed approach. They are not a claim of completed integration or measured expertise.

## Working locally

The repository contains documentation, prompts, a schema, synthetic evaluation fixtures, and a dependency-free static project hub in `src/app/public/`.

Preview the hub locally from the repository root:

```powershell
python -m http.server 4173 --bind 127.0.0.1 --directory src/app/public
```

Open `http://127.0.0.1:4173`. Production hosting uses `vercel.json` and the connected GitHub repository. See [deployment setup](docs/deployment/setup.md). Contract-review application setup will be added when that implementation exists.

## Keeping GitHub up to date

[AGENTS.md](AGENTS.md) records the owner's standing instruction: for each task in this project, update the relevant artifacts and build log, check the task's changes, then commit and push to this public repository. Report any sync failure explicitly. This is a development workflow, not a background file-sync service.

Publish only project-safe material. Real contracts, credentials, raw private chats, uploads, and local feedback databases stay outside tracked files. Published examples in this repository are synthetic.
