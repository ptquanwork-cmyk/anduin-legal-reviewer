# UI Master — Anduin Legal Reviewer

Version 1.0 · 14 October 2026 · **Design specification and image references**.

This master describes the approved 3D homepage and all nine functional interfaces, their light/dark appearance, component responsibilities, visible example states and future interaction rules. The supplied screenshots are static synthetic concepts. They are not a working application, a legal decision, a Blender scene or implemented animation.

## 1. Preservation and source of truth

The approved light homepage, nine light interface PNGs, nine isolated 3D PNGs, source reference JPEGs and existing reference/prompt/asset JSON files remain unchanged. Dark images are sibling files in `dark-mode/`. The previous delivery ZIP also remains unchanged. [The protected baseline](manifests/dark-mode-protected-baseline.json) records original file hashes; current verification is in [dark-mode validation](manifests/dark-mode-validation.json).

Use the actual light image for exact composition and its dark twin for theme appearance. [Overall design](design.md) defines the established shell and art direction. [UI 2](references/ui-2.json) describes layout provenance; [UI 3](references/ui-3.json) describes 3D provenance and proposed modeling structure. The owner's local first overall plan defines functional responsibilities; it remains private and is not copied into this master.

Dark mode changes background, chrome, surface, text, border and status colors, plus restrained ambient lighting. It preserves content, source excerpts, selected fields/stages, buttons, disabled gates, object silhouettes and screen composition. It adds no extra fields, navigation controls, documents, success states or theme-switch button to the images.

## 2. Asset register

| ID | Interface | Approved light image | Dark twin | Isolated object |
| --- | --- | --- | --- | --- |
| 00 | Homepage / 3D hub | [Light](homepage/anduin-3d-workflow-hub-v1.png) | [Dark](dark-mode/00-homepage.png) | Nine objects below |
| 01 | Intake | [Light](interfaces/01-intake.png) | [Dark](dark-mode/01-intake.png) | [Object](components-3d/01-intake.png) |
| 02 | Source quality | [Light](interfaces/02-source-quality.png) | [Dark](dark-mode/02-source-quality.png) | [Object](components-3d/02-source-quality.png) |
| 03 | Document map | [Light](interfaces/03-document-map.png) | [Dark](dark-mode/03-document-map.png) | [Object](components-3d/03-document-map.png) |
| 04 | Legal review | [Light](interfaces/04-legal-review.png) | [Dark](dark-mode/04-legal-review.png) | [Object](components-3d/04-legal-review.png) |
| 05 | Decision/report | [Light](interfaces/05-decision-report.png) | [Dark](dark-mode/05-decision-report.png) | [Object](components-3d/05-decision-report.png) |
| 06 | Annotation | [Light](interfaces/06-annotation.png) | [Dark](dark-mode/06-annotation.png) | [Object](components-3d/06-annotation.png) |
| 07 | Form preview | [Light](interfaces/07-form-preview.png) | [Dark](dark-mode/07-form-preview.png) | [Object](components-3d/07-form-preview.png) |
| 08 | Responses | [Light](interfaces/08-responses.png) | [Dark](dark-mode/08-responses.png) | [Object](components-3d/08-responses.png) |
| 09 | PDF QA/export | [Light](interfaces/09-pdf-qa-export.png) | [Dark](dark-mode/09-pdf-qa-export.png) | [Object](components-3d/09-pdf-qa-export.png) |

Light images and source comparisons are 1536 × 1024. Each existing standalone object reference is 1254 × 1254, RGBA. Exact dark output dimensions and hashes are recorded after generation in [dark-mode assets](manifests/dark-mode-assets.json). No asset is upscaled or raster-edited through a custom image-processing script.

## 3. Shared visual system

### Shell, header and navigation

Preserve the large rounded outer shell, fine perimeter, recessed concave top toolbar and two-part narrow icon rail. All functional screens have a Home return action, central document/search context, a document/version or My documents control, and a neutral J avatar. The exact control variant in each approved image stays intact.

