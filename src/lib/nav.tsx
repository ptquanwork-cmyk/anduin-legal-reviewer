'use client';
import { createContext, useContext } from 'react';
import type { ScreenId } from './stages';

export interface Nav {
  screen: ScreenId;
  prev: ScreenId;
  go: (screen: ScreenId, versionId?: string | null) => void;
  zoom: number;
  mobile: boolean;
  notify: (message: string, tone?: 'info' | 'error') => void;
}

export const NavCtx = createContext<Nav | null>(null);

export function useNav() {
  const nav = useContext(NavCtx);
  if (!nav) throw new Error('useNav outside provider');
  return nav;
}

/** Absolute box in the 1536 × 1024 design frame. Collapses to normal flow on narrow screens (see .abs). */
export function box(x: number, y: number, w?: number, h?: number): React.CSSProperties {
  return {
    ['--x' as string]: `${x}px`,
    ['--y' as string]: `${y}px`,
    ['--w' as string]: w === undefined ? 'auto' : `${w}px`,
    ['--h' as string]: h === undefined ? 'auto' : `${h}px`,
  };
}
