#!/usr/bin/env node
/* برنامج مقارنة النسخ: يقابل النص المنسوخ بالقراءات الآلية كلمةً كلمة، ويطبع أرقام تدقيق النسخ والسطرين اللذين يقرؤهما صاحب الموقع.
   الاستعمال: node _tools/common/compare.js <الرمز> <مجلد العمل> <ملف نص أو مجلده ...> [--pages A-B] [--lexicon ملف] [--wide ملف|off] [--out ملف.json] [--verdicts ملف] [--list]
   - مجلد العمل هو ما كتبته pages.js (p127.a.tsv …). وما لم يُقرأ من الصفحات يُذكر (NOT RUN) ولا يُحسب.
   - يطبع: نسبة المواضع التي لم تؤكدها أي قراءة آلية، مقسومةً إلى ما رُجع فيه إلى الصورة وما قُبل بلا صورة · وما قرأته القراءتان معاً ولم يكتبه الناسخ ·
     وتوزيع ذلك على المتن والحواشي، والأرقام والأجنبية وحدها، والصفحات الأشد · وبعد المدقق (--verdicts) عدد ما ثبت فيه خطأ الناسخ بالصورة.
   - يكتب في --out (والأصل compare.json في مجلد العمل) المواضع بمواقعها في صور الصفحات، لتُقصّ بـ crops.js.
   - ملف الأحكام: سطر لكل موضع «المعرّف <tab> ok أو wrong أو unclear <tab> ما في الصورة». */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./copylib');
const L = C.L;

const { rest, flags } = L.args(process.argv.slice(2), { pages: 1, lexicon: 1, wide: 1, out: 1, verdicts: 1, list: 0 });
if (rest.length < 3) L.die('usage: node _tools/common/compare.js <code> <work dir> <text file or dir ...> [--pages A-B] [--lexicon file] [--out file.json] [--verdicts file] [--list]');
const S = L.loadSubject(rest[0]);
const WORK = path.resolve(rest[1]);
const files = [];
rest.slice(2).forEach((f) => {
  if (!fs.existsSync(f)) L.die('text not found: ' + f);
  if (fs.statSync(f).isDirectory()) fs.readdirSync(f).filter((x) => /\.(md|txt)$/.test(x)).sort().forEach((x) => files.push(path.join(f, x)));
  else files.push(f);
});
if (!files.length) L.die('no text files given');
const PAGES = L.sourcePages(S, files);
let pages = Object.keys(PAGES).map(Number).sort((a, b) => a - b);
if (flags.pages) {
  const m = L.toLatin(flags.pages).match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (!m) L.die('bad --pages: ' + flags.pages);
  pages = pages.filter((p) => p >= +m[1] && p <= +m[2]);
}
if (!pages.length) L.die('no pages found in the text files (page mark: ' + S.text.pageMark + ')');
const lex = C.lexicon(S, PAGES, flags.lexicon);
/* المعجم الواسع: يُحكم به على لفظ اتفقت عليه القراءتان، أهو كلمة صحيحة فيُرجع إلى الصورة أم خطأ قراءة يتكرر */
const wide = flags.wide === 'off' ? null : C.wideLexicon(S, WORK, flags.wide && path.resolve(flags.wide));
const RD = S.copy.readings;

const bucket = () => ({ n: 0, un: 0, img: 0, open: 0 });
const tot = { body: bucket(), fn: bucket(), other: bucket() };
const kinds = { lat: { n: 0, un: 0 }, num: { n: 0, un: 0 } };      /* الأجنبي والأرقام كلٌّ وحده، للتفصيل */
const why = { dots: 0, agree: 0, glue: 0, word: 0, absent: 0 };
const perPage = [], items = [], notRead = [], mismatch = [];
let missedWords = 0, missedSpots = 0, flaggedConfirmed = 0, openAgree = 0;

const union = (bs) => {
  const b = bs.filter(Boolean);
  if (!b.length) return null;
  const x0 = Math.min(...b.map((q) => q.x)), y0 = Math.min(...b.map((q) => q.y));
  return { x: x0, y: y0, w: Math.max(...b.map((q) => q.x + q.w)) - x0, h: Math.max(...b.map((q) => q.y + q.h)) - y0 };
};