The common rail shortcuts are Home, Documents, Document map, Review, Forms and Export. Templates and Feedback sit in the lower utility capsule. The nine-stage strip is Intake → Source quality → Document map → Legal review → Decision/report → Annotation → Form preview → Responses → PDF QA/export. One stage is selected. Selecting a stage does not imply previous stages completed.

Use the approved image's column widths, gaps, padding, corner shapes, line breaks and alignment. These are visual reference measurements, not recovered CSS or a tested responsive layout. Dark mode must not reorganize columns, wrap a previously single-line label into a different layout, or replace the rail with a new navigation model.

### Type and icon language

Use the established Poppins-like bold display headings and Inter-like interface text, as specified in the dated Anduin reference in `design.md`. Preserve document page typography as source appearance. Icons remain the same outline shapes. Tiny structural icons are functional cues; 3D station images provide section identity.

Hierarchy: product name and concept status → section heading/document version → panel headings → source/data/action text → metadata/helper copy. Avoid competing headline treatments or decorative gradient type. Keep existing sizes and weights across themes; change text color for readability rather than making every label bold.

### Theme tokens

The light column summarizes established design colors; it does not recolor the approved PNGs. Dark values are proposed companion tokens, not new official brand colors.

| Role | Light reference | Dark companion |
| --- | --- | --- |
| Outer canvas | Cool pale blue | `#0C141F` |
| Main shell/studio | `#EEF5FA` / pale blue | `#101E2E` |
| Opaque panel | White / near-white | `#172B3E` |
| Raised field/panel | Pale blue | `#20354A` |
| Borders/dividers | Pale blue-gray | `#38536B` |
| Main text | Anduin Black `#182A38` | `#F2F7FC` |
| Supporting text | Muted navy | `#B5C7D8` |
| Brand accent | Anduin Blue `#48AFF0` | Same blue |
| Secondary material/accent | Mint `#96DBD4`, Dark Mint `#33BDB0` | Same mint hues |
| Selected surface | Light blue | `#143854` with clear blue edge |
| Primary action | Established blue action | `#48AFF0` with `#0C141F` text |
| Secondary action | Light/outline control | Dark surface, pale text, blue outline |
| Disabled action | Muted pale gray-blue | `#253646` with `#8296A8` text |
| Error / blocked | Pale red with red label | `#351C26` with `#FFADBD` text |
| Warning / pending | Pale amber | `#352B17` with `#FFD27C` text |
| Mint information/status | Pale mint | `#123833` with `#9BEBDA` text |
| Source paper | Light source page | `#F7F8FA`, ink `#182A38` |

Use distinct dark surface levels instead of pure-black slabs or glowing glass. Text-bearing panels remain opaque. Labels, icons and written status accompany color. Proposed palette pairs should achieve at least 4.5:1 text contrast; token contrast calculation is separate from checking actual generated raster typography or a future application's accessibility.

### Source-document exception

PDF/Word page interiors and their thumbnails remain light, with dark source ink, in both themes. Paper-like source-quotation inserts in the report can also retain light backing/dark ink; their surrounding app panels go dark. Darken viewer frames/toolbars, not the contract itself. Preserve page layout, source quotes, evidence highlights, page counts, zoom and anchors. A viewer's 100% label is zoom, not extraction accuracy. Do not invert a document image or alter its text to create a dark page.

### 3D language

Keep polished blue/mint resin, white/cream polymer, chunky bevels, dark CRT screen, local cream cable and consistent elevated three-quarter view. The hub's shelves/bases can become dark slate; object bodies remain recognizable and do not become dark silhouettes. Keep lighting soft and highlights restrained. Preserve camera, silhouette, accessory count, poses and locations. Existing nine transparent object PNGs are shared by both modes and are not regenerated for this task.

## 4. Screen 00 — Homepage / 3D workflow hub

**Purpose:** orient the reviewer, receive a document and navigate to a dedicated section. It is the process hub, not the detailed contract viewer.

