'use client';
import { useEffect, useRef, useState } from 'react';
import {
  CircleHelp,
  Maximize2,
  ArrowLeft,
  Box,
  ChevronDown,
  FileOutput,
  FileText,
  Files,
  Home,
  Info,
  MessageSquareMore,
  Moon,
  Plus,
  Search,
  Sun,
  ClipboardList,
  FileSpreadsheet,
  type LucideIcon,
} from 'lucide-react';
import { box, useNav } from '../../lib/nav';
import { RAIL_TARGET, railFor, STAGES, type RailId, type ScreenId } from '../../lib/stages';
import { useWorkspace } from '../../lib/workspace';
import { GUIDES } from '../../lib/guides';
import { Modal } from '../ui';

export function Brand() {
  const { version } = useWorkspace();
  const demo = version?.file_name.toLowerCase().startsWith('demo agreement');
  return (
    <>
      <div className="abs flex items-baseline gap-2 select-none" style={box(35, 18)}>
        <span className="font-display text-[31px] font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
          Anduin
        </span>
        <span className="text-[25px]" style={{ color: 'var(--ink)' }}>
          Legal Reviewer
        </span>
      </div>
      <div className="abs text-right text-[19px] uppercase tracking-wide" style={{ ...box(1000, 29, 502), color: 'var(--ink)' }}>
        {demo ? 'Private workspace · Synthetic data' : 'Private workspace'}
      </div>
    </>
  );
}

export function TopBar({ onSearch }: { onSearch: () => void }) {
  const nav = useNav();
  const ws = useWorkspace();
  const home = nav.screen === 'home';
  return (
    <>
      {home ? (
        <button className="abs pill flex items-center gap-3 pl-12 text-[15px] font-medium" style={{ ...box(144, 84, 244, 48, 'left'), color: 'var(--ink)' }} onClick={() => nav.go('intake', null)}>
          <span className="absolute left-12 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full" style={{ background: 'var(--primary)', color: 'var(--primary-ink)' }}>
            <Plus size={17} strokeWidth={2.5} />
          </span>
          <span className="ml-10">New document</span>
        </button>
      ) : (
        <button className="abs pill flex items-center justify-center gap-3 text-[16px] font-semibold" style={{ ...box(143, 83, 147, 48, 'left'), color: 'var(--ink)' }} onClick={() => nav.go('home')}>
          <ArrowLeft size={20} /> Home
        </button>
      )}
      <button className="abs pill flex items-center gap-4 px-5 text-left text-[14px]" style={{ ...box(578, 77, 380, 48), color: 'var(--muted)' }} onClick={onSearch} aria-label="Search documents and sections">
        <Search size={22} style={{ color: 'var(--ink)' }} />
        <span className="flex-1 truncate">{!home && ws.document ? ws.document.title : 'Find a document or section'}</span>
        <kbd className="rounded-md px-2 py-0.5 text-[12px]" style={{ background: 'var(--raised)', color: 'var(--muted)' }}>
          ⌘ K
        </kbd>
      </button>
      <GuideButton />
      <VersionControl />
      <AvatarMenu />
    </>
  );
}

