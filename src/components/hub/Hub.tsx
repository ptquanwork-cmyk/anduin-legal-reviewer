'use client';
import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, CloudUpload, Loader2 } from 'lucide-react';
import { box, useNav } from '../../lib/nav';
import { STAGES, type Stage } from '../../lib/stages';
import { ACCEPT, demoFile, uploadSource } from '../../lib/upload';
import { useWorkspace } from '../../lib/workspace';
import { StationArt } from './StationArt';

type Rect = [number, number, number, number];
interface Slot {
  base: Rect;
  art: Rect;
  card: [number, number];
  lower?: boolean;
}

// Positions measured from design/homepage/anduin-3d-workflow-hub-v1.png (1536 × 1024).
export const HUB_SLOTS: Record<Stage['id'], Slot> = {
  intake: { base: [138, 548, 222, 86], art: [150, 428, 204, 160], card: [318, 404] },
  source: { base: [377, 548, 220, 86], art: [384, 438, 192, 152], card: [556, 404] },
  map: { base: [611, 548, 226, 86], art: [588, 418, 216, 168], card: [770, 392] },
  review: { base: [818, 452, 400, 152], art: [790, 176, 482, 362], card: [1143, 350] },
  report: { base: [1238, 548, 254, 86], art: [1262, 410, 222, 174], card: [1090, 372] },
  annotation: { base: [234, 818, 360, 94], art: [250, 646, 340, 194], card: [520, 640], lower: true },
  form: { base: [617, 818, 240, 94], art: [640, 664, 192, 182], card: [800, 640], lower: true },
  responses: { base: [879, 818, 282, 94], art: [884, 674, 264, 168], card: [1090, 640], lower: true },
  export: { base: [1179, 818, 272, 94], art: [1190, 668, 242, 176], card: [1160, 590], lower: true },
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } };
const rise = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const } } };

export function Hub() {
  const nav = useNav();
  const ws = useWorkspace();
  const [hover, setHover] = useState<Stage['id'] | null>(null);
  const [busy, setBusy] = useState<'upload' | 'demo' | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const selected = hover ?? 'review';

  const run = async (kind: 'upload' | 'demo', file?: File) => {
    setBusy(kind);
    try {
      const f = file ?? (await demoFile());
      const res = await uploadSource(f);
      ws.setVersionId(res.versionId);
      nav.go('intake', res.versionId);
    } catch (e) {
      nav.notify(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.18 } }}>
      <motion.h1 variants={rise} className="abs font-display text-[68px] font-extrabold leading-[62px] tracking-[-0.035em]" style={{ ...box(174, 168, 560), color: 'var(--ink)' }}>
        Review before you digitize.
      </motion.h1>
      <motion.p variants={rise} className="abs text-[26px]" style={{ ...box(175, 298, 600), color: 'var(--sub)' }}>
        One source. Every step. Your decision.
      </motion.p>
      <motion.div variants={rise} className="abs flex gap-3" style={box(174, 343, 400, 46)}>
        <button className="flex h-[46px] w-[199px] items-center justify-center gap-3 rounded-full text-[17px] font-semibold shadow-[0_10px_22px_rgba(14,67,160,.28)]" style={{ background: 'var(--navy)', color: 'var(--primary-ink)' }} onClick={() => input.current?.click()} disabled={!!busy}>
          {busy === 'upload' ? <Loader2 className="animate-spin" size={22} /> : <CloudUpload size={22} />} Upload contract
        </button>
        <button className="pill h-[46px] w-[124px] text-[16px] font-medium" style={{ color: 'var(--navy)' }} onClick={() => run('demo')} disabled={!!busy}>
          {busy === 'demo' ? <Loader2 className="mx-auto animate-spin" size={20} /> : 'Use demo'}
        </button>
        <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => e.target.files?.[0] && run('upload', e.target.files[0])} />
      </motion.div>
      <motion.p variants={rise} className="abs text-[15px]" style={{ ...box(180, 397, 400), color: 'var(--muted)' }}>
        Duplicate checks stay with intake.
      </motion.p>

      {/* Shelves */}
      <motion.div variants={rise} className="abs desktop-only shelf" style={{ ...box(124, 506, 1384, 156), borderRadius: 44 }} />
      <motion.div variants={rise} className="abs desktop-only shelf" style={{ ...box(170, 690, 1312, 252), borderRadius: '140px 60px 60px 140px' }} />

      {STAGES.map((s) => (
        <Station key={s.id} stage={s} slot={HUB_SLOTS[s.id]} active={selected === s.id} hovered={hover === s.id} onHover={setHover} />
      ))}

      <HoverCard stage={STAGES.find((s) => s.id === selected)!} />
    </motion.div>
  );
}

function Station({ stage, slot, active, hovered, onHover }: { stage: Stage; slot: Slot; active: boolean; hovered: boolean; onHover: (id: Stage['id'] | null) => void }) {
  const nav = useNav();
  const [bx, by, bw, bh] = slot.base;
  const [ax, ay, aw, ah] = slot.art;
  return (
    <motion.div variants={rise}>
      <div className="abs desktop-only pedestal" style={{ ...box(bx, by, bw, bh), borderRadius: stage.id === 'review' ? 46 : 30 }} />
      <StationArt stage={stage} role="hub" lifted={hovered} className="abs desktop-only" style={box(ax, ay, aw, ah)} />
      <button
        className="abs group text-left"
        style={box(Math.min(ax, bx), ay, Math.max(ax + aw, bx + bw) - Math.min(ax, bx), by + bh - ay)}
        onMouseEnter={() => onHover(stage.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(stage.id)}
        onBlur={() => onHover(null)}
        onClick={() => nav.go(stage.id)}
        aria-label={`${stage.n} ${stage.label}: ${stage.purpose}`}
      >
        <span className="absolute flex items-center gap-3" style={{ left: bx - Math.min(ax, bx) + (stage.id === 'review' ? 68 : 26), top: by - ay + bh - (slot.lower ? 66 : 50), right: 12 }}>
          <span className="grid h-[30px] min-w-[38px] place-items-center rounded-full px-2 text-[15px] font-semibold" style={{ background: 'var(--navy)', color: 'var(--primary-ink)' }}>
            {stage.n}
          </span>
          <span className="flex flex-col">
            <span className={`${stage.id === 'review' ? 'text-[19px]' : 'text-[16px]'} font-medium`} style={{ color: 'var(--ink)' }}>
              {stage.label}
            </span>
            {slot.lower && (
              <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
                {stage.caption}
              </span>
            )}
          </span>
        </span>
        {active && (
          <motion.span
            layoutId="open-workspace"
            className="pill absolute flex items-center gap-2 px-5 py-1.5 text-[14px] font-medium"
            style={{ left: aw / 2 - 82 + (ax - Math.min(ax, bx)), top: ah - (stage.id === 'review' ? 58 : 34), color: 'var(--ink)' }}
            transition={{ duration: 0.22 }}
          >
            Open workspace <ArrowUpRight size={16} />
          </motion.span>
        )}
      </button>
    </motion.div>
  );
}

function HoverCard({ stage }: { stage: Stage }) {
  const [x, y] = HUB_SLOTS[stage.id].card;
  return (
    <motion.div key={stage.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="abs panel desktop-only pointer-events-none p-4" style={{ ...box(x, y, 184), borderRadius: 18 }}>
      <div className="text-[19px] font-semibold" style={{ color: 'var(--ink)' }}>
        {stage.label}
      </div>
      <p className="mt-1 text-[13px] leading-[19px]" style={{ color: 'var(--muted)' }}>
        {stage.purpose}
      </p>
    </motion.div>
  );
}