**Composition:** same two-line “Review before you digitize.” headline at upper left, “One source. Every step. Your decision.” supporting text, Upload contract / Use demo, and duplicate-check note. Header has New document, search and My documents. Home is selected in the rail.

**Primary lane:** 01 upload tray; 02 paired-source lens; 03 relationship nodes; 04 larger CRT review workstation; 05 stamp/report/speech tile. **Secondary lane:** 06 annotation slab/stylus; 07 form panel; 08 keypad/field tiles; 09 PDF/lens/download block. Both shelf groups, all plaques, numbering, captions and scene proportions remain in place.

**Selected example:** Legal review has the cursor and Open workspace action, plus a compact explanatory panel. This hover representation does not mean a document was reviewed. Footer retains the hover/click instruction and design-only status.

**Dark appearance:** dark studio, shell, rails, shelves and text plaques; near-white heading/labels. Keep blue and mint object bodies, white document props, cream keycaps and local cable unchanged. Use a modest rim to separate the CRT from the background rather than a large neon halo.

**Future interactions:** Upload contract opens Intake; Use demo loads a synthetic example through Intake. Hover/focus reveals a section purpose and subtle object response; click/tap opens that section while retaining document/version context. These behaviors are specified, not implemented.

## 5. Screen 01 — Intake

**Purpose and inputs:** accept an original PDF or DOCX, record version/scope and inspect resumable jobs or related documents. Legacy Word support is conditional future work, not an unconditional control promise.

**Layout:** 3D tray/title at upper left; nine-stage strip with 01 active; large upload dropzone left; document details/job panel right; recent documents lower left; related-version candidate table lower right. Documents is active in the rail.

**Visible fields:** Demo agreement.docx, Original · v1, English, Private workspace; original-retention note. Job states Received, Source checks queued and Duplicate lookup queued are synthetic examples. The recent list contains v1 and v2. Similar content is a candidate requiring comparison, not verified exact duplication.

**Actions:** Choose file, Use demo, Resume job, Open comparison, View all and Continue to source quality. Preserve supported-file copy `.pdf and .docx` and every existing row/control. Do not add upload metrics or a percentage progress bar.

**Dark appearance:** dark dropzone and tables with readable column labels/rows; blue outline/upload icon and pale text; dark metadata chips and distinct quiet pending markers. The blue tray/white sheets/mint arrow stay recognizable.

**Future edge states:** unreadable, password-protected or unsupported file requires an explicit source status; queued/offline job retains its record and offers retry/resume. Hash identity and related-content suggestions remain separate outcomes.

## 6. Screen 02 — Source quality

**Purpose:** compare original Word and converted PDF, expose extraction/font/text/layout uncertainty, and stop a source-quality failure from being treated as a finished legal review.

**Layout:** section title and paired-document 3D icon; 02 active and Documents selected; Text/Layout/Fonts tabs; two broad source panes; narrow right issues panel; bottom blocking strip and disabled next action. Keep both page captions Page 1 of 2.

**Visible issue:** Font substitution on Page 1 with Manual comparison required. Both panes retain the 30-calendar-day payment sentence. Extraction coverage remains Not measured. “Resolve source issues before review” explains the disabled Continue to document map action.

**Actions:** viewer zoom/page controls, Compare related version, View source region and Retry conversion. Retries concern conversion/extraction settings, not an unapproved rewrite of contract wording.

**Dark appearance:** dark viewer toolbars, tabs and issues panel; original/converted pages stay light. Font-warning highlights are readable against paper; warning and blocked strip use dark red/amber families with written explanations. Preserve current zoom values and source text.

**Future gate:** conversion must expose known discrepancies and unverified regions. Missing resources/font evidence cannot silently receive a “100% accurate” status. Parsed coverage and legal review are different checks.

## 7. Screen 03 — Document map

**Purpose:** make document structure and relationships navigable while preserving source anchors and the distinction between parsed and proposed relations.

**Layout:** 03 active, Map selected; tabs Outline/Relationships/Page map; left outline; central graph; right Payment · §2 source drawer and two page thumbnails. Payment is selected in the outline.

