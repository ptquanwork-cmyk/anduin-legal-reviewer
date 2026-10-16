import { AbsoluteFill, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { loadFont as loadPoppins } from '@remotion/google-fonts/Poppins';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { type Cam, type Point, type Scene, SCENES, SECTIONS, STARTS, TOTAL, TRANSITION } from './scenes';
import { RESULTS } from './results';

const { fontFamily: display } = loadPoppins('normal', { weights: ['600', '700', '800'], subsets: ['latin'] });
const { fontFamily: body } = loadInter('normal', { weights: ['400', '500', '600'], subsets: ['latin'] });

const INK = '#0e1a44';
const MUTED = '#5d6b82';
const PRIMARY = '#0068fe';
const MINT = '#13a894';
const calm = Easing.bezier(0.45, 0, 0.25, 1); // slow in, slow out: no jolts
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

function along<T extends { f: number }>(keys: T[], f: number, pick: (k: T) => number) {
  if (f <= keys[0].f) return pick(keys[0]);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (f <= b.f) return pick(a) + (pick(b) - pick(a)) * calm((f - a.f) / Math.max(1, b.f - a.f));
  }
  return pick(keys[keys.length - 1]);
}

function camera(keys: Cam[] | undefined, f: number) {
  if (!keys) return { tx: 0, ty: 0, z: 1 };
  const z = along(keys, f, (k) => k.z);
  const x = along(keys, f, (k) => k.x);
  const y = along(keys, f, (k) => k.y);
  const tx = Math.min(0, Math.max(1920 - 1920 * z, 960 - x * z));
  const ty = Math.min(0, Math.max(1080 - 1080 * z, 540 - y * z));
  return { tx, ty, z };
}

/** Gentle entrance used everywhere: fade and rise. */
function useEnter(delay: number) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config: { damping: 200 } });
}

function Cursor({ points, z }: { points: Point[]; z: number }) {
  const f = useCurrentFrame();
  if (f < points[0].f - 6) return null;
  const clicks = points.filter((p) => p.click);
  const press = clicks.reduce((acc, p) => Math.max(acc, interpolate(f, [p.f, p.f + 3, p.f + 9], [0, 1, 0], clamp)), 0);
  return (
    <>
      {clicks.map((p) => {
        const r = interpolate(f, [p.f, p.f + 18], [0, 1], clamp);
        if (f < p.f || r >= 1) return null;
        return (
          <div
            key={p.f}
            style={{ position: 'absolute', left: p.x, top: p.y, width: 90 / z, height: 90 / z, marginLeft: -45 / z, marginTop: -45 / z, borderRadius: '50%', border: `${4 / z}px solid ${PRIMARY}`, background: 'rgba(0,104,254,.12)', opacity: 1 - r, scale: String(0.3 + r * 0.9) }}
          />
        );
      })}
      <svg
        width={46}
        height={46}
        viewBox="0 0 24 24"
        style={{ position: 'absolute', left: along(points, f, (p) => p.x), top: along(points, f, (p) => p.y), opacity: interpolate(f, [points[0].f - 6, points[0].f + 4], [0, 1], clamp), scale: String((1 - press * 0.15) / z), transformOrigin: '0 0', filter: 'drop-shadow(0 3px 5px rgba(10,20,60,.35))' }}
      >
        <path d="M3 2 L3 19 L7.6 14.8 L10.6 21.6 L13.6 20.3 L10.7 13.6 L17 13.6 Z" fill="#fff" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </>
  );
}

function SectionTag({ n }: { n: number }) {
  const sec = SECTIONS[n - 1];
  return (
    <div style={{ position: 'absolute', left: 48, top: 40, display: 'flex', alignItems: 'center', gap: 14, padding: '12px 22px 12px 14px', borderRadius: 999, background: 'rgba(255,255,255,.94)', boxShadow: '0 10px 30px rgba(14,26,68,.18)' }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', background: PRIMARY, color: '#fff', fontFamily: display, fontWeight: 700, fontSize: 20 }}>{n}</span>
      <span style={{ fontFamily: display, fontWeight: 600, fontSize: 26, color: INK }}>{sec.title}</span>
      <span style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
        {SECTIONS.map((x) => (
          <span key={x.n} style={{ width: x.n === n ? 22 : 8, height: 8, borderRadius: 8, background: x.n <= n ? PRIMARY : '#cfdbea' }} />
        ))}
      </span>
    </div>
  );
}

function Caption({ text, dur }: { text: string; dur: number }) {
  const f = useCurrentFrame();
  const enter = useEnter(10);
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 56,
        translate: `-50% ${(1 - enter) * 24}px`,
        padding: '18px 34px',
        borderRadius: 20,
        background: 'rgba(14,26,68,.88)',
        color: '#fff',
        fontFamily: display,
        fontWeight: 600,
        fontSize: 38,
        whiteSpace: 'nowrap',
        boxShadow: '0 16px 40px rgba(14,26,68,.3)',
        opacity: enter * interpolate(f, [dur - TRANSITION - 8, dur - TRANSITION], [1, 0], clamp),
      }}
    >
      {text}
    </div>
  );
}

