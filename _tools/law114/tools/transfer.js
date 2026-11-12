// ينقل بنود الأسئلة الجديدة أو المعدّلة من نسخة المصحح إلى نسخة من الجزء الأصلي، نقلاً نصياً بلا إعادة كتابة للملف
// node transfer.js <الأصل.js> <نسخة المصحح.js> <الناتج.js>   (من جذر المستودع)
const fs = require('fs'), path = require('path');
const L = require(path.resolve('_tools/common/lib'));
const S = L.loadSubject('law114');
const [orig, work, out] = process.argv.slice(2);
fs.copyFileSync(orig, out);
const P = require(path.resolve('_tools/common/patchlib'))(out);
const canon = (v) => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
const lit = (v) => Array.isArray(v) ? '[' + v.map(lit).join(', ') + ']' : v && typeof v === 'object' ? '{ ' + Object.keys(v).map((k) => k + ': ' + lit(v[k])).join(', ') + ' }' : JSON.stringify(v);
const a = L.loadChapter(S, orig), b = L.loadChapter(S, work);
const done = [];
a.lessons.forEach((la, i) => {
  const lb = b.lessons[i]; if (lb.id !== la.id) throw new Error('lesson order differs');
  const ma = {}; (la.objective || []).forEach((x) => (ma[x.id] = x));
  let prev = null;
  (lb.objective || []).forEach((x) => {
    if (ma[x.id]) {
      if (canon(ma[x.id]) !== canon(x)) { P.obj(x.id, (o) => { Object.keys(o).forEach((k) => delete o[k]); Object.assign(o, x); }); done.push('changed ' + x.id); }
      prev = x.id; return;
    }
    const lines = P.text().split('\n');
    const idx = lines.findIndex((l) => l.includes('{ id: "' + prev + '",'));
    if (idx < 0) throw new Error('no line for ' + prev);
    const line = lines[idx], ind = line.match(/^\s*/)[0];
    const add = /,\s*$/.test(line) ? line + '\n' + ind + lit(x) + ',' : line + ',\n' + ind + lit(x);
    P.rep(line, add); done.push('added ' + x.id + ' after ' + prev); prev = x.id;
  });
});
P.save(); console.log(path.basename(out) + ': ' + (done.join(' · ') || 'nothing'));
