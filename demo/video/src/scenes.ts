import manifest from '../public/shots/manifest.json';

/** Camera keyframe: frame within the scene, focus point in 1920 × 1080 screen pixels, zoom. */
export interface Cam {
  f: number;
  x: number;
  y: number;
  z: number;
}
/** Cursor waypoint; click = the mouse clicks when it arrives. */
export interface Point {
  f: number;
  x: number;
  y: number;
  click?: boolean;
}
export interface Caption {
  from: number;
  to?: number;
  kicker: string;
  title: string;
}
export interface Scene {
  id: string;
  /** Length in beats (120 BPM: one beat = 15 frames), so every cut lands on the beat. */
  beats: number;
  layers?: { img: string; from: number }[];
  cam?: Cam[];
  cursor?: Point[];
  captions?: Caption[];
}

export const FPS = 30;
export const BEAT = 15;
export const TRANSITION = 8;

type Shots = typeof manifest.shots;
/** Centre of a captured element (from capture.mjs) in screen pixels. */
const t = (shot: keyof Shots | string, key: string) => {
  const target = ((manifest.shots as Record<string, { targets: Record<string, { x: number; y: number } | null> }>)[shot]?.targets ?? {})[key];
  if (!target) throw new Error(`No target ${String(shot)}.${key}`);
  return target;
};
// Fixed layout positions at the 1920 × 1080 capture size (panels are where the app's design places them).
const P = {
  leftList: { x: 377, y: 600 },
  middle: { x: 933, y: 660 },
  right: { x: 1601, y: 640 },
  modal: { x: 960, y: 530 },
};
const b = (n: number) => n * BEAT; // beats → frames within a scene

