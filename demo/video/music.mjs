// Original music and sound effects for the introduction video, synthesised from scratch (no samples, no licences):
// a warm 100 BPM electronic bed (pad, bass, plucked arpeggio, soft kick and hats), a mouse click and a soft whoosh.
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
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1; // deterministic noise

// ---- music -------------------------------------------------------------------------------------------------------
const seconds = Number(process.argv[2] ?? 78);
const N = Math.round(seconds * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);
const BPM = 100;
const beat = 60 / BPM;
const bar = beat * 4;
// Fmaj7 – Am7 – Cmaj7 – G6 (bright, forward-moving)
const chords = [
  [53, 57, 60, 64],
  [57, 60, 64, 67],
  [48, 52, 55, 59],
  [55, 59, 62, 64],
];
const roots = [41, 45, 48, 43];
const add = (t0, dur, f, amp, shape, pan = 0, attack = 0.005, release = 0.1) => {
  const s0 = Math.floor(t0 * SR);
  const len = Math.floor((dur + release) * SR);
  for (let i = 0; i < len && s0 + i < N; i++) {
    const t = i / SR;
    const env = Math.min(1, t / attack) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / release));
    const v = shape(2 * Math.PI * f * t, t) * amp * env;
    L[s0 + i] += v * (1 - pan) * 0.5 * 2 ** 0.5;
    R[s0 + i] += v * (1 + pan) * 0.5 * 2 ** 0.5;
  }
};
const pad = (p, t) => (Math.sin(p) + 0.35 * Math.sin(2 * p) + 0.12 * Math.sin(3 * p)) * (0.85 + 0.15 * Math.sin(2 * Math.PI * 0.25 * t));
const pluck = (p, t) => (Math.sin(p) + 0.3 * Math.sin(3 * p) / 3 + 0.2 * Math.sin(2 * p)) * Math.exp(-t * 7);
const bass = (p, t) => (Math.sin(p) + 0.25 * Math.sin(2 * p)) * Math.exp(-t * 2.2);

const bars = Math.ceil(seconds / bar);
const introBars = 3; // pad + arpeggio only
const outroStart = seconds - 5;
for (let b = 0; b < bars; b++) {
  const t0 = b * bar;
  if (t0 > seconds) break;
  const c = chords[b % 4];
  // pad: each chord tone slightly detuned left/right
  for (const m of c) {
    add(t0, bar, hz(m) * 0.998, 0.035, pad, -0.6, 0.6, 0.8);
    add(t0, bar, hz(m) * 1.002, 0.035, pad, 0.6, 0.6, 0.8);
  }
  // arpeggio: 8th notes, chord tones an octave up, alternating sides
  const arp = [c[0] + 12, c[1] + 12, c[2] + 12, c[3] + 12, c[2] + 12, c[1] + 12, c[0] + 24, c[2] + 12];
  arp.forEach((m, k) => add(t0 + (k * beat) / 2, beat / 2, hz(m), b < introBars ? 0.05 : 0.065, pluck, k % 2 ? 0.35 : -0.35, 0.003, 0.25));
  if (b >= introBars - 1) {
    // bass on beats 1 and 3 (and a pickup on 4&)
    add(t0, beat * 1.5, hz(roots[b % 4]), 0.16, bass, 0, 0.01, 0.15);
    add(t0 + beat * 2, beat * 1.2, hz(roots[b % 4]), 0.13, bass, 0, 0.01, 0.15);
    add(t0 + beat * 3.5, beat * 0.4, hz(roots[(b + 1) % 4]), 0.09, bass, 0, 0.01, 0.1);
  }
  if (b >= introBars) {
    for (let k = 0; k < 4; k++) {
      // soft kick: pitch sweep 110 → 45 Hz
      const s0 = Math.floor((t0 + k * beat) * SR);
      for (let i = 0; i < 0.28 * SR && s0 + i < N; i++) {
        const t = i / SR;
        const f = 45 + 65 * Math.exp(-t * 30);
        const v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 12) * 0.32;
        L[s0 + i] += v; R[s0 + i] += v;
      }
      // hats on the off-beats: short high-passed noise
      const h0 = Math.floor((t0 + k * beat + beat / 2) * SR);
      let prev = 0;
      for (let i = 0; i < 0.05 * SR && h0 + i < N; i++) {
        const n = rnd();
        const hp = n - prev; prev = n;
        const v = hp * Math.exp(-(i / SR) * 70) * 0.028;
        L[h0 + i] += v * 0.8; R[h0 + i] += v;
      }
    }
  }
}
// master: fade in/out, gentle saturation, normalise to -3 dBFS
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const g = Math.min(1, t / 1.5) * (t > outroStart ? Math.max(0, 1 - (t - outroStart) / 5) : 1);
  L[i] = Math.tanh(L[i] * 1.2) * g;
  R[i] = Math.tanh(R[i] * 1.2) * g;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.7 / peak;
for (let i = 0; i < N; i++) { L[i] *= norm; R[i] *= norm; }
await writeFile(new URL('music.wav', OUT), wav(L, R));

// ---- click: a crisp mouse click (transient + short body) -------------------------------------------------------------
{
  const n = Math.round(0.06 * SR);
  const c = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const noise = rnd();
    const hp = noise - prev; prev = noise;
    c[i] = hp * Math.exp(-t * 900) * 0.9 + Math.sin(2 * Math.PI * 2300 * t) * Math.exp(-t * 160) * 0.45 + Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t * 90) * 0.25;
  }
  await writeFile(new URL('click.wav', OUT), wav(c, c));
}

// ---- whoosh: band-limited noise swelling and fading, for scene changes ---------------------------------------------
{
  const n = Math.round(0.55 * SR);
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  let lp1 = 0, lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.sin(Math.PI * t) ** 2;
    const cutoff = 0.04 + 0.25 * t; // rising brightness
    lp1 += cutoff * (rnd() - lp1);
    lp2 += cutoff * (lp1 - lp2);
    l[i] = lp2 * env * 0.9 * (1 - t * 0.5);
    r[i] = lp2 * env * 0.9 * (0.5 + t * 0.5);
  }
  await writeFile(new URL('whoosh.wav', OUT), wav(l, r));
}
console.log(`music ${seconds}s, click, whoosh written`);
