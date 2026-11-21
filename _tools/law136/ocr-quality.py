# usage: python3 ocr-quality.py <pages dir> <first> <last>
# per page and reading: words read and mean confidence; the best reading decides
import csv, sys, statistics as st
d, a, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
rows = []
for p in range(a, b + 1):
    best = None
    for k in 'abc':
        try:
            r = list(csv.DictReader(open(f'{d}/p{p}.{k}.tsv', encoding='utf-8'), delimiter='\t', quoting=csv.QUOTE_NONE))
        except FileNotFoundError:
            continue
        w = [float(x['conf']) for x in r if x.get('text', '').strip() and x['conf'] not in ('-1', '')]
        if not w: continue
        m = (len(w), st.mean(w), sum(c < 60 for c in w) / len(w))
        if best is None or m[1] > best[1]: best = m
    rows.append((p, best))
for p, m in rows:
    print(p, 'none' if not m else f'words={m[0]} mean={m[1]:.0f} low={m[2]:.0%}')
