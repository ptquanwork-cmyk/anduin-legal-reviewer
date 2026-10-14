# Project profile — Anduin Legal Reviewer

14 October 2026 · Public project description for reviewers.

## Purpose

Anduin Legal Reviewer is Quan/Jayson's Cybernetics hackathon project for reviewing contract inputs before digitization. It helps a reviewer locate suspected typos, missing references, contradictions and ambiguity, inspect exact source evidence, and prepare a specific confirmation question for the responsible reviewer or legal counsel.

## User and job

The primary user is a contract digitization reviewer. The user needs to understand the document, identify incomplete or inconsistent inputs, retain decisions and version history, and avoid carrying unresolved source problems into annotation, forms or a filled PDF.

The reviewer controls decisions. An automated finding is a candidate supported by evidence, not a legal conclusion. Confirming an issue and verifying its resolution are separate events.

## Core and extended scope

The core hackathon outcome is an evidence-linked review report and human confirmation workflow. The fuller product plan extends this into source-quality checks, document maps, duplicate/version comparison, four annotation types, full-content forms, version-linked responses and PDF QA/export.

The navigation exposes nine sections without pretending they are all implemented. A 3D hub introduces each section; dedicated functional screens prioritize source reading and actionable controls.

## Current evidence

| Area | Evidence and status |
| --- | --- |
| Public repository | Project source, documentation, prompts, synthetic cases and progress logs are published |
| Hosted project hub | Existing static HTML hub; infrastructure/deployment verification is dated in the build log |
| Design | Approved light hub, nine light functional screens, nine isolated objects, ten dark companions and UI Master |
| Backend infrastructure | Dedicated Supabase project is documented; it does not establish review persistence |
| Contract-review application | Proposed; no hackathon runtime in `src/` |
| Model integration/quality | Proposed; no contract-review benchmark or evaluation result claimed |
| Blender | Image references and motion/scene specification; no mesh, scene, rig or animation created |
| Submission | Not submitted by this work |

## Product principles

- Preserve the source and version identity.
- Tie findings to exact passages and locations.
- Expose missing extraction, uncertainty and blocked prerequisites.
- Keep legal review and human confirmation central.
- Reuse verified structure/results only within the right version, scope and configuration.
- Use full original contract content in forms; separate helpful explanation from the original wording.
- Record decisions and feedback without claiming that one click retrains a model.
- Present actual measurements only after a corresponding run.

## Links

[Public repository](https://github.com/ptquanwork-cmyk/anduin-legal-reviewer) · [Existing hosted project hub](https://anduin-legal-reviewer.vercel.app) · [Overall Plan](01-first-overall-plan.md) · [System](SYSTEM.md) · [Setup](SETUP.md) · [UI Master](../../design/UI%20Master.md) · [Judge reading guide](../judging/README.md).
