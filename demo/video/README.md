# Introduction video

A 96-second introduction to Anduin Legal Reviewer, built with [Remotion](https://www.remotion.dev/) from real screens of the app.

## What it shows

Results come first, then the workflow in six chapters. Each chapter opens with a short title card (number, title, one-line summary, progress dots):

1. **Title.**
2. **Results:** six measured numbers from the [19 October production test](../../evals/results/2026-10-19-production-test-report.md), with a count-up and a ring for 69/74 planted problems found, and 95% Wilson intervals. The weakest numbers (AI-only conflicts 3 of 6, two conflicts lost to a two-column layout, 4 of 34 traps flagged) are shown on screen, with the source line.
3. **Speed:** the 38-page booklet reviewed in 2.2–2.7 minutes against about 72 minutes to read it once. The footnote says how the reading time is estimated and that there was no timed human study.
4. **Upload & check the source:** Intake with the six job checks; Word against the converted PDF.
5. **Review with evidence:** relationships graph; a finding's exact passage; Dismiss with a reason.
6. **Decide, report & revise:** the outcome, next step and questions for counsel; Create revised PDF with the corrections, uploaded as v2; Compare proposes the corrected findings as resolved.
7. **Digitize the form:** the annotation editor; the exported HTML form.
8. **Verify & export:** a clipped answer caught; the fixed version, with a Vietnamese answer, passing every check and exported.
9. **Memory & workspace:** decision history, the per-screen guide, full-screen mode; end card.

Each shot is a screenshot of the running app, driven in Chrome with the synthetic demo agreement and the revision made in the Create revised PDF dialog. The video adds a slow camera zoom and pan, the cursor with click ripples and click sounds, one short caption per shot, a section tag and one-beat fade transitions.

**Beat sync.** The music runs at 180 BPM (10 frames per beat at 30 fps; measured with an onset-autocorrelation tracker, drift under 10 ms). `sync()` in `src/scenes.ts` fits the scene plan to it:
- Every cut (the middle of a fade) sits on a bar line, and every scene lasts a whole number of bars.
- The results card hands over to the speed card on the first drop (11.55 s). The Create revised PDF → Compare cut lands on the second drop (52.89 s).
- Clicks, screen changes and camera keyframes land on beats, and so do the card animations.
- The music ducks for a moment under every click and section whoosh, so the clicks stay audible over the drums.

Checked on the render: every cut is within half a frame of its bar line, the music is 0 ms from the source, and every click stands out above the ducked music. If the music changes, re-measure `BEAT`, `BEAT0`, `BAR0` and `DROP` in `src/scenes.ts`.

The numbers on screen live in `src/results.ts`; update them there when the report changes.

## Sources

| Asset | How it is made |
| --- | --- |
| Screens (`public/shots/*.jpg`, `manifest.json`) | `capture.mjs` drives the app with the synthetic demo agreement and its revision, through the UI and, for some reviewer actions, through the API. The app runs as a local production build with the worker online, and `?static` uses the approved station stills instead of software-rendered WebGL. It records 3840 × 2160 screenshots and the centre of every element the cursor clicks |
| Music (`public/audio/music-rock.mp3`) | "Energetic Rock Background Music For Sports & Workout Videos" by MorningLightMusic, supplied by the owner, who is responsible for its licence. The track file is **not** in the repository (`public/audio/` is ignored); put the MP3 at that path before rendering. It plays at 0.55 under the clicks and fades out over the last 2 s |
| Click, whoosh (`public/audio/*.wav`) | Synthesised by `music.mjs`, which also writes an unused 120 BPM fallback bed (`music.wav`). No samples |
| Fonts | Poppins and Inter through `@remotion/google-fonts`, matching the app |

Only synthetic data appears on screen. The video names no AI vendor.

## Rebuild

```bash
npm install
```

```bash
node music.mjs 96   # click and whoosh; copy the owner's MP3 to public/audio/music-rock.mp3
```

```bash
node capture.mjs http://localhost:3100
```

```bash
npx remotion render src/index.ts Intro out/anduin-legal-reviewer-intro.mp4 --codec=h264 --crf=18
```

The capture expects the app at the given address (for example `npx next start -p 3100` after `next build`) and the worker online.
- Sections, scene timing, camera keyframes, cursor paths and captions are in `src/scenes.ts`; the result numbers are in `src/results.ts`.
- The components (camera, cursor, captions, section tag, results and speed cards, chapter cards, end card, transitions and audio) are in `src/Intro.tsx`.
- `npx remotion studio src/index.ts` previews the video interactively.
