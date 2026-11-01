#!/usr/bin/env node
/* فحص ملف فصل لموقع law136.
   الاستعمال: node validate.js <ملف الفصل.js> [ملف النص المستخرج.md] [--range 23-26]
   يطبع الأخطاء (تمنع الرفع) والتنبيهات (تُراجَع). ويخرج برمز 1 إن وُجد خطأ. */
'use strict';
const fs = require('fs');
const vm = require('vm');

const args = process.argv.slice(2);
const file = args[0];
let srcFile = null, range = null;
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--range') { range = args[++i].split('-').map(Number); }
  else srcFile = args[i];
}
if (!file) { console.error('usage: node validate.js chapter.js [source.md] [--range 23-26]'); process.exit(2); }

const errors = [], warns = [];
const E = (m) => errors.push(m), W = (m) => warns.push(m);

let ch;
try {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  const list = ctx.window.LAW136 && ctx.window.LAW136.chapters;
  if (!list || list.length !== 1) { console.error('ERROR: the file must push exactly one chapter into window.LAW136.chapters'); process.exit(1); }
  ch = list[0];
} catch (e) { console.error('ERROR: file does not run: ' + e.message); process.exit(1); }

const isStr = (s) => typeof s === 'string' && s.trim().length > 0;
const toLatin = (s) => String(s).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
function pgNums(pg) {
  if (!isStr(pg)) return null;
  const out = [];
  for (const part of toLatin(pg).split(/[،,]/)) {
    const m = part.trim().match(/^(\d+)(?:\s*[–-]\s*(\d+))?$/);
    if (!m) return null;
    const a = +m[1], b = m[2] ? +m[2] : a;
    if (b < a) return null;
    out.push(a, b);
  }
  return out;
}
const chPg = pgNums(ch.pages);
function checkPg(where, pg) {
  if (pg === undefined) { E(where + ': missing pg'); return; }
  const n = pgNums(pg);
  if (!n) { E(where + ': bad pg format "' + pg + '" (use "127" or "127–128" or "127، 130" with an en dash)'); return; }
  if (/-/.test(pg)) W(where + ': pg uses a hyphen; use the en dash – like the existing files');
  if (chPg) {
    const lo = Math.min(...chPg), hi = Math.max(...chPg);
    if (n.some((x) => x < lo || x > hi)) W(where + ': pg ' + pg + ' outside chapter pages ' + ch.pages);
  }
}

