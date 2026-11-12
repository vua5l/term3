// يتحقق أن المصحح لم يغيّر إلا ما أضافه: node diffcheck.js <مجلد الأصل> <مجلد الجديد>  (من جذر المستودع)
const fs = require('fs'), path = require('path');
const L = require(path.resolve('_tools/common/lib'));
const S = L.loadSubject('law114');
const [A, B] = process.argv.slice(2);
const J = (x) => JSON.stringify(x);
fs.readdirSync(B).filter((f) => f.endsWith('.js')).sort().forEach((f) => {
  const a = L.loadChapter(S, path.join(A, f)), b = L.loadChapter(S, path.join(B, f));
  const out = [];
  if (J({ ...a, lessons: 0 }) !== J({ ...b, lessons: 0 })) out.push('chapter fields changed');
  a.lessons.forEach((la, i) => {
    const lb = b.lessons[i];
    Object.keys({ ...la, ...lb }).forEach((k) => {
      if (['objective'].includes(k)) return;
      if (J(la[k]) !== J(lb[k])) out.push(la.id + '.' + k + ' changed');
    });
    const ma = {}, mb = {};
    (la.objective || []).forEach((x) => (ma[x.id] = x));
    (lb.objective || []).forEach((x) => (mb[x.id] = x));
    Object.keys(ma).forEach((id) => {
      if (!mb[id]) return out.push(id + ' REMOVED');
      if (J(ma[id]) === J(mb[id])) return;
      const keys = Object.keys({ ...ma[id], ...mb[id] }).filter((k) => J(ma[id][k]) !== J(mb[id][k]));
      const detail = keys.map((k) => k === 'options' || k === 'o' ? k + '[' + (ma[id][k] || []).map((o, j) => (J(o) !== J((mb[id][k] || [])[j]) ? j : null)).filter((x) => x !== null) + ']' : k);
      out.push(id + ' changed: ' + detail.join(','));
    });
    Object.keys(mb).forEach((id) => { if (!ma[id]) out.push(id + ' ADDED'); });
  });
  console.log(f + ': ' + (out.length ? out.join(' · ') : 'unchanged'));
});
