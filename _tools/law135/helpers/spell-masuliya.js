// توحيد رسم «مسئولية» في عبارة الموقع على رسم الكتاب وعناوين الفصل (أربعة أجزاء من ستة كتبته كذلك).
// لا يمس النص الحرفي: نص كتل q، وبنود list، وظهر بطاقات def بنص الكتاب (bk)، وأجزاء defs وكلماتها المخفية.
module.exports = (ch, H) => {
  let n = 0;
  const fix = (s) => (typeof s === 'string' && s.includes('مسؤول')) ? (n += s.split('مسؤول').length - 1, s.split('مسؤول').join('مسئول')) : s;
  const walk = (o) => {
    if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) { if (typeof o[i] === 'string') o[i] = fix(o[i]); else walk(o[i]); } return; }
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) { if (typeof o[k] === 'string') o[k] = fix(o[k]); else walk(o[k]); }
  };
  ch.lessons.forEach((l) => {
    (l.summary || []).forEach((b) => {
      if (b.t === 'q') { b.label = fix(b.label); return; }
      if (b.t === 'list') { b.lead = fix(b.lead); return; }
      walk(b);
    });
    (l.cards || []).forEach((c) => {
      if (c.type === 'def' && c.bk) { c.front = fix(c.front); return; }
      walk(c);
    });
    ['objective', 'essay', 'steps'].forEach((k) => walk(l[k] || []));
    ['title', 'intro'].forEach((k) => { if (typeof l[k] === 'string') l[k] = fix(l[k]); });
  });
  walk(ch.tables || []); walk(ch.map || {}); walk(ch.night || []);
  (ch.defs || []).forEach((d) => { d.term = fix(d.term); });
  console.error('spell: ' + n + ' replaced');
};
