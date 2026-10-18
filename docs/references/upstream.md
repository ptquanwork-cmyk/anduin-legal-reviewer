# Upstream reference register

Inspected locally on 2026-10-13.

| Reference | Local base commit | Relationship to this project |
| --- | --- | --- |
| [IAmTomShaw/contract-reader-agent](https://github.com/IAmTomShaw/contract-reader-agent) | `70a3a2c485e0bab32df6dea6b14b56c866c6d671` | Existing separate clone with local changes; possible review-workflow reference |
| [NandhaKishorM/laya](https://github.com/NandhaKishorM/laya) | `68804629e8ccd9d616d48a40e87de9fabbeae069` | Existing separate clone; optional decision/routing research reference |

## Current observations

The local Contract Reader README and `LOCAL_WINDOWS.md` describe PDF text extraction, a sample-suggestion UI, feedback storage, and optional cloud services. Its frontend explicitly labels sample mode; samples do not analyze an uploaded contract. Cloud analysis and hackathon readiness were not retested in this task.

Both checkouts have local uncommitted files. Their original remotes remain intact. Local environments, feedback databases, model files, and checkout contents are not imported into the new public repository.

## Use in the application (15 October 2026)

- **Laya** is used as a library, not copied: `worker/requirements.txt` installs `laya==0.4.7` from PyPI (Apache-2.0); on the owner's machine the worker runs in the existing local Laya environment. The app calls `Router.predict` / `Router.predict_batch` with fixed question sets and reports `answer_confidence` as not calibrated (Laya's own documentation states shipped temperatures must be fitted on task data before gating). No Laya source or model weights are committed here; checkpoints are downloaded from Hugging Face (`convaiinnovations/laya`) at runtime.
- **contract-reader-agent** code is not used. Its idea of learning from accepted/ignored suggestions informed the Feedback page, implemented independently (decision events, reviewer-selected examples).
- **Liberation Sans** fonts (SIL Open Font License, licence in `src/assets/fonts/LICENSE_LIBERATION`) are copied from `pdfjs-dist` for form-fill PDF output (version 1.07: no Vietnamese letters beyond Đ/đ).
- **DejaVu Sans** fonts (Bitstream Vera licence with public-domain DejaVu changes, licence in `src/assets/fonts/LICENSE_DEJAVU`) are copied from matplotlib's bundled fonts for the review report and revised PDFs, including Vietnamese text.

## Reuse policy

The initial hackathon scaffold contains no copied upstream implementation. Before reuse, record the exact source commit and files, review licensing and attribution, describe the modifications, and validate adapted behavior. Keep upstream claims distinct from this project's own evidence.
