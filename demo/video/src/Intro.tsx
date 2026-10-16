import { AbsoluteFill, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { loadFont as loadPoppins } from '@remotion/google-fonts/Poppins';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { BEAT, type Cam, type Caption, durOf, type Point, type Scene, SCENES, STARTS, TOTAL, TRANSITION } from './scenes';

const { fontFamily: display } = loadPoppins('normal', { weights: ['600', '700', '800'], subsets: ['latin'] });
const { fontFamily: body } = loadInter('normal', { weights: ['400', '500', '600'], subsets: ['latin'] });

const INK = '#0e1a44';
const PRIMARY = '#0068fe';
const ease = Easing.bezier(0.7, 0, 0.2, 1); // quick out, quick settle: matches the 120 BPM pace
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

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
  if (f < points[0].f - 4) return null;
  const clicks = points.filter((p) => p.click);
  const press = clicks.reduce((s, p) => Math.max(s, interpolate(f, [p.f, p.f + 2, p.f + 6], [0, 1, 0], clamp)), 0);
  return (
    <>
      {clicks.map((p) => {
        const r = interpolate(f, [p.f, p.f + 12], [0, 1], clamp);
        if (f < p.f || r >= 1) return null;
        return (
          <div
            key={p.f}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              width: 90 / z,
              height: 90 / z,
              marginLeft: -45 / z,
              marginTop: -45 / z,
              borderRadius: '50%',
              border: `${4 / z}px solid ${PRIMARY}`,
              background: 'rgba(0,104,254,.14)',
              opacity: 1 - r,
              scale: String(0.25 + r * 0.95),
            }}
          />
        );
      })}
      {/* Arrow pointer, kept at a constant on-screen size while the camera zooms. */}
      <svg
        width={46}
        height={46}
        viewBox="0 0 24 24"
        style={{
          position: 'absolute',
          left: along(points, f, (p) => p.x),
          top: along(points, f, (p) => p.y),
          opacity: interpolate(f, [points[0].f - 4, points[0].f + 3], [0, 1], clamp),
          scale: String((1 - press * 0.2) / z),
          transformOrigin: '0 0',
          filter: 'drop-shadow(0 3px 5px rgba(10,20,60,.35))',
        }}
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
  const enter = spring({ frame: f - c.from, fps, config: { damping: 16, stiffness: 210 } });
  if (f < c.from) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 72,
        bottom: 64,
        padding: '20px 32px 22px',
        borderRadius: 24,
        background: 'rgba(255,255,255,.95)',
        boxShadow: '0 18px 50px rgba(14,26,68,.24), 0 0 0 1px rgba(14,26,68,.06)',
        opacity: enter * interpolate(f, [end - 6, end], [1, 0], clamp),
        translate: `${(1 - enter) * -60}px 0px`,
        maxWidth: 1600,
      }}
    >
      <div style={{ fontFamily: body, fontWeight: 600, fontSize: 24, letterSpacing: 0.4, color: PRIMARY }}>{c.kicker}</div>
      <div style={{ fontFamily: display, fontWeight: 700, fontSize: 44, lineHeight: 1.15, color: INK, marginTop: 4 }}>{c.title}</div>
    </div>
  );
}

function Shot({ scene, start }: { scene: Scene; start: number }) {
  const f = useCurrentFrame();
  const { tx, ty, z } = camera(scene.cam, f);
  // A small push on every beat keeps the picture moving with the music.
  const pulse = 1 + 0.008 * Math.exp(-(((start + f) % BEAT) / 3));
  return (
    <AbsoluteFill style={{ background: '#dbe8f7', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 1920, height: 1080, transformOrigin: '0 0', translate: `${tx}px ${ty}px`, scale: String(z * pulse) }}>
        {scene.layers?.map((l) => (
          <Img key={l.img} src={staticFile(`shots/${l.img}.jpg`)} style={{ position: 'absolute', inset: 0, width: 1920, height: 1080, opacity: l.from === 0 ? 1 : interpolate(f, [l.from, l.from + 6], [0, 1], clamp) }} />
        ))}
        {scene.cursor && <Cursor points={scene.cursor} z={z} />}
      </div>
      {scene.captions?.map((c) => <CaptionCard key={c.from} c={c} dur={durOf(scene)} />)}
      {scene.cursor
        ?.filter((p) => p.click)
        .map((p) => (
          <Sequence key={p.f} from={p.f} durationInFrames={20} layout="none">
            <Audio src={staticFile('audio/click.wav')} volume={1} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
}

function Backdrop() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #eef5ff 0%, #d4e6fb 55%, #c3dbf7 100%)' }}>
      <Img src={staticFile('shots/hub.jpg')} style={{ position: 'absolute', inset: 0, width: 1920, height: 1080, opacity: 0.22, filter: 'blur(14px) saturate(1.1)', scale: String(1.08 + f * 0.0008) }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 30% 40%, rgba(255,255,255,.85), rgba(255,255,255,0) 70%)' }} />
    </AbsoluteFill>
  );
}

/** A line that pops in on a given beat. */
function Pop({ beat, children, style }: { beat: number; children: React.ReactNode; style?: React.CSSProperties }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - beat * BEAT, fps, config: { damping: 13, stiffness: 230 } });
  return <div style={{ opacity: Math.min(1, s * 1.4), translate: `0px ${(1 - s) * 50}px`, scale: String(0.9 + 0.1 * s), ...style }}>{children}</div>;
}