**Visible structure:** Parties, Payment, Payment deadline, Delivery and Liability. Payment §2 and §3 and Delivery §4 are on Page 1; Liability §5 is on Page 2. The final selected graph shows Agreement, Payment §2, Payment §3, Delivery §4 and Liability §5. A dashed Proposed conflict links the payment clauses; Parsed/Proposed legend stays visible.

**Source detail:** exact 30-day sentence, Page 1 · Section 2 anchor, Open source; References/Definitions/Proposed findings filters. Open legal review is the primary next action. The missing-section example appears in the Legal review list; it need not be fabricated as a parsed graph node.

**Dark appearance:** graph/outline/source-detail app surfaces become dark; text and solid edges stay readable; proposed conflict remains a clear dashed semantic cue. Page thumbnails remain light. Preserve node positions, links, selected outline and every source label.

**Future interactions:** node/outline/thumbnail selection jumps to the corresponding source. Collapsing/filtering manages density rather than deleting contract content. A proposed relation is not promoted to a verified fact by color or layout.

## 8. Screen 04 — Legal review

**Purpose:** review suspected typos, missing references, contradictions and ambiguities against exact source evidence, then record a human decision.

**Layout:** 04 active, Review selected; section heading, Demo agreement · v1 and small CRT icon; left finding/filter list; largest central source viewer; right finding explanation/actions; bottom coverage/history/report controls. The original two-page source remains Page 1 of 2.

**Finding list:** Two payment deadlines, Missing Section 9, Ambiguous delivery and Spelling: recieve. Filters All/Typos/References/Contradictions/Ambiguities remain where they are.

**Selected evidence:** Section 2 says “The Client shall pay each invoice within 30 calendar days of receipt.” Section 3 says “The Client shall pay each invoice within 60 calendar days of receipt.” Preserve 30/60 highlights and Page 1 · §2/§3 anchors. Both passages must be visible together.

**Finding panel:** Finding 01, Contradiction, open/needs-confirmation state, rationale that the sections specify different deadlines, and “Which payment deadline should apply?” Actions are Confirm issue, Dismiss and Needs clarification. Confidence remains not calibrated; source coverage remains not measured.

**Dark appearance:** finding list, explanations, controls and toolbars go dark; source page stays off-white. Ensure highlighted numerals retain dark readable ink and their original positions. Keep category/status labels distinct. Confirm issue remains a review action, not blanket legal approval.

**Future decisions:** dismiss collects a reason; clarification prepares a question; confirmed/open differs from resolved after checking a revised version. Source content remains untrusted data separate from reviewer instructions. Unsupported quotes or incomplete extraction must remain visible as limitations.

## 9. Screen 05 — Decision / report

**Purpose:** assemble source-backed decisions, revision history, clarification questions and a handoff report without conflating confirmation with resolution.

**Layout:** 05 active, Review selected; stamp/report identity; Needs clarification banner and Compare v1 → v2; left finding-status table; central review-report preview and timeline; right questions/export/gate panel.

**Example statuses:** Payment deadlines Confirmed/open; Section 9 reference Needs clarification; Spelling correction Resolved after revision. Selected report retains Page 1 §2/§3 snippets, the payment-deadline question, and Issue confirmed → Clarification requested → Revision pending timeline.

**Actions and gate:** Prepare question list and Export review report remain available; Continue to annotation is disabled while the blocking unresolved issue remains. The written note “Confirming an issue does not resolve it” stays visible. Preparing questions does not send an external message.

**Dark appearance:** the report's app panels become dark, with light interface text and distinct status chips. The two source-quotation inserts keep paper-light backing and dark ink. Warning banner stays amber-tinted; disabled action remains visibly disabled. Preserve all rows, comparison/version labels and existing content.

**Future outputs:** report contains evidence, questions, decisions, unresolved items and revision trace. Ready for digitization, Needs clarification, Blocked by source quality and Approved with exceptions are distinct future outcomes. An exception needs an explicit responsible decision; it is not represented by a decorative stamp.

