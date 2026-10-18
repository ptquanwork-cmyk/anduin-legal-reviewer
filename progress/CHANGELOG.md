# Changelog

## 2026-10-19: Sharper rules on long agreements

- Conflicts: the same deadline or term worded differently (same action, unit and starting event, such as "within 10 Business Days after ... Capital Call Notice" vs "within fifteen (15) Business Days of the Capital Call Notice") is now flagged; "Schedule K-1" is no longer read as a missing schedule. British and legal spellings (wilful, organisational, unaudited, transferee, per annum, clawback) are no longer flagged. Offline eval: 68/68 rule-detectable problems (was 65/68), false-alarm hits 6 → 2.

## 2026-10-19: Revised PDF from the review

- Production test of every step with the worker online; fixed a job failure when a new version has two identical lines (duplicate field IDs), and Compare now flags AI reviewer findings that may only be reworded.
- Decision / report: **Create revised PDF** writes the corrections for confirmed issues into a revised PDF (spelling fixes pre-filled), to download or upload as the next version; Compare then shows which findings it no longer contains.
- Compare waits for the newer version's checks and keeps same-named findings as still present.
- Review report and revised PDFs use DejaVu Sans, so Vietnamese letters are no longer dropped.
- Filled forms draw Vietnamese answers in DejaVu Sans, so every letter is kept; Latin-only answers are unchanged.

## 2026-10-17: 100-page demo contract

- `15-limited-partnership-agreement-100-pages.docx`: a 100-page synthetic agreement with contradictions, missing references, spelling errors, vague wording and undefined terms spread across the whole document, and about 180 places to fill in (blanks, radio groups, checkboxes) from the cover to the last exhibit. Not yet run through the app.

## 2026-10-17: Sharper hub, README front page, tidier layout

- The hub shows the approved 3D renders at up to 1200 px by default, with deeper shadows; real-time 3D with `?three`.
- Brand inset from the left edge.
- README opens with the introduction video, a one-minute introduction and how the app was tested, with results and limits.
- `openai/` and `references/` moved under `docs/`; empty scaffolding removed.

## 2026-10-16: Introduction video, results first

- 89 seconds: measured results from the 15-file scenario test open the video (54/57 found, 129/129 quoted, 94/94 fabricated quotes rejected, the known two-column limit), then a speed comparison, then six chaptered sections.
- Calm camera and fade transitions; the beat pulse is gone; one short caption per shot.

## 2026-10-16: 15-file scenario test

- Seven new synthetic demo files (08–14): clean control, tables with a landscape page, prompt injection, two-column amendment, bilingual letter, image-only scan, corrupted PDF; `build-demo-contracts.mjs` can rebuild single files.
- `evals/results/2026-10-16-scenario-test-report.md`: 54/57 planted problems found on production. Defects found: two-column PDF extraction, the spelling dictionary on mixed-language files, British and legal words flagged, and the 300 s limit on long Word files.
- `scripts/e2e-contracts.mjs` also checks the expected source status (unread or blocked).

## 2026-10-16: Introduction video, remade

- 73-second, beat-synced walkthrough of every function:
  - review dialogs and the v2 comparison;
  - QA catching a clipped answer;
  - memory, templates, full screen and dark mode.
- Original upbeat 120 BPM music.
- Storage reads used by fill and export retry once on a transient error.

## 2026-10-16: Test report for judges

- `evals/results/2026-10-16-judge-test-report.md`: speed, accuracy and confidence measured on production and offline: 35/36 planted problems, 0/11 false-alarm traps, 80/80 findings grounded, 57/57 fabricated quotes rejected, 7/8 labeled cases.
- `evals/rules-offline.test.ts`: offline evaluation of the deterministic layer (`npx vitest run --dir evals`).

## 2026-10-16: Introduction video

- `demo/video/`: a 68-second Remotion introduction built from real app screens, with camera zooms, cursor clicks with sound, captions and original synthesised music.
- The worker address lookup no longer marks the worker offline after one slow lookup.
- The worker closes a hung hidden Word instance when a conversion times out.

## 2026-10-16: Full-screen workspace and overlap sweep

- Full screen has its own bar (exit, steps 01–09, How to use, Prev / Next); the screen header is hidden and working toolbars are kept.
- No overlaps or spills on 11 screens × 4 screen sizes in normal and full-screen mode (Playwright check).
- Source quality notes need no action; Form preview notice wraps; Questions for counsel box grows and its counter no longer covers text.

## 2026-10-16: One full-screen mode and branded HTML form

- One full-screen button (next to How to use) replaces the per-panel buttons: the working area fills the screen and PDFs render larger.
- Annotation: the Selected field panel scrolls and keeps its Confirm button visible.
- Exported HTML form:
  - Anduin header with progress and Next field to fill.
  - Contents sidebar with an Only sections to fill filter.
  - New field and option styling.

## 2026-10-16: Full screen, guides, form export, faithful conversion

