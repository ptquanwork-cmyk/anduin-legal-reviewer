// Original music and sound effects for the introduction video, synthesised from scratch (no samples, no licences).
// Upbeat 120 BPM track — one beat is exactly 15 frames at 30 fps, so the video's cuts land on the beat:
// 2-bar intro with a riser, a drop on bar 3 (the first app scene), four-on-the-floor kick, claps on 2 and 4,
// off-beat bass, sidechain-pumped chords (C–G–Am–F) and a plucky lead hook. Also a mouse click and a quick whoosh.
// Usage: node music.mjs [seconds]   → public/audio/music.wav, click.wav, whoosh.wav
import { mkdir, writeFile } from 'node:fs/promises';

const SR = 44100;
const OUT = new URL('./public/audio/', import.meta.url);
await mkdir(OUT, { recursive: true });

function wav(left, right) {
  const n = left.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), 46 + i * 4);
  }
  return buf;
}
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
let seed = 11;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1; // deterministic noise

const seconds = Number(process.argv[2] ?? 74);
const N = Math.round(seconds * SR);
const BPM = 120;
const beat = 60 / BPM;
const bar = beat * 4;
const DROP = 2 * bar; // first app scene
const OUTRO = seconds - 4.5;

// Separate buses so the chords and bass can be "pumped" by the kick (sidechain) before mixing.
const drumsL = new Float32Array(N), drumsR = new Float32Array(N);
const musL = new Float32Array(N), musR = new Float32Array(N);
const add = (L, R, t0, dur, f, amp, shape, pan = 0, attack = 0.004, release = 0.08) => {
  const s0 = Math.floor(t0 * SR);
  const len = Math.floor((dur + release) * SR);
  for (let i = 0; i < len && s0 + i < N; i++) {
    if (s0 + i < 0) continue;
    const t = i / SR;
    const env = Math.min(1, t / attack) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / release));
    const v = shape(2 * Math.PI * f * t, t) * amp * env;
    L[s0 + i] += v * (1 - pan);
    R[s0 + i] += v * (1 + pan);
  }
};
// Supersaw-ish stab: a few detuned harmonic-rich oscillators.
const saw = (p) => Math.sin(p) + Math.sin(2 * p) / 2 + Math.sin(3 * p) / 3 + Math.sin(4 * p) / 4 + Math.sin(5 * p) / 5;
const stab = (p, t) => (saw(p) + saw(p * 1.006) + saw(p * 0.994)) * 0.33 * Math.exp(-t * 3.2);
const pad = (p, t) => (Math.sin(p) + 0.4 * Math.sin(2 * p) + 0.15 * Math.sin(3 * p)) * (0.9 + 0.1 * Math.sin(2 * Math.PI * 0.5 * t));
const pluck = (p, t) => (Math.sin(p) + 0.5 * Math.sin(2 * p) + 0.25 * Math.sin(3 * p)) * Math.exp(-t * 9);
const bassTone = (p, t) => (Math.sin(p) + 0.45 * Math.sin(2 * p) + 0.2 * Math.sin(3 * p)) * Math.exp(-t * 5);

const chords = [
  [60, 64, 67, 72], // C
  [55, 59, 62, 67], // G
  [57, 60, 64, 69], // Am
  [53, 57, 60, 65], // F
];
const roots = [36, 31, 33, 29];
// Lead hook (8th-note grid, two bars per motif; -1 = rest), transposed per chord.
const hook = [
  [72, -1, 76, -1, 79, 76, -1, 74, 72, -1, 74, 76, -1, 72, -1, -1],
  [74, -1, 79, -1, 83, 79, -1, 78, 74, -1, 76, 79, -1, 74, -1, -1],
  [76, -1, 81, -1, 84, 81, -1, 79, 76, -1, 79, 81, -1, 76, -1, -1],
  [77, -1, 81, -1, 84, 81, -1, 79, 77, -1, 76, 74, -1, 72, -1, -1],
];

const bars = Math.ceil(seconds / bar);
for (let b = 0; b < bars; b++) {
  const t0 = b * bar;
  const ci = b % 4;
  const c = chords[ci];
  const full = t0 >= DROP && t0 < OUTRO;
  // pads (intro: soft and open; groove: under the stabs)
  for (const m of c) {
    add(musL, musR, t0, bar, hz(m) * 0.998, full ? 0.022 : 0.035, pad, -0.5, 0.25, 0.4);
    add(musL, musR, t0, bar, hz(m) * 1.002, full ? 0.022 : 0.035, pad, 0.5, 0.25, 0.4);
  }
  if (full) {
    // chord stabs on the off-beat "and"s
    for (const k of [0.5, 1.5, 2.5, 3.5]) for (const m of c) add(musL, musR, t0 + k * beat, beat * 0.4, hz(m + 12), 0.03, stab, (m % 2 ? 0.3 : -0.3), 0.002, 0.06);
    // off-beat bass, plus a pickup
    for (let k = 0; k < 4; k++) add(musL, musR, t0 + (k + 0.5) * beat, beat * 0.42, hz(roots[ci]), 0.2, bassTone, 0, 0.003, 0.05);
    add(musL, musR, t0 + 3.75 * beat, beat * 0.2, hz(roots[(ci + 1) % 4] + 12), 0.12, bassTone, 0, 0.003, 0.04);
    // lead hook from the 3rd groove bar onwards, every other phrase an octave up for lift
    if (b >= 4) {
      const lift = Math.floor((b - 4) / 8) % 2 ? 12 : 0;
      hook[ci].forEach((m, k) => m > 0 && add(musL, musR, t0 + (k * beat) / 2, beat * 0.45, hz(m + lift), 0.07, pluck, k % 2 ? 0.25 : -0.25, 0.002, 0.18));
    }
  } else if (t0 < DROP) {
    // intro arpeggio
    [0, 1, 2, 3, 2, 1, 0, 2].forEach((k, j) => add(musL, musR, t0 + (j * beat) / 2, beat * 0.45, hz(c[k] + 12), 0.05, pluck, j % 2 ? 0.3 : -0.3, 0.002, 0.15));
  }
}

