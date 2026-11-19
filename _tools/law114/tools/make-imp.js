#!/usr/bin/env node
/* يولّد law114/data/imp.js: وسم «المهم» ومجموعات خانته، من _tools/law114/imp.json. ويقرأ ملفات الفصول ولا يغيّر منها شيئاً.
   الاستعمال من جذر المستودع: node _tools/law114/tools/make-imp.js
   - imp.json:
     lessons {معرّف الدرس: {top, ranges, basis, top_why}}:
       top صفحات «الأهم»: ما سأل عنه اختبار سابق، أو ما نبّه عليه زميل صراحة («محل سؤال»، «يجب قراءتها»، تدريب أسئلة).
       ranges صفحات «مهم»: ما غطّته ملفات الزملاء من الدرس.
     traps معرّفات أسئلة الفخاخ، وnotes ملاحظات الفخاخ {x, pg}.
   - القاعدة: البند (بطاقة، أو تعريف بلا بطاقة، أو سؤال موضوعي، أو كتلة ملخص، أو جدول، أو سطر ليلة) درجته 1 إن وقعت صفحته في top درسه،
     وإلا 2 إن وقعت في ranges درسه، وإلا باقي التحديد.
   - المجموعات بترتيب المراجعة: الفخاخ أولاً، ثم «الأهم» من كل درس بترتيب الكتاب، ثم «مهم» من كل درس، ثم باقي التحديد.
   - ولا يظهر شيء من الوسم في الموقع إلا في الأيام impDays الأخيرة قبل الاختبار (config.js)، فذلك في app.js لا هنا. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const site = path.join(root, 'law114');
const ctx = { window: {} };
vm.createContext(ctx);
const load = (f) => vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
load(path.join(site, 'config.js'));
const CFG = ctx.window.LAW114_CONFIG;
for (const c of CFG.chapters) load(path.join(site, 'data', c + '.js'));
load(path.join(site, 'data', 'defs.js'));
const CHS = ctx.window.LAW114.chapters;
const DEFS = ctx.window.LAW114_DEFS || { items: [] };
const IMP = JSON.parse(fs.readFileSync(path.join(root, '_tools', 'law114', 'imp.json'), 'utf8'));

const num = (s) => Number(String(s).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
function pages(p) {
  const out = new Set();
  String(p == null ? '' : p).split(/[،,]/).forEach((part) => {
    const m = part.match(/[0-9٠-٩]+/g);
    if (!m) return;
    const a = num(m[0]), b = num(m[m.length - 1]);
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.add(i);
  });
  return out;
}
const hit = (a, b) => { for (const x of a) if (b.has(x)) return true; return false; };

const LES = [];
CHS.forEach((c) => c.lessons.forEach((l) => { if (!l.pending) LES.push(l); }));
const traps = new Set(IMP.traps || []);
const TOP = {}, COV = {};
LES.forEach((l) => {
  const x = (IMP.lessons || {})[l.id] || {};
  TOP[l.id] = pages((x.top || []).join('،'));
  COV[l.id] = pages((x.ranges || []).join('،'));
});
/* درجة البند في درسه من صفحته: 1 أو 2 أو 0 */
function lvOf(lid, pg, fallback) {
  const ps = pages(pg || fallback);
  if (!ps.size) return 0;
  if (hit(ps, TOP[lid])) return 1;
  if (hit(ps, COV[lid])) return 2;
  return 0;
}
const mk = (lv, lid) => ({ lv, les: [lid], c: [], o: [], t: [], n: [], s: {} });
const G = { 1: {}, 2: {}, 0: {} };
LES.forEach((l) => { G[1][l.id] = mk(1, l.id); G[2][l.id] = mk(2, l.id); G[0][l.id] = mk(0, l.id); });

const level = {};
LES.forEach((l) => {
  (l.cards || []).forEach((k) => { const v = lvOf(l.id, k.pg, l.pages); G[v][l.id].c.push(k.id); level[k.id] = v; });
  (l.objective || []).forEach((o) => { if (!traps.has(o.id)) G[lvOf(l.id, o.pg, l.pages)][l.id].o.push(o.id); });
  (l.summary || []).forEach((b, i) => {
    if (b.t === 'h') return;
    const v = lvOf(l.id, b.pg, '');
    if (v) (G[v][l.id].s[l.id] = G[v][l.id].s[l.id] || []).push(i);
  });
});

