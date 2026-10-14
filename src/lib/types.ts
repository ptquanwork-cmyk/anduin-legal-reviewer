export type Category = 'typo' | 'missing_reference' | 'undefined_term' | 'contradiction' | 'ambiguity';
export type Severity = 'low' | 'medium' | 'high';
export type DecisionAction = 'confirm' | 'dismiss' | 'clarify' | 'resolve' | 'reopen';
export type AnnotationType = 'paragraph' | 'text_box' | 'radio' | 'checkbox';
export type TransferState = 'matched' | 'changed' | 'new' | 'uncertain';

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DocumentRow {
  id: string;
  title: string;
  family_key: string;
  created_at: string;
}

export interface SourceIssue {
  id: string;
  kind: 'font_substitution' | 'text_mismatch' | 'unread_page' | 'conversion_failed' | 'password' | 'unreadable';
  title: string;
  detail: string;
  page?: number;
  quote?: string;
  block_idx?: number;
  severity: 'blocking' | 'warning';
}

export interface DuplicateCandidate {
  version_id: string;
  document_id: string;
  file_name: string;
  version_no: number;
  created_at: string;
  kind: 'exact' | 'similar';
  score: number;
}

export interface SourceReport {
  pages?: number;
  pages_with_text?: number;
  blocks?: number;
  coverage?: { read_pages: number; total_pages: number; unread_pages: number[] };
  issues?: SourceIssue[];
  declared_fonts?: string[];
  embedded_fonts?: string[];
  text_diff?: { missing: string[]; extra: string[]; normalized: string[] };
  duplicates?: DuplicateCandidate[];
  converted_by?: string;
  limitations?: string[];
}

export interface DecisionAgentAnswer {
  value: string | number | boolean;
  confidence: number | null;
  checkpoint: string;
  field: string;
  truncated?: boolean;
}

export interface Routing {
  agent?: 'online' | 'offline' | 'skipped';
  doc_type?: DecisionAgentAnswer;
  has_fillable?: DecisionAgentAnswer;
  needs_semantic?: DecisionAgentAnswer;
  semantic_review?: 'run' | 'skipped' | 'failed' | 'unconfigured';
  notes?: string[];
}

export interface VersionRow {
  id: string;
  document_id: string;
  version_no: number;
  parent_id: string | null;
  file_name: string;
  file_path: string;
  pdf_path: string | null;
  mime: string;
  sha256: string;
  size_bytes: number;
  language: string | null;
  status: string;
  source_status: 'verified' | 'needs_review' | 'blocked' | null;
  source_report: SourceReport;
  routing: Routing;
  source_accepted_at: string | null;
  annotations_approved_at: string | null;
  created_at: string;
}

export interface BlockRow {
  id: string;
  version_id: string;
  idx: number;
  page: number | null;
  section_ref: string | null;
  section_title: string | null;
  kind: 'title' | 'heading' | 'paragraph' | 'list' | 'table' | 'header' | 'footer';
  text: string;
  bbox: BBox | null;
}

export interface EdgeRow {
  id: string;
  from_ref: string;
  to_ref: string;
  relation: 'contains' | 'references' | 'defines' | 'uses_term' | 'proposed_conflict';
  status: 'parsed' | 'proposed' | 'verified' | 'unresolved';
  evidence: { quote?: string; block_idx?: number; term?: string };
}

export interface Evidence {
  quote: string;
  block_idx: number;
  page: number | null;
  section: string | null;
  bbox?: BBox | null;
  matched: boolean;
}

export interface Provenance {
  source: 'rules' | 'semantic';
  rule?: string;
  model?: string;
  prompt_version?: string;
  model_score?: number | null;
  agent?: { needs_counsel?: DecisionAgentAnswer; impact?: DecisionAgentAnswer };
}

export interface FindingRow {
  id: string;
  version_id: string;
  seq: number;
  category: Category;
  title: string;
  rationale: string;
  question: string;
  suggestion: string | null;
  severity: Severity;
  evidence: Evidence[];
  provenance: Provenance;
  evidence_status: 'matched' | 'partial';
  fingerprint: string;
  created_at: string;
}

export interface DecisionRow {
  id: string;
  finding_id: string;
  action: DecisionAction;
  reason: string | null;
  note: string | null;
  actor_role: string;
  use_as_example: boolean;
  created_at: string;
}

export interface AnnotationOption {
  value: string;
  label: string;
  bbox: BBox;
}

export interface AnnotationRow {
  id: string;
  version_id: string;
  field_id: string;
  type: AnnotationType;
  label: string;
  options: AnnotationOption[];
  page: number;
  bbox: BBox;
  source_block_idx: number | null;
  required: boolean;
  transfer_state: TransferState;
  origin: 'detected' | 'manual' | 'transferred' | 'template';
  confirmed: boolean;
}

export interface SubmissionRow {
  id: string;
  version_id: string;
  answers: Record<string, string | string[]>;
  status: 'draft' | 'confirmed';
  updated_at: string;
}

export interface QaCheck {
  key: 'content' | 'mapping' | 'values' | 'render';
  label: string;
  status: 'pending' | 'pass' | 'needs_review' | 'issue';
  detail?: string;
}

export interface QaIssue {
  field_id?: string;
  page?: number;
  title: string;
  detail: string;
}

export interface ExportRow {
  id: string;
  version_id: string;
  kind: 'draft' | 'final' | 'review_report';
  file_path: string;
  qa: { checks?: QaCheck[]; issues?: QaIssue[]; answers_snapshot?: Record<string, unknown>; confirmed_by_user?: boolean };
  created_at: string;
}

export interface JobStep {
  key: string;
  label: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'skipped' | 'offline';
  detail?: string;
}

export interface JobRow {
  id: string;
  version_id: string;
  task: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'offline';
  steps: JobStep[];
  error: string | null;
  created_at: string;
  updated_at: string;
}
