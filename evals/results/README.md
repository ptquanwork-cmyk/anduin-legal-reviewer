# Actual evaluation results

## Recorded runs

| Date | Dataset | What ran | Result | Record |
| --- | --- | --- | --- | --- |
| 16 Oct 2026 | Same eight documents, plus the eight labeled cases | Production end-to-end runs (two passes) and the new offline evaluation of the deterministic layer | 35/36 planted found, 0/11 false-alarm traps, 80/80 findings grounded, 35 candidates removed before display (34 duplicates, 1 one-sided contradiction); offline 34/34, 57/57 fabricated quotes rejected, 7/8 labeled cases | [Judge test report](2026-10-16-judge-test-report.md) |
| 15 Oct 2026 | Eight synthetic fund documents in `data/demo-contracts/`, with planted problems listed in `expected.json` | `scripts/e2e-contracts.mjs` against the production app. The full pipeline ran: rules, the semantic reviewer (Codex CLI engine) and the evidence validator | 35/36 planted problems found, 0 false alarms; every document reached a confirmed final PDF | [Build log, 15 Oct](../../progress/build-log/2026-10-15.md#follow-up-security-review-speed-and-accuracy) |

These documents were written for this project. The results show that the pipeline finds what was deliberately planted without false alarms. They are not a benchmark of real contracts, and no confidence calibration is claimed.

The hand-authored cases in `datasets/legal-review-cases-v1.jsonl` are scored against the deterministic rules and validator by `evals/rules-offline.test.ts` (16 Oct: 7/8). A separate model run on that file has not been recorded.

Each new run should link:
- its dataset;
- prompt/schema versions;
- source commit;
- model identifier and settings;
- outputs, failures and human assessment.

Do not store fabricated successful examples as measurements.
