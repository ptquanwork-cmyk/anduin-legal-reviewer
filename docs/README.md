# Project documentation

Start with the [architecture and workflow map](architecture/overview.md): the reviewer workflow, the system, the processing pipeline and where every folder fits. Then read the [challenge](challenge/brief.md), [MVP scope](product/mvp.md) and [decisions](decisions/0001-project-foundation.md).

[Repository map](repository-map.md) lists every public folder. Separate the organizer's challenge from this project's interpretation and implementation status.

[Deployment setup](deployment/setup.md) records the verified Vercel and Supabase projects. [Security review](security.md) lists the controls, the findings of the 15 October review and the accepted limitations.

[Model integration notes](openai/README.md) record the official sources and how the semantic reviewer is wired. [References](references/README.md) record upstream provenance and licences.

[Overall design](../design/design.md) describes the 3D workflow hub. The app shows the approved high-resolution station renders; the Blender stations render in real time with `?three`. [UI 2 JSON](../design/references/ui-2.json) records the web layout reference; [UI 3 JSON](../design/references/ui-3.json) records the 3D reference and module specification.

All design artifacts now live in [the design package](../design/README.md), including functional screen concepts and individual 3D modeling references.

[Judge reading guide](judging/README.md) starts with the three primary specifications: [01-first-overall-plan.md](project/01-first-overall-plan.md) for the original overall system proposal, [design.md](../design/design.md) for the design system, and [UI Master.md](../design/UI%20Master.md) for the UI system. The original Vietnamese plan is published byte-for-byte at the owner's explicit request; its local source is retained. [PLAN.md](project/PLAN.md) is an English supporting summary. Project Profile, Design Profile, System and Setup are also supporting documents.
