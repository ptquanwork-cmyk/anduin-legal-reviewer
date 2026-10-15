// Builds the synthetic fund-subscription contract set in data/demo-contracts/ (see its README for the expected findings).
// Everything here is fictional: Harborline Ventures Fund IV, L.P. and its managers do not exist, nothing is an offer.
// Word files are written with the `docx` library; PDFs are produced by Microsoft Word (Windows, via PowerShell COM),
// the scanned page is a headless Edge screenshot, and the scrambled and fillable PDFs are assembled with pdf-lib.
// Usage: node scripts/build-demo-contracts.mjs
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  AlignmentType, Document, Footer, Packer, PageBreak, PageNumber, Paragraph, SectionType, Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';

const OUT = path.resolve('data/demo-contracts');
const TMP = path.join(os.tmpdir(), 'anduin-demo-contracts');
const FONT = 'Times New Roman';
const FUND = 'Harborline Ventures Fund IV, L.P.';
const GP = 'Harborline GP IV, LLC';
const NOTICE = 'Synthetic demonstration document: a fictional fund and fictional terms, not an offer of securities and not legal advice.';

// ---------- docx helpers ----------
const run = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size ?? 22, bold: o.bold, italics: o.italic });
const p = (text, o = {}) => new Paragraph({ children: [run(text, o)], spacing: { after: o.after ?? 140, before: o.before ?? 0 }, alignment: o.align, keepNext: o.keepNext });
const h = (text) => p(text, { bold: true, size: 24, before: 220, after: 100, keepNext: true });
const title = (text, size = 32) => p(text, { bold: true, size, align: AlignmentType.CENTER, after: 80 });
const centre = (text, o = {}) => p(text, { ...o, align: AlignmentType.CENTER });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const footer = (label) =>
  new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ font: FONT, size: 16, children: [`${label} · Page `, PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES] })] })] });
const cell = (text, bold) => new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [p(text, { bold, after: 40 })] });
const table = (rows) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rows.map(([a, b], i) => new TableRow({ children: [cell(a, i === 0), cell(b, i === 0)] })) });
const doc = (sections, label) => new Document({ creator: 'Anduin Legal Reviewer synthetic demo', title: label, sections: sections.map((s) => ({ ...s, footers: { default: footer(label) } })) });

async function saveDocx(document, name) {
  const buf = await Packer.toBuffer(document);
  await writeFile(path.join(OUT, name), buf);
  return path.join(OUT, name);
}

// Word converts exactly as the worker does for uploads (read-only, macros off, no link or field updates).
function wordToPdf(src, out) {
  const script =
    "$ErrorActionPreference='Stop';$w=New-Object -ComObject Word.Application;$w.Visible=$false;$w.DisplayAlerts=0;$w.AutomationSecurity=3;" +
    "try{$d=$w.Documents.Open($env:SRC,$false,$true);$d.SaveAs2($env:OUT,17);$d.Close(0)}finally{$w.Quit()}";
  execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env, SRC: src, OUT: out }, stdio: 'inherit', timeout: 300000 });
}

