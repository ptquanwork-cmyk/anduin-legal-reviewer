# Anduin Legal Reviewer — design package

Status: image/design references only; no application or Blender implementation.

This is the single home for the approved homepage, overall specification, reference JSONs, nine interface concepts, nine individual 3D components, prompts and Blender handoff notes.

- [Approved homepage](homepage/anduin-3d-workflow-hub-v1.png) — preserved byte-for-byte.
- [Overall design](design.md) — palette, visual language, hierarchy and future hover/click behavior.
- [Nine functional interfaces](interfaces/README.md).
- [Nine individual 3D components](components-3d/README.md).
- [Blender handoff](blender/README.md).
- [UI 2 reference JSON](references/ui-2.json) and [UI 3 reference JSON](references/ui-3.json).
- [Exact 18-image prompt matrix](prompts/interfaces-components-v1.json) and [original hub/refinement prompt](prompts/3d-workflow-hub-v1.md).
- [Exact generation appendices/refinements](prompts/generation-refinements-v1.json).
- [Asset manifest](manifests/assets.json) and [actual validation](manifests/validation.json).
- [Archive verification](manifests/archive-validation.json).
- Local export: `exports/anduin-design-package-2026-10-14.zip`; ZIP archives are untracked to avoid duplicating all PNGs in Git history.

The original three JPEGs are organized in `references/source-images/` locally and remain untracked. The private first overall plan remains outside this public package. All interface examples are synthetic; their mock states are not evidence of completed processing.

## Section pairs

| Section | Interface concept | Blender object reference |
| --- | --- | --- |
| Intake | [01](interfaces/01-intake.png) | [01](components-3d/01-intake.png) |
| Source quality | [02](interfaces/02-source-quality.png) | [02](components-3d/02-source-quality.png) |
| Document map | [03](interfaces/03-document-map.png) | [03](components-3d/03-document-map.png) |
| Legal review | [04](interfaces/04-legal-review.png) | [04](components-3d/04-legal-review.png) |
| Decision/report | [05](interfaces/05-decision-report.png) | [05](components-3d/05-decision-report.png) |
| Annotation | [06](interfaces/06-annotation.png) | [06](components-3d/06-annotation.png) |
| Form preview | [07](interfaces/07-form-preview.png) | [07](components-3d/07-form-preview.png) |
| Responses | [08](interfaces/08-responses.png) | [08](components-3d/08-responses.png) |
| PDF QA/export | [09](interfaces/09-pdf-qa-export.png) | [09](components-3d/09-pdf-qa-export.png) |
