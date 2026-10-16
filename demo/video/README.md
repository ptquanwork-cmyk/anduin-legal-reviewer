# Introduction video

A 73-second, fast-paced introduction to Anduin Legal Reviewer, built with [Remotion](https://www.remotion.dev/) from real screens of the app.

## What it shows

There are 28 beats, cut on the music's beat (120 BPM: one beat is 15 frames at 30 fps):

1. **Hook and overview:** kinetic title, the 3D hub, the "How to use" guide.
2. **Intake and source quality:** Intake with Use demo and the six job checks, then Source quality: Word against PDF, and the Fonts tab.
3. **Document map:** outline with findings per section, relationships graph, page map.
4. **Legal review:**
   - the quoted source, then the category filters;
   - Dismiss with a reason, used as an example for later reviews;
   - a question for counsel, then Confirm.
5. **Report and revision:** Decision / report, then uploading revision v2 and marking a fixed finding resolved.
6. **Digitization:** Annotation (field editor, draw mode), Form preview with plain-language help, the exported HTML form, Responses.
7. **PDF QA:** a clipped answer caught, then the fixed version passing every check and exported.
8. **Memory and workspace:** Feedback, Templates, full-screen mode with step navigation, dark theme, end card.

Each beat is a screenshot of the running app, driven in Chrome with the synthetic demo agreement and its revision. The video adds the camera zoom and pan, the cursor with click ripples and click sounds, captions, slide and fade cuts, a beat pulse, a progress bar and music.

## Sources

| Asset | How it is made |
| --- | --- |
| Screens (`public/shots/*.jpg`, `manifest.json`) | `capture.mjs` drives the app with the synthetic demo agreement and its revision, through the UI and, for some reviewer actions, through the API. The app runs as a local production build with the worker online, and `?static` uses the approved station stills instead of software-rendered WebGL. It records 3840 × 2160 screenshots and the centre of every element the cursor clicks |
| Music, click, whoosh (`public/audio/*.wav`) | `music.mjs` synthesises an upbeat 120 BPM track: 2-bar intro with a riser, a drop on the first app scene, four-on-the-floor kick, claps, hats, off-beat bass, sidechain-pumped C–G–Am–F chords and a plucked lead hook. It also makes the click and whoosh. No samples or third-party audio, so there is no licence to clear |
| Fonts | Poppins and Inter through `@remotion/google-fonts`, matching the app |

Only synthetic data appears on screen. The video names no AI vendor.

## Rebuild

```bash
npm install
```

```bash
node music.mjs 74
```

```bash
node capture.mjs http://localhost:3100
```

```bash
npx remotion render src/index.ts Intro out/anduin-legal-reviewer-intro.mp4 --codec=h264 --crf=18
```

The capture expects the app at the given address (for example `npx next start -p 3100` after `next build`) and the worker online.
- Scene timing (in beats), camera keyframes, cursor paths and captions are in `src/scenes.ts`.
- The components (camera, cursor, captions, kinetic title, end card, cuts and audio) are in `src/Intro.tsx`.
- `npx remotion studio src/index.ts` previews the video interactively.
