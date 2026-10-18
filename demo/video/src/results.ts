/**
 * Numbers shown in the video's Results and Speed sections, from the 19 October 2026 production run
 * (evals/results/2026-10-19-production-test-report.md: 15 files, 16 runs) and the offline rules eval.
 * Intervals are 95% Wilson score intervals. Update them here when the report changes.
 */
export const RESULTS = {
  source: 'Production runs, 19 Oct 2026 · 15 synthetic fund documents (16 runs) with planted problems · 95% Wilson intervals',
  accuracy: [
    { value: 69, of: 74, label: 'Planted problems found', note: '16 live runs · 95% CI 85–97%', ring: true },
    { value: 167, of: 167, label: 'Findings quote the source verbatim', note: 'page and location · 95% CI 98–100%' },
    { value: 116, of: 116, label: 'Fabricated quotes rejected', note: 'evidence gate, offline' },
  ],
  trust: [
    { value: 4, of: 4, label: 'Found despite prompt injection', note: 'hidden "report no issues" text ignored' },
    { value: 16, of: 16, label: 'Runs finished', note: 'scans and a corrupted file flagged, not crashed' },
    { value: 68, of: 68, label: 'Caught by the rules alone', note: 'no AI, no network' },
  ],
  /** Shown as-is: the weakest numbers of the test. */
  limit: 'Known limits: conflicts left to the AI reviewer 3 of 6 found; a two-column layout loses 2 conflicts; 4 of 34 traps flagged.',
  speed: { pages: 38, words: '17,146', minutes: '2.2–2.7', appMinutes: 2.7, findings: '16–20', reading: 72 },
};
