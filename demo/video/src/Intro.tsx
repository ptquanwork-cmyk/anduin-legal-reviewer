import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { loadFont as loadPoppins } from '@remotion/google-fonts/Poppins';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { type Cam, type Caption, type Point, type Scene, SCENES, STARTS, TOTAL, TRANSITION } from './scenes';

const { fontFamily: display } = loadPoppins('normal', { weights: ['600', '700', '800'], subsets: ['latin'] });
const { fontFamily: body } = loadInter('normal', { weights: ['400', '500', '600'], subsets: ['latin'] });

const INK = '#0e1a44';
const PRIMARY = '#0068fe';
const ease = Easing.bezier(0.45, 0, 0.2, 1);

/** Value between keyframes with an ease-in-out curve; holds the first and last keyframe outside the range. */
function along<T extends { f: number }>(keys: T[], f: number, pick: (k: T) => number) {
  if (f <= keys[0].f) return pick(keys[0]);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (f <= b.f) return pick(a) + (pick(b) - pick(a)) * ease((f - a.f) / Math.max(1, b.f - a.f));
  }
  return pick(keys[keys.length - 1]);
}

function camera(keys: Cam[] | undefined, f: number) {
  if (!keys) return { tx: 0, ty: 0, z: 1 };
  const z = along(keys, f, (k) => k.z);
  const x = along(keys, f, (k) => k.x);
  const y = along(keys, f, (k) => k.y);
  // Keep the focus point centred, without ever showing past the screenshot's edges.
  const tx = Math.min(0, Math.max(1920 - 1920 * z, 960 - x * z));
  const ty = Math.min(0, Math.max(1080 - 1080 * z, 540 - y * z));
  return { tx, ty, z };
}

