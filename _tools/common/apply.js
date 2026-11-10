#!/usr/bin/env node
/* يطبّق تعديلاً على ملف فصل بصيغة الكائن ثم يعيد كتابته بكاتب merge.js نفسه.
   الاستعمال: node _tools/common/apply.js <رمز المادة> <ملف الفصل.js> <ملف التعديل.js>
   ملف التعديل يصدّر دالة (ch, H) تعدّل الفصل، وH فيه lesson(id) وfind(id) وset(id, obj) وdel(id) لبطاقة أو سؤال أو مقالي أو خطوات بمعرّفه. */
'use strict';
const path = require('path');
const lib = require('./lib');
const { mergeChapters } = require('./merge');

const [code, file, patchFile] = process.argv.slice(2);
if (!code || !file || !patchFile) lib.die('usage: node apply.js <subject> chapter.js patch.js');
const S = lib.loadSubject(code);
try {
  const ch = lib.copy(lib.loadChapter(S, file));
  const idx = () => { const m = {}; ch.lessons.forEach((l) => ['cards', 'objective', 'essay', 'steps'].forEach((k) => (l[k] || []).forEach((x, i) => { m[x.id] = { l, k, i }; }))); return m; };
  const at = (id) => { const r = idx()[id]; if (!r) throw new Error('no item ' + id); return r; };
  const H = {
    lesson: (id) => ch.lessons.find((l) => l.id === id),
    find: (id) => { const r = at(id); return r.l[r.k][r.i]; },
    set: (id, obj) => { const r = at(id); r.l[r.k][r.i] = obj; },
    del: (id) => { const r = at(id); r.l[r.k].splice(r.i, 1); }
  };
  require(path.resolve(patchFile))(ch, H);
  console.log(mergeChapters(S, file, { id: ch.id, title: ch.title, name: ch.name, pages: ch.pages }, [ch], {}));
} catch (e) { lib.die('ERROR: ' + e.message, 1); }
