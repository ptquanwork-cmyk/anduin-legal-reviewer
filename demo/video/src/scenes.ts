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
export interface Scene {
  id: string;
  kind: 'title' | 'results' | 'speed' | 'chapter' | 'shot' | 'end';
  dur: number;
  /** Section number (1–6) a shot or chapter card belongs to. */
  section?: number;
  layers?: { img: string; from: number }[];
  cam?: Cam[];
  cursor?: Point[];
  /** One short line explaining the step. */
  caption?: string;
}

export const FPS = 30;
export const TRANSITION = 12;

export const SECTIONS = [
  { n: 1, title: 'Upload & check the source', blurb: 'Word or PDF in, verified text out' },
  { n: 2, title: 'Review with evidence', blurb: 'Every finding quotes its source' },
  { n: 3, title: 'Decide & report', blurb: 'You confirm, dismiss or ask counsel' },
  { n: 4, title: 'Digitize the form', blurb: 'Four field types, full contract text' },
  { n: 5, title: 'Verify & export', blurb: 'The filled PDF is checked before export' },
  { n: 6, title: 'Memory & workspace', blurb: 'Decisions remembered, help on every screen' },
];

type Shots = typeof manifest.shots;
const t = (shot: keyof Shots | string, key: string) => {
  const target = ((manifest.shots as Record<string, { targets: Record<string, { x: number; y: number } | null> }>)[shot]?.targets ?? {})[key];
  if (!target) throw new Error(`No target ${String(shot)}.${key}`);
  return target;
};
const MODAL = { x: 960, y: 530 };
const s = (n: number) => Math.round(n * FPS); // seconds → frames

const chapter = (n: number): Scene => ({ id: `chapter-${n}`, kind: 'chapter', section: n, dur: s(2.5) });

