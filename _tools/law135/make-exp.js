#!/usr/bin/env node
/* يولّد law135/data/exp.js: وسم «متوقع» بالصفحات، على طريقة وسم «مهم» (make-imp.js)، بطلب الطالب في 16 نوفمبر 2026.
   صفحاته: كل صفحات أسئلة التجميعات (ما عليه exp: 1 من الأسئلة الموضوعية والمقالية في ملفات الفصول)، كما في pg كل سؤال منها.
   فيُوسم كل ما في هذه الصفحات: كتل الملخص والبطاقات والأسئلة الموضوعية (ولو لم تكن من التجميعات) والتعريفات وجداول المقارنة
   وأسطر ليلة الاختبار، وتأخذ دروسها الشارة. والمقالي لا وسم له في الدروس، وصفحة «المتوقع» في المراجعة باقية على أسئلة التجميعات وحدها.
   القاعدة: يُوسم البند إذا وقعت صفحاته كلها في هذه الصفحات. والبند الذي بعض صفحاته خارجها يُوسم إذا كانت نصف صفحاته على الأقل منها،
   إلا ما في DECIDE فقراره مكتوب بسببه. وتتوقف الأداة عند قرار لا بند له أو لا يطابق نصه.
   الاستعمال من جذر المستودع: node _tools/law135/make-exp.js law135 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const dir = process.argv[2] || 'law135';
/* قرارات تخالف قاعدة النصف: [يُوسم؟، أول النص للتحقق في الكتل والأسطر المعرّفة بترتيبها، والسبب] */
const DECIDE = {
  'l26:15': [false, 'ميّز بين موقفين', 'أكثره موقف المؤلف في ص 239، كما قُرر في وسم «مهم»'],
  'c7:8': [true, 'الركن المعنوي يميز العرف', 'نصه جواب سؤال التجميعات l35o11']
};

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'config.js'), 'utf8'), ctx);
const CFG = ctx.window.LAW135_CONFIG;
CFG.chapters.forEach((id) => vm.runInContext(fs.readFileSync(path.join(dir, 'data', id + '.js'), 'utf8'), ctx));
vm.runInContext(fs.readFileSync(path.join(dir, 'data', 'defs.js'), 'utf8'), ctx);
const chs = ctx.window.LAW135.chapters;
const lessons = [];
chs.forEach((c) => c.lessons.forEach((l) => { if (!l.pending) lessons.push(l); }));