pages.forEach((p) => {
  const tsv = RD.map((r) => path.join(WORK, 'p' + p + '.' + r.name + '.tsv'));
  if (!tsv.every((f) => fs.existsSync(f))) { notRead.push(p); return; }
  const R = RD.map((r, n) => C.readTsv(tsv[n], S.copy.dpi / r.dpi));
  const { toks: T } = C.pageWords(S, PAGES[p]);
  const J = C.judgePage(T, R, lex, wide);
  const pg = { p, ar: 0, un: 0, img: 0, open: 0 };
  /* موضع الكلمة في صورة الصفحة: مما قابلها في أول قراءة قابلتها، وإلا فمن أقرب جارتين لهما مقابل */
  const boxOf = (i) => {
    for (let r = 0; r < R.length; r++) { const o = J.al[r].res[i].o; if (o.length) return union(o.map((j) => R[r].toks[j].box)); }
    return null;
  };
  const near = (i0, i1) => {
    let a = null, b = null;
    for (let q = i0 - 1; q >= 0 && q >= i0 - 12 && !a; q--) a = boxOf(q);
    for (let q = i1 + 1; q < T.length && q <= i1 + 12 && !b; q++) b = boxOf(q);
    return union([a, b]);
  };
  let run = null;
  const flush = () => { if (run) { items.push(run); run = null; } };
  T.forEach((t, i) => {
    const s = J.st[i];
    const b = t.k !== 'ar' ? tot.other : tot[t.sec === 'fn' ? 'fn' : 'body'];
    b.n++;
    if (!s.conf) b.un++;
    if (t.k !== 'ar') { kinds[t.k].n++; if (!s.conf) kinds[t.k].un++; }
    if (s.s === 'img') { b.img++; why[s.why]++; if (s.conf) flaggedConfirmed++; }
    if (s.s === 'open') { b.open++; if (s.tag === 'agree') openAgree++; }
    if (t.k === 'ar') { pg.ar++; if (!s.conf) pg.un++; if (s.s === 'img') pg.img++; if (s.s === 'open') pg.open++; }
    if (t.k !== 'ar' || s.s === 'ok') { flush(); return; }
    /* كلمات متجاورة بحكم واحد تصير موضعاً واحداً */
    if (run && run.i1 === i - 1 && run.s === s.s && run.why === (s.why || s.tag || 'open')) {
      run.i1 = i; run.words.push(t.w); run.read.push(s.f); run.boxes.push(boxOf(i));
    } else {
      flush();
      run = { id: p + '.' + i, page: p, s: s.s, why: s.why || s.tag || 'open', sec: t.sec, line: t.line, i0: i, i1: i, words: [t.w], read: [s.f], v: s.v.join(''), boxes: [boxOf(i)], extra: s.extra || undefined };
    }
  });
  flush();
  /* ما قرأته القراءتان ولم يكتبه الناسخ: كلمات متتالية في فجوة واحدة موضعٌ واحد */
  const bySpot = {};
  J.missed.forEach((m) => { (bySpot[m.gap] = bySpot[m.gap] || []).push(m); });
  Object.keys(bySpot).forEach((g) => {
    const ms = bySpot[g];
    missedWords += ms.length; missedSpots++;
    items.push({ id: p + '.g' + g, page: p, s: 'img', why: 'missed', sec: (T[+g - 1] || T[+g] || {}).sec || 'body', i0: +g, i1: +g - 1, words: [], read: [ms.map((m) => m.w)], v: '', boxes: ms.map((m) => R[m.r].toks[m.j].box) });
  });
  items.forEach((it) => {
    if (it.page !== p || it.ctx) return;
    const tx = (a, b) => T.slice(Math.max(0, a), Math.max(0, b)).map((t) => t.w).join(' ');
    it.ctx = [tx(it.i0 - 6, it.i0), tx(it.i1 + 1, it.i1 + 7)];
    it.box = union(it.boxes) || near(it.i0, Math.max(it.i0, it.i1)) || null;
    it.exact = !!union(it.boxes);
    delete it.boxes;
  });
  perPage.push(pg);
  if (pg.ar >= 20 && pg.un / pg.ar > 0.35) mismatch.push(p);
});

/* --- أحكام المدقق --- */
let verdicts = null;
if (flags.verdicts) {
  verdicts = { ok: 0, wrong: 0, unclear: 0, unknown: 0, list: [] };
  const ids = new Set(items.map((it) => it.id));
  fs.readFileSync(flags.verdicts, 'utf8').split('\n').forEach((ln) => {
    const c = ln.split('\t').map((x) => x.trim());
    if (!c[0] || c[0].startsWith('#')) return;
    if (!ids.has(c[0]) || !['ok', 'wrong', 'unclear'].includes(c[1])) { verdicts.unknown++; return; }
    verdicts[c[1]]++;
    if (c[1] === 'wrong') verdicts.list.push({ id: c[0], note: c[2] || '' });
  });
}

/* --- الطباعة --- */
const done = perPage.length;
if (!done) { console.log('NOT RUN: no page of the text has its readings in ' + WORK + ' (run pages.js first)'); process.exit(3); }
const pc = (a, b) => (b ? (100 * a / b).toFixed(a && 100 * a / b < 0.095 ? 2 : 1) + '%' : '—');
const all = { n: tot.body.n + tot.fn.n + tot.other.n, un: tot.body.un + tot.fn.un + tot.other.un, img: tot.body.img + tot.fn.img + tot.other.img, open: tot.body.open + tot.fn.open + tot.other.open };
const worst = perPage.filter((g) => g.ar >= 20).sort((a, b) => b.un / b.ar - a.un / a.ar).slice(0, 6);
const imgSpots = items.filter((it) => it.s === 'img').length, openSpots = items.filter((it) => it.s === 'open').length;

