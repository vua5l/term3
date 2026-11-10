#!/usr/bin/env node
/* يطبع بنوداً بعينها من ملف فصل بنصها كما هو في الملف، لإصلاحها بدقة.
   الاستعمال: node _tools/common/show.js <رمز المادة> <ملف الفصل.js> <معرّف>...
   المعرّفات: l31.s7 (فقرة ملخص بترتيبها من 1) · l31.i2 (جملة من التمهيد) · l31k5 · l31o9 · l31e3 · l31s1 (خطوات) · c8t3 · n11 (ليلة) · map:<نص> (عقد الخريطة التي تحتوي النص) */
'use strict';
const lib = require('./lib');
const [code, file, ...ids] = process.argv.slice(2);
if (!code || !file) lib.die('usage: node show.js <subject> chapter.js id...');
const S = lib.loadSubject(code);
let ch;
try { ch = lib.loadChapter(S, file); } catch (e) { lib.die('ERROR: ' + e.message, 1); }
const out = (id, o) => console.log(id + ' ' + JSON.stringify(o));
const lesson = (id) => ch.lessons.find((x) => x.id === id);
for (const id of ids) {
  let m, l;
  if ((m = /^(l\d+)\.s(\d+)$/.exec(id))) { l = lesson(m[1]); if (l) out(id, (l.summary || [])[+m[2] - 1]); else console.log(id + ' ?'); }
  else if ((m = /^(l\d+)\.i(\d+)$/.exec(id))) { l = lesson(m[1]); if (l) out(id, (l.intro || [])[+m[2] - 1]); else console.log(id + ' ?'); }
  else if ((m = /^(l\d+)[koes]\d+$/.exec(id))) {
    l = lesson(m[1]);
    if (!l) { console.log(id + ' ?'); continue; }
    const it = [...(l.cards || []), ...(l.objective || []), ...(l.essay || []), ...(Array.isArray(l.steps) ? l.steps : [])].find((x) => x.id === id);
    out(id, it);
  } else if (/^c\d+t\d+$/.test(id)) out(id, (ch.tables || []).find((t) => t.id === id));
  else if ((m = /^n(\d+)$/.exec(id))) out(id, (ch.night || [])[+m[1] - 1]);
  else if (id.startsWith('map:')) {
    const q = id.slice(4);
    if (ch.map) (function walk(n, path) { if ((n.t + ' ' + (n.d || '')).includes(q)) out('map[' + path + ']', { t: n.t, d: n.d, pg: n.pg }); (n.c || []).forEach((c, i) => walk(c, path + '.' + i)); })(ch.map, '');
  } else console.log(id + ' ?');
}
