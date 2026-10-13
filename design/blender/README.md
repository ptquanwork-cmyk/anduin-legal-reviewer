# Blender reference handoff

This package supplies visual modeling references and a proposed hover-motion vocabulary. No Blender scene, mesh, rig, animation or import script was created.

## Work from the package

Use [the approved homepage](../homepage/anduin-3d-workflow-hub-v1.png) for composition and relative hierarchy. Use [the nine separate PNGs](../components-3d/README.md) as object references. Their transparency makes placement against a modeling viewport or image-assisted reconstruction tool easier; image-based reconstruction remains a separate tool/process.

The stills show one readable three-quarter view per assembly. They are not multi-view blueprints and cannot specify unseen surfaces. The reference JSON's material ranges and future camera/light setup are proposals rather than measured original settings.

## Suggested scene organization

Use the collection names in [UI 3 JSON](../references/ui-3.json): `CAMERA`, `LIGHTS`, `STAGE`, and a separate `MODULE_01_INTAKE` through `MODULE_09_PDF_QA_EXPORT`. Give each module one root transform; separate its principal shape, optional prop and shared base. Keep all modules in a consistent scale family and camera/light setup.

Use shared blue-resin, mint-resin, matte-white, dark-screen, cable and metal materials. UI labels, document excerpts and controls stay in a separate UI layer rather than being baked into geometry. Reuse a restrained base geometry and avoid dependencies between modules.

## Proposed hover cues

| Module | Cue |
| --- | --- |
| Intake | Raise the top document sheet slightly |
| Source quality | Shift the inspection lens across the paired sheets |
| Document map | Highlight one node |
| Legal review | Lift the workstation slightly and brighten the quote symbol |
| Decision/report | Tilt the stamp without marking approval |
| Annotation | Move the stylus over a source region |
| Form preview | Lift one input well |
| Responses | Depress one key |
| PDF QA/export | Lift the arrow without implying passed QA |

Neutral idle pose, one focused station at a time, 180–260 ms hover entry, subtle lift and at most 3° rotation are proposed starting values. Keep plaques and click targets stationary. Click opens the corresponding [functional screen concept](../interfaces/README.md); it does not trigger automatic legal approval or export. Reduced-motion mode should retain a static selection cue.
