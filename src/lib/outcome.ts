import type { DecisionRow, FindingRow, VersionRow } from './types';

export type OutcomeKey = 'ready' | 'clarify' | 'blocked' | 'exceptions' | 'revision' | 'in_progress';

export interface Outcome {
  key: OutcomeKey;
  label: string;
  detail: string;
  canDigitize: boolean;
}

function latest(decisions: DecisionRow[], id: string) {
  let d: DecisionRow | undefined;
  for (const x of decisions) if (x.finding_id === id && (!d || x.created_at > d.created_at)) d = x;
  return d;
}

/** Review handoff state derived from the append-only decision history (plan step 8). */
export function reviewOutcome(version: VersionRow | null, findings: FindingRow[], decisions: DecisionRow[]): Outcome {
  if (!version) return { key: 'in_progress', label: 'No document', detail: 'Open a document to see its review status.', canDigitize: false };
  const sourceOk = version.source_status === 'verified' || !!version.source_accepted_at;
  if (!sourceOk) return { key: 'blocked', label: 'Blocked by source quality', detail: 'Source issues must be resolved before the review can be handed off.', canDigitize: false };
  const states = findings.map((f) => {
    const d = latest(decisions, f.id);
    if (!d || d.action === 'reopen') return 'open';
    if (d.action === 'confirm') return d.reason === 'exception' ? 'exception' : 'confirmed';
    return d.action;
  });
  if (states.includes('open')) return { key: 'in_progress', label: 'Review in progress', detail: `${states.filter((s) => s === 'open').length} finding(s) still need a decision.`, canDigitize: false };
  if (states.includes('clarify')) return { key: 'clarify', label: 'Needs clarification', detail: 'Unresolved issue blocks digitization.', canDigitize: false };
  if (states.includes('confirmed')) return { key: 'revision', label: 'Revision needed', detail: 'Confirmed issues stay open until a revised version resolves them or an exception is recorded.', canDigitize: false };
  if (states.includes('exception')) return { key: 'exceptions', label: 'Approved with exceptions', detail: 'Digitization may continue with the recorded exceptions.', canDigitize: true };
  return { key: 'ready', label: 'Ready for digitization', detail: 'Required checks are complete and every finding has a recorded decision.', canDigitize: true };
}
