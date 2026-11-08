#!/usr/bin/env node
/* نسخة المراجعة (للمراجع وحده، ولجيمني): ما كتبه Claude بعبارته وحده، ومع كل درس نص الكتاب الذي بُني عليه بصفحاته.
   لا يدخلها ما نُقل حرفياً (كتل «q»، وبطاقات التعريف بنص الكتاب bk: true، والتعريفات)، لأنه قوبل بصور الصفحات ويُفحص آلياً.
   الاستعمال: node review-copy.js <ملف الفصل.js> <ملف النص المستخرج.md> [ملف نص آخر.md ...] > review-cN.md */
'use strict';
const fs = require('fs');
const vm = require('vm');
const [file, ...srcFiles] = process.argv.slice(2);
if (!file || !srcFiles.length) { console.error('usage: node review-copy.js chapter.js text.md [text2.md]'); process.exit(2); }
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
const ch = ctx.window.LAW135.chapters[0];

/* صفحات النص المستخرج: «=== ص 127 ===» */
const PAGES = {};
srcFiles.forEach((f) => {
  const raw = fs.readFileSync(f, 'utf8');
  const parts = raw.split(/^===\s*ص\s*([0-9٠-٩]+)\s*===\s*$/m);
  for (let i = 1; i < parts.length; i += 2) PAGES[+String(parts[i]).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))] = parts[i + 1].trim();
});
function span(pg) {
  const m = String(pg || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).match(/\d+/g);
  return m ? [Math.min(...m.map(Number)), Math.max(...m.map(Number))] : null;
}

const L = [];
const p = (s) => L.push(s);
const pg = (x) => (x ? ' [ص ' + x + ']' : '');
const AB = ['أ', 'ب', 'ج', 'د'];
p('# نسخة المراجعة: ' + ch.title + '، ' + ch.name + ' (ص ' + ch.pages + ')');
p('فيها ما كتبه Claude بعبارته وحده، ولكل درس نص الكتاب الذي بُني عليه بصفحاته. والجواب المعتمد معلَّم بـ [المعتمد]، ونوع الخطأ الذي بُني عليه كل خيار خاطئ أو عبارة خاطئة بين قوسين.');
ch.lessons.forEach((l) => {
  p('\n\n## الدرس ' + l.id + ': ' + l.title + ' (ص ' + l.pages + ')');
  const s = span(l.pages);
  p('\n### نص الكتاب لهذا الدرس');
  if (s) for (let n = s[0]; n <= s[1]; n++) p('\n[ص ' + n + ']\n' + (PAGES[n] || '(لا نص لهذه الصفحة في الملف)'));
  p('\n### الملخص (ما كُتب بعبارة Claude)');
  l.summary.forEach((b, i) => {
    const id = l.id + '.s' + (i + 1);
    if (b.t === 'h') p('\n**' + b.x + '**');
    else if (b.t === 'p') p('- ' + id + pg(b.pg) + ' ' + b.x);
    else if (b.t === 'note') p('- ' + id + pg(b.pg) + ' تنبيه: ' + b.x);
    else if (b.t === 'list') { p('- ' + id + pg(b.pg) + ' ' + b.lead); b.items.forEach((it, j) => p('    ' + (j + 1) + '. ' + it)); }
    else if (b.t === 'dr') p('- ' + id + ' من إملاء الدكتور: ' + (b.x || '') + (b.items ? ' ' + b.items.join(' / ') : ''));
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
    if (q.k === 'tf') p('- ' + q.id + pg(q.pg) + ' بيّن مدى صحة العبارة: ' + q.q + '\n    [المعتمد] ' + (q.a ? 'صحيحة' : 'خاطئة (' + (q.e || '؟') + ')') + '. التعليل: ' + q.why);
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
