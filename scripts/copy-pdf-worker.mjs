// Copies runtime assets from installed packages into public/: the pdf.js worker and the Draco decoders
// used by the 3D station models, so the browser never fetches them from a third-party CDN.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';

mkdirSync('public/draco', { recursive: true });
copyFileSync('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', 'public/pdf.worker.min.mjs');
const draco = 'node_modules/three/examples/jsm/libs/draco/gltf';
for (const f of readdirSync(draco)) copyFileSync(`${draco}/${f}`, `public/draco/${f}`);
