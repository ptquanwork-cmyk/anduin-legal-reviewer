'use client';
import { mapX, useNav } from '../../lib/nav';

/** Rounded outer shell with the concave toolbar notch from the approved design, stretched to the window width. */
export function ShellFrame() {
  const { frameWidth: W } = useNav();
  const n1 = mapX(492, W); // notch starts
  const n4 = mapX(1038, W); // notch ends
  const inner = `M 96 68 L ${n1} 68 C ${n1 + 40} 68, ${n1 + 36} 136, ${n1 + 78} 136 L ${n4 - 78} 136 C ${n4 - 36} 136, ${n4 - 40} 68, ${n4} 68 L ${W - 96} 68 Q ${W - 32} 68 ${W - 32} 132 L ${W - 32} 896 Q ${W - 32} 960 ${W - 96} 960 L 96 960 Q 32 960 32 896 L 32 132 Q 32 68 96 68 Z`;
  return (
    <svg className="pointer-events-none absolute left-0 top-0" width={W} height={1024} viewBox={`0 0 ${W} 1024`} aria-hidden>
      <defs>
        <linearGradient id="shellFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--shell)" />
          <stop offset="1" stopColor="var(--shell)" stopOpacity="0.92" />
        </linearGradient>
      </defs>
      <rect x="24" y="60" width={W - 48} height="908" rx="74" fill="var(--rim-fill)" stroke="var(--shell-rim)" strokeWidth="2" />
      <path d={inner} fill="url(#shellFill)" stroke="var(--shell-rim)" strokeWidth="5" />
    </svg>
  );
}