- Word to PDF: Word export with print quality and bitmapped missing fonts; automatic retry on failure or text difference; identical text with a substituted font is verified with a note.
- Every large panel opens full screen (PDFs, Word view and graph re-render larger).
- How-to guides on every screen.
- Decision buttons and a Next step line on Decision / report.
- Export HTML form (fill in any browser, answers file) and Import answers in Responses.

## 2026-10-16: GitHub About section and judge contents

- README reorganised for judges:
  - About me (portfolio, LinkedIn, CV summary) and the owner's take on The Legal Reviewer challenge.
  - A contents table and a two-minute walkthrough.
  - Technology and languages, testing and evidence with recorded results, security, and current status and limitations.
- Repository description and topics updated.
- The judge guide, tests and evals pages no longer say that nothing has run; recorded runs are listed in `evals/results/`.

## 2026-10-16: Page freeze and crash on long documents

- Worker: model work runs on one thread. Before this, every job left a PyTorch thread pool behind, and the worker grew to 17.7 GB, which starved the browser on the same laptop.
- App: progress updates no longer re-read the whole version, reads never overlap, and the decisions query no longer lists every finding id in the URL.
- 3D:
  - No transmission pass.
  - Device pixel ratio capped at 1.5.
  - The page falls back to stills when the GPU drops the context.
  - Stills stay visible until the model has drawn.
  - Materials are freed on unmount.

## 2026-10-15 — Full re-check and decision memory

- Decisions keep a snapshot of their finding and are no longer deleted when checks are re-run (`20261015030000_decision_memory.sql`); the history is append-only except for the example flag; the next review notes how many workspace examples it received, including the reviewer's note.
- Pipeline database writes retry on transient network errors without duplicating rows.
- `scripts/e2e-memory.mjs`: memory scenario (decisions, append-only, re-run, examples, v2 transfer); test scripts retry their own network calls.

## 2026-10-15 — Security review, speed and accuracy

- Security: generic server-error messages, 30 processing runs per workspace per hour, bounded report text, production Content-Security-Policy and Permissions-Policy, theme parameter whitelist; review and accepted limitations in `docs/security.md`.
- Speed: semantic review starts in parallel with routing; review and field detection run side by side; two Codex chunks at once; decision-agent calls queued on one model; failed worker jobs reported with their real reason instead of being retried as tunnel errors.
- Accuracy: planted problems are machine-readable (`data/demo-contracts/expected.json`) and every end-to-end run reports recall and false alarms.
- Fix: no NaN frame width when the window is momentarily 0×0.

## 2026-10-15 — Demo contracts, full check, project map

- `data/demo-contracts/`: synthetic fund subscription documents (Word, PDF, scrambled scan, 38-page booklet, Vietnamese, fillable AcroForm) with planted problems; `scripts/build-demo-contracts.mjs` rebuilds them and `scripts/e2e-contracts.mjs` runs each through the whole workflow, including fill, PDF QA and final export.
- Fillable PDFs: AcroForm fields become annotations with exact widget geometry and nearby labels; filling flattens the form first.
- Review precision: contradictions compare only periods, percentages and amounts in obligations (no clause numbers or worked examples); one vague-wording finding per phrase; capitalised Annex/Schedule references and references into other documents handled; British spellings accepted; place names not treated as undefined terms; the semantic reviewer is told the document language.
- Worker: conversion and semantic review run as background jobs, so work longer than the tunnel's 100-second request limit completes.
- Documentation: architecture and workflow map with categorised folders; README, docs index and repository map updated.

## 2026-10-15 — Form preview and responses stations closer to their stills

- Form preview (07): a wide form panel on a thick blue frame with a set-back top bar, two input wells, two radios and two square buttons, turned so the frame's right side shows as in the still. Hovering lifts one input well.
- Responses (08): a cream 3 × 6 keyboard in a tray on a thin blue base, a field panel with two input bars standing behind it in front of a pale and a blue panel, and a mint pen with a clip resting on a key.
- GLBs re-exported for 07 and 08 only (37 KB and 123 KB).

## 2026-10-15 — Station geometry closer to the approved stills

- Six stations remodelled in `design/blender/build_modules.py`: thick open intake tray with fanned rounded sheets and a block-arrow tile (01); a real tray and larger badges (02); a wider monitor with the source sheet and magnifier to its right (04); a larger stamp with a turned handle and a speech bubble with a tail (05); an upright annotation slab on a blue backing with a framed selection, marker and linked chips (06); rounded, thicker PDF sheets and a block-arrow download tile (09). All sheets now have thickness and rounded corners.
- The hub frames each model from its own geometry (contain and rest on the bottom, like the stills) instead of per-module numbers; models that were cut off at the bottom of their slots (01, 05, 08) now fit.
- GLBs re-exported: about 720 KB in total, largest 188 KB.

## 2026-10-15 — Full-bleed desktop layout, screen polish, CLI semantic reviewer

