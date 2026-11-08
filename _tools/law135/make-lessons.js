#!/usr/bin/env node
/* يولّد lessons.json لموقع law135 من ملفات الفصول بترتيب config.js.
   الاستعمال: node make-lessons.js <مجلد الموقع> [--check]
   --check: يقارن بالملف الحالي ولا يكتب. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = process.argv[2];
const check = process.argv.includes('--check');
if (!dir) { console.error('usage: node make-lessons.js <site folder> [--check]'); process.exit(2); }

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(dir, 'config.js'), 'utf8'), ctx);
const cfg = ctx.window.LAW135_CONFIG;
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
for (const id of cfg.chapters) {
  const f = path.join(dir, 'data', id + '.js');
  if (!fs.existsSync(f)) { console.error('missing ' + f); process.exit(1); }
  if (html.indexOf('src="data/' + id + '.js"') < 0) { console.error('index.html does not load data/' + id + '.js'); process.exit(1); }
  vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
}
const byId = {};
ctx.window.LAW135.chapters.forEach((c) => { byId[c.id] = c; });
const seen = new Set();
const rows = [];
cfg.chapters.forEach((cid) => {
  byId[cid].lessons.forEach((l) => {
    if (seen.has(l.id)) { console.error('duplicate lesson id ' + l.id); process.exit(1); }
    seen.add(l.id);
    if (!Number.isInteger(l.minutes) || l.minutes < 1) { console.error('lesson ' + l.id + ' has no valid minutes'); process.exit(1); }
    rows.push({ id: l.id, title: l.title, minutes: l.minutes, pages: l.pages, link: '#l-' + l.id.slice(1) });
  });
});
const out = '{\n  "v": 1,\n  "code": ' + JSON.stringify(cfg.code) + ',\n  "name": ' + JSON.stringify(cfg.name) + ',\n  "lessons": [\n' +
  rows.map((r) => '    { "id": ' + JSON.stringify(r.id) + ', "title": ' + JSON.stringify(r.title) + ', "minutes": ' + r.minutes +
    ', "pages": ' + JSON.stringify(r.pages) + ', "link": ' + JSON.stringify(r.link) + ' }').join(',\n') + '\n  ]\n}\n';
const target = path.join(dir, 'lessons.json');
const cur = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
if (check) { console.log(cur === out ? 'SAME as current lessons.json' : 'DIFFERENT from current lessons.json'); process.exit(0); }
fs.writeFileSync(target, out);
console.log('wrote ' + target + ': ' + rows.length + ' lessons, ' + rows.reduce((s, r) => s + r.minutes, 0) + ' minutes');
