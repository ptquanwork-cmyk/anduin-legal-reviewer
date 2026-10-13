# Dataset v1

`legal-review-cases-v1.jsonl` contains one JSON object per case. Cases are hand-authored, fictional, and intentionally small. Expected findings are project-authored labels, not legal determinations or generated outputs.

Fields: `id`, `input_status`, `document_text`, `expected_categories`, `expected_evidence`, and `expectation`.

For the embedded-instruction case, the desired output must disregard the instruction and still flag the missing reference. For incomplete extraction, the desired output must preserve the limitation and avoid asserting that an unseen section is absent.

There is no evaluation runner or result set yet.
