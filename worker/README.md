---
title: Anduin Legal Reviewer Worker
emoji: 📄
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
license: apache-2.0
---

# Anduin Legal Reviewer worker

Service used by the Anduin Legal Reviewer web application (hackathon build). It runs:

- `POST /convert` — Word (`.docx`) to PDF with LibreOffice, so the app can compare the original with the converted PDF (fonts, text, layout).
- `POST /decide` — typed decisions from [Laya](https://github.com/NandhaKishorM/laya) (Apache-2.0): step routing, finding ordering and annotation type checks. Scores are reported as not calibrated for legal review.
- `GET /health` — converter and decision-agent status.

All endpoints except `/health` require `Authorization: Bearer <WORKER_TOKEN>` when the `WORKER_TOKEN` secret is set. Contract text is treated as data; callers choose a fixed question set and nothing in the text can select a command, model or file.

The CPU Space downloads the `convaiinnovations/laya` English and multilingual checkpoints at start-up; the first request after a cold start waits until `/health` reports `decision_agent: ready`.

Source: `worker/` in [ptquanwork-cmyk/anduin-legal-reviewer](https://github.com/ptquanwork-cmyk/anduin-legal-reviewer).
