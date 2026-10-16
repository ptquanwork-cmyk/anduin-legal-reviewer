# Hub polish, README front page and repository layout

Date: 17 October 2026.

Request (summarised from the owner's message):
- Move the "Anduin Legal Reviewer" brand at the top left slightly toward the centre.
- Make the 3D station graphics look sharper, more realistic and deeper; using the original images is acceptable.
- On GitHub, show the introduction video near the top of the README, add a short introduction of the app and a section on how it was tested and what the results were.
- Reorganise files and folders so the layout is clear, compact and logical.

Decisions:
- The hub shows the approved 3D renders by default, re-exported at up to 1200 px (was 720 px) with a contact and cast shadow. The real-time Blender stations stay available with `?three`.
- GitHub does not play a repository video inline, so the README shows a thumbnail of the video's results frame that links to the MP4 (GitHub's file view plays it).
- `openai/` and `references/` moved under `docs/`; the empty `experiments/` scaffold and the placeholder `demo/screenshots/` and `demo/submission/` pages were removed; the submission checklist now lives in `demo/README.md`.
