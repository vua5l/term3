#!/usr/bin/env node
/* نسخة المراجعة (للمراجع وحده): كل فقرة وبطاقة وسؤال بجوابه المعتمد وصفحته، من ملف الفصل.
   الاستعمال: node review-copy.js <ملف الفصل.js> > review-cN.md */
'use strict';
const fs = require('fs');
const vm = require('vm');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.argv[2], 'utf8'), ctx);
const ch = ctx.window.LAW136.chapters[0];
const L = [];
const p = (s) => L.push(s);
const pg = (x) => (x ? ' [ص ' + x + ']' : '');
const AB = ['أ', 'ب', 'ج', 'د'];
p('# نسخة المراجعة — ' + ch.title + ': ' + ch.name + ' (ص ' + ch.pages + ')');
p('كل بند بمعرّفه وصفحته. «نص حرفي» = يجب أن يطابق لفظ الكتاب. الجواب المعتمد معلَّم بـ [المعتمد].');
ch.lessons.forEach((l) => {
  p('\n## الدرس ' + l.id + ': ' + l.title + ' (ص ' + l.pages + '، ' + l.minutes + ' دقيقة)');
  p('\n### الملخص');
  l.summary.forEach((b, i) => {
    const id = l.id + '.s' + (i + 1);
    if (b.t === 'h') p('\n**' + b.x + '**');
    else if (b.t === 'p') p('- ' + id + pg(b.pg) + ' ' + b.x);
    else if (b.t === 'note') p('- ' + id + pg(b.pg) + ' تنبيه: ' + b.x);
    else if (b.t === 'q') p('- ' + id + pg(b.pg) + ' نص حرفي' + (b.label ? ' (' + b.label + ')' : '') + ': «' + b.x + '»');
    else if (b.t === 'list') { p('- ' + id + pg(b.pg) + ' ' + b.lead); b.items.forEach((it, j) => p('    ' + (j + 1) + '. ' + it)); }
  });
  p('\n### البطاقات');
  l.cards.forEach((k) => {
    if (k.type === 'def') p('- ' + k.id + pg(k.pg) + (k.bk ? ' نص حرفي' : '') + ' | ' + k.front + ' ← ' + k.back);
    else if (k.type === 'count') { p('- ' + k.id + pg(k.pg) + ' | ' + k.front + ' (' + k.n + ') ← ' + k.lead); k.items.forEach((it, j) => p('    ' + (j + 1) + '. ' + it)); }
    else if (k.type === 'rule') p('- ' + k.id + pg(k.pg) + ' | ' + k.front + ' ← القاعدة: ' + k.rule + ' | الاستثناء: ' + k.exc);
  });
  p('\n### الأسئلة الموضوعية');
  l.objective.forEach((q) => {
    if (q.k === 'tf') p('- ' + q.id + pg(q.pg) + ' صح أو خطأ: ' + q.q + '\n    [المعتمد] ' + (q.a ? 'صح' : 'خطأ') + ' — ' + q.why);
    else if (q.k === 'mcq') p('- ' + q.id + pg(q.pg) + ' اختيار: ' + q.q + '\n' + q.opts.map((o, j) => '    ' + AB[j] + ') ' + o + (j === q.a ? '  [المعتمد]' : '')).join('\n') + '\n    التعليل: ' + q.why);
    else if (q.k === 'fill') p('- ' + q.id + pg(q.pg) + ' أكمل: ' + q.q + '\n    الخيارات: ' + q.opts.join(' / ') + '\n    [المعتمد] ' + q.a + ' — ' + q.why);
  });
  p('\n### الأسئلة المقالية');
  l.essay.forEach((e) => { p('- ' + e.id + pg(e.pg) + ' ' + e.q); e.points.forEach((x, j) => p('    ' + (j + 1) + '. ' + x.x + pg(x.pg))); });
});
p('\n## جداول المقارنة');
ch.tables.forEach((t) => {
  p('\n### ' + t.id + ': ' + t.title + pg(t.pg));
  p('| ' + t.cols.join(' | ') + ' |');
  p('|' + t.cols.map(() => '---').join('|') + '|');
  t.rows.forEach((r) => p('| ' + r.join(' | ') + ' |'));
  p('الفرق الجوهري: ' + t.core);
});
p('\n## الخريطة الذهنية');
(function walk(n, d) { p('  '.repeat(d) + '- ' + n.t + (n.d ? ': ' + n.d : '') + pg(n.pg)); (n.c || []).forEach((c) => walk(c, d + 1)); })(ch.map, 0);
p('\n## ورقة الليلة الأخيرة');
ch.night.forEach((x, i) => p('- n' + (i + 1) + pg(x.pg) + ' ' + x.x));
console.log(L.join('\n'));
