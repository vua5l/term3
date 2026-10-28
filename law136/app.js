/* القانون الدستوري (law136): منطق الموقع كله، ولا بيانات فيه ولا موعد.
   - المحتوى من data/*.js (window.LAW136.chapters) بترتيب config.js، والحفظ كله عبر store.js.
   - الموعد ومهام كل يوم من ../schedule.js وحده (term3Schedule)، وبه يُسجَّل الإنجاز والمستوى.
   أين تجد الأدوات:
   الجدول: initSchedule، onInfo، schDone، schUndo، markLearned، sendLevel.
   الرئيسة: homeHTML، heroHTML، levelsHTML، todayBlock، taskRow، smallRow، startSmall. الخطة: planHTML.
   الدرس وتسميع الخروج: lessonHTML، summaryHTML، exitCard، finishQuiz (الوضع exit).
   مهام الجدول: recallHTML، reviewHTML، eveHTML. البطاقات: deckHTML، cardsBrowser.
   البنك: objSetup، bankPick، bankMark، closeRound. المقالي: essaySetup، essayMessage، newEssaysRequest.
   دفتر الأخطاء: record، nbHTML. المستوى: statsFor، level. الجداول: cmpHTML، fitTables.
   الخرائط: openMap، drawEdges، mapFit. الإعدادات: openSettings. التنقل: parseHash، route. */
