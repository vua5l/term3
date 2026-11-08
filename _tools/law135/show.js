#!/usr/bin/env node
/* يطبع بنوداً بعينها من ملف فصل بنصها كما هو في الملف، لإصلاحها بدقة.
   الاستعمال: node show.js <ملف الفصل.js> <معرّف>...
   المعرّفات: l31.s7 (فقرة ملخص بترتيبها من 1) · l31k5 · l31o9 · l31e3 · c8t3 · n11 (ليلة) · map:<نص> (عقد الخريطة التي تحتوي النص) */
'use strict';
const fs = require('fs');
const vm = require('vm');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[2], 'utf8'), ctx);
const ch = ctx.window.LAW135.chapters[0];
const out = (id, o) => console.log(id + ' ' + JSON.stringify(o));
for (const id of process.argv.slice(3)) {
  let m;
  if ((m = /^(l\d+)\.s(\d+)$/.exec(id))) { const l = ch.lessons.find((x) => x.id === m[1]); out(id, l.summary[+m[2] - 1]); }
  else if ((m = /^(l\d+)[koe]\d+$/.exec(id))) {
    const l = ch.lessons.find((x) => x.id === m[1]);
    const it = [...l.cards, ...l.objective, ...l.essay].find((x) => x.id === id);
    out(id, it);
  } else if (/^c\d+t\d+$/.test(id)) out(id, ch.tables.find((t) => t.id === id));
  else if ((m = /^n(\d+)$/.exec(id))) out(id, ch.night[+m[1] - 1]);
  else if (id.startsWith('map:')) {
    const q = id.slice(4);
    (function walk(n, path) { if ((n.t + ' ' + (n.d || '')).includes(q)) out('map[' + path + ']', { t: n.t, d: n.d, pg: n.pg }); (n.c || []).forEach((c, i) => walk(c, path + '.' + i)); })(ch.map, '');
  } else console.log(id + ' ?');
}
