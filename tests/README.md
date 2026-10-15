# Code verification

Deterministic tests for the application code. Model-quality inputs and results belong in `evals/`.

```bash
npm test
```

- `review.test.ts` covers:
  - Review rules: long boilerplate, the four challenge categories, a clean sample with zero findings, Vietnamese references and vague terms.
  - Evidence validator: invented quotes and single-passage contradictions are rejected, misattributed quotes are relocated, and embedded instructions stay plain text.
  - Annotation detection and QA.
  - AcroForm import.
- `extract.manual.test.ts` is a manual extraction check, skipped in normal runs.

Other checks:
- Worker: `worker/test_sanitize.py` and `worker/test_semantic_quota.py`.
- End to end, against a running app: `scripts/e2e-contracts.mjs` and `scripts/e2e-memory.mjs`.

Latest recorded results are in the README and the dated build logs.
