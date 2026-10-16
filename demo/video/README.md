# Introduction video

A 68-second introduction to Anduin Legal Reviewer, built with [Remotion](https://www.remotion.dev/) from real screens of the app.

## What it shows

Title → 3D hub → Intake (Use demo, live job steps) → Source quality → Document map → Legal review (quoted source, Confirm issue) → Decision / report → Annotation → Form preview and the exported HTML form → Responses → PDF QA / export → full-screen mode → end card.

Each scene is a screenshot of the running app, driven in Chrome with the synthetic demo agreement. The video adds the camera zoom and pan, the cursor with click ripples and click sounds, captions, fade transitions and music.

## Sources

| Asset | How it is made |
| --- | --- |
| Screens (`public/shots/*.jpg`, `manifest.json`) | `capture.mjs` drives the app (local production build, worker online) with the synthetic demo agreement, records 3840 × 2160 screenshots, and records the centre of every element the cursor clicks |
| Music, click, whoosh (`public/audio/*.wav`) | `music.mjs` synthesises them from scratch: a 100 BPM bed of pad, bass, plucked arpeggio, soft kick and hats. No samples or third-party audio, so there is no licence to clear |
| Fonts | Poppins and Inter through `@remotion/google-fonts`, matching the app |

Only synthetic data appears on screen. The video names no AI vendor.

## Rebuild

```bash
npm install
```

```bash
node music.mjs 69.5
```

```bash
node capture.mjs http://localhost:3100
```

```bash
npx remotion render src/index.ts Intro out/anduin-legal-reviewer-intro.mp4 --codec=h264 --crf=18
```

The capture expects the app at the given address (for example `npx next start -p 3100` after `next build`) and the worker online. Scene timing, camera keyframes, cursor paths and captions are in `src/scenes.ts`; the components (camera, cursor, captions, title and end cards) are in `src/Intro.tsx`. `npx remotion studio src/index.ts` previews the video interactively.
