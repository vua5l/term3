#!/usr/bin/env node
/* فحص ملف خانة التعريفات law136/data/defs.js.
   الاستعمال من جذر المستودع: node _tools/law136/defs-check.js
   يحمّل config.js وملفات الفصول وdefs.js كما يفعل validate.js، ويفحص: تفرّد المعرّفات وتسلسل n، والقطع،
   وأن النص (parts.join(' ')) موجود حرفياً في مصدره بعد توحيد المسافات وحدها، والأسر.
   يطبع ملخصاً، ويخرج برمز 1 عند أي خطأ. */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'law136');
const errors = [];
const E = (m) => errors.push(m);
const isStr = (s) => typeof s === 'string' && s.length > 0;
const ws = (s) => String(s).replace(/\s+/g, ' ').trim();   /* توحيد المسافات وحدها */

const ctx = { window: {} };
vm.createContext(ctx);
function load(f) {
  try { vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f }); }
  catch (e) { console.error('ERROR: cannot load ' + path.relative(ROOT, f) + ': ' + e.message); process.exit(1); }
}
load(path.join(DIR, 'config.js'));
const cfg = ctx.window.LAW136_CONFIG;
if (!cfg || !Array.isArray(cfg.chapters)) { console.error('ERROR: run from the repo root (law136/config.js not found or bad)'); process.exit(1); }
for (const c of cfg.chapters) load(path.join(DIR, 'data', c + '.js'));
load(path.join(DIR, 'data', 'defs.js'));

const chapters = {}, lessons = {};
for (const ch of (ctx.window.LAW136 && ctx.window.LAW136.chapters) || []) {
  chapters[ch.id] = ch;
  for (const l of ch.lessons || []) lessons[l.id] = { ch: ch.id, l };
}

const D = ctx.window.LAW136_DEFS;
if (!D || !Array.isArray(D.items) || !Array.isArray(D.fams)) { console.error('ERROR: window.LAW136_DEFS {items[], fams[]} missing'); process.exit(1); }
if (D.v !== 1) E('v must be 1');

/* --- العناصر --- */
const ids = new Set(), byId = {};
let book = 0, sum = 0, cards = 0, quotes = 0, l31 = 0, prevN = 0;
const ALLOWED = ['id', 'n', 'term', 'ch', 'les', 'pg', 'from', 'sum', 'parts', 'hide'];
D.items.forEach((it, i) => {
  const w = 'items[' + i + '] ' + (it && it.id);
  if (!it || typeof it !== 'object') { E(w + ': not an object'); return; }
  Object.keys(it).forEach((k) => { if (!ALLOWED.includes(k)) E(w + ': unexpected field "' + k + '" (the text is parts.join(" "), no text field)'); });

  /* المعرّف والتسلسل */
  if (!isStr(it.id) || !/^d\d+$/.test(it.id)) E(w + ': id must look like d12');
  else if (ids.has(it.id)) E(w + ': duplicate id ' + it.id);
  else { ids.add(it.id); byId[it.id] = it; }
  if (!Number.isInteger(it.n)) E(w + ': n must be an integer');
  else {
    if (it.n <= prevN) E(w + ': n ' + it.n + ' must increase (after ' + prevN + ')');
    if (it.id !== 'd' + it.n) E(w + ': id must be "d' + it.n + '"');
    prevN = it.n;
  }
  if (!isStr(it.term) || it.term !== it.term.trim()) E(w + ': term missing or padded');
  if (!isStr(it.pg)) E(w + ': pg missing');
  if (typeof it.sum !== 'boolean') E(w + ': sum must be true|false');
  else if (it.sum) sum++;

  /* الفصل والدرس */
  if (!chapters[it.ch]) E(w + ': chapter ' + it.ch + ' not found');
  const rec = lessons[it.les];
  if (!rec) E(w + ': lesson ' + it.les + ' not found');
  else if (rec.ch !== it.ch) E(w + ': lesson ' + it.les + ' is in ' + rec.ch + ', not ' + it.ch);

  /* القطع */
  if (!Array.isArray(it.parts) || !it.parts.length) { E(w + ': parts[] missing'); return; }
  it.parts.forEach((p, j) => {
    if (typeof p !== 'string' || !p.trim()) E(w + '.parts[' + j + ']: empty');
    else if (p !== p.trim()) E(w + '.parts[' + j + ']: space at an edge «' + p + '»');
    else if (/\s{2}/.test(p)) E(w + '.parts[' + j + ']: double space');
  });
  const text = it.parts.join(' ');

  /* hide */
  if (!Array.isArray(it.hide)) E(w + ': hide[] missing (use [] when nothing hides the term)');
  else it.hide.forEach((h, j) => {
    if (!isStr(h) || h !== h.trim()) E(w + '.hide[' + j + ']: empty or padded');
    else if (text.indexOf(h) < 0) E(w + '.hide[' + j + ']: «' + h + '» is not in the text');
  });

  /* المصدر */
  if (it.from === 'book') { book++; return; }   /* نص الكتاب: لا مصدر في الموقع يُقابَل به */
  if (!rec) return;
  const L = rec.l, t = ws(text);
  let src = null, label = '';
  if (it.from === 'l31-summary') {
    l31++;
    if (it.les !== 'l31') E(w + ': from "l31-summary" needs les "l31"');
    /* أي كتلة في ملخص l31، بما فيها عناصر القوائم؛ وعناصر القائمة الواحدة تُقابَل متتالية أيضاً */
    const blocks = [];
    for (const b of L.summary || []) {
      if (isStr(b.x)) blocks.push(b.x);
      if (isStr(b.lead)) blocks.push(b.lead);
      if (Array.isArray(b.items)) { b.items.forEach((x) => blocks.push(x)); blocks.push(b.items.join(' ')); }
    }
    if (!blocks.some((b) => ws(b).indexOf(t) >= 0)) E(w + ': text not found verbatim in the summary of l31');
    return;
  }
  if (/^q\d+$/.test(it.from || '')) {
    quotes++;
    const b = (L.summary || [])[+it.from.slice(1)];
    if (!b) { E(w + ': summary block ' + it.from + ' not found in ' + it.les); return; }
    src = b.x; label = 'summary block ' + it.from + ' (t:' + b.t + ')';
  } else if (isStr(it.from) && it.from.indexOf(it.les + 'k') === 0) {
    cards++;
    const k = (L.cards || []).find((c) => c.id === it.from);
    if (!k) { E(w + ': card ' + it.from + ' not found in ' + it.les); return; }
    src = k.back; label = 'card ' + it.from;
  } else { E(w + ': from must be a card id of its lesson (' + it.les + 'k…), "qN", "l31-summary" or "book"'); return; }
  if (!isStr(src)) { E(w + ': ' + label + ' has no text'); return; }
  if (ws(src).indexOf(t) < 0) E(w + ': text not found verbatim in ' + label + '\n      defs: «' + t + '»\n      site: «' + ws(src) + '»');
});

