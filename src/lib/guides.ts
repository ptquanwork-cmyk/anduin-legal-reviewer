import type { ScreenId } from './stages';

export interface Guide {
  title: string;
  purpose: string;
  steps: { do: string; detail?: string }[];
  next: string;
  tips?: string[];
}

const FULL = 'Full screen (four arrows, next to How to use) turns the screen into a focused workspace: the working area fills your screen and PDF pages render larger, with a bar of steps 01–09, Prev / Next to move through the workflow, How to use and Exit full screen (or Esc).';

/** Step-by-step usage for each screen, opened from "How to use" in the top bar. */
export const GUIDES: Record<ScreenId, Guide> = {
  home: {
    title: 'Getting started',
    purpose: 'The hub shows the nine steps from an uploaded contract to a verified, filled PDF. Each station opens one workspace.',
    steps: [
      { do: 'Hover a station', detail: 'It lifts and shows what that workspace does.' },
      { do: 'Click Upload contract (or New document)', detail: 'Opens Intake, where you add a .pdf or .docx. Use demo loads a synthetic agreement instead.' },
      { do: 'Click any station to jump to its workspace', detail: 'The workspaces work on the document selected in the top bar.' },
      { do: 'Use the search box (⌘K / Ctrl+K)', detail: 'Finds documents and sections of the open document.' },
    ],
    next: 'Start at Intake with a document; the steps then follow in order 01 → 09.',
    tips: ['The footer shows whether the decision agent (worker) is online. Offline: rules, reports and forms still work; Word conversion and the semantic reviewer wait.', 'The avatar menu (J) switches light and dark theme.'],
  },
  intake: {
    title: 'Intake: add a document',
    purpose: 'Register an original document. It is stored unchanged and every later step refers to this exact version.',
    steps: [
      { do: 'Drop a file on the upload area, or click Choose file', detail: '.pdf or .docx, up to 20 MB. Word files are converted to PDF automatically; PDFs are used as they are.' },
      { do: 'Watch Job status on the right', detail: 'Received → Duplicate lookup → Source checks → Decision agent routing → Legal review checks → Field detection. Long documents take a few minutes; the page updates by itself.' },
      { do: 'If "Possible related version" lists a document, click Open comparison', detail: 'Compare block by block, then decide whether this upload is a new version of that document.' },
      { do: 'When every step is done, click Continue to source quality', detail: 'Re-run checks repeats processing; Resume job finishes a job that stopped (for example while the worker was offline).' },
    ],
    next: 'All job steps show done → Continue to source quality.',
    tips: ['Uploading the exact same file again reopens the earlier record instead of processing twice.', 'Recent documents: click a row to open it; View all lists everything in this workspace.'],
  },
  source: {
    title: 'Source quality: check the conversion',
    purpose: 'Prove that what will be reviewed is exactly the original. For Word files, Microsoft Word itself renders the PDF and the text is compared word for word; PDFs are checked for readable pages.',
    steps: [
      { do: 'Read the status chip at the top', detail: 'Verified: text identical, nothing to do. Needs review: something differs and must be checked. Blocked: conversion or reading failed.' },
      { do: 'Text tab: compare side by side', detail: 'Word original on the left, converted PDF on the right. Use − / + on each side to zoom, the expand icon to read a whole document, or the full-screen button in the top bar for more room.' },
      { do: 'Layout and Fonts tabs', detail: 'Pages and coverage; fonts declared in Word vs fonts embedded in the PDF. "Font substituted, text identical" means only the typeface differs because that font is not installed on the conversion machine.' },
      { do: 'Issues list on the right: click View source region', detail: 'Shows the exact place on the page.' },
      { do: 'If the status is Needs review: compare, then click Confirm manual comparison', detail: 'If the converter failed or was offline, click Retry conversion instead.' },
      { do: 'Click Continue to document map' },
    ],
    next: 'Status Verified (or manual comparison confirmed) → Continue to document map.',
    tips: ['Conversion is retried automatically once if Word fails or any text differs.', 'For an exact typeface match on any machine, embed fonts in the Word file (File › Options › Save › Embed fonts).', FULL],
  },
  map: {
    title: 'Document map: understand the structure',
    purpose: 'See how the contract is organised and where findings sit, before deciding on them.',
    steps: [
      { do: 'Outline tab', detail: 'Every numbered section in order, with its page and number of findings. Click a section to see its details on the right.' },
      { do: 'Relationships tab', detail: 'Solid lines are parsed references and definitions; dashed lines are proposed conflicts from findings. Click a node to select that section.' },
      { do: 'Page map tab', detail: 'Page thumbnails coloured by findings. Click a page to open it.' },
      { do: 'Right panel: Open source or Open legal review', detail: 'Open source shows the exact passage on its page; Open legal review jumps to decide on the findings.' },
    ],
    next: 'When you know where the problems are → Open legal review (or step 04).',
    tips: [FULL],
  },
  review: {
    title: 'Legal review: decide on each finding',
    purpose: 'Every finding quotes the exact source text. You decide what it is; nothing is treated as resolved automatically.',
    steps: [
      { do: 'Pick a finding on the left', detail: 'Filter by Typos, References, Contradictions, Ambiguities or Terms.' },
      { do: 'Read the highlighted passage in the middle', detail: 'Contradictions show both passages. Click a Document anchor on the right to jump to it.' },
      { do: 'Choose an action on the right', detail: 'Confirm issue = it is a real problem. Dismiss = not a problem (reason required; tick "Use as example" to guide later reviews). Needs clarification = ask counsel (edit the question).' },
      { do: 'The status menu next to the category', detail: 'View decision history, Reopen finding, or Approve as exception (accept a confirmed issue as written so digitization can continue).' },
      { do: 'Use the arrows to move to the next finding', detail: 'After a decision the next open finding is selected for you.' },
    ],
    next: 'Every finding has a decision → Review report (bottom right) or step 05.',
    tips: ['"Confidence: not calibrated" is an indication, not a probability of correctness.', FULL],
  },
  report: {
    title: 'Decision / report: hand off the review',
    purpose: 'Shows the overall outcome of the review, prepares the questions for counsel and the report, and decides whether digitization may start.',
    steps: [
      { do: 'Read the outcome card at the top', detail: 'Review in progress (findings still open) · Needs clarification (waiting for counsel) · Revision needed (confirmed issues) · Approved with exceptions or Ready (you may continue) · Blocked by source quality.' },
      { do: 'Left: Finding status', detail: 'Every finding with its current status; the filter shows one status at a time. Click a finding to preview it.' },
      { do: 'Middle: preview and decide', detail: 'Use Confirm issue, Approve as exception, Dismiss, Needs clarification or Reopen under the preview. These are the same decisions as in Legal review.' },
      { do: 'Right: Questions for counsel', detail: 'Generated from open, confirmed and clarification findings. Edit the text, then Prepare question list (copies it and downloads a .md file; nothing is sent).' },
      { do: 'Right: Export review report', detail: 'Opens a PDF with all findings, decisions and questions.' },
      { do: 'Confirmed issues: fix or accept', detail: 'Upload the corrected document with Compare (top right): findings that disappear are proposed as resolved and you confirm them. Or choose Approve as exception to keep the wording.' },
      { do: 'No corrected file yet? Click Create revised PDF', detail: 'Write the corrected wording for each confirmed issue (spelling fixes are filled in). Download revised PDF saves it; Upload as new version registers it as the next version, runs every check again and opens Compare.' },
      { do: 'Click Continue to annotation', detail: 'Unlocks when no finding is open, waiting for counsel or confirmed-but-unresolved. The "Next step" line above the button says what is still missing.' },
    ],
    next: 'Outcome Ready or Approved with exceptions → Continue to annotation.',
    tips: ['Confirming an issue does not resolve it: it marks a real problem that must be fixed or accepted.', FULL],
  },
  annotation: {
    title: 'Annotation: mark the fields to fill',
    purpose: 'Every part of the document becomes one of four region types: Paragraph (content), Text box, Radio box or Checkbox.',
    steps: [
      { do: 'Review the proposed regions on the page', detail: 'Click a region to select it; drag to move, drag its corner to resize.' },
      { do: 'Fix a region', detail: 'With a region selected, click a type at the top to change it; edit Field ID, Label and Required in the list on the right.' },
      { do: 'Add a missing region', detail: 'Click Draw region, choose the type, then drag on the page.' },
      { do: 'Resolve "regions need source confirmation"', detail: 'Click the warning, check each uncertain or changed region against the source and click Confirm source correspondence.' },
      { do: 'Click Approve and continue', detail: 'Runs the annotation QA (unique IDs, regions inside the page, every block anchored) and saves the structure as a template.' },
    ],
    next: 'QA passes and annotations are approved → Form preview.',
    tips: ['Use − / + to zoom the page.', 'Approving saves only the structure as a template; answers are never stored in templates.', FULL],
  },
  form: {
    title: 'Form preview: check the investor form',
    purpose: 'The form keeps the full original text in order, with the fields placed where they belong.',
    steps: [
      { do: 'Scroll the form in the middle', detail: 'Paragraphs are the original wording; fields are the regions you approved. Plain-language help is shown separately from the contract text.' },
      { do: 'Click a field to see its source on the right' },
      { do: 'Inspect coverage', detail: 'Lists any source block not represented in the form; responses stay locked until every block is mapped.' },
      { do: 'Full original text', detail: 'Reads the whole document as extracted. Conditional sections previews optional parts.' },
      { do: 'Export HTML form', detail: 'Downloads a single-page form anyone can open and fill in a browser. Its Submit button saves an answers file you import in Responses.' },
      { do: 'Click Enable responses' },
    ],
    next: 'Coverage complete → Enable responses.',
    tips: [FULL],
  },
  responses: {
    title: 'Responses: fill in the answers',
    purpose: 'Answers belong to this exact form version and are saved as a draft while you type.',
    steps: [
      { do: 'Fill each field', detail: 'Required fields are marked; formats (dates, emails, options) are validated.' },
      { do: 'Or Import answers', detail: 'Load the answers file produced by the exported HTML form.' },
      { do: 'Check the panel on the right', detail: 'It lists missing required answers; click one to jump to it. The page on the right shows where each answer will go.' },
      { do: 'Review answers', detail: 'A summary of every answer before the PDF is made.' },
      { do: 'Click Create draft PDF', detail: 'Enabled when all required answers are present.' },
    ],
    next: 'Draft PDF created → PDF QA / export.',
    tips: [FULL],
  },
  export: {
    title: 'PDF QA / export: verify and export',
    purpose: 'Answers are written into the PDF, then the PDF is read back and checked before anything is final.',
    steps: [
      { do: 'Read the four checks on the right', detail: 'Content coverage, Field mapping, Answer values and Page render. Each is Passed, Needs review or Issue found (for example "answer clipped" when text does not fit its box).' },
      { do: 'Inspect the document', detail: 'Tabs Source, Form, Answers and Draft PDF; problems are highlighted on the page. Zoom with − / +.' },
      { do: 'Fix problems', detail: 'Go to responses (shorten an answer) or Return to annotation (enlarge a region), then Run checks again.' },
      { do: 'Download draft', detail: 'Watermarked "DRAFT – NOT VERIFIED".' },
      { do: 'When every check passes: confirm, then Export final PDF', detail: 'The final PDF is only available after QA passes and you confirm.' },
    ],
    next: 'All checks Passed → confirm → Export final PDF.',
    tips: [FULL],
  },
  templates: {
    title: 'Templates',
    purpose: 'Field structures saved when annotations were approved, reusable for later versions of the same document family.',
    steps: [
      { do: 'Select a template on the left', detail: 'Its fields, types, requirements and options appear on the right.' },
      { do: 'Apply field names to current version', detail: 'Renames matching fields (same label and type) in the open document. Review them in Annotation afterwards.' },
    ],
    next: 'Return to Annotation to review the applied names.',
    tips: ['Answers are never stored in templates.'],
  },
  feedback: {
    title: 'Feedback',
    purpose: 'Every decision you made, kept as an append-only history.',
    steps: [
      { do: 'Read the decision list', detail: 'Finding, decision, reason and note. "Checks re-run since" means the finding was regenerated; the decision is kept.' },
      { do: 'Tick Use as example', detail: 'Selected decisions are given to the semantic reviewer as examples on later reviews in this workspace (up to 12, newest first).' },
    ],
    next: 'Nothing to approve here; examples apply to the next review automatically.',
    tips: ['This does not retrain any model; it adds your examples to the reviewer’s guidance.'],
  },
};