- The interface fills the browser window: height sets the scale and wider windows widen the content area while the rail and right-hand controls stay at the edges. Mobile layout removed at the owner's request.
- Semantic reviewer can run through the owner's Codex CLI in the worker (`/semantic`, locked down, same prompt file and schema); the API path falls back to it when the key is rejected or unfunded. Prompt rule 8 ("do not use any tools") added for the CLI engine.
- Screen polish against the approved images: stage-strip labels wrap on narrow strips; Source quality scrolls both panes to the flagged region; Document map shows at most four key sections with the conflicting section selected; Legal review keeps action buttons at full size and scrolls the viewer to the passages; Decision/report uses one-line status chips; Form preview banner and buttons stay on one line.
- Component CSS classes moved into a cascade layer so size and padding utilities apply (chips had been rendering at a fixed 13 px).
- 3D stations: per-module framing measured against the stills and glossier resin materials.
- Contradiction questions name the two values and sections instead of quoting both sentences.

## 2026-10-15 — Working application

- Replaced the static hub with the single-page application: 3D hub (Blender stations rendered live), nine workspaces, Templates, Feedback, light/dark themes.
- Supabase schema with owner-only RLS, private storage, Realtime job status, anonymous workspaces, worker endpoint registry.
- Review pipeline: extraction with anchors, Word/PDF comparison, rules (EN/VI), semantic reviewer adapter, evidence validator, decision-agent routing; report PDF; revision comparison.
- Digitisation: four-type annotation editor and QA, full-content form, responses, PDF fill with read-back QA and confirmed final export.
- Worker (Laya + Word/LibreOffice) with Supabase-session auth and a local tunnel runner; end-to-end run on the synthetic demo recorded in the build log.

## 2026-10-14 — Original Overall Plan publication

- Published the owner's explicitly identified `01-first-overall-plan.md` without changing its bytes, language or diagrams.
- Corrected primary reading links; labeled PLAN.md as a supporting English workflow summary.
- Documented the newer publication authorization outside the original source; retained all local source/design/archive files.

## 2026-10-14 — Three primary specification roles

- Corrected the judge reading route to the owner's three primary documents: Overall Plan / System Design Proposal, design.md and UI Master.md.
- Expanded the overall plan's proposed operation and clarified responsibility for system, visual and screen behavior changes.
- Kept previously published profiles/system/setup as supporting documents; preserved approved design files, images and archives.

## 2026-10-14 — Dark-mode companions, UI Master and judge documentation

- Added ten dark-mode sibling PNGs while preserving the approved light and component assets.
- Added detailed UI Master and a design profile; recorded theme/preservation checks and exact prompts.
- Added public English Plan, Project Profile, System and Setup documents and a judge reading guide at the owner's publication request.
- Retained prior image/reference/prompt/asset files, original local planning source and old ZIP; created a separate light/dark delivery archive.
- No application runtime, theme toggle, backend, Blender scene, animation or final hackathon submission was implemented.

## 2026-10-14 — Interface and component design package

- Consolidated design specifications, reference JSONs, homepage and prompts under `design/`; original supplied JPEGs are organized locally and remain untracked.
- Preserved the approved homepage bytes and extended the section briefs from the local first overall plan.
- Added nine distinct functional-screen concept images and nine individual transparent 3D modeling references, with exact prompts and per-asset verification.
- Added design indexes and Blender scene/hover handoff notes; no runtime, mesh, Blender scene or animation was implemented.

## 2026-10-14 — 3D homepage design concept

- Created a root design specification and structured descriptions of the supplied UI 2/web-layout and UI 3/retro-3D references.
- Applied the owner's clarified Anduin palette and a homepage of nine 3D section stations with proposed hover/click behavior.
- Generated and refined one selected concept image with simplified background, two ordered lanes and modular objects for future Blender work.
- Recorded the exact generation/refinement prompts. No website, animation, Blender scene or backend was built.

## 2026-10-14 — Public page wording

- Replaced vendor-specific navigation with Review design, linked to the architecture documentation.
- Renamed the evaluation status to Review quality evaluation.
- Recorded the provider-neutral public-page convention for future changes.

## 2026-10-13 — Project foundation

- Created an English-first repository structure for Anduin Legal Reviewer.
- Documented challenge evidence, project interpretation, proposed scope, and architecture.
- Added context pack, three versioned prompt drafts, and official OpenAI source notes.
- Added synthetic example documents, an output-schema draft, and eight evaluation cases.
- Added experiment/demo templates, roadmap, source attribution, and GitHub update instructions.
- Published the repository and a responsive static project hub on Vercel; connected GitHub deployment.
- Created a separate Supabase project in Singapore and verified database/Auth API connectivity.
- Prepared ignored local configuration and Vercel Production/Preview Supabase variables for future implementation.

No contract-review runtime, OpenAI integration, model benchmark, or review-data persistence is included in this foundation. The static project hub is deployed.