## 10. Screen 06 — Annotation

**Purpose:** create/transfer source-linked annotations, inspect groups and geometry, and approve only when source correspondence is sufficiently verified.

**Layout:** 06 active, Forms selected; source/stylus identity; exactly four prominent type controls; broad source PDF canvas with selected box; right field properties and transfer-state panel. Source v2 and Compare annotations from v1 remain visible.

**Four types:** Paragraph is preserved readable content; Text box accepts an answer; Radio box chooses one option within a group; Checkbox represents an approved toggle/multiple choice. Do not add signature as a fifth type. Preserve existing blue/mint/purple type cues and text labels across themes.

**Selected field:** client.identity.name, Text box, Page 1 · Client information, Required proposed, group None/standalone. Viewer is 1/2; selected-field navigation is 1 of 8 and counts fields rather than pages. Source options are Individual/Company and Email/Post.

**Transfer/gate:** Matched, Changed, New and Uncertain remain separate. One region needs source confirmation; Preview form is available; approval/continue remains disabled. The paragraph-not-an-answer-field note is retained.

**Dark appearance:** properties, type controls and toolbars become dark; source paper and exact field/option geometry remain light. Outline colors and handles must remain visible against the source without turning the whole page dark.

**Future validation:** source coverage/order, unique field IDs, in-page bounding boxes, option groups and mapping to the correct version. Annotation reuse does not copy personal answers. Uncertain/new/changed regions require review rather than automatic acceptance.

## 11. Screen 07 — Form preview

**Purpose:** preview a complete, navigable form based on approved source/annotations, retaining original text and clearly separating explanatory help.

**Layout:** 07 active, Forms selected; left form-section outline; central form/title/identity and original prose; right synchronized source viewer; bottom unmapped-coverage gate and actions. Client information is the selected section.

**Controls/content:** Client legal name text field, Individual/Company radio options, Email/Post checkboxes; original payment prose remains visible, followed by further contract text. Plain-language help is explicitly separate from contract text. Do not replace the original with a summary or remove content to fit fields.

**Actions/gate:** Show full original text, Open source, Preview conditional sections and Inspect coverage. One source block unmapped/example explains disabled Enable responses. Source comparison remains Page 1 of 2; preview-only status stays visible.

**Dark appearance:** the app form, empty inputs, section list and helper surfaces go dark with readable text; the original source viewer remains paper-light. Radio/checkbox choices and paragraph text keep the same wording and positions. Use a clear selected-row border instead of adding a new layout.

**Future rules:** conditional visibility and required fields follow approved source/rules; the user can still access full original content, including non-applicable sections. Coverage must be demonstrated before allowing a complete form handoff.

## 12. Screen 08 — Responses

**Purpose:** enter/save/review answers for the correct form version, preserving source context and exposing missing required information before generating a PDF.

**Layout:** 08 active, Forms selected; responses identity/title and Draft/synthetic example; large Fill and review form left; right missing-answer and source-anchor panel; bottom draft/review actions and version note.

**Example answers:** Client legal name = Example Client Ltd; Company selected, Individual alternative; Email checked, Post unchecked; Agreement date empty and required. These are synthetic values. Do not add Partnership or a new choice absent from the source/form.

**Actions/gate:** Save draft, Review answers and Show full contract. Create draft PDF remains disabled while the required date is missing. Page 1 · Client information/Open source stays visible. “Answers belong to form v2” and template revalidation note remain intact.

**Dark appearance:** text inputs, prose container and app panels go dark; entered values are near-white, placeholder/helper text remains legible. Empty date/error retains a clear red outline and Required label. Selected radio/checkbox stays blue. Do not populate missing data or brighten disabled actions into active ones.

**Future persistence:** answer records retain document/form/version identity. Template changes require revalidation; transferring prior answers is a separate explicit action, unlike reusing annotation structure. No live autosave or retention is proved by this image.

## 13. Screen 09 — PDF QA / export

**Purpose:** compare source, form, answers and rendered draft, identify mapping/value/render errors and gate final export until required checks and human confirmation complete.