/** "How to use" for the current screen: purpose, numbered steps (what to click, in order), when to move on, tips. */
export function GuideButton({ floating = false }: { floating?: boolean }) {
  const nav = useNav();
  const [open, setOpen] = useState(false);
  const g = GUIDES[nav.screen];
  const home = nav.screen === 'home';
  return (
    <>
      {floating ? (
        <button className="pill flex h-10 items-center gap-2 px-4 text-[14px] font-semibold shadow-md" style={{ color: 'var(--primary)' }} onClick={() => setOpen(true)}>
          <CircleHelp size={17} /> How to use
        </button>
      ) : (
        <button className="abs pill flex items-center justify-center gap-2 text-[15px] font-semibold" style={{ ...box(home ? 400 : 302, home ? 84 : 83, 168, 48, 'left'), color: 'var(--primary)' }} onClick={() => setOpen(true)}>
          <CircleHelp size={20} /> How to use
        </button>
      )}
      {!floating && !home && (
        <button className="abs pill grid place-items-center" style={{ ...box(480, 83, 48, 48, 'left'), color: 'var(--primary)' }} onClick={nav.toggleFocus} title="Full screen: the working area fills the whole screen (Esc to exit)" aria-label="Full screen">
          <Maximize2 size={20} />
        </button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={g.title} width={720}>
        <div className="scroll-thin max-h-[70vh] overflow-auto pr-1 text-[14.5px] leading-[21px]" style={{ color: 'var(--ink)' }}>
          <p style={{ color: 'var(--muted)' }}>{g.purpose}</p>
          <ol className="mt-4 space-y-3">
            {g.steps.map((st, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold" style={{ background: 'var(--primary)', color: 'var(--primary-ink)' }}>
                  {i + 1}
                </span>
                <div>
                  <div className="font-semibold">{st.do}</div>
                  {st.detail && <div style={{ color: 'var(--muted)' }}>{st.detail}</div>}
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-2xl px-4 py-3" style={{ background: 'var(--selected)' }}>
            <span className="font-semibold">Move on when: </span>
            {g.next}
          </div>
          {g.tips?.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5" style={{ color: 'var(--muted)' }}>
              {g.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </Modal>
    </>
  );
}

function VersionControl() {
  const nav = useNav();
  const ws = useWorkspace();
  const [open, setOpen] = useState(false);
  if (nav.screen === 'home' || !ws.version) {
    return (
      <button className="abs pill flex items-center justify-center gap-3 text-[15px] font-medium" style={{ ...box(1126, 85, 202, 48, 'right'), color: 'var(--ink)' }} onClick={() => nav.go('intake')}>
        <FileText size={20} /> My documents
      </button>
    );
  }
  return (
    <div className="abs" style={box(1100, 85, 228, 48, 'right')}>
      <button className="pill flex h-full w-full items-center gap-3 px-5 text-[15px] font-semibold" style={{ color: 'var(--ink)' }} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <FileText size={20} />
        <span className="flex-1 truncate text-left">
          {ws.document?.title ?? ws.version.file_name} · v{ws.version.version_no}
        </span>
        <ChevronDown size={18} />
      </button>
      {open && (
        <div className="panel absolute right-0 top-14 z-50 w-72 p-2" onMouseLeave={() => setOpen(false)}>
          {ws.siblings.map((v) => (
            <button key={v.id} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[14px] hover:bg-[var(--selected)]" onClick={() => { ws.setVersionId(v.id); setOpen(false); }}>
              <span className="truncate">{v.file_name}</span>
              <span className="chip" style={{ background: 'var(--raised)' }}>v{v.version_no}</span>
            </button>
          ))}
          <button className="mt-1 w-full rounded-xl px-3 py-2 text-left text-[14px] font-medium hover:bg-[var(--selected)]" style={{ color: 'var(--primary)' }} onClick={() => { nav.go('intake'); setOpen(false); }}>
            All documents
          </button>
        </div>
      )}
    </div>
  );
}

function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => setTheme((document.documentElement.dataset.theme as 'light' | 'dark') ?? 'light'), []);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {}
    setTheme(next);
  };
  return (
    <div className="abs" style={box(1343, 85, 78, 48, 'right')}>
      <button className="pill flex h-full w-full items-center justify-center gap-2" onClick={() => setOpen((o) => !o)} aria-label="Account and theme menu" aria-expanded={open}>
        <span className="grid h-9 w-9 place-items-center rounded-full text-[17px] font-semibold" style={{ background: 'var(--raised)', color: 'var(--navy)' }}>
          J
        </span>
        <ChevronDown size={18} style={{ color: 'var(--ink)' }} />
      </button>
      {open && (
        <div className="panel absolute right-0 top-14 z-50 w-64 p-2 text-[14px]" onMouseLeave={() => setOpen(false)}>
          <p className="px-3 py-2" style={{ color: 'var(--muted)' }}>
            Private anonymous workspace on this browser.
          </p>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 hover:bg-[var(--selected)]" onClick={toggle}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      )}
    </div>
  );
}

const RAIL: { id: RailId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'documents', label: 'Documents', icon: Files },
  { id: 'map', label: 'Document map', icon: Box },
  { id: 'review', label: 'Review', icon: ClipboardList },
  { id: 'forms', label: 'Forms', icon: FileSpreadsheet },
  { id: 'export', label: 'Export', icon: FileOutput },
];
const UTILITY: typeof RAIL = [
  { id: 'templates', label: 'Templates', icon: Box },
  { id: 'feedback', label: 'Feedback', icon: MessageSquareMore },
];

export function IconRail() {
  const nav = useNav();
  const active = railFor(nav.screen);
  const item = (r: (typeof RAIL)[number]) => {
    const on = r.id === active;
    const Icon = r.icon;
    return (
      <button
        key={r.id}
        onClick={() => nav.go(RAIL_TARGET[r.id])}
        aria-current={on ? 'page' : undefined}
        className="mx-auto flex w-[68px] flex-col items-center gap-1 rounded-[18px] py-2.5 text-[12px] leading-tight transition-colors"
        style={on ? { background: 'linear-gradient(180deg,#3b9bff,#0a6cff)', color: '#fff', boxShadow: '0 8px 18px rgba(10,108,255,.35)' } : { color: 'var(--ink)' }}
      >
        <Icon size={24} strokeWidth={1.6} />
        <span className="text-center">{r.label}</span>
      </button>
    );
  };
  return (
    <nav aria-label="Sections">
      <div className="abs panel flex flex-col justify-start gap-3 py-5" style={{ ...box(36, 152, 86, 520), borderRadius: 42 }}>
        {RAIL.map(item)}
      </div>
      <div className="abs panel flex flex-col justify-center gap-4 py-4" style={{ ...box(36, 680, 86, 182), borderRadius: 42 }}>
        {UTILITY.map(item)}
      </div>
    </nav>
  );
}

/** Unified pill-style nine-stage strip. Selecting a stage never implies earlier stages passed. */
export function StageStrip({ y = 152, x = 132, w = 1360 }: { y?: number; x?: number; w?: number }) {
  const nav = useNav();
  // Narrow strips wrap labels onto two lines, like the stepper labels in the approved design.
  const size = w < 1150 ? 'pr-2 text-[11.5px] leading-[13px]' : w < 1250 ? 'pr-2.5 text-[12.5px]' : 'pr-3.5 text-[13.5px]';
  return (
    <div className="abs pill flex items-center justify-between overflow-x-auto px-3" style={box(x, y, w, 48)} role="tablist" aria-label="Workflow stages">
      {STAGES.map((s) => {
        const on = s.id === nav.screen;
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={on}
            onClick={() => nav.go(s.id)}
            className={`flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 text-left transition-colors ${size}`}
            style={on ? { background: 'var(--primary)', color: 'var(--primary-ink)' } : { color: 'var(--ink)' }}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold" style={on ? { background: 'rgba(255,255,255,.18)' } : { background: 'var(--raised)' }}>
              {s.n}
            </span>
            <span className={w < 1150 ? 'max-w-[78px]' : undefined}>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Live worker status (Word conversion + decision agent), refreshed every minute. */
function useWorkerStatus() {
  const [s, setS] = useState<'online' | 'warming' | 'offline' | null>(null);
  useEffect(() => {
    const check = () =>
      fetch('/api/health')
        .then((r) => r.json())
        .then((j: { worker?: { decision_agent?: string; error?: string } }) => setS(j.worker?.decision_agent === 'ready' ? 'online' : j.worker?.decision_agent === 'loading' ? 'warming' : 'offline'))
        .catch(() => setS('offline'));
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, []);
  return s;
}

export function Footer({ hint }: { hint?: string }) {
  const ws = useWorkspace();
  const worker = useWorkerStatus();
  const agent = worker === 'online' ? 'online' : worker === null ? undefined : 'offline';
  const status = ws.authError
    ? `Workspace unavailable: ${ws.authError}`
    : !ws.ready
      ? 'Connecting…'
      : worker === 'online'
        ? 'Live processing · decision agent online'
        : worker === 'warming'
          ? 'Live processing · decision agent warming up'
          : worker === 'offline'
            ? 'Live processing · decision agent offline'
            : 'Live processing · private workspace';
  return (
    <>
      {hint && (
        <div className="abs flex items-center justify-center gap-2 text-[14px]" style={{ ...box(468, 979, 600, 24), color: 'var(--ink)' }}>
          <Info size={18} fill="var(--ink)" color="var(--canvas)" /> {hint}
        </div>
      )}
      <div className="abs pill flex items-center justify-center gap-2 text-[11.5px]" style={{ ...box(1272, 976, 240, 30, 'right'), color: 'var(--ink)' }}>
        <span className="h-2 w-2 rounded-full" style={{ background: agent === 'offline' ? 'var(--warn-dot)' : 'var(--mint-dark)' }} />
        {status}
      </div>
    </>
  );
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNav();
  const ws = useWorkspace();
  const [q, setQ] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) setTimeout(() => ref.current?.focus(), 20);
  }, [open]);
  if (!open) return null;
  const query = q.trim().toLowerCase();
  const sections = ws.blocks.filter((b) => b.kind === 'heading' && (!query || b.text.toLowerCase().includes(query))).slice(0, 8);
  const docs = ws.recent.filter((v) => !query || (v.documents?.title ?? v.file_name).toLowerCase().includes(query)).slice(0, 6);
  const stages = STAGES.filter((s) => !query || s.label.toLowerCase().includes(query));
  const pick = (screen: ScreenId, versionId?: string) => {
    nav.go(screen, versionId);
    onClose();
    setQ('');
  };
  return (
    <div className="fixed inset-0 z-[100] grid place-items-start justify-center bg-black/25 pt-[12vh]" onClick={onClose}>
      <div className="panel w-[min(640px,92vw)] p-3" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Search">
        <div className="flex items-center gap-3 px-2">
          <Search size={20} />
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onClose()} placeholder="Find a document or section" className="h-11 flex-1 bg-transparent text-[16px] outline-none" />
        </div>
        <div className="scroll-thin mt-2 max-h-[50vh] overflow-auto">
          {docs.length > 0 && <Group title="Documents" />}
          {docs.map((v) => (
            <Row key={v.id} onClick={() => pick('review', v.id)} title={`${v.documents?.title ?? v.file_name} · v${v.version_no}`} meta={v.file_name} />
          ))}
          {sections.length > 0 && <Group title="Sections in this document" />}
          {sections.map((b) => (
            <Row key={b.id} onClick={() => pick('map')} title={b.text} meta={`Page ${b.page ?? '–'}`} />
          ))}
          {stages.length > 0 && <Group title="Workflow" />}
          {stages.map((s) => (
            <Row key={s.id} onClick={() => pick(s.id)} title={`${s.n} ${s.label}`} meta={s.caption} />
          ))}
        </div>
      </div>
    </div>
  );
}

const Group = ({ title }: { title: string }) => (
  <div className="px-3 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--faint)' }}>
    {title}
  </div>
);
const Row = ({ title, meta, onClick }: { title: string; meta: string; onClick: () => void }) => (
  <button onClick={onClick} className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2 text-left text-[14px] hover:bg-[var(--selected)]">
    <span className="truncate">{title}</span>
    <span className="shrink-0 text-[12px]" style={{ color: 'var(--muted)' }}>
      {meta}
    </span>
  </button>
);
