# Repository map

The repository has four groups of folders: the application, its quality evidence, the documentation and design, and the record of how it was built. For how the folders fit together at run time, see the [architecture and workflow map](architecture/overview.md).

```text
anduin-legal-reviewer/
│
│  Application
├── src/                  Next.js app: page, API routes, components, review and digitize pipelines
│   ├── app/              page, layout and API routes
│   ├── components/       shell, 3D hub, nine workspaces, PDF viewer, three.js stations
│   ├── review/           extraction, rules, semantic adapter, evidence validator, pipeline
│   ├── digitize/         field detection, annotation QA, form model, PDF fill and QA
│   ├── integrations/     Supabase server client, worker client
│   └── lib/              shared types, navigation, workspace state, uploads, guides
├── public/               station stills (3d/png), station models (3d), demo files (demo)
├── worker/               Python worker: decision agent, Word conversion, semantic review, tunnel runner, tests
├── supabase/             SQL migrations (schema, RLS, storage, Realtime)
├── scripts/              demo builders, end-to-end runs, screenshot and PDF helpers
│
│  Quality evidence
├── tests/                deterministic tests of application code
├── evals/                offline evaluation, datasets, dated test reports (results/)
├── data/                 synthetic demo contracts with planted problems, text samples, output schemas
│
│  Documentation and design
├── docs/                 product, architecture, security, deployment, judging guide, decisions
│   ├── openai/           official-source notes and the model integration plan
│   └── references/       upstream provenance and licences
├── design/               approved designs (light, dark, 3D objects), Blender script, prompts, manifests
├── demo/                 introduction video and its sources, screenshots, demo script, submission checklist
│
│  How it was built
├── context/briefs/       public-safe summary of every request
├── prompts/              versioned prompts (review, development, evaluation)
└── progress/             dated build logs, changelog, roadmap
```

| Folder | What belongs here |
| --- | --- |
| `.github/` | Pull-request and task templates |
| `src/` | Application source (see [`src/README.md`](../src/README.md)) |
| `public/` | Station stills and models, synthetic demo files served by the app |
| `worker/` | Decision-agent, conversion and semantic-review worker; local tunnel runner; Dockerfile; Python tests |
| `supabase/` | Backend record and applied SQL migrations |
| `scripts/` | `build-demo.mjs`, `build-demo-contracts.mjs`, `e2e-contracts.mjs`, `e2e-memory.mjs`, asset, screenshot and PDF text helpers |
| `tests/` | Vitest tests of application code |
| `evals/` | Offline evaluation of the rule layer, rubric, datasets and dated [test reports](../evals/results/) |
| `data/demo-contracts/` | Synthetic fund documents and `expected.json` with their planted problems and traps |
| `data/synthetic/`, `data/schemas/` | Fictional text samples; output contracts |
| `docs/` | Documentation index, [security review](security.md), this map |
| `docs/challenge/`, `docs/product/` | Challenge brief; user problem, scope, acceptance criteria |
| `docs/architecture/`, `docs/deployment/` | Workflow, system and pipeline maps; actual Vercel and Supabase setup |
| `docs/decisions/`, `docs/project/`, `docs/judging/` | Dated decisions; project profile and full plan; reading order for judges |
| `docs/openai/`, `docs/references/` | Model integration notes; upstream provenance and licences |
| `design/` | Visual specification and the complete design package (see [`design/README.md`](../design/README.md)) |
| `demo/` | [Introduction video](../demo/video/), screenshots, demo script, submission checklist |
| `context/` | Request briefs and research notes |
| `prompts/` | Prompt registry and versioned prompts |
| `progress/` | [Build logs](../progress/build-log/), [changelog](../progress/CHANGELOG.md), roadmap |

## Root files

- `README.md`: overview, video, test results and entry points.
- `AGENTS.md`: standing instructions for the coding agents, including GitHub synchronization after each task.
- `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`: Next.js configuration.
- `vercel.json`, `.vercelignore`: framework settings, daily health cron, security headers, upload exclusions.
- `.env.example`: variable names only; values stay in ignored files.
- `.gitignore`, `.gitattributes`: exclusions and line-ending rules.

## Local-only folders

`contract-reader-agent/` and `laya/` stay in the local workspace as independent repositories. They are excluded from this repository and listed in [the reference register](references/upstream.md).

`design/references/source-images/` (the owner's supplied JPEGs) and `design/exports/` (the delivery ZIP) are untracked. At the owner's request, an unchanged public copy of the first overall plan is at [docs/project/01-first-overall-plan.md](project/01-first-overall-plan.md); other private planning inputs stay excluded.
