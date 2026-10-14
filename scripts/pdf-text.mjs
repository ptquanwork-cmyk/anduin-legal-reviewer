// Dev helper: prints the text of a PDF (local path or URL) page by page, for checking generated reports/exports.
// Usage: node scripts/pdf-text.mjs <file-or-url>
import { readFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const src = process.argv[2];
const data = src.startsWith('http') ? new Uint8Array(await (await fetch(src)).arrayBuffer()) : new Uint8Array(readFileSync(src));
const doc = await getDocument({ data, verbosity: 0 }).promise;
for (let n = 1; n <= doc.numPages; n++) {
  const page = await doc.getPage(n);
  const tc = await page.getTextContent();
  console.log(`--- page ${n}`);
  console.log(tc.items.map((i) => i.str + (i.hasEOL ? '\n' : '')).join(''));
}