**Layout:** exactly nine stages, 09 selected and Export active; small PDF identity; Source/Form/Answers/Draft PDF tabs; page thumbnails and draft viewer left; blocking QA/status/action panel right; bottom Source v2 → Form v2 → Answers v2 → Draft PDF trace.

**Example failure:** Draft/not-verified badge, 1/2 viewer and two page thumbnails. The displayed client value is truncated to “Example Client”, while Responses stores “Example Client Ltd”. The clipping issue identifies client.identity.name and Page 1 · Client information. Preserve this failure rather than silently repairing it in a theme edit.

**QA statuses:** Content coverage Pending; Field mapping Needs review; Answer values Pending; Page render Issue found. Final export blocked banner remains. Actions Return to annotation, Review answers and Run checks again retain their placement. Download draft is marked Unverified; Download final PDF remains disabled.

**Dark appearance:** tabs/toolbars/QA surfaces become dark; the draft page stays light, with original dark ink and red issue outline. Blocked and pending statuses remain clear in text and color. Do not substitute a green completed state or add a final-success checkmark.

**Future gate:** content coverage, source/annotation mapping, answer values/options and page rendering are checked against the correct versions. Source/contract changes route back to the responsible review/conversion step. No final file is treated as verified merely because a model or decoration signals confidence.

## 14. Shared interaction and state contract

All behaviors below are proposed implementation requirements. The supplied PNGs do not execute them.

| State | Behavior |
| --- | --- |
| Idle | Stable readable content; no perpetual movement across the hub |
| Hover/focus | One station responds; subtle lift/rim/prop cue, labels and hit targets stay fixed |
| Click/tap | Open named section with document/version preserved; Home returns to the hub |
| Reduced motion | Static selection/focus treatment with equivalent navigation |
| Loading/queued | Show real job state, preserve context and avoid invented progress |
| Empty | Explain required source/selection and provide the next meaningful action |
| Error/blocked | Specific reason, anchored affected item and appropriate retry/return action |
| Disabled | Visible label and reason; never an available final export or approval |
| Version change | Show comparison/revalidation; do not silently reuse decisions or answers |

Proposed hub hover timing remains 180–260 ms, lift about 1–2% of object height and rotation no more than 3°. Intake lifts a sheet; Source quality shifts a lens; Map highlights a node; Review brightens a quote; Decision/report tilts a stamp; Annotation moves a stylus; Form lifts a field; Responses depresses a key; Export lifts an arrow. No cue implies a check passed.

Future keyboard focus, named targets, touch equivalents, readability and actual contrast require runtime testing. Tablet/mobile adaptation preserves the section order and original content, but no new mobile mockups are included here. Changing theme must not change workflow state or source text.

## 15. Blender and implementation handoff

Use the existing [Blender handoff](blender/README.md) and per-module collections from UI 3 JSON. A component's root controls its proposed hover motion; geometry/material layers remain separable from the surrounding shelf and UI labels. Dark mode changes environment and UI theme, not topology, camera, root origin or rigging.

The isolated PNGs are visual references for modeling or image-assisted reconstruction. They do not define hidden surfaces, scale, topology, rigging or guarantee automatic reconstruction. Keep source excerpts/labels as a crisp UI layer rather than baking legal text into a mesh. No Blender commands, mesh creation or animation rendering are included in this task.

## 16. Delivery and review

Use [the dark index](dark-mode/README.md) to compare each image with its light source. [Exact dark-mode prompts](prompts/dark-mode-v1.json) define the edit invariants. [Actual validation](manifests/dark-mode-validation.json) records dimensions, preservation checks and manual visual observations. The existing light package and original ZIP remain available; a new light/dark delivery archive is created separately.

Review focuses on the same screen composition and semantics in both themes, readable surface hierarchy, retained source-paper appearance, unchanged counts/options/anchors, recognizable 3D objects and honest disabled/error states. The images are design concepts; a future implementation still needs responsive, keyboard, focus, loading/error, state-retention and performance checks.
