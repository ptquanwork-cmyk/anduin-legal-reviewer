'use client';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import type { Category, DecisionRow, FindingRow } from '../lib/types';
import { latestDecision } from '../lib/workspace';

export const CATEGORY: Record<Category, { label: string; filter: string; bg: string; ink: string }> = {
  contradiction: { label: 'Contradiction', filter: 'Contradictions', bg: 'var(--contra-bg)', ink: 'var(--contra-ink)' },
  missing_reference: { label: 'References', filter: 'References', bg: 'var(--ref-bg)', ink: 'var(--ref-ink)' },
  ambiguity: { label: 'Ambiguities', filter: 'Ambiguities', bg: 'var(--violet-bg)', ink: 'var(--violet-ink)' },
  undefined_term: { label: 'Undefined term', filter: 'Terms', bg: 'var(--warn-bg)', ink: 'var(--warn-ink)' },
  typo: { label: 'Typos', filter: 'Typos', bg: 'var(--info-bg)', ink: 'var(--info-ink)' },
};

export function CategoryChip({ c, className = '' }: { c: Category; className?: string }) {
  const s = CATEGORY[c];
  return (
    <span className={`chip ${className}`} style={{ background: s.bg, color: s.ink, fontSize: 12.5, padding: '2px 11px' }}>
      {s.label}
    </span>
  );
}

export type ReviewState = 'open' | 'confirmed' | 'dismissed' | 'clarify' | 'resolved' | 'exception';

export function reviewState(f: FindingRow, decisions: DecisionRow[]): ReviewState {
  const d = latestDecision(decisions, f.id);
  if (!d || d.action === 'reopen') return 'open';
  if (d.action === 'confirm') return d.reason === 'exception' ? 'exception' : 'confirmed';
  if (d.action === 'dismiss') return 'dismissed';
  if (d.action === 'clarify') return 'clarify';
  return 'resolved';
}

export const STATE: Record<ReviewState, { label: string; bg: string; ink: string; dot: string }> = {
  open: { label: 'Open · needs confirmation', bg: 'var(--panel-2)', ink: 'var(--ink)', dot: 'var(--warn-dot)' },
  confirmed: { label: 'Confirmed / open', bg: 'var(--warn-bg)', ink: 'var(--warn-ink)', dot: 'var(--warn-dot)' },
  clarify: { label: 'Needs clarification', bg: 'var(--error-bg)', ink: 'var(--error-ink)', dot: 'var(--error-ink)' },
  dismissed: { label: 'Dismissed', bg: 'var(--panel-2)', ink: 'var(--muted)', dot: 'var(--faint)' },
  resolved: { label: 'Resolved after revision', bg: 'var(--info-bg)', ink: 'var(--info-ink)', dot: 'var(--mint-dark)' },
  exception: { label: 'Approved with exception', bg: 'var(--violet-bg)', ink: 'var(--violet-ink)', dot: 'var(--violet-ink)' },
};

export function StateChip({ s, className = '' }: { s: ReviewState; className?: string }) {
  const v = STATE[s];
  return (
    <span className={`chip ${className}`} style={{ background: v.bg, color: v.ink }}>
      {v.label}
    </span>
  );
}

export function Modal({ open, onClose, title, children, width = 520 }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[110] grid place-items-center bg-black/30 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="panel scroll-thin max-h-[86vh] overflow-auto p-6"
            style={{ width: `min(${width}px, 94vw)` }}
            initial={{ y: 24, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 16, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-[20px] font-semibold" style={{ color: 'var(--ink)' }}>
                {title}
              </h2>
              <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--selected)]">
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Note({ tone = 'info', icon, title, children, className = '' }: { tone?: 'info' | 'warn' | 'error' | 'ok'; icon?: React.ReactNode; title?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  const c = { info: ['var(--selected)', 'var(--ink)'], warn: ['var(--warn-bg)', 'var(--warn-ink)'], error: ['var(--error-bg)', 'var(--error-ink)'], ok: ['var(--info-bg)', 'var(--info-ink)'] }[tone];
  return (
    <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 ${className}`} style={{ background: c[0], color: c[1] }}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">
        {title && <div className="text-[15px] font-semibold">{title}</div>}
        {children && <div className="text-[13px] leading-snug opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[16px] font-semibold" style={{ color: 'var(--ink)' }}>
      {children}
    </div>
  );
}

export function fmtTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  const y = new Date(today.getTime() - 86400000);
  if (d.toDateString() === y.toDateString()) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString()} ${time}`;
}

export function FileBadge({ mime, size = 34 }: { mime: string; size?: number }) {
  const pdf = mime === 'application/pdf';
  return (
    <span className="grid shrink-0 place-items-center rounded-lg text-[13px] font-bold text-white" style={{ width: size, height: size, background: pdf ? '#e5383b' : '#1f6bd6' }}>
      {pdf ? 'PDF' : 'W'}
    </span>
  );
}
