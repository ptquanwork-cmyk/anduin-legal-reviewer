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
  dur: number;
  layers?: { img: string; from: number }[];
  cam?: Cam[];
  cursor?: Point[];
  captions?: Caption[];
}

type Shots = typeof manifest.shots;
/** Centre of a captured element (from capture.mjs) in screen pixels. */
const t = <S extends keyof Shots>(shot: S, key: string) => {
  const target = (manifest.shots[shot].targets as Record<string, { x: number; y: number } | null>)[key];
  if (!target) throw new Error(`No target ${String(shot)}.${key}`);
  return target;
};

const demo = t('intake', 'demo');
const status = t('intake-running', 'status');
const confirm = t('review', 'confirm');
const quote = t('review', 'quote');
const outcome = t('report', 'outcome');
const exportReport = t('report', 'export');
const exportHtml = t('form', 'export');
const create = t('responses', 'create');
const final = t('export', 'final');
const checks = t('export', 'checks');
const station = t('hub', 'review');
const fullButton = t('review', 'full');

export const FPS = 30;
export const TRANSITION = 15;

export const SCENES: Scene[] = [
  { id: 'title', dur: 150 },
  {
    id: 'hub',
    dur: 150,
    layers: [{ img: 'hub', from: 0 }, { img: 'hub-hover', from: 78 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1 }, { f: 150, x: 1180, y: 430, z: 1.22 }],
    cursor: [{ f: 10, x: 760, y: 860 }, { f: 75, x: station.x, y: station.y + 30 }],
    captions: [{ from: 12, kicker: 'Anduin Legal Reviewer', title: 'Nine steps from contract to verified PDF' }],
  },
  {
    id: 'intake',
    dur: 210,
    layers: [{ img: 'intake', from: 0 }, { img: 'intake-running', from: 62 }, { img: 'intake-done', from: 150 }],
    cam: [
      { f: 0, x: 960, y: 540, z: 1 },
      { f: 40, x: 760, y: 640, z: 1.3 },
      { f: 70, x: 760, y: 640, z: 1.3 },
      { f: 105, x: status.x, y: status.y + 90, z: 1.4 },
      { f: 210, x: status.x, y: status.y + 110, z: 1.42 },
    ],
    cursor: [{ f: 5, x: 1100, y: 900 }, { f: 48, x: demo.x, y: demo.y, click: true }, { f: 95, x: 1150, y: 820 }],
    captions: [{ from: 10, kicker: '01 · Intake', title: 'Upload Word or PDF. Checks start on their own.' }],
  },
  {
    id: 'source',
    dur: 180,
    layers: [{ img: 'source', from: 0 }],
    cam: [
      { f: 0, x: 960, y: 540, z: 1 },
      { f: 35, x: 560, y: 640, z: 1.35 },
      { f: 80, x: 560, y: 640, z: 1.35 },
      { f: 115, x: 1150, y: 640, z: 1.35 },
      { f: 140, x: 1150, y: 640, z: 1.35 },
      { f: 178, x: 1640, y: 560, z: 1.55 },
    ],
    captions: [{ from: 10, kicker: '02 · Source quality', title: 'Word rendered to PDF and checked word for word' }],
  },
  {
    id: 'map',
    dur: 150,
    layers: [{ img: 'map', from: 0 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1 }, { f: 55, x: 933, y: 720, z: 1.4 }, { f: 150, x: 933, y: 720, z: 1.48 }],
    captions: [{ from: 10, kicker: '03 · Document map', title: 'Every section, reference and definition, connected' }],
  },
  {
    id: 'review',
    dur: 240,
    layers: [{ img: 'review', from: 0 }, { img: 'review-confirmed', from: 178 }],
    cam: [
      { f: 0, x: 960, y: 540, z: 1 },
      { f: 40, x: quote.x, y: quote.y, z: 1.9 },
      { f: 110, x: quote.x, y: quote.y, z: 1.95 },
      { f: 150, x: 1480, y: 760, z: 1.3 },
      { f: 240, x: 1480, y: 760, z: 1.32 },
    ],
    cursor: [{ f: 128, x: 1180, y: 920 }, { f: 168, x: confirm.x, y: confirm.y, click: true }, { f: 215, x: 1500, y: 960 }],
    captions: [
      { from: 10, to: 122, kicker: '04 · Legal review', title: 'Every finding quotes its exact source' },
      { from: 128, kicker: '04 · Legal review', title: 'You decide: confirm, dismiss or ask counsel' },
    ],
  },
  {
    id: 'report',
    dur: 180,
    layers: [{ img: 'report', from: 0 }],
    cam: [
      { f: 0, x: 960, y: 540, z: 1 },
      { f: 40, x: outcome.x, y: outcome.y + 20, z: 1.6 },
      { f: 90, x: outcome.x, y: outcome.y + 20, z: 1.6 },
      { f: 130, x: 1620, y: 860, z: 1.35 },
      { f: 180, x: 1620, y: 860, z: 1.36 },
    ],
    cursor: [{ f: 100, x: 1300, y: 720 }, { f: 140, x: exportReport.x, y: exportReport.y, click: true }],
    captions: [{ from: 10, kicker: '05 · Decision / report', title: 'Questions for counsel and a report, ready to share' }],
  },
  {
    id: 'annotation',
    dur: 180,
    layers: [{ img: 'annotation', from: 0 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1 }, { f: 50, x: 760, y: 760, z: 1.55 }, { f: 180, x: 760, y: 700, z: 1.62 }],
    captions: [{ from: 10, kicker: '06 · Annotation', title: 'Four field types, anchored to the exact page' }],
  },
  {
    id: 'form',
    dur: 150,
    layers: [{ img: 'form', from: 0 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1 }, { f: 60, x: 1300, y: 800, z: 1.3 }, { f: 150, x: 1340, y: 820, z: 1.34 }],
    cursor: [{ f: 30, x: 1100, y: 700 }, { f: 85, x: exportHtml.x, y: exportHtml.y, click: true }],
    captions: [{ from: 10, kicker: '07 · Form preview', title: 'The full contract as a form, exported in one click' }],
  },
  {
    id: 'html',
    dur: 120,
    layers: [{ img: 'html-form', from: 0 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1 }, { f: 120, x: 960, y: 470, z: 1.15 }],
    captions: [{ from: 8, kicker: 'Shareable form', title: 'Anyone can fill it in a browser' }],
  },
  {
    id: 'responses',
    dur: 90,
    layers: [{ img: 'responses', from: 0 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1 }, { f: 90, x: 1450, y: 800, z: 1.25 }],
    cursor: [{ f: 15, x: 1300, y: 760 }, { f: 58, x: create.x, y: create.y, click: true }],
    captions: [{ from: 8, kicker: '08 · Responses', title: 'Answers bound to this exact version' }],
  },
  {
    id: 'export',
    dur: 180,
    layers: [{ img: 'export', from: 0 }, { img: 'export-final', from: 150 }],
    cam: [
      { f: 0, x: 960, y: 540, z: 1 },
      { f: 40, x: checks.x, y: checks.y + 90, z: 1.45 },
      { f: 100, x: checks.x, y: checks.y + 90, z: 1.45 },
      { f: 135, x: 1700, y: 820, z: 1.35 },
      { f: 180, x: 1700, y: 820, z: 1.36 },
    ],
    cursor: [{ f: 100, x: 1380, y: 700 }, { f: 140, x: final.x, y: final.y, click: true }],
    captions: [{ from: 10, kicker: '09 · PDF QA / export', title: 'The filled PDF is re-read and checked before export' }],
  },
  {
    id: 'full',
    dur: 120,
    layers: [{ img: 'review', from: 0 }, { img: 'review-full', from: 28 }],
    cam: [{ f: 0, x: 960, y: 540, z: 1.12 }, { f: 30, x: 960, y: 540, z: 1 }, { f: 120, x: 960, y: 540, z: 1.04 }],
    cursor: [{ f: 0, x: 900, y: 300 }, { f: 22, x: fullButton.x, y: fullButton.y, click: true }],
    captions: [{ from: 34, kicker: 'Full screen', title: 'A focused workspace, step by step' }],
  },
  { id: 'end', dur: 150 },
];

export const TOTAL = SCENES.reduce((s, x) => s + x.dur, 0) - TRANSITION * (SCENES.length - 1);
/** Start frame of each scene in the final timeline (scenes overlap by the transition). */
export const STARTS = SCENES.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SCENES[i - 1].dur - TRANSITION], []);