function Cursor({ points, z }: { points: Point[]; z: number }) {
  const f = useCurrentFrame();
  if (f < points[0].f - 6) return null;
  const x = along(points, f, (p) => p.x);
  const y = along(points, f, (p) => p.y);
  const appear = interpolate(f, [points[0].f - 6, points[0].f + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const clicks = points.filter((p) => p.click);
  const press = clicks.reduce((s, p) => Math.max(s, interpolate(f, [p.f, p.f + 3, p.f + 8], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })), 0);
  return (
    <>
      {clicks.map((p) => {
        const r = interpolate(f, [p.f, p.f + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        if (f < p.f || r >= 1) return null;
        return (
          <div
            key={p.f}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              width: 84 / z,
              height: 84 / z,
              marginLeft: -42 / z,
              marginTop: -42 / z,
              borderRadius: '50%',
              border: `${4 / z}px solid ${PRIMARY}`,
              background: 'rgba(0,104,254,.12)',
              opacity: 1 - r,
              transform: `scale(${0.3 + r * 0.9})`,
            }}
          />
        );
      })}
      {/* Arrow pointer, kept at a constant on-screen size while the camera zooms. */}
      <svg
        width={44}
        height={44}
        viewBox="0 0 24 24"
        style={{ position: 'absolute', left: x, top: y, opacity: appear, transform: `scale(${(1 - press * 0.18) / z})`, transformOrigin: '0 0', filter: 'drop-shadow(0 3px 5px rgba(10,20,60,.35))' }}
      >
        <path d="M3 2 L3 19 L7.6 14.8 L10.6 21.6 L13.6 20.3 L10.7 13.6 L17 13.6 Z" fill="#fff" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </>
  );
}

function CaptionCard({ c, dur }: { c: Caption; dur: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const end = c.to ?? dur - TRANSITION;
  const enter = spring({ frame: f - c.from, fps, config: { damping: 18, stiffness: 120 } });
  const leave = interpolate(f, [end - 8, end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (f < c.from) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 72,
        bottom: 64,
        padding: '22px 34px 24px',
        borderRadius: 26,
        background: 'rgba(255,255,255,.93)',
        boxShadow: '0 18px 50px rgba(14,26,68,.22), 0 0 0 1px rgba(14,26,68,.06)',
        opacity: enter * leave,
        transform: `translateY(${(1 - enter) * 36}px)`,
        maxWidth: 1560,
      }}
    >
      <div style={{ fontFamily: body, fontWeight: 600, fontSize: 24, letterSpacing: 0.4, color: PRIMARY }}>{c.kicker}</div>
      <div style={{ fontFamily: display, fontWeight: 700, fontSize: 44, lineHeight: 1.15, color: INK, marginTop: 4 }}>{c.title}</div>
    </div>
  );
}

function Shot({ scene }: { scene: Scene }) {
  const f = useCurrentFrame();
  const { tx, ty, z } = camera(scene.cam, f);
  return (
    <AbsoluteFill style={{ background: '#dbe8f7', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${z})` }}>
        {scene.layers?.map((l) => (
          <Img
            key={l.img}
            src={staticFile(`shots/${l.img}.jpg`)}
            style={{ position: 'absolute', inset: 0, width: 1920, height: 1080, opacity: l.from === 0 ? 1 : interpolate(f, [l.from, l.from + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}
          />
        ))}
        {scene.cursor && <Cursor points={scene.cursor} z={z} />}
      </div>
      {scene.captions?.map((c) => <CaptionCard key={c.from} c={c} dur={scene.dur} />)}
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

function Rise({ delay, children, style }: { delay: number; children: React.ReactNode; style?: React.CSSProperties }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 20, stiffness: 110 } });
  return <div style={{ opacity: s, transform: `translateY(${(1 - s) * 40}px)`, ...style }}>{children}</div>;
}

function Backdrop() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #eef5ff 0%, #d4e6fb 55%, #c3dbf7 100%)' }}>
      <Img src={staticFile('shots/hub.jpg')} style={{ position: 'absolute', inset: 0, width: 1920, height: 1080, opacity: 0.22, filter: 'blur(14px) saturate(1.1)', transform: `scale(${1.08 + f * 0.0006})` }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 30% 40%, rgba(255,255,255,.85), rgba(255,255,255,0) 70%)' }} />
    </AbsoluteFill>
  );
}

function Title() {
  return (
    <AbsoluteFill>
      <Backdrop />
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
          <div style={{ fontFamily: body, fontWeight: 500, fontSize: 32, color: '#3c4a66', marginTop: 30 }}>Source-linked findings · human decisions · verified PDF exports</div>
        </Rise>
        <Rise delay={58}>
          <div style={{ fontFamily: body, fontWeight: 500, fontSize: 26, color: '#5d6b82', marginTop: 46 }}>The Legal Reviewer challenge · Anduin Cybernetics hackathon</div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function End() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <Rise delay={8}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, justifyContent: 'center' }}>
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 96, letterSpacing: -2, color: INK }}>Anduin</span>
            <span style={{ fontFamily: body, fontSize: 68, color: INK }}>Legal Reviewer</span>
          </div>
        </Rise>
        <Rise delay={22}>
          <div style={{ fontFamily: body, fontWeight: 600, fontSize: 30, color: '#5d6b82', marginTop: 36 }}>Try it live</div>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 58, color: PRIMARY, marginTop: 6 }}>anduin-legal-reviewer.vercel.app</div>
        </Rise>
        <Rise delay={38}>
          <div style={{ fontFamily: body, fontSize: 28, color: '#3c4a66', marginTop: 40 }}>github.com/ptquanwork-cmyk/anduin-legal-reviewer</div>
        </Rise>
        <Rise delay={52}>
          <div style={{ fontFamily: body, fontWeight: 500, fontSize: 28, color: INK, marginTop: 46 }}>Built by Pham The Quan (Jayson)</div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function Intro() {
  return (
    <AbsoluteFill style={{ background: '#dbe8f7' }}>
      <TransitionSeries>
        {SCENES.flatMap((s, i) => {
          const seq = (
            <TransitionSeries.Sequence key={s.id} durationInFrames={s.dur}>
              {s.id === 'title' ? <Title /> : s.id === 'end' ? <End /> : <Shot scene={s} />}
            </TransitionSeries.Sequence>
          );
          return i === 0 ? [seq] : [<TransitionSeries.Transition key={`t-${s.id}`} presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION })} />, seq];
        })}
      </TransitionSeries>
      {/* A soft whoosh on every scene change; the music bed runs under everything, fading in and out. */}
      {STARTS.slice(1).map((start) => (
        <Sequence key={start} from={start - 4} durationInFrames={20} layout="none">
          <Audio src={staticFile('audio/whoosh.wav')} volume={0.35} />
        </Sequence>
      ))}
      <Audio src={staticFile('audio/music.wav')} volume={(f) => interpolate(f, [0, 30, TOTAL - 75, TOTAL], [0, 0.55, 0.55, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
    </AbsoluteFill>
  );
}
