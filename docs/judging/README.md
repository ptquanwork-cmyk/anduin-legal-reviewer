# Judge reading guide

The owner requests three primary Markdown specifications: overall system operation, the design system and the UI system. Read them together to understand how the proposed workflow becomes a consistent visual and interface specification.

## Suggested reading order

| Order | Artifact | Question it answers |
| --- | --- | --- |
| 1 | [Overall Plan — 01-first-overall-plan.md](../project/01-first-overall-plan.md) | How does the overall system operate, according to the owner's original detailed proposal: processing, evidence, human decisions, quality gates, reuse, feedback and priorities? |
| 2 | [Design system — design.md](../../design/design.md) | Which Anduin colors, typography, layout, 3D materials and modular Blender conventions define the visual language? |
| 3 | [UI system — UI Master.md](../../design/UI%20Master.md) | What appears on the homepage and nine interfaces, and how should navigation, controls, states and light/dark themes behave? |

The owner explicitly identified `01-first-overall-plan.md` as the Overall Plan. Its published copy preserves the supplied Vietnamese source byte-for-byte. `design/design.md` owns visual rules, and `design/UI Master.md` owns screen-level behavior. The approved design specifications, images and delivery archives are preserved.

The original plan's opening sentence records an earlier local-only publication instruction. The owner's subsequent request to publish these documents, clarified to identify this exact file on 14 October 2026, supersedes that restriction for this plan. This note is outside the source file so its original content remains intact. Repository-authored supporting documentation remains in English.

## Supporting evidence and inspection

[Challenge brief](../challenge/brief.md) supplies the problem. [Project Profile](../project/PROFILE.md) and [Design Profile](../../design/DESIGN%20PROFILE.md) provide background. [System](../project/SYSTEM.md) expands proposed responsibilities/entities; [Setup](../project/SETUP.md) explains local inspection. These support the three primary documents.

[PLAN.md](../project/PLAN.md) is an English workflow summary derived from the original. It is supporting material and does not replace `01-first-overall-plan.md` as the primary overall plan.

[Prompt registry](../../prompts/README.md), [evaluation plan](../../evals/README.md) and [build log](../../progress/build-log/2026-10-14.md) separate intended instructions and checks from actual results.

## Evidence boundaries

*Updated 16 October 2026. The paragraphs further below describe the 14 October planning package.*

The application is now built and live: Next.js on Vercel, Supabase storage and database, and a worker on the owner's laptop. Blender station models are rendered live. Evidence of what runs, and how well, is in the [README's testing section](../../README.md#testing-and-evidence) and the [build logs](../../progress/build-log/). It includes end-to-end runs of eight synthetic contracts against production, scored against expected results. These are synthetic documents written for this project. No benchmark on real contracts and no confidence calibration is claimed.

The original planning package remains: synthetic fixtures, a detailed static design package, and the approved light hub/screens and object references with separate dark companions. Image/ZIP/hash checks are actual artifact-delivery evidence. All contract, answer and job states in the UI concepts are synthetic.

The published original plan and English supporting documents describe proposed product/system requirements. Publication includes only the specifically identified original plan from the private planning folder; raw recordings/transcripts, other private inputs, real contracts, credentials and unrelated checkouts remain outside the public repository. The owner authorizes this judge-readable planning/design package; publication does not submit the hackathon entry.

[Full repository map](../repository-map.md) · [Design package](../../design/README.md) · [Live static project hub](https://anduin-legal-reviewer.vercel.app).
