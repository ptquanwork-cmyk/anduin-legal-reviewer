# Prompt library

Keep the exact reusable instructions here; store task background separately in `context/`. Version prompt filenames and update the table when changing behavior.

| ID | File | Purpose | Status |
| --- | --- | --- | --- |
| DEV-001 | [development/build-task-v1.md](development/build-task-v1.md) | Implement a bounded task with context and validation | Draft |
| REVIEW-001 | [review/contract-review-v1.md](review/contract-review-v1.md) | Produce source-backed contract findings | Draft; no model run |
| EVAL-001 | [evaluation/grade-findings-v1.md](evaluation/grade-findings-v1.md) | Review output against the evaluation rubric | Draft; no model run |

For experiments record the prompt file/commit, model identifier, settings, input dataset, actual output, and human review. Preserve previous versions when introducing meaningful behavior changes. Do not publish private reasoning traces; use concise decision explanations and observable evidence.
