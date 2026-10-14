import type { BBox, Category, Evidence, Provenance, Severity } from '../lib/types';

/** Source block produced by extraction; persisted as source_blocks. */
export interface Block {
  idx: number;
  page: number | null;
  kind: 'title' | 'heading' | 'paragraph' | 'list' | 'table' | 'header' | 'footer';
  text: string;
  bbox: BBox | null;
  fonts: string[];
  spans?: { text: string; x: number; y: number; w: number; h: number }[];
  fontSize?: number;
  bold?: boolean;
  section_ref: string | null;
  section_title: string | null;
}

export interface Candidate {
  category: Category;
  title: string;
  rationale: string;
  question: string;
  suggestion: string | null;
  severity: Severity;
  evidence: { quote: string; block_idx: number }[];
  provenance: Provenance;
}

export interface Finding extends Omit<Candidate, 'evidence'> {
  evidence: Evidence[];
  evidence_status: 'matched' | 'partial';
  fingerprint: string;
}

export interface Edge {
  from_ref: string;
  to_ref: string;
  relation: 'contains' | 'references' | 'defines' | 'uses_term' | 'proposed_conflict';
  status: 'parsed' | 'proposed' | 'verified' | 'unresolved';
  evidence: { quote?: string; block_idx?: number; term?: string };
}
