// Builds the synthetic demo agreement (v1 with defects, v2 revised) as DOCX files in public/demo/.
// Synthetic content only. Section 2 deliberately uses a font that common converters do not have (Helvetica Neue
// is absent from Windows/Word and from the Linux container), so source quality exposes a real font substitution.
import { writeFile, mkdir } from 'node:fs/promises';
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak } from 'docx';

const BODY = 'Liberation Serif';
const run = (text, opts = {}) => new TextRun({ text, font: opts.font ?? BODY, size: opts.size ?? 22, bold: opts.bold });
const p = (text, opts = {}) =>
  new Paragraph({ children: [run(text, opts)], spacing: { after: opts.after ?? 160, before: opts.before ?? 0 }, alignment: opts.align });
const heading = (text) => p(text, { bold: true, size: 26, before: 200, after: 100 });

function agreement(version) {
  const v2 = version === 2;
  return new Document({
    creator: 'Anduin Legal Reviewer synthetic demo',
    title: 'Demo agreement',
    sections: [
      {
        children: [
          p('SERVICES AGREEMENT', { bold: true, size: 36, align: AlignmentType.CENTER, after: 60 }),
          p('FICTIONAL SAMPLE', { size: 26, align: AlignmentType.CENTER, after: 320 }),
          heading('1. Parties'),
          p(
            'This Services Agreement (the "Agreement") is entered into as of January 10, 2024 (the "Effective Date"), by and between the Client and the Service Provider (each a "Party" and together the "Parties").',
          ),
          heading('Client information'),
          p('Client legal name: ________________________________'),
          p('Entity type:   ○ Individual     ○ Company'),
          p('Notifications:   ☐ Email     ☐ Post'),
          p('Agreement date: ____________________'),
          heading('2. Payment'),
          new Paragraph({
            children: [run('The Client shall pay each invoice within 30 calendar days of receipt.', { font: 'Helvetica Neue' })],
            spacing: { after: 160 },
          }),
          heading('3. Payment deadline'),
          p('The Client shall pay each invoice within 60 calendar days of receipt.'),
          heading('4. Delivery'),
          p('The Service Provider shall deliver the monthly report soon after the end of each month.'),
          p(v2 ? 'The Client shall receive the report by email.' : 'The Client shall recieve the report by email.'),
          new Paragraph({ children: [new PageBreak()] }),
          heading('5. Liability'),
          p("The Service Provider's total liability is limited as set out in Section 9."),
          heading('6. Term'),
          p('This Agreement shall commence on the Effective Date and continue for twelve (12) months unless terminated earlier by either Party with thirty (30) days written notice.'),
          p('END OF SYNTHETIC DOCUMENT', { size: 18, before: 400, align: AlignmentType.CENTER }),
        ],
      },
    ],
  });
}

await mkdir('public/demo', { recursive: true });
for (const v of [1, 2]) {
  const buf = await Packer.toBuffer(agreement(v));
  await writeFile(`public/demo/demo-agreement-v${v}.docx`, buf);
  console.log(`public/demo/demo-agreement-v${v}.docx ${buf.length} bytes`);
}
