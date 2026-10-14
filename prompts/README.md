# Prompt library

Keep the exact reusable instructions here; store task background separately in `context/`. Version prompt filenames and update the table when changing behavior.

| ID | File | Purpose | Status |
| --- | --- | --- | --- |
| DEV-001 | [development/build-task-v1.md](development/build-task-v1.md) | Implement a bounded task with context and validation | Draft |
| REVIEW-001 | [review/contract-review-v1.md](review/contract-review-v1.md) | Produce source-backed contract findings | Superseded by REVIEW-002 |
| REVIEW-002 | [review/contract-review-v2.md](review/contract-review-v2.md) | Semantic reviewer: contradictions, ambiguities, undefined terms with verbatim block quotes (strict JSON schema) | In the application (`src/review/semantic.ts`); not yet evaluated on labelled data |
| EVAL-001 | [evaluation/grade-findings-v1.md](evaluation/grade-findings-v1.md) | Review output against the evaluation rubric | Draft; no model run |
| DESIGN-001 | [design/3d-workflow-hub-v1.md](../design/prompts/3d-workflow-hub-v1.md) | Generate/refine the 3D workflow homepage approval image | Concept generated; no application or Blender implementation |
| DESIGN-002 | [design/interfaces-components-v1.json](../design/prompts/interfaces-components-v1.json) | Generate nine functional interfaces and nine isolated 3D reference images | Design-only prompt matrix; per-asset output verification in design manifest |
| DESIGN-003 | [design/dark-mode-v1.json](../design/prompts/dark-mode-v1.json) | Theme-edit the approved hub/nine screens into separate dark companions | Ten static companions; original assets preserved |

Design prompts are consolidated under `design/prompts/` at the owner's request. [Generation appendices and refinements](../design/prompts/generation-refinements-v1.json) record targeted navigation/source/field corrections to the base prompt matrix.

For experiments record the prompt file/commit, model identifier, settings, input dataset, actual output, and human review. Preserve previous versions when introducing meaningful behavior changes. Do not publish private reasoning traces; use concise decision explanations and observable evidence.
