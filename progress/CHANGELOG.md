# Changelog

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
