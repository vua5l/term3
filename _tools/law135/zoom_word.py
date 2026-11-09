#!/usr/bin/env python3
"""Zoom on one word of a book page at 600 DPI. usage: zoom_word.py PAGE "anchor words near the target" out.png
Finds the line in the 300-DPI OCR whose words best match the anchor, and crops that line (plus half a line around) at 600 DPI."""
import sys, os, re, csv, subprocess
from PIL import Image
PDF=os.environ.get('BOOK_PDF','/mnt/user-data/uploads/51c4f0f5-___________________________.pdf'); D=os.environ.get('BOOK_TSV','/home/claude/book/tsv')
p=int(sys.argv[1]); anchor=sys.argv[2]; OUT=sys.argv[3]
sys.argv=[sys.argv[0],str(p),anchor,'/tmp/_z.png']; exec(open('/home/claude/scripts/crop_quote.py').read().split('im=Image.open(png)')[0])
lines={}
with open(tsv,encoding='utf-8') as fh:
    for x in csv.DictReader(fh,delimiter='\t',quoting=csv.QUOTE_NONE):
        if x['level']=='5' and x['text'].strip():
            k=(x['block_num'],x['par_num'],x['line_num']); L=lines.setdefault(k,{'w':[],'box':[10**9,10**9,0,0]})
            L['w'].append(r(x['text'])); b=L['box']; l,t,w,h=int(x['left']),int(x['top']),int(x['width']),int(x['height'])
            b[0]=min(b[0],l); b[1]=min(b[1],t); b[2]=max(b[2],l+w); b[3]=max(b[3],t+h)
A=[r(w) for w in anchor.split() if r(w)]
best=max(lines.values(), key=lambda L: sum(1 for a in A if a in L['w']))
x0,y0,x1,y1=best['box']; hh=y1-y0
hi=f'{D}/p{p}-600.png'
if not os.path.exists(hi):
    subprocess.run(['pdftoppm','-r','600','-gray','-f',str(p-97),'-l',str(p-97),'-png',PDF,f'{D}/hi{p}'],check=True)
    f=[x for x in os.listdir(D) if x.startswith(f'hi{p}-')][0]; os.rename(f'{D}/{f}',hi)
im=Image.open(hi)
c=im.crop((max(0,2*x0-40),max(0,2*(y0-hh//2)),min(im.width,2*x1+40),min(im.height,2*(y1+hh//2))))
if c.width>1600: c=c.resize((1600,int(c.height*1600/c.width)))
c.save(OUT); print(OUT,c.size)
