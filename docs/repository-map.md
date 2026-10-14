# Complete repository map

Every directory below exists locally and is represented on GitHub by a meaningful document or fixture. Directories for future implementation are explicitly labeled as planned.

```text
anduin-legal-reviewer/
├── .github/
│   └── ISSUE_TEMPLATE/
├── docs/
│   ├── challenge/
│   ├── product/
│   ├── architecture/
│   ├── decisions/
│   ├── project/
│   ├── judging/
│   └── deployment/
├── design/
│   ├── homepage/
│   ├── interfaces/
│   ├── dark-mode/
│   ├── components-3d/
│   ├── references/
│   ├── prompts/
│   ├── blender/
│   └── manifests/
├── context/
│   ├── briefs/
│   └── research/
├── prompts/
│   ├── development/
│   ├── review/
│   └── evaluation/
├── openai/
├── src/
│   ├── app/
│   ├── components/
│   ├── review/
│   ├── digitize/
│   ├── integrations/
│   └── lib/
├── public/
│   ├── 3d/
│   └── demo/
├── worker/
├── scripts/
├── tests/
├── supabase/
├── data/
│   ├── synthetic/
│   └── schemas/
├── evals/
│   ├── datasets/
│   └── results/
├── experiments/
├── demo/
│   ├── screenshots/
│   └── submission/
├── progress/
│   └── build-log/
└── references/
```

| Folder | What belongs here |
| --- | --- |
| `.github/` | Pull-request review template |
| `.github/ISSUE_TEMPLATE/` | Task intake template |
| `docs/` | Project documentation index and this complete map |
| `docs/challenge/` | Source-backed organizer challenge and event constraints |
| `docs/product/` | User problem, proposed workflow, scope, acceptance criteria |
| `docs/architecture/` | Proposed system flow and component responsibilities |
| `docs/decisions/` | Dated decisions, alternatives when relevant, consequences |
| `docs/deployment/` | Actual Vercel/Supabase setup, links, and reproduction steps |
| `docs/project/` | Public English project profile, full workflow plan, proposed system and reproducible inspection/setup |
| `docs/judging/` | Reading order and evidence boundaries for judges |
| `design/` | Overall visual specification and complete design package index |
| `design/homepage/` | Approved homepage image, preserved byte-for-byte |
| `design/interfaces/` | Nine synthetic functional-screen concept stills |
| `design/dark-mode/` | Ten separate dark companions for the hub and nine screens |
| `design/components-3d/` | Nine individual transparent object modeling references |
| `design/references/` | Structured UI 2/web and UI 3/object reference descriptions |
| `design/prompts/` | Exact image prompts and targeted refinement records |
| `design/blender/` | Blender build script, saved scene and station documentation |
| `design/manifests/` | Actual asset metadata, integrity/alpha checks and archive verification |
| `context/` | Development context conventions |
| `context/briefs/` | Public-safe user request summaries and reusable context packs |
| `context/research/` | Sources, observations, and implications |
| `prompts/` | Versioned prompt registry and usage conventions |
| `prompts/development/` | Build-task prompts for development work |
| `prompts/review/` | Contract reviewer instruction drafts |
| `prompts/evaluation/` | Optional evaluator instruction drafts |
| `openai/` | Official-source notes, concepts, and integration plan |
| `src/` | Application source (see `src/README.md`) |
| `src/app/` | Next.js page, layout and API routes |
| `src/components/` | Shell, 3D hub, nine workspaces, PDF viewer, three.js stations |
| `src/review/` | Extraction, checks, semantic adapter, evidence validation, pipeline |
| `src/digitize/` | Field detection, annotation QA, form model, PDF fill and QA |
| `src/integrations/` | Supabase server client and worker client |
| `src/lib/` | Shared types, navigation, workspace state, uploads |
| `public/` | Station models (`3d/`), PNG fallbacks and synthetic demo files (`demo/`) |
| `worker/` | Decision-agent and conversion worker, local tunnel runner, Dockerfile |
| `scripts/` | Demo builder, asset helpers, screenshot and PDF text helpers |
| `tests/` | Meaningful tests of implemented application code |
| `supabase/` | Backend record and applied SQL migrations |
| `data/` | Public data conventions |
| `data/synthetic/` | Fictional, publishable demonstration documents |
| `data/schemas/` | Versioned model/application output contracts |
| `evals/` | Model-quality plan and scoring rubric |
| `evals/datasets/` | Synthetic inputs with expected finding labels |
| `evals/results/` | Actual outputs and assessment after execution |
| `experiments/` | Hypotheses, reproducible configurations, actual observations |
| `demo/` | Demonstration script and artifact conventions |
| `demo/screenshots/` | Actual application screenshots after implementation |
| `demo/submission/` | Live/repository links and submission record |
| `progress/` | Roadmap, changelog, and development-log conventions |
| `progress/build-log/` | Dated tasks, decisions, validation evidence, limits |
| `references/` | Upstream provenance and adaptation attribution |

## Root files

- `README.md`: reviewer-facing overview, status, and entry points.
- `AGENTS.md`: persistent project instructions, including GitHub synchronization after each project task.
- `.gitignore`: exclusions for existing independent checkouts, secrets, private inputs, environments, and local runtime data.
- `.gitattributes`: text/line-ending conventions.
- `vercel.json` and `.vercelignore`: static hosting configuration and upload exclusions.
- `.env.example`: configuration variable names and placeholders; actual values remain ignored.

## Local-only existing folders

`contract-reader-agent/` and `laya/` remain in the local workspace as independent repositories. They are excluded from this public repository and listed in [the reference register](../references/upstream.md). The hidden root `.git/` contains repository metadata and is not published as a folder.

`design/references/source-images/` contains the owner's supplied JPEGs locally. `design/exports/` contains the local delivery ZIP. Both are untracked; the public package consists of the generated images and design documents. The first overall plan's local source remains in its existing ignored context location. At the owner's explicit request, an unchanged public copy is available as [docs/project/01-first-overall-plan.md](project/01-first-overall-plan.md); other private planning inputs remain excluded.
