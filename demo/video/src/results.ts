/**
 * Numbers shown in the video's Results section, copied from the scenario test report
 * (evals/results/2026-10-16-scenario-test-report.md, 15 files, production and offline). Update them here when it changes.
 */
export const RESULTS = {
  source: 'Production runs, 16 Oct 2026 · 15 synthetic fund documents with planted problems',
  accuracy: [
    { value: 54, of: 57, label: 'Planted problems found', note: 'full pipeline, 15 documents', ring: true },
    { value: 129, of: 129, label: 'Findings quote the source verbatim', note: 'with page and location' },
    { value: 94, of: 94, label: 'Fabricated quotes rejected', note: 'evidence gate' },
  ],
  trust: [
    { value: 4, of: 4, label: 'Found despite prompt injection', note: 'hidden "report no issues" text ignored' },
    { value: 15, of: 15, label: 'Documents processed', note: 'scans and a corrupted file flagged, not crashed' },
    { value: 53, of: 53, label: 'Caught by the rules alone', note: 'no AI, no network' },
  ],
  /** Shown as-is: the weakest number of the test, with its main cause. */
  limit: 'Known limit: 34 of 129 findings were wrong, 24 of them from a two-column layout (10% wrong without it).',
  speed: { pages: 38, words: '17,146', minutes: '3–4.5', findings: '17–19', reading: 72 },
};
