# 3D workflow hub image prompt — v1

Status: generated design concept; not implementation instructions.

Tool: built-in image generation. References: local `ui (2).jpg` for layout and `ui (3).jpg` for 3D style. UI 1 is excluded from tool inputs. The owner clarified Anduin colors before this prompt.

```text
Use case: ui-mockup.
Generate ONE beautiful high-resolution desktop homepage design image for "Anduin Legal Reviewer", a conceptual interactive 3D workflow hub, English copy. Landscape 1920x1280 preferred, screenshot front-on, no device/browser frame. This is the HOME HUB, not a flat PDF review workspace. All main workflow sections are represented by detailed three-dimensional objects. The user should instantly understand: hover a 3D object to animate it, click to open that section's functional UI. Show only one hovered module as a static hover preview; do not add motion diagrams.

Input Image 1 ui (2).jpg is the primary web layout reference. Strongly follow its single huge white-rimmed round app shell, curved concave NOTCH in the top header, slender two-part pill icon rail along left edge, immersive hero stage, confident large sans headline, asymmetrical white organic info panels integrated with the shell. Do not copy the real estate content, mountain photo, house, social footer or purple brand mark. Avoid generic rectangular SaaS dashboard or nine flat equal cards.
Input Image 2 ui (3).jpg is the exact 3D art direction: sculpted retro CRT workstation, thick beveled translucent colored resin, inset curved black screen, realistic chunky ivory and gray keyboard, accent key, coiled cream cable, floating arrow cursor, glossy block accessory, stacked embossed tiles. Use this material vocabulary for EVERY module, with actual thickness, perspective, contact shadows, reflected studio light and tiny designed details. Not clay toys, not flat SVG icons, not a smiling robot. Do not retain orange/red as dominant colors.
UI 1 is NOT an input and must not be copied. Its role in the user's brief is only the idea of a dimensional main environment with meaningful 3D components for every section.

COLOR AND BRAND: user clarified ANDUIN, not Android. Official Anduin Brand Standards (February 2024) identify Anduin Blue #48AFF0, Anduin Black #182A38, Mint #96DBD4, Dark Mint #33BDB0, Navy #2251A4, Dark Blue #162950. Use Anduin BLUE as the dominant saturated resin and active accent, black/navy text, white and pale cool blue surfaces, supporting mint resin. Outer canvas softly desaturated blue-gray, immersive inner studio environment cool near-white blue. NO Android-green dominant palette, NO orange/beige sunset palette. Heading styled like Poppins Bold, body like Inter. Typography wordmark "Anduin Legal Reviewer"; do NOT fabricate the official logo or put brand logo onto the 3D assets.

SPATIAL COMPOSITION AND LAYOUT:
Big rounded inset shell with luminous fine white perimeter occupies 93 percent canvas. Header concave center notch contains small search "Find a document or section". Left header white pill "New document" with blue plus. Right white pill "My documents" and subtle avatar. Outside shell top margin small product name upper left and "DESIGN CONCEPT" upper right. Inside left edge white slim rounded vertical rail with Home active blue, then document/map/review/form/export line icons; second smaller white capsule at bottom Templates and Feedback.
Inner environment is an airy softly lit 3D studio with curved cool-blue plinths and gentle flowing floor tracks. Atmospheric, highly dimensional but usable and calm. Objects and panels grounded in one consistent world, not scattered stickers.

Upper left large two-line headline "Review before\nyou digitize." Supporting one-line text "One source. Every step. Your decision." A slim badge "Concept preview". Below small dark navy pill "Upload contract" and secondary "Use demo".
Upper/right center hero is the most prominent 3D LEGAL REVIEW module: translucent Anduin-blue retro CRT keyboard workstation with cream coiled cable, black screen showing a quotation mark and two short line bars, a white source-page prop with two contrasting blue/mint highlighted lines, a polished blue magnifying glass. A sculpted workstation platform with small plaque "04  Legal review". This module is visibly hovered: subtle blue illuminated perimeter under platform, slightly lifted sculpture, one white arrow cursor near keyboard, small contextual white pill "Open workspace ↗". No completed-state tick.
Arrange the other source/review modules along the same mid-level curved stage as smaller 3D stations, with generous separation and clear labels:
"01  Intake" — dimensional white document stack sliding into translucent blue upload tray; chunky upward-arrow tile.
"02  Source quality" — two thick floating Word/PDF sheets, small inspection lens and a blue alignment frame, joined pair geometry.
"03  Document map" — dimensional blue/mint beads connected by chrome links above a small outline scroll, a compact relationship-graph sculpture.
"05  Decision / report" — chunky stamp plus a white report sheet and mint speech bubble; implies human confirmation, no automatic legal conclusion.
The workstation 04 dominates, other four source/review stations are smaller but detailed; main path 01 → 02 → 03 → 04 → 05 is visually coherent through subtle recessed/light blue connector tracks, no five equal flat cards.

Lower area is an elegantly rounded horizontal white/light-blue flowing platform that hosts FOUR separate 3D digitization stations, each with its own physical prop, index, name, short caption:
"06  Annotation" — a blue stylus hovering over a thick source sheet with outlined paragraph, text field, single-choice radio and multiple-choice checkbox widgets as distinct resin insets. Caption "Anchor four field types".
"07  Form preview" — upright dimensional blue-white form panel with rounded input wells and small mint radio/checkbox controls. Caption "Keep the full content".
"08  Responses" — angled chunky cream keypad, filled field tiles and a mint pencil. Caption "Review entered data".
"09  PDF QA / export" — thick PDF document, translucent lens and blue download arrow block; no success tick. Caption "Check before export".
White plaques and clean text belong to the 2D UI overlay layer and stay crisp; the objects and platforms are richly rendered 3D.

Asymmetrical organic info panel tucked bottom/left of hero stage, distinct from flat cards: heading "Start with a source", copy "Upload PDF or Word, then inspect issues against the original.", tiny "Duplicate checks stay with intake". Small 3D miniature two-paper stack emerges from its corner; do not obscure text.
Small sculpted white panel next to hovered review platform: heading "Legal review", copy "Open source-linked findings. Confirm, dismiss or request clarification." Keep this panel compact, no PDF viewer or three-column workspace on the homepage.
Bottom shell edge tiny instructional label "Hover to explore · Click to open a section" and honest badge "Design concept · no live processing".

ALL nine sections must be visible, complete and readable. Main source-review path visually prioritized; later digitization path grouped separately but connected. Every main section has a real 3D illustration, not only the hero. Future actual click destinations are functional section screens; this screenshot shows the hub only. Avoid fake metrics, fabricated confidence percentages, thousands of contracts, donut charts, testimonials, vendor/runtime names, invented official logos, real contract content, blanket approval.
Art direction: crisp typography, high-end object render details, layered depth, soft luminous blue reflections, subtle contact shadows, cool matte white interface, richer translucent resin objects. Reference UI2 shell+header+rail MUST stay apparent; reference UI3 retro sculpture material MUST stay apparent. Do not reduce to a blank 2D dashboard. No collage or multiple screens.
```

