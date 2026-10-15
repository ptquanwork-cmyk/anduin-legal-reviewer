'use client';
import { motion } from 'motion/react';
import { box } from '../../lib/nav';
import { stageOf, type ScreenId, type Stage } from '../../lib/stages';
import { StationArt } from '../hub/StationArt';
import { Intake } from './Intake';
import { SourceQuality } from './SourceQuality';
import { DocumentMap } from './DocumentMap';
import { LegalReview } from './LegalReview';
import { DecisionReport } from './DecisionReport';
import { Annotation } from './Annotation';
import { FormPreview } from './FormPreview';
import { Responses } from './Responses';
import { PdfQaExport } from './PdfQaExport';
import { Feedback, Templates } from './Library';

export function Screen({ id }: { id: ScreenId }) {
  switch (id) {
    case 'intake':
      return <Intake />;
    case 'source':
      return <SourceQuality />;
    case 'map':
      return <DocumentMap />;
    case 'review':
      return <LegalReview />;
    case 'report':
      return <DecisionReport />;
    case 'annotation':
      return <Annotation />;
    case 'form':
      return <FormPreview />;
    case 'responses':
      return <Responses />;
    case 'export':
      return <PdfQaExport />;
    case 'templates':
      return <Templates />;
    case 'feedback':
      return <Feedback />;
    default:
      return null;
  }
}

export const panelIn = {
  hidden: { opacity: 0, y: 22, scale: 0.985 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, scale: 1, transition: { delay: 0.12 + i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } }),
};

/** Panel that slides in with a stagger index after the station object lands in the header. In full-screen mode the
 * screen stretches panel heights (--vk); data-panel marks the working area for that fit. */
export function Panel({ i = 0, x, y, w, h, className = '', style, children }: { i?: number; x: number; y: number; w: number; h?: number; className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  return (
    <motion.section data-panel custom={i} variants={panelIn} initial="hidden" animate="show" className={`abs panel ${className}`} style={{ ...box(x, y, w, h), ['--h' as string]: h === undefined ? 'auto' : `calc(${h}px * var(--vk, 1))`, ...style }}>
      {children}
    </motion.section>
  );
}

export function Fade({ i = 0, x, y, w, h, className = '', style, children }: { i?: number; x: number; y: number; w?: number; h?: number; className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  return (
    <motion.div custom={i} variants={panelIn} initial="hidden" animate="show" className={`abs ${className}`} style={{ ...box(x, y, w, h), ...style }}>
      {children}
    </motion.div>
  );
}

export function HeaderArt({ id, x, y, w, h }: { id: Stage['id']; x: number; y: number; w: number; h: number }) {
  return <StationArt stage={stageOf(id)!} role="header" className="abs" style={box(x, y, w, h)} />;
}

export function Title({ x, y, size = 64, children }: { x: number; y: number; size?: number; children: React.ReactNode }) {
  return (
    <Fade x={x} y={y}>
      <h1 className="font-display font-extrabold tracking-[-0.035em]" style={{ fontSize: size, lineHeight: 1.05, color: 'var(--ink)' }}>
        {children}
      </h1>
    </Fade>
  );
}

export function Empty({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>
        {title}
      </p>
      <p className="max-w-[420px] text-[14px]" style={{ color: 'var(--muted)' }}>
        {detail}
      </p>
      {action}
    </div>
  );
}