export const SCENES: Scene[] = [
  { id: 'title', beats: 8 },
  {
    id: 'hub',
    beats: 6,
    layers: [{ img: 'hub', from: 0 }, { img: 'hub-hover', from: b(3) }],
    cam: [{ f: 0, x: 960, y: 540, z: 1.08 }, { f: b(6), x: 1180, y: 430, z: 1.3 }],
    cursor: [{ f: 4, x: 760, y: 860 }, { f: b(3) - 4, x: t('hub', 'review').x, y: t('hub', 'review').y + 30 }],
    captions: [{ from: 6, kicker: 'Anduin Legal Reviewer', title: 'Nine steps from contract to verified PDF' }],
  },
  {
    id: 'guide',
    beats: 4,
    layers: [{ img: 'guide', from: 0 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1 }, { f: b(2), x: P.modal.x, y: P.modal.y, z: 1.35 }],
    captions: [{ from: 4, kicker: 'Built-in guide', title: '"How to use" on every screen' }],
  },
  {
    id: 'intake',
    beats: 6,
    layers: [{ img: 'intake', from: 0 }, { img: 'intake-running', from: b(2) + 4 }, { img: 'intake-done', from: b(4) + 4 }],
    cam: [
      { f: 0, x: 760, y: 640, z: 1.25 },
      { f: b(2), x: 760, y: 640, z: 1.3 },
      { f: b(2) + 14, x: t('intake-running', 'status').x, y: t('intake-running', 'status').y + 100, z: 1.5 },
      { f: b(6), x: t('intake-running', 'status').x, y: t('intake-running', 'status').y + 110, z: 1.55 },
    ],
    cursor: [{ f: 2, x: 1000, y: 860 }, { f: b(2), x: t('intake', 'demo').x, y: t('intake', 'demo').y, click: true }, { f: b(3), x: 1150, y: 820 }],
    captions: [{ from: 4, kicker: '01 · Intake', title: 'Drop a Word or PDF file. Six checks run on their own.' }],
  },
  {
    id: 'source',
    beats: 6,
    layers: [{ img: 'source', from: 0 }],
    cam: [
      { f: 0, x: 960, y: 540, z: 1.05 },
      { f: b(1), x: 540, y: 640, z: 1.4 },
      { f: b(3), x: 1140, y: 640, z: 1.4 },
      { f: b(5), x: 1650, y: 560, z: 1.6 },
    ],
    captions: [{ from: 4, kicker: '02 · Source quality', title: 'Word becomes PDF, checked word for word' }],
  },
  {
    id: 'source-fonts',
    beats: 4,
    layers: [{ img: 'source-fonts', from: 0 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1.1 }, { f: b(2), x: 812, y: 600, z: 1.45 }],
    cursor: [{ f: 0, x: 600, y: 520 }, { f: 10, x: t('source', 'fonts').x, y: t('source', 'fonts').y, click: true }],
    captions: [{ from: 4, kicker: '02 · Source quality', title: 'Declared fonts against embedded fonts' }],
  },
  {
    id: 'map-outline',
    beats: 5,
    layers: [{ img: 'map-outline', from: 0 }],
    cam: [{ f: 0, x: 342, y: 620, z: 1.45 }, { f: b(2), x: 342, y: 620, z: 1.5 }, { f: b(3) + 10, x: P.right.x, y: 640, z: 1.45 }],
    cursor: [{ f: 0, x: 500, y: 700 }, { f: 12, x: t('map-outline', 'section').x, y: t('map-outline', 'section').y, click: true }],
    captions: [{ from: 4, kicker: '03 · Document map', title: 'Every section, with its findings' }],
  },
  {
    id: 'map-graph',
    beats: 4,
    layers: [{ img: 'map-graph', from: 0 }],
    cam: [{ f: 0, x: 933, y: 640, z: 1.2 }, { f: b(4), x: 933, y: 720, z: 1.55 }],
    cursor: [{ f: 0, x: 700, y: 500 }, { f: 10, x: t('map-graph', 'tab').x, y: t('map-graph', 'tab').y, click: true }],
    captions: [{ from: 4, kicker: '03 · Document map', title: 'References and conflicts, connected' }],
  },
  {
    id: 'map-pages',
    beats: 3,
    layers: [{ img: 'map-pages', from: 0 }],
    cam: [{ f: 0, x: 933, y: 660, z: 1.25 }, { f: b(3), x: 933, y: 700, z: 1.45 }],
    cursor: [{ f: 0, x: 760, y: 420 }, { f: 9, x: t('map-pages', 'tab').x, y: t('map-pages', 'tab').y, click: true }],
    captions: [{ from: 3, kicker: '03 · Document map', title: 'Page by page' }],
  },
  {
    id: 'review',
    beats: 6,
    layers: [{ img: 'review', from: 0 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1.1 }, { f: b(1), x: t('review', 'quote').x, y: t('review', 'quote').y + 40, z: 2.1 }, { f: b(6), x: t('review', 'quote').x, y: t('review', 'quote').y + 40, z: 2.2 }],
    captions: [{ from: 4, kicker: '04 · Legal review', title: 'Every finding quotes its exact source' }],
  },
  {
    id: 'review-filter',
    beats: 4,
    layers: [{ img: 'review', from: 0 }, { img: 'review-filter', from: 14 }],
    cam: [{ f: 0, x: P.leftList.x, y: 560, z: 1.55 }, { f: b(4), x: P.leftList.x, y: 560, z: 1.6 }],
    cursor: [{ f: 0, x: 500, y: 640 }, { f: 12, x: t('review-filter', 'chip').x, y: t('review-filter', 'chip').y, click: true }],
    captions: [{ from: 4, kicker: '04 · Legal review', title: 'Typos · references · contradictions · ambiguities · terms' }],
  },
  {
    id: 'review-dismiss',
    beats: 5,
    layers: [{ img: 'review', from: 0 }, { img: 'review-dismiss', from: 14 }],
    cam: [{ f: 0, x: 1500, y: 800, z: 1.35 }, { f: 16, x: P.modal.x, y: 540, z: 1.4 }, { f: b(5), x: P.modal.x, y: 560, z: 1.45 }],
    cursor: [{ f: 0, x: 1400, y: 960 }, { f: 12, x: t('review-dismiss', 'open').x, y: t('review-dismiss', 'open').y, click: true }, { f: b(4), x: t('review-dismiss', 'submit').x, y: t('review-dismiss', 'submit').y, click: true }],
    captions: [{ from: 4, kicker: '04 · Legal review', title: 'Dismiss with a reason, and teach later reviews' }],
  },
  {
    id: 'review-clarify',
    beats: 4,
    layers: [{ img: 'review-clarify', from: 0 }],
    cam: [{ f: 0, x: P.modal.x, y: 540, z: 1.25 }, { f: b(4), x: P.modal.x, y: 520, z: 1.45 }],
    captions: [{ from: 3, kicker: '04 · Legal review', title: 'Or turn it into a question for counsel' }],
  },
  {
    id: 'review-confirmed',
    beats: 4,
    layers: [{ img: 'review', from: 0 }, { img: 'review-confirmed', from: 16 }],
    cam: [{ f: 0, x: 1500, y: 780, z: 1.35 }, { f: b(4), x: 1500, y: 780, z: 1.4 }],
    cursor: [{ f: 0, x: 1300, y: 960 }, { f: 14, x: t('review-confirmed', 'confirm').x, y: t('review-confirmed', 'confirm').y, click: true }],
    captions: [{ from: 3, kicker: '04 · Legal review', title: 'Confirm. Nothing is resolved without you.' }],
  },
  {
    id: 'report',
    beats: 6,
    layers: [{ img: 'report', from: 0 }],
    cam: [
      { f: 0, x: t('report', 'outcome').x, y: t('report', 'outcome').y + 20, z: 1.7 },
      { f: b(2), x: t('report', 'outcome').x, y: t('report', 'outcome').y + 20, z: 1.7 },
      { f: b(3), x: t('report', 'questions').x, y: t('report', 'questions').y + 120, z: 1.45 },
      { f: b(6), x: t('report', 'questions').x, y: t('report', 'questions').y + 300, z: 1.45 },
    ],
    captions: [{ from: 4, kicker: '05 · Decision / report', title: 'Outcome, next step and questions for counsel' }],
  },
  {
    id: 'compare',
    beats: 6,
    layers: [{ img: 'report', from: 0 }, { img: 'compare', from: 16 }, { img: 'compare-resolved', from: b(4) + 6 }],
    cam: [{ f: 0, x: 1500, y: 300, z: 1.3 }, { f: 18, x: P.modal.x, y: 520, z: 1.35 }, { f: b(6), x: P.modal.x, y: 560, z: 1.45 }],
    cursor: [{ f: 0, x: 1500, y: 420 }, { f: 12, x: t('compare', 'open').x, y: t('compare', 'open').y, click: true }, { f: b(4), x: t('compare', 'resolve').x, y: t('compare', 'resolve').y, click: true }],
    captions: [{ from: 4, kicker: 'Revision v2', title: 'Upload the fix. Missing findings are proposed as resolved.' }],
  },
  {
    id: 'annotation',
    beats: 6,
    layers: [{ img: 'annotation', from: 0 }],
    cam: [{ f: 0, x: 760, y: 600, z: 1.2 }, { f: b(1), x: t('annotation', 'types').x, y: t('annotation', 'types').y + 280, z: 1.6 }, { f: b(4), x: P.right.x, y: 560, z: 1.5 }],
    cursor: [{ f: b(3), x: 1500, y: 700 }, { f: b(4), x: t('annotation', 'next').x, y: t('annotation', 'next').y, click: true }],
    captions: [{ from: 4, kicker: '06 · Annotation', title: 'Four field types, anchored to the exact page' }],
  },
  {
    id: 'annotation-draw',
    beats: 4,
    layers: [{ img: 'annotation', from: 0 }, { img: 'annotation-draw', from: 14 }],
    cam: [{ f: 0, x: t('annotation-draw', 'draw').x, y: t('annotation-draw', 'draw').y + 120, z: 1.6 }, { f: b(4), x: 900, y: 650, z: 1.45 }],
    cursor: [{ f: 0, x: 900, y: 600 }, { f: 12, x: t('annotation-draw', 'draw').x, y: t('annotation-draw', 'draw').y, click: true }],
    captions: [{ from: 3, kicker: '06 · Annotation', title: 'Draw, move and resize any region' }],
  },
  {
    id: 'form',
    beats: 6,
    layers: [{ img: 'form', from: 0 }, { img: 'form-help', from: b(2) + 6 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1.1 }, { f: b(2), x: 1100, y: 520, z: 1.5 }, { f: b(6), x: 1100, y: 560, z: 1.55 }],
    cursor: [{ f: 4, x: 900, y: 700 }, { f: b(2), x: t('form', 'help').x, y: t('form', 'help').y, click: true }],
    captions: [{ from: 4, kicker: '07 · Form preview', title: 'The full contract as a form, with plain-language help' }],
  },
  {
    id: 'html-form',
    beats: 6,
    layers: [{ img: 'form', from: 0 }, { img: 'html-form', from: 18 }, { img: 'html-form-next', from: b(4) }],
    cam: [{ f: 0, x: t('form', 'export').x, y: t('form', 'export').y - 100, z: 1.5 }, { f: 20, x: 960, y: 540, z: 1.05 }, { f: b(4), x: 960, y: 470, z: 1.2 }, { f: b(6), x: 900, y: 420, z: 1.3 }],
    cursor: [{ f: 0, x: 1400, y: 820 }, { f: 12, x: t('form', 'export').x, y: t('form', 'export').y, click: true }, { f: b(3) + 10, x: t('html-form', 'next').x, y: t('html-form', 'next').y, click: true }],
    captions: [{ from: 22, kicker: 'Shareable form', title: 'Export it. Anyone can fill it in a browser.' }],
  },
  {
    id: 'responses',
    beats: 4,
    layers: [{ img: 'responses', from: 0 }],
    cam: [{ f: 0, x: 702, y: 660, z: 1.4 }, { f: b(4), x: 1500, y: 860, z: 1.35 }],
    cursor: [{ f: 8, x: 1300, y: 800 }, { f: b(3), x: t('responses', 'create').x, y: t('responses', 'create').y, click: true }],
    captions: [{ from: 3, kicker: '08 · Responses', title: 'Answers validated and bound to this version' }],
  },
  {
    id: 'export-clipped',
    beats: 5,
    layers: [{ img: 'export-clipped', from: 0 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1.1 }, { f: b(1), x: 1560, y: 520, z: 1.55 }, { f: b(5), x: 1560, y: 600, z: 1.6 }],
    captions: [{ from: 4, kicker: '09 · PDF QA', title: 'The filled PDF is re-read: a clipped answer is caught' }],
  },
  {
    id: 'export',
    beats: 6,
    layers: [{ img: 'export', from: 0 }],
    cam: [{ f: 0, x: t('export', 'checks').x, y: t('export', 'checks').y + 90, z: 1.55 }, { f: b(2), x: t('export', 'checks').x, y: t('export', 'checks').y + 90, z: 1.55 }, { f: b(4), x: t('export', 'final').x, y: t('export', 'final').y, z: 1.45 }],
    cursor: [{ f: b(3), x: 1400, y: 700 }, { f: b(4) + 6, x: t('export', 'final').x, y: t('export', 'final').y, click: true }],
    captions: [{ from: 4, kicker: '09 · PDF QA / export', title: 'Fixed, every check passed, final PDF exported' }],
  },
  {
    id: 'feedback',
    beats: 5,
    layers: [{ img: 'feedback', from: 0 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1.1 }, { f: b(2), x: 1285, y: 560, z: 1.45 }, { f: b(5), x: 1285, y: 620, z: 1.5 }],
    captions: [{ from: 4, kicker: 'Memory', title: 'Every decision is kept and guides later reviews' }],
  },
  {
    id: 'templates',
    beats: 4,
    layers: [{ img: 'templates', from: 0 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1.1 }, { f: b(4), x: 1296, y: 560, z: 1.4 }],
    captions: [{ from: 3, kicker: 'Templates', title: 'Approved field structures, reused for new versions' }],
  },
  {
    id: 'full',
    beats: 6,
    layers: [{ img: 'review', from: 0 }, { img: 'review-full', from: 16 }, { img: 'full-next', from: b(4) + 4 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1.12 }, { f: 18, x: 960, y: 540, z: 1 }, { f: b(6), x: 960, y: 540, z: 1.05 }],
    cursor: [{ f: 0, x: 800, y: 300 }, { f: 12, x: t('review-full', 'full').x, y: t('review-full', 'full').y, click: true }, { f: b(4), x: t('review-full', 'next').x, y: t('review-full', 'next').y, click: true }],
    captions: [{ from: 18, kicker: 'Full screen', title: 'A focused workspace with step-by-step navigation' }],
  },
  {
    id: 'dark',
    beats: 5,
    layers: [{ img: 'dark-hub', from: 0 }, { img: 'dark-review', from: b(2) + 4 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1.04 }, { f: b(5), x: 960, y: 540, z: 1.15 }],
    captions: [{ from: 4, kicker: 'Light and dark', title: 'Designed for long review sessions' }],
  },
  { id: 'end', beats: 8 },
];

export const durOf = (s: Scene) => s.beats * BEAT + TRANSITION;
export const TOTAL = SCENES.reduce((sum, s) => sum + durOf(s), 0) - TRANSITION * (SCENES.length - 1);
/** Start frame of each scene in the final timeline: on the beat grid, because each scene is beats × 15 + the transition. */
export const STARTS = SCENES.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SCENES[i - 1].beats * BEAT], []);
