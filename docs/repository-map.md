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
│   └── deployment/
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
│   │   └── public/
│   ├── review/
│   └── integrations/
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
| `context/` | Development context conventions |
| `context/briefs/` | Public-safe user request summaries and reusable context packs |
| `context/research/` | Sources, observations, and implications |
| `prompts/` | Versioned prompt registry and usage conventions |
| `prompts/development/` | Build-task prompts for development work |
| `prompts/review/` | Contract reviewer instruction drafts |
| `prompts/evaluation/` | Optional evaluator instruction drafts |
| `openai/` | Official-source notes, concepts, and integration plan |
| `src/` | Future application source and run instructions |
| `src/app/` | Future UI, application state, review actions, export |
| `src/app/public/` | Deployed static project hub; entry point `index.html` |
| `src/review/` | Future extraction, checks, and evidence validation |
| `src/integrations/` | Future OpenAI and external service adapters |
| `tests/` | Meaningful tests of implemented application code |
| `supabase/` | Backend project record and future migration conventions |
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
