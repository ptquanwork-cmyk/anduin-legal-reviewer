# Demo contracts: fund subscription documents

Synthetic documents for trying the whole workflow (intake → source quality → map → review → report → annotation → form → responses → PDF QA). They imitate what a private fund sends to investors to fill in before a closing — the kind of documents Anduin digitises — but **everything is fictional**: *Harborline Ventures Fund IV, L.P.*, its general partner and all terms are invented, nothing is an offer of securities, and nothing is legal advice.

Regenerate them with `node scripts/build-demo-contracts.mjs` (Windows: the PDFs are produced by Microsoft Word, and the scanned page by headless Edge). Run them all through a running app with `node scripts/e2e-contracts.mjs [baseUrl]`; actual results are recorded in the dated build log.

| File | Format | What it is | What it exercises |
| --- | --- | --- | --- |
| `01-subscription-agreement.docx` | Word, 2 pages | Limited partner subscription agreement with an investor information and signature page | Word → PDF conversion, all rule checks, text, radio and checkbox fields |
| `02-investor-questionnaire.pdf` | PDF (text), 3 pages | Investor questionnaire: identity, accredited investor and qualified purchaser status, tax, wire instructions (table), ERISA | Native PDF intake, table extraction, many choice fields, annex references |
| `03-side-letter.docx` | Word, 1–2 pages | Side letter with fee discount, reporting and MFN terms | Near-clean result: few findings is the correct outcome |
| `04-subscription-booklet-scrambled.pdf` | PDF, 6 pages, **mis-arranged** | Summary booklet as a careless scan: pages out of order (printed footers say 3, 1, 6, 2, 4, 5), the signature page is an image with no text layer, the risk-factor page is two-column and rotated 90° | Extraction coverage (one unread page, reported, no OCR), page-order and layout robustness, rotated geometry |
| `05-subscription-booklet-long.docx` / `.pdf` | Word and PDF, ~38 pages | Complete subscription booklet: 32-section subscription agreement, investor questionnaire Parts A–L, AML certification, privacy notice, power of attorney, signature pages, schedules | Long documents: semantic review covers the first chunks only (recorded as a limitation), many fields, duplicate detection between the two formats |
| `06-thoa-thuan-dang-ky-gop-von.docx` | Word (Vietnamese) | Vietnamese subscription agreement (Điều 1–8) with investor information | Vietnamese headings, rules and decision-agent checkpoint |
| `07-subscription-form-fillable.pdf` | PDF with **AcroForm fields**, 2 pages | Fillable investor subscription form (text fields, radio groups, checkboxes) | Real form fields become annotations with exact geometry; filling flattens the form first |

## Problems placed on purpose

| File | Contradiction | Missing reference | Spelling | Vague wording | Undefined term |
| --- | --- | --- | --- | --- | --- |
| 01 | Capital calls due in 10 vs 15 Business Days (§3 vs §7) | Section 14 | recieve, comittment | promptly, reasonable efforts | Management Fee Offset |
| 02 | Distributions paid within 30 vs 45 days (Part E) | Annex C | beneficary | as soon as practicable | — |
| 03 | — | — | — | reasonable access | — |
| 04 | Closing date 30 June vs 31 July 2025 in one paragraph (not an obligation: left to the semantic reviewer) | none — "Section 9 of the Partnership Agreement" points to another document and must not be flagged | — | promptly | — |
| 05 | Capital calls 10 vs 12 Business Days; transfer notice 30 vs 60 days | Section 52, Schedule F | recieve | soon, promptly (one finding per phrase, not per section) | Carried Interest Clawback |
| 06 | Góp vốn trong 10 vs 15 ngày làm việc (Điều 3 vs Điều 6) | Điều 12 | — | sớm, hợp lý | — |
| 07 | Capital calls 10 vs 20 Business Days (page 1 vs page 2) | — | recieve | reasonable | — |

British spellings (authorised, favourable, enquiry) are correct and must not be flagged. These are expectations, not guarantees: the deterministic rules catch most of them, the semantic reviewer may add or miss items, and every finding still needs a human decision. No real contract or personal data is included; the placeholder fields are blank.
