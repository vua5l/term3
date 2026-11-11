#!/usr/bin/env node
/* فحص ملف فصل، لأي مادة.
   الاستعمال: node _tools/common/validate.js <رمز المادة> <ملف الفصل.js> [--pages مجلد العمل] [--range 23-26] [--site]
     --pages  مجلد العمل الذي كتبته pages.js: يُقابَل كل نص منقول بقراءات صفحته الآلية، كشفاً أولياً لا حكماً.
     --range  نطاق معرّفات الدروس المسندة إلى هذا الملف.
     --site   تُقابل أسئلة الملف بأسئلة فصول الموقع المنشورة أيضاً (تنبيه الأسئلة المتقاربة).
   يطبع الأخطاء (تمنع الرفع) والتنبيهات (تُراجَع)، ويخرج برمز 1 إن وُجد خطأ. */
'use strict';
const path = require('path');
const lib = require('./lib');
const notes = require('./warnings');

/* opt: { range: [a, b], work: مجلد العمل (قراءات الصفحات), quiet: بلا تنبيه إلى صفحات لم تُجهَّز, others: فصول أخرى تُقابل بها الأسئلة, noNotes: بلا التنبيهات الثلاثة } */
function validateChapter(S, ch, opt) {
  opt = opt || {};
  const C = S.checks, ETYPES = lib.ETYPES;
  const { isStr, toLatin, norm, pgNums } = lib;
  const errors = [], warns = [];
  const E = (m) => errors.push(m), W = (m) => warns.push(m);
  const range = opt.range || null;
  const OCR = opt.work ? require('./ocrlib') : null, unready = new Set();
  const LEX = new Set();   /* معجم المقابلة: كلمات الدفعة نفسها */
  if (OCR) OCR.words(JSON.stringify(ch)).forEach((t) => { if (t.k === 'ar' && t.w.length > 1) LEX.add(t.w); });

  const chPg = pgNums(ch.pages);
  function checkPg(where, pg) {
    if (pg === undefined) { E(where + ': missing pg'); return; }
    const n = pgNums(pg);
    if (!n) { E(where + ': bad pg format "' + pg + '" (use "127" or "127–128" or "127، 130" with an en dash)'); return; }
    if (/-/.test(pg)) W(where + ': pg uses a hyphen; use the en dash – like the existing files');
    if (chPg) {
      const lo = Math.min(...chPg), hi = Math.max(...chPg);
      if (n.some((x) => x < lo || x > hi)) W(where + ': pg ' + pg + ' outside chapter pages ' + ch.pages);
    }
  }

  /* --- مقابلة المنقول بقراءات صفحته الآلية: كشف أولي لا حكم. الحكم لصورة الصفحة عند المدقق المستقل --- */
  function verbatim(where, text, pg) {
    if (!OCR || !isStr(text)) return;
    const clip = '«' + text.slice(0, 90) + (text.length > 90 ? '…' : '') + '»';
    const r = OCR.checkQuote(S, opt.work, pg, text, LEX);
    if (r.unready) { r.unready.forEach((p) => unready.add(p)); return; }
    if (!r.found) { W(where + ': verbatim text not located in the machine readings of page ' + pg + ' -> check its page number, then its wording against the page image: ' + clip); return; }
    /* يُنبَّه الباني إلى القوي وحده (strong في ocrlib.js). والأرقام والألفاظ الأجنبية تضعف فيها القراءة الآلية: يقابلها المدقق بالصورة */
    const f = r.flags.filter((x) => x.strong && x.k === 'ar');
    if (f.length) W(where + ': verbatim text differs from the machine readings (a first screen, not a verdict) -> look at the page image again: ' + f.slice(0, 5).map(OCR.say).join('؛ ') + (f.length > 5 ? ' …' : '') + ' in ' + clip);
  }

  /* --- التواريخ: تنبيه لمادة تُحذف تواريخها --- */
  const DATE_RE = /(^|[^0-9])(1[0-4]\d\d|1[5-9]\d\d|20[0-4]\d)([^0-9]|$)/;
  const DATE_WORDS = /(القرن|\bعام\s+[0-9٠-٩]|سنة\s+[0-9٠-٩]|[0-9٠-٩]+\s*هـ|[0-9٠-٩]+\s*م\b|ميلادي|هجري)/;
  function scanStrings(where, v) {
    if (typeof v === 'string') {
      const s = toLatin(v);
      if (C.dates === 'warn' && (DATE_RE.test(s) || DATE_WORDS.test(v))) W(where + ': looks like a date (dates are not in the syllabus): «' + v.slice(0, 80) + '»');
      if (/ {2,}/.test(v)) W(where + ': double space');
    } else if (Array.isArray(v)) v.forEach((x, i) => scanStrings(where + '[' + i + ']', x));
    else if (v && typeof v === 'object') Object.keys(v).forEach((k) => { if (k !== 'pg' && k !== 'id') scanStrings(where + '.' + k, v[k]); });
  }

  /* --- الفصل --- */
  const allPending = Array.isArray(ch.lessons) && ch.lessons.length > 0 && ch.lessons.every((l) => l && l.pending === true);
  ['id', 'title', 'name', 'pages'].forEach((k) => { if (!isStr(ch[k])) E('chapter: missing ' + k); });
  if (!/^c\d+$/.test(ch.id || '')) E('chapter id must look like c6');
  if (!Array.isArray(ch.lessons) || !ch.lessons.length) E('chapter: lessons[] missing');
  if (!Array.isArray(ch.tables)) E('chapter: tables[] missing');
  if (!allPending) {   /* فصل كل دروسه معلّقة: مخطط وحده، بلا خريطة ولا ورقة ليلة */
    if (C.map === 'require' && (!ch.map || !isStr(ch.map.t) || !Array.isArray(ch.map.c))) E('chapter: map {t, c[]} missing');
    if (!Array.isArray(ch.night) || !ch.night.length) E('chapter: night[] missing');
  }
  /* الخريطة الذهنية ليست من الأساس: لا تُكتب إلا في مادة اختارها لها صاحب الموقع */
  if (C.map === 'off' && ch.map !== undefined) E('chapter: map is not used for this subject: the mind map is written only when the site owner chose it (checks.map: "require" in the subject settings)');
  if (C.defs === 'summary' && Array.isArray(ch.defs) && ch.defs.length) E('chapter: defs[] is not used for this subject: each definition is written once in the summary (a q block with def and parts)');

  const ids = new Set();
  function uid(where, id, re) {
    if (!isStr(id)) { E(where + ': missing id'); return; }
    if (re && !re.test(id)) E(where + ': id "' + id + '" does not match ' + re);
    if (ids.has(id)) E(where + ': duplicate id ' + id);
    ids.add(id);
  }

  const qTexts = new Map();
  let mcqPos = [0, 0, 0, 0], mcqN = 0, mcqLongest = 0, fillN = 0, tfN = 0, tfTrue = 0, defN = 0;
  const stats = [];
  (ch.lessons || []).forEach((l) => {
    const L = 'lesson ' + (l && l.id);
    uid(L, l.id, /^l\d+$/);
    const n = +String(l.id).slice(1);
    if (range && (n < range[0] || n > range[1])) E(L + ': id outside the assigned range l' + range[0] + '–l' + range[1]);
    if (!isStr(l.title)) E(L + ': missing title');
    if (!isStr(l.pages)) E(L + ': missing pages'); else checkPg(L + '.pages', l.pages);
    if (!Number.isInteger(l.minutes) || l.minutes < 1 || l.minutes > C.minutesMax) E(L + ': minutes must be an integer 1..' + C.minutesMax);
    if (l.pending !== undefined && l.pending !== true) E(L + ': pending must be true when present');
    if (l.pending === true) {   /* درس معلّق بمعرّف محجوز: مخططه وحده */
      const filled = ['summary', 'cards', 'objective', 'essay', 'steps', 'intro'].filter((k) => Array.isArray(l[k]) && l[k].length);
      if (filled.length) E(L + ': a pending lesson has content (' + filled.join(', ') + '); remove pending: true');
      stats.push(l.id + ' ' + l.pages + ' ' + l.minutes + 'min: PENDING — ' + l.title);
      return;
    }
    if (C.intro !== 'off') {
      if (l.intro === undefined) { if (C.intro === 'require') E(L + ': intro[] missing (the simplified opener: 3–5 easy sentences written from the summary only)'); }
      else if (!Array.isArray(l.intro) || l.intro.length < 3 || l.intro.length > 5 || !l.intro.every(isStr)) E(L + ': intro must hold 3–5 sentences');
    }
    ['summary', 'cards', 'objective', 'essay'].forEach((k) => { if (!Array.isArray(l[k])) E(L + ': ' + k + '[] missing'); });
    const SM = l.summary || [], K = l.cards || [], O = l.objective || [], ES = l.essay || [];
    const linked = new Set();
    let lessonDefs = 0;
    SM.forEach((b, i) => {
      const w = L + '.summary[' + i + ']';
      if (!b || !C.blocks.includes(b.t)) { E(w + ': t must be ' + C.blocks.join('|')); return; }
      if (b.t === 'h') { if (!isStr(b.x)) E(w + ': h needs x'); return; }
      if (b.t === 'dr') { if (!isStr(b.x) && !(Array.isArray(b.items) && b.items.every(isStr))) E(w + ': dr needs x or items[]'); return; }
      if (C.defs === 'summary' && lib.isDefBlock(b)) {   /* التعريف: يُكتب هنا مرة واحدة بنص الكتاب مقطّعاً قطعاً */
        const d = b.def;
        if (!lib.isObj(d)) { E(w + ': def must be an object { term, fam, hide }'); return; }
        if (!isStr(d.term) || d.term !== d.term.trim()) E(w + ': def.term missing or padded');
        if (!Array.isArray(b.parts) || b.parts.length < 2 || b.parts.length > 14 || !b.parts.every(isStr)) { E(w + ': a definition needs parts[] (2–14 pieces that join into the book\'s text)'); return; }
        b.parts.forEach((p, j) => { if (p !== p.trim()) E(w + '.parts[' + j + ']: space at an edge «' + p + '»'); else if (/\s{2}/.test(p)) E(w + '.parts[' + j + ']: double space'); });
        ['pre', 'post'].forEach((k) => { if (b[k] !== undefined && (!isStr(b[k]) || b[k] !== b[k].trim())) E(w + ': ' + k + ' must be a trimmed non-empty string when present'); });
        const text = lib.defText(b), full = lib.defFull(b);
        if (b.x !== undefined && b.x !== full) E(w + ': x differs from pre + parts + post (x is derived by merge; delete it or run merge)');
        if (d.hide !== undefined) {
          if (!Array.isArray(d.hide) || !d.hide.every(isStr)) E(w + ': def.hide must be an array of strings');
          else d.hide.forEach((h) => { if (text.indexOf(h) < 0) E(w + ': def.hide «' + h + '» is not in the definition text'); });
        }
        if (d.front !== undefined && !isStr(d.front)) E(w + ': def.front must be a non-empty string when present');
        if (!isStr(d.fam)) W(w + ': no def.fam (family of similar definitions)');
        checkPg(w, b.pg);
        verbatim(w, full, b.pg);
        if (d.card !== undefined) {
          const k = K.find((c) => c && c.id === d.card);
          if (!k) E(w + ': def.card ' + d.card + ' is not among the lesson cards (run merge to derive it)');
          else {
            if (linked.has(d.card)) E(w + ': def.card ' + d.card + ' is linked by two definitions');
            if (k.type !== 'def' || k.bk !== true || k.auto !== true || k.back !== text || k.front !== (d.front || d.term) || k.pg !== b.pg) E(w + ': derived card ' + d.card + ' is out of date with its definition (run merge)');
          }
          linked.add(d.card);
        }
        lessonDefs++; defN++;
        return;
      }
      if (b.t === 'list') {
        if (!isStr(b.lead)) E(w + ': list needs a lead that says what it lists');
        if (!Array.isArray(b.items) || b.items.length < 2 || !b.items.every(isStr)) E(w + ': list needs items[] (2+ strings)');
      } else if (!isStr(b.x)) E(w + ': needs x');
      checkPg(w, b.pg);
      if (b.t === 'q') verbatim(w, b.x, b.pg);
    });
    K.forEach((k, i) => {
      const w = L + '.cards[' + i + ']';
      uid(w, k.id, new RegExp('^' + l.id + 'k\\d+$'));
      if (!isStr(k.front)) E(w + ': missing front');
      if (k.type === 'def') {
        if (!isStr(k.back)) E(w + ': def needs back');
        if (typeof k.bk !== 'boolean') E(w + ': def needs bk true|false');
        if (k.bk) verbatim(w, k.back, k.pg);
        if (C.defs === 'summary') {
          if (k.auto === true) { if (!linked.has(k.id)) E(w + ': derived card ' + k.id + ' has no definition in the summary (run merge to remove it)'); }
          else if (k.bk === true) E(w + ': a card holding the book\'s exact definition is derived, not written: write the definition once in the summary (q block with def and parts) and delete this card');
        }
      } else if (k.type === 'count') {
        if (!Array.isArray(k.items) || !k.items.every(isStr)) E(w + ': count needs items[]');
        else if (k.n !== k.items.length) E(w + ': n (' + k.n + ') != items.length (' + k.items.length + ')');
        if (!isStr(k.lead)) E(w + ': count needs lead');
      } else if (k.type === 'rule') {
        if (!isStr(k.rule) || !isStr(k.exc)) E(w + ': rule needs rule and exc');
      } else E(w + ': type must be def|count|rule');
      checkPg(w, k.pg);
    });
    O.forEach((q, i) => {
      const w = L + '.objective[' + i + '] ' + (q && q.id);
      uid(w, q.id, new RegExp('^' + l.id + 'o\\d+$'));
      if (!isStr(q.q)) E(w + ': missing q');
      if (!isStr(q.why)) E(w + ': missing why');
      const key = norm(q.q);
      if (qTexts.has(key)) E(w + ': duplicate question text (also ' + qTexts.get(key) + ')'); else qTexts.set(key, q.id);
      if (C.exp && q.exp !== undefined && q.exp !== 1) E(w + ': exp must be 1 when present');
      if (q.k === 'tf') {
        tfN++; if (q.a === true) tfTrue++; if (typeof q.a !== 'boolean') E(w + ': tf needs a true|false');
        if (C.errorTypes) {
          if (q.a === false && !ETYPES.includes(q.e)) E(w + ': a false statement needs e (its error type), one of: ' + ETYPES.join(' | '));
          if (q.a === true && q.e !== undefined) E(w + ': a true statement has no e');
        }
      }
      else if (q.k === 'mcq') {
        mcqN++;
        if (!Array.isArray(q.opts) || q.opts.length !== 4 || !q.opts.every(isStr)) E(w + ': mcq needs 4 opts');
        else {
          if (new Set(q.opts.map(norm)).size !== 4) E(w + ': mcq opts not unique');
          if (!Number.isInteger(q.a) || q.a < 0 || q.a > 3) E(w + ': mcq a must be 0..3');
          else {
            mcqPos[q.a]++;
            if (C.errorTypes) {
              if (!Array.isArray(q.e) || q.e.length !== 4) E(w + ': mcq needs e[4] (null for the correct option, an error type for each wrong one)');
              else q.e.forEach((t, j) => { if (j === q.a ? t !== null : !ETYPES.includes(t)) E(w + ': e[' + j + '] ' + (j === q.a ? 'must be null (correct option)' : 'must be an error type')); });
            }
            const lens = q.opts.map((o) => o.length), mx = Math.max(...lens);
            if (lens[q.a] === mx && lens.filter((x) => x === mx).length === 1 && mx > 1.25 * Math.max(...lens.filter((_, j) => j !== q.a))) mcqLongest++;
          }
        }
      } else if (q.k === 'fill') {
        fillN++;
        if (!/_{4}/.test(q.q || '')) E(w + ': fill q needs a blank ____');
        if (!isStr(q.a)) E(w + ': fill needs a');
        if (!Array.isArray(q.opts) || q.opts.length !== 4 || !q.opts.includes(q.a)) E(w + ': fill needs 4 opts including a');
        else if (new Set(q.opts.map(norm)).size !== 4) E(w + ': fill opts not unique');
        else if (C.errorTypes) {
          if (!Array.isArray(q.e) || q.e.length !== 4) E(w + ': fill needs e[4] aligned with opts (null for the answer)');
          else q.e.forEach((t, j) => { const right = q.opts[j] === q.a; if (right ? t !== null : !ETYPES.includes(t)) E(w + ': e[' + j + '] ' + (right ? 'must be null (the answer)' : 'must be an error type')); });
        }
      } else E(w + ': k must be tf|mcq|fill');
      checkPg(w, q.pg);
    });
    ES.forEach((e, i) => {
      const w = L + '.essay[' + i + ']';
      uid(w, e.id, new RegExp('^' + l.id + 'e\\d+$'));
      if (!isStr(e.q)) E(w + ': missing q');
      if (C.exp && e.exp !== undefined && e.exp !== 1) E(w + ': exp must be 1 when present');
      checkPg(w, e.pg);
      if (!Array.isArray(e.points) || e.points.length < 2) E(w + ': needs points[] (2+)');
      else e.points.forEach((p, j) => { if (!isStr(p.x)) E(w + '.points[' + j + ']: missing x'); checkPg(w + '.points[' + j + ']', p.pg); });
    });
    if (C.steps) {
      (Array.isArray(l.steps) ? l.steps : []).forEach((st, i) => {
        const w = L + '.steps[' + i + ']';
        uid(w, st.id, new RegExp('^' + l.id + 's\\d+$'));
        if (!isStr(st.title)) E(w + ': missing title');
        if (!Array.isArray(st.items) || st.items.length < 3 || !st.items.every(isStr)) E(w + ': steps need items[] (3+ strings in the book order)');
        checkPg(w, st.pg);
      });
      if (l.steps !== undefined && !Array.isArray(l.steps)) E(L + ': steps must be an array');
    }
    const M = C.mix;
    if (K.length < M.cardsMin) W(L + ': only ' + K.length + ' cards');
    if (O.length < M.objectiveMin) W(L + ': only ' + O.length + ' objective questions');
    const tfShare = O.length ? O.filter((q) => q.k === 'tf').length / O.length : 0;
    if (M.tfMinShare && O.length && tfShare < M.tfMinShare) W(L + ': true/false is ' + Math.round(tfShare * 100) + '% of the objective questions; the exam favours it' + (M.tfAim ? ' (aim for ' + M.tfAim + ')' : ''));
    if (M.mcqMaxPerLesson && O.filter((q) => q.k === 'mcq').length > M.mcqMaxPerLesson) W(L + ': more than ' + M.mcqMaxPerLesson + ' multiple-choice questions; keep them for confusable terms only');
    if (ES.length < M.essayMin) W(L + (M.essayMin === 1 ? ': no essay question' : ': fewer than ' + M.essayMin + ' essay questions'));
    stats.push(l.id + ' ' + l.pages + ' ' + l.minutes + 'min: summary ' + SM.length + ', cards ' + K.length + ', objective ' + O.length + ' (tf ' + O.filter((q) => q.k === 'tf').length + ' mcq ' + O.filter((q) => q.k === 'mcq').length + ' fill ' + O.filter((q) => q.k === 'fill').length + '), essay ' + ES.length + (C.defs === 'summary' ? ', defs ' + lessonDefs : '') + ' — ' + l.title);
  });

  (ch.tables || []).forEach((t, i) => {
    const w = 'tables[' + i + '] ' + (t && t.id);
    uid(w, t.id, new RegExp('^' + ch.id + 't\\d+$'));
    if (!isStr(t.title)) E(w + ': missing title');
    if (!Array.isArray(t.cols) || t.cols.length < 3) E(w + ': cols[] needs 3+ (first is «وجه المقارنة»)');
    else if (t.cols[0] !== 'وجه المقارنة') W(w + ': first column is usually «وجه المقارنة»');
    if (!Array.isArray(t.rows) || !t.rows.length) E(w + ': rows[] missing');
    else t.rows.forEach((r, j) => { if (!Array.isArray(r) || r.length !== (t.cols || []).length) E(w + '.rows[' + j + ']: length != cols'); });
    if (!isStr(t.core)) E(w + ': missing core (الفرق الجوهري)');
    checkPg(w, t.pg);
  });
  if (C.defs === 'chapter') {
    (Array.isArray(ch.defs) ? ch.defs : []).forEach((d, i) => {
      const w = 'defs[' + i + '] ' + (d && d.term);
      if (!isStr(d.term)) E(w + ': missing term');
      if (!Array.isArray(d.parts) || d.parts.length < 2 || d.parts.length > 14 || !d.parts.every(isStr)) E(w + ': parts[] must hold 2–14 pieces');
      else verbatim(w, d.parts.join(' '), d.pg);
      if (d.hide !== undefined && (!Array.isArray(d.hide) || !d.hide.every(isStr))) E(w + ': hide must be an array of strings');
      if (!isStr(d.fam)) W(w + ': no fam (family of similar definitions)');
      checkPg(w, d.pg);
    });
    if (ch.defs !== undefined && !Array.isArray(ch.defs)) E('chapter: defs must be an array');
  }
  function walk(n, w) {
    if (!n || !isStr(n.t)) { E(w + ': map node needs t'); return; }
    if (n.pg !== undefined) checkPg(w, n.pg);
    if (n.c !== undefined) { if (!Array.isArray(n.c)) E(w + ': c must be an array'); else n.c.forEach((x, i) => walk(x, w + '.c[' + i + ']')); }
  }
  if (C.map === 'require' && ch.map) walk(ch.map, 'map');
  (ch.night || []).forEach((x, i) => { if (!x || !isStr(x.x)) E('night[' + i + ']: needs x'); else checkPg('night[' + i + ']', x.pg); });

  scanStrings('chapter', ch);

  /* --- التنبيهات الثلاثة (البوابة تجريها مرة على الموقع كله، فتطفئها هنا بـ noNotes) --- */
  if (opt.noNotes) { /* لا شيء */ }
  else if (C.similar) {
    const items = notes.questionsOf([ch], true).concat(notes.questionsOf((opt.others || []).filter((c) => c && c.id !== ch.id), false));
    notes.similar(items, C.similar, 12).lines.forEach(W);
  }
  if (!opt.noNotes && C.longest) notes.longest([ch], C.longest).lines.forEach(W);
  if (!opt.noNotes && C.dupDefs) notes.dupDefs(notes.defsOf(S, [ch])).lines.forEach(W);

  if (unready.size && !opt.quiet) W('verbatim texts were not matched on page(s) not prepared in the work dir: ' + Array.from(unready).sort((x, y) => x - y).join(', '));

  const lines = [];
  lines.push('== ' + ch.id + ' ' + ch.name + ' (' + ch.pages + ')');
  stats.forEach((s) => lines.push('  ' + s));
  lines.push('  tables ' + (ch.tables || []).length + ', night ' + (ch.night || []).length + (C.defs === 'summary' ? ', defs ' + defN : ''));
  lines.push('  tf true/false: ' + tfTrue + '/' + (tfN - tfTrue) + ' · mcq answer positions [a=0..3]: ' + mcqPos.join(' ') + ' · mcq where the correct option is clearly the longest: ' + mcqLongest + '/' + mcqN + ' · fill ' + fillN);
  if (warns.length) { lines.push('\nWARNINGS (' + warns.length + '):'); warns.forEach((w) => lines.push('  - ' + w)); }
  if (errors.length) { lines.push('\nERRORS (' + errors.length + '):'); errors.forEach((e) => lines.push('  - ' + e)); }
  else lines.push('\nOK: no errors.');
  return { errors, warns, lines };
}

