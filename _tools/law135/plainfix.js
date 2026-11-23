#!/usr/bin/env node
/* نسخة المراجعة من _tools/common/review-copy.js تكتب كل صح وخطأ «بيّن مدى صحة العبارة» (tfReason).
   في law135 الصح والخطأ بلا تعليل (plain: 1) نوعه آخر: يُكتب «صح أو خطأ (بلا تعليل)»، وتعليله سطر قصير لا جواب نموذجي.
   الاستعمال: node plainfix.js <فصل.js> <review.md>  (يعدّل الملف في مكانه) */
'use strict';
const fs = require('fs');
const vm = require('vm');
const [file, review] = process.argv.slice(2);
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
const ids = new Set();
ctx.window.LAW135.chapters.forEach((ch) => (ch.lessons || []).forEach((l) => (l.objective || []).forEach((q) => { if (q.k === 'tf' && q.plain) ids.add(q.id); })));
let n = 0;
const out = fs.readFileSync(review, 'utf8').split('\n').map((ln) => {
  const m = ln.match(/^- (l\d+o\d+) /);
  if (m && ids.has(m[1]) && ln.includes('بيّن مدى صحة العبارة:')) { n++; return ln.replace('بيّن مدى صحة العبارة:', 'صح أو خطأ (بلا تعليل):'); }
  return ln;
});
fs.writeFileSync(review, out.join('\n'));
console.error('plain tf marked: ' + n + ' of ' + ids.size);
