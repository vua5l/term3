#!/usr/bin/env python3
"""صفحة الكتاب ← صفحة ملف الكتاب (BOOK_PDF)، ورسم الصفحة صورةً.

ملف الكتاب الكامل (499 صفحة): أرقام صفحاته أرقام الكتاب المطبوع حتى ص 445، ثم تنقصه ص 446–447،
فمن ص 448 صفحة الملف = صفحة الكتاب − 2. وصورتا ص 446 و447 من الطالب في مجلد BOOK_EXTRA
(الافتراضي /home/claude/book/extra) باسم p446.jpg وp447.jpg، فإن لم تكونا فيه فاطلبهما منه.
والنسخة الجزئية القديمة (تبدأ من ص 98): صفحة الملف = صفحة الكتاب − 97.

usage:
  pdfpage.py PAGE                    يطبع رقم صفحة الملف، أو photo:<المسار> للصفحة التي ليست إلا صورة
  pdfpage.py --render PAGE DPI OUT   يرسم الصفحة في OUT (PNG رمادي)، من الملف أو من الصورة
"""
import os, sys, subprocess, shutil, tempfile

PDF = os.environ.get('BOOK_PDF', '/home/claude/book/book.pdf')
EXTRA = os.environ.get('BOOK_EXTRA', '/home/claude/book/extra')
MISSING = (446, 447)


def page_count(pdf=PDF):
    out = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True, check=True).stdout
    for line in out.splitlines():
        if line.startswith('Pages:'):
            return int(line.split()[1])
    raise SystemExit('pdfinfo: no page count for ' + pdf)


def pdf_page(p, pdf=PDF):
    """رقم صفحة الملف لصفحة الكتاب p، أو ('photo', path) لصفحة ليست في الملف."""
    p = int(p)
    if page_count(pdf) >= 499:          # الملف الكامل
        if p in MISSING:
            for ext in ('jpg', 'jpeg', 'png'):
                f = os.path.join(EXTRA, 'p%d.%s' % (p, ext))
                if os.path.exists(f):
                    return ('photo', f)
            raise SystemExit('ص %d ناقصة من ملف الكتاب، وصورتها ليست في %s: اطلبها من الطالب.' % (p, EXTRA))
        return p if p <= 445 else p - 2
    return p - 97                       # النسخة الجزئية القديمة


def render(p, dpi, out, pdf=PDF):
    """يرسم صفحة الكتاب p في out بدقة dpi تقريباً (الصورة تُحجَّم إلى عرض صفحة A4 بتلك الدقة)."""
    n = pdf_page(p, pdf)
    if isinstance(n, tuple):
        from PIL import Image, ImageOps
        im = ImageOps.exif_transpose(Image.open(n[1])).convert('L')
        w = int(8.27 * int(dpi))
        im = im.resize((w, int(im.height * w / im.width)))
        im.save(out)
        return out
    d = tempfile.mkdtemp()
    subprocess.run(['pdftoppm', '-r', str(dpi), '-gray', '-f', str(n), '-l', str(n), '-png', pdf, d + '/x'], check=True)
    f = [x for x in os.listdir(d) if x.endswith('.png')][0]
    shutil.move(os.path.join(d, f), out)
    shutil.rmtree(d, ignore_errors=True)
    return out


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == '--render' and len(a) == 4:
        print(render(a[1], a[2], a[3]))
    elif len(a) == 1:
        n = pdf_page(a[0])
        print('photo:' + n[1] if isinstance(n, tuple) else n)
    else:
        sys.exit(__doc__)
