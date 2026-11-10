#!/usr/bin/env node
/* يولّد <الموقع>/data/defs.js (خانة التعريفات) من ملفات الفصول بترتيب config.js، فلا يُكتب باليد.
   - checks.defs = summary (الأصل): من تعريفات الملخص (كتلة q فيها def وparts). مصدر كل تعريف بطاقته المشتقة، ودرسه درس كتلته.
   - checks.defs = chapter: من خانة defs في ملف الفصل، ودرسه بحسب بطاقته أو صفحته.
   المعرّفات d1… تُحفظ في data/defs-ids.json فلا تتغير بعد النشر، والجديد يأخذ رقماً جديداً، لأن سجل التقدم مربوط بها.
   الاستعمال: node _tools/common/make-defs.js <رمز المادة> [--check]     (--check: يقارن بالملفين الحاليين ولا يكتب) */
'use strict';
const fs = require('fs');
const path = require('path');
const lib = require('./lib');

const normDef = (s) => String(s).replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();

/* يعيد { items, fams, defsText, idsText, files } دون أن يكتب شيئاً */
function buildDefs(S, site) {
  if (S.checks.defs === 'manual') throw new Error('defs.js is kept by hand for this subject (checks.defs = manual)');
  const idsFile = path.join(S.siteDir, 'data', 'defs-ids.json');
  const known = fs.existsSync(idsFile) ? JSON.parse(fs.readFileSync(idsFile, 'utf8')) : {};
  let next = Object.values(known).reduce((m, id) => Math.max(m, +String(id).slice(1)), 0) + 1;
  const items = [], famMap = {};
  const idOf = (key) => { if (!known[key]) known[key] = 'd' + next++; return known[key]; };
  site.chapters.forEach((c) => {
    if (S.checks.defs === 'summary') {
      (c.lessons || []).forEach((l) => (Array.isArray(l.summary) ? l.summary : []).forEach((b) => {
        if (!lib.isDefBlock(b)) return;
        if (!b.def || !b.def.card) throw new Error(l.id + ': the definition «' + (b.def && b.def.term) + '» has no derived card yet (run merge.js or apply.js on its chapter file first)');
        const id = idOf('card:' + b.def.card);
        items.push({ id, n: items.length + 1, term: b.def.term, ch: c.id, les: l.id, pg: String(b.pg), from: b.def.card, sum: false, parts: b.parts, hide: b.def.hide || [] });
        if (b.def.fam) (famMap[b.def.fam] = famMap[b.def.fam] || []).push(id);
      }));
      return;
    }
    (c.defs || []).forEach((d) => {
      const s = lib.span(d.pg) || lib.span(c.pages);
      /* بطاقة التعريف الحرفية مصدره، ودرسه درسها؛ فإن لم توجد فالدرس الذي تقع فيه صفحته */
      const txt = normDef((d.parts || []).join(' '));
      let card = null, les = null;
      c.lessons.forEach((l) => (l.cards || []).forEach((k) => {
        if (card || k.type !== 'def' || !k.bk) return;
        if (normDef(k.front) === normDef(d.term) || (txt && normDef(k.back) === txt)) { card = k; les = l; }
      }));
      if (!les) les = c.lessons.find((l) => { const x = lib.span(l.pages); return x && s && s[0] >= x[0] && s[0] <= x[1]; }) || c.lessons[0];
      const id = idOf(c.id + '|' + normDef(d.term) + '|' + d.pg);
      items.push({ id, n: items.length + 1, term: d.term, ch: c.id, les: les.id, pg: String(d.pg), from: card ? card.id : 'book', sum: false, parts: d.parts, hide: d.hide || [] });
      if (d.fam) (famMap[d.fam] = famMap[d.fam] || []).push(id);
    });
  });
  const fams = Object.keys(famMap).filter((k) => famMap[k].length > 1).map((k, i) => ({ id: 'f' + (i + 1), name: k, members: famMap[k] }));
  const from = S.checks.defs === 'summary' ? 'تعريفات الملخص' : 'خانة defs';
  const defsText = '/* ' + S.name + ' (' + S.code + '): بيانات خانة التعريفات وحدها، مولَّدة بـ _tools/common/make-defs.js من ' + from + ' في ملفات الفصول، فلا تُكتب باليد.\n' +
    '   نصوص الكتاب الحرفية مقطّعة قطعاً، ومعها أسر التعاريف المتشابهة. والمعرّفات ثابتة في defs-ids.json لأن سجل التقدم مربوط بها */\n' +
    'window.' + S.global + '_DEFS = ' + JSON.stringify({ v: 1, items, fams }, null, 1) + ';\n';
  return { items, fams, defsText, idsText: JSON.stringify(known, null, 1) + '\n', files: { ids: idsFile, defs: path.join(S.siteDir, 'data', 'defs.js') } };
}
/* ما بعد تعليق الرأس: البيانات وحدها، للمقارنة */
const body = (t) => t.slice(t.indexOf('window.'));

if (require.main === module) {
  const { rest, flags } = lib.args(process.argv.slice(2), { check: 0 });
  if (!rest[0]) lib.die('usage: node make-defs.js <subject> [--check]');
  const S = lib.loadSubject(rest[0]);
  let r;
  try { r = buildDefs(S, lib.loadSite(S)); } catch (e) { lib.die('ERROR: ' + e.message, 1); }
  if (flags.check) {
    const cur = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
    const same = body(cur(r.files.defs)) === body(r.defsText) && cur(r.files.ids) === r.idsText;
    console.log(same ? 'SAME as current defs.js and defs-ids.json' : 'DIFFERENT from current defs.js or defs-ids.json');
    process.exit(0);
  }
  fs.writeFileSync(r.files.ids, r.idsText);
  fs.writeFileSync(r.files.defs, r.defsText);
  console.log('defs: ' + r.items.length + ' · families: ' + r.fams.length);
}
module.exports = { buildDefs, body };
