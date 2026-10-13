# Project context pack — v1

- Project: Anduin Legal Reviewer.
- Event: Anduin Cybernetics hackathon, as shown in owner-supplied screenshots.
- Selected business problem: review contracts before digitization to identify typos, missing references, contradictions, and ambiguous terms.
- Primary user: contract digitization reviewer; confirmation may involve legal counsel.
- Repository language: English.
- Public repository: https://github.com/ptquanwork-cmyk/anduin-legal-reviewer
- Current deliverable: project foundation and traceable build process.
- Runtime status: not built in this repository.
- Hosting: static project hub deployed on Vercel; Supabase backend project created separately. These do not establish a working contract-review application.
- Workflow: retain context, version prompts, record actual experiments, verify relevant changes, update the build log, commit and push after each project task.
- Data rule: use synthetic public examples; keep real contracts and secrets local and untracked.
- Existing references: independent local `contract-reader-agent/` and `laya/` checkouts, excluded from the public root.

## Request record: 2026-10-13

The owner asked to create a suitably named public GitHub repository and matching local structure, enumerate its subfolders, use English as its primary language, and keep it updated on future project requests. The repository should make the development journey, supplied context, prompting, and OpenAI approach visible.

The owner additionally requested a Vercel hosting link and a Supabase project link, and asked to be told if account connectivity prevented setup. Both account connections were available; infrastructure was provisioned and checked.

## Inputs to review before a new task

Read `AGENTS.md`, the latest relevant brief, the current product scope, the relevant prompt version, and the latest progress entry. Check live repository state before relying on older notes. Add a dated brief when requirements change.
