# Production test report: 15 files, 16 runs — 19 October 2026

All numbers are from runs on 19 Oct 2026 against https://anduin-legal-reviewer.vercel.app, with the worker online (Microsoft Word converter, decision agent, semantic reviewer). The full set ran on deployment `dpl_Gfimu9vvtouLDrtxWURwWK6n3Lhk` (commit `36ca236`). The 100-page file was run again on `dpl_4CBNEkhNJvtD4xej1SKHNvTJgzWq` (commit `bb81695`) after the long-document fix described below. Intervals are 95% Wilson score intervals.

**Read this first.** Every file is synthetic and was written for this project, with problems planted on purpose ([`expected.json`](../../data/demo-contracts/expected.json)). The intervals describe uncertainty on this sample only. These are not results on real contracts.

## Headline results

| Measure | Result | 95% interval |
| --- | --- | --- |
| Planted problems found, all 16 runs | **69 / 74 (93%)** | 85–97% |
| Same, on the 14 files of the 16 October scenario set | **54 / 57 (95%)**, unchanged from 16 Oct | 86–98% |
| 100-page agreement (file 15) | **15 / 17**; was 12 / 17 earlier on 19 Oct, before the rule changes in `36ca236` | |
| Rule-detectable problems, production | 66 / 68; both misses are in the two-column file | |
| Problems left to the semantic (AI) reviewer | 3 / 6 | 19–81% |
| Findings quoting the source verbatim, with page and location | **167 / 167** | 98–100% |
| False-alarm traps hit | 4 of 34 | |
| Runs that finished | **16 / 16**; the scan was reported as unread and the corrupted file as blocked | |
| Prompt injection obeyed | No: 4 / 4 planted problems still reported | |
| Confirmed final PDF, files with input fields | 11 / 11; on file 15 QA first caught a clipped answer | |

Offline, on the same code (`npx vitest run --dir evals`): 68 / 68 rule-detectable problems, 2 false-alarm traps hit, 116 / 116 fabricated quotes rejected, 130 / 130 accepted quotes grounded verbatim.

Feature checks on production (`scripts/e2e-revision.mjs`, `scripts/e2e-memory.mjs`, on commit `b48e53b`):
- Revised PDF to v2 to Compare, and Vietnamese answers read back letter for letter from the final PDF: **30 / 30**.
- Decision memory: **10 / 10**.

## Speed

| Document | Upload to finished review |
| --- | --- |
| 38-page booklet (17,146 words), Word and PDF | 133–164 s over four runs |
| 100-page agreement (52,253 words) | 182–236 s over four runs |

Reading the 38-page booklet once takes about 72 minutes at 238 words per minute. No timed human study was run.

## Fixed during this test

- **Long documents were cut at 1,000 rows** (`bb81695`). PostgREST returns at most 1,000 rows per request. The 100-page file has 2,110 blocks and 1,924 annotations, so the workspace, the PDF fill, version transfer and the duplicate lookup saw only the first 1,000: the fill wrote 31 of 160 input fields. Every block and annotation read now pages through `allRows()`. Rerun on production: 160 / 160 fields filled, QA caught a clipped answer in a narrow table cell on page 97, and after the answer was shortened the final PDF was produced.
- **Duplicate field IDs on a new version** (`b48e53b`): two identical lines in a new version made the job fail. See the [build log](../../progress/build-log/2026-10-19.md).

## Misses and false alarms

- **Missed:**
  - The closing-date conflict in the scrambled PDF (04), which is semantic.
  - Two conflicts in the two-column amendment (11), because text is merged across columns.
  - Two semantic conflicts in file 15: management fee 2.0% vs 1.75%, and Delaware vs New York governing law.
- **False alarms:**
  - British or legal spellings in file 15 (wilful, favour, authorised, capitalised).
  - Bare "Section N" references in the two-column file.
  - A semantic ambiguity in the clean control (08).
  - English words flagged by the Vietnamese speller in the bilingual file (12).

Logs: [`2026-10-19-e2e-production-contracts.txt`](2026-10-19-e2e-production-contracts.txt) (earlier run, commit `b48e53b`) and [`2026-10-19-e2e-production-rerun.txt`](2026-10-19-e2e-production-rerun.txt) (this run).
