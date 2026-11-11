#!/usr/bin/env python3
"""يقصّ القصاصات من صور الصفحات ويجمعها صوراً، بدقتها الكاملة بلا تصغير. يستدعيه crops.js ولا يُشغَّل وحده.
usage: python3 -I crops_draw.py job.json
job: { "sheets": [ { "out": "sheet-001.png", "width": 1100,
                     "crops": [ { "label": "120.45  p120", "img": "p120.png", "rect": [x0, y0, x1, y1], "marks": [[x0, y, x1], ...] } ] } ] }
rect and marks are in the pixels of img. A mark is a thin line drawn under a doubtful word, in the gap below its line."""
import json
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except Exception:  # noqa: BLE001
    print('NOT RUN: the Python imaging library (Pillow) is not installed')
    sys.exit(3)

LABEL_H = 28
RED = (200, 30, 30)


def font():
    try:
        return ImageFont.load_default(size=20)
    except TypeError:
        return ImageFont.load_default()


def main():
    job = json.load(open(sys.argv[1], encoding='utf-8'))
    f = font()
    cache = {}
    for sheet in job['sheets']:
        width = sheet['width']
        parts = []
        for c in sheet['crops']:
            if c['img'] not in cache:
                cache.clear()
                cache[c['img']] = Image.open(c['img']).convert('RGB')
            im = cache[c['img']]
            x0, y0, x1, y1 = c['rect']
            x0, y0, x1, y1 = max(0, x0), max(0, y0), min(im.width, x1), min(im.height, y1)
            piece = im.crop((x0, y0, x1, y1))
            d = ImageDraw.Draw(piece)
            for mx0, my, mx1 in c.get('marks', []):
                d.line([(mx0 - x0, my - y0), (mx1 - x0, my - y0)], fill=RED, width=3)
            parts.append((c['label'], piece))
        height = sum(LABEL_H + p.height for _, p in parts)
        out = Image.new('RGB', (width, height), (255, 255, 255))
        d = ImageDraw.Draw(out)
        y = 0
        for label, piece in parts:
            d.rectangle([0, y, width, y + LABEL_H - 1], fill=(232, 232, 232))
            d.text((8, y + 3), label, fill=(0, 0, 0), font=f)
            y += LABEL_H
            out.paste(piece, (width - piece.width, y))      # القصاصة على اليمين: النص عربي
            y += piece.height
        out.save(sheet['out'])
    print('sheets written: %d' % len(job['sheets']))


main()
