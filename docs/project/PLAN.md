# Overall product and build plan

14 October 2026 · **Proposal, not completed implementation**.

This public English plan represents the owner's supplied overall workflow and confirmed design requirements. It is a structured project artifact for reviewers; the original local planning file is preserved separately. This plan introduces no completion dates or measured model claims.

## Problem and priority

Review contract inputs before digitization so that typos, absent references, incompatible clauses and ambiguous terms can be inspected and confirmed. The central result is a source-linked finding, reviewer decision and review report. Annotation/form/PDF work extends the workflow after review; it does not replace the Legal Reviewer problem.

## End-to-end processing stages

| Step | Responsibility | Output/gate |
| --- | --- | --- |
| 1 Intake | Register PDF/Word original, scope, hash, version and resumable job | Immutable original; unreadable/password/missing-resource states visible |
| 2 Conversion | Render Word to PDF and compare text, fonts, tables and layout | Verified, needs review or blocked; no unexplained loss or silent legal rewrite |
| 3 Extraction | Read text/OCR by region, preserve order/anchors and unread coverage | Source representation with page/block/bbox/version and gap status |
| 4 Duplicate/version checks | Exact hash lookup followed by content/block/table comparison | Verified identity or changed/similar/insufficient evidence; permission/config gate for reuse |
| 5 Document map | Outline, relationship graph and page map | Source-linked nodes; inferred relationships marked proposed |
| 6 Legal review | Core spelling/reference/contradiction/ambiguity checks | Candidate findings with exact quote(s), locations, rationale and confirmation question |
| 7 Human decisions | Confirm, dismiss with reason, request clarification or inspect correction | Version-linked decision event; confirmed/open is not resolved |
| 8 Review handoff | Report decisions, questions, revisions and unresolved issues | Ready, needs clarification, source blocked or approved with recorded exceptions |
| 9 Annotation | Create or transfer paragraph/text/radio/checkbox regions | Source-linked field/group identities and proposed geometry |
| 10 Annotation QA | Check type, group, IDs, coverage and placement | Human approval; changed/new/missing/uncertain mapping remains visible |
| 11 Form preview | Represent full original content and approved control/rule structure | Source-to-form coverage and full-text access; separate explanation layer |
| 12 Responses | Save/review answers for the correct form/version | Required/format/choice issues visible; no silent copying of prior answers |
| 13 Draft PDF | Map answers to correct fields and render the filled document | Preview; expose overflow, missing glyphs, wrong field/option or clipping |
| 14 Final QA | Compare source, annotation, form, answers and render | Failures route to the responsible step; unverified draft is not final |
| 15 Export/reuse | Export verified PDF/reports, retain artifacts/history | Traceable final version; template structure and personal submission stay separate |

Duplicate lookup can start alongside source intake. Content comparison waits for sufficient extraction. Exact identity only reuses results that remain valid under permissions, source version and rule/model configuration; a blocked old version does not become approved by reuse.

## Source-quality decisions

PDF inputs bypass Word rendering but still require read/source checks. Mixed text/scan documents are processed by region. Word conversion needs source font/resource information, treatment of tracked changes/comments, and text/render comparison. Bounded retries may fix conversion settings/resources; they do not approve changes in legal meaning. If a reliable source rendering or font is unavailable, expose the unverified region for review.

A coverage manifest records all recognized pages/regions and their reading/mapping status. A partially read input cannot be described as fully reviewed.

## Review output contract

A finding needs category, title, document/version, exact quote(s), source anchor(s), rationale, a confirmation question, evidence status, rule/prompt/model provenance and reviewer state. Contradictions retain both passages and relevant conditions/exceptions. Candidate scores are not calibrated probabilities by default. Missing supporting quotes reject or flag a candidate rather than legitimizing it through schema validity.

Definition/missing-component checks are optional extensions when supported by source/checklist evidence. Do not invent jurisdictional/legal conclusions outside the supplied task and responsible confirmation.

## Feedback and confidence

Separate event recording, curated retrieval/rules and model training/calibration. A confirmed issue, accepted wording, accepted exception, dismissal and resolution after revision have different meanings. Store scope, actor role, version, reason and verified correction. A decision for one contract is not a universal rule.

Training/calibration is later work requiring supported tooling, reviewed labels, separated train/calibration/test data and evaluation before activation. Split by document/template family and version to reduce leakage. Keep fixed held-out cases, provenance and rollback. Synthetic cases check workflow/regressions; they do not establish legal-review quality on real documents.

The UI separates model score/provenance, evidence validation and human decision state. Show not calibrated/not measured when those results do not exist. Agreement between two checkers alone does not justify certainty.

## Nine-section interface model

The hub opens Intake, Source quality, Document map, Legal review, Decision/report, Annotation, Form preview, Responses and PDF QA/export. Duplicate candidates belong with intake/source quality. Feedback and Templates are separate management destinations rather than extra mandatory processing steps.

[UI Master](../../design/UI%20Master.md) details every destination. The approved light views remain unchanged; dark companions reuse their composition and semantics. [Design Profile](../../design/DESIGN%20PROFILE.md) explains the visual organization and artifact separation.

## Implementation priorities

| Phase | Proposed work | Completion evidence required |
| --- | --- | --- |
| A Source foundation | Upload/version, parser/anchors/coverage, viewer, early Word-render spike | Working source/error states and known conversion limits |
| B Reviewer | Core checks, cross-section reference context, semantic adapter, evidence validation, decisions/export | Grounded findings, both contradiction quotes and retained decisions |
| C Feedback | Scoped events, curated examples, version diff, calibration/eval harness | Correct labels and evaluation before activation |
| D Quality/reuse | Conversion comparison, exact identity, changed-version impact review | No false identity or silent skipping of changed content |
| E Annotation | Exactly four types, content-based transfer and placement/coverage QA | Source anchors, groups, uncertainty and human approval |
| F Form/PDF | Full-content form, version-linked answers, PDF mapping/render/final QA | Complete content, correct values/options and no silent clipping |
| G Training | Curated task data, suitable checker, held-out evaluation and rollback | Supported measurable improvement on unseen data |

Exact hash/event storage and a conversion spike may start early. Do not let broad conversion repair or future training postpone the core evidence-linked reviewer demonstration.

## Planned validation cases

Preserve Vietnamese characters, long tables, headers/footnotes and tracked-change intent; expose missing fonts/weak OCR; distinguish exact duplicates from changed amounts/negation; retain mapping when pages shift; find absent references and distant contradictions without losing exceptions; allow no findings on a clean input; isolate instructions embedded in contract text; retain dismissal scope and confirmed/open status; verify radio/checkbox groups, long answer rendering and template revalidation; display worker-offline/quota/error states without fabricated output.

Measure extraction/coverage, finding quality by category, source grounding, field/type/mapping accuracy, duplicate false positives, calibration and actual latency with dataset/sample/configuration provenance. These are planned measures, not results.

## Current boundary

The repository has the documented foundation, synthetic fixtures, hosted static hub/infrastructure records and static visual design package. The full processing system is proposed. [System](SYSTEM.md) assigns responsibilities; [Setup](SETUP.md) distinguishes the existing hub from future runtime steps. [Progress](../../progress/README.md) records actual work rather than retroactively treating proposals as implementation.
