#!/usr/bin/env node
/* فحص الملف المصوَّر قبل البدء: صفحات ناقصة أو مكررة أو باهتة أو مقصوصة، من قراءات pages.js وحدها (لا يفتح الصور، ولا يستهلك رصيداً).
   الاستعمال: node _tools/common/scan.js <الرمز> <مجلد العمل> [--pages A-B]
     بلا --pages: كل صفحة جُهّزت في مجلد العمل. ومعه: يُذكر ما لم يُجهَّز من المدى (NOT RUN).
   ما يكشفه:
     SHIFT      الرقم المطبوع يخالف اسم الملف بفرق ثابت من صفحة معيّنة: صفحة ناقصة من المصوَّر عندها (+) أو مكررة (−)، أو book.pdfOffset يتغير هناك.
     DUPLICATE  صفحتان كلماتهما واحدة.
     WEAK       صفحة ثقة قراءتها أدنى كثيراً من بقية الكتاب: باهتة أو مهزوزة.
     CROPPED    صفحة سطورها تلامس حافة الصورة: مقصوصة من تلك الجهة.
     BLANK      صفحة بلا كلام (قد تكون بيضاء في الكتاب نفسه).
   كشف أولي يُعرض على صاحب الموقع قبل خطة الدروس: ينظر في الصفحات المذكورة، ويعيد تصويرها إن لزم. يخرج برمز 0 إلا إن تعذّر الفحص. */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./ocrlib');
const L = C.L;

const { rest, flags } = L.args(process.argv.slice(2), { pages: 1 });
if (rest.length < 2) L.die('usage: node _tools/common/scan.js <code> <work dir> [--pages A-B]');
const S = L.loadSubject(rest[0]);
const WORK = path.resolve(rest[1]);
if (!fs.existsSync(WORK)) L.die('work dir not found: ' + WORK);

let want = null;
if (flags.pages) {
  const m = L.toLatin(flags.pages).match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (!m || +m[2] < +m[1]) L.die('bad --pages: ' + flags.pages);
  want = []; for (let p = +m[1]; p <= +m[2]; p++) want.push(p);
}
const found = new Set();
fs.readdirSync(WORK).forEach((f) => { const m = f.match(/^p(\d+)\.[a-z][a-z0-9]*\.tsv$/); if (m) found.add(+m[1]); });
const pages = (want || Array.from(found)).sort((a, b) => a - b);
if (!pages.length) L.die('NOT RUN: no page readings in ' + WORK + ' (run pages.js first)', 3);

const median = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };
const ranges = (ps) => {                       /* صفحات متتالية في مدى واحد: p12–p15, p20 */
  const o = [];
  ps.forEach((p, i) => { if (i && p === ps[i - 1] + 1) o[o.length - 1][1] = p; else o.push([p, p]); });
  return o.map(([a, b]) => (a === b ? 'p' + a : 'p' + a + '–p' + b)).join(', ');
};

/* --- ما في كل صفحة --- */
const info = [], notRun = [];
pages.forEach((p) => {
  const pr = C.pageReadings(S, WORK, p);
  if (!pr) { notRun.push(p); return; }
  const base = pr.R[0], ar = base.toks.filter((t) => t.k === 'ar' && t.w.length >= 3);
  const W = base.page ? base.page.w : 0, H = base.page ? base.page.h : 0;
  const it = { p, words: Math.max(...pr.R.map((r) => r.toks.length)), set: new Set(ar.map((t) => t.sk)), sides: [], printed: [],
    conf: ar.length ? Math.round(ar.reduce((s, t) => s + (t.conf > 0 ? t.conf : 0), 0) / ar.length) : null };
  /* سطور تلامس حافة الصورة. سطر فيه كلمتان فأكثر، لئلا تُعدّ شائبة عند الحافة سطراً */
  if (W && H) {
    const ex = Math.max(3, Math.round(0.004 * W)), ey = Math.max(3, Math.round(0.004 * H)), n = { left: 0, right: 0, top: 0, bottom: 0 };
    base.lines.forEach((ln) => {
      if (base.toks.slice(ln.from, ln.to).filter((t) => t.k === 'ar' && t.w.length >= 3).length < 2) return;
      if (ln.x0 <= ex) n.left++;
      if (ln.x1 >= W - ex) n.right++;
      if (ln.y0 <= ey) n.top++;
      if (ln.y1 >= H - ey) n.bottom++;
    });
    if (n.left >= 3) it.sides.push('left edge, ' + n.left + ' lines');
    if (n.right >= 3) it.sides.push('right edge, ' + n.right + ' lines');
    if (n.top) it.sides.push('top edge');
    if (n.bottom) it.sides.push('bottom edge');
  }
  /* الرقم المطبوع: رقم وحده في سطره، في أعلى الصفحة أو أسفلها، في أي قراءة */
  pr.R.forEach((r) => {
    const h = r.page ? r.page.h : 0;
    r.lines.forEach((ln) => {
      const ts = r.toks.slice(ln.from, ln.to);
      if (!h || ts.length > 2 || !(ln.y1 <= 0.12 * h || ln.y0 >= 0.88 * h)) return;
      ts.forEach((t) => { if (t.k === 'num' && t.w.length <= 4) it.printed.push(+t.w); });
    });
  });
  info.push(it);
});

