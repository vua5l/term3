#!/usr/bin/env python3
"""صورة صفحة كتاب للنظر فيها بأداة Read، بلا هوامش بيضاء.
usage: view.py PAGE                -> الصفحة كلها (أطول ضلع 1560 نقطة)
       view.py PAGE TOP BOTTOM     -> شريط من الصفحة بأعلى دقة تسعها الأداة، والحدّان كسران من 0 إلى 1
                                      مثل: view.py 355 0.78 1  (الحواشي)، view.py 355 0 0.5 (النصف الأعلى)
يطبع مسار الصورة في /home/claude/book/view."""
import sys, os
from PIL import Image, ImageOps

T = os.environ.get('BOOK_TSV', '/home/claude/book/tsv')
V = '/home/claude/book/view'
MAX = 1560
os.makedirs(V, exist_ok=True)
p = int(sys.argv[1])
src = os.path.join(T, 'p%d.png' % p)
if not os.path.exists(src):
    sys.exit('no image %s: run prep_ocr.sh for this page first' % src)
im = Image.open(src).convert('L')
w, h = im.size
band = len(sys.argv) == 4
if band:
    a, b = float(sys.argv[2]), float(sys.argv[3])
    im = im.crop((0, int(h * a), w, int(h * b)))
# trim white margins (keep a small border)
mask = ImageOps.invert(im).point(lambda v: 255 if v > 60 else 0)
box = mask.getbbox()
if box:
    pad = 20
    im = im.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad)))
s = min(1.0, MAX / max(im.size))
if s < 1:
    im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
out = os.path.join(V, ('p%d_%02d-%02d.png' % (p, round(a * 100), round(b * 100))) if band else 'p%d.png' % p)
im.save(out)
print(out, im.size)
