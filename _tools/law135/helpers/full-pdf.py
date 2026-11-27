#!/usr/bin/env python3
"""ملف الكتاب الكامل بصورتي ص 446–447 في مكانهما (book-full.pdf)، فتعمل أدوات الصور كلها بملف واحد.

ملف الكتاب (499 صفحة) تنقصه ص 446–447، وصورتاهما من الطالب في BOOK_EXTRA (الافتراضي /home/claude/book/extra)
باسم p446 وp447 بامتداد png أو jpg. تُجعل كل صورة صفحةً بعرض A4 (595.32 نقطة) وارتفاعٍ بنسبة الصورة، كما يرسمها
pdfpage.py، بلا ضغط مُتلِف (img2pdf)، وتُدرج بعد ص 445 (qpdf). فصفحة الملف الناتج = صفحة الكتاب في الكتاب كله،
و`pdfOffset` صفر في images.json لكل الصفحات: يُعطى book-full.pdf لـ pages.js (الصور والقراءات وملف جيمني بـ --pdf)
ولـ crops.js --zoom بدل book.pdf، ولا حاجة إلى نسخة images.json بـ pdfOffset: -2.
أما book.pdf فيبقى كما هو، لأن pdfpage.py يحسب صفحاته بنفسه.

usage: full-pdf.py [BOOK_PDF] [OUT]   (الافتراضي /home/claude/book/book.pdf و/home/claude/book/book-full.pdf)
يحتاج img2pdf وPillow (pip) وqpdf وpdfinfo."""
import os, subprocess, sys, tempfile

try:
    import img2pdf
    from PIL import Image, ImageOps
except ImportError as e:
    sys.exit('NOT RUN: %s (pip install img2pdf pillow --break-system-packages)' % e)

PDF = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('BOOK_PDF', '/home/claude/book/book.pdf')
OUT = sys.argv[2] if len(sys.argv) > 2 else '/home/claude/book/book-full.pdf'
EXTRA = os.environ.get('BOOK_EXTRA', '/home/claude/book/extra')
A4W = 595.32


def pages(pdf):
    out = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True, check=True).stdout
    return int([l for l in out.splitlines() if l.startswith('Pages:')][0].split()[1])


def photo(p):
    for ext in ('png', 'jpg', 'jpeg'):
        f = os.path.join(EXTRA, 'p%d.%s' % (p, ext))
        if os.path.exists(f):
            return f
    sys.exit('ص %d ناقصة من ملف الكتاب، وصورتها ليست في %s: اطلبها من الطالب.' % (p, EXTRA))


n = pages(PDF)
if n != 499:
    sys.exit('expected the full book file (499 pages), got %d pages: %s' % (n, PDF))
tmp = tempfile.mkdtemp()
parts = []
for p in (446, 447):
    src = photo(p)
    im = ImageOps.exif_transpose(Image.open(src))
    if im.mode not in ('RGB', 'L'):
        im = im.convert('RGB')
    clean = os.path.join(tmp, 'p%d.png' % p)
    im.save(clean)                      # بلا بيانات EXIF ولا قناة شفافية، فيقبله img2pdf كما هو
    w, h = im.size
    layout = img2pdf.get_layout_fun((A4W, A4W * h / w), None, None, img2pdf.FitMode.into, False)
    f = os.path.join(tmp, 'p%d.pdf' % p)
    with open(f, 'wb') as fh:
        fh.write(img2pdf.convert(clean, layout_fun=layout))
    parts.append(f)
subprocess.run(['qpdf', '--empty', '--pages', PDF, '1-445', parts[0], parts[1], PDF, '446-499', '--', OUT], check=True)
print(OUT, pages(OUT), 'pages: book page = file page for the whole book (pdfOffset 0)')