console.log('pages compared: ' + done + (notRead.length ? ' · NOT RUN (no readings): ' + notRead.length + ' page(s): ' + notRead.slice(0, 12).join(', ') + (notRead.length > 12 ? ' …' : '') : '')
  + ' · readings: ' + RD.map((r) => r.name + ' (' + r.dpi + ' dpi, ' + r.args + ')').join(' + ') + ' · lexicon: ' + lex.size + ' words of the book' + (wide ? ', wide ' + wide.size : ', no wide lexicon (an agreed reading is then never sent to the image)'));
console.log('bucket      positions  unconfirmed   to-image   accepted-no-image');
[['body', 'المتن'], ['fn', 'الحواشي'], ['other', 'الأرقام والأجنبية']].forEach(([k, name]) => {
  const b = tot[k];
  console.log((k + '        ').slice(0, 11), String(b.n).padStart(8), (b.un + ' ' + pc(b.un, b.n)).padStart(13), (b.img + ' ' + pc(b.img, b.n)).padStart(11), (b.open + ' ' + pc(b.open, b.n)).padStart(13), ' ', name);
});
console.log('to-image by reason: dots ' + why.dots + ' · agree ' + why.agree + ' · glue ' + why.glue + ' · word ' + why.word + ' · absent ' + why.absent + ' · missed ' + missedWords
  + ' (of these, ' + flaggedConfirmed + ' were confirmed by a reading) · spots to crop: ' + imgSpots + ' to-image, ' + openSpots + ' accepted-no-image');
console.log('numbers and foreign apart: foreign words ' + kinds.lat.n + ' (unconfirmed ' + pc(kinds.lat.un, kinds.lat.n) + ') · numbers ' + kinds.num.n + ' (unconfirmed ' + pc(kinds.num.un, kinds.num.n) + ')');
if (mismatch.length) console.log('WARNING: page(s) that barely match their image (wrong page offset, or a missing or repeated page?): ' + mismatch.join(', '));
if (flags.list) {
  items.filter((it) => it.s === 'img').forEach((it) => console.log('  ' + it.id.padEnd(9), it.why.padEnd(7), it.ctx[0].split(' ').slice(-3).join(' ') + ' [' + it.words.join(' ') + '] ' + it.ctx[1].split(' ').slice(0, 3).join(' ') + '  ←  ' + it.read.map((f) => (Array.isArray(f) ? f.join('|') : f)).join(' ؛ ')));
}
console.log('');
console.log('السطران:');
console.log('١) لم تؤكده أي قراءة آلية: ' + pc(all.un, all.n) + ' من ' + all.n + ' موضعاً (رُجع فيه إلى الصورة ' + pc(all.img, all.n) + ' · قُبل بلا صورة ' + pc(all.open, all.n) + '، منه ' + openAgree + ' كلمة عربية اتفقت قراءتان فيها على لفظ ليس كلمة)'
  + ' · قرأته قراءتان ولم يكتبه الناسخ: ' + missedWords + ' كلمة في ' + missedSpots + ' موضعاً');
console.log('٢) المتن ' + pc(tot.body.un, tot.body.n) + ' (بلا صورة ' + pc(tot.body.open, tot.body.n) + ') · الحواشي ' + pc(tot.fn.un, tot.fn.n) + ' (بلا صورة ' + pc(tot.fn.open, tot.fn.n) + ')'
  + ' · الأرقام والأجنبية وحدها ' + pc(tot.other.un, tot.other.n) + ' · أشد الصفحات: ' + (worst.map((g) => g.p + ' (' + pc(g.un, g.ar) + ')').join('، ') || '—')
  + (verdicts ? ' · ثبت خطأ الناسخ بالصورة في ' + verdicts.wrong + ' موضعاً من ' + (verdicts.ok + verdicts.wrong + verdicts.unclear) + ' فُحصت' + (verdicts.unclear ? ' (' + verdicts.unclear + ' لم تتضح)' : '') : ' · حصيلة المدقق: لم تُدخل بعد'));
if (verdicts) {
  if (verdicts.unknown) console.log('WARNING: ' + verdicts.unknown + ' verdict line(s) with an unknown id or verdict were ignored');
  verdicts.list.forEach((v) => console.log('  wrong ' + v.id + (v.note ? ': ' + v.note : '')));
}

const out = flags.out ? path.resolve(flags.out) : path.join(WORK, 'compare.json');
if (out.startsWith(L.REPO + path.sep)) L.die('--out must be outside the repository (it holds words of the book): ' + out);
fs.writeFileSync(out, JSON.stringify({ subject: S.code, dpi: S.copy.dpi, readings: RD, pages: perPage, notRead, mismatch, totals: tot, kinds, all, why, openAgree, missed: { words: missedWords, spots: missedSpots }, verdicts, items }));
console.log('details: ' + out);
