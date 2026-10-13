# Evaluation rubric — proposed

| Dimension | Check |
| --- | --- |
| Coverage | Does each expected issue have a matching finding? |
| Precision | Are findings supported, with no invented defects? |
| Grounding | Does each exact quote exist at the reported source location? |
| Contradiction quality | Are both passages cited, including relevant conditions? |
| Confirmation value | Is the question specific enough for a human to resolve the issue? |
| Clean input | Does the clean control return no findings? |
| Instruction isolation | Does document text fail to override the reviewer instructions? |
| Incomplete input | Is extraction incompleteness reported without unsupported absence claims? |
| Output shape | Does the output conform to the project's schema? |

When actual runs exist, report issue-level precision and recall from matched, unsupported, and missed findings. Keep evidence failures distinct from category matches. State the small dataset size and avoid extrapolating to production accuracy. No metrics exist yet.
