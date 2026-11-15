#!/usr/bin/env node
/* يولّد law135/data/imp.js: وسم «مهم» على ما بُني من الصفحات التي نبّه عليها زميل يحضر مع الدكتور (15 نوفمبر 2026):
   ص 241–264، ومن ص 242 فقرتها الأولى وحدها، وتُكمَّل جملة آخر ص 264 من أول ص 265 (قائمة صور الإنهاء الثلاث وبطاقتها).
   الوسم وحده بلا خانة ولا تبويب: شارة على الدروس والأسئلة الموضوعية والبطاقات والتعريفات والجداول وأسطر ليلة الاختبار،
   وخط جانبي على كتل الملخص. والمقالي لا وسم له، ويظهر «مهم» بجانب الدرس في اختيار دروس رسالة المحادثة.
   القاعدة: يُوسم البند إذا وقعت صفحاته كلها في المدى. والبند الذي بعض صفحاته خارجه، أو صفحته 242 وحدها، لا بد له من قرار
   في DECIDE: يُوسم إذا كان أغلبه أو جوابه من المدى. فإن ظهر بند على الحافة بلا قرار توقف التوليد.
   الاستعمال من جذر المستودع: node _tools/law135/make-imp.js law135 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const dir = process.argv[2] || 'law135';
const LO = 241, HI = 264, LV = 2;   /* الدرجة 2 «مهم» */
/* قرارات الحافة: [يُوسم؟، أول النص للتحقق في الكتل والأسطر المعرّفة بترتيبها، والسبب] */
const DECIDE = {
  'l26:15': [false, 'ميّز بين موقفين', 'أكثره موقف المؤلف في ص 239، وما في ص 245 موسوم في الدرس 27'],
  'l26:28': [true, 'وورد الحكم ذاته في اتفاقية فيينا لعام 1986', 'الفقرة الأولى من ص 242'],
  'l26:29': [false, 'وأشارت الاتفاقيتان إلى ضرورة تقيد', 'الفقرة الثانية من ص 242'],
  'l26:30': [false, 'فإذا كانت الاتفاقيتان قد اشترطتا', 'الفقرة الثالثة من ص 242'],
  'l26:31': [false, 'وكما في الالتزامات', 'الفقرة الرابعة من ص 242'],
  'l26:32': [false, 'قارن: الالتزام على الغير', 'المقارنة من ص 240 وباقي ص 242'],
  'l27:21': [true, 'يذكر الكتاب معاهدتي 1831 و1839', 'تنبيه على ما في ص 247'],
  'l30:6': [true, 'وقد نظمت اتفاقيتا فيينا لقانون المعاهدات مسألة إنهاء', 'نصه في ص 264'],
  'l30:13': [true, 'تنتهي المعاهدة هنا وفقًا لاتفاق', 'تكملة جملة ص 264'],
  l26k8: [true, '', 'افتراض الموافقة في ص 241، واختلاف اتفاقية 1986 في الفقرة الأولى من ص 242'],
  l30k3: [true, '', 'صورتا الإنهاء بالاتفاق في ص 264'],
  l30k4: [true, '', 'تكملة جملة ص 264'],
  l26o7: [true, '', 'جوابه في ص 241 أيضًا'],
  l26o8: [true, '', 'الفقرة الأولى من ص 242'],
  l26o9: [false, '', 'الفقرة الثالثة من ص 242'],
  l26o12: [true, '', 'شرط الدولة الأولى بالرعاية في ص 243'],
  l26o13: [true, '', 'جوابه في ص 244–245'],
  l26o15: [false, '', 'المادة 35 في ص 240'],
  l28o14: [true, '', 'جوابه في ص 250'],
  l29o5: [true, '', 'جوابه في ص 258'],
  l30o3: [true, '', 'جوابه في تعريف الإيقاف ص 263'],
  l30o5: [false, '', 'تفصيل الصورة الثانية في ص 265'],
  l32o7: [true, '', 'جوابه في تعريف الإنهاء ص 263'],
  c5t2: [false, '', 'أكثره من ص 240 وباقي ص 242'],
  c6t1: [false, '', 'ثلاثة صفوف من ثمانية في المدى'],
  'c5:8': [false, 'الالتزام على الغير', 'أكثره من ص 240 وباقي ص 242'],
  'c6:6': [false, 'الإنهاء بالاتفاق المدرج ثلاث صور', 'نصفه المادة 55 في ص 267']
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
const inRange = (p) => p >= LO && p <= HI;
const used = {};
function pick(id, pg, text) {
  const ps = pages(pg);
  const edge = ps.some(inRange) && (ps.some((p) => !inRange(p)) || ps.every((p) => p === 242));
  if (DECIDE[id]) {
    const d = DECIDE[id];
    if (d[1] && String(text || '').indexOf(d[1]) !== 0) throw new Error('قرار لا يطابق نصه: ' + id + ' (' + String(text).slice(0, 40) + ')');
    used[id] = true;
    return d[0];
  }
  if (edge) throw new Error('بند على الحافة بلا قرار في DECIDE: ' + id + ' ص ' + pg);
  return ps.length > 0 && ps.every(inRange);
}
const span = (s) => { const m = String(s).match(/\d+/g); return [+m[0], +m[m.length - 1]]; };
/* مجموعة البند درسه إن كان له مجموعة، وإلا فأقرب درس تقع فيه أول صفحة له في المدى */
const groups = [], GBY = {};
function groupOf(lid, pg) {
  let l = lessons.find((x) => x.id === lid);
  const ps = pages(pg).filter(inRange);
  const own = l && (() => { const s = span(l.pages); return ps.some((p) => p >= s[0] && p <= s[1]); })();
  if (!own) {
    const p = ps[0];
    const hits = lessons.filter((x) => { const s = span(x.pages); return p >= s[0] && p <= s[1]; });
    l = hits[hits.length - 1];
  }
  if (!GBY[l.id]) { GBY[l.id] = { lv: LV, les: [l.id], c: [], o: [], t: [], n: [], s: {} }; groups.push(GBY[l.id]); }
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
  (l.objective || []).forEach((q) => { if (pick(q.id, q.pg)) groupOf(l.id, q.pg).o.push(q.id); });
});
chs.forEach((c) => {
  (c.tables || []).forEach((t) => { if (pick(t.id, t.pg)) groupOf(null, t.pg).t.push(t.id); });
  (c.night || []).forEach((x, i) => { const key = c.id + ':' + i; if (pick(key, x.pg, x.x)) groupOf(null, x.pg).n.push(key); });
});
ctx.window.LAW135_DEFS.items.forEach((d) => { if (pick(d.id, d.pg)) defs[d.id] = LV; });
const stale = Object.keys(DECIDE).filter((id) => !used[id]);
if (stale.length) throw new Error('قرارات لا بند لها: ' + stale.join('، '));