function edgeScreenshot(html, png) {
  const edge = [path.join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft/Edge/Application/msedge.exe'), path.join(process.env.ProgramFiles ?? '', 'Microsoft/Edge/Application/msedge.exe')].find(existsSync);
  if (!edge) throw new Error('Microsoft Edge is needed to render the scanned page.');
  execFileSync(edge, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${path.join(TMP, 'edge')}`, '--window-size=1240,1754', `--screenshot=${png}`, `file:///${html.replace(/\\/g, '/')}`], { stdio: 'ignore', timeout: 120000 });
}

const field = (label, width = 34) => p(`${label}: ${'_'.repeat(width)}`);
const choice = (label, options, mark = '○') => p(`${label}:   ${options.map((o) => `${mark} ${o}`).join('     ')}`);

// ---------- 01 Subscription agreement (Word) ----------
function subscriptionAgreement() {
  const body = [
    title(FUND.toUpperCase(), 30),
    title('SUBSCRIPTION AGREEMENT', 34),
    centre(NOTICE, { size: 18, italic: true, after: 320 }),
    h('1. Subscription'),
    p(`The undersigned investor (the "Investor") hereby subscribes for a limited partnership interest in ${FUND} (the "Partnership") in the amount of the Commitment set out in the Investor Information below, on the terms of this Subscription Agreement and the Partnership Agreement.`),
    h('2. Definitions'),
    p('"Business Day" means a day other than a Saturday, Sunday or a day on which banks in New York are authorised to close.'),
    p('"Capital Call Notice" means a written notice from the General Partner requesting a capital contribution.'),
    p(`"Commitment" means the total amount the Investor agrees to contribute to the Partnership. "General Partner" means ${GP}. "Partnership Agreement" means the amended and restated limited partnership agreement of the Partnership.`),
    h('3. Capital Contributions'),
    p('The Investor shall fund each capital call within 10 Business Days after receipt of a Capital Call Notice.'),
    p('Capital contributions shall be paid in U.S. dollars by wire transfer to the account specified in the Capital Call Notice.'),
    h('4. Acceptance of Subscription'),
    p('The General Partner may accept or reject this subscription in whole or in part. This Subscription Agreement becomes binding on the Investor only when the General Partner countersigns it.'),
    h('5. Investor Representations'),
    p('The Investor represents that it is an accredited investor and has reviewed the offering memorandum. The Investor shall promptly notify the General Partner of any change that makes these representations untrue and shall use reasonable efforts to provide any information the General Partner requests.'),
    h('6. Management Fee'),
    p('The management fee is calculated on the Commitment during the investment period and on invested capital afterwards, net of the Management Fee Offset, as described in Section 14.'),
    h('7. Defaulting Investors'),
    p('The Investor shall fund each capital call within 15 Business Days after receipt of a Capital Call Notice.'),
    p('If the Investor fails to fund a capital call when due, the General Partner may apply the default remedies set out in the Partnership Agreement.'),
    h('8. Transfers'),
    p('The Investor may not transfer its interest without the prior written consent of the General Partner.'),
    h('9. Confidentiality'),
    p('The Investor shall keep confidential all information it may recieve about the Partnership and its portfolio companies.'),
    h('10. Notices'),
    p('Notices to the Investor will be sent to the address or email address given in the Investor Information.'),
    h('11. Governing Law'),
    p('This Subscription Agreement is governed by the laws of the State of Delaware.'),
    h('12. Miscellaneous'),
    p('This Subscription Agreement may be executed in counterparts. The Investor\'s comittment is irrevocable once accepted.'),
    pageBreak(),
    h('Investor Information'),
    field('Investor legal name'),
    choice('Investor type', ['Individual', 'Corporation', 'Partnership', 'Trust']),
    field('Commitment amount (USD)', 20),
    field('Tax identification number', 24),
    field('Jurisdiction of residence or organization', 22),
    choice('Accredited investor status', ['Net worth over USD 1,000,000', 'Income over USD 200,000', 'Entity assets over USD 5,000,000'], '☐'),
    choice('Qualified purchaser', ['Yes', 'No']),
    choice('Send notices by', ['Email', 'Courier'], '☐'),
    field('Email address'),
    h('Signature Page'),
    field('Signature'),
    field('Name of signatory'),
    field('Title (if signing for an entity)', 26),
    field('Date', 18),
    p('Accepted by the General Partner on behalf of the Partnership.', { before: 200 }),
  ];
  return doc([{ children: body }], 'Harborline IV Subscription Agreement');
}

// ---------- 02 Investor questionnaire (PDF from Word) ----------
function investorQuestionnaire() {
  const body = [
    title(FUND.toUpperCase(), 28),
    title('INVESTOR QUESTIONNAIRE', 34),
    centre(NOTICE, { size: 18, italic: true, after: 300 }),
    p('Please complete every part of this questionnaire. Parts marked as required must be completed before the General Partner can accept your subscription. Capitalised terms have the meanings given in the Subscription Agreement.'),
    h('1. Part A Investor Details'),
    field('Full legal name of investor'),
    field('Residential or registered address'),
    field('Telephone', 22),
    field('Email address'),
    choice('Investor type', ['Natural person', 'Corporation', 'Trust', 'Pension plan', 'Other entity']),
    h('2. Part B Accredited Investor Status'),
    p('Tick every statement that applies to the investor.'),
    choice('Natural persons', ['Net worth over USD 1,000,000', 'Income over USD 200,000 in each of the last two years'], '☐'),
    choice('Entities', ['Total assets over USD 5,000,000', 'All equity owners are accredited investors'], '☐'),
    h('3. Part C Qualified Purchaser Status'),
    choice('Is the investor a qualified purchaser', ['Yes', 'No']),
    h('4. Part D Tax Status'),
    choice('U.S. person for tax purposes', ['Yes', 'No']),
    field('Taxpayer identification number', 24),
    p('Non-U.S. investors must also complete the tax form referred to in Annex C.'),
    h('5. Part E Distribution Account'),
    p('Distributions will be paid to the account below within 30 days after each distribution date.'),
    table([
      ['Wire instruction', 'Investor answer'],
      ['Bank name', '______________________'],
      ['Account name', '______________________'],
      ['Account number or IBAN', '______________________'],
      ['SWIFT or ABA code', '______________________'],
    ]),
    p('Distributions will be paid to the account below within 45 days after each distribution date.', { before: 140 }),
    p('The account must be in the name of the investor; the General Partner will not pay a third-party beneficary.'),
    h('6. Part F ERISA Status'),
    choice('Is the investor a benefit plan investor', ['Yes', 'No']),
    p('The investor shall notify the General Partner as soon as practicable if its ERISA status changes.'),
    h('7. Certification'),
    p('The investor certifies that the answers in this questionnaire are true and complete.'),
    field('Signature'),
    field('Name', 30),
    field('Date', 18),
    pageBreak(),
    h('Annex A Definitions of Accredited Investor'),
    p('An accredited investor includes, among others, a natural person whose individual net worth, or joint net worth with a spouse, exceeds USD 1,000,000 excluding the primary residence, and an entity with total assets exceeding USD 5,000,000 that was not formed to acquire the interests.'),
    h('Annex B Definitions of Qualified Purchaser'),
    p('A qualified purchaser includes a natural person who owns not less than USD 5,000,000 in investments and a company that owns and invests on a discretionary basis not less than USD 25,000,000 in investments.'),
  ];
  return doc([{ children: body }], 'Harborline IV Investor Questionnaire');
}

// ---------- 03 Side letter (Word, near-clean) ----------
function sideLetter() {
  const body = [
    title('SIDE LETTER', 32),
    centre(FUND, { bold: true }),
    centre(NOTICE, { size: 18, italic: true, after: 300 }),
    p('Dated: ____________________'),
    p(`To: ${GP}, as general partner of the Partnership`),
    p('From: Example Pension Trust (the "Investor")'),
    h('1. Purpose'),
    p('This letter records additional terms agreed between the General Partner and the Investor in connection with the Investor\'s subscription for an interest in the Partnership.'),
    h('2. Management Fee Discount'),
    p('The management fee payable by the Investor shall be reduced by 0.25 percent per year for as long as the Investor\'s Commitment is at least USD 50,000,000.'),
    h('3. Reporting'),
    p('The General Partner shall deliver quarterly reports to the Investor within 45 days after the end of each quarter and audited annual financial statements within 120 days after the end of each year.'),
    h('4. Information Access'),
    p('The Investor may have reasonable access to the books and records of the Partnership on written request.'),
    h('5. Most Favoured Nation'),
    p('If the General Partner grants another investor with a smaller Commitment more favourable economic terms, the General Partner shall offer the same terms to the Investor.'),
    h('6. Precedence'),
    p('If this letter conflicts with the Partnership Agreement, this letter prevails as between the General Partner and the Investor. Section 5 does not apply to terms required by law or regulation.'),
    h('Signatures'),
    field('For the General Partner'),
    field('For the Investor'),
  ];
  return doc([{ children: body }], 'Harborline IV Side Letter');
}

// ---------- 04 Scrambled booklet (PDF: reordered, rotated, two-column and scanned pages) ----------
function scrambledBooklet() {
  const intro = [
    title('SUBSCRIPTION BOOKLET', 32),
    centre(`${FUND} · Summary edition`, { bold: true }),
    centre(NOTICE, { size: 18, italic: true, after: 300 }),
    h('1. How to Subscribe'),
    p('Read the subscription agreement, complete the investor questionnaire, sign the signature page and return the booklet to the administrator. Incomplete booklets will be returned.'),
    p('The closing date for this offering is 30 June 2025. The closing date for this offering is 31 July 2025.'),
    pageBreak(),
    h('2. Subscription Terms'),
    p('The minimum Commitment is USD 1,000,000. The General Partner may accept smaller Commitments at its discretion.'),
    p('The Investor shall fund each capital call within 10 Business Days after receipt of a Capital Call Notice.'),
    p('Transfers require the consent described in Section 9 of the Partnership Agreement.'),
    pageBreak(),
    h('3. Investor Details'),
    field('Investor legal name'),
    choice('Investor type', ['Individual', 'Entity']),
    field('Commitment amount (USD)', 20),
    field('Email address'),
  ];
  const twoColumn = [
    h('4. Risk Factors'),
    ...Array.from({ length: 6 }, (_, i) =>
      p(
        [
          'Investments in private funds are speculative and involve a high degree of risk, including the loss of the entire investment.',
          'Interests are illiquid; there is no public market and none is expected to develop.',
          'The Partnership may invest in a limited number of portfolio companies, so poor performance of one investment may significantly affect returns.',
          'Distributions may be made in kind and their timing cannot be predicted.',
          'The General Partner and its affiliates have conflicts of interest that may not be resolved in favour of investors.',
          'Changes in tax law may adversely affect the Partnership and its investors.',
        ][i],
      ),
    ),
  ];
  const rest = [
    h('5. Tax Certification'),
    choice('U.S. person for tax purposes', ['Yes', 'No']),
    field('Taxpayer identification number', 24),
    p('The investor shall promptly provide any further tax forms the administrator may request.'),
    pageBreak(),
    h('6. Signature Page'),
    p('This page is provided as a scanned image in the PDF version of this booklet.'),
  ];
  return doc(
    [
      { children: intro },
      { properties: { type: SectionType.NEXT_PAGE, column: { count: 2, space: 720 } }, children: twoColumn },
      { properties: { type: SectionType.NEXT_PAGE }, children: rest },
    ],
    'Harborline IV Subscription Booklet (summary)',
  );
}

const SCANNED_SIGNATURE_PAGE = `<!doctype html><meta charset="utf-8"><body style="margin:0;width:1240px;height:1754px;background:#f2f0ea;font-family:'Times New Roman',serif;color:#2b2b2b">
<div style="transform:rotate(-0.8deg);padding:150px 140px;filter:blur(0.4px)">
<h1 style="text-align:center;font-size:40px">6. Signature Page</h1>
<p style="font-size:26px">By signing below the investor confirms its subscription for an interest in ${FUND} on the terms of the subscription agreement.</p>
<p style="font-size:26px;margin-top:90px">Signature: ______________________________</p>
<p style="font-size:26px;margin-top:40px">Name: ______________________________</p>
<p style="font-size:26px;margin-top:40px">Date: ____________________</p>
<p style="font-size:20px;margin-top:220px;text-align:center">Harborline IV Subscription Booklet (summary) · Page 6 of 6</p>
<p style="font-size:16px;text-align:center;color:#666">${NOTICE}</p>
</div></body>`;

async function scramble(pdfPath, out) {
  const src = await PDFDocument.load(await readFile(pdfPath));
  const n = src.getPageCount();
  if (n < 5) throw new Error(`expected at least 5 pages in the summary booklet, got ${n}`);
  // Scan of the signature page: an image only, no text layer.
  const html = path.join(TMP, 'signature-scan.html');
  const png = path.join(TMP, 'signature-scan.png');
  await writeFile(html, SCANNED_SIGNATURE_PAGE);
  edgeScreenshot(html, png);
  const { width: w, height: hgt } = src.getPage(0).getSize();
  // Order as a careless scanner would: 3, 1, the scanned signature page, 2, risk factors (rotated), tax page.
  // Source pages: 0 how to subscribe, 1 terms, 2 investor details, 3 risk factors (two columns), 4 tax, 5 signature.
  const order = [2, 0, 'scan', 1, 3, 4];
  const final = await PDFDocument.create();
  const scanImage = await final.embedPng(await readFile(png));
  for (const i of order) {
    if (i === 'scan') {
      final.addPage([w, hgt]).drawImage(scanImage, { x: 0, y: 0, width: w, height: hgt });
      continue;
    }
    const [copy] = await final.copyPages(src, [i]);
    final.addPage(copy);
  }
  final.getPage(4).setRotation(degrees(90));
  final.setTitle('Harborline IV Subscription Booklet (summary, scrambled scan)');
  await writeFile(out, await final.save());
}

// ---------- 05 Long subscription booklet (Word and PDF) ----------
const TOPICS = [
  ['Interpretation', 'the interpretation of this Agreement'], ['Subscription', 'the subscription for Interests'], ['Closings', 'each closing of the Partnership'],
  ['Capital Contributions', 'capital contributions'], ['Capital Calls', 'capital calls'], ['Defaulting Partners', 'defaulting partners'],
  ['Distributions', 'distributions to partners'], ['Allocations', 'allocations of profit and loss'], ['Management Fee', 'the management fee'],
  ['Partnership Expenses', 'partnership expenses'], ['Carried Interest', 'carried interest'], ['Investment Restrictions', 'investment restrictions'],
  ['Conflicts of Interest', 'conflicts of interest'], ['Advisory Committee', 'the advisory committee'], ['Key Persons', 'key persons'],
  ['Transfers', 'transfers of Interests'], ['Withdrawal', 'withdrawal of partners'], ['Reporting', 'reporting to investors'],
  ['Valuation', 'valuation of investments'], ['Indemnification', 'indemnification'], ['Exculpation', 'exculpation of the General Partner'],
  ['Confidentiality', 'confidential information'], ['Tax Matters', 'tax matters'], ['ERISA Matters', 'ERISA matters'],
  ['Anti-Money Laundering', 'anti-money laundering procedures'], ['Sanctions', 'economic sanctions'], ['Data Protection', 'personal data'],
  ['Term and Dissolution', 'the term and dissolution of the Partnership'], ['Amendments', 'amendments'], ['Notices', 'notices'],
  ['Governing Law', 'governing law'], ['Dispute Resolution', 'dispute resolution'],
];
const CLAUSES = [
  (t) => `The provisions of this Section apply to ${t} and shall be read together with the corresponding provisions of the Partnership Agreement.`,
  (t) => `The General Partner shall administer ${t} in good faith and in accordance with applicable law, the Partnership Agreement and the policies adopted by the General Partner from time to time.`,
  (t) => `Each Investor acknowledges that decisions concerning ${t} are within the discretion of the General Partner except where this Agreement expressly requires the consent of the Investors.`,
  (t) => `Any determination by the General Partner regarding ${t} shall be made in writing, shall be recorded in the books of the Partnership and shall be binding on all partners absent manifest error.`,
  (t) => `Nothing in this Section limits the rights of an Investor under the side letter, if any, entered into between that Investor and the General Partner in relation to ${t}.`,
  (t) => `Where the Partnership Agreement and this Agreement differ as to ${t}, the Partnership Agreement prevails unless this Agreement expressly provides otherwise.`,
  (t) => `The administrator may rely on instructions from the General Partner regarding ${t} without independent verification and shall have no liability for acting on such instructions.`,
  (t) => `Each Investor shall provide such information regarding ${t} as the General Partner may reasonably require to comply with its obligations under applicable law.`,
  (t) => `The General Partner may delegate any of its functions relating to ${t} to an affiliate or a service provider, but remains responsible for the performance of those functions.`,
  (t) => `Costs incurred in connection with ${t} are Partnership expenses unless the Partnership Agreement allocates them to the General Partner or to a particular Investor.`,
  (t) => `The General Partner shall keep records relating to ${t} for at least six years after the end of the term of the Partnership and shall make them available to the auditors.`,
  (t) => `No failure or delay by the General Partner in exercising any right relating to ${t} operates as a waiver of that right, and no single exercise prevents any further exercise.`,
  (t) => `If any provision concerning ${t} is held invalid, the remaining provisions continue in full force and the invalid provision is replaced by a valid provision closest to its intent.`,
  (t) => `The advisory committee may be consulted on matters relating to ${t} that involve a conflict of interest, but its views are advisory and do not bind the General Partner.`,
];

function longBooklet() {
  const ch = [
    title(FUND.toUpperCase(), 30),
    title('SUBSCRIPTION BOOKLET', 36),
    centre('Complete edition for limited partners', { bold: true }),
    centre(NOTICE, { size: 18, italic: true, after: 400 }),
    h('Instructions'),
    ...[
      'This booklet contains the subscription agreement, the investor questionnaire, the anti-money laundering and tax certifications, the privacy notice and the signature pages for the Partnership.',
      'Each prospective investor must complete Parts A to L of the investor questionnaire, sign each signature page and deliver the completed booklet to the administrator before the closing date.',
      'Capitalised terms not defined in this booklet have the meanings given in the Partnership Agreement. If you have questions, contact your relationship manager. The administrator will confirm receipt soon after delivery.',
    ].map((t) => p(t)),
    pageBreak(),
    title('PART I SUBSCRIPTION AGREEMENT', 28),
  ];
  TOPICS.forEach(([name, topic], i) => {
    const n = i + 1;
    ch.push(h(`${n}. ${name}`));
    const count = 12 + (i % 6);
    for (let k = 0; k < count; k++) ch.push(p(`${n}.${k + 1} ${CLAUSES[(i + k) % CLAUSES.length](topic)}`));
    if (name === 'Capital Calls') ch.push(p(`${n}.${count + 1} The Investor shall fund each capital call within 10 Business Days after receipt of a Capital Call Notice.`));
    if (name === 'Defaulting Partners') ch.push(p(`${n}.${count + 1} The Investor shall fund each capital call within 12 Business Days after receipt of a Capital Call Notice.`));
    if (name === 'Transfers') {
      ch.push(p(`${n}.${count + 1} An Investor wishing to transfer its Interest shall give the General Partner written notice at least 30 days before the proposed transfer date.`));
      ch.push(p(`${n}.${count + 2} An Investor wishing to transfer its Interest shall give the General Partner written notice at least 60 days before the proposed transfer date.`));
    }
    if (name === 'Carried Interest') ch.push(p(`${n}.${count + 1} Amounts subject to the Carried Interest Clawback shall be returned to the Partnership as described in Section 52.`));
    if (name === 'Reporting') ch.push(p(`${n}.${count + 1} Each Investor will recieve quarterly reports and the annual audited financial statements described in Schedule F.`));
    if (name === 'Notices') ch.push(p(`${n}.${count + 1} Notices sent by email are effective on the next Business Day, and notices sent by courier will be treated as delivered soon after dispatch.`));
  });
  ch.push(pageBreak(), title('PART II INVESTOR QUESTIONNAIRE', 28));
  const parts = [
    ['Part A Investor Identity', () => [field('Full legal name'), field('Former names, if any'), field('Date of birth or formation', 20), field('Country of citizenship or organization', 24), choice('Investor type', ['Natural person', 'Corporation', 'Partnership', 'Trust', 'Pension plan', 'Fund of funds'])]],
    ['Part B Contact Details', () => [field('Address line 1'), field('Address line 2'), field('City and postal code', 28), field('Country', 24), field('Telephone', 22), field('Email address'), choice('Preferred communication', ['Email', 'Investor portal', 'Courier'], '☐')]],
    ['Part C Authorised Signatories', () => [1, 2, 3].flatMap((i) => [field(`Signatory ${i} name`), field(`Signatory ${i} title`, 26), field(`Signatory ${i} email`, 30)])],
    ['Part D Accredited Investor Status', () => [choice('Natural persons', ['Net worth over USD 1,000,000', 'Income over USD 200,000', 'Joint income over USD 300,000', 'Licensed securities professional'], '☐'), choice('Entities', ['Assets over USD 5,000,000', 'All owners accredited', 'Registered investment adviser', 'Bank or insurance company'], '☐')]],
    ['Part E Qualified Purchaser Status', () => [choice('Qualified purchaser', ['Yes', 'No']), choice('Basis', ['Investments of USD 5,000,000 or more', 'Company with USD 25,000,000 or more', 'Trust sponsored by qualified purchasers'], '☐')]],
    ['Part F Beneficial Ownership', () => [1, 2, 3, 4].flatMap((i) => [field(`Beneficial owner ${i} name`), field(`Beneficial owner ${i} ownership percentage`, 12)])],
    ['Part G Source of Funds', () => [choice('Source of funds', ['Employment income', 'Business proceeds', 'Investment returns', 'Inheritance', 'Other'], '☐'), field('Description of source of wealth', 40)]],
    ['Part H Politically Exposed Persons', () => [choice('Is any beneficial owner a politically exposed person', ['Yes', 'No']), field('If yes, give details', 40)]],
    ['Part I Tax Status', () => [choice('U.S. person for tax purposes', ['Yes', 'No']), field('Taxpayer identification number', 24), field('Tax residence country', 24), choice('Tax classification', ['Individual', 'Corporation', 'Partnership', 'Tax-exempt organization'])]],
    ['Part J ERISA Status', () => [choice('Benefit plan investor', ['Yes', 'No']), field('Percentage of plan assets', 12)]],
    ['Part K Distribution Account', () => [table([['Wire instruction', 'Investor answer'], ['Bank name', '______________________'], ['Account name', '______________________'], ['Account number or IBAN', '______________________'], ['SWIFT or ABA code', '______________________'], ['Reference', '______________________']])]],
    ['Part L Commitment', () => [field('Commitment amount (USD)', 20), choice('Feeder vehicle', ['Direct investment', 'Through a feeder fund'])]],
  ];
  parts.forEach(([name, items], i) => ch.push(h(`${i + 33}. ${name}`), ...items()));
  ch.push(pageBreak(), title('PART III ANTI-MONEY LAUNDERING CERTIFICATION', 26));
  for (let i = 0; i < 8; i++) ch.push(p(['The Investor represents that the funds used for its Commitment are not derived from any unlawful activity.', 'The Investor is not a person named on any sanctions list maintained by the United States, the European Union or the United Nations.', 'The Investor shall provide such additional identification documents as the administrator may request to comply with know-your-customer obligations.', 'The Investor acknowledges that the administrator may delay or refuse a subscription or distribution if it cannot complete its verification procedures.', 'The Investor shall notify the administrator promptly of any change in its beneficial ownership or controlling persons.', 'The Investor consents to the disclosure of its information to regulators where required by law.', 'Records will be retained for at least five years after the Investor ceases to be a partner.', 'These certifications are continuing and are deemed repeated on each capital call and each distribution.'][i]));
  ch.push(pageBreak(), title('PART IV PRIVACY NOTICE', 26));
  for (let i = 0; i < 35; i++) ch.push(p(`${i + 1}. ${['The General Partner and the administrator collect personal data about investors and their representatives in order to process subscriptions, maintain the register of partners and comply with law.', 'Personal data may include names, addresses, identification documents, tax identifiers, bank details and information about source of funds.', 'Personal data is processed on the basis of contractual necessity, legal obligation and legitimate interests.', 'Personal data may be transferred to service providers outside the investor\'s country, subject to appropriate safeguards.', 'Investors may request access to, correction of or deletion of their personal data, subject to legal retention requirements.', 'Personal data is kept for as long as needed for the purposes above and the applicable limitation periods.', 'Security measures appropriate to the risk protect personal data against unauthorised access.'][i % 7]}`));
  ch.push(pageBreak(), title('PART V POWER OF ATTORNEY', 26));
  for (let i = 0; i < 6; i++) ch.push(p(['The Investor appoints the General Partner as its attorney-in-fact to execute the Partnership Agreement and any amendments approved in accordance with its terms.', 'The power of attorney is coupled with an interest, is irrevocable and survives the death, disability or dissolution of the Investor.', 'The attorney may execute certificates and filings required by law in the jurisdictions where the Partnership operates.', 'The attorney may not use this power to increase the Commitment of the Investor or to reduce its rights without its consent.', 'The power of attorney ends when the Investor ceases to be a partner.', 'Third parties may rely on this power of attorney without enquiry.'][i]));
  ch.push(pageBreak(), title('PART VI SIGNATURE PAGES', 26));
  for (const who of ['Individual investors', 'Entity investors', 'Joint investors', 'Acceptance by the General Partner']) {
    ch.push(h(who), field('Signature'), field('Name'), field('Title or capacity', 28), field('Date', 18), field('Place of signing', 26));
  }
  ch.push(pageBreak(), title('SCHEDULES', 26));
  ch.push(h('Schedule A Wire Instructions of the Partnership'), table([['Item', 'Detail'], ['Bank', 'Example Custody Bank (fictional)'], ['Account name', FUND], ['Account number', '000000000 (placeholder)'], ['Reference', 'Investor name and capital call number']]));
  ch.push(h('Schedule B Closing Calendar'), table([['Event', 'Date'], ['Initial closing', '31 March 2025'], ['Second closing', '30 June 2025'], ['Final closing', '31 December 2025']]));
  ch.push(h('Schedule C Key Persons'), p('The key persons are the two managing partners of the investment manager identified in the offering memorandum.'));
  ch.push(h('Schedule D Fee Calculation Examples'));
  for (let i = 7; i <= 30; i++) ch.push(p(`Example ${i}: for a Commitment of USD ${i * 5},000,000, the annual management fee after the investment period is USD ${(i * 5 * 0.015).toFixed(2)} million calculated on invested capital.`));
  ch.push(h('Schedule E Summary of Principal Terms'), table([['Term', 'Summary'], ...TOPICS.map(([name, topic]) => [name, `See Part I for ${topic}; the Partnership Agreement prevails if the two differ.`])]));
  for (let i = 1; i <= 6; i++) ch.push(p(`Example ${i}: for a Commitment of USD ${i * 5},000,000, the annual management fee during the investment period is USD ${(i * 5 * 0.02).toFixed(2)} million before any discount or offset.`));
  return doc([{ children: ch }], 'Harborline IV Subscription Booklet (complete)');
}

// ---------- 06 Vietnamese subscription agreement (Word) ----------
function vietnameseAgreement() {
  const body = [
    title('THỎA THUẬN ĐĂNG KÝ GÓP VỐN', 32),
    centre('Quỹ Đầu tư Harborline IV (quỹ hư cấu)', { bold: true }),
    centre('Tài liệu mẫu tổng hợp: quỹ và điều khoản đều là hư cấu, không phải là chào bán chứng khoán và không phải là tư vấn pháp lý.', { size: 18, italic: true, after: 300 }),
    h('Điều 1. Định nghĩa'),
    p('"Nhà đầu tư" là bên ký Thỏa thuận này. "Thông báo gọi vốn" là văn bản của Công ty Quản lý Quỹ yêu cầu Nhà đầu tư góp vốn. "Số vốn cam kết" là tổng số tiền Nhà đầu tư cam kết góp vào Quỹ.'),
    h('Điều 2. Đăng ký góp vốn'),
    p('Nhà đầu tư đăng ký góp vào Quỹ Số vốn cam kết ghi tại phần Thông tin Nhà đầu tư theo các điều khoản của Thỏa thuận này và Điều lệ Quỹ.'),
    h('Điều 3. Góp vốn'),
    p('Nhà đầu tư phải góp vốn trong vòng 10 ngày làm việc kể từ ngày nhận Thông báo gọi vốn.'),
    p('Tiền góp vốn được chuyển khoản bằng đồng Việt Nam vào tài khoản ghi trong Thông báo gọi vốn.'),
    h('Điều 4. Cam đoan của Nhà đầu tư'),
    p('Nhà đầu tư cam đoan là nhà đầu tư chứng khoán chuyên nghiệp và sẽ thông báo sớm cho Công ty Quản lý Quỹ khi có thay đổi. Nhà đầu tư sẽ nỗ lực hợp lý để cung cấp thông tin được yêu cầu.'),
    h('Điều 5. Phí quản lý'),
    p('Phí quản lý được tính trên Số vốn cam kết và được điều chỉnh theo quy định tại Điều 12.'),
    h('Điều 6. Vi phạm nghĩa vụ góp vốn'),
    p('Nhà đầu tư phải góp vốn trong vòng 15 ngày làm việc kể từ ngày nhận Thông báo gọi vốn.'),
    p('Nếu Nhà đầu tư không góp vốn đúng hạn, Công ty Quản lý Quỹ có quyền áp dụng các biện pháp quy định trong Điều lệ Quỹ.'),
    h('Điều 7. Chuyển nhượng'),
    p('Nhà đầu tư không được chuyển nhượng phần vốn góp nếu chưa có sự chấp thuận bằng văn bản của Công ty Quản lý Quỹ.'),
    h('Điều 8. Luật áp dụng'),
    p('Thỏa thuận này được điều chỉnh bởi pháp luật Việt Nam.'),
    pageBreak(),
    h('Thông tin Nhà đầu tư'),
    field('Tên Nhà đầu tư'),
    choice('Loại Nhà đầu tư', ['Cá nhân', 'Tổ chức']),
    field('Số CCCD hoặc mã số doanh nghiệp', 24),
    field('Số vốn cam kết (VND)', 24),
    choice('Nhận thông báo qua', ['Email', 'Bưu điện'], '☐'),
    field('Địa chỉ email'),
    h('Chữ ký'),
    field('Chữ ký'),
    field('Họ và tên', 30),
    field('Ngày ký', 18),
  ];
  return doc([{ children: body }], 'Thoa thuan dang ky gop von Harborline IV');
}

// ---------- 07 Fillable subscription form (PDF with AcroForm fields) ----------
async function fillableForm(out) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const form = pdf.getForm();
  const ink = rgb(0.1, 0.1, 0.12);
  let page = pdf.addPage([612, 792]);
  let y = 740;
  const text = (s, o = {}) => {
    page.drawText(s, { x: o.x ?? 60, y, size: o.size ?? 10.5, font: o.bold ? bold : font, color: ink, maxWidth: 492, lineHeight: 13 });
    y -= o.gap ?? 18;
  };
  const wrap = (s) => {
    const words = s.split(' ');
    let line = '';
    for (const w of words) {
      if (font.widthOfTextAtSize(`${line} ${w}`, 10.5) > 492) { text(line.trim(), { gap: 14 }); line = w; } else line += ` ${w}`;
    }
    if (line.trim()) text(line.trim());
  };
  const input = (label, name, width = 300) => {
    text(`${label}:`, { gap: 0 });
    const f = form.createTextField(name);
    f.addToPage(page, { x: 230, y: y - 5, width, height: 18, font });
    y -= 26;
  };
  const radios = (label, name, options) => {
    text(`${label}:`, { gap: 0 });
    const g = form.createRadioGroup(name);
    options.forEach((o, i) => {
      g.addOptionToPage(o, page, { x: 230 + i * 110, y: y - 3, width: 12, height: 12 });
      page.drawText(o, { x: 246 + i * 110, y, size: 10, font, color: ink });
    });
    y -= 26;
  };
  const box = (label, name) => {
    const c = form.createCheckBox(name);
    c.addToPage(page, { x: 60, y: y - 3, width: 12, height: 12 });
    page.drawText(label, { x: 80, y, size: 10, font, color: ink });
    y -= 22;
  };
  text(FUND.toUpperCase(), { bold: true, size: 13, gap: 20 });
  text('INVESTOR SUBSCRIPTION FORM (FILLABLE)', { bold: true, size: 16, gap: 22 });
  wrap(NOTICE);
  y -= 6;
  text('1. Investor Details', { bold: true, size: 12, gap: 22 });
  input('Investor legal name', 'investor.legal_name');
  input('Registered address', 'investor.address');
  input('Email address', 'investor.email');
  radios('Investor type', 'investor.type', ['Individual', 'Entity', 'Trust']);
  text('2. Commitment', { bold: true, size: 12, gap: 22 });
  input('Commitment amount (USD)', 'commitment.amount', 160);
  wrap('The Investor shall fund each capital call within 10 Business Days after receipt of a Capital Call Notice. Capital Call Notices will be sent by email to the address above.');
  text('3. Accredited Investor Status (tick all that apply)', { bold: true, size: 12, gap: 22 });
  box('Net worth over USD 1,000,000 excluding primary residence', 'accredited.net_worth');
  box('Income over USD 200,000 in each of the last two years', 'accredited.income');
  box('Entity with total assets over USD 5,000,000', 'accredited.entity_assets');
  text('4. Tax Status', { bold: true, size: 12, gap: 22 });
  radios('U.S. person for tax purposes', 'tax.us_person', ['Yes', 'No']);
  input('Taxpayer identification number', 'tax.tin', 200);
  page = pdf.addPage([612, 792]);
  y = 740;
  text('5. Representations', { bold: true, size: 12, gap: 22 });
  wrap('The Investor confirms that it will recieve the offering memorandum and the Partnership Agreement before signing, and that it has had a reasonable opportunity to ask questions of the General Partner.');
  wrap('The Investor shall fund each capital call within 20 Business Days after receipt of a Capital Call Notice.');
  y -= 6;
  text('6. Signature', { bold: true, size: 12, gap: 22 });
  input('Name of signatory', 'signature.name');
  input('Title', 'signature.title', 200);
  input('Date', 'signature.date', 140);
  pdf.setTitle('Harborline IV Investor Subscription Form (fillable)');
  await writeFile(out, await pdf.save());
}

// ---------- build ----------
await mkdir(OUT, { recursive: true });
await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });

