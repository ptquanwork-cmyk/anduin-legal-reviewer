'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, animate, motion } from 'motion/react';
import { NavCtx, stretchFactor, type Nav } from '../lib/nav';
import { stageOf, type ScreenId } from '../lib/stages';
import { WorkspaceProvider } from '../lib/workspace';
import { ShellFrame } from './shell/Frame';
import { Brand, CommandPalette, Footer, IconRail, TopBar } from './shell/Chrome';
import { Hub } from './hub/Hub';
import dynamic from 'next/dynamic';
import { FlyingCtx, StationArt, ThreeCtx } from './hub/StationArt';

const StationsCanvas = dynamic(() => import('./three/Stations'), { ssr: false });

function webgl() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl');
    // Release the probe context at once; browsers cap live WebGL contexts per page.
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}
import { Screen } from './screens/Screen';

const SCREENS: ScreenId[] = ['home', 'intake', 'source', 'map', 'review', 'report', 'annotation', 'form', 'responses', 'export', 'templates', 'feedback'];

function readUrl() {
  const p = new URLSearchParams(window.location.search);
  const s = p.get('s') as ScreenId | null;
  return { screen: s && SCREENS.includes(s) ? s : 'home', versionId: p.get('v'), overlay: p.get('overlay') };
}

/** Fill the window: height sets the zoom, extra width widens the content area. The dev overlay renders the exact design frame. */
function fitFrame(overlay: boolean) {
  if (overlay) return { zoom: 1, frameWidth: 1536 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!vw || !vh) return { zoom: 1, frameWidth: 1536 }; // hidden or not yet laid out (0×0)
  const wide = vw / (vh / 1024);
  if (wide < 1536) return { zoom: Math.min(vw / 1536, vh / 1024), frameWidth: 1536 };
  return { zoom: vh / 1024, frameWidth: wide };
}

interface Fly {
  id: string;
  img: string;
  from: DOMRect;
}

