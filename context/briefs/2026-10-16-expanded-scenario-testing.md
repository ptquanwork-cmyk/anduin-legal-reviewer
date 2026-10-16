# Brief: expanded scenario testing (16 Oct 2026)

Request (summarised, originally in Vietnamese): test again more thoroughly, with at least 10 files. Where files are missing, generate them to cover the scenarios that can occur (file types, word counts, page counts, layouts and kinds of errors), test them all, and produce a report.

Scope agreed for this task:
- Generate seven new synthetic documents with `scripts/build-demo-contracts.mjs`:
  - a clean control with nothing planted;
  - tables with a landscape section and nested numbering;
  - prompt injection, visible and hidden;
  - a two-column small-type amendment;
  - a bilingual English/Vietnamese letter;
  - an image-only scan;
  - a truncated PDF.
- Write their planted problems and false-alarm traps into `expected.json` before the production run. Traps added after the offline pass are labelled as such.
- Run the offline evaluation and the full production run on all 15 files, and report actual results, including new false alarms and failures.
- Do not change application behaviour in this task; defects found are reported with their evidence.
