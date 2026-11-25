import sys, re
# idxsplit.py <crops dir> <from> <to>: writes index-<from>-<to>.md = header of index.md + the sections of sheets from..to
d, a, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
txt = open(d + '/index.md', encoding='utf-8').read()
parts = re.split(r'(?m)^(?=## sheet-)', txt)
head, secs = parts[0], parts[1:]
keep = [s for s in secs if a <= int(re.match(r'## sheet-(\d+)', s).group(1)) <= b]
out = '%s/index-%03d-%03d.md' % (d, a, b)
open(out, 'w', encoding='utf-8').write(head + ''.join(keep))
print(out, len(keep), 'sheets', sum(s.count('\n- ') for s in keep), 'spots')