/* --- الأسر --- */
const famIds = new Set();
let famLinks = 0;
D.fams.forEach((f, i) => {
  const w = 'fams[' + i + '] ' + (f && f.id);
  if (!f || !isStr(f.id)) { E(w + ': missing id'); return; }
  if (famIds.has(f.id)) E(w + ': duplicate family id');
  famIds.add(f.id);
  if (!isStr(f.name)) E(w + ': missing name');
  if (f.key !== undefined && !isStr(f.key)) E(w + ': key must be a non-empty string when present');
  if (!Array.isArray(f.members) || f.members.length < 2) { E(w + ': members[] needs 2+'); return; }
  const seen = new Set(), terms = new Map();
  f.members.forEach((m) => {
    if (seen.has(m)) E(w + ': member ' + m + ' repeated');
    seen.add(m);
    const it = byId[m];
    if (!it) { E(w + ': member ' + m + ' not found in items'); return; }
    famLinks++;
    if (terms.has(it.term)) E(w + ': term «' + it.term + '» repeated (' + terms.get(it.term) + ', ' + m + ')');
    else terms.set(it.term, m);
  });
});

/* --- الملخص --- */
const inFam = new Set(); D.fams.forEach((f) => (f.members || []).forEach((m) => inFam.add(m)));
const per = {}; D.items.forEach((it) => { per[it.ch] = (per[it.ch] || 0) + 1; });
const pc = D.items.map((it) => (it.parts || []).length);
console.log('== law136 defs: ' + D.items.length + ' items, ' + D.fams.length + ' families');
console.log('  sources: ' + cards + ' from cards, ' + quotes + ' from summary blocks, ' + l31 + ' from the l31 summary, ' + book + ' from the book (from: "book", no site source to compare)');
console.log('  sum:true (summary wording, not the book\'s exact words): ' + sum);
console.log('  per chapter: ' + Object.keys(per).map((c) => c + ' ' + per[c]).join(', '));
console.log('  parts per item: ' + Math.min(...pc) + '–' + Math.max(...pc) + ' · items with hide: ' + D.items.filter((it) => (it.hide || []).length).length);
console.log('  family links: ' + famLinks + ' · items in a family: ' + inFam.size + ' · items in no family: ' + (D.items.length - D.items.filter((it) => inFam.has(it.id)).length));
if (errors.length) { console.log('\nERRORS (' + errors.length + '):'); errors.forEach((e) => console.log('  - ' + e)); process.exit(1); }
console.log('\nOK: no errors.');