/* الترتيب بترتيب الدروس، ثم تنظيف المجموعات من الخانات الفارغة */
const order = lessons.map((l) => l.id);
groups.sort((a, b) => order.indexOf(a.les[0]) - order.indexOf(b.les[0]));
groups.forEach((g) => { ['c', 'o', 't', 'n'].forEach((k) => { if (!g[k].length) delete g[k]; }); if (!Object.keys(g.s).length) delete g.s; });
const out = '/* القانون الدولي (law135): وسم «مهم» وحده بلا خانة. مولَّد بـ _tools/law135/make-imp.js فلا يُعدَّل باليد.\n' +
  '   مصدره: صفحات نبّه عليها زميل يحضر مع الدكتور، ص 241–264 (ومن ص 242 فقرتها الأولى، ومع تكملة جملة ص 264)، والنطاق كله باقٍ 98–311.\n' +
  '   lv 2 «مهم». وفي كل مجموعة: les درسها، c البطاقات، o الأسئلة الموضوعية، t جداول المقارنة، n أسطر ليلة الاختبار <الفصل>:<الترتيب>،\n' +
  '   s كتل الملخص الموسومة <الدرس>: [ترتيب الكتلة]. وdefs درجة كل تعريف في خانة التعريفات. */\n' +
  'window.LAW135_IMP = ' + JSON.stringify({ v: 1, notes: [], defs, groups }, null, 1) + ';\n';
fs.writeFileSync(path.join(dir, 'data', 'imp.js'), out);
const count = (k) => groups.reduce((n, g) => n + (g[k] ? g[k].length : 0), 0);
console.log('imp.js: ' + groups.length + ' مجموعات (' + groups.map((g) => g.les[0]).join(' ') + ') · ملخص ' + nSum + ' · بطاقات ' + count('c') +
  ' · موضوعي ' + count('o') + ' · جداول ' + count('t') + ' · ليلة ' + count('n') + ' · تعريفات ' + Object.keys(defs).length);
