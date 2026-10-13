# Anduin Legal Reviewer — overall design

Date: 14 October 2026. Status: **design proposal for owner review**. This package contains two reference JSON descriptions and one generated homepage concept image. No website, Blender scene, animation, backend or functional section has been built by this task.

## Design intent

The homepage is a clean, interactive **3D workflow hub**. Each main section has a recognizable physical object. Hover gives a small motion response; click opens that section's functional UI. The homepage introduces and navigates the process; detailed legal review happens in its dedicated workspace.

The latest owner clarification is authoritative: use **Anduin brand colors**, emphasize 3D objects across the sections, and simplify composition so the objects are easy to model and organize in Blender.

## Reference roles

| Input | Use | Boundary |
| --- | --- | --- |
| `ui (2).jpg` | Rounded app shell, concave header notch, narrow two-part icon rail, integrated panels | Do not reuse real-estate content, photography or branding |
| `ui (3).jpg` | Retro workstation proportions, chunky bevels, colored resin, keys, cable and studio light | Adapt the objects and palette; scene properties are inferred |
| `ui (1).jpg` | Demonstrates the idea of combining 3D section elements and UI in one environment | Do not copy its screen, branding, statistics, layout or assets; not supplied to the image generator |
| Owner's local first overall plan | Product sequence and section responsibilities, particularly legal review and human decisions | Retain the private source locally; publish only this concise design interpretation |

The two JSON files are structured **visual descriptions**, not lossless image conversions, recovered CSS or Blender-importable scene files. Their `observed` fields describe the references; `project_adaptation` fields are proposals. Exact reference hashes and pixel sizes are recorded for traceability.

## Palette and typography

