/* يطبّق تعديلاً على ملف فصل بصيغة الكائن ثم يعيد كتابته بكاتب merge.js نفسه.
   الاستعمال: node apply.js <ملف الفصل.js> <ملف التعديل.js>
   ملف التعديل يصدّر دالة (ch, H) تعدّل الفصل، وH فيه find(id) وset(id, obj) وdel(id) وsummary(lessonId) */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), cp = require('child_process');
const [file, patchFile] = process.argv.slice(2);
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
const ch = JSON.parse(JSON.stringify(ctx.window.LAW135.chapters[0]));
const idx = () => { const m = {}; ch.lessons.forEach((l) => ['cards', 'objective', 'essay', 'steps'].forEach((k) => (l[k] || []).forEach((x, i) => { m[x.id] = { l, k, i }; }))); return m; };
const H = {
  lesson: (id) => ch.lessons.find((l) => l.id === id),
  find: (id) => { const r = idx()[id]; if (!r) throw new Error('no item ' + id); return r.l[r.k][r.i]; },
  set: (id, obj) => { const r = idx()[id]; if (!r) throw new Error('no item ' + id); r.l[r.k][r.i] = obj; },
  del: (id) => { const r = idx()[id]; if (!r) throw new Error('no item ' + id); r.l[r.k].splice(r.i, 1); },
};
require(path.resolve(patchFile))(ch, H);
const tmp = '/tmp/apply-' + process.pid + '.js';
fs.writeFileSync(tmp, '(window.LAW135 = window.LAW135 || { chapters: [] }).chapters.push(' + JSON.stringify(ch) + ');\n');
const out = cp.execFileSync('node', [path.join(__dirname, 'merge.js'), file, ch.id, ch.title, ch.name, ch.pages, tmp], { encoding: 'utf8' });
fs.unlinkSync(tmp); process.stdout.write(out);
