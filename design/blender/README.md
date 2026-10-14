# Blender stations

Built on 15 October 2026 with Blender 5.1 through the Blender MCP connection.

## Files

- `build_modules.py` — reproducible build script. In Blender: `exec(open(r"<repo>/design/blender/build_modules.py").read())`, then `build_all()` and `export_all(r"<repo>/public/3d")`.
- `anduin-stations.blend` — the saved scene produced by the script.
- `../../public/3d/module-01.glb` … `module-09.glb` — Draco-compressed exports used by the web app (about 630 KB in total).

## Scene organisation

As proposed in [UI 3 JSON](../references/ui-3.json): `CAMERA`, `LIGHTS` and one collection per station, `MODULE_01_INTAKE` … `MODULE_09_PDF_QA_EXPORT`. Each module has one root empty at its base centre, principal geometry, and a named `PROP_*` part used for the hover cue in the browser:

| Module | Geometry | Hover cue (`PROP_*`) |
| --- | --- | --- |
| 01 Intake | Resin tray, stacked sheets, mint upload tile with arrow | Top sheet lifts |
| 02 Source quality | Holder, Word and PDF sheets with badges, magnifier | Lens slides across |
| 03 Document map | Connected node cubes, outline slab | One node scales up |
| 04 Legal review | CRT with screen bars and quote mark, keyboard, coiled cable, source sheet, magnifier | Screen quote brightens |
| 05 Decision / report | Report sheet, rubber stamp, speech bubble | Stamp tilts |
| 06 Annotation | Source slab with selection, stylus, three field chips | Stylus moves |
| 07 Form preview | Framed form panel with fields, radios, toggle | One input well lifts |
| 08 Responses | Field panel, cream keypad, pencil | One key presses |
| 09 PDF QA / export | PDF sheets with badge, magnifier, download tile | Arrow lifts |

Shared materials are named (`blue_resin`, `mint_resin`, `white`, `paper`, `cream`, `screen`, `glass`, …); the web app maps these names to its own physically based materials so the look is consistent across stations. Interface text and contract excerpts are not baked into meshes; only identity marks (W, PDF, quote, arrows) are modelled.

## Fidelity and fallback

The models are interpretations of single-view generated stills; hidden surfaces, proportions and materials are approximations, not recovered geometry. The approved PNG stills in `public/3d/png/` remain the fallback for phones, reduced-motion preferences, browsers without WebGL and `?static`, and are shown until each model has loaded.

## Motion

Neutral pose at rest; on hover or keyboard focus a station lifts about 2 % of its height and turns under 3° over roughly 220 ms while its prop cue plays. Clicking flies the station into the workspace header. No cue implies that a check passed.