The official [Anduin Brand Standards, February 2024](https://anduintransact.com/hubfs/Anduin%20Brand%20Standards%20-%20February%202024.pdf?hsLang=en), pages 16–17, provide the following colors and typography. This is a dated official reference, not a claim that the handbook has never changed.

| Token | Value | Proposed application |
| --- | --- | --- |
| Anduin Blue | `#48AFF0` | Dominant resin, active state, highlight accents |
| Anduin Black | `#182A38` | Main text and dark controls |
| Anduin Mint | `#96DBD4` | Secondary resin and source highlights |
| Anduin Dark Mint | `#33BDB0` | Small secondary accents |
| Anduin Navy | `#2251A4` | Selected text and strong controls |
| Anduin Dark Blue | `#162950` | CRT screen and dark contrast surfaces |
| Proposed light background | `#EEF5FA` | Studio canvas and quiet chrome |
| White | `#FFFFFF` | Documents, bases and readable UI surfaces |

Use Poppins Bold for display headings and Inter for interface/body copy. Source-document typography preserves the document's own rendering in the eventual functional workspace. The mockup uses a plain product-name label; it does not fabricate an official Anduin logo.

Blue is the dominant chromatic material; white and cool pale surfaces provide negative space. Mint supports the blue rather than competing with it. Long text sits on opaque light surfaces. Use dark text on bright blue controls; color alone must not communicate a finding category or decision.

## Homepage composition

Design dials: visual variance 5/10, motion intensity 2/10, density 5/10. The target concept canvas is 1920 × 1280; record the actual generated dimensions separately.

1. **Shell and header:** one white-rimmed rounded shell, a shallow concave toolbar notch, New document, search and My documents. Keep the product name and concept status visible.
2. **Sidebar:** a slim icon capsule for common sections, with a separate utility capsule for Templates and Feedback. Labels/tooltips and keyboard focus make the rail usable.
3. **Introduction:** a short two-line heading, “Review before you digitize.”, one sentence and Upload contract / Use demo. Avoid a second marketing hero or unnecessary panels.
4. **Source and review lane:** Intake → Source quality → Document map → **Legal review** → Decision/report. Legal review is the strongest silhouette; the other stations remain subordinate and readable.
5. **Digitization lane:** Annotation → Form preview → Responses → PDF QA/export. These stages share aligned bases, plaques and spacing.
6. **Footer:** “Hover to explore · Click to open a section” and “Design concept · no live processing”. Display real processing status only after a runtime exists.

Use a simple cool studio ground and two coherent groups. Align labels, maintain consistent object scale, and leave clear empty space around silhouettes. Subtle connectors may suggest order; numbered labels remain the primary guide. Remove connectors if they create clutter. Keep small informational panels limited to a useful upload cue or selected-section description.

The homepage is not a field of nine dense flat cards. It is also not a large decorative scene that hides navigation. Each 3D station has a clear label, a stable selection target and one understandable purpose.

## Section objects and click destinations

| Stage | 3D station | Click opens |
| --- | --- | --- |
| 01 Intake | Document stack and blue upload tray | Upload, original/version registration and duplicate candidates |
| 02 Source quality | Paired source/PDF sheets and lens | Conversion/extraction issues, comparison and unread regions |
| 03 Document map | Compact nodes/links and outline slab | Outline, relationship graph and page map linked to source |
| 04 Legal review | Blue retro CRT, keyboard and source inspection prop | Source-linked findings and human review workspace |
| 05 Decision/report | Report, stamp and small speech tile | Decisions, clarification questions, unresolved items and report |
| 06 Annotation | Source slab and stylus | Review of paragraph, text box, radio box and checkbox anchors |
| 07 Form preview | Dimensional form panel | Full-content form and source comparison |
| 08 Responses | Filled field tiles and small keypad | Draft answers and version-linked confirmation |
| 09 PDF QA/export | PDF slab, lens and download arrow | Preview, mapping/content/render checks and export |

Duplicate/version comparison belongs with Intake and Source quality. Feedback/memory and Templates are management destinations. They do not become additional mandatory workflow steps.

## Interaction proposal

These behaviors are specified for a future implementation. The delivered image is still.

| State | Visual behavior | Functional behavior |
| --- | --- | --- |
| Idle | All stations are still; labels stay visible | Each enabled section is a named selection target |
| Hover | Slight object lift, restrained blue rim, one short prop motion; reveal Open section | Preview section purpose without navigation |
| Keyboard focus | Same information as hover, with a visible focus outline | Enter/Space opens the section |
| Click/tap | Brief selection feedback | Open the dedicated functional UI and preserve document/version context |
| Exit hover | Return to neutral without bounce | Remove preview; keep persistent labels |
| Reduced motion | Static rim/focus treatment | Same navigation and information |
| Unavailable stage | Quiet object treatment plus a clear reason | Prevent unavailable work; offer the prerequisite step |

Proposed hover timing: 180–260 ms. Lift 1–2% of object height; rotation no more than 3°. These are starting values, not measured or tested animation settings. Move the 3D object or prop, not the label or hit area. Animate one focused/hovered station at a time; avoid automatic motion throughout the scene.

Suggested prop cues: Intake lifts a sheet; Source quality shifts its lens; Map highlights a node; Legal review lights its quote symbol; Decision/report tilts its stamp; Annotation moves the stylus slightly; Form raises one field; Responses depresses one key; PDF QA lifts its arrow. None of these decorative states means a check passed or a document was approved.

Touch users see labels and actions without hovering. A single tap opens an enabled section. The future implementation needs a conventional navigation alternative; 3D gestures must not be required to reach a screen.

## Functional screens after click

The Legal review screen is the product's center: a document/version header, left outline and filters, central PDF/source view, right finding and decision panel, and a thin coverage/open-items/history bar. Contradictions show both source passages. Findings show rationale, exact locations and a confirmation question; users can confirm the issue, dismiss with a reason or request clarification.

Confirming an issue does not resolve it or approve the contract. A revision and subsequent verification establish resolution. Missing extraction/source evidence remains visible; a clean document may produce no findings.

Keep operational text, PDF rendering, forms and controls in a crisp 2D UI layer. The immersive 3D language belongs primarily to the hub and supporting section cues. Dedicated screens prioritize evidence and readability. The homepage mockup does not represent those screens as implemented.

## Blender-friendly art direction

Use one principal silhouette per module and at most one optional functional prop. The Legal review CRT is one integrated hero assembly; its keyboard and cable belong to that assembly. Keep cables local to it and eliminate random floating gadgets.

Use the same gently elevated three-quarter camera, common scale family, consistent bevels, soft key light and shared material library for all objects. Bases are simple white/light-blue rounded solids, with subtle contact shadows. The blue resin can transmit light, but the object silhouette must remain easy to read.

Organize a future scene into `CAMERA`, `LIGHTS`, `STAGE` and `MODULE_01_INTAKE` through `MODULE_09_PDF_QA_EXPORT`, using the names in [ui-3.json](docs/design/ui-3.json). Each module has its own collection and root transform. Separate principal geometry, props and base. This lets a modeler work on one station, create a neutral/hover pose, and render the same station separately.

Keep labels, exact interface text, real source excerpts and logos out of the meshes/textures. Composite them as crisp UI after rendering. No shared cable network, opaque inter-module dependencies, or detailed office architecture is required.

The JSON lists optional material starting ranges. They are not benchmarked shader settings. A future modeler can choose the render engine after a real scene and output requirements exist; this task creates no Blender file, executable scene, script, animation clip or web asset export.

## Responsive and accessibility proposal

Desktop: two ordered lanes inside the reference shell. Tablet: retain stage order and simplify the rail. Mobile: stack labeled stage groups and use static stills; open one functional screen at a time. These layouts are specifications, not delivered mockups or tested responsive behavior.

Future QA must check text contrast, named targets, keyboard order, focus states, reduced motion, touch navigation and unavailable/loading/error states. Avoid success checkmarks or confidence/coverage percentages without actual evidence. The current concept contains no real contract or personal data.

## Files and review status

- [UI 2 reference JSON](docs/design/ui-2.json)
- [UI 3 reference JSON](docs/design/ui-3.json)
- [Homepage concept image](demo/design/anduin-3d-workflow-hub-v1.png)
- [Exact image-generation prompt](prompts/design/3d-workflow-hub-v1.md)

Selected image: PNG, 1536 × 1024 pixels, RGB. The generator produced this size rather than the 1920 × 1280 target; it has not been upscaled. Visual review confirms nine labeled 3D stations, the Anduin blue/mint direction, the reference header/rail grammar and the simplified two-lane studio setting. Mobile layouts, hover motion and functional destinations have not been built or tested.

The image is an approval concept. It illustrates an intended composition and one hover state, not recovered geometry or a Blender render. Structured specifications remain authoritative when generative typography, proportions or small details vary. Approval of this package does not authorize an application build or hackathon submission.
