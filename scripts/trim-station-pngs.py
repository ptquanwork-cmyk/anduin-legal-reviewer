"""Trim the approved transparent station references to their alpha bounds and save web-sized WebP copies.

Usage: python -I scripts/trim-station-pngs.py design/components-3d public/3d/png
"""
import sys
from pathlib import Path
from PIL import Image

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
dst.mkdir(parents=True, exist_ok=True)
for png in sorted(src.glob('0*.png')):
    img = Image.open(png).convert('RGBA')
    bbox = img.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    img = img.crop(bbox)
    img.thumbnail((720, 720), Image.LANCZOS)
    out = dst / (png.stem + '.webp')
    img.save(out, 'WEBP', quality=88, method=6)
    print(f'{out.name} {img.width}x{img.height} {out.stat().st_size // 1024}KB')
