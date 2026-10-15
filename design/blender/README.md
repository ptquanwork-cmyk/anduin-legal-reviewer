# Blender stations

Built on 15 October 2026 with Blender 5.1 through the Blender MCP connection.

## Files

- `build_modules.py` — reproducible build script. In Blender: `exec(open(r"<repo>/design/blender/build_modules.py").read())`, then `build_all()` and `export_all(r"<repo>/public/3d")`.
- `anduin-stations.blend` — the saved scene produced by the script.
- `../../public/3d/module-01.glb` … `module-09.glb` — Draco-compressed exports used by the web app (about 750 KB in total; the largest, 04, is 188 KB).

## Scene organisation

As proposed in [UI 3 JSON](../references/ui-3.json): `CAMERA`, `LIGHTS` and one collection per station, `MODULE_01_INTAKE` … `MODULE_09_PDF_QA_EXPORT`. Each module has one root empty at its base centre, principal geometry, and a named `PROP_*` part used for the hover cue in the browser:

| Module | Geometry | Hover cue (`PROP_*`) |
| --- | --- | --- |
| 01 Intake | Thick open resin tray (rim slopes from back to front), fanned stack of rounded sheets, mint upload tile with block arrow | Top sheet lifts |
| 02 Source quality | Shallow resin tray, two Word sheets and a PDF sheet with badges, magnifier | Lens slides across |
| 03 Document map | Connected node cubes, outline slab | One node scales up |
| 04 Legal review | Wide CRT with rounded bezel, screen bars and quote mark, keyboard, coiled cable; source sheet on a stand and magnifier to the right | Screen quote brightens |
| 05 Decision / report | Thick report slab, rubber stamp with turned handle and collar, speech bubble with tail | Stamp tilts |
| 06 Annotation | Upright source slab on a blue backing, selection with frame and handles, marker, three linked field chips | Stylus moves |
| 07 Form preview | Wide form panel on a thick blue frame with a set-back top bar; two input wells, two radios and two square buttons (the selected ones with lighter faces); turned so the frame's right side shows, as in the still | One input well lifts |
| 08 Responses | Cream 3 × 6 keyboard in an open tray on a thin blue base; blue field panel with two input bars in front of a pale panel and a blue back panel; mint pen with cap, ring and clip resting on a key | One key presses |
| 09 PDF QA / export | Two rounded PDF sheets with badge, magnifier, download tile with block arrow | Arrow lifts |

Shared materials are named (`blue_resin`, `mint_resin`, `white`, `paper`, `cream`, `screen`, `glass`, …); the web app maps these names to its own physically based materials so the look is consistent across stations. Interface text and contract excerpts are not baked into meshes; only identity marks (W, PDF, quote, arrows) are modelled.

Shared builders keep the stations consistent: `rslab` (rounded-corner slab for sheets, tiles, badges and panels), `tray`, `lathe`, `magnifier` and `arrow_outline`. Sheets are 0.06 units thick with 0.1-unit corner radii (a sheet is 1 unit wide), so they read as solid cards like the stills.

## Fidelity and fallback

The models are interpretations of single-view generated stills; hidden surfaces, proportions and materials are approximations, not recovered geometry. The approved PNG stills in `public/3d/png/` remain the fallback for phones, reduced-motion preferences, browsers without WebGL and `?static`, and are shown until each model has loaded.

In the browser each model is viewed from the shared elevated three-quarter direction and cropped so it fills 94 % of its rectangle and rests on the bottom edge, matching how the stills are placed (`object-contain`, `object-bottom`). The framing is computed from the exported geometry, so a rebuilt model needs no per-module tuning.

## Motion

Neutral pose at rest; on hover or keyboard focus a station lifts about 2 % of its height and turns under 3° over roughly 220 ms while its prop cue plays. Clicking flies the station into the workspace header. No cue implies that a check passed.
