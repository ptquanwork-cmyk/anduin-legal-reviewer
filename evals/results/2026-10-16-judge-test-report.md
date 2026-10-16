# Test report for judges — 16 October 2026

How the reviewer affects **speed**, **accuracy** and **confidence**, measured on real runs. Every number below comes from a run made on 16 Oct 2026 (source commit `e97319a`, production deployment at https://anduin-legal-reviewer.vercel.app), unless a line says otherwise. Raw outputs are next to this file.

**Superseded in scope by the [15-file scenario test report](2026-10-16-scenario-test-report.md)** (same day), which adds seven new scenarios and the defects they exposed.

**Read this first.** The eight test documents are synthetic fund subscription documents written for this project, with problems planted on purpose (`data/demo-contracts/expected.json`). The results show the pipeline finds what was planted, without false alarms. They are not a benchmark of real contracts, and they do not predict accuracy on contracts the system has not seen.

## Headline results

| Measure | Result | Source |
| --- | --- | --- |
| Planted problems found, full pipeline, production | **35 / 36 (97%)** | Live end-to-end runs |
| False alarms (11 traps: British spellings, external references, defined place names, worked examples) | **0 / 11 triggered** | Same runs |
| Findings whose quotes were found verbatim in the source | **80 / 80 (100%)** | Production database |
| Candidates removed by the evidence gate before display | **35**: 34 duplicates of findings already reported, 1 contradiction citing only one passage; no AI quote failed to match the source | Production job records |
| Fabricated quotes injected into the evidence gate | **57 / 57 rejected** | Offline evaluation |
| Planted problems the deterministic rules alone catch (no AI, no network) | **34 / 34 (100%)**, 0 false alarms | Offline evaluation |
| Hand-authored labeled cases (typo, reference, term, contradiction, vague wording, clean, prompt injection, incomplete) | **7 / 8** | Offline evaluation |
| Documents reaching a confirmed, QA-passed final PDF | **8 / 8** | Live end-to-end runs |
| 38-page, 17,146-word booklet, upload to finished review on the server | **176 s (PDF), 253 s (Word)** | Production job records |
| Same 38-page booklet, deterministic checks only | **72 ms** for all rules (1.3 s including PDF text extraction) | Offline evaluation |
| Unit and worker tests | **15 passed, 1 skipped (manual)**; typecheck clean; worker sanitize and quota tests pass | `npm test`, `tsc`, `python worker/test_*.py` |

The 15 Oct 2026 production run recorded the same accuracy (35/36, 0 false alarms; [build log](../../progress/build-log/2026-10-15.md#follow-up-security-review-speed-and-accuracy)), so the result held on two separate days.

## 1. Accuracy

### Full pipeline on production

`scripts/e2e-contracts.mjs` uploads each document to the live app, waits for processing, then scores the stored findings against `expected.json`. It also exports the report and confirms every field. Then it fills the form, runs PDF QA and requests the final PDF.

| Document | Pages / words | Planted found | False-alarm traps hit | Findings (rules + AI) | Candidates removed | Final PDF |
| --- | --- | --- | --- | --- | --- | --- |
| 01 Subscription agreement (Word) | 3 / 525 | 6/6 | 0/1 | 7 (6 + 1) | 5 | QA passed, 13 fields |
| 02 Investor questionnaire (PDF) | 3 / 432 | 4/4 | 0/1 | 7 (6 + 1) | 4 | QA passed, 15 fields |
| 03 Side letter (Word) | 1 / 230 | 1/1 | 0/2 | 7 (2 + 5) | 3 | QA passed, 3 fields |
| 04 Scrambled booklet (PDF, pages out of order, one image-only page, one rotated page) | 6 / 325 | 1/2 | 0/1 | 6 (2 + 4) | 5 | QA passed, 6 fields |
| 05 Long booklet (Word) | 38 / 16,766 | 8/8 | 0/3 | 20 (12 + 8) | 4 | QA passed, 66 fields |
| 05 Long booklet (PDF) | 38 / 17,146 | 8/8 | 0/3 | 19 (12 + 7) | 5 | QA passed, 66 fields |
| 06 Vietnamese agreement (Word) | 2 / 408 | 4/4 | 0/0 | 7 (4 + 3) | 4 | QA passed, 9 fields |
| 07 Fillable form (PDF with form fields) | 2 / 182 | 3/3 | 0/0 | 7 (4 + 3) | 5 | QA passed, 13 fields |
| **Total** | | **35/36** | **0/11** | **80 (48 + 32)** | **35** | **8/8** |

The one miss is in 04: two closing dates (30 June and 31 July 2025) inside a single paragraph. That item is marked as one only the AI reviewer is expected to catch, and it did not catch it in this run. It also missed it on 15 Oct.

Coverage was reported correctly: 04 shows "5/6 pages read, unread 3" because page 3 is an image with no text layer. The app flags it as a blocking source issue instead of reviewing a page it cannot read.

"Findings" can exceed "planted" because the AI reviewer also raises genuine extra questions, such as other vague phrases. These are not counted as false alarms unless they match a trap. Every finding still needs the reviewer's Confirm / Dismiss decision.

### Deterministic layer alone (no AI, no network)

`evals/rules-offline.test.ts` runs PDF/Word extraction, the rule checks and the evidence validator in-process, five times per file. Results: [`rules-offline-latest.json`](rules-offline-latest.json).

- **34 / 34** planted problems that the rules are designed to catch were found, with **0** false alarms. The two items marked "semantic only" (03 and 04) are excluded, since only the AI reviewer is meant to find them.
- In other words, the rules alone already guarantee most of the recall, and the AI layer adds judgement on wording and cross-clause meaning. If the AI worker is offline, the deterministic checks still run, as production showed: "Decision agent offline; all checks run" still gave 6/6, 8/8 and 3/3.

### Labeled cases

8 hand-authored cases (`evals/datasets/legal-review-cases-v1.jsonl`), scored on exact category match:

| Case | Expected | Got | Pass |
| --- | --- | --- | --- |
| typo-001 | typo | typo | ✓ |
| reference-001 | missing reference | missing reference | ✓ |
| term-001 | undefined term | undefined term | ✓ |
| contradiction-001 | contradiction | contradiction | ✓ |
| ambiguity-001 | ambiguity | ambiguity | ✓ |
| clean-001 | nothing | nothing | ✓ |
| injection-001 (document text tells the reviewer to ignore its instructions) | missing reference | missing reference | ✓ |
| incomplete-001 (only page 1 of 4 extracted) | nothing | missing reference | ✗ |

The failure is real. When pages are unread, the app marks the source as blocked ("Page N has no extractable text"), but the missing-reference rule still reports a section that may sit on an unread page. This is recorded as a limitation below. Application behaviour was not changed in this task.

## 2. Confidence: why a reviewer can trust a finding

The app does **not** show an invented "95% confident" score. Confidence comes from evidence that can be checked:

1. **Every finding quotes the source verbatim, with its page and location.** In production, 80 of 80 stored findings had all their quotes matched to the extracted text. Offline, all 67 accepted quotes were found verbatim in a source block.
2. **Unsupported or repeated claims are filtered out before the reviewer sees them.** In production the evidence gate removed 35 candidates: 34 repeated a finding already reported (usually the AI reviewer restating a rule finding), and 1 was a "contradiction" that cited only one passage. Every quote the AI reviewer gave in these runs matched the source.
3. **Tested against fabrication.** Each of the 49 real findings was copied with an altered quote, and each of the 8 contradictions was also copied with only one passage. All **57 / 57** fabricated variants were rejected.
4. **Every finding records its origin** (rule id, or AI reviewer), so a judge or reviewer can see which layer produced it.
5. **A human decides.** Each finding is Confirmed, Dismissed with a reason, or sent for clarification, and decisions are kept as an append-only history.

The decision agent's typed scores (routing, field-type checks) are shown in the UI as "not calibrated" and are used only for ordering. They are not presented as accuracy.

## 3. Speed

### Measured

| Stage | Short documents (1–6 pages) | 38-page booklet |
| --- | --- | --- |
| Text extraction (offline median of 5 runs) | 22–225 ms | 1.27 s (PDF), 0.21 s (Word) |
| All rule checks (offline median) | 1–22 ms | 72–78 ms |
| Evidence validation (offline median) | < 1 ms | 1.5–1.7 ms |
| Full server pipeline on production: upload → conversion → rules + AI review → field detection | 98–221 s | 176 s (PDF), 253 s (Word) |
| Script wall time per document, including report export, two fill/QA rounds and the final PDF | 136–259 s | 233 s (PDF), 317 s (Word) |

Repeating 06 and 07 in run 2 took 309 s and 267 s of wall time, against 212 s and 170 s in run 1, with the same accuracy (4/4 and 3/3). End-to-end time therefore varies by up to about 1.6× with worker load.

The offline timings were taken on the owner's laptop while the production test was also running on it, so they are conservative.

Most of the server time is the AI layer (the semantic reviewer and the decision agent) and Word-to-PDF conversion. All of these run on the owner's laptop behind a tunnel, not on dedicated hardware. Decision-agent routing alone took 12–91 s per document in this session.

### What this means for a reviewer (not measured)

No timed human review was run, so this report **does not claim a measured speed-up factor**. For scale only: the 38-page booklet has 17,146 words, and at an average adult silent reading rate of about 238 words per minute (Brysbaert, 2019, meta-analysis of reading-rate studies), reading it once takes about 72 minutes. The app returned a grounded list of 19–20 findings for that booklet in 3–4.5 minutes. Every finding links to its source passage, so the reviewer can check it instead of searching for it.

## 4. Reliability: what went wrong in these runs

Run 1 processed all eight documents; run 2 retried the two that did not finish and repeated 06 and 07 as a second timing sample. **6 of 8 documents passed on the first attempt; all 8 passed after one retry.**

| Event | What happened | Status |
| --- | --- | --- |
| 01, first attempt | The worker answered "401 unauthorized" to the conversion request made with a brand-new anonymous session. The same document passed on retry, and other documents in the same workspace passed. A similar first-request refusal was recorded on 15 Oct. | Intermittent, not yet fixed |
| 05 Word, first attempt | Another visitor was using the shared laptop worker at the same time. Decision-agent routing took 89 s, and the review then had not finished when the 300 s server function limit (Hobby plan) ended the work. The job stayed "running" with no error. On retry, routing timed out into its fallback and the whole review finished in 253 s, 8/8. | Known limit: long Word documents under load can exceed 300 s, and a cut-off job is not marked failed |

## 5. Limitations

- **Synthetic data only.** Eight documents and eight labeled cases, written by the project. No real contracts, no independent annotators, no confidence intervals. The results show correctness on the planted problems, not general accuracy.
- **Incomplete documents.** The missing-reference rule does not yet suppress references that may point to unread pages (labeled case incomplete-001).
- **Server time limit.** The whole pipeline runs inside one 300 s function. A 38-page Word document with a slow worker can exceed it, and the job is then left "running" instead of being marked failed.
- **Worker on a laptop.** Conversion, the decision agent and the AI reviewer depend on the owner's machine and tunnel. Timings vary with its load, and other visitors share it.
- **No OCR.** Image-only pages are reported as unread, not reviewed.
- **No human baseline.** Speed is reported as measured throughput, without a speed-up factor.

## How to reproduce

```bash
npm test
npx tsc --noEmit
npx vitest run --dir evals
node scripts/e2e-contracts.mjs https://anduin-legal-reviewer.vercel.app
```

The last command needs the project's `.env.supabase.local` (public URL and publishable key) and the worker online.

## Raw records

- [`rules-offline-latest.json`](rules-offline-latest.json): offline evaluation output.
- [`2026-10-16-e2e-production-run1.txt`](2026-10-16-e2e-production-run1.txt) and [`2026-10-16-e2e-production-run2.txt`](2026-10-16-e2e-production-run2.txt): full script output of both production runs.
