# Concepts applied to this project

Reviewed: 2026-10-13. Project choices below are proposed.

## Context and instructions

OpenAI's [prompt engineering guide](https://developers.openai.com/api/docs/guides/prompt-engineering) describes instruction design and recommends evaluating behavior as prompts or model versions change. This project separates context files from reusable prompt instructions and will record versions in each run.

Our design choice: provide contract text as untrusted input and keep reviewer instructions separate. Ask for exact evidence and concise explanations. Input boundaries still need adversarial testing.

## Structured outputs and correctness

[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) supports schema-constrained responses, but outputs can still contain mistakes. Our draft schema standardizes findings; future validation will independently match quotes and locations to extracted text. Schema validity is not evidence that a finding is true.

## Evaluation and iteration

OpenAI's [evaluation guidance](https://developers.openai.com/api/docs/guides/evals) describes defining a task, testing inputs, and analyzing outputs. Our local dataset and rubric will compare issue detection, grounding, false positives, and instruction isolation. No evaluation run has occurred.

The repository does not depend on the hosted Evals API. Recheck service availability before adding a hosted evaluation dependency.

## Project-specific limits

Long documents require preserving definitions, references, exceptions, and location metadata across segments. A missing passage can change an apparent finding. Extraction failures need explicit handling. Reviewer feedback is application data; it does not imply model training or automatic improvement. These are design constraints to test during implementation.