export default function App() {
  const [screen, setScreen] = useState<ScreenId>(() => readUrl().screen);
  const [prev, setPrev] = useState<ScreenId>('home');
  const [versionId, setVersionIdState] = useState<string | null>(() => readUrl().versionId);
  const [overlay, setOverlay] = useState<string | null>(() => readUrl().overlay);
  const [frame, setFrame] = useState(() => fitFrame(!!readUrl().overlay));
  const [search, setSearch] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'info' | 'error' } | null>(null);
  const [fly, setFly] = useState<Fly | null>(null);
  const flyEl = useRef<HTMLDivElement>(null);
  // Real-time 3D when WebGL is available; the approved PNG stills stay for reduced motion and ?static.
  const [three, setThree] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.has('static')) return false;
    if (q.has('three')) return webgl();
    return webgl() && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const sync = () => {
      const u = readUrl();
      setScreen(u.screen);
      setVersionIdState(u.versionId);
      setOverlay(u.overlay);
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  useEffect(() => {
    const fit = () => setFrame(fitFrame(!!overlay));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [overlay]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const writeUrl = (s: ScreenId, v: string | null, push: boolean) => {
    const p = new URLSearchParams();
    if (s !== 'home') p.set('s', s);
    if (v) p.set('v', v);
    if (overlay) p.set('overlay', overlay);
    const url = `${window.location.pathname}${p.size ? `?${p}` : ''}`;
    if (push) window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  };

  const setVersionId = useCallback(
    (id: string | null) => {
      setVersionIdState(id);
      writeUrl(screen, id, false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [screen, overlay],
  );

  const notify = useCallback((message: string, tone: 'info' | 'error' = 'info') => {
    setToast({ message, tone });
    setTimeout(() => setToast((t) => (t?.message === message ? null : t)), 5200);
  }, []);

  const go = useCallback(
    (next: ScreenId, v?: string | null) => {
      if (next === screen && v === undefined) return;
      // The object of the stage being entered (or left, when returning home) flies between hub and header.
      const flyId = screen === 'home' ? next : next === 'home' ? screen : null;
      const stage = flyId ? stageOf(flyId) : undefined;
      const from = stage ? document.querySelector(`[data-art="${stage.id}"]`)?.getBoundingClientRect() : undefined;
      if (stage && from && !matchMedia('(prefers-reduced-motion: reduce)').matches) setFly({ id: stage.id, img: stage.img, from });
      const nextVersion = v === undefined ? versionId : v;
      setPrev(screen);
      setScreen(next);
      if (v !== undefined) setVersionIdState(v);
      writeUrl(next, nextVersion, true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [screen, versionId, overlay],
  );

  // Animate the flying copy to wherever the destination art renders.
  useEffect(() => {
    if (!fly) return;
    let raf = 0;
    let tries = 0;
    const seek = () => {
      const targets = [...document.querySelectorAll<HTMLElement>(`[data-art="${fly.id}"]`)];
      const target = targets.find((t) => t.dataset.artRole === (screen === 'home' ? 'hub' : 'header'));
      const el = flyEl.current;
      if (!target || !el) {
        if (tries++ < 60) raf = requestAnimationFrame(seek);
        else setFly(null);
        return;
      }
      const to = target.getBoundingClientRect();
      const ctl = animate(
        el,
        { left: [fly.from.left, to.left], top: [fly.from.top, to.top], width: [fly.from.width, to.width], height: [fly.from.height, to.height] },
        { duration: 0.62, ease: [0.65, 0, 0.35, 1] },
      );
      ctl.then(() => setFly(null));
    };
    raf = requestAnimationFrame(seek);
    return () => cancelAnimationFrame(raf);
  }, [fly, screen]);

  const { zoom, frameWidth } = frame;
  const nav = useMemo<Nav>(() => ({ screen, prev, go, zoom, frameWidth, notify }), [screen, prev, go, zoom, frameWidth, notify]);
  const stageStyle = { zoom, width: frameWidth, ['--k' as string]: stretchFactor(frameWidth), ['--dw' as string]: `${frameWidth - 1536}px` } as React.CSSProperties;

  return (
    <NavCtx.Provider value={nav}>
      <WorkspaceProvider versionId={versionId} setVersionId={setVersionId}>
        <ThreeCtx.Provider value={three}>
        <FlyingCtx.Provider value={fly?.id ?? null}>
          {three && <StationsCanvas onLost={() => setThree(false)} />}
          <div className="flex h-screen w-full items-center justify-center">
            <div className="stage" style={stageStyle}>
              <ShellFrame />
              <Brand />
              <TopBar onSearch={() => setSearch(true)} />
              <IconRail />
              <AnimatePresence mode="wait">
                <motion.div key={screen} initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.16 } }}>
                  {screen === 'home' ? <Hub /> : <Screen id={screen} />}
                </motion.div>
              </AnimatePresence>
              <Footer hint={screen === 'home' ? 'Hover to explore · Click to open a section' : undefined} />
              {overlay && overlay !== '0' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={overlayUrl(overlay)} alt="" className="pointer-events-none absolute left-0 top-0 z-[90] h-[1024px] w-[1536px] opacity-50" />
              )}
            </div>
          </div>
          {fly && (
            <div ref={flyEl} className="pointer-events-none fixed z-[80]" style={{ left: fly.from.left, top: fly.from.top, width: fly.from.width, height: fly.from.height }}>
              <StationArt stage={stageOf(fly.id as ScreenId)!} role="fly" className="absolute inset-0" />
            </div>
          )}
          <CommandPalette open={search} onClose={() => setSearch(false)} />
          <AnimatePresence>
            {toast && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} role="status" className="panel fixed bottom-6 left-1/2 z-[120] max-w-[90vw] -translate-x-1/2 px-5 py-3 text-[14px]" style={toast.tone === 'error' ? { background: 'var(--error-bg)', color: 'var(--error-ink)', borderColor: 'var(--error-line)' } : undefined}>
                {toast.message}
              </motion.div>
            )}
          </AnimatePresence>
        </FlyingCtx.Provider>
        </ThreeCtx.Provider>
      </WorkspaceProvider>
    </NavCtx.Provider>
  );
}

// Dev alignment aid: ?overlay=04 (light) or ?overlay=d04 (dark) lays the approved design over the app; ?overlay=0 only fixes the design frame.
function overlayUrl(o: string) {
  const dark = o.startsWith('d');
  const n = o.replace(/^d/, '');
  return `/design-overlay/${dark ? 'dark' : 'light'}-${n}.png`;
}
