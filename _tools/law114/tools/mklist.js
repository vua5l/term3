// يكتب قائمة المقابلة «المعرّف | الصفحة | النص» لما نبّه إليه validate.js، ولمعرّفات تُعطى (بصيغة show.js l26.s19)
// node mklist.js <مجلد التقارير> <مجلد الأجزاء> [معرّف ...]   (يُشغَّل من جذر المستودع)
const fs = require('fs'), path = require('path');
const L = require(path.resolve('_tools/common/lib'));
const S = L.loadSubject('law114');
const [valDir, partsDir, ...extra] = process.argv.slice(2);
const lessons = {};
fs.readdirSync(partsDir).filter((f) => f.endsWith('.js')).forEach((f) => {
  L.loadChapter(S, path.join(partsDir, f)).lessons.forEach((l) => { lessons[l.id] = l; });
});
const want = [];
fs.readdirSync(valDir).forEach((f) => {
  const re = /lesson (l\d+)\.summary\[(\d+)\]: verbatim text/g; let m;
  const t = fs.readFileSync(path.join(valDir, f), 'utf8');
  while ((m = re.exec(t))) want.push([m[1], +m[2]]);
});
extra.forEach((id) => { const m = /^(l\d+)\.s(\d+)$/.exec(id); want.push([m[1], +m[2] - 1]); });
want.forEach(([lid, k]) => {
  const b = lessons[lid].summary[k];
  const txt = L.isDefBlock(b) ? L.defFull(b) : b.x;
  console.error(lid + '.s' + (k + 1), '«' + String(txt).slice(0, 25) + '…»');
  console.log(lid + '.s' + (k + 1) + ' | ' + b.pg + ' | ' + String(txt).replace(/\n/g, ' '));
});