function Title() {
  const f = useCurrentFrame();
  const hook = f < 4 * BEAT;
  return (
    <AbsoluteFill>
      <Backdrop />
      {hook ? (
        // Beats 0–3: the problem, one word per beat.
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 34 }}>
          {['Contracts', 'arrive', 'with', 'errors.'].map((w, i) => (
            <Pop key={w} beat={i} style={{ fontFamily: display, fontWeight: 800, fontSize: 120, letterSpacing: -3, color: i === 3 ? '#e5383b' : INK }}>
              {w}
            </Pop>
          ))}
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ justifyContent: 'center', paddingLeft: 150 }}>
          <Pop beat={4}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 26 }}>
              <span style={{ fontFamily: display, fontWeight: 800, fontSize: 150, letterSpacing: -4, color: INK }}>Anduin</span>
              <span style={{ fontFamily: body, fontWeight: 400, fontSize: 104, color: INK }}>Legal Reviewer</span>
            </div>
          </Pop>
          <Pop beat={5}>
            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 64, color: PRIMARY, marginTop: 18 }}>Review contracts before you digitize.</div>
          </Pop>
          <Pop beat={6}>
            <div style={{ fontFamily: body, fontWeight: 500, fontSize: 32, color: '#3c4a66', marginTop: 30 }}>Source-linked findings · human decisions · verified PDF exports</div>
          </Pop>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

function End() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <Pop beat={0}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, justifyContent: 'center' }}>
            <span style={{ fontFamily: display, fontWeight: 800, fontSize: 96, letterSpacing: -2, color: INK }}>Anduin</span>
            <span style={{ fontFamily: body, fontSize: 68, color: INK }}>Legal Reviewer</span>
          </div>
        </Pop>
        <Pop beat={1}>
          <div style={{ fontFamily: body, fontWeight: 600, fontSize: 30, color: '#5d6b82', marginTop: 36 }}>Try it live</div>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 58, color: PRIMARY, marginTop: 6 }}>anduin-legal-reviewer.vercel.app</div>
        </Pop>
        <Pop beat={2}>
          <div style={{ fontFamily: body, fontSize: 28, color: '#3c4a66', marginTop: 40 }}>github.com/ptquanwork-cmyk/anduin-legal-reviewer</div>
        </Pop>
        <Pop beat={3}>
          <div style={{ fontFamily: body, fontWeight: 500, fontSize: 28, color: INK, marginTop: 46 }}>Built by Pham The Quan (Jayson) · The Legal Reviewer · Anduin Cybernetics hackathon</div>
        </Pop>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function Intro() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#dbe8f7' }}>
      <TransitionSeries>
        {SCENES.flatMap((s, i) => {
          const seq = (
            <TransitionSeries.Sequence key={s.id} name={s.id} durationInFrames={durOf(s)}>
              {s.id === 'title' ? <Title /> : s.id === 'end' ? <End /> : <Shot scene={s} start={STARTS[i]} />}
            </TransitionSeries.Sequence>
          );
          if (i === 0) return [seq];
          // Alternate quick slides and fades so the cuts feel rhythmic, not repetitive.
          const presentation = i % 3 === 0 ? fade() : slide({ direction: i % 2 ? 'from-right' : 'from-bottom' });
          return [<TransitionSeries.Transition key={`t-${s.id}`} presentation={presentation} timing={linearTiming({ durationInFrames: TRANSITION })} />, seq];
        })}
      </TransitionSeries>
      {/* Progress through the walkthrough. */}
      <div style={{ position: 'absolute', left: 0, top: 0, height: 6, width: `${(f / TOTAL) * 100}%`, background: PRIMARY, opacity: interpolate(f, [8 * BEAT, 8 * BEAT + 8], [0, 0.9], clamp) }} />
      {STARTS.slice(1).map((start) => (
        <Sequence key={start} from={start - 3} durationInFrames={12} layout="none">
          <Audio src={staticFile('audio/whoosh.wav')} volume={0.3} />
        </Sequence>
      ))}
      <Audio src={staticFile('audio/music.wav')} volume={(fr) => interpolate(fr, [0, 6, TOTAL - 40, TOTAL], [0, 0.85, 0.85, 0], clamp)} />
    </AbsoluteFill>
  );
}
