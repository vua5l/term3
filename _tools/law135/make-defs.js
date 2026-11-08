#!/usr/bin/env node
/* يولّد law135/data/defs.js (خانة التعريفات) من خانة defs في ملفات الفصول بترتيب config.js:
   كل تعريف حرفي مقطّع قطعاً، ودرسه بحسب صفحته، ومصدره بطاقة تعريفه إن وُجدت، وأسر التعاريف المتشابهة.
   المعرّفات d1… تُحفظ في law135/data/defs-ids.json فلا تتغير بعد النشر، والجديد يأخذ رقماً جديداً.
   الاستعمال من جذر المستودع: node _tools/law135/make-defs.js law135 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const dir = process.argv[2] || 'law135';
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'config.js'), 'utf8'), ctx);
const CFG = ctx.window.LAW135_CONFIG;
CFG.chapters.forEach((id) => vm.runInContext(fs.readFileSync(path.join(dir, 'data', id + '.js'), 'utf8'), ctx));
const chs = ctx.window.LAW135.chapters;
const span = (pg) => { const m = String(pg || '').match(/\d+/g); return m ? [Math.min(...m.map(Number)), Math.max(...m.map(Number))] : null; };
const norm = (s) => String(s).replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
const idsFile = path.join(dir, 'data', 'defs-ids.json');
const known = fs.existsSync(idsFile) ? JSON.parse(fs.readFileSync(idsFile, 'utf8')) : {};
let next = Object.values(known).reduce((m, id) => Math.max(m, +String(id).slice(1)), 0) + 1;
const items = [], famMap = {};
chs.forEach((c) => {
  (c.defs || []).forEach((d) => {
    const s = span(d.pg) || span(c.pages);
    const les = c.lessons.find((l) => { const x = span(l.pages); return x && s && s[0] >= x[0] && s[0] <= x[1]; }) || c.lessons[0];
    const key = c.id + '|' + norm(d.term) + '|' + d.pg;
    if (!known[key]) known[key] = 'd' + next++;
    const id = known[key];
    const card = les.cards.find((k) => k.type === 'def' && k.bk && norm(k.front) === norm(d.term));
    items.push({ id, n: items.length + 1, term: d.term, ch: c.id, les: les.id, pg: String(d.pg), from: card ? card.id : 'book', sum: false, parts: d.parts, hide: d.hide || [] });
    if (d.fam) (famMap[d.fam] = famMap[d.fam] || []).push(id);
  });
});
const fams = Object.keys(famMap).filter((k) => famMap[k].length > 1).map((k, i) => ({ id: 'f' + (i + 1), name: k, members: famMap[k] }));
fs.writeFileSync(idsFile, JSON.stringify(known, null, 1) + '\n');
const out = '/* القانون الدولي (law135): بيانات خانة التعريفات وحدها، مولَّدة بـ _tools/law135/make-defs.js من خانة defs في ملفات الفصول، فلا تُكتب باليد.\n' +
  '   نصوص الكتاب الحرفية مقطّعة قطعاً، ومعها أسر التعاريف المتشابهة. والمعرّفات ثابتة في defs-ids.json لأن سجل التقدم مربوط بها */\n' +
  'window.LAW135_DEFS = ' + JSON.stringify({ v: 1, items, fams }, null, 1) + ';\n';
fs.writeFileSync(path.join(dir, 'data', 'defs.js'), out);
console.log('defs: ' + items.length + ' · families: ' + fams.length);
