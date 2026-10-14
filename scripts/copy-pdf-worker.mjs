// Copies the pdf.js worker into public/ so the browser viewer loads the version installed with the app.
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('public', { recursive: true });
copyFileSync('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', 'public/pdf.worker.min.mjs');
