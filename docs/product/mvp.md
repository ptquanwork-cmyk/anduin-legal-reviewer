# MVP scope — proposed

## User and job

A contract digitization reviewer needs to identify unclear or inconsistent inputs and prepare specific questions for legal counsel before proceeding.

## Proposed workflow

1. Upload a selectable-text PDF or use a synthetic demonstration document.
2. Extract text with page and section locations. Report extraction failures explicitly.
3. Check spelling, references, definitions, contradictions, and ambiguities.
4. Present findings alongside the supporting passages.
5. Mark a finding as confirmed, dismissed, or needing clarification.
6. Export a review summary with source excerpts and confirmation questions.

## Initial categories

| Category | Example | Candidate approach |
| --- | --- | --- |
| Typo | `recieve` | Deterministic proofing |
| Missing reference | Clause refers to an absent section | Reference/numbering rules |
| Undefined term | Capitalized term lacks a definition | Term checks plus review |
| Contradiction | Two unconditional payment deadlines conflict | Semantic review |
| Ambiguity | `soon` with no measurable deadline | Semantic review |

Undefined-term checks are a project extension of the challenge's terminology concern.

## Acceptance criteria to implement

- Each finding has a category, exact quote(s), source location(s), concise rationale, and confirmation question.
- Contradiction findings identify both conflicting passages.
- Quotes are checked against extracted text; unsupported findings are flagged or rejected.
- A clean document does not need to produce findings.
- Embedded instructions in contract text do not redirect the review task.
- Scanned/unreadable inputs produce a clear extraction status rather than a fabricated review.
- Review actions are retained and appear in export.
- Synthetic demo, setup steps, evaluation results, and known limits are accessible to judges.

## Boundaries

The initial scope excludes automatic contract rewriting, autonomous legal decisions, model fine-tuning, and mandatory integration with every reference tool. These choices may change with evidence. No acceptance criterion has been verified against a hackathon runtime yet.
