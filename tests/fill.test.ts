import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { fillAndCheck } from '../src/digitize/fill';
import type { AnnotationRow } from '../src/lib/types';
import { extractPdf } from '../src/review/extract';

const field = (field_id: string, y: number): AnnotationRow => ({
  id: field_id, version_id: 'v', field_id, type: 'text_box', label: field_id, options: [], page: 1,
  bbox: { x: 72, y, w: 420, h: 22 }, source_block_idx: null, required: false, transfer_state: 'matched', origin: 'manual', confirmed: true,
});

async function fill(answers: Record<string, string>, final: boolean) {
  const doc = await PDFDocument.create();
  doc.addPage([595.28, 841.89]);
  const anns = Object.keys(answers).map((k, i) => field(k, 100 + i * 40));
  const r = await fillAndCheck(await doc.save(), anns, [], answers, final);
  return { ...r, out: await extractPdf(r.bytes) };
}

describe('form fill fonts', () => {
  it('keeps every Vietnamese letter in draft and final PDFs', async () => {
    const vi = 'Nguyễn Thị Hồng Ánh, Điều 5 - Phụ lục: ề ụ ạ ờ ữ ặ';
    for (const final of [false, true]) {
      const { out, checks } = await fill({ name: vi, city: 'Ho Chi Minh City' }, final);
      const text = out.blocks.map((b) => b.text).join(' ');
      expect(text).toContain(vi);
      expect(text).toContain('Ho Chi Minh City');
      expect(checks.find((c) => c.key === 'values')?.status).toBe('pass');
      expect(out.fonts.some((f) => /DejaVu/i.test(f))).toBe(true);
    }
  });

  it('draws Latin-only answers in Liberation Sans without embedding DejaVu', async () => {
    const { out } = await fill({ name: 'Jane Doe', city: 'Đà Lat' }, true); // Đ is in Liberation
    expect(out.fonts.some((f) => /DejaVu/i.test(f))).toBe(false);
    expect(out.blocks.map((b) => b.text).join(' ')).toContain('Đà Lat');
  });
});
