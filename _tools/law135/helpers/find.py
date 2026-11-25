import csv, sys, re, os
# Prints OCR (reading a) lines of the given pages that match a pattern, with their vertical position, to locate headings.
W, pat = sys.argv[1], re.compile(sys.argv[2])
for p in sys.argv[3:]:
    lines = {}
    with open(os.path.join(W, 'p%s.a.tsv' % p), encoding='utf-8') as fh:
        r = csv.reader(fh, delimiter='\t', quoting=csv.QUOTE_NONE); next(r)
        for row in r:
            if len(row) < 12 or row[0] != '5' or not row[11].strip(): continue
            lines.setdefault((int(row[2]), int(row[3]), int(row[4])), []).append((int(row[5]), int(row[7]), row[11]))
    for ws in sorted(lines.values(), key=lambda ws: min(w[1] for w in ws)):
        t = ' '.join(w[2] for w in sorted(ws))
        if pat.search(t): print('p%s y=%4d  %s' % (p, min(w[1] for w in ws), t[:80]))