/* --- النص المستخرج للمقابلة الآلية (كشف أولي لا حكم) --- */
function norm(s) {
  return String(s).replace(/[ً-ْٰـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[^ء-يA-Za-z0-9٠-٩]+/g, ' ').replace(/\s+/g, ' ').trim();
}
let SRC = null;
if (srcFile) {
  const raw = fs.readFileSync(srcFile, 'utf8')
    .replace(/^#+\s*ص\s*[0-9٠-٩]+.*$/gm, ' ')   // علامات الصفحات
    .replace(/\[هامش[^\]]*\]/g, ' ');
  SRC = norm(raw);
}
function verbatim(where, text) {
  if (!SRC || !isStr(text)) return;
  const parts = text.split(/\(\s*\.\.\.\s*\)|\(\s*…\s*\)|…|\.\.\./).map((x) => norm(x)).filter(Boolean);
  const miss = parts.filter((p) => SRC.indexOf(p) < 0);
  if (miss.length) W(where + ': verbatim text not found in the source transcription -> check against the page image: «' + text.slice(0, 90) + (text.length > 90 ? '…' : '') + '»');
}

/* --- التواريخ: الموقع لا يذكرها --- */
const DATE_RE = /(^|[^0-9])(1[0-4]\d\d|1[5-9]\d\d|20[0-4]\d)([^0-9]|$)/;
const DATE_WORDS = /(القرن|\bعام\s+[0-9٠-٩]|سنة\s+[0-9٠-٩]|[0-9٠-٩]+\s*هـ|[0-9٠-٩]+\s*م\b|ميلادي|هجري)/;
function scanStrings(where, v) {
  if (typeof v === 'string') {
    const s = toLatin(v);
    if (DATE_RE.test(s) || DATE_WORDS.test(v)) W(where + ': looks like a date (dates are not in the syllabus): «' + v.slice(0, 80) + '»');
    if (/[0-9]+\s*-\s*[0-9]+/.test(s) && !/pg/.test(where)) { /* ranges inside text are fine */ }
    if (/ {2,}/.test(v)) W(where + ': double space');
  } else if (Array.isArray(v)) v.forEach((x, i) => scanStrings(where + '[' + i + ']', x));
  else if (v && typeof v === 'object') Object.keys(v).forEach((k) => { if (k !== 'pg' && k !== 'id') scanStrings(where + '.' + k, v[k]); });
}

/* --- الفصل --- */
['id', 'title', 'name', 'pages'].forEach((k) => { if (!isStr(ch[k])) E('chapter: missing ' + k); });
if (!/^c\d+$/.test(ch.id || '')) E('chapter id must look like c6');
if (!Array.isArray(ch.lessons) || !ch.lessons.length) E('chapter: lessons[] missing');
if (!Array.isArray(ch.tables)) E('chapter: tables[] missing');
if (!ch.map || !isStr(ch.map.t) || !Array.isArray(ch.map.c)) E('chapter: map {t, c[]} missing');
if (!Array.isArray(ch.night) || !ch.night.length) E('chapter: night[] missing');

const ids = new Set();
function uid(where, id, re) {
  if (!isStr(id)) { E(where + ': missing id'); return; }
  if (re && !re.test(id)) E(where + ': id "' + id + '" does not match ' + re);
  if (ids.has(id)) E(where + ': duplicate id ' + id);
  ids.add(id);
}

const qTexts = new Map();
let mcqPos = [0, 0, 0, 0], mcqN = 0, mcqLongest = 0, fillN = 0, tfN = 0, tfTrue = 0;
const stats = [];
(ch.lessons || []).forEach((l, li) => {
  const L = 'lesson ' + (l && l.id);
  uid(L, l.id, /^l\d+$/);
  const n = +String(l.id).slice(1);
  if (range && (n < range[0] || n > range[1])) E(L + ': id outside the assigned range l' + range[0] + '–l' + range[1]);
  if (!isStr(l.title)) E(L + ': missing title');
  if (!isStr(l.pages)) E(L + ': missing pages'); else checkPg(L + '.pages', l.pages);
  if (!Number.isInteger(l.minutes) || l.minutes < 1 || l.minutes > 75) E(L + ': minutes must be an integer 1..75');
  ['summary', 'cards', 'objective', 'essay'].forEach((k) => { if (!Array.isArray(l[k])) E(L + ': ' + k + '[] missing'); });
  const S = l.summary || [], K = l.cards || [], O = l.objective || [], ES = l.essay || [];
  S.forEach((b, i) => {
    const w = L + '.summary[' + i + ']';
    if (!b || !['h', 'p', 'list', 'q', 'note'].includes(b.t)) { E(w + ': t must be h|p|list|q|note'); return; }
    if (b.t === 'h') { if (!isStr(b.x)) E(w + ': h needs x'); return; }
    if (b.t === 'list') {
      if (!isStr(b.lead)) E(w + ': list needs a lead that says what it lists');
      if (!Array.isArray(b.items) || b.items.length < 2 || !b.items.every(isStr)) E(w + ': list needs items[] (2+ strings)');
    } else if (!isStr(b.x)) E(w + ': needs x');
    checkPg(w, b.pg);
    if (b.t === 'q') verbatim(w, b.x);
  });
  K.forEach((k, i) => {
    const w = L + '.cards[' + i + ']';
    uid(w, k.id, new RegExp('^' + l.id + 'k\\d+$'));
    if (!isStr(k.front)) E(w + ': missing front');
    if (k.type === 'def') {
      if (!isStr(k.back)) E(w + ': def needs back');
      if (typeof k.bk !== 'boolean') E(w + ': def needs bk true|false');
      if (k.bk) verbatim(w, k.back);
    } else if (k.type === 'count') {
      if (!Array.isArray(k.items) || !k.items.every(isStr)) E(w + ': count needs items[]');
      else if (k.n !== k.items.length) E(w + ': n (' + k.n + ') != items.length (' + k.items.length + ')');
      if (!isStr(k.lead)) E(w + ': count needs lead');
    } else if (k.type === 'rule') {
      if (!isStr(k.rule) || !isStr(k.exc)) E(w + ': rule needs rule and exc');
    } else E(w + ': type must be def|count|rule');
    checkPg(w, k.pg);
  });
  O.forEach((q, i) => {
    const w = L + '.objective[' + i + '] ' + (q && q.id);
    uid(w, q.id, new RegExp('^' + l.id + 'o\\d+$'));
    if (!isStr(q.q)) E(w + ': missing q');
    if (!isStr(q.why)) E(w + ': missing why');
    const key = norm(q.q);
    if (qTexts.has(key)) E(w + ': duplicate question text (also ' + qTexts.get(key) + ')'); else qTexts.set(key, q.id);
    if (q.k === 'tf') { tfN++; if (q.a === true) tfTrue++; if (typeof q.a !== 'boolean') E(w + ': tf needs a true|false'); }
    else if (q.k === 'mcq') {
      mcqN++;
      if (!Array.isArray(q.opts) || q.opts.length !== 4 || !q.opts.every(isStr)) E(w + ': mcq needs 4 opts');
      else {
        if (new Set(q.opts.map(norm)).size !== 4) E(w + ': mcq opts not unique');
        if (!Number.isInteger(q.a) || q.a < 0 || q.a > 3) E(w + ': mcq a must be 0..3');
        else {
          mcqPos[q.a]++;
          const lens = q.opts.map((o) => o.length), mx = Math.max(...lens);
          if (lens[q.a] === mx && lens.filter((x) => x === mx).length === 1 && mx > 1.25 * Math.max(...lens.filter((_, j) => j !== q.a))) mcqLongest++;
        }
      }
    } else if (q.k === 'fill') {
      fillN++;
      if (!/_{4}/.test(q.q || '')) E(w + ': fill q needs a blank ____');
      if (!isStr(q.a)) E(w + ': fill needs a');
      if (!Array.isArray(q.opts) || q.opts.length !== 4 || !q.opts.includes(q.a)) E(w + ': fill needs 4 opts including a');
      else if (new Set(q.opts.map(norm)).size !== 4) E(w + ': fill opts not unique');
    } else E(w + ': k must be tf|mcq|fill');
    checkPg(w, q.pg);
  });
  ES.forEach((e, i) => {
    const w = L + '.essay[' + i + ']';
    uid(w, e.id, new RegExp('^' + l.id + 'e\\d+$'));
    if (!isStr(e.q)) E(w + ': missing q');
    checkPg(w, e.pg);
    if (!Array.isArray(e.points) || e.points.length < 2) E(w + ': needs points[] (2+)');
    else e.points.forEach((p, j) => { if (!isStr(p.x)) E(w + '.points[' + j + ']: missing x'); checkPg(w + '.points[' + j + ']', p.pg); });
  });
  if (K.length < 5) W(L + ': only ' + K.length + ' cards');
  if (O.length < 8) W(L + ': only ' + O.length + ' objective questions');
  if (ES.length < 1) W(L + ': no essay question');
  stats.push(l.id + ' ' + l.pages + ' ' + l.minutes + 'min: summary ' + S.length + ', cards ' + K.length + ', objective ' + O.length + ' (tf ' + O.filter((q) => q.k === 'tf').length + ' mcq ' + O.filter((q) => q.k === 'mcq').length + ' fill ' + O.filter((q) => q.k === 'fill').length + '), essay ' + ES.length + ' — ' + l.title);
});

(ch.tables || []).forEach((t, i) => {
  const w = 'tables[' + i + '] ' + (t && t.id);
  uid(w, t.id, new RegExp('^' + ch.id + 't\\d+$'));
  if (!isStr(t.title)) E(w + ': missing title');
  if (!Array.isArray(t.cols) || t.cols.length < 3) E(w + ': cols[] needs 3+ (first is «وجه المقارنة»)');
  else if (t.cols[0] !== 'وجه المقارنة') W(w + ': first column is usually «وجه المقارنة»');
  if (!Array.isArray(t.rows) || !t.rows.length) E(w + ': rows[] missing');
  else t.rows.forEach((r, j) => { if (!Array.isArray(r) || r.length !== (t.cols || []).length) E(w + '.rows[' + j + ']: length != cols'); });
  if (!isStr(t.core)) E(w + ': missing core (الفرق الجوهري)');
  checkPg(w, t.pg);
});
function walk(n, w) {
  if (!n || !isStr(n.t)) { E(w + ': map node needs t'); return; }
  if (n.pg !== undefined) checkPg(w, n.pg);
  if (n.c !== undefined) { if (!Array.isArray(n.c)) E(w + ': c must be an array'); else n.c.forEach((x, i) => walk(x, w + '.c[' + i + ']')); }
}
if (ch.map) walk(ch.map, 'map');
(ch.night || []).forEach((x, i) => { if (!x || !isStr(x.x)) E('night[' + i + ']: needs x'); else checkPg('night[' + i + ']', x.pg); });

scanStrings('chapter', ch);

console.log('== ' + ch.id + ' ' + ch.name + ' (' + ch.pages + ')');
stats.forEach((s) => console.log('  ' + s));
console.log('  tables ' + (ch.tables || []).length + ', night ' + (ch.night || []).length);
console.log('  tf true/false: ' + tfTrue + '/' + (tfN - tfTrue) + ' · mcq answer positions [a=0..3]: ' + mcqPos.join(' ') + ' · mcq where the correct option is clearly the longest: ' + mcqLongest + '/' + mcqN + ' · fill ' + fillN);
if (warns.length) { console.log('\nWARNINGS (' + warns.length + '):'); warns.forEach((w) => console.log('  - ' + w)); }
if (errors.length) { console.log('\nERRORS (' + errors.length + '):'); errors.forEach((e) => console.log('  - ' + e)); process.exit(1); }
console.log('\nOK: no errors.');
