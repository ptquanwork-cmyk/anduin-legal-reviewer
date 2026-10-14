import { readFileSync, existsSync } from 'node:fs';
import { expect, it } from 'vitest';
import { extractPdf, inspectDocx } from '../src/review/extract';
import { compareConversion } from '../src/review/source';
import { runRules } from '../src/review/checks';
import { detectFields } from '../src/digitize/fields';

// Runs only when a locally converted demo PDF is supplied (DEMO_PDF=path), e.g. from Word or the worker.
const pdfPath = process.env.DEMO_PDF;
it.skipIf(!pdfPath || !existsSync(pdfPath))('extracts the demo PDF into anchored blocks', async () => {
  const pdf = await extractPdf(new Uint8Array(readFileSync(pdfPath!)));
  const docx = await inspectDocx(new Uint8Array(readFileSync('public/demo/demo-agreement-v1.docx')));
  console.log(JSON.stringify({ fonts: pdf.fonts, pages: pdf.pages, declared: docx.declared }, null, 1));
  for (const b of pdf.blocks) console.log(b.idx, b.page, b.kind, b.section_ref, JSON.stringify(b.bbox), b.fonts.join(','), '|', b.text.slice(0, 90));
  const cmp = compareConversion(docx, pdf);
  console.log(JSON.stringify(cmp.issues, null, 1), JSON.stringify(cmp.text_diff));
  const rules = runRules(pdf.blocks, 'en', null);
  console.log(rules.findings.map((f) => `${f.category}: ${f.title}`));
  console.log(detectFields(pdf.blocks).filter((d) => d.type !== 'paragraph').map((d) => `${d.type} ${d.field_id} ${JSON.stringify(d.bbox)} ${d.options.map((o) => o.label)}`));
  expect(pdf.blocks.length).toBeGreaterThan(10);
});
