#!/usr/bin/env node
/* نسخة المراجعة (للمراجع المستقل ولجيمني): ما كتبه Claude بعبارته وحده، وعند كل موضع رقم صفحته في الكتاب.
   ليس فيها نص من الكتاب: المراجع يقابلها بصفحات الكتاب نفسها، وجيمني بملف صفحات الدفعة.
   ولا يدخلها ما نُقل حرفياً (كتل «q»، والتعريفات، وبطاقات التعريف بنص الكتاب bk: true)، لأنه يُقابَل بصور الصفحات عند المدقق المستقل.
   الاستعمال: node _tools/common/review-copy.js <رمز المادة> <ملف الفصل أو الجزء.js> > review-cN.md */
'use strict';
const lib = require('./lib');
const [code, file, ...more] = process.argv.slice(2);
if (!code || !file || more.length) lib.die('usage: node review-copy.js <subject> chapter.js' + (more.length ? '\n  the review copy no longer holds the book text: the reviewer compares it with the pages themselves' : ''));
const S = lib.loadSubject(code);
let ch;
try { ch = lib.loadChapter(S, file); } catch (e) { lib.die('ERROR: ' + e.message, 1); }

const L = [];
const p = (s) => L.push(s);
const pg = (x) => (x ? ' [ص ' + x + ']' : '');
const AB = ['أ', 'ب', 'ج', 'د'];
const TF = S.checks.tfReason ? ' بيّن مدى صحة العبارة: ' : ' صح أو خطأ: ';
p('# نسخة المراجعة: ' + ch.title + '، ' + ch.name + ' (ص ' + ch.pages + ')');
p('فيها ما كتبه Claude بعبارته وحده، وعند كل موضع رقم صفحته في الكتاب: قابله بالصفحة نفسها، فليس فيها نص من الكتاب. والجواب المعتمد معلَّم بـ [المعتمد]، ونوع الخطأ الذي بُني عليه كل خيار خاطئ أو عبارة خاطئة بين قوسين.');
ch.lessons.forEach((l) => {
  if (l.pending === true) return;   /* درس معلّق لم يُبنَ: لا شيء فيه يُراجَع */
  p('\n\n## الدرس ' + l.id + ': ' + l.title + ' (ص ' + l.pages + ')');
  if (Array.isArray(l.intro) && l.intro.length) {
    p('\n### التمهيد المبسّط (بعبارة Claude، للفهم لا للحفظ، ولا شيء فيه من خارج الملخص)');
    l.intro.forEach((x, i) => p('- ' + l.id + '.i' + (i + 1) + ' ' + x));
  }
  p('\n### الملخص (ما كُتب بعبارة Claude)');
  l.summary.forEach((b, i) => {
    const id = l.id + '.s' + (i + 1);
    if (b.t === 'h') p('\n**' + b.x + '**');
    else if (b.t === 'p') p('- ' + id + pg(b.pg) + ' ' + b.x);
    else if (b.t === 'note') p('- ' + id + pg(b.pg) + ' تنبيه: ' + b.x);
    else if (b.t === 'list') { p('- ' + id + pg(b.pg) + ' ' + b.lead); b.items.forEach((it, j) => p('    ' + (j + 1) + '. ' + it)); }
    else if (b.t === 'dr') p('- ' + id + ' من إملاء الدكتور: ' + (b.x || '') + (b.items ? ' ' + b.items.join(' / ') : ''));
    else if (b.t === 'q') p('- ' + id + pg(b.pg) + ' [هنا في الموقع نص حرفي من الكتاب' + (b.label ? ': ' + b.label : '') + '، قوبل بصور الصفحات فحُذف من هذه النسخة، فلا تعدّ ما قبله ناقصًا]');
  });
  const cards = l.cards.filter((k) => !(k.type === 'def' && k.bk));
  if (cards.length) {
    p('\n### البطاقات (غير الحرفية)');
    cards.forEach((k) => {
      if (k.type === 'def') p('- ' + k.id + pg(k.pg) + ' | ' + k.front + ' ← ' + k.back);
      else if (k.type === 'count') { p('- ' + k.id + pg(k.pg) + ' | ' + k.front + ' (' + k.n + ') ← ' + k.lead); k.items.forEach((it, j) => p('    ' + (j + 1) + '. ' + it)); }
      else if (k.type === 'rule') p('- ' + k.id + pg(k.pg) + ' | ' + k.front + ' ← القاعدة: ' + k.rule + ' | الاستثناء: ' + k.exc);
    });
  }
  p('\n### الأسئلة الموضوعية');
  l.objective.forEach((q) => {
    if (q.k === 'tf') p('- ' + q.id + pg(q.pg) + TF + q.q + '\n    [المعتمد] ' + (q.a ? 'صحيحة' : 'خاطئة (' + (q.e || '؟') + ')') + '. التعليل: ' + q.why);
    else if (q.k === 'mcq') p('- ' + q.id + pg(q.pg) + ' اختيار من متعدد: ' + q.q + '\n' + q.opts.map((o, j) => '    ' + AB[j] + ') ' + o + (j === q.a ? '  [المعتمد]' : '  (' + ((q.e || [])[j] || '؟') + ')')).join('\n') + '\n    التعليل: ' + q.why);
    else if (q.k === 'fill') p('- ' + q.id + pg(q.pg) + ' ضع الكلمة الصحيحة: ' + q.q + '\n    الخيارات: ' + q.opts.map((o, j) => o + (o === q.a ? ' [المعتمد]' : ' (' + ((q.e || [])[j] || '؟') + ')')).join(' / ') + '\n    التعليل: ' + q.why);
  });
  p('\n### الأسئلة المقالية ونقاط أجوبتها النموذجية');
  l.essay.forEach((e) => { p('- ' + e.id + pg(e.pg) + ' ' + e.q); e.points.forEach((x, j) => p('    ' + (j + 1) + '. ' + x.x + pg(x.pg))); });
});
if ((ch.tables || []).length) {
  p('\n\n## صف «الفرق الجوهري» في جداول المقارنة');
  ch.tables.forEach((t) => {
    p('\n- ' + t.id + pg(t.pg) + ' ' + t.title + ' (' + t.cols.slice(1).join(' / ') + ')');
    t.rows.forEach((r) => p('    ' + r.join(' | ')));
    p('    الفرق الجوهري: ' + t.core);
  });
}
console.log(L.join('\n'));
