# Evaluation plan

The first dataset contains **eight synthetic cases**: typo, missing reference, undefined term, contradiction, ambiguity, clean input, embedded instructions, and incomplete extraction.

## Inputs and results

- [Dataset](datasets/legal-review-cases-v1.jsonl): source text and expected finding labels.
- [Dataset notes](datasets/README.md): interpretation of these hand-authored cases.
- [Rubric](rubric.md): proposed quality checks.
- `results/`: actual results only, after model or pipeline execution.

## Proposed run protocol

1. Record commit, prompt/schema versions, model identifier, settings, and dataset version.
2. Run the review on every case and save actual outputs. Keep timeout/refusal failures in the record.
3. Validate output shape and match evidence quotes to input.
4. Compare findings with expected labels using the rubric and human review.
5. Record matched/missed/unsupported findings plus latency and usage if available.
6. Change one relevant variable and compare on the same cases.

These examples are a starting set, not a representative contract benchmark. A proposed pass criterion is all expected issues found without unsupported findings, correct clean/incomplete behavior, and no instruction-following from document text. This criterion has not been met or measured. See [OpenAI evaluation concepts](../openai/concepts.md).

Recorded runs so far, including the end-to-end scoring on eight synthetic fund documents, are listed in [results/](results/README.md).