// التعريفات: ما له بطاقة يتبع درجتها، وما لا بطاقة له يدخل بطاقات مجموعته بمعرّفه
const defLv = {};
(DEFS.items || []).forEach((d) => {
  const src = String(d.from);
  let v;
  if (Object.prototype.hasOwnProperty.call(level, src)) v = level[src];
  else if (G[0][d.les]) { v = lvOf(d.les, d.pg, ''); G[v][d.les].c.push(d.id); }
  else v = 0;
  if (v) defLv[d.id] = v;
});

// الجداول وأسطر الليلة: إلى مجموعة الدرس الذي تقع صفحتها فيه بدرجتها، وأسبق الدروس أولى
function place(c, pg) {
  const ps = pages(pg);
  const les = c.lessons.filter((l) => !l.pending);
  for (const v of [1, 2]) {
    const l = les.find((x) => hit(ps, pages(x.pages)) && hit(ps, v === 1 ? TOP[x.id] : COV[x.id]));
    if (l) return G[v][l.id];
  }
  const own = les.find((x) => hit(ps, pages(x.pages))) || les[0];
  return G[0][own.id];
}
CHS.forEach((c) => {
  if (!c.lessons.some((l) => !l.pending)) return;
  (c.tables || []).forEach((t) => place(c, t.pg).t.push(t.id));
  (c.night || []).forEach((x, i) => place(c, x.pg).n.push(c.id + ':' + i));
});

const trapIds = [];
const trapLes = [];
LES.forEach((l) => (l.objective || []).forEach((o) => { if (traps.has(o.id)) { trapIds.push(o.id); if (trapLes.indexOf(l.id) < 0) trapLes.push(l.id); } }));
const missing = [...traps].filter((id) => trapIds.indexOf(id) < 0);
if (missing.length) { console.error('ERROR: trap ids not found: ' + missing.join(' ')); process.exit(1); }
const trapGroup = { lv: 1, les: trapLes, c: [], o: trapIds, t: [], n: [], s: {} };
const full = (g) => g.c.length || g.o.length || g.t.length || g.n.length;
const all = [trapGroup].concat(LES.map((l) => G[1][l.id]), LES.map((l) => G[2][l.id]), LES.map((l) => G[0][l.id])).filter(full);

const js = (v) => JSON.stringify(v);
const lines = [
  '/* مصادر الالتزام (law114) — وسم «المهم» ومجموعات خانته. مولَّد بـ _tools/law114/tools/make-imp.js من _tools/law114/imp.json، فلا يُعدَّل باليد.',
  '   lv: 1 «الأهم» (ما سأل عنه اختبار سابق أو نبّه عليه زميل صراحة)، 2 «مهم» (ما غطّته ملفات الزملاء)، 0 باقي التحديد.',
  '   وفي كل مجموعة: les دروسها، c البطاقات (ومعها تعريفات لا بطاقة لها بمعرّفها)، o الأسئلة الموضوعية، t جداول المقارنة،',
  '   n أسطر ورقة الليلة <الفصل>:<الترتيب>، s كتل الملخص الموسومة <الدرس>: [ترتيبها من الصفر]. والأولى مجموعة الفخاخ.',
  '   defs درجة كل تعريف، notes ملاحظات الفخاخ. ولا يظهر شيء منه إلا في الأيام impDays الأخيرة قبل الاختبار. */',
  'window.LAW114_IMP = {', '  v: 1,', '  notes: ' + js(IMP.notes || []) + ',', '  defs: ' + js(defLv) + ',', '  groups: ['];
all.forEach((g, i) => lines.push('    ' + js(g) + (i + 1 < all.length ? ',' : '')));
lines.push('  ]', '};', '');
fs.writeFileSync(path.join(site, 'data', 'imp.js'), lines.join('\n'));

// العدّ: البنود بدرجاتها
const tally = { 1: 0, 2: 0, 0: 0 };
all.forEach((g) => { tally[g.lv] += g.c.length + g.o.length + g.t.length + g.n.length; });
const total = tally[1] + tally[2] + tally[0] + trapIds.length;
const pct = (x) => Math.round(100 * x / total) + '%';
console.log('imp.js: groups ' + all.length + ' · traps ' + trapIds.length + ' in ' + trapLes.length + ' lessons · notes ' + (IMP.notes || []).length +
  ' · items «الأهم» ' + tally[1] + ' (' + pct(tally[1]) + ') · «مهم» ' + tally[2] + ' (' + pct(tally[2]) + ') · rest ' + tally[0] + ' (' + pct(tally[0]) + ')' +
  ' · defs tagged ' + Object.keys(defLv).length);
