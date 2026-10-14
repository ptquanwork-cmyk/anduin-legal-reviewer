'use client';
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { signedUrl } from '../../lib/supabase';
import { useNav } from '../../lib/nav';
import type { BBox } from '../../lib/types';

const docs = new Map<string, Promise<PDFDocumentProxy>>();

export function loadPdf(bucket: 'sources' | 'exports', path: string) {
  const key = `${bucket}/${path}`;
  if (!docs.has(key)) {
    const p = (async () => {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const url = await signedUrl(bucket, path);
      return pdfjs.getDocument({ url }).promise;
    })();
    p.catch(() => docs.delete(key));
    docs.set(key, p);
  }
  return docs.get(key)!;
}

export function usePdf(bucket: 'sources' | 'exports', path: string | null | undefined) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setDoc(null);
    setError(null);
    if (!path) return;
    let live = true;
    loadPdf(bucket, path)
      .then((d) => live && setDoc(d))
      .catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [bucket, path]);
  return { doc, error };
}

export interface Highlight {
  id: string;
  page: number;
  bbox: BBox;
  tone: 'warn' | 'error' | 'info' | 'select';
  label?: string;
}

const TONE: Record<Highlight['tone'], { fill: string; line: string }> = {
  warn: { fill: 'rgba(251,214,96,.42)', line: 'rgba(214,160,0,.0)' },
  error: { fill: 'rgba(240,80,100,.12)', line: '#e5484d' },
  info: { fill: 'rgba(72,175,240,.18)', line: 'rgba(72,175,240,.0)' },
  select: { fill: 'rgba(0,104,254,.10)', line: '#0068fe' },
};

/** One rendered PDF page at a CSS width, with highlight boxes and an optional overlay layer in page points. */
export function PdfPage({
  doc,
  page,
  width,
  highlights = [],
  overlay,
  className = '',
}: {
  doc: PDFDocumentProxy;
  page: number;
  width: number;
  highlights?: Highlight[];
  overlay?: (scale: number, size: { w: number; h: number }) => React.ReactNode;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { zoom } = useNav();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    doc.getPage(page).then((p) => {
      if (cancelled || !canvas.current) return;
      const base = p.getViewport({ scale: 1 });
      const scale = width / base.width;
      const ratio = (window.devicePixelRatio || 1) * zoom;
      const vp = p.getViewport({ scale: scale * ratio });
      const c = canvas.current;
      c.width = Math.floor(vp.width);
      c.height = Math.floor(vp.height);
      setSize({ w: base.width, h: base.height });
      task = p.render({ canvas: c, viewport: vp });
      task.promise.catch(() => {});
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, page, width, zoom]);

  const scale = size ? width / size.w : 1;
  return (
    <div className={`paper relative shadow-[0_6px_24px_rgba(30,60,120,.12)] ${className}`} style={{ width, height: size ? size.h * scale : width * 1.294 }} data-page={page}>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      {size &&
        highlights
          .filter((h) => h.page === page)
          .map((h) => (
            <div
              key={h.id}
              data-highlight={h.id}
              className="absolute rounded-[3px] transition-opacity"
              style={{ left: h.bbox.x * scale - 3, top: h.bbox.y * scale - 2, width: h.bbox.w * scale + 6, height: h.bbox.h * scale + 4, background: TONE[h.tone].fill, outline: TONE[h.tone].line !== 'rgba(214,160,0,.0)' && TONE[h.tone].line !== 'rgba(72,175,240,.0)' ? `1.5px solid ${TONE[h.tone].line}` : undefined, mixBlendMode: 'multiply' }}
            >
              {h.label && (
                <span className="absolute -top-7 right-0 whitespace-nowrap rounded-full px-3 py-0.5 text-[12px] font-medium" style={{ background: 'var(--selected)', color: 'var(--primary)', mixBlendMode: 'normal' }}>
                  {h.label}
                </span>
              )}
            </div>
          ))}
      {size && overlay?.(scale, size)}
    </div>
  );
}

/** Scrolls a scroll container (made position: relative) so el sits a third of the way down, without moving the page. */
export function scrollWithin(box: HTMLElement | null, el: HTMLElement | null) {
  if (!box || !el) return;
  let top = 0;
  for (let n: HTMLElement | null = el; n && n !== box; n = n.offsetParent as HTMLElement | null) top += n.offsetTop;
  box.scrollTo({ top: Math.max(0, top - box.clientHeight / 3), behavior: 'smooth' });
}

/** Placeholder paper when no PDF exists yet (e.g. converter offline): shows the extracted text. */
export function TextPaper({ blocks, width, highlightIdx = [] }: { blocks: { idx: number; kind: string; text: string }[]; width: number; highlightIdx?: number[] }) {
  return (
    <div className="paper px-10 py-8 font-[family-name:var(--font-paper)] text-[15px] leading-relaxed" style={{ width }}>
      {blocks.map((b) => (
        <p key={b.idx} data-highlight={highlightIdx.includes(b.idx) ? `t${b.idx}` : undefined} className={b.kind === 'heading' || b.kind === 'title' ? 'mt-4 font-bold' : 'mt-2'} style={highlightIdx.includes(b.idx) ? { background: 'rgba(251,214,96,.45)' } : undefined}>
          {b.text}
        </p>
      ))}
    </div>
  );
}
