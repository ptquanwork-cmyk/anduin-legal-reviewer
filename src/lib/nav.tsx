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
    ['--y' as string]: `${y}px`,
    ['--wd' as string]: width,
    ['--h' as string]: h === undefined ? 'auto' : `${h}px`,
  };
}
