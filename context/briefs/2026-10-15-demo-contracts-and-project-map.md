# Brief: demo contracts, full check, project map

Date: 15 October 2026. Public-safe summary of the owner's request.

## Request

1. Double-check the web application: every function should work.
2. Keep the GitHub repository in order — right folders, pushed — with a categorised map that explains the project and the workflow.
3. Create a separate folder of demo contracts of the kind Anduin digitises — fund documents investors fill in — including Word files, PDFs, a mis-arranged PDF and a document as long as practical.

## Resulting decisions

| Topic | Decision |
| --- | --- |
| Demo contracts | `data/demo-contracts/`: a fictional fund's subscription agreement (Word), investor questionnaire (PDF), side letter (Word), scrambled scanned booklet (PDF), 38-page complete booklet (Word and PDF), Vietnamese subscription agreement (Word) and a fillable AcroForm subscription form (PDF), each with planted problems listed in its README; rebuilt by `scripts/build-demo-contracts.mjs` |
| Full check | `scripts/e2e-contracts.mjs` runs every contract through the real pipeline (upload, conversion, review, fields, report) and the digitisation path (approval, answers, draft PDF with QA, confirmed final PDF) |
| Fixes found by the check | Fillable PDF fields detected from AcroForm; rule precision on long documents; Annex/Schedule references; British spellings; review language; worker jobs for work longer than the tunnel's 100-second limit |
| Project map | `docs/architecture/overview.md` (workflow, system, pipeline, folder categories), linked from README, docs index and repository map |