// Drums
const kicks = [];
for (let t = DROP; t < OUTRO + bar; t += beat) kicks.push(t);
for (const t of kicks) {
  const s0 = Math.floor(t * SR);
  for (let i = 0; i < 0.3 * SR && s0 + i < N; i++) {
    const tt = i / SR;
    const f = 50 + 110 * Math.exp(-tt * 28);
    const v = Math.sin(2 * Math.PI * f * tt) * Math.exp(-tt * 9) * 0.55 + (i < 90 ? rnd() * 0.15 * (1 - i / 90) : 0);
    drumsL[s0 + i] += v; drumsR[s0 + i] += v;
  }
}
const noiseHit = (t, dur, amp, hpStrength, pan = 0, decay = 30) => {
  const s0 = Math.floor(t * SR);
  let prev = 0;
  for (let i = 0; i < dur * SR && s0 + i < N; i++) {
    const n = rnd();
    const hp = n - prev * hpStrength; prev = n;
    const v = hp * Math.exp(-(i / SR) * decay) * amp;
    drumsL[s0 + i] += v * (1 - pan); drumsR[s0 + i] += v * (1 + pan);
  }
};
for (let t = DROP; t < OUTRO + bar; t += bar) {
  // claps on 2 and 4: three quick bursts
  for (const k of [1, 3]) for (const d of [0, 0.011, 0.022]) noiseHit(t + k * beat + d, 0.12, 0.13, 0.6, 0, 26);
  // hats: closed 16ths, open on the off-beats
  for (let s = 0; s < 16; s++) {
    if (s % 4 === 2) noiseHit(t + (s * beat) / 4, 0.16, 0.06, 1, 0.2, 18);
    else noiseHit(t + (s * beat) / 4, 0.03, s % 2 ? 0.025 : 0.035, 1, -0.2, 90);
  }
}
// Riser into the drop and an impact on it
{
  const r0 = Math.floor((DROP - bar) * SR);
  let lp = 0;
  for (let i = 0; i < bar * SR; i++) {
    const t = i / (bar * SR);
    lp += (0.02 + 0.5 * t * t) * (rnd() - lp);
    const v = lp * t * t * 0.35;
    drumsL[r0 + i] += v; drumsR[r0 + i] += v;
  }
  const s0 = Math.floor(DROP * SR);
  for (let i = 0; i < 1.2 * SR && s0 + i < N; i++) {
    const tt = i / SR;
    const v = Math.sin(2 * Math.PI * (38 + 40 * Math.exp(-tt * 6)) * tt) * Math.exp(-tt * 2.5) * 0.45;
    drumsL[s0 + i] += v; drumsR[s0 + i] += v;
  }
}

// Sidechain: duck the music bus right after each kick, then mix, saturate, fade, normalise to about -1 dBFS.
const L = new Float32Array(N), R = new Float32Array(N);
const kickSamples = new Set(kicks.map((t) => Math.floor(t * SR)));
let since = 1e9;
let peak = 0;
for (let i = 0; i < N; i++) {
  if (kickSamples.has(i)) since = 0;
  const duck = since < 1e8 ? 1 - 0.65 * Math.exp(-(since / SR) * 9) : 1;
  since++;
  const t = i / SR;
  const g = Math.min(1, t / 0.3) * (t > OUTRO + 1.5 ? Math.max(0, 1 - (t - OUTRO - 1.5) / 3) : 1);
  L[i] = Math.tanh((musL[i] * duck + drumsL[i]) * 1.35) * g;
  R[i] = Math.tanh((musR[i] * duck + drumsR[i]) * 1.35) * g;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
for (let i = 0; i < N; i++) { L[i] *= 0.89 / peak; R[i] *= 0.89 / peak; }
await writeFile(new URL('music.wav', OUT), wav(L, R));

// Mouse click: a press and a release, crisp and short.
{
  const n = Math.round(0.09 * SR);
  const c = new Float32Array(n);
  const part = (start, amp, tone) => {
    let prev = 0;
    for (let i = Math.round(start * SR); i < n; i++) {
      const t = i / SR - start;
      const noise = rnd();
      const hp = noise - prev; prev = noise;
      c[i] += hp * Math.exp(-t * 1100) * amp + Math.sin(2 * Math.PI * tone * t) * Math.exp(-t * 220) * amp * 0.5;
    }
  };
  part(0, 1, 2600);
  part(0.045, 0.55, 3200);
  await writeFile(new URL('click.wav', OUT), wav(c, c));
}

// Quick whoosh for cuts: band-limited noise sweeping up, 0.3 s.
{
  const n = Math.round(0.3 * SR);
  const l = new Float32Array(n), r = new Float32Array(n);
  let lp1 = 0, lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.sin(Math.PI * t) ** 1.5;
    const cutoff = 0.05 + 0.4 * t;
    lp1 += cutoff * (rnd() - lp1);
    lp2 += cutoff * (lp1 - lp2);
    l[i] = lp2 * env * (1 - t * 0.6);
    r[i] = lp2 * env * (0.4 + t * 0.6);
  }
  await writeFile(new URL('whoosh.wav', OUT), wav(l, r));
}
console.log(`upbeat music ${seconds}s at ${BPM} BPM, click, whoosh written`);