export const SCENES: Scene[] = [
  { id: 'title', kind: 'title', dur: s(4) },
  { id: 'results', kind: 'results', dur: s(7) },
  { id: 'speed', kind: 'speed', dur: s(5) },

  chapter(1),
  {
    id: 'intake',
    kind: 'shot',
    section: 1,
    dur: s(5.5),
    layers: [{ img: 'intake', from: 0 }, { img: 'intake-running', from: s(1.6) }, { img: 'intake-done', from: s(3.4) }],
    cam: [{ f: 0, x: 760, y: 640, z: 1.2 }, { f: s(1.4), x: 760, y: 640, z: 1.25 }, { f: s(2.4), x: t('intake-running', 'status').x, y: t('intake-running', 'status').y + 100, z: 1.4 }],
    cursor: [{ f: 4, x: 1000, y: 860 }, { f: s(1.3), x: t('intake', 'demo').x, y: t('intake', 'demo').y, click: true }, { f: s(2.2), x: 1150, y: 820 }],
    caption: 'Drop a Word or PDF file. Six checks run automatically.',
  },
  {
    id: 'source',
    kind: 'shot',
    section: 1,
    dur: s(4.5),
    layers: [{ img: 'source', from: 0 }],
    cam: [{ f: 0, x: 960, y: 560, z: 1.05 }, { f: s(1.5), x: 820, y: 640, z: 1.3 }, { f: s(4.5), x: 1100, y: 640, z: 1.32 }],
    caption: 'The Word file becomes a PDF, checked word for word.',
  },

  chapter(2),
  {
    id: 'map',
    kind: 'shot',
    section: 2,
    dur: s(4),
    layers: [{ img: 'map-graph', from: 0 }],
    cam: [{ f: 0, x: 960, y: 560, z: 1.05 }, { f: s(4), x: 933, y: 700, z: 1.4 }],
    caption: 'See how sections, references and conflicts connect.',
  },
  {
    id: 'review',
    kind: 'shot',
    section: 2,
    dur: s(4.5),
    layers: [{ img: 'review', from: 0 }],
    cam: [{ f: 0, x: 960, y: 560, z: 1.05 }, { f: s(2), x: t('review', 'quote').x, y: t('review', 'quote').y + 40, z: 1.8 }, { f: s(4.5), x: t('review', 'quote').x, y: t('review', 'quote').y + 40, z: 1.85 }],
    caption: 'Each finding highlights the exact passage and page.',
  },
  {
    id: 'review-dismiss',
    kind: 'shot',
    section: 2,
    dur: s(4.5),
    layers: [{ img: 'review', from: 0 }, { img: 'review-dismiss', from: s(1) }],
    cam: [{ f: 0, x: 1480, y: 800, z: 1.3 }, { f: s(1.3), x: MODAL.x, y: 540, z: 1.35 }, { f: s(4.5), x: MODAL.x, y: 550, z: 1.4 }],
    cursor: [{ f: 0, x: 1400, y: 960 }, { f: s(0.8), x: t('review-dismiss', 'open').x, y: t('review-dismiss', 'open').y, click: true }, { f: s(3.4), x: t('review-dismiss', 'submit').x, y: t('review-dismiss', 'submit').y, click: true }],
    caption: 'Dismiss with a reason, and keep it as an example for later reviews.',
  },

  chapter(3),
  {
    id: 'report',
    kind: 'shot',
    section: 3,
    dur: s(4.5),
    layers: [{ img: 'report', from: 0 }],
    cam: [{ f: 0, x: 960, y: 560, z: 1.05 }, { f: s(1.5), x: t('report', 'outcome').x, y: t('report', 'outcome').y + 30, z: 1.5 }, { f: s(3), x: t('report', 'questions').x, y: t('report', 'questions').y + 160, z: 1.35 }],
    caption: 'One outcome, the next step, and questions for counsel.',
  },
  {
    id: 'compare',
    kind: 'shot',
    section: 3,
    dur: s(5),
    layers: [{ img: 'report', from: 0 }, { img: 'compare', from: s(1) }, { img: 'compare-resolved', from: s(3.4) }],
    cam: [{ f: 0, x: 1500, y: 320, z: 1.25 }, { f: s(1.3), x: MODAL.x, y: 520, z: 1.3 }, { f: s(5), x: MODAL.x, y: 560, z: 1.38 }],
    cursor: [{ f: 0, x: 1500, y: 420 }, { f: s(0.8), x: t('compare', 'open').x, y: t('compare', 'open').y, click: true }, { f: s(3.2), x: t('compare', 'resolve').x, y: t('compare', 'resolve').y, click: true }],
    caption: 'Upload the revision: fixed findings are proposed as resolved.',
  },

  chapter(4),
  {
    id: 'annotation',
    kind: 'shot',
    section: 4,
    dur: s(4.5),
    layers: [{ img: 'annotation', from: 0 }],
    cam: [{ f: 0, x: 960, y: 560, z: 1.05 }, { f: s(1.6), x: 760, y: 680, z: 1.45 }, { f: s(4.5), x: 1100, y: 600, z: 1.3 }],
    caption: 'Paragraph, text box, radio and checkbox, anchored to the page.',
  },
  {
    id: 'html-form',
    kind: 'shot',
    section: 4,
    dur: s(5),
    layers: [{ img: 'form', from: 0 }, { img: 'html-form', from: s(1.2) }, { img: 'html-form-next', from: s(3.2) }],
    cam: [{ f: 0, x: t('form', 'export').x, y: t('form', 'export').y - 100, z: 1.35 }, { f: s(1.4), x: 960, y: 540, z: 1.02 }, { f: s(5), x: 920, y: 450, z: 1.2 }],
    cursor: [{ f: 0, x: 1400, y: 820 }, { f: s(0.8), x: t('form', 'export').x, y: t('form', 'export').y, click: true }, { f: s(2.9), x: t('html-form', 'next').x, y: t('html-form', 'next').y, click: true }],
    caption: 'Export a fillable form anyone can complete in a browser.',
  },

  chapter(5),
  {
    id: 'export-clipped',
    kind: 'shot',
    section: 5,
    dur: s(4.5),
    layers: [{ img: 'export-clipped', from: 0 }],
    cam: [{ f: 0, x: 960, y: 560, z: 1.05 }, { f: s(1.5), x: 1560, y: 560, z: 1.45 }, { f: s(4.5), x: 1560, y: 620, z: 1.5 }],
    caption: 'The filled PDF is read back: a clipped answer is caught.',
  },
  {
    id: 'export',
    kind: 'shot',
    section: 5,
    dur: s(4.5),
    layers: [{ img: 'export', from: 0 }],
    cam: [{ f: 0, x: t('export', 'checks').x, y: t('export', 'checks').y + 90, z: 1.45 }, { f: s(1.8), x: t('export', 'checks').x, y: t('export', 'checks').y + 90, z: 1.45 }, { f: s(3), x: t('export', 'final').x, y: t('export', 'final').y, z: 1.35 }],
    cursor: [{ f: s(2.2), x: 1400, y: 700 }, { f: s(3.3), x: t('export', 'final').x, y: t('export', 'final').y, click: true }],
    caption: 'Fixed, every check passed, final PDF exported.',
  },

  chapter(6),
  {
    id: 'feedback',
    kind: 'shot',
    section: 6,
    dur: s(4),
    layers: [{ img: 'feedback', from: 0 }],
    cam: [{ f: 0, x: 960, y: 560, z: 1.05 }, { f: s(4), x: 1285, y: 600, z: 1.4 }],
    caption: 'Every decision is kept and guides later reviews.',
  },
  {
    id: 'guide',
    kind: 'shot',
    section: 6,
    dur: s(3.5),
    layers: [{ img: 'guide', from: 0 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1.02 }, { f: s(3.5), x: MODAL.x, y: MODAL.y, z: 1.3 }],
    caption: 'A step-by-step guide on every screen.',
  },
  {
    id: 'full',
    kind: 'shot',
    section: 6,
    dur: s(4),
    layers: [{ img: 'review', from: 0 }, { img: 'review-full', from: s(1) }],
    cam: [{ f: 0, x: 960, y: 540, z: 1.08 }, { f: s(1.2), x: 960, y: 540, z: 1 }, { f: s(4), x: 960, y: 540, z: 1.03 }],
    cursor: [{ f: 0, x: 800, y: 300 }, { f: s(0.7), x: t('review-full', 'full').x, y: t('review-full', 'full').y, click: true }],
    caption: 'Full-screen workspace, with steps 01–09 one click away.',
  },
  { id: 'end', kind: 'end', dur: s(5) },
];

export const TOTAL = SCENES.reduce((sum, x) => sum + x.dur, 0) - TRANSITION * (SCENES.length - 1);
export const STARTS = SCENES.reduce<number[]>((acc, x, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SCENES[i - 1].dur - TRANSITION], []);
