#!/usr/bin/env node
/* يولّد lessons.json لموقع المادة من ملفات الفصول بترتيب config.js (ويتحقق أن index.html يحمّلها).
   الاستعمال: node _tools/common/make-lessons.js <رمز المادة> [--check]
   --check: يقارن بالملف الحالي ولا يكتب. والدرس المعلّق يدخل الملف كغيره، فيحجز الجدول وقته. */
'use strict';
const fs = require('fs');
const path = require('path');
const lib = require('./lib');

/* يعيد { text, rows } أو يرمي خطأ */
function buildLessons(S) {
  const site = lib.loadSite(S);
  const html = fs.readFileSync(path.join(S.siteDir, 'index.html'), 'utf8');
  const seen = new Set(), rows = [];
  site.cfg.chapters.forEach((cid) => {
    if (html.indexOf('src="data/' + cid + '.js"') < 0) throw new Error('index.html does not load data/' + cid + '.js');
    site.byId[cid].lessons.forEach((l) => {
      if (seen.has(l.id)) throw new Error('duplicate lesson id ' + l.id);
      seen.add(l.id);
      if (!Number.isInteger(l.minutes) || l.minutes < 1) throw new Error('lesson ' + l.id + ' has no valid minutes');
      rows.push({ id: l.id, title: l.title, minutes: l.minutes, pages: l.pages, link: '#l-' + l.id.slice(1) });
    });
  });
  const text = '{\n  "v": 1,\n  "code": ' + JSON.stringify(site.cfg.code) + ',\n  "name": ' + JSON.stringify(site.cfg.name) + ',\n  "lessons": [\n' +
    rows.map((r) => '    { "id": ' + JSON.stringify(r.id) + ', "title": ' + JSON.stringify(r.title) + ', "minutes": ' + r.minutes +
      ', "pages": ' + JSON.stringify(r.pages) + ', "link": ' + JSON.stringify(r.link) + ' }').join(',\n') + '\n  ]\n}\n';
  return { text, rows, target: path.join(S.siteDir, 'lessons.json') };
}

if (require.main === module) {
  const { rest, flags } = lib.args(process.argv.slice(2), { check: 0 });
  if (!rest[0]) lib.die('usage: node make-lessons.js <subject> [--check]');
  const S = lib.loadSubject(rest[0]);
  let r;
  try { r = buildLessons(S); } catch (e) { lib.die(e.message, 1); }
  const cur = fs.existsSync(r.target) ? fs.readFileSync(r.target, 'utf8') : '';
  if (flags.check) { console.log(cur === r.text ? 'SAME as current lessons.json' : 'DIFFERENT from current lessons.json'); process.exit(0); }
  fs.writeFileSync(r.target, r.text);
  console.log('wrote ' + path.relative(S.repo, r.target) + ': ' + r.rows.length + ' lessons, ' + r.rows.reduce((s, x) => s + x.minutes, 0) + ' minutes');
}
module.exports = { buildLessons };
