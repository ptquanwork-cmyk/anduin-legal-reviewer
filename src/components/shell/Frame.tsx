'use client';
/** Rounded outer shell with the concave toolbar notch from the approved design (1536 × 1024 frame). */
export function ShellFrame() {
  const inner =
    'M 96 68 L 492 68 C 532 68, 528 136, 570 136 L 960 136 C 1002 136, 998 68, 1038 68 L 1440 68 Q 1504 68 1504 132 L 1504 896 Q 1504 960 1440 960 L 96 960 Q 32 960 32 896 L 32 132 Q 32 68 96 68 Z';
  return (
    <svg className="desktop-only pointer-events-none absolute left-0 top-0" width={1536} height={1024} viewBox="0 0 1536 1024" aria-hidden>
      <defs>
        <linearGradient id="shellFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--shell)" />
          <stop offset="1" stopColor="var(--shell)" stopOpacity="0.92" />
        </linearGradient>
      </defs>
      <rect x="24" y="60" width="1488" height="908" rx="74" fill="var(--rim-fill)" stroke="var(--shell-rim)" strokeWidth="2" />
      <path d={inner} fill="url(#shellFill)" stroke="var(--shell-rim)" strokeWidth="5" />
    </svg>
  );
}
