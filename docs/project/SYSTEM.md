# System responsibilities and trust boundaries

14 October 2026 · **Proposed architecture**. The deployed page is a static project hub; the contract-processing application and workers are not implemented in this repository.

## Runtime separation

| Layer | Responsibility | Boundary |
| --- | --- | --- |
| Website/UI | Source views, graph, findings/decisions, annotation, forms and export state | Contains no worker credentials; shows actual job status only |
| Authenticated backend API | Access scope, immutable versions, tasks and request IDs | Authorizes source/result access and selects allowed task/configuration |
| Document storage | Original, converted, revised and filled files | Distinct artifacts; no overwritten source or public real-contract bucket |
| Relational/event storage | Source anchors, runs, findings, decisions, annotations, forms and answers | Version identity and append-only decision trace |
| Job queue | Dispatch, retry/cancel and pending/offline/error status | Bounded retries, timeouts and resumable work |
| Conversion/extraction worker | Word render, PDF/text/OCR, geometry, coverage and deterministic checks | Text/source quality verified separately from model output |
| Semantic-review adapter | Suggest contradictions/ambiguities using relevant source context | Output must pass schema/version/quote checks and human confirmation |
| Optional typed checker | Candidate classification/routing after task-specific evaluation | Does not replace layout/OCR or establish legal accuracy |
| Evidence validator | Schema, quote matching, anchor/version and coverage checks | Structured output alone is not proof of correctness |
| Form/PDF renderer and QA | Preserve full content, map versioned answers and inspect render | Final export remains gated on actual checks/confirmation |
| Feedback/template store | Curated decisions/examples and reusable field structure | Scope and version retained; template reuse does not reuse answers |

The private overall plan proposes a separately authenticated CLI worker for complex inference and optional Laya typed decisions after evaluation. These are technical candidates, not a deployed service or proof that the owner's account/runtime can serve a website. Hosting the UI does not itself host the worker. The public UI copy remains provider-neutral; technical integration records remain in repository documentation.

No new inference was run to create this architecture document. See [initial architecture](../architecture/overview.md) and [integration proposal](../../openai/integration-plan.md) for the existing technical context.

## Document representation

Extraction produces an immutable source representation with document/version, original text, region/block kind, page, reading order, bounding box or source anchor, and extraction/coverage status. Keep Word-to-PDF correspondence where established; expose uncertain mapping rather than fabricating coordinates.

Outline, graph, duplicate comparison, findings, annotations and form coverage share these source identities. Inferred relationships have proposed/verified state and evidence. Version comparison follows content blocks rather than relying only on old page numbers.

## Entity responsibilities

| Entity | Main responsibility |
| --- | --- |
| Document / DocumentVersion | Ownership/scope, family, original/hash, parent version and conversion QA |
| SourceBlock / GraphEdge | Exact text/location/coverage and evidenced relationships |
| DuplicateComparison | Candidate versions, meaningful diff, unread scope and confirmed reuse decision |
| Finding | Quote(s), anchors, category, explanation/question, evidence/configuration and current review state |
| DecisionEvent | Actor/role, action/reason/correction, version and history |
| Annotation | One of four types, field/group identity, source geometry and approval |
| FormVersion | Source/annotation version, controls, approved rules and full-content representation |
| Submission / answer | User/file scope, form version, draft/confirmed values |
| Export | Answer snapshot, output PDF and QA/final/draft manifest |
| FeedbackExample | Curated label quality/scope and eligibility for retrieval/training |
| Job / Run | Task/config/input identity, worker/error/coverage state and output artifacts |

These are proposed entities, not deployed database tables or migrations. [The existing finding schema](../../data/schemas/review-result.schema.json) is an initial output-contract draft, not the full system schema.

## Worker input and output contract

Backend-defined instructions/tasks and contract text travel separately. Upload content cannot construct shell commands, select arbitrary worker goals or redirect the reviewer. Request/version/configuration identity binds every output to its source. Long-document work preserves section relationships and detects truncation before declaring coverage.

Semantic output enters evidence validation before appearing as a grounded finding. Optional checkers must demonstrate task value on the same evaluated input set. A local billing inference reference is not a legal-review benchmark. Layout/geometry requires a separate image/page-aware extraction path; typed text decisions are not a layout detector.

## Decision and export gates

Source failure → source-quality review. Grounded candidate → human decision. Confirmed issue → open until correction/revision verification. Clarification pending → unresolved review state. Review handoff may finish the core task without digitization. Annotation uncertainty → approval gate. Missing form coverage → filling gate. Missing/invalid answers → draft gate. Render/mapping failure → final-export gate.

Use explicit return actions to the failing step; do not repair a source conversion error by editing an unrelated annotation. New versions retain earlier history and trigger affected checks/mapping revalidation. Exact duplicate reuse preserves unresolved/blocked status and respects scope/configuration validity.

## Data and operational limits

Real contracts, source uploads, raw private planning/transcripts, credentials and local databases remain untracked. Public cases and screenshots are synthetic. Secrets belong in ignored project-specific configuration, never the browser or published repository. Worker authentication, private storage policies, audit retention, queue deployment and recovery behavior require actual implementation/verification before claims of security or persistence.

Application feedback is a proposed project store, distinct from the development assistant's personal memory. Event retention, retrieval/rules and training/calibration are separate mechanisms, with evaluated activation and rollback. No automatic model improvement is claimed from UI clicks.

## Evidence to build next

Working source parsing/coverage, deterministic check tests, actual adapter runs with quote validation, reviewer decision retention, form/PDF mapping checks, access-scope tests, worker recovery and task-specific evaluation. Design image/ZIP/hash validation establishes artifact integrity only; it does not validate this runtime architecture.