async function tmpDocx(document, name) {
  const file = path.join(TMP, name);
  await writeFile(file, await Packer.toBuffer(document));
  return file;
}

const built = [];
const keep = (name) => built.push(name);

await saveDocx(subscriptionAgreement(), '01-subscription-agreement.docx');
keep('01-subscription-agreement.docx');

wordToPdf(await tmpDocx(investorQuestionnaire(), 'questionnaire.docx'), path.join(OUT, '02-investor-questionnaire.pdf'));
keep('02-investor-questionnaire.pdf');

await saveDocx(sideLetter(), '03-side-letter.docx');
keep('03-side-letter.docx');

const summaryPdf = path.join(TMP, 'summary.pdf');
wordToPdf(await tmpDocx(scrambledBooklet(), 'summary.docx'), summaryPdf);
await scramble(summaryPdf, path.join(OUT, '04-subscription-booklet-scrambled.pdf'));
keep('04-subscription-booklet-scrambled.pdf');

const longDocx = await saveDocx(longBooklet(), '05-subscription-booklet-long.docx');
wordToPdf(longDocx, path.join(OUT, '05-subscription-booklet-long.pdf'));
keep('05-subscription-booklet-long.docx');
keep('05-subscription-booklet-long.pdf');

await saveDocx(vietnameseAgreement(), '06-thoa-thuan-dang-ky-gop-von.docx');
keep('06-thoa-thuan-dang-ky-gop-von.docx');

await fillableForm(path.join(OUT, '07-subscription-form-fillable.pdf'));
keep('07-subscription-form-fillable.pdf');

for (const name of built) {
  const bytes = await readFile(path.join(OUT, name));
  const pages = name.endsWith('.pdf') ? ` · ${(await PDFDocument.load(bytes)).getPageCount()} pages` : '';
  console.log(`${name} ${bytes.length} bytes${pages}`);
}
