'use client';
import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { motion } from 'motion/react';
import { box } from '../../lib/nav';
import { PanelScale } from '../../lib/panel';
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

/** Panel that slides in with a stagger index after the station object lands in the header. Panels with a fixed height
 * get a corner button that opens them over the whole window (Esc, the button or a click outside closes it). */
export function Panel({ i = 0, x, y, w, h, className = '', style, children, expandable = h !== undefined && h >= 240 }: { i?: number; x: number; y: number; w: number; h?: number; className?: string; style?: React.CSSProperties; children?: React.ReactNode; expandable?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const inner = useRef<HTMLElement>(null);
  const normal = useRef(0);
  useEffect(() => {
    if (!open) {
      setScale(1);
      return;
    }
    document.body.classList.add('panel-expanded');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const raf = requestAnimationFrame(() => inner.current && normal.current && setScale(Math.min(2.2, inner.current.clientWidth / normal.current)));
    return () => {
      document.body.classList.remove('panel-expanded');
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
    };
  }, [open]);
  const toggle = () => {
    if (!open && inner.current) normal.current = inner.current.clientWidth;
    setOpen((o) => !o);
  };
  const full = open ? ({ ['--l' as string]: '24px', ['--y' as string]: '24px', ['--wd' as string]: 'calc(100% - 48px)', ['--h' as string]: 'calc(100% - 48px)', zIndex: 105 } as React.CSSProperties) : undefined;
  return (
    <>
      {open && <div className="absolute inset-0 z-[104] bg-[rgba(10,20,40,.35)] backdrop-blur-[2px]" onClick={toggle} aria-hidden />}
      <motion.div custom={i} variants={panelIn} initial="hidden" animate="show" className="abs group/panel" style={{ ...box(x, y, w, h), ...full }}>
        <section ref={inner} className={`panel relative h-full w-full ${className}`} style={style}>
          <PanelScale.Provider value={scale}>{children}</PanelScale.Provider>
        </section>
        {expandable && (
          <button
            onClick={toggle}
            className="absolute -right-[11px] -top-[11px] z-10 grid h-[26px] w-[26px] place-items-center rounded-full border opacity-60 shadow-sm transition-opacity hover:opacity-100 focus-visible:opacity-100 group-hover/panel:opacity-100"
            style={{ background: 'var(--panel)', borderColor: 'var(--panel-border)', color: 'var(--primary)', opacity: open ? 1 : undefined }}
            aria-label={open ? 'Exit full screen' : 'Open full screen'}
            title={open ? 'Exit full screen (Esc)' : 'Open full screen'}
          >
            {open ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        )}
      </motion.div>
    </>
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