function Shot({ scene }: { scene: Scene }) {
  const f = useCurrentFrame();
  const { tx, ty, z } = camera(scene.cam, f);
  return (
    <AbsoluteFill style={{ background: '#dbe8f7', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 1920, height: 1080, transformOrigin: '0 0', translate: `${tx}px ${ty}px`, scale: String(z) }}>
        {scene.layers?.map((l) => (
          <Img key={l.img} src={staticFile(`shots/${l.img}.jpg`)} style={{ position: 'absolute', inset: 0, width: 1920, height: 1080, opacity: l.from === 0 ? 1 : interpolate(f, [l.from, l.from + 12], [0, 1], clamp) }} />
        ))}
        {scene.cursor && <Cursor points={scene.cursor} z={z} />}
      </div>
      {scene.section && <SectionTag n={scene.section} />}
      {scene.caption && <Caption text={scene.caption} dur={scene.dur} />}
      {scene.cursor
        ?.filter((p) => p.click)
        .map((p) => (
          <Sequence key={p.f} from={p.f} durationInFrames={20} layout="none">
            <Audio src={staticFile('audio/click.wav')} volume={0.9} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
}

function Backdrop({ blur = 16, opacity = 0.18 }: { blur?: number; opacity?: number }) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #f3f8ff 0%, #dbe9fb 55%, #c9def8 100%)' }}>
      <Img src={staticFile('shots/hub.jpg')} style={{ position: 'absolute', inset: 0, width: 1920, height: 1080, opacity, filter: `blur(${blur}px)`, scale: String(1.08 + f * 0.0004) }} />
    </AbsoluteFill>
  );
}

function Rise({ delay, children, style }: { delay: number; children: React.ReactNode; style?: React.CSSProperties }) {
  const e = useEnter(delay);
  return <div style={{ opacity: e, translate: `0px ${(1 - e) * 30}px`, ...style }}>{children}</div>;
}

function Title() {
  return (
    <AbsoluteFill>
      <Backdrop opacity={0.25} />
      <AbsoluteFill style={{ justifyContent: 'center', paddingLeft: 150 }}>
        <Rise delay={6}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 26 }}>
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 150, letterSpacing: -4, color: INK }}>Anduin</span>
            <span style={{ fontFamily: body, fontWeight: 400, fontSize: 104, color: INK }}>Legal Reviewer</span>
          </div>
        </Rise>
        <Rise delay={22}>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 64, color: PRIMARY, marginTop: 18 }}>Review contracts before you digitize.</div>
        </Rise>
        <Rise delay={40}>
          <div style={{ fontFamily: body, fontWeight: 500, fontSize: 30, color: MUTED, marginTop: 30 }}>The Legal Reviewer challenge · Anduin Cybernetics hackathon</div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/** A number that counts up from 0. */
function Count({ to, delay, dur = 36 }: { to: number; delay: number; dur?: number }) {
  const f = useCurrentFrame();
  return <>{Math.round(interpolate(f, [delay, delay + dur], [0, to], { ...clamp, easing: Easing.out(Easing.cubic) }))}</>;
}

