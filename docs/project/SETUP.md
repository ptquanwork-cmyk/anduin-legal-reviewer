# Repository setup and reading workflow

14 October 2026 · Existing static hub plus future application scaffold.

## Open the project

```powershell
git clone https://github.com/ptquanwork-cmyk/anduin-legal-reviewer.git
cd anduin-legal-reviewer
```

Read [the judge guide](../judging/README.md), then the three primary specifications: [Overall Plan](01-first-overall-plan.md), [design.md](../../design/design.md) and [UI Master](../../design/UI%20Master.md). [Profile](PROFILE.md), [English workflow summary](PLAN.md) and [System](SYSTEM.md) provide supporting context. [Repository map](../repository-map.md) identifies each artifact group.

## Run the existing static hub

The static HTML page is in `src/app/public/`. It requires no application dependency installation or backend credential to preview:

```powershell
python -m http.server 4173 --bind 127.0.0.1 --directory src/app/public
```

Open `http://127.0.0.1:4173`. This serves the existing project presentation, not the new 3D interface concepts as a working application. The light/dark UI files are PNGs in `design/`; viewing them does not exercise upload, review or export.

## Read the design package

- `design/homepage/`: approved light hub.
- `design/interfaces/`: nine approved light functional concepts.
- `design/dark-mode/`: ten theme companions, one per hub/section screen.
- `design/components-3d/`: nine isolated RGBA Blender object references.
- `design/UI Master.md`: complete interface/theme/interaction specification.
- `design/references/`: structured web/object reference observations.
- `design/prompts/`: exact generation instructions and refinements.
- `design/manifests/`: actual dimensions, hashes, transparency/preservation and archive checks.

The standalone images are references, not meshes. [Blender handoff](../../design/blender/README.md) gives proposed collection/material/motion organization; no Blender runtime dependency is needed to inspect this repository.

## Infrastructure records

[Deployment setup](../deployment/setup.md) records the Git-linked Vercel project in `jayson3` and dedicated Supabase project `hxucmhlssgasjthxaklr`, Singapore. Its connectivity claims are dated evidence from earlier verification, not a fresh database test performed for this documentation task.

`vercel.json` hosts the static public directory. No application migration, contract bucket or worker deployment is added by the design/documentation package. Private local configuration belongs in ignored `.env.supabase.local` / `.env.local`; `.env.example` contains names/placeholders. Machine-wide Supabase values may refer to other projects.

## Implementation scaffold

`src/app/`, `src/review/` and `src/integrations/` contain responsibility/run-note placeholders for future application work. `tests/` is for deterministic implemented behavior; `evals/` for actual model-quality evaluation. Synthetic cases/output schema are seeds, not results.

Before introducing a runtime, select dependencies using source/licensing review, implement the [original plan](01-first-overall-plan.md) milestones with the [English summary](PLAN.md) as a reading aid, record actual installation/startup commands, and test a reproducible flow. Do not present the independent local reference checkouts as the hackathon application. Their provenance is in [references](../references/README.md).

## Publishing and validation

Per project instructions: summarize new requirements, complete artifacts, verify applicable behavior/metadata, inspect staged content, commit/push task files and confirm the remote commit. Keep public documentation concise, English-first and honest about proposals and actual results. Deployment verification is required for changes to the hosted site/configuration; design/documentation work does not require an unrelated migration or site redesign.

The current package was checked for PNG decoding/dimensions, light-asset preservation, alpha transparency, token contrast proposals, links and archive integrity. These are design-delivery checks, not runtime performance, model quality, keyboard accessibility or security tests.
