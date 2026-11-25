import csv, sys, re, os
# Prints heading-like lines (and the first/last line) of a page from OCR reading a, to locate lesson boundaries.
W = sys.argv[1]
pat = re.compile(r'(المبحث|المطلب|الفرع|الفصل|الباب|أولا|ثانيا|ثالثا|رابعا|خامسا|سادسا|سابعا|ثامنا|تمهيد|خاتمة|اولا)')
for p in sys.argv[2:]:
    f = os.path.join(W, 'p%s.a.tsv' % p)
    lines = {}
    with open(f, encoding='utf-8') as fh:
        r = csv.reader(fh, delimiter='\t', quoting=csv.QUOTE_NONE)
        next(r)
        for row in r:
            if len(row) < 12 or row[0] != '5' or not row[11].strip(): continue
            k = (int(row[2]), int(row[3]), int(row[4]))
            lines.setdefault(k, []).append((int(row[5]), int(row[7]), int(row[9]), row[11]))
    L = sorted(lines.values(), key=lambda ws: min(w[1] for w in ws))
    out = []
    for i, ws in enumerate(L):
        txt = ' '.join(w[3] for w in sorted(ws))
        h = max(w[2] for w in ws); top = min(w[1] for w in ws)
        if i == 0 or i == len(L) - 1 or (pat.search(txt) and len(txt) < 70):
            out.append('  y=%4d h=%2d  %s' % (top, h, txt[:75]))
    print('p%s (%d lines)' % (p, len(L)))
    print('\n'.join(out))
