# Brief: data-driven test report for judges (16 Oct 2026)

Request (summarised): before presenting to the judges, verify how the app improves review speed, accuracy and confidence; run all the tests; and produce a report built only on real numbers from real runs.

Scope agreed for this task:
- Re-run every existing check (unit tests, typecheck, worker tests) and the full end-to-end run of the eight synthetic demo contracts against production.
- Add an offline evaluation of the deterministic layer (extraction, rules, evidence validator) that needs no model or network: recall of planted problems, false alarms, timing per stage, grounding of every quote, rejection of fabricated quotes, and the hand-authored labeled cases.
- Write the report from those results only. No human-baseline timing was measured, so the report states throughput and does not claim a speed-up factor. Confidence scores from the decision agent are not calibrated and are not presented as accuracy.
- Do not change application behaviour in this task; gaps found are reported as limitations.
