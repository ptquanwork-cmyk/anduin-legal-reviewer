# ADR 0001: Public project foundation

- Date: 2026-10-13
- Status: accepted for repository setup

## Context

The owner requested an English-first public GitHub repository that shows the build process and OpenAI approach. The local workspace already contains two independent upstream checkouts with uncommitted local changes.

## Decision

Initialize `anduin-legal-reviewer` at the current workspace root. Group business documentation, development context, prompt drafts, OpenAI notes, application code, evaluation assets, experiments, demo materials, and progress into separate folders.

Exclude both nested checkouts and document their provenance. Seed publishable examples with synthetic data. Use actual Git history for development progress; do not manufacture earlier commits. Store the owner's continuing GitHub-update instruction in root `AGENTS.md`.

## Consequences

Judges can follow the project without downloading local environments or model weights. The initial repository is a foundation, not a working demo. Any reused implementation must later be reviewed and committed here with attribution so it is available from a fresh clone.