/* يحمّل ملف الفصل ثم يفحصه. يعيد { errors, warns, lines } أو { fatal } إن لم يُحمَّل الملف. */
function validateFile(S, file, opt) {
  let ch;
  try { ch = lib.loadChapter(S, file); }
  catch (e) { return { fatal: e.shape ? 'ERROR: ' + e.message : 'ERROR: file does not run: ' + e.message }; }
  return validateChapter(S, ch, opt);
}

if (require.main === module) {
  const { rest, flags } = lib.args(process.argv.slice(2), { range: 1, site: 0, pages: 1 });
  const [code, file, ...more] = rest;
  if (!code || !file || more.length) lib.die('usage: node validate.js <subject> chapter.js [--pages work-dir] [--range 23-26] [--site]' + (more.length ? '\n  text files are no longer read: verbatim texts are matched against the machine readings of their pages (--pages)' : ''));
  const S = lib.loadSubject(code);
  const opt = {};
  if (flags.range) opt.range = flags.range.split('-').map(Number);
  if (flags.pages) { opt.work = path.resolve(flags.pages); if (!require('fs').existsSync(opt.work)) lib.die('--pages: not found: ' + flags.pages); }
  if (flags.site) { try { opt.others = lib.loadSite(S).chapters; } catch (e) { lib.die('ERROR: --site: ' + e.message, 1); } }
  const res = validateFile(S, file, opt);
  if (res.fatal) lib.die(res.fatal, 1);
  console.log(res.lines.join('\n'));
  process.exit(res.errors.length ? 1 : 0);
}

module.exports = { validateChapter, validateFile };
