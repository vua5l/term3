#!/usr/bin/env python3
"""Crop the spot of a book page where a given text appears, to check it against the page image.
usage: python3 crop_quote.py PAGE "text as in the transcription" [out.png]
Prints the output path (view it with the Read tool). PDF page = book page - 97."""
import sys, os, re, csv, subprocess
from PIL import Image
PDF=os.environ.get('BOOK_PDF','/mnt/user-data/uploads/51c4f0f5-___________________________.pdf')
D=os.environ.get('BOOK_TSV','/home/claude/book/tsv')
p=int(sys.argv[1]); text=sys.argv[2]; out=sys.argv[3] if len(sys.argv)>3 else f'/tmp/crop-{p}-{abs(hash(text))%10**6}.png'
png=f'{D}/p{p}.png'; tsv=f'{D}/p{p}.tsv'
if not os.path.exists(png):
    subprocess.run(['pdftoppm','-r','300','-gray','-f',str(p-97),'-l',str(p-97),'-png',PDF,f'{D}/tmp{p}'],check=True)
    f=[x for x in os.listdir(D) if x.startswith(f'tmp{p}-')][0]; os.rename(f'{D}/{f}',png)
if not os.path.exists(tsv):
    subprocess.run(['tesseract',png,tsv[:-4],'-l','ara','--psm','3','tsv'],check=True,capture_output=True)
CL={}
for grp,rep in [('بتثنيىئذ','ٮ'),('جحخ','ح'),('رز','ر'),('سش','س'),('صض','ص'),('طظ','ط'),('عغفق','ع'),('هة','ه'),('وؤ','و'),('اأإآ','ا')]:
    for ch in grp: CL[ch]=rep
def r(w):
    w=re.sub('[ً-ْٰـ]','',w); w=re.sub(r'[^\w]','',w)
    return ''.join(CL.get(c,c) for c in w)
rows=[]
with open(tsv,encoding='utf-8') as fh:
    for x in csv.DictReader(fh,delimiter='\t',quoting=csv.QUOTE_NONE):
        if x['level']=='5' and x['text'].strip():
            rows.append((r(x['text']),int(x['top']),int(x['height'])))
W=[w for w,_,_ in rows]
T=[r(w) for w in text.split() if r(w) and not r(w).isdigit()]
def best(seq, lo=0):
    bi,bs=None,0
    for i in range(lo,len(W)):
        s=sum(1 for j,t in enumerate(seq) if i+j<len(W) and t==W[i+j])
        if s>bs: bi,bs=i,s
    return bi
im=Image.open(png); Wd,H=im.size
pos=[]
for n in (3,2):
    for k in range(len(T)-n+1):
        g=T[k:k+n]
        for i in range(len(W)-n+1):
            if W[i:i+n]==g: pos.append((i,k))
    if pos: break
if pos:
    est=sorted(i-k for i,k in pos)[len(pos)//2]
    keep=[(i,k) for i,k in pos if abs((i-k)-est)<=40]
    lo=max(0,min(i for i,_ in keep)); hi=min(len(rows)-1,max(i for i,_ in keep)+3)
    lh=max(40,sorted(h for _,_,h in rows)[len(rows)//2])
    y0=rows[lo][1]-int(lh*2.6); y1=rows[hi][1]+rows[hi][2]+int(lh*2.6)
    if y1-y0>1700: y1=y0+1700
else:
    y0,y1=0,H
c=im.crop((0,max(0,y0),Wd,min(H,y1))); c=c.resize((c.width//2,c.height//2)); c.save(out); print(out)