## Final cleanup instruction

The first blue hub concept was refined with the following exact instruction, using that generated concept as the edit target. The selected output is now organized as `design/homepage/anduin-3d-workflow-hub-v1.png`. Earlier exploratory outputs remain outside the repository.

```text
Edit the supplied Anduin Legal Reviewer 3D workflow hub concept to make it CLEANER, more orderly and much easier to reconstruct as a modular Blender scene. Preserve its overall reference UI2 web shell, concave header notch, slim two-part left icon rail, dominant Anduin Blue #48AFF0 and Mint #96DBD4, all NINE named sections and exact English UI copy. Keep Legal review as the primary section, the beautiful retro resin CRT and chunky keyboard based on UI3, and keep the hover cue "Open workspace". This is still a homepage of 3D section objects, not a flat dashboard.

Change only these specific design aspects:
1. Remove the busy architectural office background entirely: no arches, windows, stairs, plants, railings or room furniture. Replace it with a quiet, near-white cool blue studio gradient and a simple matte ground.
2. Simplify the three-dimensional stage: TWO orderly, low, shallow matte white/light-blue shelves for the two groups. Avoid stacked wavy terraces, glowing connector tubes, nested plinths and excessive undulations. Keep small matching rounded bases for each station, all labels on the same baseline within their group. Upper group contains 01 Intake, 02 Source quality, 03 Document map, 04 Legal review, 05 Decision/report; lower group 06 Annotation, 07 Form preview, 08 Responses, 09 PDF QA/export. CRT may be larger, but keep other objects consistent scale. Clear generous separation between silhouettes.
3. Reduce blue glow, white bloom, reflective floor and glass transparency. Blue objects retain sophisticated POLISHED RESIN, dimensional bevels and crisp silhouette, but moderate transmission, white parts are matte, floor softly lit with restrained contact shadows. No large luminous halos. Keep object surface details limited and easy to model.
4. Remove the extra "Start with a source" floating card and its duplicate document sculpture; keep the useful note "Duplicate checks stay with intake." as one small clean text line beneath the primary group or upload controls. Keep a small selected Legal review description integrated as a clean white rounded label, not hovering over other objects.
5. Reduce accessory clutter. Intake one tray/document assembly; Source quality one paired-sheet assembly and lens; Map compact nodes/links, no loose extras; Legal review CRT/keyboard and one source/lens assembly, local cream cable only; Decision/report one stamp/report with a small speech tile; Annotation one source/stylus assembly; Form one panel; Responses one keypad/field assembly; PDF QA one PDF/lens/arrow assembly. No random floating elements.
6. Keep the header and headline airy. Text and controls remain sharp, dark navy on white or pale surfaces. Reserve three-dimensional rendering for module objects and shallow bases. Do not make everything 2D. Annotation needs all four recognizable types: paragraph/source region, text field, single-choice radio, multiple-choice checkbox.
7. Footer stays readable: "Hover to explore · Click to open a section" and "Design concept · no live processing". Do not show any process-completed state or invented statistics.
8. Replace portrait avatar with a simple neutral circle showing "J", eliminating an invented person's portrait.

The final result should feel like a clean art-directed Blender product scene composed from nine independent modules, with consistent material library, one camera, one soft upper-left studio key, low fill and clear white space. Preserve beautiful 3D depth and all meaningful section objects. No bland flat 2D interface, no dramatic room, no heavy reflections, no new content or extra sections. Deliver one coherent landscape homepage screenshot.
```

No website or Blender scene is created by this prompt.