function pages(pg) {
  const out = [];
  String(pg || '').split(/[،,]/).forEach((part) => {
    const m = part.match(/(\d+)\s*[–-]\s*(\d+)/), one = part.match(/\d+/);
    if (m) for (let p = +m[1]; p <= +m[2]; p++) out.push(p);
    else if (one) out.push(+one[0]);
  });
  return out;
}
/* صفحات أسئلة التجميعات */
const P = new Set(), src = [];
lessons.forEach((l) => (l.objective || []).concat(l.essay || []).forEach((q) => {
  if (!q.exp) return;
  src.push(q.id);
  pages(q.pg).forEach((p) => P.add(p));
}));
if (!P.size) throw new Error('لا أسئلة عليها exp: 1');
const inP = (p) => P.has(p);
const used = {}, edges = { yes: [], no: [] };
function pick(id, pg, text) {
  const ps = pages(pg);
  if (DECIDE[id]) {
    const d = DECIDE[id];
    if (d[1] && String(text || '').indexOf(d[1]) !== 0) throw new Error('قرار لا يطابق نصه: ' + id + ' (' + String(text).slice(0, 40) + ')');
    used[id] = true;
    return d[0];
  }
  if (!ps.length) return false;
  const a = ps.filter(inP).length;
  if (!a) return false;
  if (a === ps.length) return true;
  const on = a * 2 >= ps.length;
  edges[on ? 'yes' : 'no'].push(id);
  return on;
}
const span = (s) => { const m = String(s).match(/\d+/g); return [+m[0], +m[m.length - 1]]; };
/* مجموعة البند درسه إن وقعت فيه صفحة له من صفحات الوسم، وإلا فآخر درس تقع فيه أول صفحة له منها */
const groups = [], GBY = {};
function groupOf(lid, pg) {
  let l = lessons.find((x) => x.id === lid);
  const ps = pages(pg).filter(inP);
  const own = l && (() => { const s = span(l.pages); return ps.some((p) => p >= s[0] && p <= s[1]); })();
  if (!own) {
    const p = ps.length ? ps[0] : pages(pg)[0];
    const hits = lessons.filter((x) => { const s = span(x.pages); return p >= s[0] && p <= s[1]; });
    l = hits.length ? hits[hits.length - 1] : l;
  }
  if (!l) throw new Error('بند بلا درس: ص ' + pg);
  if (!GBY[l.id]) { GBY[l.id] = { les: [l.id], c: [], o: [], t: [], n: [], s: {} }; groups.push(GBY[l.id]); }
  return GBY[l.id];
}
const defs = {};
let nSum = 0;
lessons.forEach((l) => {
  l.summary.forEach((b, i) => {
    if (!b || b.t === 'h' || b.t === 'dr' || !b.pg) return;
    const key = l.id + ':' + i;
    if (pick(key, b.pg, b.x || b.lead)) { const g = groupOf(l.id, b.pg); (g.s[l.id] = g.s[l.id] || []).push(i); nSum++; }
  });
  (l.cards || []).forEach((k) => { if (pick(k.id, k.pg)) groupOf(l.id, k.pg).c.push(k.id); });
  (l.objective || []).forEach((q) => { if (pick(q.id, q.pg) || q.exp) groupOf(l.id, q.pg).o.push(q.id); });
});
chs.forEach((c) => {
  (c.tables || []).forEach((t) => { if (pick(t.id, t.pg)) groupOf(null, t.pg).t.push(t.id); });
  (c.night || []).forEach((x, i) => { const key = c.id + ':' + i; if (pick(key, x.pg, x.x)) groupOf(null, x.pg).n.push(key); });
});
ctx.window.LAW135_DEFS.items.forEach((d) => { if (pick(d.id, d.pg)) defs[d.id] = 1; });
const stale = Object.keys(DECIDE).filter((id) => !used[id]);
if (stale.length) throw new Error('قرارات لا بند لها: ' + stale.join('، '));

/* الترتيب بترتيب الدروس، ثم تنظيف المجموعات من الخانات الفارغة */
const order = lessons.map((l) => l.id);
groups.sort((a, b) => order.indexOf(a.les[0]) - order.indexOf(b.les[0]));
groups.forEach((g) => { ['c', 'o', 't', 'n'].forEach((k) => { if (!g[k].length) delete g[k]; }); if (!Object.keys(g.s).length) delete g.s; });
const pl = [...P].sort((a, b) => a - b);
const out = '/* القانون الدولي (law135): وسم «متوقع» بالصفحات. مولَّد بـ _tools/law135/make-exp.js فلا يُعدَّل باليد.\n' +
  '   صفحاته كل صفحات أسئلة التجميعات (exp: 1)، ولا يظهر في الموقع إلا في آخر ثلاثة أيام قبل الاختبار.\n' +
  '   src أسئلة التجميعات، وpages صفحاتها. وفي كل مجموعة: les درسها، c البطاقات، o الأسئلة الموضوعية، t جداول المقارنة،\n' +
  '   n أسطر ليلة الاختبار <الفصل>:<الترتيب>، s كتل الملخص الموسومة <الدرس>: [ترتيب الكتلة]. وdefs التعريفات الموسومة. */\n' +
  'window.LAW135_EXP = ' + JSON.stringify({ v: 1, src, pages: pl, defs, groups }, null, 1) + ';\n';
fs.writeFileSync(path.join(dir, 'data', 'exp.js'), out);
const count = (k) => groups.reduce((n, g) => n + (g[k] ? g[k].length : 0), 0);
console.log('exp.js: ' + src.length + ' سؤالاً من التجميعات · ' + pl.length + ' صفحة · ' + groups.length + ' مجموعات (' + groups.map((g) => g.les[0]).join(' ') + ')');
console.log('  ملخص ' + nSum + ' · بطاقات ' + count('c') + ' · موضوعي ' + count('o') + ' · جداول ' + count('t') + ' · ليلة ' + count('n') +
  ' · تعريفات ' + Object.keys(defs).length + ' · حواف وُسمت ' + edges.yes.length + ' ولم تُوسم ' + edges.no.length);
