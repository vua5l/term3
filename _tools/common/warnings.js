/* تنبيهات الفحص الثلاثة: أسئلة متقاربة، والجواب الصحيح الأطول، وتعريفات مكررة.
   تنبيهات تُراجَع ولا تمنع الرفع: كل واحد منها يدل على موضع يُنظر فيه، والحكم لمن يراجع. */
'use strict';
const lib = require('./lib');

const fold = (s) => lib.norm(s).replace(/ة/g, 'ه');
const tokset = (s) => new Set(fold(s).split(' ').filter(Boolean));
const cut = (s, n) => { s = lib.ws(s); return s.length > n ? s.slice(0, n) + '…' : s; };
function jaccard(A, B) {
  const small = A.size <= B.size ? A : B, big = small === A ? B : A;
  let inter = 0;
  for (const t of small) if (big.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/* ما يختبره السؤال: العبارة في الصح والخطأ، والسؤال مع جوابه الصحيح في غيره. فيُكشف سؤالان من نوعين يختبران المعلومة نفسها. */
function factText(q) {
  if (q.k === 'mcq' && Array.isArray(q.opts) && Number.isInteger(q.a) && typeof q.opts[q.a] === 'string') return q.q + ' ' + q.opts[q.a];
  if (q.k === 'fill' && typeof q.a === 'string') return String(q.q).replace(/_{4,}/g, ' ' + q.a + ' ');
  return String(q.q || '');
}
/* أسئلة فصل أو أكثر: own يعلّم أسئلة الملف المفحوص */
function questionsOf(chapters, own) {
  const out = [];
  chapters.forEach((ch) => (ch.lessons || []).forEach((l) => (l && Array.isArray(l.objective) ? l.objective : []).forEach((q) => {
    if (q && typeof q.q === 'string' && typeof q.id === 'string') out.push({ id: q.id, lesson: l.id, text: factText(q), own: !!own });
  })));
  return out;
}

/* 1) أسئلة متقاربة: زوج من الأسئلة تتشابه كلماته بقدر الحدّ أو أكثر (فهما سؤال واحد تكرر)،
      أو زوج في الدرس الواحد دون الحدّ بخُمس (فهو معلومة واحدة سُئل عنها مرتين في درسها). لا يُذكر إلا زوج فيه سؤال من الملف المفحوص. */
const SAME_LESSON_MARGIN = 0.2;
function similar(items, threshold, limit) {
  const T = items.map((q) => ({ q, set: tokset(q.text) }));
  const pairs = [];
  for (let i = 0; i < T.length; i++) {
    for (let j = i + 1; j < T.length; j++) {
      const a = T[i], b = T[j];
      if (!a.q.own && !b.q.own) continue;
      const same = a.q.lesson === b.q.lesson;
      const need = (same ? Math.round((threshold - SAME_LESSON_MARGIN) * 1000) / 1000 : threshold) - 1e-9;
      const lo = Math.min(a.set.size, b.set.size), hi = Math.max(a.set.size, b.set.size);
      if (hi < 6 || lo / hi < need) continue;      /* الحد الأعلى للتشابه هو نسبة الحجمين */
      const s = jaccard(a.set, b.set);
      if (s >= need) pairs.push({ s, a: a.q, b: b.q, same });
    }
  }
  pairs.sort((x, y) => y.s - x.s || (x.a.id < y.a.id ? -1 : 1));
  const lines = pairs.slice(0, limit || pairs.length).map((p) => 'similar questions ' + p.s.toFixed(2) + (p.same ? ' (same lesson: one fact asked twice?)' : '') + ': ' + p.a.id + ' ~ ' + p.b.id + ' «' + cut(p.a.text, 70) + '» ~ «' + cut(p.b.text, 70) + '»');
  if (limit && pairs.length > limit) lines.push('… and ' + (pairs.length - limit) + ' more similar pairs');
  return { pairs, lines };
}

/* 2) الجواب الصحيح الأطول: سؤال يتميز صحيحه بطوله، وحصة الأسئلة التي صحيحها أطول خياراتها */
function longest(chapters, share) {
  const clear = [];
  let any = 0, n = 0;
  chapters.forEach((ch) => (ch.lessons || []).forEach((l) => (l && Array.isArray(l.objective) ? l.objective : []).forEach((q) => {
    if (!q || q.k !== 'mcq' || !Array.isArray(q.opts) || q.opts.length < 2 || !q.opts.every((o) => typeof o === 'string') || !Number.isInteger(q.a) || q.a < 0 || q.a >= q.opts.length) return;
    n++;
    const lens = q.opts.map((o) => o.length), mx = Math.max(...lens);
    if (lens[q.a] !== mx || lens.filter((x) => x === mx).length !== 1) return;
    any++;
    if (mx > 1.25 * Math.max(...lens.filter((_, j) => j !== q.a))) clear.push(q.id);
  })));
  const lines = [];
  if (clear.length) lines.push('mcq: the correct option is clearly the longest in ' + clear.length + ' of ' + n + ' (guessable by length): ' + clear.slice(0, 25).join(', ') + (clear.length > 25 ? ' …' : ''));
  if (share && n >= 8 && any / n > share) lines.push('mcq: the correct option is the longest in ' + Math.round(100 * any / n) + '% of the questions (' + any + '/' + n + '; chance is 25%)');
  return { clear, any, n, lines };
}

/* تعريفات الفصول بحسب طريقة المادة: كتل الملخص، أو خانة defs في ملف الفصل */
function defsOf(S, chapters) {
  const out = [];
  chapters.forEach((ch) => {
    if (S.checks.defs === 'summary') (ch.lessons || []).forEach((l) => (l && Array.isArray(l.summary) ? l.summary : []).forEach((b) => {
      if (lib.isDefBlock(b) && lib.isObj(b.def) && typeof b.def.term === 'string') out.push({ term: b.def.term, text: lib.defText(b), where: l.id });
    }));
    else if (S.checks.defs === 'chapter') (Array.isArray(ch.defs) ? ch.defs : []).forEach((d) => {
      if (d && typeof d.term === 'string' && Array.isArray(d.parts)) out.push({ term: d.term, text: d.parts.join(' '), where: ch.id + ' ص ' + d.pg });
    });
  });
  return out;
}
/* 3) تعريفات مكررة: مصطلح واحد عُرّف مرتين، أو نص واحد تحت مصطلحين */
function dupDefs(defs) {
  const lines = [], byTerm = new Map();
  defs.forEach((d) => { const k = fold(d.term); if (!byTerm.has(k)) byTerm.set(k, []); byTerm.get(k).push(d); });
  byTerm.forEach((g) => { if (g.length > 1) lines.push('definition term repeated: «' + cut(g[0].term, 60) + '» in ' + g.map((d) => d.where).join(', ')); });
  const T = defs.map((d) => ({ d, set: tokset(d.text), term: fold(d.term) }));
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
    if (T[i].term === T[j].term || Math.max(T[i].set.size, T[j].set.size) < 4) continue;
    const s = jaccard(T[i].set, T[j].set);
    if (s >= 0.9) lines.push('two definitions share nearly the same text (' + s.toFixed(2) + '): «' + cut(T[i].d.term, 50) + '» (' + T[i].d.where + ') ~ «' + cut(T[j].d.term, 50) + '» (' + T[j].d.where + ')');
  }
  return { lines };
}

module.exports = { fold, factText, questionsOf, similar, longest, defsOf, dupDefs };
