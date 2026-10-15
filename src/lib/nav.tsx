'use client';
import { createContext, useContext } from 'react';
import type { ScreenId } from './stages';

export interface Nav {
  screen: ScreenId;
  prev: ScreenId;
  go: (screen: ScreenId, versionId?: string | null) => void;
  zoom: number;
  /** Width of the design frame in design units (1536 at the reference aspect; wider windows get more). */
  frameWidth: number;
  notify: (message: string, tone?: 'info' | 'error') => void;
  /** Full-screen mode for the working area of a screen. */
  focus: boolean;
  toggleFocus: () => void;
}

export const NavCtx = createContext<Nav | null>(null);

export function useNav() {
  const nav = useContext(NavCtx);
  if (!nav) throw new Error('useNav outside provider');
  return nav;
}

/**
 * Horizontal mapping from the 1536-unit design to a wider frame: the rail and brand (x < 130) stay at the left edge,
 * controls past x = 1504 stay at the right edge, and the content area in between widens by --k.
 */
export const CONTENT_LEFT = 130;
export const CONTENT_RIGHT = 1504;
export const stretchFactor = (frameWidth: number) => 1 + (frameWidth - 1536) / (CONTENT_RIGHT - CONTENT_LEFT);
export const mapX = (x: number, frameWidth: number) =>
  x <= CONTENT_LEFT ? x : x >= CONTENT_RIGHT ? x + frameWidth - 1536 : CONTENT_LEFT + (x - CONTENT_LEFT) * stretchFactor(frameWidth);

export type Anchor = 'stretch' | 'center' | 'left' | 'right';

/**
 * Absolute box in design units. Wide boxes (≥ 250) stretch with the content area; narrow ones keep their size and
 * follow their centre; 'left'/'right' pin a box to the frame edge.
 */
export function box(x: number, y: number, w?: number, h?: number, anchor?: Anchor): React.CSSProperties {
  const a = anchor ?? (w === undefined ? 'stretch' : w >= 250 ? 'stretch' : 'center');
  const K = 'var(--k, 1)';
  const map = (u: number) => (u <= CONTENT_LEFT ? `${u}px` : `calc(${CONTENT_LEFT}px + ${u - CONTENT_LEFT}px * ${K})`);
  let left = map(x);
  let width = w === undefined ? 'auto' : `${w}px`;
  if (a === 'left') left = `${x}px`;
  else if (a === 'right') left = `calc(${x}px + var(--dw, 0px))`;
  else if (w !== undefined && a === 'stretch') width = x >= CONTENT_LEFT ? `calc(${w}px * ${K})` : `calc(${w}px + ${x + w - CONTENT_LEFT}px * (${K} - 1))`;
  else if (w !== undefined && a === 'center') left = `calc(${CONTENT_LEFT}px + ${x + w / 2 - CONTENT_LEFT}px * ${K} - ${w / 2}px)`;
  return {
    ['--l' as string]: left,
    // Full-screen mode moves a screen's working area up and stretches it vertically (--vk, --vb, set on the screen).
    ['--y' as string]: `calc(${y}px * var(--fvk, 1) + var(--fvb, 0px))`,
    ['--wd' as string]: width,
    ['--h' as string]: h === undefined ? 'auto' : `${h}px`,
    ['--yn' as string]: String(y),
    ['--hn' as string]: String(h ?? 0),
  };
}

/**
 * Vertical fit for full-screen mode. The working area starts at the first panel or kept toolbar (Fade keep) and is
 * stretched to fill the frame below the full-screen bar; the screen header above it (art, title, steps) is hidden.
 * Called with on = false it restores the header.
 */
export function focusFit(screen: HTMLElement, on = true) {
  const items = [...screen.children].filter((e): e is HTMLElement => e instanceof HTMLElement && e.style.getPropertyValue('--yn') !== '');
  for (const e of items) delete e.dataset.focusHidden;
  const num = (e: HTMLElement, v: string) => Number(e.style.getPropertyValue(v));
  const work = items.filter((e) => e.dataset.panel !== undefined || e.dataset.keep !== undefined);
  if (!on || !work.length) return null;
  const y0 = Math.min(...work.map((e) => num(e, '--yn')));
  // The screen's own step bar is replaced by the one in the full-screen bar.
  for (const e of items) if ((num(e, '--yn') < y0 && e.dataset.keep === undefined) || e.dataset.chrome !== undefined) e.dataset.focusHidden = '';
  const shown = items.filter((e) => e.dataset.focusHidden === undefined);
  const y1 = Math.max(...shown.filter((e) => num(e, '--yn') >= y0).map((e) => num(e, '--yn') + Math.max(num(e, '--hn'), 40)));
  const TOP = 84; // below the full-screen bar (steps, previous / next, guide, exit)
  const BOTTOM = 1008;
  const vk = Math.min(2, (BOTTOM - TOP) / Math.max(1, y1 - y0));
  return { vk, vb: TOP - y0 * vk };
}
