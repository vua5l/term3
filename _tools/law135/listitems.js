#!/usr/bin/env node
/* بنود القوائم المنقولة حرفياً (كتل list في الملخص) من ملف فصل أو جزء منه، بصيغة crops.js --list:
   «المعرّف | الصفحة | النص». crops.js --chapter لا يأخذ القوائم، وهي حرفية في law135.
   الاستعمال: node listitems.js <فصل.js> [أسطر إضافية من تقرير الباني] > list.txt */
'use strict';
const fs = require('fs');
const vm = require('vm');
const [file, extra] = process.argv.slice(2);
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
const ch = ctx.window.LAW135.chapters[0];
const out = [];
(ch.lessons || []).forEach((l) => (l.summary || []).forEach((b, n) => {
  if (b && b.t === 'list' && Array.isArray(b.items)) b.items.forEach((it, k) => {
    const x = typeof it === 'string' ? it : (it && (it.x || it.t)) || '';
    if (x && b.pg) out.push(l.id + '.s' + (n + 1) + '.i' + (k + 1) + ' | ' + b.pg + ' | ' + x.replace(/\|/g, '¦'));
  });
}));
if (extra) fs.readFileSync(extra, 'utf8').split('\n').forEach((ln, n) => {
  const c = ln.split('|').map((x) => x.trim());
  if (c.length >= 2 && /\d/.test(c[0])) out.push('r' + (n + 1) + ' | ' + c[0] + ' | ' + c.slice(1).join(' ').trim());
});
process.stdout.write(out.join('\n') + '\n');
