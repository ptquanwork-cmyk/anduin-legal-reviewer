export type ScreenId =
  | 'home'
  | 'intake'
  | 'source'
  | 'map'
  | 'review'
  | 'report'
  | 'annotation'
  | 'form'
  | 'responses'
  | 'export'
  | 'templates'
  | 'feedback';

export type RailId = 'home' | 'documents' | 'map' | 'review' | 'forms' | 'export' | 'templates' | 'feedback';

export interface Stage {
  id: Exclude<ScreenId, 'home' | 'templates' | 'feedback'>;
  n: string;
  label: string;
  caption: string;
  purpose: string;
  img: string;
  rail: RailId;
}

export const STAGES: Stage[] = [
  { id: 'intake', n: '01', label: 'Intake', caption: 'Register the original', purpose: 'Upload a PDF or Word original, keep it unchanged and check for earlier versions.', img: '01-intake', rail: 'documents' },
  { id: 'source', n: '02', label: 'Source quality', caption: 'Compare Word and PDF', purpose: 'Compare the original and converted source. Expose font, text and unread-region issues.', img: '02-source-quality', rail: 'documents' },
  { id: 'map', n: '03', label: 'Document map', caption: 'See how sections relate', purpose: 'Navigate sections, references and definitions, each linked to its exact source.', img: '03-document-map', rail: 'map' },
  { id: 'review', n: '04', label: 'Legal review', caption: 'Confirm with evidence', purpose: 'Open source-linked findings. Confirm, dismiss or request clarification.', img: '04-legal-review', rail: 'review' },
  { id: 'report', n: '05', label: 'Decision / report', caption: 'Questions and handoff', purpose: 'Track decisions, prepare questions for counsel and export the review report.', img: '05-decision-report', rail: 'review' },
  { id: 'annotation', n: '06', label: 'Annotation', caption: 'Anchor four field types', purpose: 'Anchor paragraph, text box, radio box and checkbox regions to the source.', img: '06-annotation', rail: 'forms' },
  { id: 'form', n: '07', label: 'Form preview', caption: 'Keep the full content', purpose: 'Preview a complete form that keeps every clause beside its source.', img: '07-form-preview', rail: 'forms' },
  { id: 'responses', n: '08', label: 'Responses', caption: 'Review entered data', purpose: 'Fill, save and review answers for the exact form version.', img: '08-responses', rail: 'forms' },
  { id: 'export', n: '09', label: 'PDF QA / export', caption: 'Check before export', purpose: 'Render the filled PDF, check coverage, mapping and clipping, then export.', img: '09-pdf-qa-export', rail: 'export' },
];

export const stageOf = (id: ScreenId) => STAGES.find((s) => s.id === id);

export const RAIL_TARGET: Record<RailId, ScreenId> = {
  home: 'home',
  documents: 'intake',
  map: 'map',
  review: 'review',
  forms: 'annotation',
  export: 'export',
  templates: 'templates',
  feedback: 'feedback',
};

export function railFor(screen: ScreenId): RailId {
  if (screen === 'home') return 'home';
  if (screen === 'templates' || screen === 'feedback') return screen;
  return stageOf(screen)!.rail;
}
