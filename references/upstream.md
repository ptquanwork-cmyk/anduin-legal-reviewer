# Upstream reference register

Inspected locally on 2026-10-13.

| Reference | Local base commit | Relationship to this project |
| --- | --- | --- |
| [IAmTomShaw/contract-reader-agent](https://github.com/IAmTomShaw/contract-reader-agent) | `70a3a2c485e0bab32df6dea6b14b56c866c6d671` | Existing separate clone with local changes; possible review-workflow reference |
| [NandhaKishorM/laya](https://github.com/NandhaKishorM/laya) | `68804629e8ccd9d616d48a40e87de9fabbeae069` | Existing separate clone; optional decision/routing research reference |

## Current observations

The local Contract Reader README and `LOCAL_WINDOWS.md` describe PDF text extraction, a sample-suggestion UI, feedback storage, and optional cloud services. Its frontend explicitly labels sample mode; samples do not analyze an uploaded contract. Cloud analysis and hackathon readiness were not retested in this task.

Both checkouts have local uncommitted files. Their original remotes remain intact. Local environments, feedback databases, model files, and checkout contents are not imported into the new public repository.

## Reuse policy

The initial hackathon scaffold contains no copied upstream implementation. Before reuse, record the exact source commit and files, review licensing and attribution, describe the modifications, and validate adapted behavior. Keep upstream claims distinct from this project's own evidence.
