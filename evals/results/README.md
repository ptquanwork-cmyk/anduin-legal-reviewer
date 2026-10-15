# Actual evaluation results

## Recorded runs

| Date | Dataset | What ran | Result | Record |
| --- | --- | --- | --- | --- |
| 15 Oct 2026 | Eight synthetic fund documents in `data/demo-contracts/`, with planted problems listed in `expected.json` | `scripts/e2e-contracts.mjs` against the production app. The full pipeline ran: rules, the semantic reviewer (Codex CLI engine) and the evidence validator | 35/36 planted problems found, 0 false alarms; every document reached a confirmed final PDF | [Build log, 15 Oct](../../progress/build-log/2026-10-15.md#follow-up-security-review-speed-and-accuracy) |

These documents were written for this project. The results show that the pipeline finds what was deliberately planted without false alarms. They are not a benchmark of real contracts, and no confidence calibration is claimed.

The hand-authored cases in `datasets/legal-review-cases-v1.jsonl` are covered by the unit tests in `tests/review.test.ts` for the deterministic rules and the validator. A separate model run on that file has not been recorded.

Each new run should link:
- its dataset;
- prompt/schema versions;
- source commit;
- model identifier and settings;
- outputs, failures and human assessment.

Do not store fabricated successful examples as measurements.