function StatCard({ value, of, label, note, ring, delay }: { value: number; of: number; label: string; note: string; ring?: boolean; delay: number }) {
  const f = useCurrentFrame();
  const e = useEnter(delay);
  const p = interpolate(f, [delay, delay + 40], [0, value / of], { ...clamp, easing: Easing.out(Easing.cubic) });
  const good = value === of || (value === 0 && /false/i.test(label));
  return (
    <div style={{ width: 500, padding: '30px 34px', borderRadius: 28, background: 'rgba(255,255,255,.95)', boxShadow: '0 20px 50px rgba(14,26,68,.14)', opacity: e, translate: `0px ${(1 - e) * 30}px`, display: 'flex', gap: 26, alignItems: 'center' }}>
      {ring ? (
        <svg width={120} height={120} viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
          <circle cx={60} cy={60} r={50} fill="none" stroke="#e3ecf7" strokeWidth={12} />
          <circle cx={60} cy={60} r={50} fill="none" stroke={PRIMARY} strokeWidth={12} strokeLinecap="round" strokeDasharray={2 * Math.PI * 50} strokeDashoffset={2 * Math.PI * 50 * (1 - p)} transform="rotate(-90 60 60)" />
          <text x={60} y={68} textAnchor="middle" fontFamily={display} fontWeight={700} fontSize={26} fill={INK}>
            {Math.round(p * 100)}%
          </text>
        </svg>
      ) : (
        <div style={{ width: 120, height: 120, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', background: good ? '#e3f7ef' : '#eaf2ff', color: good ? MINT : PRIMARY, fontFamily: display, fontWeight: 800, fontSize: 52 }}>✓</div>
      )}
      <div>
        <div style={{ fontFamily: display, fontWeight: 800, fontSize: 64, lineHeight: 1, color: INK }}>
          <Count to={value} delay={delay} />
          <span style={{ fontSize: 38, color: MUTED, fontWeight: 600 }}> / {of}</span>
        </div>
        <div style={{ fontFamily: display, fontWeight: 600, fontSize: 25, color: INK, marginTop: 10 }}>{label}</div>
        <div style={{ fontFamily: body, fontSize: 18, color: MUTED, marginTop: 4 }}>{note}</div>
      </div>
    </div>
  );
}

function Results() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ padding: '90px 110px', flexDirection: 'column' }}>
        <Rise delay={0}>
          <div style={{ fontFamily: body, fontWeight: 600, fontSize: 28, color: PRIMARY, letterSpacing: 1 }}>RESULTS</div>
          <div style={{ fontFamily: display, fontWeight: 800, fontSize: 70, color: INK, letterSpacing: -1.5 }}>Tested end to end on the live app</div>
        </Rise>
        <div style={{ display: 'flex', gap: 40, marginTop: 50 }}>
          {RESULTS.accuracy.map((r, i) => (
            <StatCard key={r.label} {...r} delay={14 + i * 10} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 40, marginTop: 36 }}>
          {RESULTS.trust.map((r, i) => (
            <StatCard key={r.label} {...r} delay={70 + i * 10} />
          ))}
        </div>
        <Rise delay={96} style={{ marginTop: 34 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, padding: '14px 24px', borderRadius: 16, background: '#fff4dc', color: '#7a4b00', fontFamily: body, fontWeight: 600, fontSize: 24 }}>
            <span style={{ fontSize: 26 }}>⚠</span> {RESULTS.limit}
          </div>
        </Rise>
        <Rise delay={104} style={{ marginTop: 'auto' }}>
          <div style={{ fontFamily: body, fontSize: 20, color: MUTED }}>{RESULTS.source}</div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Speed() {
  const f = useCurrentFrame();
  const s = RESULTS.speed;
  const grow = (delay: number) => interpolate(f, [delay, delay + 40], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const appMinutes = 4.5;
  const W = 1300;
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ padding: '110px 130px', flexDirection: 'column' }}>
        <Rise delay={0}>
          <div style={{ fontFamily: body, fontWeight: 600, fontSize: 28, color: PRIMARY, letterSpacing: 1 }}>SPEED</div>
          <div style={{ fontFamily: display, fontWeight: 800, fontSize: 66, color: INK, letterSpacing: -1.5 }}>
            A {s.pages}-page booklet, {s.words} words
          </div>
        </Rise>
        <div style={{ marginTop: 70, display: 'flex', flexDirection: 'column', gap: 44 }}>
          <Rise delay={12}>
            <div style={{ fontFamily: display, fontWeight: 600, fontSize: 30, color: MUTED, marginBottom: 12 }}>Reading it once</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
              <div style={{ height: 54, width: W * grow(14), borderRadius: 14, background: '#c7d3e3' }} />
              <span style={{ fontFamily: display, fontWeight: 700, fontSize: 44, color: MUTED }}>≈ {s.reading} min</span>
            </div>
          </Rise>
          <Rise delay={30}>
            <div style={{ fontFamily: display, fontWeight: 600, fontSize: 30, color: INK, marginBottom: 12 }}>Anduin Legal Reviewer</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
              <div style={{ height: 54, width: Math.max(12, (W * appMinutes * grow(32)) / s.reading), borderRadius: 14, background: PRIMARY }} />
              <span style={{ fontFamily: display, fontWeight: 700, fontSize: 44, color: PRIMARY }}>{s.minutes} min</span>
              <span style={{ fontFamily: body, fontSize: 28, color: INK }}>→ {s.findings} findings, each linked to its source</span>
            </div>
          </Rise>
        </div>
        <Rise delay={60} style={{ marginTop: 'auto' }}>
          <div style={{ fontFamily: body, fontSize: 20, color: MUTED }}>Reading time estimated at 238 words per minute (Brysbaert, 2019). Review time measured on production. No timed human study.</div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Chapter({ n }: { n: number }) {
  const sec = SECTIONS[n - 1];
  const e = useEnter(4);
  return (
    <AbsoluteFill>
      <Backdrop blur={20} opacity={0.14} />
      <AbsoluteFill style={{ justifyContent: 'center', paddingLeft: 170 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 44 }}>
          <div style={{ width: 170, height: 170, borderRadius: '50%', display: 'grid', placeItems: 'center', background: PRIMARY, color: '#fff', fontFamily: display, fontWeight: 800, fontSize: 92, opacity: e, scale: String(0.85 + 0.15 * e), boxShadow: '0 24px 60px rgba(0,104,254,.35)' }}>{n}</div>
          <div>
            <Rise delay={8}>
              <div style={{ fontFamily: display, fontWeight: 800, fontSize: 84, color: INK, letterSpacing: -2 }}>{sec.title}</div>
            </Rise>
            <Rise delay={16}>
              <div style={{ fontFamily: body, fontWeight: 500, fontSize: 36, color: MUTED, marginTop: 8 }}>{sec.blurb}</div>
            </Rise>
          </div>
        </div>
        <Rise delay={20} style={{ marginTop: 70, display: 'flex', gap: 14, paddingLeft: 214 }}>
          {SECTIONS.map((x) => (
            <span key={x.n} style={{ width: x.n === n ? 60 : 16, height: 16, borderRadius: 16, background: x.n <= n ? PRIMARY : '#c9d7ea' }} />
          ))}
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function End() {
  return (
    <AbsoluteFill>
      <Backdrop opacity={0.22} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <Rise delay={4}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, justifyContent: 'center' }}>
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 96, letterSpacing: -2, color: INK }}>Anduin</span>
            <span style={{ fontFamily: body, fontSize: 68, color: INK }}>Legal Reviewer</span>
          </div>
        </Rise>
        <Rise delay={16}>
          <div style={{ fontFamily: body, fontWeight: 600, fontSize: 30, color: MUTED, marginTop: 36 }}>Try it live</div>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 58, color: PRIMARY, marginTop: 6 }}>anduin-legal-reviewer.vercel.app</div>
        </Rise>
        <Rise delay={28}>
          <div style={{ fontFamily: body, fontSize: 28, color: '#3c4a66', marginTop: 40 }}>github.com/ptquanwork-cmyk/anduin-legal-reviewer</div>
        </Rise>
        <Rise delay={40}>
          <div style={{ fontFamily: body, fontWeight: 500, fontSize: 28, color: INK, marginTop: 46 }}>Built by Pham The Quan (Jayson)</div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function render(s: Scene) {
  switch (s.kind) {
    case 'title':
      return <Title />;
    case 'results':
      return <Results />;
    case 'speed':
      return <Speed />;
    case 'chapter':
      return <Chapter n={s.section!} />;
    case 'end':
      return <End />;
    default:
      return <Shot scene={s} />;
  }
}

export function Intro() {
  return (
    <AbsoluteFill style={{ background: '#dbe8f7' }}>
      <TransitionSeries>
        {SCENES.flatMap((s, i) => {
          const seq = (
            <TransitionSeries.Sequence key={s.id} name={s.id} durationInFrames={s.dur}>
              {render(s)}
            </TransitionSeries.Sequence>
          );
          return i === 0 ? [seq] : [<TransitionSeries.Transition key={`t-${s.id}`} presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION })} />, seq];
        })}
      </TransitionSeries>
      {/* A soft whoosh only where a new section begins. */}
      {SCENES.map((s, i) =>
        s.kind === 'chapter' || s.kind === 'results' ? (
          <Sequence key={s.id} from={STARTS[i] - 4} durationInFrames={12} layout="none">
            <Audio src={staticFile('audio/whoosh.wav')} volume={0.25} />
          </Sequence>
        ) : null,
      )}
      <Audio src={staticFile('audio/music.wav')} volume={(fr) => interpolate(fr, [0, 10, TOTAL - 45, TOTAL], [0, 0.7, 0.7, 0], clamp)} />
    </AbsoluteFill>
  );
}