/* --- الحكم --- */
const out = [];
const full = info.filter((x) => x.words >= 5), blank = info.filter((x) => x.words < 5);
const med = median(full.filter((x) => x.conf !== null).map((x) => x.conf));
const weak = full.filter((x) => x.conf !== null && med > 0 && (x.conf < 50 || x.conf < med - 15));
weak.forEach((x) => out.push('WEAK p' + x.p + ' (reading confidence ' + x.conf + ', book median ' + med + '): faint or blurred'));
const cropped = full.filter((x) => x.sides.length);
cropped.forEach((x) => out.push('CROPPED p' + x.p + ' (' + x.sides.join('; ') + '): the text touches the edge of the image'));
let dups = 0;
for (let i = 0; i < full.length; i++) {
  for (let j = i + 1; j < full.length; j++) {
    const a = full[i].set, b = full[j].set;
    if (a.size < 15 || b.size < 15) continue;
    let same = 0;
    a.forEach((k) => { if (b.has(k)) same++; });
    const jac = same / (a.size + b.size - same);
    if (jac >= 0.8) { dups++; out.push('DUPLICATE p' + full[i].p + ' = p' + full[j].p + ' (' + Math.round(jac * 100) + '% of the words)'); }
  }
}
/* الرقم المطبوع واسم الملف: فرق ثابت في صفحات متتابعة أكثرُها يوافقه = صفحة ناقصة أو مكررة. وفرق في صفحة مفردة غلط قراءة */
let agree = 0, unread = 0, stray = 0;
const byD = {};
info.forEach((x) => {
  if (!x.printed.length) { if (x.words >= 5) unread++; return; }
  if (x.printed.includes(x.p)) { agree++; return; }
  const n = x.printed.slice().sort((a, b) => Math.abs(a - x.p) - Math.abs(b - x.p))[0];
  (byD[n - x.p] = byD[n - x.p] || []).push(x.p);
});
Object.keys(byD).map(Number).sort((a, b) => byD[a][0] - byD[b][0]).reverse().forEach((d) => {
  const ps = byD[d], a = ps[0], b = ps[ps.length - 1];
  const okIn = info.filter((x) => x.p >= a && x.p <= b && x.printed.includes(x.p)).length;
  if (Math.abs(d) <= 20 && ps.length >= 3 && ps.length > okIn)
    out.unshift('SHIFT from p' + a + ': the printed page number is the file name ' + (d > 0 ? '+' : '') + d + ' on ' + ps.length + ' page(s) up to p' + b
      + ' -> a page is ' + (d > 0 ? 'missing from' : 'repeated in') + ' the scan at p' + a + ' (or book.pdfOffset changes there)');
  else stray += ps.length;
});

console.log('scan check: ' + info.length + ' page(s) read' + (notRun.length ? ', ' + notRun.length + ' not prepared' : '') + ' · blank ' + blank.length + ' · weak ' + weak.length
  + ' · cropped ' + cropped.length + ' · duplicate pairs ' + dups + ' · printed page numbers: agree with the file name on ' + agree + ', not read on ' + unread + ', stray misreadings ' + stray);
out.forEach((l) => console.log('  ' + l));
if (blank.length) console.log('  BLANK ' + ranges(blank.map((x) => x.p)) + ' (may be blank in the book itself)');
if (notRun.length) console.log('  NOT RUN ' + ranges(notRun) + ' (no readings in the work dir)');
const few = agree < info.length / 3 ? ' · the printed numbers were read on few pages, so a missing page may go unseen here: every builder checks the number printed on each of his pages' : '';
console.log((out.length ? 'RESULT: ' + out.length + ' thing(s) to look at before building' : 'RESULT: nothing to look at') + few);