(function () {
'use strict';
var CFG = window.LAW136_CONFIG || {};
var CODE = CFG.code || 'law136';
var ST = window.Law136Store;
var S = ST.state();
var SCH = window.term3Schedule || null;
var INFO = null;
var view = document.getElementById('view');
var body = document.body;

/* ---------- أدوات ---------- */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
/* ما بين «» في النصوص يُعرض بخط الكتاب */
function rich(s) { return esc(s).replace(/«([^«»]+)»/g, '«<span class="q-in">$1</span>»'); }
function pg(p) { return p ? '<span class="chip pg">ص ' + esc(p) + '</span>' : ''; }
function expChip(x) { return x && x.exp === true ? '<span class="chip exp">متوقع</span>' : ''; }
function arr(x) { return Array.isArray(x) ? x : []; }
function num(id) { return +String(id == null ? '' : id).replace(/\D/g, '') || 0; }
function now() { return Date.now(); }
function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
var TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
var GO = '<svg class="t-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
var BOLT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 3 5 14h6l-1 7 8-11h-6z"/></svg>';
var FIT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
var CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

/* الأعداد على قواعد العربية: [واحد، اثنان، من 3 إلى 10، من 11 فأكثر، اثنان بعد «من»] */
var W = {
  les: ['درس واحد', 'درسان', 'دروس', 'درساً', 'درسين', 'لا دروس'],
  q: ['سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالاً', 'سؤالين', 'لا أسئلة'],
  ess: ['سؤال مقالي واحد', 'سؤالان مقاليان', 'أسئلة مقالية', 'سؤالاً مقالياً', 'سؤالين مقاليين', 'لا أسئلة مقالية'],
  card: ['بطاقة واحدة', 'بطاقتان', 'بطاقات', 'بطاقة', 'بطاقتين', 'لا بطاقات'],
  ans: ['إجابة واحدة', 'إجابتان', 'إجابات', 'إجابة', 'إجابتين', 'لا إجابات'],
  day: ['يوم واحد', 'يومان', 'أيام', 'يوماً', 'يومين', 'لا أيام']
};
function countWord(n, f, gen) {
  n = Math.round(+n || 0);
  if (n === 0) return f[5];
  if (n === 1) return f[0];
  if (n === 2) return gen ? f[4] : f[1];
  var r = n % 100; return n + ' ' + (r >= 3 && r <= 10 ? f[2] : f[3]);
}
function minutesText(m) {
  m = Math.round(+m || 0); if (m < 1) return '';
  if (m === 1) return 'دقيقة'; if (m === 2) return 'دقيقتان';
  var r = m % 100; return m + ' ' + (r >= 3 && r <= 10 ? 'دقائق' : 'دقيقة');
}

/* ---------- المحتوى: الفصول بترتيب config.js، ثم الدروس والبطاقات والأسئلة بمعرّفاتها ---------- */
var RAW = window.LAW136 && Array.isArray(window.LAW136.chapters) ? window.LAW136.chapters : [];
var CHS = [], CH = {}, LES = [], LBY = {}, Q = {}, QL = [], E = {}, EL = [], K = {}, KL = [], TB = [];
(function build() {
  var byId = {}, ids = [];
  RAW.forEach(function (c) { if (c && c.id && !byId[c.id]) byId[c.id] = c; });
  arr(CFG.chapters).forEach(function (id) { if (byId[id] && ids.indexOf(id) < 0) ids.push(id); });
  RAW.forEach(function (c) { if (c && c.id && ids.indexOf(c.id) < 0) ids.push(c.id); });
  ids.forEach(function (id) {
    var c = byId[id];
    c.n = num(c.id); c.title = c.title || ''; c.name = c.name || c.title || c.id; c.pages = c.pages || '';
    c.lessons = arr(c.lessons); c.tables = arr(c.tables); c.night = arr(c.night);
    c.les = []; c.qs = [];
    CHS.push(c); CH[c.id] = c;
    c.lessons.forEach(function (l) {
      if (!l || !/^l\d+$/.test(l.id || '') || LBY[l.id]) return;
      l.ch = c; l.no = LES.length + 1; l.n = num(l.id); l.title = l.title || l.id; l.pages = l.pages || '';
      l.summary = arr(l.summary); l.cards = arr(l.cards); l.objective = arr(l.objective); l.essay = arr(l.essay);
      LES.push(l); LBY[l.id] = l; c.les.push(l);
      l.cards = l.cards.filter(function (k) { if (!k || !k.id || K[k.id]) return false; k.les = l; k.ch = c; K[k.id] = k; KL.push(k); return true; });
      l.objective = l.objective.filter(function (q) {
        if (!q || !q.id || Q[q.id] || !q.q) return false;
        if ((q.k === 'mcq' || q.k === 'fill') && arr(q.opts).length < 2) return false;
        if (q.k !== 'tf' && q.k !== 'mcq' && q.k !== 'fill') return false;
        q.les = l; q.ch = c; Q[q.id] = q; QL.push(q); c.qs.push(q); return true;
      });
      l.essay = l.essay.filter(function (e) { if (!e || !e.id || E[e.id] || !e.q) return false; e.les = l; e.ch = c; e.points = arr(e.points); E[e.id] = e; EL.push(e); return true; });
    });
    c.tables = c.tables.filter(function (t) { if (!t || !t.id || !arr(t.cols).length) return false; t.ch = c; TB.push(t); return true; });
    c.night = c.night.filter(function (x) { return x && x.x; });
  });
})();
function chLabel(c) { return c ? (c.title ? c.title + ': ' : '') + c.name : ''; }
function chShort(c) { return String(c.title || c.id).replace(/^الفصل\s+/, '') || c.title; }
function chBar(act, cur, withAll, extra) {
  return '<div class="chapter-bar" role="group" aria-label="الفصول"><span class="bar-l" aria-hidden="true">الفصل</span>' +
    (withAll ? '<button type="button" data-act="' + act + '" data-ch="all" aria-pressed="' + (cur === 'all') + '">الكل</button>' : '') +
    CHS.map(function (x) { return '<button type="button" data-act="' + act + '" data-ch="' + x.id + '" aria-pressed="' + (cur === x.id) + '" aria-label="' + esc(x.title + ': ' + x.name) + '">' + esc(chShort(x)) + (extra ? extra(x) : '') + '</button>'; }).join('') + '</div>';
}
function hasMap(c) { return !!(c && c.map && typeof c.map === 'object' && typeof c.map.t === 'string' && c.map.t.trim() && c.map.t.indexOf('__') < 0); }
function lesByN(n) { return LBY['l' + n] || null; }

/* ---------- التواريخ: كلها من موعد الجدول، واليوم من todayISO في schedule.js ---------- */
var AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
var AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
function isoOf(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
/* بلا ملف الجدول أصلاً: القاعدة نفسها، فاليوم يبدأ في السابعة صباحاً */
function fallbackISO() { var d = new Date(); if (d.getHours() < 7) d.setDate(d.getDate() - 1); return isoOf(d); }
function todayISO() { try { if (SCH && SCH.todayISO) return SCH.todayISO(); } catch (e) {} return fallbackISO(); }
function dOf(s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function addDays(s, n) { var d = dOf(s); d.setDate(d.getDate() + n); return isoOf(d); }
function dayLabel(s) { var d = dOf(s); return AR_DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + AR_MONTHS[d.getMonth()]; }
function dayName(s) { return AR_DAYS[dOf(s).getDay()]; }
function diffDays(a, b) { return Math.round((dOf(b) - dOf(a)) / 86400000); }
function examISO() { return (INFO && INFO.exam && INFO.exam.date) || null; }
function tentative() { return !!(INFO && INFO.exam && INFO.exam.tentative); }
function daysLeft() { var e = examISO(); return e ? diffDays(todayISO(), e) : null; }
function examLabel() { var e = examISO(); return e ? dayLabel(e) + (tentative() ? ' · موعد مبدئي' : '') : 'يصل من الجدول'; }

/* ---------- الربط بالجدول ---------- */
function gotSchedule(i) { return !!(i && i.all && i.all.exams && i.all.exams.length); }
function refreshInfo() { if (!SCH) return; try { var c = SCH.cached(CODE); if (gotSchedule(c)) INFO = c; } catch (e) {} }
function passes(id) { var p = INFO && INFO.passes && INFO.passes[id]; return Array.isArray(p) ? p.slice() : []; }
function passedToday(id) { return passes(id).indexOf(todayISO()) > -1; }
function learnedMark(id) { var x = S.learn[id]; return !!(x && x.v); }
function learned(id) { return learnedMark(id) || passes(id).length > 0; }
function schDone(id, kind) { if (!SCH) return; try { SCH.done(CODE, id, kind); } catch (e) {} refreshInfo(); }
function schUndo(id) { if (!SCH) return; try { SCH.undo(CODE, id); } catch (e) {} refreshInfo(); }
function markLearned(id) { S.learn[id] = { v: 1, t: now() }; ST.save(); if (!passedToday(id)) schDone(id, 'learn'); }
function unmarkLearned(id) { S.learn[id] = { v: 0, t: now() }; ST.save(); if (passedToday(id)) schUndo(id); }
function calibFactor() { var c = INFO && INFO.all && INFO.all.calib && INFO.all.calib[CODE]; return c && +c.factor > 0 ? +c.factor : 1; }
function lesMin(l) { return Math.max(1, Math.round((+l.minutes || 1) * calibFactor())); }
function taskMin(k) { return +k.minutes > 0 ? +k.minutes : Math.round((+k.units || 0) * 25); }
function todayTask(lid) { var t = INFO && INFO.today || [], i; for (i = 0; i < t.length; i++) if (t[i].lesson === lid) return t[i]; return null; }
function busy() { return (screen === 'quiz' && quiz && quiz.i < quiz.ids.length) || (screen === 'deck' && DECK && DECK.i < DECK.ids.length); }
function onInfo(info) { if (!gotSchedule(info)) return; INFO = info; if (!busy()) render(); else updateBadge(); }
function initSchedule() {
  if (!SCH) return;
  refreshInfo();
  try { SCH.load(CODE).then(onInfo, function () {}); } catch (e) {}
  try { SCH.onChange(function () { try { onInfo(SCH.cached(CODE)); } catch (e) {} }); } catch (e) {}
}
var lvlT = null;
function sendLevel() {
  if (!SCH) return; clearTimeout(lvlT);
  lvlT = setTimeout(function () { var st = statsFor(null); if (!st.n) return; try { SCH.level(CODE, 100 * st.c / st.n, st.n); } catch (e) {} }, 900);
}

/* ---------- الإجابات ودفتر الأخطاء: يخرج السؤال بإجابتين صحيحتين في يومين مختلفين ---------- */
function inNb(id) { var r = S.q[id]; return !!(r && r.m); }
function record(id, ok) {
  var r = S.q[id] || {}, t = todayISO(), was = !!r.m, res = { out: false, same: false, inNb: false, enter: false };
  r = { n: (+r.n || 0) + 1, c: (+r.c || 0) + (ok ? 1 : 0), m: was ? 1 : 0, s: +r.s || 0, d: r.d || '', t: now() };
  if (ok) {
    if (r.m) {
      if (r.d === t) { res.same = true; res.inNb = true; }
      else { r.s += 1; r.d = t; if (r.s >= 2) { r.m = 0; r.s = 0; r.d = ''; res.out = true; } else res.inNb = true; }
    }
  } else { res.enter = !was; r.m = 1; r.s = 0; r.d = ''; res.inNb = true; }
  if (!r.d) delete r.d;
  S.q[id] = r;
  bankMark(id, ok);
  ST.save(); updateBadge(); sendLevel();
  return res;
}
function nbNote(res, ok) {
  if (!res) return '';
  var t = res.out ? 'وخرج من دفتر الأخطاء بعد إجابتين صحيحتين في يومين مختلفين.'
    : (!ok ? (res.enter ? 'ودخل دفتر الأخطاء، ويخرج منه بإجابتين صحيحتين في يومين مختلفين.' : 'وبقي في دفتر الأخطاء، وبدأ عدّ خروجه من جديد.')
    : (res.same ? 'أجبت عنه صحيحاً اليوم من قبل، والإجابة التالية تُحسب في يوم آخر.'
    : (res.inNb ? 'بقيت إجابة صحيحة في يوم آخر ليخرج من دفتر الأخطاء.' : '')));
  return t ? '<p class="nb-note">' + t + '</p>' : '';
}
function mistakes(chId) { return QL.filter(function (q) { return inNb(q.id) && (!chId || q.ch.id === chId); }); }
function updateBadge() {
  var n = mistakes().length, b = document.getElementById('mistakesBadge'), btn = document.getElementById('mistakesBtn');
  b.textContent = n; b.hidden = n === 0;
  btn.setAttribute('aria-label', 'دفتر الأخطاء' + (n ? ': ' + countWord(n, W.q) : ''));
}

/* ---------- المستوى: نسبة الصواب في كل فصل، ولا يُقاس قبل عشر إجابات، ولا يغيّر الخطة ---------- */
function statsFor(chId) {
  var n = 0, c = 0;
  QL.forEach(function (q) { if (chId && q.ch.id !== chId) return; var r = S.q[q.id]; if (r) { n += +r.n || 0; c += +r.c || 0; } });
  return { n: n, c: c, pct: n ? Math.round(100 * c / n) : null };
}
function level(st) {
  if (!st || st.n < 10) return { k: 'none', label: 'لم يُقَس بعد' };
  if (st.pct >= 85) return { k: 'top', label: 'ممتاز' };
  if (st.pct >= 60) return { k: 'mid', label: 'جيد' };
  return { k: 'low', label: 'ضعيف' };
}
/* أسئلة الدفتر أولاً، ثم ما لم يُسأل عنه، ثم الأضعف */
function weight(q) { var r = S.q[q.id]; if (!r) return 1; if (r.m) return 0; return 2 + (r.n ? r.c / r.n : 0); }
function prioritized(qs) { return shuffle(qs).sort(function (a, b) { return weight(a) - weight(b); }); }

/* ---------- جولات البنك: كل سؤال أُجيب عنه في أي موضع يُحسب محلولاً في جولة فصله ---------- */
var roundNotes = [];
function bankOf(chId) {
  var b = S.bank[chId];
  if (!b || typeof b !== 'object') b = {};
  return { r: +b.r || 1, cur: b.cur && typeof b.cur === 'object' ? b.cur : {}, prev: b.prev && typeof b.prev === 'object' ? b.prev : {}, last: b.last || null, t: +b.t || 0 };
}
function bankSolved(c) { var b = bankOf(c.id), n = 0; c.qs.forEach(function (q) { if (q.id in b.cur) n++; }); return n; }
function bankMark(id, ok) {
  var q = Q[id]; if (!q) return;
  var c = q.ch, b = bankOf(c.id), v = ok ? 1 : 0;
  b.cur[id] = (id in b.cur) ? Math.min(+b.cur[id] || 0, v) : v; b.t = now();
  S.bank[c.id] = b;
  if (c.qs.length && c.qs.every(function (x) { return x.id in b.cur; })) closeRound(c, false);
}
function closeRound(c, early) {
  var b = bankOf(c.id), n = 0, ok = 0;
  c.qs.forEach(function (q) { if (q.id in b.cur) { n++; if (+b.cur[q.id]) ok++; } });
  b.last = { r: b.r, ok: ok, n: n, total: c.qs.length, early: !!early, seen: !!early, t: now() };
  b.prev = Object.assign({}, b.prev, b.cur); b.cur = {}; b.r += 1; b.t = now();
  S.bank[c.id] = b;
  if (!early) roundNotes.push(c.id);
}
function roundText(c) {
  var b = bankOf(c.id), x = b.last; if (!x) return '';
  return 'أتممت الجولة ' + x.r + ' في ' + c.title + ': ' + x.ok + ' صحيحة من ' + x.n + ' (' + (x.n ? Math.round(100 * x.ok / x.n) : 0) + '%)، وبدأت الجولة ' + b.r + '، ويُقدَّم فيها ما أخطأت فيه.';
}
/* العشرة والعشرون: ما لم يُحلّ في الجولة (وأوله ما أُخطئ فيه في الجولة السابقة)، ثم ما أُخطئ فيه، ثم البقية */
function bankPick(chIds, count) {
  var pool = [];
  chIds.forEach(function (id) { if (CH[id]) pool = pool.concat(CH[id].qs); });
  if (!count) return shuffle(pool).map(function (q) { return q.id; });
  var tiers = [[], [], [], [], []];
  shuffle(pool).forEach(function (q) {
    var b = bankOf(q.ch.id), inCur = q.id in b.cur, pw = (q.id in b.prev) && !+b.prev[q.id], t;
    if (!inCur) t = pw ? 0 : 1; else if (!+b.cur[q.id]) t = 2; else t = pw ? 3 : 4;
    tiers[t].push(q);
  });
  return tiers[0].concat(tiers[1], tiers[2], tiers[3], tiers[4]).slice(0, count).map(function (q) { return q.id; });
}

/* ---------- تسميع الخروج: أسئلة الدرس الموضوعية كلها، والنجاح بـ75%، ولا يُعاد في يوم المحاولة ---------- */
var PASS = 75;
function exitNeeded(l) { return !!(l && l.objective.length); }
function exitPassed(lid) { var x = S.exit[lid]; return !!(x && x.pass); }
function exitFlag(l) { return learned(l.id) && exitNeeded(l) && !exitPassed(l.id); }
function exitRunning(lid) { return !!(quiz && quiz.mode === 'exit' && quiz.les === lid && !quiz.fin && quiz.i < quiz.ids.length); }
function exitBlocked(lid) { var x = S.exit[lid]; return !!(x && !x.pass && x.day === todayISO()) && !exitRunning(lid); }
function saveExit(lid, pct, via) {
  var x = S.exit[lid] || {};
  if (via === 'recall' && pct < PASS) return false;
  S.exit[lid] = { pass: !!x.pass || pct >= PASS, pct: pct, best: Math.max(+x.best || 0, pct), day: todayISO(), via: via, t: now() };
  ST.save();
  return pct >= PASS && !x.pass;
}
function flagHTML(l) { return exitFlag(l) ? '<span class="flag">ينقصه تسميع الخروج</span>' : ''; }

/* ---------- تنبيه قصير، ونسخ ---------- */
var toastEl = document.getElementById('toast'), toastT = null;
function toast(msg) { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { toastEl.hidden = true; }, 2800); }
function copyText(txt, msg) {
  function fallback() {
    var ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(msg); } catch (e) { toast('تعذّر النسخ، فانسخ الرسالة من مربعها'); }
    ta.remove();
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { toast(msg); }, fallback);
    else fallback();
  } catch (e) { fallback(); }
}

/* ---------- الاختبار المقالي: رسالة واحدة جاهزة تُلصق في محادثة جديدة داخل مشروع المادة ---------- */
var STRUCT = 'تعريف ← شروط أو أركان ← القاعدة ← الاستثناءات ← مثال ← خاتمة';
function subjLine() { return 'مادة ' + (CFG.name || 'القانون الدستوري') + (CFG.exam ? ' (' + CFG.exam + ')' : ''); }
function bookLine() { return CFG.book ? 'كتاب «' + CFG.book + '» في ملفات هذا المشروع' : 'الكتاب المقرر في ملفات هذا المشروع'; }
function pagesNote() {
  var o = +CFG.pdfOffset;
  return 'أرقام الصفحات أرقام الكتاب المطبوع' + (o ? '. وإن كان ملف الكتاب في المشروع مصوَّراً فصفحة الكتاب س تقع في صفحة الملف س − ' + o + '؛ فتحقق من الرقم المطبوع على الصفحة' : '') + '.';
}
function lesLine(l) { return 'الدرس ' + l.no + ': ' + l.title + ' (ص ' + l.pages + ')'; }
function pickedLessons() { return LES.filter(function (l) { return essaySel[l.id]; }); }
function essayMessage(ls) {
  var qs = []; ls.forEach(function (l) { qs = qs.concat(l.essay); });
  var out = [
    'اختبرني اختباراً مقالياً في ' + subjLine() + '، من ' + bookLine() + '.',
    'الدروس المختارة: ' + ls.map(lesLine).join('، ') + '.',
    '',
    'طريقة الاختبار:',
    '1. اسألني أولاً كم سؤالاً أريد من الأسئلة أدناه، وعددها ' + countWord(qs.length, W.q) + '، ونتفق على العدد قبل أن تبدأ.',
    '2. اخلط الأسئلة، ولا تتقيد بترتيبها في هذه الرسالة ولا بترتيب الدروس أو الفصول.',
    '3. أرسل ثلاثة أسئلة في رسالة واحدة دون أن تكشف نقاطها، فأجيب عنها في رسالة واحدة، فتصحّحها معاً، ثم ترسل الثلاثة التالية حتى يتم العدد المتفق عليه، وإن بقي أقل من ثلاثة فأرسل ما بقي.',
    '4. صحّح كل سؤال بهذا الترتيب: السؤال، ثم جوابي كما كتبته، ثم التصحيح (ما أصبت فيه، وما فاتني، وما أخطأت فيه)، ثم الجواب الأفضل الذي كان ينبغي أن أكتبه، على ما يناسب السؤال من هذا الهيكل: ' + STRUCT + '.',
    '5. نقاط الجواب النموذجي أدناه أساس التصحيح ومرجع للمعنى لا للفظ، فاقبل ما أصبت معناه بعبارتي. وعند الشك، أو إن كتبتُ ما ليس في النقاط، فارجع إلى الصفحات المذكورة من الكتاب في ملفات المشروع واحكم بها لا بمعرفتك العامة، وما زدته صحيحاً فنبّه عليه ولا تخطّئه. ولا تقرأ الكتاب كله في هذه الجلسة، بل الصفحات المذكورة وحدها عند الحاجة.',
    '6. ' + pagesNote(),
    '',
    'الأسئلة ونقاط أجوبتها النموذجية، مرتبة على ترتيب الدروس (لا تكشف النقاط لي):'
  ];
  var k = 0;
  ls.forEach(function (l) {
    if (!l.essay.length) return;
    out.push('', '[' + lesLine(l) + ']');
    l.essay.forEach(function (e) {
      k++;
      out.push('السؤال ' + k + ' (ص ' + (e.pg || l.pages) + '): ' + e.q);
      out.push('نقاط الجواب النموذجي:');
      e.points.forEach(function (p) { out.push('- ' + p.x + (p.pg ? ' (ص ' + p.pg + ')' : '')); });
    });
  });
  return out.join('\n');
}
function newEssaysRequest(ls) {
  var have = []; ls.forEach(function (l) { l.essay.forEach(function (e) { have.push('- ' + e.q); }); });
  var out = [
    'أريد أسئلة مقالية جديدة في ' + subjLine() + '، من ' + bookLine() + '، في هذه الدروس وصفحاتها:'
  ].concat(ls.map(function (l) { return '- ' + lesLine(l); }), [
    '',
    'اكتب أسئلة جديدة من صفحات هذه الدروس في الكتاب وحدها، لا من معرفتك العامة، ونوّع بين التعريف والشروط والمقارنة والتعليل والتطبيق، ولا تكرر ما عندي:'
  ], have.length ? have : ['- لا أسئلة عندي في هذه الدروس بعد.'], [
    '',
    'ولكل سؤال صفحاته ونقاط جوابه النموذجي من الكتاب بصفحاتها، على ما يناسبه من هذا الهيكل: ' + STRUCT + '.',
    'ثم اختبرني فيها: اسألني أولاً كم سؤالاً أريد ونتفق على العدد، ثم أرسل ثلاثة أسئلة في رسالة واحدة دون أن تكشف نقاطها، فأجيب عنها معاً، فتصحّح كل سؤال بهذا الترتيب: السؤال، ثم جوابي كما كتبته، ثم التصحيح (ما أصبت وما فاتني وما أخطأت فيه)، ثم الجواب الأفضل على الهيكل، ثم الثلاثة التالية حتى يتم العدد.',
    'والنقاط مرجع للمعنى لا للفظ، فاقبل ما أصبت معناه بعبارتي، وما زدته صحيحاً فنبّه عليه ولا تخطّئه، وعند الشك فاحكم بالصفحات المذكورة من الكتاب. ولا تقرأ الكتاب كله، بل صفحات هذه الدروس وحدها.',
    pagesNote()
  ]);
  return out.join('\n');
}

/* ---------- الحالة والعرض ---------- */
var screen = 'home', arg = null;
var quiz = null;   /* { ids, i, picked, results, label, mode, les, order, lastRes, fin } */
var DECK = null;   /* { ids, i, flip, title, back, then, les } */
var RSTEP = {};    /* خطوة البطاقات منتهية في هذه الجلسة، لكل مهمة */
var bankKind = 'obj', objSel = null, objCount = 10, essaySel = null;
var sumCh = null, revSub = 'cards', cardFilter = { ch: 'all', les: 'all', hideKnown: false };
var armed = null;
var TAB_OF = { home: 'home', plan: 'plan', sum: 'sum', lesson: 'sum', quiz: 'quiz', nb: 'quiz', rev: 'rev', deck: 'rev', recall: 'plan', review: 'plan', eve: 'plan' };

function render() {
  var tb = TAB_OF[screen] || 'home';
  document.querySelectorAll('.tab').forEach(function (b) { if (b.getAttribute('data-tab') === tb) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  updateBadge();
  var h;
  try {
    if (screen === 'plan') h = planHTML();
    else if (screen === 'sum') h = sumHTML();
    else if (screen === 'lesson') h = lessonHTML(arg);
    else if (screen === 'recall') h = recallHTML(arg);
    else if (screen === 'review') h = reviewHTML();
    else if (screen === 'eve') h = eveHTML();
    else if (screen === 'quiz') h = quiz ? runHTML() : bankHTML();
    else if (screen === 'nb') h = nbHTML();
    else if (screen === 'deck') h = DECK ? deckHTML() : revHTML();
    else if (screen === 'rev') h = revHTML();
    else h = homeHTML();
  } catch (e) {
    h = '<div class="empty"><b>تعذّر عرض هذه الصفحة</b><br>' + esc(e && e.message || '') + '</div>';
    if (window.console) console.error(e);
  }
  view.innerHTML = h;
  fitTables(); fitCard();
}

/* ---------- الرئيسة: العدّ التنازلي والمستوى ومهام اليوم ---------- */
function ringHTML() {
  var left = daysLeft(), big, unit, word = false;
  if (left === null) { big = '—'; unit = 'من الجدول'; }
  else if (left > 2) { big = String(left); unit = (left % 100 >= 3 && left % 100 <= 10) ? 'أيام' : 'يوماً'; }
  else if (left === 2) { big = 'يومان'; unit = 'بقيا'; word = true; }
  else if (left === 1) { big = 'غداً'; unit = 'الاختبار'; word = true; }
  else if (left === 0) { big = 'اليوم'; unit = 'الاختبار'; word = true; }
  else { big = 'مضى'; unit = 'الموعد'; word = true; }
  var total = LES.length, got = LES.filter(function (l) { return learned(l.id); }).length, p = total ? Math.round(100 * got / total) : 0;
  return '<svg class="ring" viewBox="0 0 120 120" role="img" aria-label="' + esc(left === null ? 'الموعد يصل من الجدول' : (left > 0 ? 'بقي ' + countWord(left, W.day) : big)) + '">' +
    '<circle class="r-dash" cx="60" cy="60" r="56"/><circle class="r-track" cx="60" cy="60" r="44"/>' +
    (p ? '<circle class="r-prog" cx="60" cy="60" r="44" pathLength="100" stroke-dasharray="' + p + ' 100" transform="rotate(-90 60 60)"/>' : '') +
    '<text class="r-n' + (word ? ' word' : '') + '" x="60" y="' + (word ? 62 : 66) + '" text-anchor="middle">' + esc(big) + '</text>' +
    '<text class="r-u" x="60" y="86" text-anchor="middle">' + esc(unit) + '</text></svg>';
}
function reviewDay() {
  var d = (INFO && INFO.days || []).filter(function (x) { return x.tasks.some(function (k) { return k.kind === 'review'; }); })[0];
  return d ? d.date : (examISO() ? addDays(examISO(), -2) : null);
}
function heroHTML() {
  var total = LES.length, got = LES.filter(function (l) { return learned(l.id); }).length;
  var pct = INFO && INFO.progress ? +INFO.progress.pct || 0 : 0, ov = statsFor(null), ol = level(ov), rd = reviewDay(), e = examISO(), left = daysLeft();
  var side = '<b>' + (INFO ? 'أنجزت ' + pct + '% من الخطة' : 'تعلّمت ' + got + ' من ' + total) + '</b>' +
    (rd && left !== null && left > 2 ? '<span>المراجعة الشاملة: ' + esc(dayName(rd)) + '</span>' : '') +
    (e && left !== null && left >= 0 ? '<i>ليلة ' + esc(dayName(e)) + ': تسميع فقط</i>' : '');
  return '<section class="hero" aria-label="العد التنازلي والتقدم">' +
    '<div class="hero-top"><span class="hero-label">حتى الاختبار</span><span class="chip">' + esc(examLabel()) + '</span></div>' +
    '<div class="hero-mid">' + ringHTML() + '<div class="ring-side">' + side + '</div></div>' +
    '<div class="split" role="img" aria-label="تعلّمت ' + got + ' من ' + total + '"><span class="done">تعلّمت ' + got + ' من ' + countWord(total, W.les, true) + '</span><span class="rest">بقي ' + (total - got) + '</span></div>' +
    '<p class="hero-foot">مستواك العام: <b>' + (ov.n >= 10 ? ol.label + ' · ' + ov.pct + '%' : 'لم يُقَس بعد') + '</b>' + (ov.n ? ' · ' + countWord(ov.n, W.ans) : '') + '</p>' +
  '</section>';
}
function levelsHTML() {
  var strong = [], weak = [], rows = CHS.map(function (c) {
    var st = statsFor(c.id), lv = level(st);
    if (lv.k === 'top') strong.push(c.title); if (lv.k === 'low') weak.push(c.title);
    return '<div class="lvl-row"><span class="lvl-no" aria-label="' + esc(c.title) + '">' + c.n + '</span><div><div class="nm">' + esc(c.name) + '</div><div class="ct">' + (st.n ? countWord(st.n, W.ans) : 'لا إجابات بعد') + '</div></div>' +
      '<span class="pill ' + lv.k + '">' + lv.label + (lv.k !== 'none' ? ' ' + st.pct + '%' : '') + '</span></div>';
  }).join('');
  var ins = (strong.length || weak.length)
    ? (strong.length ? 'متقدم في: <b>' + esc(strong.join('، ')) + '</b>' : '') + (strong.length && weak.length ? '<br>' : '') + (weak.length ? 'متعثر في: <b>' + esc(weak.join('، ')) + '</b>، فأكثر من أسئلته في البنك.' : '')
    : 'يُقاس مستوى الفصل بعد عشر إجابات فيه على الأقل، من بنك الأسئلة ودفتر الأخطاء، ولا يغيّر الخطة.';
  return '<section class="block" aria-labelledby="lv-h"><div class="block-head"><h2 id="lv-h">مستواك في الفصول</h2><span class="muted small">ممتاز من 85% · جيد من 60%</span></div>' +
    '<div class="card levels">' + rows + '<p class="insight">' + ins + '</p></div></section>';
}
function homeHTML() {
  var mk = mistakes().length;
  return heroHTML() + levelsHTML() + todayBlock() +
    '<section class="block"><div class="row">' +
      '<button type="button" class="btn" data-go="#quiz">اختبر نفسك من البنك</button>' +
      '<button type="button" class="btn ghost" data-go="#nb">دفتر الأخطاء (' + mk + ')</button>' +
    '</div></section>' +
    '<p class="note-line">' + esc(ST.note()) + '</p>';
}

/* «ابدأ صغيراً»: عشر بطاقات من دروس اليوم */
function smallRow() {
  return '<li><button type="button" class="task kind-small" data-act="start-small"><span class="tick small-ic" aria-hidden="true">' + BOLT + '</span>' +
    '<span><span class="t-title">ابدأ صغيراً</span><span class="t-meta">عشر بطاقات من دروس اليوم، فالبداية أصعب ما في المذاكرة.</span></span></button></li>';
}
function todayBlock() {
  if (!INFO) {
    return '<section class="block" aria-labelledby="td-h"><div class="block-head"><h2 id="td-h">مهام اليوم</h2></div>' +
      '<div class="empty"><b>افتح الصفحة مع الاتصال ليصلك الجدول</b><br>وإلى أن يصل تستطيع أن تذاكر من قائمة الدروس.</div>' +
      '<ol class="tasks">' + smallRow() + '</ol>' + lessonsBlock() + '</section>';
  }
  var t = todayISO(), tasks = INFO.today || [], mins = tasks.reduce(function (s, k) { return s + taskMin(k); }, 0);
  var head = '<div class="block-head"><h2 id="td-h">مهام اليوم · ' + esc(dayLabel(t)) + '</h2>' + (mins ? '<span class="muted small">' + esc(minutesText(mins)) + '</span>' : '') + '</div>';
  if (!tasks.length) {
    var next = (INFO.days || []).filter(function (d) { return d.date > t; })[0], left = daysLeft();
    var msg = left !== null && left <= 0 ? 'لا مهام لهذه المادة بعد موعد الاختبار.' : 'لا مهام لهذه المادة اليوم في الجدول.' + (next ? ' وأقرب مهامها يوم ' + dayLabel(next.date) + '.' : '');
    return '<section class="block" aria-labelledby="td-h">' + head + '<div class="empty">' + esc(msg) + '</div><ol class="tasks">' + smallRow() + '</ol>' +
      '<button type="button" class="link center" data-go="#plan">الخطة كاملة</button></section>';
  }
  return '<section class="block" aria-labelledby="td-h">' + head + '<ol class="tasks">' + smallRow() + tasks.map(function (k) { return taskRow(k, true); }).join('') + '</ol>' +
    '<button type="button" class="link center" data-go="#plan">الخطة كاملة</button></section>';
}
var KIND = { learn: 'تعلّم', recall: 'تسميع', review: 'مراجعة شاملة', eve: 'ليلة الاختبار' };
function taskHref(k) {
  if (k.kind === 'review') return '#review'; if (k.kind === 'eve') return '#eve';
  var l = LBY[k.lesson]; return l ? (k.kind === 'recall' ? '#r-' : '#l-') + l.n : '#plan';
}
function taskTitle(k) {
  if (k.kind === 'review') return 'مراجعة شاملة بالتسميع';
  if (k.kind === 'eve') return 'ليلة الاختبار: البطاقات وورقة الليلة الأخيرة';
  var l = LBY[k.lesson]; return (KIND[k.kind] ? KIND[k.kind] + ' · ' : '') + (l ? l.title : (k.title || k.lesson));
}
function taskMeta(k) {
  var l = LBY[k.lesson], bits = [], mt = minutesText(taskMin(k));
  if (k.kind === 'recall') bits.push('بطاقات الدرس ثم أسئلته');
  if (k.kind === 'review') bits.push('بطاقات الدروس كلها ثم عشرون سؤالاً');
  if (k.kind === 'eve') bits.push('لا جديد الليلة');
  if (l) bits.push('ص ' + l.pages);
  if (mt) bits.push(mt);
  return bits.join(' · ');
}
function taskRow(k, canTick) {
  var done = !!k.done, l = LBY[k.lesson];
  var tick = canTick
    ? '<button type="button" class="tick" data-act="tick" data-l="' + esc(k.lesson) + '" data-k="' + esc(k.kind) + '" role="checkbox" aria-checked="' + done + '" aria-label="أنجزت: ' + esc(taskTitle(k)) + '">' + TICK + '</button>'
    : '<span class="tick later" aria-hidden="true">' + (done ? TICK : '') + '</span>';
  return '<li class="task kind-' + esc(k.kind) + (done ? ' is-done' : '') + '">' + tick +
    '<a class="t-main" href="' + taskHref(k) + '"><span><span class="t-title">' + esc(taskTitle(k)) + '</span>' +
    '<span class="t-meta">' + esc(taskMeta(k)) + (l && k.kind === 'learn' ? flagHTML(l) : '') + '</span></span>' + GO + '</a></li>';
}
function lesStatus(l) {
  var n = passes(l.id).length;
  if (n >= 3) return ['top', 'أتممته']; if (n === 2) return ['mid', 'سمّعته مرة'];
  if (learned(l.id)) return ['mid', 'تعلّمته']; return ['none', 'لم يبدأ'];
}
function lessonsBlock() {
  var h = '<p class="sec-title">الدروس</p>';
  CHS.forEach(function (c) {
    if (!c.les.length) return;
    h += '<p class="eyebrow">' + esc(chLabel(c)) + ' · ص ' + esc(c.pages) + '</p><ol class="les-list">' + c.les.map(function (l) {
      var st = lesStatus(l);
      return '<li><a class="les-row" href="#l-' + l.n + '"><span class="les-no">' + l.no + '</span><span class="les-tx"><b>' + esc(l.title) + '</b><span>ص ' + esc(l.pages) + ' · ' + esc(minutesText(lesMin(l))) + '</span></span>' +
        '<span class="les-st"><span class="pill ' + st[0] + '">' + st[1] + '</span>' + (exitFlag(l) ? '<span class="flag">ينقصه تسميع الخروج</span>' : '') + '</span></a></li>';
    }).join('') + '</ol>';
  });
  return h;
}

/* الخطة: أيام هذه المادة في الجدول */
function planHTML() {
  var h = '<div class="block-head"><h2>الخطة من جدول الاختبارات</h2>' + (INFO && INFO.progress ? '<span class="chip">أنجزت ' + (+INFO.progress.pct || 0) + '%</span>' : '') + '</div>' +
    '<p class="muted small p0">يوزّع الجدول الدروس على الأيام مع موادك الأخرى: يمرّ كل درس ثلاث مرات في أيام مختلفة، تعلّماً ثم تسميعين متباعدين، ثم مراجعة شاملة قبل الاختبار بيومين وتسميع ليلته.</p>';
  if (!INFO) return h + '<div class="empty"><b>افتح الصفحة مع الاتصال ليصلك الجدول</b></div>' + lessonsBlock();
  var t = todayISO(), days = INFO.days || [];
  days.forEach(function (day) {
    var isToday = day.date === t, load = +day.minutes > 0 ? +day.minutes : day.tasks.reduce(function (s, k) { return s + taskMin(k); }, 0);
    h += '<section class="day" aria-label="' + esc(dayLabel(day.date)) + '"><div class="day-head"><h3>' + esc(dayLabel(day.date)) + (isToday ? ' <span class="chip">اليوم</span>' : '') + '</h3><span class="muted small">' + esc(minutesText(load)) + '</span></div>' +
      '<ol class="tasks">' + day.tasks.map(function (k) { return taskRow(k, isToday); }).join('') + '</ol></section>';
  });
  if (!days.length) h += '<div class="empty">لا أيام مذاكرة لهذه المادة في الجدول الآن.</div>';
  var e = examISO();
  if (e) h += '<section class="exam-day"><span>يوم الاختبار</span><b>' + esc(dayLabel(e)) + '</b>' + (tentative() ? '<span class="chip">موعد مبدئي</span>' : '') + '</section>';
  return h + lessonsBlock();
}

/* ---------- الملخص: كتل الدرس، وكل عنوان يبدأ بطاقة ---------- */
function blockHTML(b) {
  if (!b || !b.t) return '';
  if (b.t === 'p') return '<p>' + esc(b.x) + pg(b.pg) + expChip(b) + '</p>';
  if (b.t === 'q') return '<blockquote class="quote book">«' + esc(b.x) + '»<cite>' + (b.label ? esc(b.label) + ' · ' : '') + 'نص الكتاب' + pg(b.pg) + expChip(b) + '</cite></blockquote>';
  if (b.t === 'list') {
    var tag = b.ordered ? 'ol' : 'ul';
    return '<div class="sum-list">' + (b.lead ? '<p class="lead">' + esc(b.lead) + pg(b.pg) + expChip(b) + '</p>' : '') +
      '<' + tag + ' class="points' + (b.ordered ? ' ordered' : '') + '">' + arr(b.items).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</' + tag + '>' +
      (!b.lead && b.pg ? '<p class="p0">' + pg(b.pg) + '</p>' : '') + '</div>';
  }
  if (b.t === 'note') return '<p class="sum-note"><b>تنبيه</b>' + esc(b.x) + pg(b.pg) + '</p>';
  if (b.t === 'h') return '';
  return b.x ? '<p>' + esc(b.x) + pg(b.pg) + '</p>' : '';
}
function summaryHTML(l) {
  var groups = [], cur = null;
  l.summary.forEach(function (b) {
    if (b && b.t === 'h') { cur = { h: b.x, items: [] }; groups.push(cur); return; }
    if (!cur) { cur = { h: '', items: [] }; groups.push(cur); }
    cur.items.push(b);
  });
  return groups.map(function (g) {
    var inner = g.items.map(blockHTML).join('');
    if (!inner && !g.h) return '';
    return '<article class="art">' + (g.h ? '<h4>' + esc(g.h) + '</h4>' : '') + inner + '</article>';
  }).join('');
}
/* الصفحات: "33" أو "35–36" أو "42، 50–54" */
function ranges(p) {
  var out = [];
  String(p || '').split(/[،,]/).forEach(function (s) {
    var m = s.match(/\d+/g); if (!m) return;
    var a = +m[0], b = m.length > 1 ? +m[m.length - 1] : a; out.push([Math.min(a, b), Math.max(a, b)]);
  });
  return out;
}
function overlap(p1, p2) { var A = ranges(p1), B = ranges(p2); return A.some(function (a) { return B.some(function (b) { return a[0] <= b[1] && b[0] <= a[1]; }); }); }
function lesTables(l) { return l.ch.tables.filter(function (t) { return overlap(t.pg, l.pages); }); }

/* ---------- الدرس: ملخصه، ثم جداوله، ثم تسميع الخروج ---------- */
function exitCard(l) {
  var nq = l.objective.length, x = S.exit[l.id], passed = exitPassed(l.id), blocked = exitBlocked(l.id), isL = learned(l.id);
  var h = '<section class="card exit" aria-labelledby="ex-h"><p class="exit-t" id="ex-h">تسميع الخروج</p>';
  if (!nq) h += '<p class="muted small p0">لا أسئلة موضوعية في هذا الدرس بعد.</p>';
  else if (exitRunning(l.id)) h += '<p class="fin-msg">محاولتك جارية: أجبت عن ' + quiz.results.length + ' من ' + nq + '.</p><button type="button" class="btn wide" data-go="#quiz">أكمل المحاولة</button>';
  else if (passed) h += '<p class="fin-msg ok">اجتزته بنسبة ' + (+x.best || +x.pct || 0) + '%' + (x.via === 'recall' ? ' في مهمة التسميع' : '') + '.</p>' +
    '<button type="button" class="btn ghost wide" data-act="exit-quiz" data-n="' + l.n + '">أعده للتدريب: ' + countWord(nq, W.q) + '</button>';
  else if (blocked) h += '<p class="fin-msg bad">بلغت اليوم ' + (+x.pct || 0) + '%، والنجاح بـ' + PASS + '%. تُعاد المحاولة في يوم آخر، لأن الإعادة الفورية تقيس تذكّر الأجوبة لا الفهم.</p>' +
    '<button type="button" class="btn wide" disabled>تُتاح المحاولة غداً</button>';
  else h += '<p class="muted small p0">أسئلة الدرس الموضوعية كلها (' + countWord(nq, W.q) + ') بلا كتاب، وتُحسب محاولة واحدة، والنجاح بـ' + PASS + '%. ويمكنك أن تأتي إليه متى شئت.' + (x && x.pct != null ? ' آخر محاولة: ' + x.pct + '%.' : '') + '</p>' +
    '<button type="button" class="btn wide" data-act="exit-quiz" data-n="' + l.n + '">ابدأ تسميع الخروج</button>';
  if (!isL) h += '<button type="button" class="link center" data-act="learn-skip" data-n="' + l.n + '">' + (passed ? 'سجّله متعلَّماً' : 'سجّله متعلَّماً دون تسميع الخروج') + '</button>';
  else {
    h += '<p class="muted small p0">' + (passedToday(l.id) ? 'سُجّل الدرس اليوم في الجدول، ويعود إليك للتسميع في يومين مختلفين.' : 'تعلّمت هذا الدرس، ويعود إليك الجدول به للتسميع.') +
      (exitFlag(l) ? ' وعليه علامة «ينقصه تسميع الخروج» حتى تجتازه.' : '') + '</p>';
    if (passedToday(l.id) && learnedMark(l.id)) h += '<button type="button" class="link center" data-act="learn-undo" data-n="' + l.n + '">ألغِ تسجيله</button>';
  }
  return h + '</section>';
}
function lessonHTML(n) {
  var l = lesByN(n); if (!l) return '<div class="empty">لا يوجد هذا الدرس.</div><button type="button" class="btn ghost" data-go="#plan">الخطة</button>';
  var i = LES.indexOf(l), prev = LES[i - 1], next = LES[i + 1], tbs = lesTables(l);
  var h = '<div class="block-head"><button type="button" class="link" data-go="#sum">الملخصات</button><span class="chip">الدرس ' + l.no + ' من ' + LES.length + '</span></div>' +
    '<section class="les-head"><p class="eyebrow">' + esc(chLabel(l.ch)) + ' · ص ' + esc(l.pages) + ' · ' + esc(minutesText(lesMin(l))) + '</p><h2>' + esc(l.title) + '</h2>' +
    (exitFlag(l) ? '<p class="p0"><span class="flag solo">ينقصه تسميع الخروج</span></p>' : '') +
    (todayTask(l.id) && todayTask(l.id).kind === 'recall' ? '<p class="fin-msg">مهمتك اليوم في هذا الدرس تسميع بلا كتاب. <a href="#r-' + l.n + '">ابدأ التسميع</a></p>' : '') +
    '<div class="les-quick">' + (l.cards.length ? '<button type="button" class="btn ghost sm" data-act="deck-lesson" data-n="' + l.n + '">بطاقاته (' + l.cards.length + ')</button>' : '') +
      (l.objective.length ? '<button type="button" class="btn ghost sm" data-act="goto-exit">تسميع الخروج</button>' : '') +
      (hasMap(l.ch) ? '<button type="button" class="btn ghost sm" data-act="map" data-ch="' + l.ch.id + '">خريطة الفصل</button>' : '') + '</div></section>';
  h += summaryHTML(l) || '<div class="empty">لم يصل ملخص هذا الدرس بعد.</div>';
  if (tbs.length) h += '<p class="sec-title">جداول المقارنة</p>' + tbs.map(cmpHTML).join('');
  h += '<div id="exit-box">' + exitCard(l) + '</div>';
  h += '<div class="row">' + (prev ? '<a class="btn ghost" href="#l-' + prev.n + '">الدرس السابق</a>' : '') + (next ? '<a class="btn ghost" href="#l-' + next.n + '">الدرس التالي</a>' : '') + '</div>';
  return h;
}

/* ---------- الملخصات: الفصل كله بدروسه، ثم جداوله وخريطته ---------- */
function sumHTML() {
  if (!CHS.length) return '<div class="empty">لم تصل ملفات المحتوى.</div>';
  if (!sumCh || !CH[sumCh]) sumCh = (ST.pref('sumCh') && CH[ST.pref('sumCh')]) ? ST.pref('sumCh') : CHS[0].id;
  var c = CH[sumCh], i = CHS.indexOf(c), nx = CHS[i + 1];
  var h = chBar('sum-ch', sumCh, false);
  h += '<section class="les-head"><p class="eyebrow">' + esc(c.title) + ' · ص ' + esc(c.pages) + ' · ' + countWord(c.les.length, W.les) + '</p><h2>' + esc(c.name) + '</h2>' +
    '<div class="les-quick">' + (hasMap(c) ? '<button type="button" class="btn ghost sm" data-act="map" data-ch="' + c.id + '">الخريطة الذهنية</button>' : '') +
    (c.qs.length ? '<button type="button" class="btn ghost sm" data-act="go-bank" data-ch="' + c.id + '">اختبر نفسك في الفصل</button>' : '') + '</div></section>';
  c.les.forEach(function (l) {
    h += '<div class="ch-head" id="les-' + l.n + '"><p class="eyebrow">الدرس ' + l.no + ' · ص ' + esc(l.pages) + ' · ' + esc(minutesText(lesMin(l))) + '</p>' +
      '<div class="block-head"><h3>' + esc(l.title) + flagHTML(l) + '</h3><a class="link" href="#l-' + l.n + '">صفحة الدرس</a></div></div>' + summaryHTML(l);
  });
  if (c.tables.length) h += '<p class="sec-title">جداول المقارنة</p>' + c.tables.map(cmpHTML).join('');
  if (nx) h += '<button type="button" class="btn ghost wide" data-act="sum-ch" data-ch="' + nx.id + '">' + esc(nx.title) + ': ' + esc(nx.name) + '</button>';
  return h;
}

/* ---------- مهام الجدول: التسميع، والمراجعة الشاملة، وليلة الاختبار ---------- */
function stepsHTML(steps) {
  return '<ol class="steps">' + steps.map(function (s, i) {
    return '<li class="' + (s.done ? 'done' : '') + '"><span class="st-n">' + (s.done ? TICK : (i + 1)) + '</span><div class="st-tx"><b>' + esc(s.t) + '</b><span>' + esc(s.m) + '</span></div>' + s.btn + '</li>';
  }).join('') + '</ol>';
}
function backHead(label, chip) { return '<div class="block-head"><button type="button" class="link" data-go="#home">' + esc(label || 'الرئيسية') + '</button>' + (chip ? '<span class="chip">' + esc(chip) + '</span>' : '') + '</div>'; }
function recallHTML(n) {
  var l = lesByN(n); if (!l) return '<div class="empty">لا يوجد هذا الدرس.</div>';
  var recd = passedToday(l.id), qn = l.objective.length, tk = todayTask(l.id);
  if (tk && tk.kind !== 'recall') tk = null;
  return backHead('الرئيسية', 'تسميع') +
    '<section class="les-head"><p class="eyebrow">تسميع بلا كتاب · ' + esc(chLabel(l.ch)) + ' · ص ' + esc(l.pages) + (tk ? ' · ' + esc(minutesText(taskMin(tk))) : '') + '</p><h2>' + esc(l.title) + '</h2>' +
    '<p class="muted small p0">بطاقات الدرس كلها، ومعها ما علّمته «أعرفها» من قبل، ثم أسئلته. لا تفتح الملخص، فالحفظ يثبت بالعودة إلى المعلومة لا بإعادة قراءتها.</p>' +
    (exitFlag(l) ? '<p class="fin-msg">إن بلغت ' + PASS + '% في أسئلته كلها هنا زالت علامة «ينقصه تسميع الخروج».</p>' : '') + '</section>' +
    stepsHTML([
      { t: 'بطاقات الدرس', m: countWord(l.cards.length, W.card), done: !!RSTEP['r' + l.id], btn: '<button type="button" class="btn" data-act="deck-lesson" data-n="' + l.n + '" data-then="recall"' + (l.cards.length ? '' : ' disabled') + '>ابدأ</button>' },
      { t: 'أسئلة الدرس', m: (qn ? countWord(qn, W.q) + '، وما أخطأت فيه يدخل دفتر الأخطاء' : 'لا أسئلة بعد'), done: recd, btn: '<button type="button" class="btn" data-act="recall-quiz" data-n="' + l.n + '"' + (qn ? '' : ' disabled') + '>ابدأ</button>' }
    ]) +
    (recd ? '<p class="note-line">سُجّل تسميع هذا الدرس اليوم في الجدول.</p>' : '<button type="button" class="link center" data-act="recall-mark" data-n="' + l.n + '">سجّل التسميع دون أسئلة</button>');
}
function unknownCards() { return KL.filter(function (k) { return !known(k.id); }); }
function reviewHTML() {
  var unk = unknownCards().length, recd = passedToday('_review'), nq = Math.min(20, QL.length);
  return backHead('الرئيسية', 'مراجعة شاملة') +
    '<section class="les-head"><p class="eyebrow">قبل الاختبار بيومين' + (examISO() ? ' · الاختبار يوم ' + esc(dayLabel(examISO())) : '') + '</p><h2>مراجعة شاملة بالتسميع</h2>' +
    '<p class="muted small p0">ما لم تعلّمه «أعرفها» من بطاقات الدروس كلها، ثم عشرون سؤالاً تبدأ بدفتر الأخطاء وبأضعف ما عندك. ولا ملخصات اليوم.</p></section>' +
    stepsHTML([
      { t: 'البطاقات', m: unk ? countWord(unk, W.card) + ' لم تعلّمها' : 'كلها: ' + countWord(KL.length, W.card), done: !!RSTEP._review, btn: '<button type="button" class="btn" data-act="deck-review"' + (KL.length ? '' : ' disabled') + '>ابدأ</button>' },
      { t: countWord(nq, W.q), m: 'من الدروس كلها', done: recd, btn: '<button type="button" class="btn" data-act="review-quiz"' + (nq ? '' : ' disabled') + '>ابدأ</button>' }
    ]) +
    (recd ? '<p class="note-line">سُجّلت المراجعة الشاملة اليوم في الجدول.</p>' : '<button type="button" class="link center" data-act="review-mark">سجّل المراجعة دون أسئلة</button>');
}
function nightHTML() {
  var h = '';
  CHS.forEach(function (c) {
    if (!c.night.length) return;
    h += '<p class="sec-title">' + esc(chLabel(c)) + '</p><ol class="night-list">' + c.night.map(function (x) { return '<li>' + rich(x.x) + pg(x.pg) + expChip(x) + '</li>'; }).join('') + '</ol>';
  });
  return h || '<div class="empty">لم تصل ورقة الليلة الأخيرة بعد.</div>';
}
function eveHTML() {
  var unk = unknownCards().length, recd = passedToday('_eve'), e = examISO();
  return backHead('الرئيسية', 'ليلة الاختبار') +
    '<section class="les-head"><p class="eyebrow">' + (e ? 'ليلة ' + esc(dayName(e)) + ' · الاختبار ' + esc(dayLabel(e)) + (tentative() ? ' (موعد مبدئي)' : '') : 'ليلة الاختبار') + '</p><h2>تسميع البطاقات وورقة الليلة الأخيرة</h2>' +
    '<p class="muted small p0">لا جديد الليلة: سمّع البطاقات، ثم اقرأ الورقة، ونم مبكراً.</p></section>' +
    stepsHTML([
      { t: 'البطاقات', m: unk ? countWord(unk, W.card) + ' لم تعلّمها، ثم البقية' : 'كلها: ' + countWord(KL.length, W.card), done: !!RSTEP._eve, btn: '<button type="button" class="btn" data-act="deck-eve"' + (KL.length ? '' : ' disabled') + '>ابدأ</button>' },
      { t: 'ورقة الليلة الأخيرة', m: 'أدناه', done: recd, btn: '<button type="button" class="btn" data-act="eve-mark"' + (recd ? ' disabled' : '') + '>' + (recd ? 'سُجّلت' : 'أنهيت الليلة') + '</button>' }
    ]) + nightHTML();
}

/* ---------- البطاقات ---------- */
function known(id) { var x = S.k[id]; return !!(x && (x === 1 || x.v)); }
var KLBL = { def: 'تعريف', count: 'عدد', rule: 'قاعدة واستثناء' };
function frontHTML(k) {
  if (k.type === 'count') return '<span class="fc-count">' + esc(k.n || arr(k.items).length) + '</span><p class="fc-q">' + esc(k.front) + '</p><p class="fc-hint">عدّدها ثم اقلب البطاقة</p>';
  if (k.type === 'rule') return '<p class="fc-q">' + esc(k.front) + '</p><p class="fc-hint">ما القاعدة؟ وما الاستثناء؟</p>';
  return '<p class="fc-q">' + esc(k.front) + '</p><p class="fc-hint">' + (k.bk ? 'استحضر نص الكتاب ثم اقلب' : 'استحضر الجواب ثم اقلب') + '</p>';
}
function backHTML(k) {
  if (k.type === 'count') return (k.lead ? '<p class="fc-lead">' + esc(k.lead) + '</p>' : '') + '<ol class="fc-list">' + arr(k.items).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
  if (k.type === 'rule') return '<div class="fc-part"><span class="fc-pl">القاعدة</span><span>' + esc(k.rule) + '</span></div><div class="fc-part"><span class="fc-pl">الاستثناء</span><span>' + esc(k.exc) + '</span></div>';
  return k.bk ? '<p class="book fc-text">«' + esc(k.back) + '»</p>' : '<p class="fc-text">' + esc(k.back) + '</p>';
}
function cardHTML(k, flipped) {
  var ty = KLBL[k.type] || 'بطاقة', ref = 'ص ' + (k.pg || k.les.pages);
  return '<button type="button" class="fc t-' + esc(k.type) + (flipped ? ' flipped' : '') + '" data-act="flip" aria-label="' + (flipped ? 'اعرض الوجه' : 'اقلب البطاقة') + '">' +
    '<span class="fc-inner">' +
      '<span class="face front" aria-hidden="' + !!flipped + '"><span class="fc-top"><span class="fc-type">' + ty + '</span><span class="fc-ref">' + (k.exp === true ? 'متوقع · ' : '') + esc(ref) + '</span></span><span class="fc-body">' + frontHTML(k) + '<span class="reveal">اكشف الجواب</span></span><span class="seal">' + esc(ref.replace(' ', '')) + '</span></span>' +
      '<span class="face back" aria-hidden="' + !flipped + '"><span class="fc-top"><span class="fc-type">' + ty + '</span><span class="fc-ref">' + esc(ref) + '</span></span><span class="fc-body">' + backHTML(k) + '</span></span>' +
    '</span></button>';
}
/* ارتفاع البطاقة على قدر أطول وجهيها، فلا يُقص شيء */
function faceNeed(face) {
  var top = face.querySelector('.fc-top'), b = face.querySelector('.fc-body'); if (!b) return 0;
  var cs = getComputedStyle(b), gap = parseFloat(cs.rowGap) || 0, h = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0), kids = b.children, n = 0;
  for (var i = 0; i < kids.length; i++) { if (kids[i].offsetHeight) { h += kids[i].offsetHeight; n++; } }
  return h + Math.max(0, n - 1) * gap + (top ? top.offsetHeight : 0) + 4;
}
function fitCard() {
  view.querySelectorAll('.fc').forEach(function (fc) {
    var inner = fc.querySelector('.fc-inner'); if (!inner) return;
    var need = 290; fc.querySelectorAll('.face').forEach(function (f) { need = Math.max(need, faceNeed(f)); });
    inner.style.height = Math.ceil(need) + 'px';
  });
}
function openDeck(ids, title, back, then, les) {
  if (!ids.length) { toast('لا بطاقات هنا'); return; }
  DECK = { ids: ids, i: 0, flip: false, title: title, back: back || '#rev', then: then || null, les: les || null };
  go('#deck');
}
function deckHTML() {
  var n = DECK.ids.length, top = '<div class="block-head"><h2>' + esc(DECK.title) + '</h2><button type="button" class="link" data-act="deck-quit">إنهاء</button></div>';
  if (DECK.i >= n) {
    var kn = DECK.ids.filter(known).length, nextBtn = '';
    if (DECK.then === 'recall') nextBtn = '<button type="button" class="btn" data-act="recall-quiz" data-n="' + num(DECK.les) + '">إلى أسئلة الدرس</button>';
    else if (DECK.then === 'review') nextBtn = '<button type="button" class="btn" data-act="review-quiz">إلى الأسئلة</button>';
    else if (DECK.then === 'eve') nextBtn = '<button type="button" class="btn" data-go="#eve">إلى ورقة الليلة الأخيرة</button>';
    return top + '<section class="card deck-end"><div class="score">' + n + '</div><p class="muted p0">' + (n === 1 ? 'بطاقة مررت بها' : 'مررت بـ' + countWord(n, W.card)) + '، وتعرف منها ' + kn + '.</p></section>' +
      '<div class="row">' + nextBtn + '<button type="button" class="btn ghost" data-act="deck-again">أعدها</button>' + (DECK.then ? '' : '<button type="button" class="btn ghost" data-act="deck-quit">رجوع</button>') + '</div>';
  }
  var k = K[DECK.ids[DECK.i]], kn2 = known(k.id);
  var dots = n <= 16 ? '<div class="dots" aria-hidden="true">' + DECK.ids.map(function (id, i) { return '<i class="' + (i === DECK.i ? 'on' : (known(id) ? 'kn' : '')) + '"></i>'; }).join('') + '</div>' : '';
  return top +
    '<div class="qbar"><div class="track"><div class="fill" style="width:' + Math.round(100 * DECK.i / n) + '%"></div></div><span class="n">' + (DECK.i + 1) + ' من ' + n + '</span></div>' +
    '<p class="eyebrow">' + esc('الدرس ' + k.les.no + ': ' + k.les.title) + '</p>' +
    '<div class="deck-wrap"><div class="deck">' + cardHTML(k, DECK.flip) + '</div>' + dots +
    '<div class="deck-nav"><button type="button" class="btn ghost" data-act="deck-prev"' + (DECK.i ? '' : ' disabled') + '>السابقة</button>' +
      '<button type="button" class="know" data-act="deck-know" aria-pressed="' + kn2 + '">' + TICK + 'أعرفها</button>' +
      '<button type="button" class="btn ghost" data-act="deck-next">' + (DECK.i + 1 < n ? 'التالية' : 'إنهاء') + '</button></div></div>';
}
function deckStep(d) {
  if (!DECK) return;
  DECK.i = clamp(DECK.i + d, 0, DECK.ids.length); DECK.flip = false;
  if (DECK.i >= DECK.ids.length && DECK.then) RSTEP[DECK.then === 'recall' ? 'r' + DECK.les : '_' + DECK.then] = true;
  render();
}
function cardList() {
  return KL.filter(function (k) {
    if (cardFilter.ch !== 'all' && k.ch.id !== cardFilter.ch) return false;
    if (cardFilter.les !== 'all' && k.les.id !== cardFilter.les) return false;
    return !cardFilter.hideKnown || !known(k.id);
  });
}
function cardsBrowser() {
  if (cardFilter.ch !== 'all' && !CH[cardFilter.ch]) cardFilter.ch = 'all';
  var list = cardList(), kn = KL.filter(function (k) { return known(k.id); }).length, c = CH[cardFilter.ch];
  var h = '<p class="muted small p0">تعريفات بنص الكتاب، وأعداد بقوائمها، وقواعد باستثناءاتها. علّم «أعرفها» ما ثبت عندك.</p>' +
    chBar('card-ch', cardFilter.ch, true);
  if (c) h += '<div class="pick soft" role="group" aria-label="الدروس"><button type="button" data-act="card-les" data-l="all" aria-pressed="' + (cardFilter.les === 'all') + '"><span class="pk-box" aria-hidden="true">' + TICK + '</span><span>دروس الفصل كلها</span></button>' +
    c.les.map(function (l) { return '<button type="button" data-act="card-les" data-l="' + l.id + '" aria-pressed="' + (cardFilter.les === l.id) + '"><span class="pk-box" aria-hidden="true">' + TICK + '</span><span>' + esc(l.title) + '<small>الدرس ' + l.no + ' · ' + countWord(l.cards.length, W.card) + '</small></span></button>'; }).join('') + '</div>';
  h += '<div class="toggle"><span class="small">أخفِ ما علّمته «أعرفها»</span><button type="button" class="switch" data-act="hide-known" role="switch" aria-checked="' + cardFilter.hideKnown + '" aria-label="إخفاء ما أعرفه"></button></div>' +
    '<button type="button" class="btn wide" data-act="deck-filter"' + (list.length ? '' : ' disabled') + '>ابدأ: ' + (list.length ? countWord(list.length, W.card) : 'لا بطاقات') + '</button>' +
    '<p class="note-line">تعرف ' + kn + ' من ' + countWord(KL.length, W.card, true) + '.</p>';
  return h;
}
function startSmall() {
  var ls = [];
  ((INFO && INFO.today) || []).forEach(function (k) { var l = LBY[k.lesson]; if (l && ls.indexOf(l) < 0) ls.push(l); });
  if (!ls.length) { var nx = LES.filter(function (l) { return !learned(l.id); })[0]; if (nx) ls = [nx]; }
  function order(cs) { return shuffle(cs.filter(function (k) { return !known(k.id); })).concat(shuffle(cs.filter(function (k) { return known(k.id); }))); }
  var pool = []; ls.forEach(function (l) { pool = pool.concat(l.cards); });
  var ids = order(pool).slice(0, 10);
  /* إن قلّت بطاقات دروس اليوم عن عشر أُكملت من الدروس التالية لها، ثم من التي قبلها */
  if (ids.length < 10) {
    var last = ls.length ? LES.indexOf(ls[ls.length - 1]) : -1, rest = LES.slice(last + 1).concat(LES.slice(0, Math.max(0, last + 1)).reverse());
    for (var i = 0; i < rest.length && ids.length < 10; i++) if (ls.indexOf(rest[i]) < 0) ids = ids.concat(order(rest[i].cards).slice(0, 10 - ids.length));
  }
  openDeck(ids.map(function (k) { return k.id; }), 'ابدأ صغيراً: عشر بطاقات', '#home');
}

/* ---------- بنك الأسئلة: اختبار موضوعي، واختبار مقالي، لا يُخلطان ---------- */
function selInit() {
  if (!objSel) { var o = ST.pref('objSel'); objSel = Array.isArray(o) ? o.filter(function (id) { return CH[id]; }) : []; if (!objSel.length) objSel = CHS.map(function (c) { return c.id; }); }
  if (!essaySel) { var e = ST.pref('essaySel'); essaySel = {}; if (Array.isArray(e) && e.length) e.forEach(function (id) { if (LBY[id]) essaySel[id] = 1; }); else LES.forEach(function (l) { essaySel[l.id] = 1; }); }
  var oc = ST.pref('objCount'); if (oc === 10 || oc === 20 || oc === 0) objCount = oc;
  var bk = ST.pref('bankKind'); if (bk === 'obj' || bk === 'essay') bankKind = bk;
}
function saveSel() { ST.setPref('objSel', objSel); ST.setPref('essaySel', Object.keys(essaySel).filter(function (k) { return essaySel[k]; })); ST.setPref('objCount', objCount); ST.setPref('bankKind', bankKind); }
function roundBanner() {
  var h = '';
  CHS.forEach(function (c) {
    var b = bankOf(c.id), x = b.last; if (!x || x.seen) return;
    h += '<section class="card tight"><p class="exit-t">نتيجة جولة ' + esc(c.title) + '</p><p class="fin-msg ok">' + esc(roundText(c)) + '</p>' +
      '<button type="button" class="btn ghost sm" data-act="round-seen" data-ch="' + c.id + '">حسناً</button></section>';
  });
  return h;
}
function objSetup() {
  var pool = 0;
  objSel.forEach(function (id) { if (CH[id]) pool += CH[id].qs.length; });
  var n = objCount ? Math.min(objCount, pool) : pool;
  return '<section class="card">' +
    '<div class="field"><span class="f-l">الفصول</span><div class="pick full" role="group" aria-label="الفصول">' + CHS.map(function (c) {
      var b = bankOf(c.id), sv = bankSolved(c);
      return '<button type="button" data-act="pick-ch" data-ch="' + c.id + '" aria-pressed="' + (objSel.indexOf(c.id) > -1) + '"' + (c.qs.length ? '' : ' disabled') + '><b>' + esc(c.title) + '</b><small>' + esc(c.name) + '</small>' +
        '<small class="rd">الجولة ' + b.r + ': حللت ' + sv + ' من ' + c.qs.length + '</small></button>';
    }).join('') + '</div></div>' +
    '<div class="field"><span class="f-l">عدد الأسئلة</span><div class="seg" role="group" aria-label="عدد الأسئلة">' +
      [10, 20, 0].map(function (x) { return '<button type="button" data-act="pick-count" data-n="' + x + '" aria-pressed="' + (objCount === x) + '">' + (x ? x : 'الكل') + '</button>'; }).join('') +
    '</div><p class="muted small p0">العشرة والعشرون تبدأ بما لم تحلّه في الجولة، وأوله ما أخطأت فيه في الجولة السابقة.</p></div>' +
    '<button type="button" class="btn wide" data-act="start-obj"' + (n ? '' : ' disabled') + '>ابدأ: ' + (n ? countWord(n, W.q) : 'اختر فصلاً') + '</button>' +
  '</section>';
}
function essaySetup() {
  var ls = pickedLessons(), nq = 0; ls.forEach(function (l) { nq += l.essay.length; });
  var h = '<section class="card"><p class="muted small p0">اختر الدروس، فيُخرج الموقع رسالة واحدة جاهزة تنسخها وتلصقها في محادثة جديدة داخل مشروع المادة، فيختبرك Claude فيها ثلاثة أسئلة في كل مرة ويصحّح لك. لا تصحيح في الموقع، ولا مؤقت، ولا يدخل المقالي دفتر الأخطاء ولا المستوى.</p>';
  CHS.forEach(function (c) {
    if (!c.les.length) return;
    var all = c.les.every(function (l) { return essaySel[l.id]; });
    h += '<div class="les-pick"><div class="les-pick-h"><b>' + esc(chLabel(c)) + '</b><button type="button" class="link" data-act="ess-ch" data-ch="' + c.id + '">' + (all ? 'ألغِ الفصل' : 'الفصل كله') + '</button></div>' +
      '<div class="pick soft" role="group" aria-label="' + esc(c.title) + '">' + c.les.map(function (l) {
        return '<button type="button" data-act="ess-les" data-l="' + l.id + '" aria-pressed="' + !!essaySel[l.id] + '"' + (l.essay.length ? '' : ' disabled') + '><span class="pk-box" aria-hidden="true">' + TICK + '</span><span>' + esc(l.title) + '<small>الدرس ' + l.no + ' · ص ' + esc(l.pages) + ' · ' + countWord(l.essay.length, W.ess) + '</small></span></button>';
      }).join('') + '</div></div>';
  });
  var ok = nq > 0;
  h += '<p class="fin-msg">' + (ok ? 'في الرسالة ' + countWord(nq, W.ess) + ' من ' + countWord(ls.length, W.les) + '، بترتيب الدروس، مع نقاط أجوبتها النموذجية وصفحاتها.' : 'اختر درساً فيه أسئلة مقالية.') + '</p>' +
    '<div class="row"><button type="button" class="btn" data-act="copy-essay"' + (ok ? '' : ' disabled') + '>انسخ رسالة الاختبار المقالي</button>' +
    '<button type="button" class="btn ghost" data-act="copy-new"' + (ls.length ? '' : ' disabled') + '>انسخ طلب أسئلة مقالية جديدة</button></div>' +
    (ok ? '<details class="pre"><summary>اعرض الرسالة لتنسخها بيدك إن تعذّر النسخ</summary><textarea class="essay-pre" readonly aria-label="رسالة الاختبار المقالي">' + esc(essayMessage(ls)) + '</textarea></details>' : '') +
  '</section>';
  return h;
}
function bankHTML() {
  selInit();
  var mk = mistakes().length;
  return '<div class="block-head"><h2>بنك الأسئلة</h2><span class="chip">' + countWord(QL.length, W.q) + ' · ' + countWord(EL.length, W.ess) + '</span></div>' +
    '<div class="seg" role="group" aria-label="نوع الاختبار"><button type="button" data-act="bank-kind" data-k="obj" aria-pressed="' + (bankKind === 'obj') + '">اختبار موضوعي</button><button type="button" data-act="bank-kind" data-k="essay" aria-pressed="' + (bankKind === 'essay') + '">اختبار مقالي</button></div>' +
    (bankKind === 'obj' ? '<p class="muted small p0">صح وخطأ، واختيار من متعدد، وضع الكلمة الصحيحة، من فصل واحد أو أكثر.</p>' + roundBanner() + objSetup() +
      '<section class="card"><div class="block-head"><h3>دفتر الأخطاء</h3><span class="chip">' + countWord(mk, W.q) + '</span></div><p class="muted small p0">يدخله كل سؤال موضوعي أخطأت فيه، ويخرج منه بعد إجابتين صحيحتين في يومين مختلفين.</p>' +
      '<button type="button" class="btn ghost wide" data-go="#nb">افتح الدفتر</button></section>'
    : essaySetup());
}
function startQuiz(ids, label, mode, les) {
  ids = ids.filter(function (id) { return Q[id]; });
  if (!ids.length) { toast('لا أسئلة هنا'); return; }
  quiz = { ids: ids, i: 0, picked: null, results: [], label: label, mode: mode || 'bank', les: les || null, order: {}, nb0: {}, lastRes: null, fin: false, rounds: [], quitArmed: false,
    exitWasPass: mode === 'exit' && les ? exitPassed(les) : false };
  go('#quiz');
}
var KQ = { tf: 'صح أم خطأ', mcq: 'اختيار من متعدد', fill: 'ضع الكلمة الصحيحة' };
function qText(q) {
  var t = esc(q.q);
  return q.k === 'fill' ? t.replace(/_{3,}/g, '<span class="blank" aria-label="فراغ">' + (quiz.picked !== null ? esc(q.a) : '؟') + '</span>') : t;
}
function isRight(q, v) {
  if (q.k === 'tf') return (v === 1) === !!q.a;
  if (q.k === 'mcq') return v === +q.a;
  return String(q.opts[v]).trim() === String(q.a).trim();
}
function rightIndex(q) {
  if (q.k === 'mcq') return +q.a;
  if (q.k === 'fill') { for (var i = 0; i < q.opts.length; i++) if (String(q.opts[i]).trim() === String(q.a).trim()) return i; }
  return -1;
}
function runHTML() {
  if (quiz.i >= quiz.ids.length) return resultHTML();
  var q = Q[quiz.ids[quiz.i]], n = quiz.ids.length, answered = quiz.picked !== null;
  if (!(q.id in quiz.nb0)) quiz.nb0[q.id] = inNb(q.id);
  var h = '<div class="block-head"><h2>' + esc(quiz.label) + '</h2><button type="button" class="link" data-act="quit">' + (quiz.quitArmed ? 'اضغط مرة أخرى للإنهاء' : 'إنهاء') + '</button></div>' +
    '<div class="qbar"><div class="track"><div class="fill" style="width:' + Math.round(100 * quiz.i / n) + '%"></div></div><span class="n">' + (quiz.i + 1) + ' من ' + n + '</span></div>' +
    '<div class="chips"><span class="chip">' + KQ[q.k] + '</span><span class="chip">' + esc(q.ch.title) + '</span><span class="chip">الدرس ' + q.les.no + '</span>' + (quiz.nb0[q.id] ? '<span class="chip">من دفتر الأخطاء</span>' : '') + expChip(q) + '</div>';
  var b = '<p class="q-text">' + qText(q) + '</p>';
  if (q.k === 'tf') {
    b += '<div class="tf">' + [[1, 'صح'], [0, 'خطأ']].map(function (t) {
      var cls = 'opt', v = t[0] === 1;
      if (answered) { if (v === !!q.a) cls += ' is-right'; else if (quiz.picked === t[0]) cls += ' is-wrong'; }
      return '<button type="button" class="' + cls + '" data-act="answer" data-v="' + t[0] + '"' + (answered ? ' disabled' : '') + '>' + t[1] + '</button>';
    }).join('') + '</div>';
  } else {
    if (!quiz.order[q.id]) quiz.order[q.id] = shuffle(q.opts.map(function (_, i) { return i; }));
    var ri = rightIndex(q);
    b += '<div class="opts">' + quiz.order[q.id].map(function (oi, k) {
      var cls = 'opt';
      if (answered) { if (oi === ri) cls += ' is-right'; else if (oi === quiz.picked) cls += ' is-wrong'; }
      return '<button type="button" class="' + cls + '" data-act="answer" data-v="' + oi + '"' + (answered ? ' disabled' : '') + '><span class="k">' + 'أبجد'.charAt(k) + '</span><span>' + esc(q.opts[oi]) + '</span></button>';
    }).join('') + '</div>';
  }
  if (answered) {
    var ok = quiz.results[quiz.results.length - 1];
    b += '<p class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'إجابة صحيحة' : 'إجابة خاطئة') + '</p>' + nbNote(quiz.lastRes, ok) +
      (q.why ? '<p class="why">' + rich(q.why) + pg(q.pg) + '</p>' : '<p class="why">' + pg(q.pg) + '</p>') +
      quiz.rounds.map(function (t) { return '<p class="fin-msg ok">' + esc(t) + '</p>'; }).join('') +
      '<div class="row"><button type="button" class="btn" data-act="next">' + (quiz.i + 1 < n ? 'السؤال التالي' : 'النتيجة') + '</button></div>';
  }
  if (quiz.quitArmed) h += '<p class="warn">' + (quiz.mode === 'exit' && quiz.results.length ? 'إن أنهيت الآن حُسبت المحاولة، وما لم تجب عنه يُعدّ خطأ.' : 'إن أنهيت الآن بقي ما أجبت عنه محفوظاً.') + ' اضغط «إنهاء» مرة أخرى للتأكيد.</p>';
  return h + '<section class="card" data-q="' + esc(q.id) + '">' + b + '</section>';
}
function finishQuiz(partial) {
  if (quiz.fin) return; quiz.fin = true;
  var right = quiz.results.filter(Boolean).length, total = quiz.ids.length, pct = total ? Math.round(100 * right / total) : 0, l = LBY[quiz.les];
  quiz.pct = pct;
  if (quiz.mode === 'exit' && l) {
    var wasPass = quiz.exitWasPass;
    saveExit(l.id, pct, 'exit');
    var marked = false;
    if (!learned(l.id) && (!partial || pct >= PASS)) { markLearned(l.id); marked = true; }
    var tail = marked ? (pct >= PASS ? ' وسُجّل الدرس متعلَّماً في الجدول، ويعود إليك للتسميع في يومين مختلفين.' : ' وسُجّل الدرس متعلَّماً في الجدول، وعليه علامة «ينقصه تسميع الخروج» حتى تجتازه.') : '';
    if (wasPass) quiz.finMsg = { ok: pct >= PASS, t: 'بلغت ' + pct + '%، وقد اجتزت تسميع الخروج من قبل، فلا تتغير علامته.' };
    else if (pct >= PASS) quiz.finMsg = { ok: true, t: 'اجتزت تسميع الخروج.' + tail };
    else quiz.finMsg = { ok: false, t: 'لم تبلغ ' + PASS + '%' + (partial ? '، وحُسبت المحاولة على أسئلة الدرس كلها، وما لم تجب عنه خطأ' : '') + '. تُعاد في يوم آخر لا اليوم.' + tail };
  } else if (quiz.mode === 'recall' && l) {
    if (!passedToday(l.id)) schDone(l.id, 'recall');
    var cleared = exitNeeded(l) && !exitPassed(l.id) && total === l.objective.length && pct >= PASS && saveExit(l.id, pct, 'recall');
    quiz.finMsg = { ok: true, t: 'سُجّل تسميع الدرس في الجدول.' + (cleared ? ' وبلغت ' + pct + '% في أسئلته كلها، فزالت علامة «ينقصه تسميع الخروج».' : '') };
  } else if (quiz.mode === 'review') {
    if (!passedToday('_review')) schDone('_review', 'review');
    quiz.finMsg = { ok: true, t: 'سُجّلت المراجعة الشاملة في الجدول.' };
  }
}
function resultHTML() {
  finishQuiz(false);
  var right = quiz.results.filter(Boolean).length, n = quiz.results.length, total = quiz.ids.length, pct = n ? Math.round(100 * right / n) : 0;
  if (quiz.mode === 'exit') pct = quiz.pct;
  var by = {};
  quiz.ids.slice(0, n).forEach(function (id, i) { var c = Q[id].ch.id; by[c] = by[c] || { n: 0, c: 0 }; by[c].n++; if (quiz.results[i]) by[c].c++; });
  var rows = Object.keys(by).map(function (c) { var x = by[c], p = Math.round(100 * x.c / x.n); return '<div class="lvl-row"><span class="lvl-no">' + CH[c].n + '</span><div class="nm">' + esc(chLabel(CH[c])) + '</div><span class="pill ' + level({ n: 10, pct: p }).k + '">' + x.c + ' من ' + x.n + '</span></div>'; }).join('');
  var mk = mistakes().length, l = LBY[quiz.les], nav;
  if (quiz.mode === 'exit' && l) { var nx = LES[LES.indexOf(l) + 1]; nav = '<a class="btn" href="#l-' + l.n + '">إلى الدرس</a>' + (nx ? '<a class="btn ghost" href="#l-' + nx.n + '">الدرس التالي</a>' : ''); }
  else if (quiz.mode === 'recall' || quiz.mode === 'review') nav = '<a class="btn" href="#home">الرئيسية</a><button type="button" class="btn ghost" data-go="#nb">دفتر الأخطاء (' + mk + ')</button>';
  else nav = '<button type="button" class="btn" data-act="new-quiz">اختبار جديد</button><button type="button" class="btn ghost" data-go="#nb">دفتر الأخطاء (' + mk + ')</button>';
  return '<div class="block-head"><h2>النتيجة</h2><span class="chip">' + esc(quiz.label) + '</span></div><section class="card"><div class="score">' + pct + '%</div>' +
    '<p class="muted p0">' + right + ' صحيحة من ' + (quiz.mode === 'exit' ? total : n) + (n < total && quiz.mode !== 'exit' ? ' (أنهيت قبل آخر الأسئلة)' : '') + '</p>' +
    (quiz.finMsg ? '<p class="fin-msg ' + (quiz.finMsg.ok ? 'ok' : 'bad') + '">' + esc(quiz.finMsg.t) + '</p>' : '') +
    (rows ? '<div class="res-rows">' + rows + '</div>' : '') + '</section>' +
    '<div class="row">' + nav + '</div>';
}

/* دفتر الأخطاء */
var nbCh = 'all';
function nbHTML() {
  var list = mistakes(nbCh === 'all' ? null : nbCh);
  var h = '<div class="block-head"><h2>دفتر الأخطاء</h2><span class="chip">' + countWord(mistakes().length, W.q) + '</span></div>' +
    '<p class="muted small p0">كل سؤال موضوعي أخطأت فيه يُحفظ هنا، ويخرج حين تجيب عنه صواباً في يومين مختلفين، فالإجابتان في يوم واحد تُحسبان واحدة، والخطأ بعدهما يعيد العدّ.</p>' +
    chBar('nb-ch', nbCh, true, function (c) { return ' (' + mistakes(c.id).length + ')'; }) +
    '<button type="button" class="btn wide" data-act="start-nb"' + (list.length ? '' : ' disabled') + '>أعد أسئلة الدفتر' + (list.length ? ': ' + countWord(list.length, W.q) : '') + '</button>';
  if (!list.length) return h + '<div class="empty"><b>الدفتر فارغ</b><br>' + (Object.keys(S.q).length ? 'أتقنت ما أخطأت فيه هنا.' : 'حين تخطئ في سؤال يظهر هنا لتعيده.') + '</div>';
  return h + list.map(function (q) {
    var r = S.q[q.id] || {}, ri = rightIndex(q), ans = q.k === 'tf' ? (q.a ? 'صح' : 'خطأ') : (ri > -1 ? q.opts[ri] : q.a);
    return '<article class="art"><div class="chips"><span class="chip">' + KQ[q.k] + '</span><span class="chip">' + esc(q.ch.title) + ' · الدرس ' + q.les.no + '</span>' + pg(q.pg) + '</div>' +
      '<p class="p0 strong">' + esc(q.q) + '</p><p class="p0 small">الصواب: <b>' + esc(ans) + '</b></p>' + (q.why ? '<p class="why small">' + rich(q.why) + '</p>' : '') +
      '<p class="nb-note">' + (+r.s ? 'أصبت فيه مرة في يوم سابق، وبقيت إجابة صحيحة في يوم آخر.' : 'يخرج بإجابتين صحيحتين في يومين مختلفين.') + ' أخطأت فيه ' + ((+r.n || 0) - (+r.c || 0) === 1 ? 'مرة' : ((+r.n || 0) - (+r.c || 0) === 2 ? 'مرتين' : ((+r.n || 0) - (+r.c || 0)) + ' مرات')) + '.</p></article>';
  }).join('');
}

/* ---------- المراجعة: البطاقات والمقارنات والخرائط والليلة الأخيرة ---------- */
function revHTML() {
  var subs = [['cards', 'البطاقات'], ['cmp', 'المقارنات'], ['maps', 'الخرائط'], ['night', 'الليلة الأخيرة']];
  if (!subs.some(function (s) { return s[0] === revSub; })) revSub = 'cards';
  var h = '<div class="seg" role="group" aria-label="أدوات المراجعة">' + subs.map(function (s) {
    return '<button type="button" data-act="rev-sub" data-sub="' + s[0] + '" aria-pressed="' + (revSub === s[0]) + '">' + s[1] + '</button>';
  }).join('') + '</div>';
  if (revSub === 'cards') return h + cardsBrowser();
  if (revSub === 'cmp') {
    var any = false;
    CHS.forEach(function (c) { if (!c.tables.length) return; any = true; h += '<p class="sec-title">' + esc(chLabel(c)) + '</p>' + c.tables.map(cmpHTML).join(''); });
    return h + (any ? '' : '<div class="empty">لم تصل جداول المقارنة بعد.</div>');
  }
  if (revSub === 'maps') {
    var ms = CHS.filter(hasMap);
    return h + '<p class="muted small p0">تُفتح الخريطة على الشاشة كلها: حرّكها بإصبع في كل اتجاه، وقرّب أو بعّد بإصبعين، والمس العنوان الذي عليه علامة + ليظهر شرحه.</p>' +
      (ms.length ? '<ol class="les-list">' + ms.map(function (c) {
        return '<li><button type="button" class="les-row as-btn" data-act="map" data-ch="' + c.id + '"><span class="les-no">' + c.n + '</span><span class="les-tx"><b>' + esc(c.name) + '</b><span>' + esc(c.title) + ' · ص ' + esc(c.pages) + '</span></span>' + GO + '</button></li>';
      }).join('') + '</ol>' : '<div class="empty">لم تصل الخرائط الذهنية بعد.</div>');
  }
  var e = examISO();
  return h + '<p class="muted small p0">صفحة واحدة ' + (e ? 'لليلة ' + esc(dayName(e)) : 'لليلة الاختبار') + ': أكثر ما يُسأل عنه من الأعداد والقوائم والفروق الحاسمة.</p>' + nightHTML();
}

/* ---------- جداول المقارنة: كاملة مصغّرة على الجوال، وتُكبَّر بإصبعين أو بالزرين، ووضع اختبار ---------- */
function cmpHTML(t) {
  var cols = arr(t.cols), rows = arr(t.rows);
  return '<section class="cmp" id="t-' + esc(t.id) + '"><div class="cmp-top"><h4>' + esc(t.title) + pg(t.pg) + expChip(t) + '</h4><button type="button" class="mini" data-act="cmp-test" aria-pressed="false">اختبر نفسي</button></div>' +
    '<div class="zf"><table class="cmp-t"><thead><tr>' + cols.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    rows.map(function (r) { r = arr(r); return '<tr>' + cols.map(function (_, i) { var c = r[i] == null ? '' : r[i]; return i === 0 ? '<th scope="row">' + esc(c) + '</th>' : '<td data-act="cell">' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
    (t.core ? '<tr class="core"><th scope="row">الفرق الجوهري</th><td data-act="cell" colspan="' + Math.max(1, cols.length - 1) + '">' + esc(t.core) + '</td></tr>' : '') +
    '</tbody></table></div>' +
    '<div class="zbar"><span class="hint test-hint">املأ الخانة من ذاكرتك، ثم المسها لتنكشف</span><span class="hint zoom-hint">قرّب بإصبعين أو بالزرين</span>' +
    '<button type="button" class="mini" data-act="cmp-all" hidden>اكشف الكل</button>' +
    '<button type="button" class="zbtn" data-act="zoom" data-d="-1" aria-label="تصغير الجدول">−</button><button type="button" class="zbtn" data-act="zoom" data-d="1" aria-label="تكبير الجدول">+</button>' +
    '<button type="button" class="zbtn" data-act="zoom" data-d="0" aria-label="الجدول كله">' + FIT + '</button></div></section>';
}
function fitTables() {
  view.querySelectorAll('.zf').forEach(function (f) {
    var t = f.querySelector('table'); if (!t) return;
    var core = t.querySelector('tr.core');
    t.style.zoom = 1; t.style.width = 'max-content';
    if (core) core.style.display = 'none';
    var w = t.offsetWidth, avail = f.clientWidth;
    if (core) core.style.display = '';
    if (!w || !avail) return;
    if (w <= avail) { t.style.width = '100%'; f._fit = 1; f._z = 1; return; }
    t.style.width = w + 'px';
    var fit = Math.max(.2, avail / w);
    f._fit = fit; f._z = fit; t.style.zoom = fit;
  });
}
function setZoom(f, z, cx, cy) {
  var t = f.querySelector('table'); if (!t) return;
  var z0 = f._z || 1; z = clamp(z, f._fit || .2, 2.5); if (Math.abs(z - z0) < .001) return;
  var r = f.getBoundingClientRect(), rtl = getComputedStyle(f).direction === 'rtl';
  var px = cx == null ? f.clientWidth / 2 : cx - r.left, py = cy == null ? Math.min(f.clientHeight, window.innerHeight) / 2 : cy - r.top;
  var left = rtl ? f.scrollWidth - f.clientWidth + f.scrollLeft : f.scrollLeft, k = z / z0;
  t.style.zoom = z; f._z = z;
  var nl = (left + px) * k - px;
  f.scrollLeft = rtl ? nl - (f.scrollWidth - f.clientWidth) : nl;
  if (f.scrollHeight > f.clientHeight) f.scrollTop = (f.scrollTop + py) * k - py;
}

/* ---------- الخريطة الذهنية: على الشاشة كلها، وتحريك حرّ بإصبع، وتقريب بإصبعين ---------- */
var mapEl = document.getElementById('mapView'), MAP = null;
function mmNode(n, lvl, path) {
  var hasD = !!(n.d && String(n.d).trim()), cls = 'mm-node ' + (lvl === 0 ? 'mm-root' : 'mm-l' + Math.min(lvl, 3)) + (hasD ? ' has-d' : '');
  var meta = (n.pg ? '<span class="mm-pg">ص ' + esc(n.pg) + '</span>' : '') + (hasD ? '<span class="mm-plus" aria-hidden="true">+</span>' : '');
  var inner = '<span class="mm-h">' + esc(n.t) + '</span>' + (meta ? '<span class="mm-meta">' + meta + '</span>' : '') + (hasD ? '<span class="mm-d">' + esc(n.d) + '</span>' : '');
  return hasD ? '<button type="button" class="' + cls + '" data-mm="' + path + '" aria-expanded="false">' + inner + '</button>' : '<div class="' + cls + '">' + inner + '</div>';
}
function mmTree(n, lvl, path, branch) {
  var kids = arr(n.c).filter(function (k) { return k && k.t; });
  var style = lvl === 1 ? ' style="--bc:var(--b' + (branch % 6 + 1) + ')"' : '';
  return '<div class="mm-sub"' + style + '>' + mmNode(n, lvl, path) +
    (kids.length ? '<div class="mm-kids">' + kids.map(function (k, i) { return mmTree(k, lvl + 1, path + '.' + i, lvl === 0 ? i : branch); }).join('') + '</div>' : '') + '</div>';
}
function mmApply() { if (MAP) MAP.world.style.transform = 'translate(' + MAP.tx + 'px,' + MAP.ty + 'px) scale(' + MAP.s + ')'; }
function mmClamp() {
  var m = MAP, w = m.world.offsetWidth * m.s, h = m.world.offsetHeight * m.s, sw = m.stage.clientWidth, sh = m.stage.clientHeight, keep = 80;
  m.tx = clamp(m.tx, keep - w, sw - keep); m.ty = clamp(m.ty, keep - h, sh - keep);
}
function mmZoomAt(s, cx, cy) {
  var m = MAP; s = clamp(s, m.min, 2.6);
  var wx = (cx - m.tx) / m.s, wy = (cy - m.ty) / m.s;
  m.s = s; m.tx = cx - wx * s; m.ty = cy - wy * s; mmClamp(); mmApply();
}
function mapFit() {
  var m = MAP, sw = m.stage.clientWidth, sh = m.stage.clientHeight, ww = m.world.offsetWidth, wh = m.world.offsetHeight;
  var s = Math.min(sw / ww, sh / wh, 1); m.min = Math.min(.25, s);
  m.s = s; m.tx = (sw - ww * s) / 2; m.ty = (sh - wh * s) / 2; mmApply();
}
/* تقريب متدرج إلى موضع، للمسة على الخريطة وهي مصغّرة */
function mmAnimate(s1, cx, cy) {
  var m = MAP; if (!m) return;
  var s0 = m.s, tx0 = m.tx, ty0 = m.ty, wx = (cx - tx0) / s0, wy = (cy - ty0) / s0, t0 = 0, D = 260;
  s1 = clamp(s1, m.min, 2.6);
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame(ts) {
    if (!MAP || MAP !== m) return;
    if (!t0) t0 = ts;
    var k = reduce ? 1 : Math.min(1, (ts - t0) / D), e = 1 - Math.pow(1 - k, 3), s = s0 + (s1 - s0) * e;
    m.s = s; m.tx = cx - wx * s; m.ty = cy - wy * s; mmClamp(); mmApply();
    if (k < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function drawEdges() {
  var m = MAP; if (!m) return;
  var wr = m.world.getBoundingClientRect(), s = m.s, out = '';
  function box(el) { var r = el.getBoundingClientRect(); return { l: (r.left - wr.left) / s, r: (r.right - wr.left) / s, t: (r.top - wr.top) / s, b: (r.bottom - wr.top) / s }; }
  m.world.querySelectorAll('.mm-sub').forEach(function (sub) {
    var node = sub.firstElementChild, kids = sub.children[1]; if (!kids) return;
    var p = box(node), x1 = p.l, y1 = (p.t + p.b) / 2;
    Array.prototype.forEach.call(kids.children, function (ks) {
      var cn = ks.firstElementChild, c = box(cn), x2 = c.r, y2 = (c.t + c.b) / 2, dx = Math.max(16, (x1 - x2) / 2);
      var col = getComputedStyle(cn).getPropertyValue('--bc').trim() || getComputedStyle(document.body).getPropertyValue('--accent').trim();
      out += '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' C' + (x1 - dx).toFixed(1) + ' ' + y1.toFixed(1) + ' ' + (x2 + dx).toFixed(1) + ' ' + y2.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '" stroke="' + esc(col) + '" stroke-opacity=".6"/>';
    });
  });
  m.svg.setAttribute('width', m.world.offsetWidth); m.svg.setAttribute('height', m.world.offsetHeight);
  m.svg.innerHTML = out;
}
/* فتح الشرح أو إغلاقه يعيد ترتيب الخريطة، ويبقى العنوان الملموس في مكانه من الشاشة */
function mmToggle(btn, force) {
  var m = MAP; if (!m || !btn) return;
  var before = btn.getBoundingClientRect(), open = force == null ? !btn.classList.contains('open') : force;
  btn.classList.toggle('open', open); btn.setAttribute('aria-expanded', open);
  var after = btn.getBoundingClientRect();
  m.tx += before.right - after.right; m.ty += before.top - after.top; mmApply();
  if (open) {
    var r = btn.getBoundingClientRect(), st = m.stage.getBoundingClientRect(), pad = 10, dx = 0, dy = 0;
    if (r.width < st.width - 2 * pad) { if (r.left < st.left + pad) dx = st.left + pad - r.left; else if (r.right > st.right - pad) dx = st.right - pad - r.right; }
    if (r.height < st.height - 2 * pad) { if (r.bottom > st.bottom - pad) dy = st.bottom - pad - r.bottom; if (r.top + dy < st.top + pad) dy = st.top + pad - r.top; }
    if (dx || dy) { m.tx += dx; m.ty += dy; mmApply(); }
  }
  drawEdges();
}
function mmAll(open) {
  var m = MAP; if (!m) return;
  m.world.querySelectorAll('.mm-node.has-d').forEach(function (b) { b.classList.toggle('open', open); b.setAttribute('aria-expanded', open); });
  m.allOpen = open; drawEdges();
  var b = mapEl.querySelector('[data-mmact="all"]'); if (b) b.textContent = open ? 'أغلق الشروح' : 'افتح الشروح';
}
function hideHint() { var h = mapEl.querySelector('.mm-hint'); if (h) h.classList.add('gone'); }
function openMap(chId, fromHistory) {
  var c = CH[chId]; if (!hasMap(c)) { toast('لم تصل خريطة هذا الفصل بعد'); return; }
  var hasAnyD = JSON.stringify(c.map).indexOf('"d"') > -1;
  mapEl.innerHTML = '<div class="mm-bar"><button type="button" class="icon-btn quiet" data-mmact="close" aria-label="إغلاق الخريطة">' + CLOSE + '</button>' +
    '<div class="mm-title"><b>' + esc(c.name) + '</b><span>الخريطة الذهنية · ' + esc(c.title) + ' · ص ' + esc(c.pages) + '</span></div>' +
    (hasAnyD ? '<button type="button" class="btn ghost" data-mmact="all">افتح الشروح</button>' : '') + '</div>' +
    '<div class="mm-stage" role="application" aria-label="الخريطة الذهنية: حرّكها بإصبع، وقرّبها بإصبعين"><div class="mm-world" dir="rtl"><svg class="mm-svg" aria-hidden="true"></svg>' + mmTree(c.map, 0, 'r', 0) + '</div>' +
    '<div class="mm-tools"><button type="button" data-mmact="in" aria-label="تكبير"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>' +
    '<button type="button" data-mmact="out" aria-label="تصغير"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg></button>' +
    '<button type="button" data-mmact="fit" aria-label="الخريطة كلها">' + FIT + '</button></div>' +
    '<p class="mm-hint">المس موضعاً لتقرّبه، أو قرّب وبعّد بإصبعين، وحرّك الخريطة بإصبع في كل اتجاه' + (hasAnyD ? '. والعنوان الذي عليه + يُفتح شرحه بلمسة' : '') + '.</p></div>';
  mapEl.hidden = false; document.documentElement.classList.add('map-open');
  var stage = mapEl.querySelector('.mm-stage');
  MAP = { ch: chId, stage: stage, world: mapEl.querySelector('.mm-world'), svg: mapEl.querySelector('.mm-svg'), s: 1, tx: 0, ty: 0, min: .25, pts: {}, allOpen: false, pushed: !fromHistory };
  if (!fromHistory) { try { history.pushState({ law136map: chId }, ''); } catch (e) { MAP.pushed = false; } }
  mapFit(); drawEdges();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (MAP && MAP.stage === stage) drawEdges(); });
  setTimeout(hideHint, 6000);
  var x = mapEl.querySelector('[data-mmact="close"]'); if (x) x.focus();
}
function closeMap(viaHistory) {
  if (!MAP) return;
  var pushed = MAP.pushed; MAP = null;
  mapEl.hidden = true; mapEl.innerHTML = ''; document.documentElement.classList.remove('map-open');
  if (!viaHistory && pushed) { try { history.back(); } catch (e) {} }
}
/* اللمس: إصبع للتحريك، وإصبعان للتقريب حول موضعهما، واللمسة القصيرة تفتح الشرح */
function mmDist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy) || 1; }
function mmLocal(e) { var r = MAP.stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
var lastTap = null;
mapEl.addEventListener('pointerdown', function (e) {
  if (!MAP || !e.target.closest('.mm-stage') || e.target.closest('.mm-tools')) return;
  var m = MAP, p = mmLocal(e); m.pts[e.pointerId] = p;
  try { m.stage.setPointerCapture(e.pointerId); } catch (er) {}
  var ids = Object.keys(m.pts);
  if (ids.length === 1) { m.pan = { x: p.x, y: p.y, tx: m.tx, ty: m.ty }; m.tap = { id: e.pointerId, x: p.x, y: p.y, t: now(), node: e.target.closest('.mm-node.has-d') }; }
  else if (ids.length === 2) {
    var a = m.pts[ids[0]], b = m.pts[ids[1]];
    m.pinch = { d: mmDist(a, b), s: m.s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, tx: m.tx, ty: m.ty }; m.tap = null; m.pan = null;
  }
  m.stage.classList.add('grabbing', 'moving'); hideHint();
});
mapEl.addEventListener('pointermove', function (e) {
  var m = MAP; if (!m || !(e.pointerId in m.pts)) return;
  var p = mmLocal(e); m.pts[e.pointerId] = p;
  var ids = Object.keys(m.pts);
  if (ids.length >= 2 && m.pinch) {
    var a = m.pts[ids[0]], b = m.pts[ids[1]], pi = m.pinch, s = clamp(pi.s * mmDist(a, b) / pi.d, m.min, 2.6);
    var wx = (pi.mx - pi.tx) / pi.s, wy = (pi.my - pi.ty) / pi.s, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    m.s = s; m.tx = mx - wx * s; m.ty = my - wy * s; mmClamp(); mmApply();
  } else if (m.pan) {
    if (m.tap && Math.abs(p.x - m.tap.x) + Math.abs(p.y - m.tap.y) > 8) m.tap = null;
    m.tx = m.pan.tx + (p.x - m.pan.x); m.ty = m.pan.ty + (p.y - m.pan.y); mmClamp(); mmApply();
  }
});
function mmUp(e) {
  var m = MAP; if (!m || !(e.pointerId in m.pts)) return;
  var p = m.pts[e.pointerId]; delete m.pts[e.pointerId];
  var ids = Object.keys(m.pts);
  if (ids.length === 1) { var q = m.pts[ids[0]]; m.pinch = null; m.pan = { x: q.x, y: q.y, tx: m.tx, ty: m.ty }; m.tap = null; return; }
  if (ids.length) return;
  m.stage.classList.remove('grabbing', 'moving'); m.pan = null; m.pinch = null;
  var t = m.tap; m.tap = null;
  if (!t || t.id !== e.pointerId || e.type === 'pointercancel' || now() - t.t > 600) return;
  /* والخريطة مصغّرة لا تُقرأ: اللمسة تقرّب موضعها، ثم تفتح الشرح بلمسة أخرى */
  if (m.s < .55) { lastTap = null; hideHint(); mmAnimate(1, p.x, p.y); return; }
  if (t.node) { mmToggle(t.node); lastTap = null; return; }
  /* لمستان سريعتان على الفراغ: تقريب، ثم الخريطة كلها */
  if (lastTap && now() - lastTap.t < 320 && Math.abs(p.x - lastTap.x) + Math.abs(p.y - lastTap.y) < 30) {
    lastTap = null; if (m.s >= 1.6) mapFit(); else mmZoomAt(m.s * 1.8, p.x, p.y);
  } else lastTap = { t: now(), x: p.x, y: p.y };
}
mapEl.addEventListener('pointerup', mmUp);
mapEl.addEventListener('pointercancel', mmUp);
mapEl.addEventListener('wheel', function (e) {
  var m = MAP; if (!m || !e.target.closest('.mm-stage')) return;
  e.preventDefault(); hideHint();
  var p = mmLocal(e);
  if (e.ctrlKey || e.metaKey) mmZoomAt(m.s * Math.exp(-e.deltaY * .01), p.x, p.y);
  else { m.tx -= e.deltaX; m.ty -= e.deltaY; mmClamp(); mmApply(); }
}, { passive: false });
mapEl.addEventListener('click', function (e) {
  var b = e.target.closest('[data-mmact]');
  if (b) {
    var a = b.getAttribute('data-mmact'), m = MAP; if (!m) return;
    if (a === 'close') closeMap(false);
    else if (a === 'all') mmAll(!m.allOpen);
    else if (a === 'fit') mapFit();
    else mmZoomAt(m.s * (a === 'in' ? 1.35 : 1 / 1.35), m.stage.clientWidth / 2, m.stage.clientHeight / 2);
    hideHint(); return;
  }
  /* لوحة المفاتيح: Enter أو المسافة على العنوان (detail = 0)، واللمس يعالجه pointerup */
  var n = e.target.closest('.mm-node.has-d'); if (n && e.detail === 0) mmToggle(n);
});
mapEl.addEventListener('keydown', function (e) {
  var m = MAP; if (!m) return;
  if (e.key === 'Escape') { e.preventDefault(); closeMap(false); return; }
  var step = 60, k = e.key;
  if (k === '+' || k === '=') mmZoomAt(m.s * 1.25, m.stage.clientWidth / 2, m.stage.clientHeight / 2);
  else if (k === '-') mmZoomAt(m.s / 1.25, m.stage.clientWidth / 2, m.stage.clientHeight / 2);
  else if (k === 'ArrowLeft') { m.tx += step; mmClamp(); mmApply(); }
  else if (k === 'ArrowRight') { m.tx -= step; mmClamp(); mmApply(); }
  else if (k === 'ArrowUp') { m.ty += step; mmClamp(); mmApply(); }
  else if (k === 'ArrowDown') { m.ty -= step; mmClamp(); mmApply(); }
  else return;
  e.preventDefault();
});
document.addEventListener('gesturestart', function (e) { if (MAP || (e.target.closest && e.target.closest('.zf'))) e.preventDefault(); });
window.addEventListener('popstate', function () { if (MAP) closeMap(true); });

/* ---------- الإعدادات المستترة: رابط الجدول وأدوات نادرة الاستعمال ---------- */
var sheet = document.getElementById('sheet'), sheetBack = null;
function settingsHTML() {
  var e = examISO(), href = (INFO && INFO.scheduleUrl) || (SCH && SCH.base ? SCH.base + '#settings' : '../#settings');
  var rounds = CHS.filter(function (c) { return c.qs.length; }).map(function (c) {
    var b = bankOf(c.id), sv = bankSolved(c);
    return '<div class="lvl-row"><span class="lvl-no">' + c.n + '</span><div><div class="nm">' + esc(c.title) + ' · الجولة ' + b.r + '</div><div class="ct">حللت ' + sv + ' من ' + c.qs.length + (b.last ? ' · الجولة السابقة: ' + b.last.ok + ' من ' + b.last.n : '') + '</div></div>' +
      '<button type="button" class="btn ghost sm" data-act="new-round" data-ch="' + c.id + '"' + (sv ? '' : ' disabled') + '>' + (armed === 'round-' + c.id ? 'اضغط للتأكيد' : 'جولة جديدة') + '</button></div>';
  }).join('');
  return '<div class="sheet-in" role="dialog" aria-modal="true" aria-labelledby="set-h"><div class="block-head"><h2 id="set-h">الإعدادات</h2><button type="button" class="link" data-act="sheet-close">إغلاق</button></div>' +
    '<div class="set-row"><div><b>موعد الاختبار</b><p>' + (e ? esc(dayLabel(e)) + (tentative() ? '، وهو موعد مبدئي' : '') + '، من جدول الاختبارات.' : 'يصل من جدول الاختبارات حين تفتح الصفحة مع الاتصال.') + '</p></div><a class="btn ghost" href="' + esc(href) + '">تغيير الموعد من الجدول</a></div>' +
    '<div class="set-row"><div class="set-sub"><div><b>جولات بنك الأسئلة</b><p>تبدأ جولة الفصل الجديدة وحدها حين تحلّ أسئلته كلها، ويُقدَّم فيها ما أخطأت فيه. وهنا تبدؤها قبل ذلك. ولا يمسّ هذا دفتر الأخطاء ولا المستوى.</p></div>' + (rounds || '<p>لا أسئلة بعد.</p>') + '</div></div>' +
    '<div class="set-row"><div><b>حفظ التقدم</b><p>' + esc(ST.note()) + '</p></div><a class="btn ghost" href="?sync' + esc(location.hash) + '">مفتاح المزامنة لهذا الجهاز</a></div>' +
    '<div class="set-row"><div><b>البطاقات المعلّمة</b><p>تعيد كل البطاقات إلى «لم أعرفها».</p></div><button type="button" class="btn ghost" data-act="reset-known">' + (armed === 'known' ? 'اضغط للتأكيد' : 'امحُ علامات «أعرفها»') + '</button></div>' +
    '<div class="set-row"><div><b>البدء من جديد</b><p>يمحو الإجابات ودفتر الأخطاء والجولات والبطاقات وعلامات الدروس في هذا الموقع، ولا يمحو ما سُجّل في جدول الاختبارات.</p></div><button type="button" class="btn ghost" data-act="reset-all">' + (armed === 'all' ? 'اضغط للتأكيد' : 'امحُ تقدمي') + '</button></div>' +
    '</div>';
}
function openSettings() { armed = null; sheetBack = document.activeElement; sheet.innerHTML = settingsHTML(); sheet.hidden = false; var c = sheet.querySelector('[data-act="sheet-close"]'); if (c) c.focus(); }
function closeSettings() { sheet.hidden = true; armed = null; if (sheetBack && sheetBack.focus) sheetBack.focus(); }
function armOr(key, fn) {
  if (armed === key) { armed = null; fn(); } else { armed = key; setTimeout(function () { if (armed === key) { armed = null; if (!sheet.hidden) sheet.innerHTML = settingsHTML(); } }, 4000); }
  if (!sheet.hidden) sheet.innerHTML = settingsHTML();
}
sheet.addEventListener('click', function (e) {
  if (e.target === sheet || e.target.closest('[data-act="sheet-close"]')) { closeSettings(); return; }
  var b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  var a = b.getAttribute('data-act');
  if (a === 'new-round') { var c = CH[b.getAttribute('data-ch')]; armOr('round-' + c.id, function () { closeRound(c, true); ST.save(); toast('بدأت جولة جديدة في ' + c.title); render(); }); }
  else if (a === 'reset-known') armOr('known', function () { Object.keys(S.k).forEach(function (id) { if (known(id)) S.k[id] = { v: 0, t: now() }; }); ST.save(); toast('مُحيت علامات «أعرفها»'); render(); });
  else if (a === 'reset-all') armOr('all', function () { ST.reset(); S = ST.state(); quiz = null; DECK = null; toast('بدأت من جديد'); closeSettings(); render(); });
});
document.getElementById('setBtn').addEventListener('click', openSettings);

/* ---------- التنقل: لكل شيء عنوان، فروابط الجدول تفتح الدرس نفسه ---------- */
function parseHash() {
  var h = (location.hash || '').replace(/^#/, ''), m;
  if (!h || h === 'home') return ['home'];
  if (['plan', 'sum', 'quiz', 'rev', 'review', 'eve', 'nb'].indexOf(h) > -1) return [h];
  if ((m = /^l-(\d+)$/.exec(h))) return ['lesson', +m[1]];
  if ((m = /^r-(\d+)$/.exec(h))) return ['recall', +m[1]];
  if (h === 'deck') return [DECK ? 'deck' : 'rev'];
  return ['home'];
}
function route() {
  if (MAP) closeMap(true);
  var p = parseHash(); screen = p[0]; arg = p[1] || null;
  /* اختبار انتهى: يُعرض بعده البنك لا النتيجة القديمة */
  if (quiz && quiz.i >= quiz.ids.length) quiz = null;
  render(); window.scrollTo(0, 0);
}
function go(h) { if (location.hash === h) route(); else location.hash = h; }
window.addEventListener('hashchange', route);

/* ---------- الأحداث ---------- */
document.querySelector('.tabs').addEventListener('click', function (e) {
  var b = e.target.closest('[data-tab]'); if (!b) return;
  var t = b.getAttribute('data-tab'); if (t === 'quiz' && quiz && quiz.i >= quiz.ids.length) quiz = null;
  go('#' + t);
});
document.getElementById('mistakesBtn').addEventListener('click', function () { go('#nb'); });
function quitDest(md, l) {
  if (md === 'exit' && l) return '#l-' + l.n; if (md === 'recall' && l) return '#r-' + l.n;
  if (md === 'review') return '#review'; if (md === 'nb') return '#nb'; return '#quiz';
}
view.addEventListener('click', function (e) {
  var g = e.target.closest('[data-go]'); if (g && !g.disabled) { go(g.getAttribute('data-go')); return; }
  var el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  var act = el.getAttribute('data-act'), n = +el.getAttribute('data-n') || 0, l = n ? lesByN(n) : null, ch = el.getAttribute('data-ch'), q, i, ids;
  switch (act) {
    case 'tick': {
      var lid = el.getAttribute('data-l'), kd = el.getAttribute('data-k'), on = el.getAttribute('aria-checked') === 'true';
      if (kd === 'learn') { if (on) unmarkLearned(lid); else markLearned(lid); }
      else if (on) schUndo(lid); else schDone(lid, kd);
      if (!on && kd === 'learn' && LBY[lid] && exitFlag(LBY[lid])) toast('سُجّل متعلَّماً، وعليه علامة «ينقصه تسميع الخروج» حتى تجتازه');
      render(); return;
    }
    case 'start-small': startSmall(); return;
    case 'exit-quiz':
      if (!l) return;
      if (exitRunning(l.id)) { go('#quiz'); return; }
      if (exitBlocked(l.id)) { toast('تُعاد المحاولة في يوم آخر'); return; }
      startQuiz(shuffle(l.objective.map(function (x) { return x.id; })), 'تسميع الخروج: ' + l.title, 'exit', l.id); return;
    case 'goto-exit': { var bx = document.getElementById('exit-box'); if (bx) bx.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    case 'learn-skip': if (l) { markLearned(l.id); render(); toast('سُجّل الدرس متعلَّماً في الجدول' + (exitFlag(l) ? '، وعليه علامة «ينقصه تسميع الخروج» حتى تجتازه' : '')); } return;
    case 'learn-undo': if (l) { unmarkLearned(l.id); render(); } return;
    case 'deck-lesson':
      if (l) { var then = el.getAttribute('data-then'); openDeck(l.cards.map(function (k) { return k.id; }), (then ? 'تسميع: ' : 'بطاقات: ') + l.title, then ? '#r-' + l.n : '#l-' + l.n, then, l.id); }
      return;
    case 'recall-quiz': if (l) startQuiz(prioritized(l.objective).map(function (x) { return x.id; }), 'تسميع: ' + l.title, 'recall', l.id); return;
    case 'recall-mark': if (l) { schDone(l.id, 'recall'); render(); toast('سُجّل التسميع في الجدول'); } return;
    case 'deck-review': { var u = unknownCards(); openDeck((u.length ? u : KL).map(function (k) { return k.id; }), 'مراجعة شاملة: البطاقات', '#review', 'review'); return; }
    case 'review-quiz': startQuiz(prioritized(QL).slice(0, 20).map(function (x) { return x.id; }), 'مراجعة شاملة', 'review'); return;
    case 'review-mark': schDone('_review', 'review'); render(); toast('سُجّلت المراجعة في الجدول'); return;
    case 'deck-eve': { var u2 = unknownCards(), k2 = KL.filter(function (k) { return known(k.id); }); openDeck(u2.concat(k2).map(function (k) { return k.id; }), 'ليلة الاختبار: البطاقات', '#eve', 'eve'); return; }
    case 'eve-mark': schDone('_eve', 'eve'); render(); toast('تصبح على خير، وفقك الله'); return;
    case 'flip': {
      if (!DECK) return; DECK.flip = !DECK.flip;
      var fc = view.querySelector('.fc');
      if (fc) { fc.classList.toggle('flipped', DECK.flip); fc.setAttribute('aria-label', DECK.flip ? 'اعرض الوجه' : 'اقلب البطاقة'); fc.querySelector('.front').setAttribute('aria-hidden', DECK.flip); fc.querySelector('.back').setAttribute('aria-hidden', !DECK.flip); }
      return;
    }
    case 'deck-next': deckStep(1); return;
    case 'deck-prev': deckStep(-1); return;
    case 'deck-know': { var cid = DECK.ids[DECK.i]; S.k[cid] = { v: known(cid) ? 0 : 1, t: now() }; ST.save(); var fl = DECK.flip; render(); if (fl) { var f2 = view.querySelector('.fc'); if (f2) f2.classList.add('flipped'); } return; }
    case 'deck-again': DECK.i = 0; DECK.flip = false; render(); return;
    case 'deck-quit': { var back = DECK ? DECK.back : '#rev'; DECK = null; go(back); return; }
    case 'deck-filter': { var c0 = CH[cardFilter.ch], l0 = LBY[cardFilter.les]; openDeck(cardList().map(function (k) { return k.id; }), l0 ? 'بطاقات: ' + l0.title : (c0 ? 'بطاقات ' + c0.title : 'البطاقات كلها'), '#rev'); return; }
    case 'card-ch': cardFilter.ch = ch; cardFilter.les = 'all'; render(); return;
    case 'card-les': cardFilter.les = el.getAttribute('data-l'); render(); return;
    case 'hide-known': cardFilter.hideKnown = !cardFilter.hideKnown; render(); return;
    case 'map': openMap(ch); return;
    case 'sum-ch': sumCh = ch; ST.setPref('sumCh', ch); render(); window.scrollTo(0, 0); return;
    case 'go-bank': selInit(); bankKind = 'obj'; objSel = [ch]; saveSel(); quiz = null; go('#quiz'); return;
    case 'bank-kind': bankKind = el.getAttribute('data-k'); saveSel(); render(); return;
    case 'pick-ch': i = objSel.indexOf(ch); if (i > -1) objSel.splice(i, 1); else objSel.push(ch); saveSel(); render(); return;
    case 'pick-count': objCount = +el.getAttribute('data-n'); saveSel(); render(); return;
    case 'round-seen': { var rb = S.bank[ch]; if (rb && rb.last) { rb.last.seen = true; ST.save(); } render(); return; }
    case 'start-obj': {
      var chs = CHS.filter(function (c) { return objSel.indexOf(c.id) > -1 && c.qs.length; });
      ids = bankPick(chs.map(function (c) { return c.id; }), objCount);
      startQuiz(ids, 'اختبار موضوعي: ' + chs.map(function (c) { return c.title; }).join('، '), 'bank'); return;
    }
    case 'ess-les': { var el2 = el.getAttribute('data-l'); essaySel[el2] = !essaySel[el2]; saveSel(); render(); return; }
    case 'ess-ch': { var cc = CH[ch], all = cc.les.every(function (x) { return essaySel[x.id]; }); cc.les.forEach(function (x) { essaySel[x.id] = !all; }); saveSel(); render(); return; }
    case 'copy-essay': { var ls = pickedLessons().filter(function (x) { return x.essay.length; }); if (ls.length) copyText(essayMessage(ls), 'نُسخت الرسالة. الصقها في محادثة جديدة داخل مشروع المادة.'); return; }
    case 'copy-new': { var ls2 = pickedLessons(); if (ls2.length) copyText(newEssaysRequest(ls2), 'نُسخ الطلب. الصقه في محادثة جديدة داخل مشروع المادة.'); return; }
    case 'answer': {
      if (!quiz || quiz.picked !== null) return;
      q = Q[quiz.ids[quiz.i]]; var v = +el.getAttribute('data-v'), ok = isRight(q, v);
      quiz.picked = v; quiz.results.push(ok); quiz.lastRes = record(q.id, ok);
      /* محاولة تسميع الخروج تُحسب من أول إجابة، فتُحفظ نسبتها على أسئلة الدرس كلها كلما أجاب */
      if (quiz.mode === 'exit') saveExit(quiz.les, Math.round(100 * quiz.results.filter(Boolean).length / quiz.ids.length), 'exit');
      quiz.rounds = roundNotes.splice(0).map(function (id) { return roundText(CH[id]); });
      render();
      var vd = view.querySelector('.verdict'); if (vd && vd.getBoundingClientRect().bottom > window.innerHeight - 70) vd.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    case 'next': quiz.i++; quiz.picked = null; quiz.lastRes = null; quiz.rounds = []; quiz.quitArmed = false; render(); window.scrollTo(0, 0); return;
    case 'quit': {
      if (!quiz) return;
      if (quiz.mode === 'exit' && quiz.results.length && quiz.i < quiz.ids.length) {
        if (!quiz.quitArmed) { quiz.quitArmed = true; render(); return; }
        finishQuiz(true); quiz.i = quiz.ids.length; quiz.picked = null; render(); window.scrollTo(0, 0); return;
      }
      var md = quiz.mode, ql = LBY[quiz.les]; quiz = null; go(quitDest(md, ql)); return;
    }
    case 'new-quiz': quiz = null; render(); window.scrollTo(0, 0); return;
    case 'nb-ch': nbCh = ch; render(); return;
    case 'start-nb': { var list = mistakes(nbCh === 'all' ? null : nbCh); startQuiz(shuffle(list.map(function (x) { return x.id; })), 'دفتر الأخطاء', 'nb'); return; }
    case 'rev-sub': revSub = el.getAttribute('data-sub'); ST.setPref('revSub', revSub); render(); return;
    case 'cmp-test': {
      var sec = el.closest('.cmp'), onT = !sec.classList.contains('testing');
      sec.classList.toggle('testing', onT); el.setAttribute('aria-pressed', onT);
      sec.querySelectorAll('td').forEach(function (td) { td.classList.remove('shown'); if (onT) td.setAttribute('tabindex', '0'); else td.removeAttribute('tabindex'); });
      sec.querySelector('[data-act="cmp-all"]').hidden = !onT; return;
    }
    case 'cell': { var s2 = el.closest('.cmp'); if (s2 && s2.classList.contains('testing')) el.classList.toggle('shown'); return; }
    case 'cmp-all': el.closest('.cmp').querySelectorAll('td').forEach(function (td) { td.classList.add('shown'); }); return;
    case 'zoom': {
      var zf = el.closest('.cmp').querySelector('.zf'), d = el.getAttribute('data-d');
      setZoom(zf, d === '0' ? (zf._fit || 1) : (zf._z || 1) * (d === '1' ? 1.25 : 0.8)); return;
    }
  }
});
view.addEventListener('keydown', function (e) {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('data-act') === 'cell') { e.preventDefault(); e.target.click(); }
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && !sheet.hidden) { closeSettings(); return; }
  if (MAP || screen !== 'deck' || !DECK || DECK.i >= DECK.ids.length || /input|textarea|select/i.test(e.target.tagName || '')) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); deckStep(1); } else if (e.key === 'ArrowRight') { e.preventDefault(); deckStep(-1); }
});
/* السحب بين البطاقات، والتقريب بإصبعين في الجداول */
var sw = null, pinch = null;
function tdist(ts) { var dx = ts[0].clientX - ts[1].clientX, dy = ts[0].clientY - ts[1].clientY; return Math.sqrt(dx * dx + dy * dy) || 1; }
view.addEventListener('touchstart', function (e) {
  var f = e.target.closest && e.target.closest('.zf');
  if (f && e.touches.length === 2) { pinch = { f: f, d: tdist(e.touches), z: f._z || 1 }; sw = null; return; }
  if (screen === 'deck' && e.touches.length === 1 && e.target.closest('.fc')) sw = { x: e.touches[0].clientX, y: e.touches[0].clientY }; else sw = null;
}, { passive: true });
view.addEventListener('touchmove', function (e) {
  if (!pinch || e.touches.length !== 2) return;
  e.preventDefault();
  setZoom(pinch.f, pinch.z * tdist(e.touches) / pinch.d, (e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2);
  pinch.z = pinch.f._z; pinch.d = tdist(e.touches);
}, { passive: false });
view.addEventListener('touchend', function (e) {
  if (e.touches.length < 2) pinch = null;
  if (sw && e.changedTouches.length) {
    var dx = e.changedTouches[0].clientX - sw.x, dy = e.changedTouches[0].clientY - sw.y; sw = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) { e.preventDefault(); deckStep(dx < 0 ? 1 : -1); }
  }
});
var fitT = null;
window.addEventListener('resize', function () {
  clearTimeout(fitT);
  fitT = setTimeout(function () { fitTables(); fitCard(); if (MAP) { mmClamp(); mmApply(); } }, 200);
});

/* ---------- النهار والليل: يُحفظ الاختيار في هذا الجهاز ---------- */
var MOON = '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>', SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>';
var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function isNight() { var m = body.getAttribute('data-mode'); return m ? m === 'night' : !!(mq && mq.matches); }
function paintMode() {
  var n = isNight(), btn = document.getElementById('modeBtn');
  document.getElementById('modeIcon').innerHTML = n ? SUN : MOON;
  btn.setAttribute('aria-label', n ? 'الوضع النهاري' : 'الوضع الليلي');
  var col = n ? '#121726' : '#ECEAE4';
  if (body.getAttribute('data-mode')) document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) { m.setAttribute('content', col); });
  if (MAP) drawEdges();
}
(function () { var m = ST.pref('mode'); if (m === 'day' || m === 'night') body.setAttribute('data-mode', m); })();
document.getElementById('modeBtn').addEventListener('click', function () {
  var m = isNight() ? 'day' : 'night'; body.setAttribute('data-mode', m); ST.setPref('mode', m); paintMode();
});
if (mq) { if (mq.addEventListener) mq.addEventListener('change', paintMode); else if (mq.addListener) mq.addListener(paintMode); }
paintMode();

/* ---------- البدء ---------- */
document.getElementById('brandName').textContent = CFG.name || 'القانون الدستوري';
document.getElementById('brandSub').textContent = [CFG.exam, CFG.scope].filter(Boolean).join(' · ');
document.getElementById('brandSub').title = [CFG.part, CFG.scope].filter(Boolean).join(' · ');
(function () { var rs = ST.pref('revSub'); if (rs) revSub = rs; })();
var topEl = document.getElementById('top');
window.addEventListener('scroll', function () { topEl.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });
ST.onRemote(function () { S = ST.state(); if (!busy()) render(); else updateBadge(); });
initSchedule();
route();
var lastDay = todayISO();
setInterval(function () { var t = todayISO(); if (t !== lastDay) { lastDay = t; if (!busy()) render(); } }, 60000);
})();
