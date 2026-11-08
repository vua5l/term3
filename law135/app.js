/* القانون الدولي (law135): منطق الموقع كله، ولا بيانات فيه ولا موعد. بُني على محرك موقع القانون الدستوري (law136).
   - المحتوى من data/*.js (window.LAW135.chapters) بترتيب config.js، والحفظ كله عبر store.js.
   - الموعد ومهام كل يوم من ../schedule.js وحده (term3Schedule)، وبه يُسجَّل الإنجاز والمستوى.
   أين تجد الأدوات:
   الجدول: initSchedule، onInfo، schDone، schUndo، markLearned، sendLevel.
   الرئيسة: homeHTML، heroHTML، levelsHTML، todayBlock، taskRow، smallRow، startSmall. الخطة: planHTML.
   الدرس وتسميع الخروج: lessonHTML، summaryHTML، exitCard، finishQuiz (الوضع exit).
   مهام الجدول: recallHTML، reviewHTML، eveHTML. البطاقات: deckHTML، cardsBrowser.
   البنك: objSetup، bankPick، bankMark، closeRound. المقالي: essaySetup، essayMessage، newEssaysRequest.
   دفتر الأخطاء: record، nbHTML. المستوى: statsFor، level. الجداول: cmpHTML، fitTables.
   سؤال الخانة: buildCells، cellsSetup، cellsHTML، cellsResultHTML، cellPick، cellRecord.
   التعريفات (data/defs.js): buildDefs، defsSetup، defsStart، defsHTML، defChips، defOpts، diffHTML، defsResultHTML، setDx.
   طريقة «اطّلاع» في التعريفات: viewHTML، viewCard، viewBar، viewStep، viewEndHTML، setDv.
   مهمة دفتر الأخطاء: nbState، reportNb (إلى الجدول بـ extra)، nbRow. اختيار الدروس المتعدد: lesPicker، loadPick، selLabel.
   الخرائط: openMap، drawEdges، mapFit. الإعدادات: openSettings. التنقل: parseHash، route.
   الوسم (data/imp.js): buildImp، expChip، lesChip، impAttr. خانة المهم: impHTML، impGroupHTML، impStart، impContinue، impNext، impCardsHTML، icStep، impRevHTML، irStep. */
(function () {
'use strict';
var CFG = window.LAW135_CONFIG || {};
var CODE = CFG.code || 'law135';
var ST = window.Law135Store;
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
/* الوسم: 1 «الأهم» و2 «مهم» */
var IMPW = { 1: 'الأهم', 2: 'مهم' };
function expChip(x) { return x && x.imp ? '<span class="chip exp' + (x.imp === 2 ? ' lv2' : '') + '">' + IMPW[x.imp] + '</span>' : ''; }
function lesChip(l) { return l && l.imp ? '<span class="chip exp' + (l.imp === 2 ? ' lv2' : '') + '">' + IMPW[l.imp] + (l.imp === 1 ? ' · ' + l.rank : '') + '</span>' : ''; }
/* كتلة الملخص الموسومة يميزها خط جانبي، فلا تتكرر الشارة في كل فقرة */
function impAttr(b, base) { var c = (base || '') + (b && b.imp ? ' imp-b' + (b.imp === 2 ? ' lv2' : '') : ''); return c ? ' class="' + c.trim() + '"' : ''; }
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
  day: ['يوم واحد', 'يومان', 'أيام', 'يوماً', 'يومين', 'لا أيام'],
  cell: ['خانة واحدة', 'خانتان', 'خانات', 'خانة', 'خانتين', 'لا خانات'],
  def: ['تعريف واحد', 'تعريفان', 'تعريفات', 'تعريفاً', 'تعريفين', 'لا تعريفات'],
  err: ['خطأ واحد', 'خطآن', 'أخطاء', 'خطأً', 'خطأين', 'لا أخطاء']
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
var RAW = window.LAW135 && Array.isArray(window.LAW135.chapters) ? window.LAW135.chapters : [];
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
/* سؤال الخانة: كل خانة في جداول المقارنة يُسأل لأيّ عمود هي. وتُترك الخانة الفارغة، والمكررة في صفها
   لأن لها جوابين، والتي فيها اسم عمودها لأنها تكشف جوابها. ومعرّفها <الجدول>:<الصف>:<العمود> */
var CELLS = [], CBY = {};
(function buildCells() {
  function nz(s) {
    return String(s == null ? '' : s).replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[^ء-يA-Za-z0-9]+/g, ' ').trim();
  }
  TB.forEach(function (t) {
    var cols = arr(t.cols); if (cols.length < 3) return;
    arr(t.rows).forEach(function (r, ri) {
      r = arr(r);
      var vals = cols.map(function (_, ci) { return ci ? nz(r[ci]) : ''; });
      for (var ci = 1; ci < cols.length; ci++) {
        var v = vals[ci], hd = nz(cols[ci]);
        if (v.length < 3 || !hd) continue;
        if (vals.some(function (x, j) { return j > 0 && j !== ci && x === v; })) continue;
        if ((' ' + v + ' ').indexOf(' ' + hd + ' ') > -1) continue;
        var c = { id: t.id + ':' + ri + ':' + ci, t: t, ri: ri, ci: ci, aspect: String(r[0] == null ? '' : r[0]), x: String(r[ci]).trim(), ch: t.ch };
        CELLS.push(c); CBY[c.id] = c;
      }
    });
  });
})();
/* «التعريفات»: نصوصها مقطّعة من data/defs.js (window.LAW135_DEFS) مع أسرها المتشابهة، فإن غاب الملف أو خلا لم يظهر النوع.
   والنص parts.join(' ')، وأقارب التعريف (sibs) أعضاء كل أسرة هو فيها */
var DEFS = [], DBY = {}, DLES = {};
(function buildDefs() {
  var D = window.LAW135_DEFS;
  if (!D || typeof D !== 'object') return;
  arr(D.items).forEach(function (d) {
    if (!d || !d.id || DBY[d.id] || !d.term || !CH[d.ch] || !LBY[d.les]) return;
    var parts = arr(d.parts).map(function (p) { return String(p == null ? '' : p).trim(); }).filter(Boolean);
    if (!parts.length) return;
    var x = { id: String(d.id), term: String(d.term), ch: CH[d.ch], les: LBY[d.les], pg: String(d.pg || LBY[d.les].pages), sum: d.sum === true,
      parts: parts, text: parts.join(' '), hide: arr(d.hide).map(String).filter(function (s) { return s.trim(); }), sibs: [] };
    DEFS.push(x); DBY[x.id] = x; (DLES[x.les.id] = DLES[x.les.id] || []).push(x);
  });
  arr(D.fams).forEach(function (f) {
    var ms = arr(f && f.members).map(function (id) { return DBY[id]; }).filter(Boolean);
    ms.forEach(function (a) { ms.forEach(function (b) { if (a !== b && a.sibs.indexOf(b) < 0) a.sibs.push(b); }); });
  });
})();
/* «المهم»: الوسم والمجموعات من data/imp.js (window.LAW135_IMP)، فإن غاب الملف لم تظهر الخانة ولا الوسم.
   البند الموسوم يحمل درجته في x.imp (1 «الأهم»، 2 «مهم»)، والمجموعة فيها بنودها cards وobj وrev. والأولى مجموعة الفخاخ */
var IMP = [], IMPN = [], TBID = {};
(function buildImp() {
  var D = window.LAW135_IMP;
  TB.forEach(function (t) { TBID[t.id] = t; });
  if (!D || typeof D !== 'object' || !arr(D.groups).length) return;
  /* تعريف لا بطاقة له: يُعرض في الخانة ببطاقة، ولا يدخل بطاقات المراجعة */
  function cardId(id) {
    if (K[id]) return true;
    var d = DBY[id]; if (!d) return false;
    K[id] = { id: id, type: 'def', front: d.term, back: d.text, bk: !d.sum, pg: d.pg, les: d.les, ch: d.ch };
    return true;
  }
  IMPN = arr(D.notes).filter(function (x) { return x && x.x; });
  if (IMPN.length) IMP.push({ idx: 0, lv: 1, no: 0, note: true, les: [], cards: [], obj: [], rev: IMPN.map(function (_, i) { return 'n' + i; }) });
  Object.keys(D.defs || {}).forEach(function (id) { if (DBY[id]) DBY[id].imp = +D.defs[id]; });
  var no = 0;
  arr(D.groups).forEach(function (g) {
    var ls = arr(g && g.les).map(function (id) { return LBY[id]; }).filter(Boolean), lv = +g.lv || 0; if (!ls.length) return;
    var night = arr(g.n).filter(function (k) { var m = String(k).split(':'); return CH[m[0]] && CH[m[0]].night[+m[1]]; });
    var x = { idx: IMP.length, lv: lv, no: lv ? ++no : 0, les: ls, cards: arr(g.c).filter(cardId), obj: arr(g.o).filter(function (id) { return Q[id]; }),
      rev: arr(g.t).filter(function (id) { return TBID[id]; }).concat(night) };
    IMP.push(x);
    if (!lv) return;
    x.cards.forEach(function (id) { K[id].imp = lv; });
    x.obj.forEach(function (id) { Q[id].imp = lv; });
    arr(g.t).forEach(function (id) { if (TBID[id]) TBID[id].imp = lv; });
    night.forEach(function (k) { var m = String(k).split(':'); CH[m[0]].night[+m[1]].imp = lv; });
    Object.keys(g.s || {}).forEach(function (lid) { var l = LBY[lid]; if (l) arr(g.s[lid]).forEach(function (i) { if (l.summary[i]) l.summary[i].imp = lv; }); });
    ls.forEach(function (l) { l.imp = lv; l.rank = x.no; });
  });
})();
function cellsOf(chId) { return CELLS.filter(function (c) { return c.ch.id === chId; }); }
function tableCells(tid) { return CELLS.filter(function (c) { return c.t.id === tid; }); }
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
function todayTask(lid) { var t = realTasks(INFO && INFO.today), i; for (i = 0; i < t.length; i++) if (t[i].lesson === lid) return t[i]; return null; }
function busy() { return (screen === 'quiz' && quiz && quiz.i < quiz.ids.length) || (screen === 'deck' && DECK && DECK.i < DECK.ids.length) || (screen === 'cells' && CQ && CQ.i < CQ.ids.length) || (screen === 'defs' && DQ && DQ.i < DQ.ids.length) || (screen === 'impc' && IC && IC.i < IC.ids.length) || (screen === 'impr' && IR && IR.i < IR.seq.length); }
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
/* f وfe: أول إجابة في آخر يوم أُجيب فيه عن السؤال (1 صواب أو 0 خطأ) ونوع خطئها، وبهما وحدهما يُقاس المستوى وتُعدّ أنواع الأخطاء.
   j: آخر حكم للطالب على تعليله في «صح أو خطأ» (1 علّلت صح، 0 فاتني شيء)، ولا يدخل المستوى */
function record(id, ok, et) {
  var r = S.q[id] || {}, t = todayISO(), was = !!r.m, first = r.a !== t || r.f === undefined, res = { out: false, same: false, inNb: false, enter: false };
  r = { n: (+r.n || 0) + 1, c: (+r.c || 0) + (ok ? 1 : 0), m: was ? 1 : 0, s: +r.s || 0, d: r.d || '', a: t, t: now(),
    f: first ? (ok ? 1 : 0) : r.f, fe: first ? (ok ? '' : (et || '')) : (r.fe || ''), j: r.j }; /* a: يوم آخر إجابة */
  if (ok) {
    if (r.m) {
      if (r.d === t) { res.same = true; res.inNb = true; }
      else { r.s += 1; r.d = t; if (r.s >= 2) { r.m = 0; r.s = 0; r.d = ''; res.out = true; } else res.inNb = true; }
    }
  } else { res.enter = !was; r.m = 1; r.s = 0; r.d = ''; res.inNb = true; }
  if (!r.d) delete r.d;
  if (!r.fe) delete r.fe;
  if (r.j === undefined) delete r.j;
  S.q[id] = r;
  bankMark(id, ok);
  ST.save(); updateBadge(); sendLevel(); reportNb();
  return res;
}
/* «فاتني شيء» في تعليل «صح أو خطأ»: يدخل السؤال دفتر الأخطاء ولو أصاب في الحكم، ولا يمسّ المستوى */
function judgeWhy(id, okWhy) {
  var r = S.q[id]; if (!r) return;
  r.j = okWhy ? 1 : 0; r.t = now();
  if (!okWhy) { r.m = 1; r.s = 0; delete r.d; }
  S.q[id] = r; ST.save(); updateBadge(); reportNb();
}
/* مهمة «مراجعة دفتر الأخطاء» في مهام اليوم: تظهر ما دام في الدفتر شيء، وتُنجز حين يُجاب اليوم عن كل ما فيه
   صواباً أو خطأ، وما بقي خطأ يبقى للغد. وتُبلَّغ إلى الجدول بـ extra فتظهر فيه كذلك */
function nbState() {
  var t = todayISO(), list = mistakes(), left = 0, tried = 0;
  list.forEach(function (q) { var r = S.q[q.id] || {}; if (r.d !== t) left++; if (r.a === t || r.d === t) tried++; });
  return { n: list.length, left: left, done: list.length > 0 && tried === list.length };
}
function reportNb() {
  if (!SCH || typeof SCH.extra !== 'function') return;
  var st = nbState();
  try { SCH.extra(CODE, { id: 'nb', title: 'مراجعة دفتر الأخطاء', link: '#nb', active: st.n > 0, done: st.done }); } catch (e) {}
}
function nbRow() {
  var st = nbState(); if (!st.n) return '';
  var meta = st.left ? 'لم تُجب صواباً اليوم عن ' + countWord(st.left, W.q, true) : 'أجبت صواباً اليوم عن أسئلته كلها';
  return '<li class="task kind-nb' + (st.done ? ' is-done' : '') + '"><span class="tick" aria-hidden="true">' + TICK + '</span>' +
    '<a class="t-main" href="#nb" aria-label="مراجعة دفتر الأخطاء' + (st.done ? '، منجزة اليوم' : '') + '"><span><span class="t-title">مراجعة دفتر الأخطاء</span><span class="t-meta">' + esc(meta) + '</span></span>' + GO + '</a></li>';
}
/* مهام الجدول بلا المهام الإضافية (kind: extra)، فمهمة الدفتر يعرضها الموقع بنفسه مرة واحدة ومعها العدد */
function realTasks(ts) { return arr(ts).filter(function (k) { return k && k.kind !== 'extra'; }); }
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

/* ---------- المستوى: كل سؤال مرة واحدة، بأول إجابة عليه في آخر يوم أُجيب فيه عنه، ولا يُحكم على فصل
   حتى تشمل الإجابات دروسه كلها، ولا يغيّر الخطة. وأنواع الأخطاء تُعدّ بالطريقة نفسها (et) ---------- */
function covered(c, seen) { return c.qs.length > 0 && c.les.every(function (l) { return !l.objective.length || seen[l.id]; }); }
function statsFor(chId) {
  var n = 0, c = 0, seen = {}, et = {};
  QL.forEach(function (q) {
    if (chId && q.ch.id !== chId) return;
    var r = S.q[q.id]; if (!r || r.f === undefined) return;
    n++; if (r.f) c++; else if (r.fe) et[r.fe] = (et[r.fe] || 0) + 1;
    seen[q.les.id] = 1;
  });
  var all = chId ? !!(CH[chId] && covered(CH[chId], seen)) : CHS.some(function (x) { return covered(x, seen); });
  return { n: n, c: c, pct: n ? Math.round(100 * c / n) : null, all: n > 0 && all, et: et };
}
function level(st) {
  if (!st || !st.n || !st.all) return { k: 'none', label: 'لم يُقَس بعد' };
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

/* سؤال الخانة: يُقدَّم ما أخطأت فيه آخر مرة، ثم ما لم تُسأل عنه، ثم الباقي وأقلّه صواباً أولاً */
function cellRec(id) { var r = S.cell && S.cell[id]; return r && typeof r === 'object' ? r : null; }
function cellWeight(c) { var r = cellRec(c.id); if (!r) return 1; if (+r.w) return 0; return 2 + (+r.n ? (+r.c || 0) / +r.n : 0); }
function cellPick(list, count) { var a = shuffle(list).sort(function (x, y) { return cellWeight(x) - cellWeight(y); }); return count ? a.slice(0, count) : a; }
function cellRecord(id, ok) {
  if (!S.cell || typeof S.cell !== 'object') S.cell = {};
  var r = cellRec(id) || {};
  S.cell[id] = { n: (+r.n || 0) + 1, c: (+r.c || 0) + (ok ? 1 : 0), w: ok ? 0 : 1, t: now() };
  ST.save();
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
/* ملفات «نص الكتاب ص …» في مشروع المادة التي فيها صفحات الدروس المختارة، فيرجع Claude إليها وحدها */
function pgSpan(p) { var m = String(p || '').replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).match(/\d+/g); return m ? [Math.min.apply(null, m.map(Number)), Math.max.apply(null, m.map(Number))] : null; }
function textFiles(ls) {
  var out = [];
  arr(CFG.textFiles).forEach(function (r) { var f = pgSpan(r); if (!f) return;
    if (ls.some(function (l) { var x = pgSpan(l.pages); return x && x[0] <= f[1] && x[1] >= f[0]; })) out.push('«نص الكتاب ص ' + r + '»'); });
  return out;
}
function filesLine(ls) {
  var f = textFiles(ls);
  return f.length ? 'نص صفحات هذه الدروس حرفياً في ملفات المشروع: ' + f.join('، ') + '. فارجع إليها وحدها عند الحاجة، ولا تقرأ الكتاب كله.' : pagesNote();
}
/* عبارات «صح أو خطأ» مع تعليلها النموذجي، لاختبار «بيّن مدى صحة العبارة مع التعليل» في المحادثة */
function tfOf(ls) { var a = []; ls.forEach(function (l) { l.objective.forEach(function (q) { if (q.k === 'tf') a.push(q); }); }); return a; }
function pickedLessons() { return LES.filter(function (l) { return essaySel[l.id]; }); }
function essayMessage(ls, kind) {
  kind = kind || 'essay';
  if (kind === 'tf') return tfMessage(ls, false);
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
    '6. ' + filesLine(ls),
    (kind === 'both' ? '7. وفي آخر الرسالة عبارات «بيّن مدى صحة العبارة مع التعليل»: اخلطها مع الأسئلة المقالية، واتفق معي على عدد كل نوع أولاً، وصحّحها على الطريقة المكتوبة قبلها.' : ''),
    '',
    'الأسئلة ونقاط أجوبتها النموذجية، مرتبة على ترتيب الدروس (لا تكشف النقاط لي):'
  ].filter(function (x, i) { return !(i === 10 && x === ''); });
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
  if (kind === 'both') out.push('', tfMessage(ls, true));
  return out.join('\n');
}
function tfMessage(ls, part) {
  var qs = tfOf(ls), out = part ? ['عبارات «بيّن مدى صحة العبارة مع التعليل»:'] : [
    'اختبرني في «بيّن مدى صحة العبارة مع التعليل» في ' + subjLine() + '، من ' + bookLine() + '.',
    'الدروس المختارة: ' + ls.map(lesLine).join('، ') + '.',
    '',
    'طريقة الاختبار:',
    '1. اسألني أولاً كم عبارة أريد من العبارات أدناه، وعددها ' + qs.length + '، ونتفق على العدد قبل أن تبدأ.',
    '2. اخلط العبارات، ولا تتقيد بترتيبها في هذه الرسالة.',
    '3. أرسل ثلاث عبارات في رسالة واحدة دون أن تكشف حكمها ولا تعليلها، فأجيب عن كل عبارة: صحيحة أو خاطئة مع التعليل، في رسالة واحدة، فتصحّحها معاً، ثم الثلاث التالية حتى يتم العدد.',
    '4. صحّح كل عبارة بهذا الترتيب: العبارة، ثم جوابي كما كتبته، ثم الحكم الصحيح، ثم التصحيح (ما أصبت فيه من التعليل، وما فاتني، وما أخطأت فيه)، ثم التعليل الأفضل الذي كان ينبغي أن أكتبه.',
    '5. الحكم والتعليل النموذجي أدناه أساس التصحيح، والتعليل مرجع للمعنى لا للفظ، فاقبل ما أصبت معناه بعبارتي. وعند الشك، أو إن علّلت بما ليس في التعليل النموذجي، فاحكم بنص الكتاب لا بمعرفتك العامة، ورأي المؤلف هو المرجع وإن خالف المشهور، وما زدته صحيحاً فنبّه عليه ولا تخطّئه.',
    '6. ' + filesLine(ls),
    '',
    'العبارات وحكمها وتعليلها النموذجي (لا تكشفها لي):'
  ];
  qs.forEach(function (q, i) {
    out.push('', 'العبارة ' + (i + 1) + ' (' + lesLine(q.les) + '): ' + q.q, 'الحكم: ' + (q.a ? 'صحيحة' : 'خاطئة'), 'التعليل النموذجي: ' + (q.why || '') + (q.pg ? ' (ص ' + q.pg + ')' : ''));
  });
  return out.join('\n');
}
/* أسئلة الفهم: Claude يصوغ أسئلة جديدة بسؤال «لماذا؟» من ملفات نص الكتاب لهذه الدروس */
function compMessage(ls) {
  return [
    'أريد أسئلة فهم في ' + subjLine() + '، من ' + bookLine() + '، في هذه الدروس وصفحاتها:'
  ].concat(ls.map(function (l) { return '- ' + lesLine(l); }), [
    '',
    filesLine(ls),
    'ابنِ من هذه الملفات وحدها الأسئلة وأجوبتها بصفحاتها، وصحّح بها لا بمعرفتك العامة، ورأي المؤلف هو المرجع وإن خالف المشهور.',
    'اسألني عن أفكار هذه الدروس بصياغة جديدة غير صياغة الكتاب، وبسؤال «لماذا؟»: كأن تسألني لماذا لا ينطبق حكم على حالة بعينها، أو لماذا فرّق الكتاب بين أمرين، أو لماذا رجّح المؤلف رأياً. فالحفظ قد يتعلّق بصياغة السؤال لا بفهم فكرته.',
    CFG.cases ? 'ولك أن تسألني حالات تطبيقية، فهي في اختبار هذه المادة.' : 'ولا تسألني حالات تطبيقية، فليست في اختبار هذه المادة.',
    'اسألني أولاً كم سؤالاً أريد ونتفق على العدد، ثم أرسل ثلاثة أسئلة في رسالة واحدة دون أن تكشف أجوبتها، فأجيب عنها في رسالة واحدة، فتصحّحها معاً، ثم الثلاثة التالية حتى يتم العدد.',
    'صحّح كل سؤال بهذا الترتيب: السؤال، ثم جوابي كما كتبته، ثم التصحيح (ما أصبت وما فاتني وما أخطأت فيه)، ثم الجواب الأفضل بصفحته.'
  ]).join('\n');
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
    filesLine(ls)
  ]);
  return out.join('\n');
}

/* ---------- الحالة والعرض ---------- */
var screen = 'home', arg = null;
var quiz = null;   /* { ids, i, picked, results, label, mode, les, order, lastRes, fin } */
var DECK = null;   /* { ids, i, flip, title, back, then, les } */
var CQ = null;     /* سؤال الخانة: { ids, i, picked, res, label, back, src, order } */
var RSTEP = {};    /* خطوة البطاقات منتهية في هذه الجلسة، لكل مهمة */
var bankKind = 'obj', objSel = null, objCount = 10, essaySel = null;
var sumCh = null, revSub = 'cards', cardFilter = { hideKnown: false }, cardSel = null; /* cardSel: دروس بطاقات المراجعة {معرّف الدرس: true} */
var armed = null;
var TAB_OF = { home: 'home', plan: 'plan', sum: 'sum', lesson: 'sum', quiz: 'quiz', nb: 'quiz', cells: 'quiz', defs: 'quiz', rev: 'rev', deck: 'rev', recall: 'plan', review: 'plan', eve: 'plan', imp: 'imp', impg: 'imp', impc: 'imp', impr: 'imp' };

function render() {
  var tb = TAB_OF[screen] || 'home';
  if (screen === 'quiz' && quiz && quiz.mode === 'imp') tb = 'imp';
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
    else if (screen === 'cells') { if (!CQ) bankKind = 'cells'; h = CQ ? cellsHTML() : bankHTML(); }
    else if (screen === 'defs') { selInit(); if (!DQ && DEFS.length) bankKind = 'defs'; h = DQ ? defsHTML() : bankHTML(); }
    else if (screen === 'deck') h = DECK ? deckHTML() : revHTML();
    else if (screen === 'imp') h = impHTML();
    else if (screen === 'impg') h = impGroupHTML(arg);
    else if (screen === 'impc') h = IC ? impCardsHTML() : impHTML();
    else if (screen === 'impr') h = IR ? impRevHTML() : impHTML();
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
/* شريط الأيام: قطعة لكل يوم من أول أيام الخطة إلى يوم الاختبار، وما مضى منها ملوّن */
function dbarHTML() {
  var e = examISO(); if (!e) return '';
  var t = todayISO(), days = (INFO && INFO.days) || [], start = days.length && days[0].date < t ? days[0].date : t;
  var n = diffDays(start, e) + 1; if (!(n > 1) || n > 45) return '';
  var rd = reviewDay(), segs = '';
  for (var i = 0; i < n; i++) {
    var d = addDays(start, i), c = d < t ? 'past' : (d === t ? 'today' : '');
    if (d === e) c += ' ex'; else if (d === rd || d === addDays(e, -1)) c += ' rv';
    segs += '<i class="' + c.trim() + '"></i>';
  }
  return '<div class="dbar" role="img" aria-label="' + esc('الأيام من ' + dayLabel(start) + ' إلى الاختبار ' + dayLabel(e)) + '">' + segs + '</div>' +
    '<div class="dbar-l"><span>' + (start === t ? 'اليوم' : esc(dayName(start))) + '</span><span>' + (rd && rd > t ? 'المراجعة الشاملة ' + esc(dayName(rd)) + ' · ' : '') + 'الاختبار ' + esc(dayName(e)) + '</span></div>';
}
function heroHTML() {
  var left = daysLeft(), e = examISO(), big, cap;
  if (left === null) { big = '—'; cap = 'الموعد يصل من الجدول'; }
  else if (left > 2) { big = String(left); cap = (left % 100 >= 3 && left % 100 <= 10 ? 'أيام' : 'يوماً') + ' على الاختبار'; }
  else if (left === 2) { big = 'يومان'; cap = 'على الاختبار'; }
  else if (left === 1) { big = 'غداً'; cap = 'الاختبار'; }
  else if (left === 0) { big = 'اليوم'; cap = 'الاختبار، وفقك الله'; }
  else { big = 'مضى'; cap = 'موعد الاختبار'; }
  var word = left === null || left <= 2;
  var tasks = INFO ? realTasks(INFO.today) : [], done = tasks.filter(function (k) { return k.done; }).length;
  var dp = tasks.length ? Math.round(100 * done / tasks.length) : 0;
  var pct = INFO && INFO.progress ? +INFO.progress.pct || 0 : 0, total = LES.length, got = LES.filter(function (l) { return learned(l.id); }).length;
  var ov = statsFor(null), ol = level(ov), C = 2 * Math.PI * 40;
  return '<section class="board" aria-label="العد التنازلي والتقدم">' +
    '<div class="bd-top"><div><div class="bd-num' + (word ? ' word' : '') + '">' + esc(big) + '</div><div class="bd-cap">' + esc(cap) + '</div></div>' +
      (e ? '<div class="bd-date">' + esc(dayName(e)) + '<b>' + esc(dayLabel(e).replace(/^\S+\s/, '')) + '</b>' + (tentative() ? '<span class="tent">مبدئي</span>' : '') + '</div>' : '') + '</div>' +
    dbarHTML() +
    '<div class="tcard"><div class="tc-row"><div><div class="tc-l">تقدّم اليوم</div><div class="tc-big">' + (tasks.length ? done + ' من ' + tasks.length : 'لا مهام') + '</div>' +
      '<div class="tc-l">' + (tasks.length ? 'مهام اليوم' : (INFO ? 'اليوم بلا مهام لهذه المادة' : 'المهام تصل من الجدول')) + '</div></div>' +
      '<div class="ring" aria-hidden="true"><svg viewBox="0 0 100 100"><circle class="r-track" cx="50" cy="50" r="40"/>' +
        (dp ? '<circle class="r-fill" cx="50" cy="50" r="40" stroke-dasharray="' + (C * dp / 100).toFixed(1) + ' ' + C.toFixed(1) + '"/>' : '') + '</svg><b>' + (tasks.length ? dp + '%' : '—') + '</b></div></div>' +
      '<div class="meter" aria-hidden="true"><i style="width:' + (INFO ? pct : Math.round(100 * got / Math.max(1, total))) + '%"></i></div>' +
      '<div class="meter-l"><span>' + (INFO ? 'أنجزت <b>' + pct + '%</b> من الخطة' : 'تعلّمت <b>' + got + '</b> من ' + esc(countWord(total, W.les, true))) + '</span>' +
      '<span>مستواك العام: <b>' + (ol.k !== 'none' ? ol.label + ' · ' + ov.pct + '%' : 'لم يُقَس بعد') + '</b></span></div>' +
    '</div></section>';
}
/* أكثر أنواع الأخطاء، عامةً وفي كل فصل، والأداة الأنسب لكل نوع إن وُجدت */
var ICON = {
  pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  text: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 11h14M5 16h9"/></svg>',
  cell: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 12h6"/></svg>',
  cards: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M3.5 15h17M10 4.5v15"/></svg>'
};
function etool(k) {
  if (k === 'خلط مصطلح بشبيهه' && DEFS.length) return ['#defs', 'خانة التعريفات'];
  if (k === 'شرط أو ركن ناقص' || k === 'رقم أو تاريخ قريب') return ['#rev', 'بطاقات العدد'];
  if ((k === 'حكم لحالة أخرى' || k === 'رأي منسوب إلى غير قائله') && CELLS.length) return ['#cells', 'سؤال الخانة'];
  if (k === 'تعميم وإطلاق') return ['#quiz', 'صح أو خطأ في بنك الأسئلة'];
  return null;
}
function topEt(et) { return Object.keys(et).sort(function (a, b) { return et[b] - et[a]; }); }
function errTypesHTML() {
  var ov = statsFor(null), keys = topEt(ov.et); if (!keys.length) return '';
  var mx = ov.et[keys[0]], tool = etool(keys[0]);
  var rows = keys.map(function (k) { return '<div class="err-row" style="--w:' + Math.round(100 * ov.et[k] / mx) + '%"><span>' + esc(k) + '</span><b>' + ov.et[k] + '</b><i></i></div>'; }).join('');
  var per = CHS.map(function (c) { var ks = topEt(statsFor(c.id).et); return ks.length ? '<li>' + esc(c.title) + ': <b>' + esc(ks[0]) + '</b></li>' : ''; }).join('');
  return '<section class="block" aria-labelledby="et-h"><div class="block-head"><h2 id="et-h">أكثر أنواع أخطائك</h2></div><div class="card err">' + rows +
    '<p class="err-tip">أكثر خطأ عندك «' + esc(keys[0]) + '»' + (tool ? '، وأنسب أداة له: <a href="' + tool[0] + '">' + esc(tool[1]) + '</a>' : '') + '.</p>' +
    (per ? '<ul class="err-ch">' + per + '</ul>' : '') + '</div></section>';
}
/* المهام الجانبية: أدوات لا يضعها الجدول في المهام، ويُحسب فيها ما أُنجز وما بقي، ولا تصل إلى الجدول */
function sideHTML() {
  var rows = [], ess = LES.filter(function (l) { return l.essay.length; }), dl = DEFS.filter(function (d) { return !dxOn(d.id); });
  if (ess.length) rows.push(['data-act="go-essay"', 'pen', 'الاختبار المقالي', ess.filter(function (l) { return S.es[l.id] && S.es[l.id].v; }).length, ess.length, 'علّم الدرس من صفحته بعد جلسة التصحيح']);
  if (dl.length) rows.push(['href="#defs"', 'text', 'خانة التعريفات', dl.filter(function (d) { var r = S.def[d.id], v = S.dv[d.id]; return (r && r.n) || (v && v.v); }).length, dl.length, 'تكفي طريقة واحدة ليُحسب التعريف']);
  if (CELLS.length) rows.push(['href="#cells"', 'cell', 'سؤال الخانة', CELLS.filter(function (c) { var r = S.cell[c.id]; return r && r.n; }).length, CELLS.length, 'من جداول المقارنة']);
  if (KL.length) rows.push(['href="#rev"', 'cards', 'البطاقات', KL.filter(function (k) { return known(k.id); }).length, KL.length, 'ما علّمته «أعرفها»']);
  if (TB.length) rows.push(['href="#sum"', 'grid', 'جداول المقارنة', TB.filter(function (t) { return S.tq[t.id] && S.tq[t.id].v; }).length, TB.length, 'أتممت وضع الاختبار فيها']);
  if (!rows.length) return '';
  return '<section class="block" aria-labelledby="sd-h"><div class="block-head"><h2 id="sd-h">المهام الجانبية</h2><span class="muted small">لا تدخل الخطة</span></div><div class="card side">' +
    rows.map(function (r) { var tag = r[0].indexOf('href') === 0 ? 'a' : 'button type="button"', endTag = tag === 'a' ? 'a' : 'button';
      return '<' + tag + ' class="side-row" ' + r[0] + '><span class="si">' + ICON[r[1]] + '</span><b>' + esc(r[2]) + '</b><em>' + r[3] + ' من ' + r[4] + '</em><small>' + esc(r[5]) + '</small></' + endTag + '>'; }).join('') +
    '</div></section>';
}
function levelsHTML() {
  var strong = [], weak = [], rows = CHS.map(function (c) {
    var st = statsFor(c.id), lv = level(st);
    if (lv.k === 'top') strong.push(c.title); if (lv.k === 'low') weak.push(c.title);
    return '<div class="lvl-row"><span class="lvl-no" aria-label="' + esc(c.title) + '">' + c.n + '</span><div><div class="nm">' + esc(c.name) + '</div><div class="ct">' + (st.n ? 'أجبت عن ' + countWord(st.n, W.q) + (st.all ? '' : '، ولم تشمل دروسه كلها بعد') : 'لا إجابات بعد') + '</div></div>' +
      '<span class="pill ' + lv.k + '">' + lv.label + (lv.k !== 'none' ? ' ' + st.pct + '%' : '') + '</span></div>';
  }).join('');
  var ins = (strong.length || weak.length)
    ? (strong.length ? 'متقدم في: <b>' + esc(strong.join('، ')) + '</b>' : '') + (strong.length && weak.length ? '<br>' : '') + (weak.length ? 'متعثر في: <b>' + esc(weak.join('، ')) + '</b>، فأكثر من أسئلته في البنك.' : '')
    : 'يُقاس مستوى الفصل حين تشمل إجاباتك دروسه كلها، بأول إجابة على كل سؤال في آخر يوم أجبت عنه فيه، ولا يغيّر الخطة.';
  return '<section class="block" aria-labelledby="lv-h"><div class="block-head"><h2 id="lv-h">مستواك في الفصول</h2><span class="muted small">ممتاز من 85% · جيد من 60%</span></div>' +
    '<div class="card levels">' + rows + '<p class="insight">' + ins + '</p></div></section>';
}
function homeHTML() {
  var mk = mistakes().length;
  return heroHTML() + todayBlock() + levelsHTML() + errTypesHTML() + sideHTML() +
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
      '<ol class="tasks">' + smallRow() + nbRow() + '</ol>' + lessonsBlock() + '</section>';
  }
  var t = todayISO(), tasks = realTasks(INFO.today), mins = tasks.reduce(function (s, k) { return s + taskMin(k); }, 0);
  var head = '<div class="block-head"><h2 id="td-h">مهام اليوم · ' + esc(dayLabel(t)) + '</h2>' + (mins ? '<span class="muted small">' + esc(minutesText(mins)) + '</span>' : '') + '</div>';
  if (!tasks.length) {
    var next = (INFO.days || []).filter(function (d) { return d.date > t; })[0], left = daysLeft();
    var msg = left !== null && left <= 0 ? 'لا مهام لهذه المادة بعد موعد الاختبار.' : 'لا مهام لهذه المادة اليوم في الجدول.' + (next ? ' وأقرب مهامها يوم ' + dayLabel(next.date) + '.' : '');
    return '<section class="block" aria-labelledby="td-h">' + head + '<div class="empty">' + esc(msg) + '</div><ol class="tasks">' + smallRow() + nbRow() + '</ol>' +
      '<button type="button" class="link center" data-go="#plan">الخطة كاملة</button></section>';
  }
  return '<section class="block" aria-labelledby="td-h">' + head + '<ol class="tasks">' + smallRow() + tasks.map(function (k) { return taskRow(k, true); }).join('') + nbRow() + '</ol>' +
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
        '<span class="les-st">' + lesChip(l) + '<span class="pill ' + st[0] + '">' + st[1] + '</span>' + (exitFlag(l) ? '<span class="flag">ينقصه تسميع الخروج</span>' : '') + '</span></a></li>';
    }).join('') + '</ol>';
  });
  return h;
}

/* الخطة: أيام هذه المادة في الجدول */
function planHTML() {
  var h = '<div class="block-head"><h2>الخطة من جدول الاختبارات</h2>' + (INFO && INFO.progress ? '<span class="chip">أنجزت ' + (+INFO.progress.pct || 0) + '%</span>' : '') + '</div>' +
    '<p class="muted small p0">يوزّع الجدول الدروس على الأيام مع موادك الأخرى: يمرّ كل درس ثلاث مرات في أيام مختلفة، تعلّماً ثم تسميعين متباعدين، ثم مراجعة شاملة قبل الاختبار بيومين وتسميع ليلته.</p>';
  if (!INFO) return h + '<div class="empty"><b>افتح الصفحة مع الاتصال ليصلك الجدول</b></div>' + lessonsBlock();
  var t = todayISO(), days = (INFO.days || []).map(function (d) { return { date: d.date, minutes: d.minutes, tasks: realTasks(d.tasks) }; }).filter(function (d) { return d.tasks.length; });
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
  if (b.t === 'p') return '<p' + impAttr(b) + '>' + esc(b.x) + pg(b.pg) + '</p>';
  if (b.t === 'q') return '<blockquote' + impAttr(b, 'quote book') + '>«' + esc(b.x) + '»<cite>' + (b.label ? esc(b.label) + ' · ' : '') + 'نص الكتاب' + pg(b.pg) + '</cite></blockquote>';
  if (b.t === 'list') {
    var tag = b.ordered ? 'ol' : 'ul';
    return '<div' + impAttr(b, 'sum-list') + '>' + (b.lead ? '<p class="lead">' + esc(b.lead) + pg(b.pg) + '</p>' : '') +
      '<' + tag + ' class="points' + (b.ordered ? ' ordered' : '') + '">' + arr(b.items).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</' + tag + '>' +
      (!b.lead && b.pg ? '<p class="p0">' + pg(b.pg) + '</p>' : '') + '</div>';
  }
  if (b.t === 'note') return '<p' + impAttr(b, 'sum-note') + '><b>تنبيه</b>' + esc(b.x) + pg(b.pg) + '</p>';
  if (b.t === 'dr') return '<div class="dr-note"><p class="dr-h"><span class="chip">من إملاء الدكتور</span></p>' + (b.x ? '<p>' + esc(b.x) + '</p>' : '') +
    (arr(b.items).length ? '<ol class="points ordered">' + arr(b.items).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : '') + '</div>';
  if (b.t === 'h') return '';
  return b.x ? '<p' + impAttr(b) + '>' + esc(b.x) + pg(b.pg) + '</p>' : '';
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
    (l.imp ? '<div class="chips">' + lesChip(l) + '<span class="imp-leg">الخط الجانبي يعلّم الفقرات الموسومة</span></div>' : '') +
    (exitFlag(l) ? '<p class="p0"><span class="flag solo">ينقصه تسميع الخروج</span></p>' : '') +
    (todayTask(l.id) && todayTask(l.id).kind === 'recall' ? '<p class="fin-msg">مهمتك اليوم في هذا الدرس تسميع بلا كتاب. <a href="#r-' + l.n + '">ابدأ التسميع</a></p>' : '') +
    '<div class="les-quick">' + (l.cards.length ? '<button type="button" class="btn ghost sm" data-act="deck-lesson" data-n="' + l.n + '">بطاقاته (' + l.cards.length + ')</button>' : '') +
      (l.objective.length ? '<button type="button" class="btn ghost sm" data-act="goto-exit">تسميع الخروج</button>' : '') +
      (hasMap(l.ch) ? '<button type="button" class="btn ghost sm" data-act="map" data-ch="' + l.ch.id + '">خريطة الفصل</button>' : '') +
      (l.essay.length ? '<button type="button" class="btn ghost sm es-mark" data-act="es-mark" data-n="' + l.n + '" aria-pressed="' + !!(S.es[l.id] && S.es[l.id].v) + '">' + (S.es[l.id] && S.es[l.id].v ? 'اختُبرت في مقاليه ✓' : 'اختُبرت في مقاليه؟') + '</button>' : '') + '</div></section>';
  h += l.pending ? '<div class="empty">تُبنى مادة هذا الدرس بعد أن تصلوا إليه في المحاضرات.</div>' : (summaryHTML(l) || '<div class="empty">لم يصل ملخص هذا الدرس بعد.</div>');
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
    h += '<div class="ch-head" id="les-' + l.n + '"><p class="eyebrow">الدرس ' + l.no + ' · ص ' + esc(l.pages) + ' · ' + esc(minutesText(lesMin(l))) + ' ' + lesChip(l) + '</p>' +
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
      '<span class="face front" aria-hidden="' + !!flipped + '"><span class="fc-top"><span class="fc-type">' + ty + '</span><span class="fc-ref">' + (k.imp ? IMPW[k.imp] + ' · ' : '') + esc(ref) + '</span></span><span class="fc-body">' + frontHTML(k) + '<span class="reveal">اكشف الجواب</span></span><span class="seal">' + esc(ref.replace(' ', '')) + '</span></span>' +
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
/* بطاقات المراجعة: الفصول والدروس باختيار متعدد كبنك الأسئلة، ويُحفظ الاختيار في هذا الجهاز */
function cardPick() { if (!cardSel) cardSel = loadPick('cardSel', cardsIn); return cardSel; }
function cardList() {
  var sel = cardPick();
  return KL.filter(function (k) { return !!sel[k.les.id] && (!cardFilter.hideKnown || !known(k.id)); });
}
function cardsBrowser() {
  var list = cardList(), kn = KL.filter(function (k) { return known(k.id); }).length;
  var h = '<p class="muted small p0">تعريفات بنص الكتاب، وأعداد بقوائمها، وقواعد باستثناءاتها. علّم «أعرفها» ما ثبت عندك.</p>' +
    '<div class="field">' + lesPicker(cardPick(), 'cardp', cardsIn, W.card) + '</div>';
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
  if (!selInit.kind) { selInit.kind = 1; var bk = ST.pref('bankKind'); if (bk === 'obj' || bk === 'essay' || bk === 'cells' || bk === 'defs') bankKind = bk; } /* مرة واحدة، ثم يُحفظ كل تغيير */
  if (bankKind === 'defs' && !DEFS.length) bankKind = 'obj';
}
/* اختيار الفصول والدروس، مكوّن واحد في الاختبار المقالي والتعريفات وبطاقات المراجعة: sel {معرّف الدرس: true}،
   وcnt(l) عدد ما في الدرس، فالدرس الذي لا شيء فيه لا يُختار، و«الفصل كله» و«الكل» على ما يُختار وحده */
function essIn(l) { return l.essay.length; }
function cardsIn(l) { return l.cards.length; }
function defsIn(l) { return (DLES[l.id] || []).length; }
function pickable(cnt, c) { return (c ? c.les : LES).filter(function (l) { return cnt(l) > 0; }); }
function allPicked(sel, ls) { return ls.length > 0 && ls.every(function (l) { return sel[l.id]; }); }
function togPick(sel, ls) { var on = !allPicked(sel, ls); ls.forEach(function (l) { sel[l.id] = on; }); }
function lesPicker(sel, act, cnt, word) {
  var every = pickable(cnt);
  var h = '<div class="les-pick-h"><b>الفصول والدروس</b><button type="button" class="link" data-act="' + act + '-all">' + (allPicked(sel, every) ? 'ألغِ الكل' : 'اختر الكل') + '</button></div>';
  CHS.forEach(function (c) {
    if (!c.les.length) return;
    var all = allPicked(sel, pickable(cnt, c));
    h += '<div class="les-pick"><div class="les-pick-h"><b>' + esc(chLabel(c)) + '</b><button type="button" class="link" data-act="' + act + '-ch" data-ch="' + c.id + '">' + (all ? 'ألغِ الفصل' : 'الفصل كله') + '</button></div>' +
      '<div class="pick soft" role="group" aria-label="' + esc(c.title) + '">' + c.les.map(function (l) {
        var n = cnt(l);
        return '<button type="button" data-act="' + act + '-les" data-l="' + l.id + '" aria-pressed="' + !!sel[l.id] + '"' + (n ? '' : ' disabled') + '><span class="pk-box" aria-hidden="true">' + TICK + '</span><span>' + esc(l.title) + '<small>الدرس ' + l.no + ' · ص ' + esc(l.pages) + ' · ' + countWord(n, word) + (l.imp ? ' · ' + IMPW[l.imp] : '') + '</small></span></button>';
      }).join('') + '</div></div>';
  });
  return h;
}
/* اسم المختار: درس واحد، أو فصل كامل، أو الفصول كلها، أو أسماء الفصول */
function selLabel(sel, cnt) {
  var ls = pickable(cnt).filter(function (l) { return sel[l.id]; });
  if (ls.length === 1) return ls[0].title;
  if (allPicked(sel, pickable(cnt))) return 'الفصول كلها';
  var chs = CHS.filter(function (c) { return c.les.some(function (l) { return sel[l.id] && cnt(l) > 0; }); });
  if (chs.length === 1) return chs[0].title + (allPicked(sel, pickable(cnt, chs[0])) ? '' : ' (' + countWord(ls.length, W.les) + ')');
  return 'الفصول: ' + chs.map(chShort).join('، ');
}
/* الاختيار المحفوظ في هذا الجهاز: قائمة معرّفات دروس، وإن غاب أو خلا فالدروس كلها */
function loadPick(key, cnt) {
  var o = ST.pref(key), sel = {};
  if (Array.isArray(o)) o.forEach(function (id) { if (LBY[id] && cnt(LBY[id]) > 0) sel[id] = true; });
  if (!Object.keys(sel).length) pickable(cnt).forEach(function (l) { sel[l.id] = true; });
  return sel;
}
function savePick(key, sel) { ST.setPref(key, Object.keys(sel).filter(function (k) { return sel[k]; })); }
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
var essKind = 'essay'; /* نوع رسالة الاختبار في المحادثة: مقالي، أو صح وخطأ مع التعليل، أو الاثنان */
function essaySetup() {
  var ls = pickedLessons(), nq = 0, nt = tfOf(ls).length; ls.forEach(function (l) { nq += l.essay.length; });
  var k = ST.pref('essKind'); if (k === 'essay' || k === 'tf' || k === 'both') essKind = k;
  var h = '<section class="card"><p class="muted small p0">اختر الدروس، فيُخرج الموقع رسالة واحدة جاهزة تنسخها وتلصقها في محادثة جديدة داخل مشروع المادة، فيختبرك Claude فيها ثلاثة أسئلة في كل مرة ويصحّح لك. لا تصحيح في الموقع، ولا مؤقت، ولا يدخل دفتر الأخطاء ولا المستوى.</p>';
  h += lesPicker(essaySel, 'ess', essIn, W.ess);
  h += '<div class="field"><span class="f-l">نوع الأسئلة</span><div class="seg" role="group" aria-label="نوع الأسئلة">' +
    [['essay', 'مقالي'], ['tf', 'صح وخطأ مع التعليل'], ['both', 'الاثنان']].map(function (x) { return '<button type="button" data-act="ess-kind" data-k="' + x[0] + '" aria-pressed="' + (essKind === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div>';
  var cnt = essKind === 'tf' ? nt : (essKind === 'both' ? nq + nt : nq), ok = cnt > 0;
  var what = essKind === 'tf' ? countWord(nt, W.q) + ' صح وخطأ مع تعليلها النموذجي' : (essKind === 'both' ? countWord(nq, W.ess) + ' و' + nt + ' عبارة صح وخطأ' : countWord(nq, W.ess) + ' مع نقاط أجوبتها النموذجية');
  h += '<p class="fin-msg">' + (ok ? 'في الرسالة ' + what + '، من ' + countWord(ls.length, W.les) + '، مع صفحاتها.' : 'اختر درساً فيه أسئلة.') + '</p>' +
    '<button type="button" class="btn wide" data-act="copy-essay"' + (ok ? '' : ' disabled') + '>انسخ رسالة الاختبار</button>' +
    '<div class="row"><button type="button" class="btn ghost" data-act="copy-new"' + (ls.length ? '' : ' disabled') + '>طلب أسئلة مقالية جديدة</button>' +
    '<button type="button" class="btn ghost" data-act="copy-comp"' + (ls.length ? '' : ' disabled') + '>أسئلة الفهم</button></div>' +
    (ok ? '<details class="pre"><summary>اعرض الرسالة لتنسخها بيدك إن تعذّر النسخ</summary><textarea class="essay-pre" readonly aria-label="رسالة الاختبار">' + esc(essayMessage(ls, essKind)) + '</textarea></details>' : '') +
  '</section>';
  return h;
}
function bankHTML() {
  selInit();
  var mk = mistakes().length;
  return '<div class="block-head"><h2>بنك الأسئلة</h2><span class="chip">' + countWord(QL.length, W.q) + ' · ' + countWord(EL.length, W.ess) + '</span></div>' +
    '<div class="seg' + (CELLS.length && DEFS.length ? ' four' : '') + '" role="group" aria-label="نوع الاختبار"><button type="button" data-act="bank-kind" data-k="obj" aria-pressed="' + (bankKind === 'obj') + '">اختبار موضوعي</button><button type="button" data-act="bank-kind" data-k="essay" aria-pressed="' + (bankKind === 'essay') + '">اختبار مقالي</button>' +
      (CELLS.length ? '<button type="button" data-act="bank-kind" data-k="cells" aria-pressed="' + (bankKind === 'cells') + '">سؤال الخانة</button>' : '') +
      (DEFS.length ? '<button type="button" data-act="bank-kind" data-k="defs" aria-pressed="' + (bankKind === 'defs') + '">التعريفات</button>' : '') + '</div>' +
    (bankKind === 'defs' && DEFS.length ? defsSetup() :
    (bankKind === 'obj' ? '<p class="muted small p0">صح وخطأ، واختيار من متعدد، وضع الكلمة الصحيحة، من فصل واحد أو أكثر.</p>' + roundBanner() + objSetup() +
      '<section class="card"><div class="block-head"><h3>دفتر الأخطاء</h3><span class="chip">' + countWord(mk, W.q) + '</span></div><p class="muted small p0">يدخله كل سؤال موضوعي أخطأت فيه، ويخرج منه بعد إجابتين صحيحتين في يومين مختلفين.</p>' +
      '<button type="button" class="btn ghost wide" data-go="#nb">افتح الدفتر</button></section>'
    : bankKind === 'cells' && CELLS.length ? cellsSetup() : essaySetup()));
}
function cellsSetup() {
  var pool = 0;
  objSel.forEach(function (id) { if (CH[id]) pool += cellsOf(id).length; });
  var n = objCount ? Math.min(objCount, pool) : pool, going = CQ && CQ.i < CQ.ids.length;
  return '<p class="muted small p0">يعرض لك الموقع خانة من جداول المقارنة، فتختار لأيّ عمود هي، ثم يكشف لك الصف كاملاً. يُقدَّم ما أخطأت فيه آخر مرة، ولا يدخل المستوى ولا دفتر الأخطاء.</p>' +
    (going ? '<section class="card tight"><p class="fin-msg">عندك جولة جارية: ' + esc(CQ.label) + '، أجبت عن ' + CQ.res.length + ' من ' + CQ.ids.length + '.</p><button type="button" class="btn wide" data-go="#cells">أكملها</button></section>' : '') +
    '<section class="card">' +
    '<div class="field"><span class="f-l">الفصول</span><div class="pick full" role="group" aria-label="الفصول">' + CHS.map(function (c) {
      var k = cellsOf(c.id).length;
      return '<button type="button" data-act="pick-ch" data-ch="' + c.id + '" aria-pressed="' + (objSel.indexOf(c.id) > -1) + '"' + (k ? '' : ' disabled') + '><b>' + esc(c.title) + '</b><small>' + esc(c.name) + '</small>' +
        '<small class="rd">' + countWord(k, W.cell) + ' في ' + countWord(c.tables.length, ['جدول واحد', 'جدولان', 'جداول', 'جدولاً', 'جدولين', 'لا جداول']) + '</small></button>';
    }).join('') + '</div></div>' +
    '<div class="field"><span class="f-l">عدد الخانات</span><div class="seg" role="group" aria-label="عدد الخانات">' +
      [10, 20, 0].map(function (x) { return '<button type="button" data-act="pick-count" data-n="' + x + '" aria-pressed="' + (objCount === x) + '">' + (x ? x : 'الكل') + '</button>'; }).join('') +
    '</div></div>' +
    '<button type="button" class="btn wide" data-act="cells-start"' + (n ? '' : ' disabled') + '>ابدأ: ' + (n ? countWord(n, W.cell) : 'اختر فصلاً') + '</button>' +
    '<p class="muted small p0">وتجده أيضاً في كل جدول مقارنة بزر «سؤال الخانة» لتختبر نفسك في خانات ذلك الجدول وحده.</p>' +
  '</section>';
}
function startQuiz(ids, label, mode, les) {
  ids = ids.filter(function (id) { return Q[id]; });
  if (!ids.length) { toast('لا أسئلة هنا'); return; }
  quiz = { ids: ids, i: 0, picked: null, tfPick: null, tfText: '', self: null, lastEt: '', results: [], label: label, mode: mode || 'bank', les: les || null, order: {}, nb0: {}, lastRes: null, fin: false, rounds: [], quitArmed: false,
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
/* نوع الخطأ الذي بُني عليه ما اختاره الطالب: العبارة الخاطئة التي صدّقها، أو الخيار الخاطئ */
function errType(q, v) {
  if (q.k === 'tf') return v === 1 && q.a === false ? String(q.e || '') : '';
  return Array.isArray(q.e) && q.e[v] ? String(q.e[v]) : '';
}
/* «متوقع» لا يظهر إلا في المراجعة (التسميع والمراجعة الشاملة وصفحة المراجعة) في آخر ثلاثة أيام قبل الاختبار */
function expOn() { var d = daysLeft(); return d !== null && d >= 0 && d <= 3; }
function expTag(x) { return x && x.exp && expOn() ? '<span class="expect">متوقع</span>' : ''; }
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
    '<div class="chips"><span class="chip">' + KQ[q.k] + '</span><span class="chip">' + esc(q.ch.title) + '</span><span class="chip">الدرس ' + q.les.no + '</span>' + (quiz.nb0[q.id] ? '<span class="chip">من دفتر الأخطاء</span>' : '') + (quiz.mode === 'recall' || quiz.mode === 'review' || quiz.mode === 'expq' ? expTag(q) : '') + '</div>';
  var b = '<p class="q-text">' + qText(q) + '</p>';
  if (q.k === 'tf') {
    /* صح أو خطأ مع التعليل: يختار الحكم، ثم يعلّل بكلماته أو في ذهنه، ثم ينكشف الجواب وتعليل الكتاب فيقارن */
    var tp = quiz.tfPick;
    b += '<div class="tf">' + [[1, 'صح'], [0, 'خطأ']].map(function (t) {
      var cls = 'opt', v = t[0] === 1;
      if (answered) { if (v === !!q.a) cls += ' is-right'; else if (quiz.picked === t[0]) cls += ' is-wrong'; }
      else if (tp === t[0]) cls += ' is-sel';
      return '<button type="button" class="' + cls + '" data-act="tf-pick" data-v="' + t[0] + '"' + (answered ? ' disabled' : ' aria-pressed="' + (tp === t[0]) + '"') + '>' + t[1] + '</button>';
    }).join('') + '</div>';
    if (!answered && tp !== null) b += '<div class="why"><label for="whyText">علّل: ليش؟</label>' +
      '<textarea id="whyText" placeholder="اكتب تعليلك بكلماتك، أو قله في بالك ثم اكشف">' + esc(quiz.tfText || '') + '</textarea>' +
      '<button type="button" class="btn plain" data-act="tf-reveal">اكشف التعليل</button></div>';
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
    b += '<p class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'إجابة صحيحة' : 'إجابة خاطئة') + (q.k === 'tf' ? ': العبارة ' + (q.a ? 'صحيحة' : 'خاطئة') : '') + '</p>' +
      (!ok && quiz.lastEt ? '<p class="etype">نوع خطئك: <b>' + esc(quiz.lastEt) + '</b></p>' : '') + nbNote(quiz.lastRes, ok) +
      (q.k === 'tf'
        ? (quiz.tfText ? '<div class="my-why"><span>تعليلك</span><p>' + esc(quiz.tfText) + '</p></div>' : '') +
          '<div class="book-why"><span>التعليل من الكتاب</span><p>' + rich(q.why || '') + pg(q.pg) + '</p></div>' +
          '<div class="self" role="group" aria-label="قارن تعليلك بتعليل الكتاب"><button type="button" class="btn plain' + (quiz.self === 1 ? ' on' : '') + '" data-act="why-self" data-s="1" aria-pressed="' + (quiz.self === 1) + '">علّلت صح</button>' +
          '<button type="button" class="btn plain miss' + (quiz.self === 0 ? ' on' : '') + '" data-act="why-self" data-s="0" aria-pressed="' + (quiz.self === 0) + '">فاتني شيء</button></div>' +
          (quiz.self === 0 ? '<p class="nb-note">دخل دفتر الأخطاء ليعود إليك، ولا يغيّر مستواك.</p>' : '')
        : (q.why ? '<p class="why">' + rich(q.why) + pg(q.pg) + '</p>' : '<p class="why">' + pg(q.pg) + '</p>')) +
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
  } else if (quiz.mode === 'imp') {
    var back = quiz.ids.filter(function (id) { return !impDone(id); }).length;
    quiz.finMsg = { ok: !back, t: back ? 'حُفظ ما أصبت فيه، وبقي لك ' + countWord(back, W.q) + ' تعود إليك.' : 'حُفظت كلها.' };
  }
}
function resultHTML() {
  finishQuiz(false);
  var right = quiz.results.filter(Boolean).length, n = quiz.results.length, total = quiz.ids.length, pct = n ? Math.round(100 * right / n) : 0;
  if (quiz.mode === 'exit') pct = quiz.pct;
  var by = {};
  quiz.ids.slice(0, n).forEach(function (id, i) { var c = Q[id].ch.id; by[c] = by[c] || { n: 0, c: 0 }; by[c].n++; if (quiz.results[i]) by[c].c++; });
  var rows = Object.keys(by).map(function (c) { var x = by[c], p = Math.round(100 * x.c / x.n); return '<div class="lvl-row"><span class="lvl-no">' + CH[c].n + '</span><div class="nm">' + esc(chLabel(CH[c])) + '</div><span class="pill ' + level({ n: 10, pct: p, all: true }).k + '">' + x.c + ' من ' + x.n + '</span></div>'; }).join('');
  var mk = mistakes().length, l = LBY[quiz.les], nav;
  if (quiz.mode === 'exit' && l) { var nx = LES[LES.indexOf(l) + 1]; nav = '<a class="btn" href="#l-' + l.n + '">إلى الدرس</a>' + (nx ? '<a class="btn ghost" href="#l-' + nx.n + '">الدرس التالي</a>' : ''); }
  else if (quiz.mode === 'recall' || quiz.mode === 'review') nav = '<a class="btn" href="#home">الرئيسية</a><button type="button" class="btn ghost" data-go="#nb">دفتر الأخطاء (' + mk + ')</button>';
  else if (quiz.mode === 'imp') nav = '<button type="button" class="btn" data-act="imp-go">تابع المهم</button><a class="btn ghost" href="#imp-' + (quiz.gid || 1) + '">إلى المجموعة</a>';
  else nav = '<button type="button" class="btn" data-act="new-quiz">اختبار جديد</button><button type="button" class="btn ghost" data-go="#nb">دفتر الأخطاء (' + mk + ')</button>';
  return '<div class="block-head"><h2>النتيجة</h2><span class="chip">' + esc(quiz.label) + '</span></div><section class="card"><div class="score">' + pct + '%</div>' +
    '<p class="muted p0">' + right + ' صحيحة من ' + (quiz.mode === 'exit' ? total : n) + (n < total && quiz.mode !== 'exit' ? ' (أنهيت قبل آخر الأسئلة)' : '') + '</p>' +
    (quiz.finMsg ? '<p class="fin-msg ' + (quiz.finMsg.ok ? 'ok' : 'bad') + '">' + esc(quiz.finMsg.t) + '</p>' : '') +
    (rows ? '<div class="res-rows">' + rows + '</div>' : '') + '</section>' +
    '<div class="row">' + nav + '</div>';
}

/* ---------- سؤال الخانة ---------- */
function startCells(list, label, back, src) {
  if (!list.length) { toast('لا خانات هنا'); return; }
  CQ = { ids: list.map(function (c) { return c.id; }), i: 0, picked: null, res: [], label: label, back: back || '#quiz', src: src || null, order: {} };
  go('#cells');
}
function cellsAgain() {
  var s = CQ && CQ.src, back = CQ ? CQ.back : '#quiz';
  if (s && s.k === 'tbl') { var tc = tableCells(s.id); if (tc.length) { startCells(cellPick(tc, 0), CQ.label, back, s); return; } }
  if (s && s.k === 'chs') {
    var cs = CELLS.filter(function (c) { return s.chs.indexOf(c.ch.id) > -1; });
    if (cs.length) { startCells(cellPick(cs, s.n), CQ.label, back, s); return; }
  }
  CQ = null; bankKind = 'cells'; go('#quiz');
}
function cellsHTML() {
  if (CQ.i >= CQ.ids.length) return cellsResultHTML();
  var c = CBY[CQ.ids[CQ.i]];
  if (!c) { CQ.i++; return cellsHTML(); }
  var t = c.t, cols = arr(t.cols), row = arr(arr(t.rows)[c.ri]), n = CQ.ids.length, answered = CQ.picked !== null;
  if (!CQ.order[c.id]) CQ.order[c.id] = shuffle(cols.map(function (_, i) { return i; }).slice(1));
  var h = '<div class="block-head"><h2>' + esc(CQ.label) + '</h2><button type="button" class="link" data-act="cell-quit">إنهاء</button></div>' +
    '<div class="qbar"><div class="track"><div class="fill" style="width:' + Math.round(100 * CQ.i / n) + '%"></div></div><span class="n">' + (CQ.i + 1) + ' من ' + n + '</span></div>' +
    '<div class="chips"><span class="chip">سؤال الخانة</span><span class="chip">' + esc(c.ch.title) + '</span>' + pg(t.pg) + expChip(t) + '</div>';
  var b = '<p class="cell-tbl">' + esc(t.title) + '</p>' +
    '<div class="cell-box"><span class="cell-asp">' + esc(c.aspect) + '</span><p class="cell-x">' + esc(c.x) + '</p></div>' +
    '<p class="q-text">لأيّها هذه الخانة؟</p>' +
    '<div class="opts">' + CQ.order[c.id].map(function (ci, k) {
      var cls = 'opt';
      if (answered) { if (ci === c.ci) cls += ' is-right'; else if (ci === CQ.picked) cls += ' is-wrong'; }
      return '<button type="button" class="' + cls + '" data-act="cell-answer" data-v="' + ci + '"' + (answered ? ' disabled' : '') + '><span class="k">' + 'أبجده'.charAt(k) + '</span><span>' + esc(cols[ci]) + '</span></button>';
    }).join('') + '</div>';
  if (answered) {
    var ok = CQ.res[CQ.res.length - 1];
    b += '<p class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'إجابة صحيحة' : 'إجابة خاطئة، والصواب: ' + esc(cols[c.ci])) + '</p>' +
      '<p class="sec-title p0">الصف كاملاً: ' + esc(c.aspect) + '</p>' +
      '<dl class="cell-row">' + cols.map(function (cn, ci) {
        if (!ci) return '';
        var v = row[ci] == null || String(row[ci]).trim() === '' ? '—' : row[ci];
        return '<div' + (ci === c.ci ? ' class="on"' : '') + '><dt>' + esc(cn) + '</dt><dd>' + esc(v) + '</dd></div>';
      }).join('') + '</dl>' +
      (t.core ? '<p class="why"><b>الفرق الجوهري:</b> ' + esc(t.core) + '</p>' : '') +
      '<div class="row"><button type="button" class="btn" data-act="cell-next">' + (CQ.i + 1 < n ? 'الخانة التالية' : 'النتيجة') + '</button></div>';
  }
  return h + '<section class="card">' + b + '</section>';
}
function cellsResultHTML() {
  var n = CQ.res.length, right = CQ.res.filter(Boolean).length, pct = n ? Math.round(100 * right / n) : 0;
  var wrong = CQ.ids.slice(0, n).filter(function (id, i) { return !CQ.res[i] && CBY[id]; }).map(function (id) { return CBY[id]; });
  return '<div class="block-head"><h2>النتيجة</h2><span class="chip">' + esc(CQ.label) + '</span></div>' +
    '<section class="card"><div class="score">' + pct + '%</div>' +
    '<p class="muted p0">' + right + ' صحيحة من ' + n + (n < CQ.ids.length ? ' (أنهيت قبل آخر الخانات)' : '') + '</p>' +
    (wrong.length ? '<p class="sec-title">ما أخطأت فيه، ويُقدَّم في المرة القادمة</p><ul class="cell-miss">' + wrong.map(function (c) {
      return '<li><span class="cell-asp">' + esc(c.t.title) + ' · ' + esc(c.aspect) + '</span><span class="cell-mx">' + esc(c.x) + '</span><b>' + esc(arr(c.t.cols)[c.ci]) + '</b></li>';
    }).join('') + '</ul>' : (n ? '<p class="fin-msg ok">أصبت في الخانات كلها.</p>' : '')) +
    '</section>' +
    '<div class="row"><button type="button" class="btn" data-act="cell-again">جولة أخرى</button><button type="button" class="btn ghost" data-act="cell-quit">رجوع</button></div>';
}

/* ---------- «التعريفات»: ركّب التعريف من قطعه، أو لمن هذا التعريف؟ أو «اطّلاع» بلا اختبار ----------
   سجله في S.def، والمستبعد في S.dx، وما مُرّ به في «اطّلاع» في S.dv، ولا يدخل دفتر الأخطاء ولا المستوى ولا جولات البنك.
   ويُقدَّم في الجولة ما أخطأت فيه آخر مرة، ثم ما لم تُسأل عنه، ثم الباقي وأقلّه صواباً أولاً */
var DQ = null;     /* { ids, i, mode, label, res, cur: { id, i, chips, placed, errs, wrong, gave, ans, opts, picked, open, cmp } } */
var defsSel = null, defsMode = 'build', defsCount = 10, defsVCount = 10, defsCmp = true, defsReady = false;
var dvArm = false, dvArmT = null;
function defsInit() {
  if (defsReady) return; defsReady = true;
  defsSel = loadPick('defsSel', defsIn);
  var m = ST.pref('defsMode'); if (m === 'build' || m === 'who' || m === 'view') defsMode = m;
  var c = ST.pref('defsCount'); if (c === 10 || c === 20 || c === 0) defsCount = c;
  var v = ST.pref('defsVCount'); if (v === 10 || v === 15 || v === 20) defsVCount = v;
  if (ST.pref('defsCmp') === false) defsCmp = false;
}
function defsSave() { savePick('defsSel', defsSel); ST.setPref('defsMode', defsMode); ST.setPref('defsCount', defsCount); ST.setPref('defsVCount', defsVCount); ST.setPref('defsCmp', defsCmp); }
function dxOn(id) { var x = S.dx && S.dx[id]; return !!(x && x.v); }
function setDx(id, on) { if (!S.dx || typeof S.dx !== 'object') S.dx = {}; S.dx[id] = { v: on ? 1 : 0, t: now() }; ST.save(); }
function dvOn(id) { var x = S.dv && S.dv[id]; return !!(x && x.v); }
function setDv(id, on) { if (!S.dv || typeof S.dv !== 'object') S.dv = {}; if (dvOn(id) === !!on) return; S.dv[id] = { v: on ? 1 : 0, t: now() }; ST.save(); }
function defRec(id) { var r = S.def && S.def[id]; return r && typeof r === 'object' ? r : null; }
function defWeight(d) { var r = defRec(d.id); if (!r) return 1; if (+r.w) return 0; return 2 + (+r.n ? (+r.c || 0) / +r.n : 0); }
function defRecord(id, ok) {
  if (!S.def || typeof S.def !== 'object') S.def = {};
  var r = defRec(id) || {};
  S.def[id] = { n: (+r.n || 0) + 1, c: (+r.c || 0) + (ok ? 1 : 0), w: ok ? 0 : 1, t: now() };
  ST.save();
}
function defsPool() { return DEFS.filter(function (d) { return defsSel[d.les.id] && !dxOn(d.id); }); }
function viewPool() { return defsPool().filter(function (d) { return !dvOn(d.id); }); }
/* ترتيب الكتاب: بالدرس ثم بالصفحة، فما تجاور في الكتاب يتجاور في البطاقات */
function bookSort(list) {
  return list.map(function (d, i) { return { d: d, i: i, p: parseInt(d.pg, 10) || 0 }; })
    .sort(function (a, b) { return (a.d.les.no - b.d.les.no) || (a.p - b.p) || (a.i - b.i); })
    .map(function (x) { return x.d; });
}
/* المقابلة بلا تشكيل ولا ترقيم، والهمزات والتاء المربوطة موحّدة */
function dnorm(s) {
  return String(s == null ? '' : s).replace(/[ً-ْٰـ]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[^ء-يA-Za-z0-9٠-٩]+/g, ' ').trim();
}
function dwords(s) { var n = dnorm(s); return n ? n.split(' ') : []; }
/* كلمات المعنى: بلا حروف المعاني الشائعة، وكل كلمة مرة */
var DSTOP = {};
'و في من على عن إلى أو ثم أن إن التي الذي هي هو ما لا قد كل بين مع حيث ذلك هذه هذا تلك يتم كما إذا عند به بها له لها فيه فيها منه منها'.split(' ').forEach(function (w) { DSTOP[dnorm(w)] = 1; });
function cwords(d) {
  if (!d._cw) { var seen = {}; d._cw = dwords(d.text).filter(function (w) { if (DSTOP[w] || seen[w]) return false; seen[w] = 1; return true; }); }
  return d._cw;
}
/* نسبة الكلمات المشتركة إلى كلمات أقصر التعريفين */
function simRatio(a, b) {
  var A = cwords(a), B = cwords(b), m = Math.min(A.length, B.length), set = {}, n = 0;
  if (!m) return 0;
  A.forEach(function (w) { set[w] = 1; }); B.forEach(function (w) { if (set[w]) n++; });
  return n / m;
}
function bySim(d, list) { return list.slice().sort(function (x, y) { return simRatio(d, y) - simRatio(d, x); }); }
/* المصطلح بلا ما بين قوسين: «الإقليم (ص57)» و«الإقليم (ص179)» مصطلح واحد */
function baseTerm(d) { return dnorm(String(d.term).replace(/\s*\([^()]*\)/g, '')); }
/* شبيهه الحقيقي للمقارنة بعد الإجابة: تعريف آخر للمصطلح نفسه، وإلا تعريف تشترك معه نصف كلمات أقصرهما على الأقل،
   والأشبه أولى، وأقاربه في الأسر أولى عند التساوي. فإن لم يكن له شبيه عُرض وحده */
function lookAlike(d) {
  var bt = baseTerm(d), best = null, bs = -1;
  DEFS.forEach(function (x) {
    if (x === d) return;
    var same = !!bt && baseTerm(x) === bt, r = simRatio(d, x);
    if (!same && r < 0.5) return;
    var s = (same ? 10 : 0) + r + (d.sibs.indexOf(x) > -1 ? 0.001 : 0);
    if (s > bs) { bs = s; best = x; }
  });
  return best;
}
/* القطع: قطع التعريف الصحيحة، ومعها بعددها قطع دخيلة، ست على الأقل وأربع عشرة على الأكثر: من قطع أقاربه في أسره
   أولاً، ثم من تعريفات فصله، ثم من أي تعريف، وبترتيب عشوائي في كل طبقة. ولا دخيلة تساوي قطعة صحيحة، ولا قطعتان مكررتان */
function defChips(d) {
  var used = {}, want = clamp(d.parts.length, 6, 14), fake = [];
  d.parts.forEach(function (p) { used[dnorm(p)] = 1; });
  function fill(src) {
    var c = [];
    src.forEach(function (x) { x.parts.forEach(function (p) { var k = dnorm(p); if (k && !used[k]) { used[k] = 1; c.push(p); } }); });
    c = shuffle(c);
    var pick = c.slice(0, want - fake.length);
    c.slice(pick.length).forEach(function (p) { delete used[dnorm(p)]; });
    fake = fake.concat(pick);
  }
  fill(d.sibs);
  if (fake.length < want) fill(DEFS.filter(function (x) { return x !== d && x.ch === d.ch && d.sibs.indexOf(x) < 0; }));
  if (fake.length < want) fill(DEFS.filter(function (x) { return x !== d && x.ch !== d.ch && d.sibs.indexOf(x) < 0; }));
  return shuffle(d.parts.map(function (p) { return { t: p }; }).concat(fake.map(function (p) { return { t: p, f: 1 }; })));
}
/* الخيارات: ستة، المصطلح الصحيح وأشبه أقاربه تعريفاً، ثم مصطلحات فصله، ثم أي مصطلح، بلا تكرار */
function defOpts(d) {
  var seen = {}, opts = [];
  seen[dnorm(d.term)] = 1;
  function add(list) { list.forEach(function (x) { var k = dnorm(x.term); if (opts.length < 5 && !seen[k]) { seen[k] = 1; opts.push(x); } }); }
  add(bySim(d, d.sibs));
  if (opts.length < 5) add(bySim(d, DEFS.filter(function (x) { return x !== d && x.ch === d.ch; })));
  if (opts.length < 5) add(bySim(d, DEFS.filter(function (x) { return x !== d; })));
  return shuffle([d].concat(opts)).map(function (x) { return x.id; });
}
/* النص وما يكشف المصطلح فيه مستور */
function maskHTML(text, hides) {
  var rs = [], m = [], out = '', pos = 0;
  hides.forEach(function (h) { var i = h ? text.indexOf(h) : -1; while (i > -1) { rs.push([i, i + h.length]); i = text.indexOf(h, i + h.length); } });
  rs.sort(function (a, b) { return a[0] - b[0]; });
  rs.forEach(function (r) { var l = m[m.length - 1]; if (l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else m.push(r.slice()); });
  m.forEach(function (r) { out += esc(text.slice(pos, r[0])) + '<span class="dmask" aria-label="كلمات محذوفة">ـــــ</span>'; pos = r[1]; });
  return out + esc(text.slice(pos));
}
/* الفرق بين تعريفين كلمةً كلمة: ما ليس في أطول تسلسل مشترك يُظلَّل في كلٍّ منهما */
function diffHTML(a, b) {
  var A = a.split(/\s+/), B = b.split(/\s+/), nA = A.map(dnorm), nB = B.map(dnorm), L = [], i, j, kA = {}, kB = {};
  for (i = 0; i <= A.length; i++) { L.push([]); for (j = 0; j <= B.length; j++) L[i].push(0); }
  for (i = A.length - 1; i >= 0; i--) for (j = B.length - 1; j >= 0; j--) L[i][j] = nA[i] && nA[i] === nB[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  for (i = 0, j = 0; i < A.length && j < B.length;) {
    if (nA[i] && nA[i] === nB[j]) { kA[i] = kB[j] = 1; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  function out(W, keep) { return W.map(function (w, k) { return keep[k] || !dnorm(w) ? esc(w) : '<mark class="dd">' + esc(w) + '</mark>'; }).join(' '); }
  return [out(A, kA), out(B, kB)];
}
function defsStart() {
  defsInit();
  if (defsMode === 'view') {
    var vl = bookSort(viewPool()).slice(0, defsVCount);
    if (!vl.length) { toast('لا تعريفات هنا'); return; }
    DQ = { ids: vl.map(function (d) { return d.id; }), i: 0, mode: 'view', res: [], cur: null, kept: {}, label: 'اطّلاع · ' + selLabel(defsSel, defsIn) };
    go('#defs'); return;
  }
  var list = shuffle(defsPool()).sort(function (x, y) { return defWeight(x) - defWeight(y); });
  if (defsCount) list = list.slice(0, defsCount);
  if (!list.length) { toast('لا تعريفات هنا'); return; }
  DQ = { ids: list.map(function (d) { return d.id; }), i: 0, mode: defsMode, res: [], cur: null,
    label: (defsMode === 'who' ? 'لمن هذا التعريف؟' : 'ركّب التعريف') + ' · ' + selLabel(defsSel, defsIn) };
  go('#defs');
}
function dqItem() {
  var d = DBY[DQ.ids[DQ.i]];
  if (!DQ.cur || DQ.cur.i !== DQ.i || DQ.cur.id !== d.id) {
    DQ.cur = { id: d.id, i: DQ.i, chips: DQ.mode === 'build' ? defChips(d) : null, placed: [], errs: 0, wrong: false, gave: false, ans: null,
      opts: DQ.mode === 'who' ? defOpts(d) : null, picked: null, open: false, cmp: false };
  }
  return d;
}
function defsAnswer(ok) { DQ.cur.ans = !!ok; DQ.res.push(!!ok); defRecord(DQ.cur.id, !!ok); }
/* أسفل إعداد «اطّلاع»: العدّاد، وزر البدء، و«ابدأ من جديد» فيما اختير. ولا يُؤكَّد البدء من جديد إلا إن بقي شيء لم يُمرّ به */
function viewSetupEnd(left, n) {
  var all = DEFS.filter(function (d) { return !dxOn(d.id); }), seen = all.filter(function (d) { return dvOn(d.id); }).length;
  var sel = defsPool().length, every = allPicked(defsSel, pickable(defsIn));
  var h = '<p class="note-line">اطّلعت على ' + seen + ' من ' + countWord(all.length, W.def, true) + (every || !sel ? '' : '، وبقي فيما اخترت ' + (left ? countWord(left, W.def) : 'لا شيء')) + '.</p>';
  if (sel && !left) return h + '<p class="fin-msg ok">اطّلعت على كل ما اخترت.</p><button type="button" class="btn wide" data-act="defs-vreset">ابدأ من جديد</button>';
  h += '<button type="button" class="btn wide" data-act="defs-start"' + (n ? '' : ' disabled') + '>ابدأ: ' + (n ? countWord(n, W.card) : 'اختر درساً فيه تعريفات') + '</button>';
  if (sel > left) h += '<button type="button" class="link" data-act="defs-vreset">' + (dvArm ? 'اضغط ثانية ليعود إليك ما مررت به' : every ? 'ابدأ من جديد' : 'ابدأ من جديد في هذا الاختيار') + '</button>';
  return h;
}
function defsSetup() {
  defsInit();
  var isV = defsMode === 'view', left = isV ? viewPool().length : 0, pool = isV ? left : defsPool().length, lim = isV ? defsVCount : defsCount;
  var n = lim ? Math.min(lim, pool) : pool, going = DQ && DQ.i < DQ.ids.length;
  var xs = DEFS.filter(function (d) { return dxOn(d.id); });
  return '<p class="muted small p0">' + (isV ? 'في «اطّلاع» ترى المصطلح ثم تضغط فيظهر تعريفه، بلا سؤال ولا نتيجة. وما تجاوزته لا يعود إليك فيها إلا إن ضغطت «أعدها لي»، ويبقى يُسأل عنه في طريقتي الاختبار.' :
      'في «ركّب التعريف» ترى المصطلح فترتّب قطع تعريفه، وفي «لمن هذا التعريف؟» ترى التعريف فتختار مصطلحه. ثم يُعرض بجوار أقرب تعريف إليه وقد ظُلّل ما يفترقان فيه. ويُقدَّم ما أخطأت فيه في الجولة التالية، ولا يدخل المستوى ولا دفتر الأخطاء.') + '</p>' +
    (going ? '<section class="card tight"><p class="fin-msg">عندك جولة جارية: ' + esc(DQ.label) + '، ' + (DQ.mode === 'view' ? 'مررت بـ' + DQ.i : 'أجبت عن ' + DQ.res.length) + ' من ' + DQ.ids.length + '.</p><button type="button" class="btn wide" data-go="#defs">أكملها</button></section>' : '') +
    '<section class="card">' +
    '<div class="field"><span class="f-l">الطريقة</span><div class="seg" role="group" aria-label="الطريقة">' + [['build', 'ركّب التعريف'], ['who', 'لمن هذا التعريف؟'], ['view', 'اطّلاع']].map(function (m) {
      return '<button type="button" data-act="defs-mode" data-m="' + m[0] + '" aria-pressed="' + (defsMode === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div></div>' +
    '<div class="field"><span class="f-l">' + (isV ? 'عدد البطاقات' : 'عدد التعريفات') + '</span><div class="seg" role="group" aria-label="' + (isV ? 'عدد البطاقات' : 'عدد التعريفات') + '">' +
      (isV ? [10, 15, 20] : [10, 20, 0]).map(function (x) { return '<button type="button" data-act="defs-count" data-n="' + x + '" aria-pressed="' + (lim === x) + '">' + (x ? x : 'الكل') + '</button>'; }).join('') + '</div></div>' +
    (isV ? '<div class="toggle"><span class="small">زر «قارنه بشبيهه» على البطاقات</span><button type="button" class="switch" data-act="defs-cmp" role="switch" aria-checked="' + defsCmp + '" aria-label="زر المقارنة بالشبيه"></button></div>' : '') +
    (isV ? viewSetupEnd(left, n) : '') +
    '<div class="field">' + lesPicker(defsSel, 'defs', defsIn, W.def) + '</div>' +
    (isV ? (n ? '<button type="button" class="btn wide" data-act="defs-start">ابدأ: ' + countWord(n, W.card) + '</button>' : '') :
      '<button type="button" class="btn wide" data-act="defs-start"' + (n ? '' : ' disabled') + '>ابدأ: ' + (n ? countWord(n, W.def) : 'اختر درساً فيه تعريفات') + '</button>') +
    '</section>' +
    '<details class="dx-box"><summary>المستبعدة (' + xs.length + ')</summary>' + (xs.length ? '<ul class="dx-list">' + xs.map(function (d) {
      return '<li><span><b>' + esc(d.term) + '</b><small>' + esc(d.ch.title) + ' · ص ' + esc(d.pg) + '</small></span><button type="button" class="btn ghost sm" data-act="defs-back" data-id="' + esc(d.id) + '">أعِد</button></li>';
    }).join('') + '</ul>' : '<p class="muted small p0">لا تعريفات مستبعدة. وما تستبعده بزر «استبعد» لا يُسأل عنه في الجولات حتى تعيده من هنا.</p>') + '</details>';
}
function defBlock(x, html, sib) {
  return '<div class="dcmp-i' + (sib ? ' sib' : '') + '"><p class="dcmp-t"><b>' + esc(x.term) + '</b>' + pg(x.pg) + (x.sum ? '<span class="dsum">بلفظ الملخص</span>' : '') + '</p>' +
    '<p class="dcmp-x' + (x.sum ? '' : ' book') + '">' + html + '</p></div>';
}
function defsAfter(d, c) {
  var e = c.errs, v = c.ans ? 'أصبت' : DQ.mode === 'who' ? 'إجابة خاطئة، والصواب: ' + d.term
    : c.gave ? 'كشفت التعريف، فيُحسب خطأ ويُقدَّم في الجولة التالية'
    : 'أخطأت في الترتيب ' + (e === 1 ? 'مرة' : e === 2 ? 'مرتين' : e + (e <= 10 ? ' مرات' : ' مرة')) + '، فيُقدَّم في الجولة التالية';
  var sib = lookAlike(d), dh = sib ? diffHTML(d.text, sib.text) : [esc(d.text)];
  return '<p class="verdict ' + (c.ans ? 'ok' : 'bad') + '">' + esc(v) + '</p>' +
    '<div class="dcmp">' + defBlock(d, dh[0], false) + (sib ? '<p class="dcmp-v">ويشبهه هذا التعريف، وقد ظُلّل ما يفترقان فيه</p>' + defBlock(sib, dh[1], true) : '') + '</div>' +
    '<div class="row"><button type="button" class="btn" data-act="defs-next">' + (DQ.i + 1 < DQ.ids.length ? 'التالي' : 'النتيجة') + '</button>' +
    '<button type="button" class="btn ghost" data-act="defs-x" data-id="' + esc(d.id) + '">' + (dxOn(d.id) ? 'مستبعد · أعِده' : 'استبعد') + '</button></div>';
}
function defsHTML() {
  if (DQ.i >= DQ.ids.length) return defsResultHTML();
  if (!DBY[DQ.ids[DQ.i]]) { DQ.ids.splice(DQ.i, 1); return defsHTML(); }
  var d = dqItem(), c = DQ.cur, n = DQ.ids.length, done = c.ans !== null, build = DQ.mode === 'build';
  if (DQ.mode === 'view') return viewHTML(d, c);
  var h = '<div class="block-head"><h2>' + esc(DQ.label) + '</h2><button type="button" class="link" data-act="defs-quit">إنهاء</button></div>' +
    '<div class="qbar"><div class="track"><div class="fill" style="width:' + Math.round(100 * DQ.i / n) + '%"></div></div><span class="n">' + (DQ.i + 1) + ' من ' + n + '</span></div>' +
    '<div class="chips"><span class="chip">' + (build ? 'ركّب التعريف' : 'لمن هذا التعريف؟') + '</span><span class="chip">' + esc(d.ch.title) + '</span>' + (build ? pg(d.pg) : '') + expChip(d) + '</div>';
  var b = '';
  if (build) {
    var put = c.placed.map(function (k) { return '<span>' + esc(c.chips[k].t) + '</span>'; });
    b += '<p class="dterm">' + esc(d.term) + '</p>' +
      '<div class="dline' + (done ? ' full' : '') + '" aria-live="polite">' + (put.length ? put.join(' ') : '<span class="dline-ph">اضغط القطع بترتيب التعريف</span>') + '</div>';
    if (!done) {
      b += '<div class="dchips">' + c.chips.map(function (x, k) { return c.placed.indexOf(k) > -1 ? '' : '<button type="button" class="dchip" data-act="defs-chip" data-k="' + k + '">' + esc(x.t) + '</button>'; }).join('') + '</div>' +
        '<div class="dtools"><button type="button" class="link" data-act="defs-show">أظهر التعريف</button>' + (c.errs ? '<span class="small muted">' + countWord(c.errs, W.err) + '</span>' : '') +
        '<button type="button" class="mini" data-act="defs-x" data-id="' + esc(d.id) + '">استبعد</button></div>';
    }
  } else {
    b += '<p class="q-text">لمن هذا التعريف؟</p><div class="dbox' + (d.sum ? '' : ' book') + '">' + maskHTML(d.text, d.hide) + '</div>' +
      '<div class="opts">' + c.opts.map(function (id, k) {
        var cls = 'opt';
        if (done) { if (id === d.id) cls += ' is-right'; else if (id === c.picked) cls += ' is-wrong'; }
        return '<button type="button" class="' + cls + '" data-act="defs-pick" data-id="' + esc(id) + '"' + (done ? ' disabled' : '') + '><span class="k">' + 'أبجدهو'.charAt(k) + '</span><span>' + esc(DBY[id].term) + '</span></button>';
      }).join('') + '</div>';
    if (!done) b += '<div class="dtools end"><button type="button" class="mini" data-act="defs-x" data-id="' + esc(d.id) + '">استبعد</button></div>';
  }
  if (done) b += defsAfter(d, c);
  return h + '<section class="card">' + b + '</section>';
}
/* «اطّلاع»: وجه البطاقة المصطلح وظهرها التعريف بنصه الحرفي، ولا جواب فيها ولا نتيجة */
function viewCard(d, open) {
  var ref = 'ص ' + d.pg, top = '<span class="fc-top"><span class="fc-type">تعريف</span><span class="fc-ref">' + (d.imp ? IMPW[d.imp] + ' · ' : '') + esc(ref) + '</span></span>';
  return '<button type="button" class="fc t-def' + (open ? ' flipped' : '') + '" data-act="defs-flip" aria-label="' + (open ? 'اعرض المصطلح' : 'أظهر التعريف') + '">' +
    '<span class="fc-inner">' +
      '<span class="face front" aria-hidden="' + !!open + '">' + top + '<span class="fc-body"><p class="fc-q">' + esc(d.term) + '</p><p class="fc-hint">اضغط ليظهر التعريف</p><span class="reveal">أظهر التعريف</span></span><span class="seal">' + esc(ref.replace(' ', '')) + '</span></span>' +
      '<span class="face back" aria-hidden="' + !open + '">' + top + '<span class="fc-body"><p class="fc-lead">' + esc(d.term) + '</p><p class="book fc-text">«' + esc(d.text) + '»</p></span></span>' +
    '</span></button>';
}
/* الزر الرئيس لا يتحرك من موضعه بعد الكشف، فالضغط في الموضع نفسه يكشف ثم يمضي، و«أعدها لي» في صف الأدوات تحته لا يمضي بنفسه */
function viewBar(d, c) {
  var sib = c.open && defsCmp ? lookAlike(d) : null, dh = sib && c.cmp ? diffHTML(d.text, sib.text) : null, kept = !!DQ.kept[d.id];
  return '<div class="deck-nav two"><button type="button" class="btn ghost" data-act="defs-vprev"' + (DQ.i ? '' : ' disabled') + '>السابقة</button>' +
      '<button type="button" class="btn" data-act="defs-vnext">' + (!c.open ? 'أظهر التعريف' : DQ.i + 1 < DQ.ids.length ? 'التالية' : 'إنهاء') + '</button></div>' +
    '<div class="dtools"><div class="row">' + (c.open ? '<button type="button" class="mini" data-act="defs-vkeep" aria-pressed="' + kept + '">' + (kept ? 'تعود إليك' : 'أعدها لي') + '</button>' : '') +
      (sib ? '<button type="button" class="mini" data-act="defs-vcmp" aria-pressed="' + !!c.cmp + '">' + (c.cmp ? 'أغلق المقارنة' : 'قارنه بشبيهه') + '</button>' : '') + '</div>' +
      '<button type="button" class="mini" data-act="defs-x" data-id="' + esc(d.id) + '">استبعد</button></div>' +
    (dh ? '<div class="dcmp">' + defBlock(d, dh[0], false) + '<p class="dcmp-v">ويشبهه هذا التعريف، وقد ظُلّل ما يفترقان فيه</p>' + defBlock(sib, dh[1], true) + '</div>' : '');
}
function viewHTML(d, c) {
  var n = DQ.ids.length;
  return '<div class="block-head"><h2>' + esc(DQ.label) + '</h2><button type="button" class="link" data-act="defs-quit">إنهاء</button></div>' +
    '<div class="qbar"><div class="track"><div class="fill" style="width:' + Math.round(100 * DQ.i / n) + '%"></div></div><span class="n">' + (DQ.i + 1) + ' من ' + n + '</span></div>' +
    '<p class="eyebrow">' + esc('الدرس ' + d.les.no + ': ' + d.les.title) + '</p>' +
    '<div class="deck-wrap"><div class="deck">' + viewCard(d, c.open) + '</div><div class="deck-wrap" id="vbar">' + viewBar(d, c) + '</div></div>';
}
/* يُحدَّث ما تحت البطاقة وحده عند قلبها، فتبقى حركة القلب */
function viewPaint() {
  var c = DQ.cur, fc = view.querySelector('.fc'), bar = document.getElementById('vbar');
  if (fc) { fc.classList.toggle('flipped', c.open); fc.setAttribute('aria-label', c.open ? 'اعرض المصطلح' : 'أظهر التعريف'); fc.querySelector('.front').setAttribute('aria-hidden', c.open); fc.querySelector('.back').setAttribute('aria-hidden', !c.open); }
  if (bar) bar.innerHTML = viewBar(DBY[c.id], c);
}
function viewOn() { return screen === 'defs' && !!DQ && DQ.mode === 'view' && DQ.i < DQ.ids.length; }
function viewFlip(on) { DQ.cur.open = on; if (!on) DQ.cur.cmp = false; viewPaint(); }
function viewMove() { DQ.i++; DQ.cur = null; render(); window.scrollTo(0, 0); }
/* إلى الأمام: يُظهر التعريف أولاً، ثم يحفظ البطاقة ويمضي، إلا ما عُلّم «أعدها لي». وإلى الخلف: تعود البطاقة مكشوفة */
function viewStep(dir) {
  if (!viewOn() || !DQ.cur) return;
  if (dir < 0) { if (!DQ.i) return; DQ.i--; DQ.cur = null; dqItem(); DQ.cur.open = true; render(); window.scrollTo(0, 0); return; }
  if (!DQ.cur.open) { viewFlip(true); return; }
  if (!DQ.kept[DQ.cur.id]) setDv(DQ.cur.id, true);
  viewMove();
}
function viewEndHTML() {
  var ids = DQ.ids.filter(function (id) { return DBY[id]; }), n = ids.length, kept = ids.filter(function (id) { return !dvOn(id); }).length, left = viewPool().length;
  return '<div class="block-head"><h2>انتهت الجولة</h2><span class="chip">' + esc(DQ.label) + '</span></div>' +
    '<section class="card deck-end"><div class="score">' + n + '</div><p class="muted p0">' + (n === 1 ? 'بطاقة مررت بها' : n ? 'مررت بـ' + countWord(n, W.card) : 'لم تمرّ ببطاقة') + (kept ? '، تعود إليك منها ' + countWord(kept, W.card) : '') + '، ' + (left ? 'وبقي فيما اخترت ' + countWord(left, W.def) : 'وفرغت من كل ما اخترت') + '.</p></section>' +
    '<div class="row">' + (left ? '<button type="button" class="btn" data-act="defs-again">جولة أخرى</button>' : '') + '<button type="button" class="btn ghost" data-act="defs-quit">رجوع</button></div>';
}
function defsResultHTML() {
  if (DQ.mode === 'view') return viewEndHTML();
  var n = DQ.res.length, right = DQ.res.filter(Boolean).length;
  var wrong = DQ.ids.slice(0, n).filter(function (id, i) { return !DQ.res[i] && DBY[id]; }).map(function (id) { return DBY[id]; });
  return '<div class="block-head"><h2>النتيجة</h2><span class="chip">' + esc(DQ.label) + '</span></div>' +
    '<section class="card"><div class="score">' + right + ' من ' + n + '</div>' +
    '<p class="muted p0">' + (n ? 'أصبت في ' + right + ' من ' + countWord(n, W.def, true) : 'لم تجب عن شيء') + (n < DQ.ids.length ? ' (أنهيت قبل آخرها)' : '') + '.</p>' +
    (wrong.length ? '<p class="sec-title">ما أخطأت فيه، ويُقدَّم في الجولة التالية</p><ul class="cell-miss">' + wrong.map(function (d) {
      return '<li><span class="cell-asp">' + esc(d.ch.title) + ' · ص ' + esc(d.pg) + '</span><b>' + esc(d.term) + '</b></li>';
    }).join('') + '</ul>' : (n ? '<p class="fin-msg ok">أصبت فيها كلها.</p>' : '')) +
    '</section>' +
    '<div class="row"><button type="button" class="btn" data-act="defs-again">جولة أخرى</button><button type="button" class="btn ghost" data-act="defs-quit">رجوع</button></div>';
}

/* ---------- خانة «المهم»: مجموعات بترتيب المراجعة، وما رُوجع فيها يُحفظ في S.imp من الصفر، ثم باقي التحديد ---------- */
var IC = null;     /* جولة البطاقات: { g, ids, i, open, kept } */
var IR = null;     /* جولة المراجعة: { g, seq, i } */
var impSkip = ST.pref('impSkip') === true, impType = ST.pref('impType') || 'all', impRest = false, impArm = null, impArmT = null;
var IMPST = { cards: 'البطاقات والتعريفات', obj: 'الأسئلة الموضوعية', rev: 'المقارنات وورقة الليلة' };
var IMPSH = { cards: 'البطاقات', obj: 'الأسئلة', rev: 'المقارنات' };
var IMPSEC = { cards: 15, obj: 30, rev: 25 };   /* تقدير الثواني لكل بند */
function impOn(id) { var x = S.imp && S.imp[id]; return !!(x && x.v); }
function impSet(id, on) { if (!S.imp || typeof S.imp !== 'object') S.imp = {}; if (impOn(id) === !!on) return; S.imp[id] = { v: on ? 1 : 0, t: now() }; ST.save(); }
/* مفتاح التخطي: ما أصبت فيه كلما أجبت عنه من قبل، وما علّمته «أعرفها»، ولا يُكتب شيء في السجل */
function impPrior(id) {
  if (!impSkip) return false;
  if (Q[id]) { var r = S.q[id]; return !!r && +r.n > 0 && +r.c === +r.n; }
  return !!K[id] && known(id);
}
function impDone(id) { return impOn(id) || impPrior(id); }
function impLeft(ids) { return ids.filter(function (id) { return !impDone(id); }); }
function impStages(g) { return ['cards', 'obj', 'rev'].filter(function (st) { return g[st].length; }); }
function impTally(g) {
  var n = 0, d = 0;
  impStages(g).forEach(function (st) { var a = g[st]; n += a.length; d += a.length - impLeft(a).length; });
  return { n: n, d: d };
}
/* lv: الدرجة، وبلا درجة فالدرجتان معاً */
function impStats(lv) {
  var n = 0, d = 0, sec = 0;
  IMP.forEach(function (g) {
    if (lv === undefined ? !g.lv : g.lv !== lv) return;
    impStages(g).forEach(function (st) { var a = g[st], left = impLeft(a).length; n += a.length; d += a.length - left; sec += left * IMPSEC[st]; });
  });
  return { n: n, d: d, sec: sec };
}
function impNext() {
  var sts = impType === 'all' ? ['cards', 'obj', 'rev'] : [impType], i, j;
  for (i = 0; i < IMP.length; i++) for (j = 0; j < sts.length; j++) if (impLeft(IMP[i][sts[j]]).length) return { g: IMP[i], st: sts[j] };
  return null;
}
function hoursText(m) {
  m = Math.round(+m || 0); if (m < 60) return minutesText(Math.max(1, m));
  var u = Math.round(m / 30), h = Math.floor(u / 2);
  return (h === 1 ? 'ساعة' : h === 2 ? 'ساعتان' : h <= 10 ? h + ' ساعات' : h + ' ساعة') + (u % 2 ? ' ونصف' : '');
}
function impLesWord(g) {
  var n = g.les.map(function (l) { return l.no; });
  return n.length === 1 ? 'الدرس ' + n[0] : (n.length === 2 ? 'الدرسان ' : 'الدروس ') + n.join(' و');
}
function impName(g) { return g.note ? 'الفخاخ وما نبّه عليه الدكتور' : g.les.map(function (l) { return l.title; }).join(' · '); }
function impShort(g) { return g.note ? 'قبل أن تبدأ' : impLesWord(g); }
function impGoName(nx) { return nx.g.note ? impName(nx.g) : impShort(nx.g) + ' · ' + IMPSH[nx.st]; }
function impBar(p) { return '<div class="qbar"><div class="track"><div class="fill" style="width:' + clamp(p, 0, 100) + '%"></div></div><span class="n">' + p + '%</span></div>'; }
function impPct(d, n) { return n ? Math.floor(100 * d / n) : 0; }
function impHomeHTML() {
  if (!IMP.length) return '';
  var a = impStats(1), b = impStats(2), n = a.n + b.n, d = a.d + b.d;
  return '<section class="card tight"><div class="block-head"><h3>خانة المهم</h3><span class="chip">راجعت ' + d + ' من ' + n + '</span></div>' + impBar(impPct(d, n)) +
    '<button type="button" class="btn wide" data-go="#imp">' + (d ? 'تابع مراجعة المهم' : 'ابدأ مراجعة المهم') + '</button></section>';
}
function impRow(g) {
  var t = impTally(g), left = t.n - t.d;
  return '<li><a class="les-row" href="#imp-' + (g.idx + 1) + '"><span class="les-no">' + (g.note ? '!' : g.no || g.les[0].no) + '</span><span class="les-tx"><b>' + esc(impName(g)) + '</b><span>' + esc((g.note ? '' : impLesWord(g) + ' · ') + 'راجعت ' + t.d + ' من ' + t.n) + '</span></span>' +
    '<span class="les-st"><span class="pill ' + (left ? (t.d ? 'mid' : 'none') : 'top') + '">' + (left ? impPct(t.d, t.n) + '%' : 'أتممتها') + '</span></span></a></li>';
}
function impSecHTML(lv, title, note) {
  var gs = IMP.filter(function (g) { return g.lv === lv; }); if (!gs.length) return '';
  var st = impStats(lv);
  note = [note, st.sec ? 'بقي نحو ' + hoursText(st.sec / 60) + '.' : ''].filter(Boolean).join(' ');
  return '<section class="block"><div class="block-head"><h3>' + esc(title) + '</h3><span class="chip">' + st.d + ' من ' + st.n + '</span></div>' +
    (note ? '<p class="muted small p0">' + esc(note) + '</p>' : '') + '<ol class="les-list">' + gs.map(impRow).join('') + '</ol></section>';
}
function impHTML() {
  if (!IMP.length) return '<div class="empty"><b>لم يصل ملف الوسم</b><br>أعد فتح الصفحة بعد قليل.</div>';
  var a = impStats(1), b = impStats(2), c = impStats(0), n = a.n + b.n, d = a.d + b.d, over = d >= n, nx = impNext();
  var h = '<div class="block-head"><h2>خانة المهم</h2><span class="chip">راجعت ' + d + ' من ' + n + '</span></div>' + impBar(impPct(d, n)) +
    '<p class="muted small p0">مرتبة من الأهم إلى ما دونه. ما تراجعه هنا يُحفظ فلا يعود، ويُزامَن بين أجهزتك، والسؤال الذي تخطئ فيه يبقى لك حتى تصيبه ويدخل دفتر الأخطاء كالمعتاد.</p>' +
    '<div class="seg four" role="group" aria-label="نوع المراجعة">' + [['all', 'الكل'], ['cards', 'البطاقات'], ['obj', 'الموضوعي'], ['rev', 'المقارنات']].map(function (t) {
      return '<button type="button" data-act="imp-type" data-k="' + t[0] + '" aria-pressed="' + (impType === t[0]) + '">' + t[1] + '</button>';
    }).join('') + '</div>' +
    '<div class="toggle"><span class="small">تخطَّ ما أصبت فيه دائماً من قبل، وما علّمته «أعرفها»</span><button type="button" class="switch" data-act="imp-skip" role="switch" aria-checked="' + impSkip + '" aria-label="تخطي ما أصبت فيه من قبل"></button></div>';
  if (over) h += '<p class="fin-msg ok">أتممت المهم كله، فأكمل باقي التحديد.</p>';
  h += nx ? '<button type="button" class="btn wide" data-act="imp-go">' + esc((d ? 'تابع: ' : 'ابدأ: ') + impGoName(nx)) + '</button>'
    : '<p class="fin-msg ok">' + (impType === 'all' ? 'أتممت كل ما في الخانة.' : 'أتممت هذا النوع كله، فاختر نوعاً غيره.') + '</p>';
  h += impSecHTML(1, 'الأهم', '') + impSecHTML(2, 'مهم', '');
  if (c.n) {
    if (over || impRest) h += impSecHTML(0, 'باقي التحديد', 'ما لم يذكره المهم، ولا يتكرر فيه ما راجعته.');
    else h += '<button type="button" class="btn ghost wide" data-act="imp-rest">اعرض باقي التحديد: ' + c.d + ' من ' + c.n + '</button>';
  }
  return h;
}
function impGroupHTML(n) {
  var g = IMP[n - 1];
  if (!g) return '<div class="empty">لا توجد هذه المجموعة.</div><button type="button" class="btn ghost" data-go="#imp">خانة المهم</button>';
  var nxG = IMP[n], tag = g.lv ? '<span class="chip exp' + (g.lv === 2 ? ' lv2' : '') + '">' + IMPW[g.lv] + '</span>' : '<span class="chip">باقي التحديد</span>';
  var h = '<div class="block-head"><button type="button" class="link" data-go="#imp">خانة المهم</button>' + tag + '</div>' +
    '<section class="les-head"><p class="eyebrow">' + esc(impShort(g)) + '</p><h2>' + esc(impName(g)) + '</h2></section>' +
    stepsHTML(impStages(g).map(function (st) {
      var a = g[st], left = impLeft(a).length, d = a.length - left;
      return { t: g.note ? 'راجعها مرة قبل أن تبدأ' : IMPST[st], m: 'راجعت ' + d + ' من ' + a.length, done: !left,
        btn: '<button type="button" class="btn' + (left ? '' : ' ghost') + '" data-act="imp-start" data-g="' + g.idx + '" data-st="' + st + '">' + (left ? (d ? 'تابع' : 'ابدأ') : 'أعدها') + '</button>' };
    }));
  if (g.les.length) {
    h += '<p class="sec-title">الملخص</p><p class="muted small p0">افتحه إن أردت القراءة، فالخط الجانبي فيه يعلّم الفقرات الموسومة.</p><ol class="les-list">' + g.les.map(function (l) {
      return '<li><a class="les-row" href="#l-' + l.n + '"><span class="les-no">' + l.no + '</span><span class="les-tx"><b>' + esc(l.title) + '</b><span>ص ' + esc(l.pages) + '</span></span>' + GO + '</a></li>';
    }).join('') + '</ol>';
  }
  h += '<div class="row">' + (nxG ? '<a class="btn ghost" href="#imp-' + (n + 1) + '">المجموعة التالية</a>' : '') + '</div>' +
    '<button type="button" class="link center" data-act="imp-reset" data-g="' + g.idx + '">' + (impArm === g.idx ? 'اضغط مرة أخرى للتأكيد' : 'أعد هذه المجموعة من أولها') + '</button>';
  return h;
}
function impStart(g, st) {
  if (!g || !g[st] || !g[st].length) return;
  var left = impLeft(g[st]), ids = left.length ? left : g[st].slice();
  if (st === 'cards') { IC = { g: g, ids: ids, i: 0, open: false, kept: {} }; go('#impc'); return; }
  if (st === 'obj') {
    startQuiz(prioritized(ids.map(function (id) { return Q[id]; })).map(function (x) { return x.id; }), 'المهم: ' + impShort(g), 'imp');
    if (quiz) quiz.gid = g.idx + 1;
    return;
  }
  var seq = [], lines = [];
  ids.forEach(function (id) { if (TBID[id]) seq.push({ t: TBID[id], ids: [id] }); else lines.push(id); });
  if (lines.length) seq.push({ lines: lines, ids: lines });
  IR = { g: g, seq: seq, i: 0 }; go('#impr');
}
function impContinue() {
  IC = null; IR = null; if (quiz && quiz.i >= quiz.ids.length) quiz = null;
  var nx = impNext();
  if (nx) impStart(nx.g, nx.st); else go('#imp');
}
function impEnd(g, score, msg) {
  var nx = impNext();
  return '<div class="block-head"><h2>انتهت الجولة</h2><span class="chip">' + esc(impShort(g)) + '</span></div>' +
    '<section class="card deck-end"><div class="score">' + esc(score) + '</div><p class="muted p0">' + esc(msg) + '</p></section>' +
    '<div class="row">' + (nx ? '<button type="button" class="btn" data-act="imp-go">' + esc('تابع: ' + impGoName(nx)) + '</button>' : '') +
    '<a class="btn ghost" href="#imp-' + (g.idx + 1) + '">إلى المجموعة</a></div>';
}
/* جولة البطاقات: الزر الرئيس لا يتحرك، يكشف ثم يحفظ البطاقة ويمضي، و«أعدها لي» يُبقيها لك */
function icBar() {
  var id = IC.ids[IC.i], kept = !!IC.kept[id];
  return '<div class="deck-nav two"><button type="button" class="btn ghost" data-act="ic-prev"' + (IC.i ? '' : ' disabled') + '>السابقة</button>' +
    '<button type="button" class="btn" data-act="ic-next">' + (!IC.open ? 'اكشف الجواب' : IC.i + 1 < IC.ids.length ? 'التالية' : 'إنهاء') + '</button></div>' +
    (IC.open ? '<div class="dtools"><div class="row"><button type="button" class="mini" data-act="ic-keep" aria-pressed="' + kept + '">' + (kept ? 'تعود إليك' : 'أعدها لي') + '</button></div></div>' : '');
}
function impCardsHTML() {
  var n = IC.ids.length;
  if (IC.i >= n) {
    var back = IC.ids.filter(function (id) { return !impDone(id); }).length;
    return impEnd(IC.g, String(n), (n === 1 ? 'بطاقة مررت بها' : 'مررت بـ' + countWord(n, W.card)) + (back ? '، وتعود إليك منها ' + countWord(back, W.card) : '، وحُفظت كلها') + '.');
  }
  var k = K[IC.ids[IC.i]];
  return '<div class="block-head"><h2>' + esc('المهم: ' + impShort(IC.g)) + '</h2><button type="button" class="link" data-act="ic-quit">إنهاء</button></div>' +
    '<div class="qbar"><div class="track"><div class="fill" style="width:' + Math.round(100 * IC.i / n) + '%"></div></div><span class="n">' + (IC.i + 1) + ' من ' + n + '</span></div>' +
    '<p class="eyebrow">' + esc('الدرس ' + k.les.no + ': ' + k.les.title) + '</p>' +
    '<div class="deck-wrap"><div class="deck">' + cardHTML(k, IC.open) + '</div><div class="deck-wrap" id="vbar">' + icBar() + '</div></div>';
}
function icPaint() {
  var fc = view.querySelector('.fc'), bar = document.getElementById('vbar');
  if (fc) { fc.classList.toggle('flipped', IC.open); fc.setAttribute('aria-label', IC.open ? 'اعرض الوجه' : 'اقلب البطاقة'); fc.querySelector('.front').setAttribute('aria-hidden', IC.open); fc.querySelector('.back').setAttribute('aria-hidden', !IC.open); }
  if (bar) bar.innerHTML = icBar();
}
function icOn() { return screen === 'impc' && !!IC && IC.i < IC.ids.length; }
function icStep(dir) {
  if (!icOn()) return;
  if (dir < 0) { if (!IC.i) return; IC.i--; IC.open = true; render(); window.scrollTo(0, 0); return; }
  if (!IC.open) { IC.open = true; icPaint(); return; }
  var id = IC.ids[IC.i]; impSet(id, !IC.kept[id]);
  IC.i++; IC.open = false; render(); window.scrollTo(0, 0);
}
/* جولة المراجعة: كل جدول في صفحة، ثم أسطر ورقة الليلة أو الفخاخ معاً */
function impLine(id) {
  var m = /^(c\d+):(\d+)$/.exec(id);
  if (m) return CH[m[1]] ? CH[m[1]].night[+m[2]] : null;
  m = /^n(\d+)$/.exec(id);
  return m ? IMPN[+m[1]] : null;
}
function impRevHTML() {
  var n = IR.seq.length, s = IR.seq[IR.i];
  if (IR.i >= n) return impEnd(IR.g, 'تم', 'حُفظت مراجعتك لهذه المجموعة.');
  var more = IR.i + 1 < n;
  return '<div class="block-head"><h2>' + esc('المهم: ' + impShort(IR.g)) + '</h2><button type="button" class="link" data-act="ir-quit">إنهاء</button></div>' +
    '<div class="qbar"><div class="track"><div class="fill" style="width:' + Math.round(100 * IR.i / n) + '%"></div></div><span class="n">' + (IR.i + 1) + ' من ' + n + '</span></div>' +
    (s.t ? '<p class="muted small p0">املأ الجدول من ذاكرتك بزر «اختبر نفسي»، ثم انتقل.</p>' + cmpHTML(s.t)
      : '<p class="muted small p0">اقرأها سطراً سطراً، ثم انتقل.</p><ol class="night-list">' + s.lines.map(function (id) { var x = impLine(id); return x ? '<li>' + rich(x.x) + pg(x.pg) + '</li>' : ''; }).join('') + '</ol>') +
    '<div id="vbar"><div class="deck-nav two"><button type="button" class="btn ghost" data-act="ir-prev"' + (IR.i ? '' : ' disabled') + '>السابقة</button>' +
    '<button type="button" class="btn" data-act="ir-next">' + (more ? 'راجعته، التالي' : 'راجعته، إنهاء') + '</button></div></div>';
}
function irStep(dir) {
  if (!IR) return;
  if (dir < 0) { if (IR.i) { IR.i--; render(); window.scrollTo(0, 0); } return; }
  var s = IR.seq[IR.i]; if (!s) return;
  s.ids.forEach(function (id) { impSet(id, true); });
  IR.i++; render(); window.scrollTo(0, 0);
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
    return '<article class="art"><div class="chips"><span class="chip">' + KQ[q.k] + '</span><span class="chip">' + esc(q.ch.title) + ' · الدرس ' + q.les.no + '</span>' + pg(q.pg) + expChip(q) + '</div>' +
      '<p class="p0 strong">' + esc(q.q) + '</p><p class="p0 small">الصواب: <b>' + esc(ans) + '</b></p>' + (q.why ? '<p class="why small">' + rich(q.why) + '</p>' : '') +
      '<p class="nb-note">' + (+r.s ? 'أصبت فيه مرة في يوم سابق، وبقيت إجابة صحيحة في يوم آخر.' : 'يخرج بإجابتين صحيحتين في يومين مختلفين.') + ' أخطأت فيه ' + ((+r.n || 0) - (+r.c || 0) === 1 ? 'مرة' : ((+r.n || 0) - (+r.c || 0) === 2 ? 'مرتين' : ((+r.n || 0) - (+r.c || 0)) + ' مرات')) + '.</p></article>';
  }).join('');
}

/* ---------- المراجعة: البطاقات والمقارنات والخرائط والليلة الأخيرة ---------- */
function revHTML() {
  var subs = [['cards', 'البطاقات'], ['cmp', 'المقارنات'], ['maps', 'الخرائط'], ['night', 'الليلة الأخيرة']];
  if (expOn() && (QL.some(function (q) { return q.exp; }) || EL.some(function (x) { return x.exp; }))) subs.push(['exp', 'المتوقع']);
  if (!subs.some(function (s) { return s[0] === revSub; })) revSub = 'cards';
  var h = '<div class="seg" role="group" aria-label="أدوات المراجعة">' + subs.map(function (s) {
    return '<button type="button" data-act="rev-sub" data-sub="' + s[0] + '" aria-pressed="' + (revSub === s[0]) + '">' + s[1] + '</button>';
  }).join('') + '</div>';
  if (revSub === 'cards') return h + cardsBrowser();
  if (revSub === 'exp') {
    var eo = QL.filter(function (q) { return q.exp; }), ee = EL.filter(function (x) { return x.exp; });
    return h + '<p class="muted small p0">ما تكرر في أسئلة الطلاب السابقة. لا يظهر إلا في آخر ثلاثة أيام قبل الاختبار، فلا تهمل غيره.</p>' +
      (eo.length ? '<button type="button" class="btn wide" data-act="exp-quiz">اختبرني في ' + countWord(eo.length, W.q) + ' منها</button>' : '') +
      (ee.length ? '<section class="card"><p class="sec-title">أسئلة مقالية متوقعة</p><ol class="points ordered">' + ee.map(function (x) { return '<li>' + esc(x.q) + ' <span class="expect">متوقع</span>' + pg(x.pg) + '</li>'; }).join('') + '</ol></section>' : '');
  }
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
  var askable = tableCells(t.id).length;
  return '<section class="cmp" id="t-' + esc(t.id) + '"><div class="cmp-top"><h4>' + esc(t.title) + pg(t.pg) + expChip(t) + '</h4><span class="cmp-acts"><button type="button" class="mini" data-act="cmp-test" aria-pressed="false">اختبر نفسي</button>' +
    (askable ? '<button type="button" class="mini" data-act="cells-table" data-t="' + esc(t.id) + '">سؤال الخانة</button>' : '') + '</span></div>' +
    '<div class="zf"><table class="cmp-t"><thead><tr>' + cols.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    rows.map(function (r) { r = arr(r); return '<tr>' + cols.map(function (_, i) { var c = r[i] == null ? '' : r[i]; return i === 0 ? '<th scope="row">' + esc(c) + '</th>' : '<td data-act="cell">' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
    (t.core ? '<tr class="core"><th scope="row">الفرق الجوهري</th><td data-act="cell" colspan="' + Math.max(1, cols.length - 1) + '">' + esc(t.core) + '</td></tr>' : '') +
    '</tbody></table></div>' +
    '<div class="zbar"><span class="hint test-hint">املأ الخانة من ذاكرتك، ثم المسها لتنكشف</span><span class="hint zoom-hint">قرّب بإصبعين أو بالزرين</span>' +
    '<button type="button" class="mini" data-act="cmp-all" hidden>اكشف الكل</button>' +
    '<button type="button" class="zbtn" data-act="zoom" data-d="-1" aria-label="تصغير الجدول">−</button><button type="button" class="zbtn" data-act="zoom" data-d="1" aria-label="تكبير الجدول">+</button>' +
    '<button type="button" class="zbtn" data-act="zoom" data-d="0" aria-label="الجدول كله">' + FIT + '</button></div></section>';
}
/* جدول أُتمّ وضع الاختبار فيه (انكشفت خاناته كلها): يُحسب في المهام الجانبية */
function tqCheck(sec) {
  if (!sec || sec.querySelector('td:not(.shown)')) return;
  var tid = String(sec.id || '').replace(/^t-/, ''); if (!tid || (S.tq[tid] && S.tq[tid].v)) return;
  S.tq[tid] = { v: 1, t: now() }; ST.save();
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
  if (!fromHistory) { try { history.pushState({ law135map: chId }, ''); } catch (e) { MAP.pushed = false; } }
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
  else if (a === 'reset-all') armOr('all', function () { ST.reset(); S = ST.state(); quiz = null; DECK = null; DQ = null; IC = null; IR = null; reportNb(); toast('بدأت من جديد'); closeSettings(); render(); });
});
document.getElementById('setBtn').addEventListener('click', openSettings);

/* ---------- التنقل: لكل شيء عنوان، فروابط الجدول تفتح الدرس نفسه ---------- */
function parseHash() {
  var h = (location.hash || '').replace(/^#/, ''), m;
  if (!h || h === 'home') return ['home'];
  if (['plan', 'sum', 'quiz', 'rev', 'review', 'eve', 'nb', 'cells', 'defs', 'imp'].indexOf(h) > -1) return [h];
  if ((m = /^imp-(\d+)$/.exec(h))) return ['impg', +m[1]];
  if (h === 'impc') return [IC ? 'impc' : 'imp'];
  if (h === 'impr') return [IR ? 'impr' : 'imp'];
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
  if (CQ && screen !== 'cells' && CQ.i >= CQ.ids.length) CQ = null;
  if (DQ && screen !== 'defs' && DQ.i >= DQ.ids.length) DQ = null;
  if (IC && screen !== 'impc' && IC.i >= IC.ids.length) IC = null;
  if (IR && screen !== 'impr' && IR.i >= IR.seq.length) IR = null;
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
  if (md === 'review') return '#review'; if (md === 'nb') return '#nb'; if (md === 'expq') return '#rev'; return '#quiz';
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
    case 'es-mark': if (l) { var eon = !!(S.es[l.id] && S.es[l.id].v); S.es[l.id] = { v: eon ? 0 : 1, t: now() }; ST.save(); render(); toast(eon ? 'أُلغيت العلامة' : 'عُلّم الدرس في المهام الجانبية: اختُبرت في مقاليه'); } return;
    case 'go-essay': if (quiz && (quiz.mode === 'bank' || quiz.mode === 'expq' || quiz.i >= quiz.ids.length)) quiz = null; bankKind = 'essay'; try { ST.setPref('bankKind', 'essay'); } catch (e2) {} go('#quiz'); return;
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
      if (icOn()) { IC.open = !IC.open; icPaint(); return; }
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
    case 'deck-filter': { var cl = selLabel(cardPick(), cardsIn); openDeck(cardList().map(function (k) { return k.id; }), cl === 'الفصول كلها' ? 'البطاقات كلها' : 'بطاقات: ' + cl, '#rev'); return; }
    case 'cardp-les': case 'cardp-ch': case 'cardp-all':
    case 'defs-les': case 'defs-ch': case 'defs-all':
    case 'ess-les': case 'ess-ch': case 'ess-all': {
      var pk = act.split('-'), cnt = pk[0] === 'ess' ? essIn : pk[0] === 'defs' ? defsIn : cardsIn;
      if (pk[0] === 'defs') defsInit(); else if (pk[0] === 'ess') selInit();
      var sl = pk[0] === 'ess' ? essaySel : pk[0] === 'defs' ? defsSel : cardPick();
      if (pk[1] === 'les') { var lid2 = el.getAttribute('data-l'); sl[lid2] = !sl[lid2]; }
      else togPick(sl, pickable(cnt, pk[1] === 'ch' ? CH[ch] : null));
      if (pk[0] === 'ess') saveSel(); else if (pk[0] === 'defs') defsSave(); else savePick('cardSel', sl);
      render(); return;
    }
    case 'defs-mode': { defsInit(); var dm = el.getAttribute('data-m'); defsMode = dm === 'who' || dm === 'view' ? dm : 'build'; defsSave(); render(); return; }
    case 'defs-count': defsInit(); if (defsMode === 'view') defsVCount = +el.getAttribute('data-n'); else defsCount = +el.getAttribute('data-n'); defsSave(); render(); return;
    case 'defs-cmp': defsInit(); defsCmp = !defsCmp; defsSave(); render(); return;
    case 'defs-flip': if (viewOn() && DQ.cur) viewFlip(!DQ.cur.open); return;
    case 'defs-vnext': viewStep(1); return;
    case 'defs-vprev': viewStep(-1); return;
    case 'defs-vkeep':
      if (viewOn() && DQ.cur) {
        var kid = DQ.cur.id;
        if (DQ.kept[kid]) delete DQ.kept[kid]; else { DQ.kept[kid] = 1; setDv(kid, false); }
        viewPaint();
      }
      return;
    case 'defs-vcmp':
      if (viewOn() && DQ.cur) {
        DQ.cur.cmp = !DQ.cur.cmp; viewPaint();
        var vc = DQ.cur.cmp ? view.querySelector('.dcmp') : null; if (vc) vc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    case 'defs-vreset': {
      clearTimeout(dvArmT);
      if (viewPool().length && !dvArm) { dvArm = true; dvArmT = setTimeout(function () { dvArm = false; if (!busy()) render(); }, 4000); render(); return; }
      dvArm = false;
      var vt = now(); if (!S.dv || typeof S.dv !== 'object') S.dv = {};
      defsPool().forEach(function (d) { if (dvOn(d.id)) S.dv[d.id] = { v: 0, t: vt }; });
      ST.save(); toast('عادت إليك البطاقات من أولها'); render(); return;
    }
    case 'defs-start': defsStart(); return;
    case 'defs-again': { defsInit(); var dPrev = DQ ? DQ.mode : defsMode; if (DQ) defsMode = dPrev; DQ = null; defsStart(); return; }
    case 'defs-quit': DQ = null; bankKind = 'defs'; go('#quiz'); return;
    case 'defs-back': setDx(el.getAttribute('data-id'), false); toast('أُعيد إلى الجولات'); render(); return;
    case 'defs-x': {
      var xid = el.getAttribute('data-id'), xon = !dxOn(xid);
      setDx(xid, xon); toast(xon ? 'استُبعد، فلا يُسأل عنه حتى تعيده من «المستبعدة»' : 'أُعيد إلى الجولات');
      /* استبعاد السؤال الجاري: يُترك ويُعرض ما بعده، ولا يُحسب له صواب ولا خطأ */
      if (xon && DQ && DQ.cur && DQ.cur.id === xid && DQ.cur.ans === null && DQ.i < DQ.ids.length) { DQ.ids.splice(DQ.i, 1); DQ.cur = null; window.scrollTo(0, 0); }
      render(); return;
    }
    case 'defs-chip': {
      if (!DQ || !DQ.cur || DQ.cur.ans !== null) return;
      var dc = DQ.cur, dd = DBY[dc.id], k3 = +el.getAttribute('data-k'), chip = dc.chips[k3];
      if (!chip || dc.placed.indexOf(k3) > -1) return;
      if (!chip.f && dnorm(chip.t) === dnorm(dd.parts[dc.placed.length])) {
        dc.placed.push(k3);
        if (dc.placed.length === dd.parts.length) defsAnswer(!dc.wrong);
        render();
      } else {
        dc.errs++; dc.wrong = true;
        el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad');
        var tl = view.querySelector('.dtools .small'); if (tl) tl.textContent = countWord(dc.errs, W.err); else render();
      }
      return;
    }
    case 'defs-show': {
      if (!DQ || !DQ.cur || DQ.cur.ans !== null) return;
      var ds = DQ.cur, dd2 = DBY[ds.id]; ds.gave = true; ds.wrong = true;
      ds.placed = dd2.parts.map(function (p) { for (var z = 0; z < ds.chips.length; z++) if (!ds.chips[z].f && ds.chips[z].t === p && ds.placed.indexOf(z) < 0) return z; return -1; }).filter(function (z) { return z > -1; });
      defsAnswer(false); render(); return;
    }
    case 'defs-pick': {
      if (!DQ || !DQ.cur || DQ.cur.ans !== null) return;
      DQ.cur.picked = el.getAttribute('data-id'); defsAnswer(DQ.cur.picked === DQ.cur.id); render();
      var dv = view.querySelector('.verdict'); if (dv && dv.getBoundingClientRect().bottom > window.innerHeight - 70) dv.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    case 'defs-next': if (DQ) { DQ.i++; DQ.cur = null; } render(); window.scrollTo(0, 0); return;
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
    case 'copy-essay': { var ls = pickedLessons().filter(function (x) { return essKind === 'essay' ? x.essay.length : (x.essay.length || tfOf([x]).length); }); if (ls.length) copyText(essayMessage(ls, essKind), 'نُسخت الرسالة. الصقها في محادثة جديدة داخل مشروع المادة.'); return; }
    case 'copy-comp': { var lsc = pickedLessons(); if (lsc.length) copyText(compMessage(lsc), 'نُسخت رسالة أسئلة الفهم. الصقها في محادثة جديدة داخل مشروع المادة.'); return; }
    case 'exp-quiz': startQuiz(shuffle(QL.filter(function (x) { return x.exp; }).map(function (x) { return x.id; })), 'المتوقع', 'expq'); return;
    case 'ess-kind': essKind = el.getAttribute('data-k'); try { ST.setPref('essKind', essKind); } catch (e3) {} render(); return;
    case 'copy-new': { var ls2 = pickedLessons(); if (ls2.length) copyText(newEssaysRequest(ls2), 'نُسخ الطلب. الصقه في محادثة جديدة داخل مشروع المادة.'); return; }
    case 'tf-pick': {
      if (!quiz || quiz.picked !== null) return;
      var wt = document.getElementById('whyText'); if (wt) quiz.tfText = wt.value;
      quiz.tfPick = +el.getAttribute('data-v'); render(); return;
    }
    case 'why-self': {
      if (!quiz || quiz.picked === null) return;
      quiz.self = +el.getAttribute('data-s'); judgeWhy(quiz.ids[quiz.i], quiz.self === 1); render(); return;
    }
    case 'tf-reveal': { var wt2 = document.getElementById('whyText'); if (wt2) quiz.tfText = wt2.value.trim(); }
    /* falls through */
    case 'answer': {
      if (!quiz || quiz.picked !== null) return;
      q = Q[quiz.ids[quiz.i]]; var v = el.getAttribute('data-act') === 'tf-reveal' ? quiz.tfPick : +el.getAttribute('data-v');
      if (v === null || isNaN(v)) return;
      var ok = isRight(q, v);
      quiz.lastEt = ok ? '' : errType(q, v);
      quiz.picked = v; quiz.results.push(ok); quiz.lastRes = record(q.id, ok, quiz.lastEt);
      if (quiz.mode === 'imp') impSet(q.id, ok);
      /* محاولة تسميع الخروج تُحسب من أول إجابة، فتُحفظ نسبتها على أسئلة الدرس كلها كلما أجاب */
      if (quiz.mode === 'exit') saveExit(quiz.les, Math.round(100 * quiz.results.filter(Boolean).length / quiz.ids.length), 'exit');
      quiz.rounds = roundNotes.splice(0).map(function (id) { return roundText(CH[id]); });
      render();
      var vd = view.querySelector('.verdict'); if (vd && vd.getBoundingClientRect().bottom > window.innerHeight - 70) vd.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    case 'next': quiz.i++; quiz.picked = null; quiz.lastRes = null; quiz.rounds = []; quiz.quitArmed = false; quiz.tfPick = null; quiz.tfText = ''; quiz.self = null; quiz.lastEt = ''; render(); window.scrollTo(0, 0); return;
    case 'quit': {
      if (!quiz) return;
      if (quiz.mode === 'exit' && quiz.results.length && quiz.i < quiz.ids.length) {
        if (!quiz.quitArmed) { quiz.quitArmed = true; render(); return; }
        finishQuiz(true); quiz.i = quiz.ids.length; quiz.picked = null; render(); window.scrollTo(0, 0); return;
      }
      var md = quiz.mode, ql = LBY[quiz.les], qg = quiz.gid; quiz = null; go(md === 'imp' ? '#imp-' + (qg || 1) : quitDest(md, ql)); return;
    }
    case 'new-quiz': quiz = null; render(); window.scrollTo(0, 0); return;
    case 'imp-go': impContinue(); return;
    case 'imp-start': impStart(IMP[+el.getAttribute('data-g')], el.getAttribute('data-st')); return;
    case 'imp-type': impType = el.getAttribute('data-k'); ST.setPref('impType', impType); render(); return;
    case 'imp-skip': impSkip = !impSkip; ST.setPref('impSkip', impSkip); render(); return;
    case 'imp-rest': impRest = true; render(); return;
    case 'imp-reset': {
      var rg = IMP[+el.getAttribute('data-g')]; if (!rg) return;
      clearTimeout(impArmT);
      if (impArm !== rg.idx) { impArm = rg.idx; impArmT = setTimeout(function () { impArm = null; if (!busy()) render(); }, 4000); render(); return; }
      impArm = null;
      impStages(rg).forEach(function (st) { rg[st].forEach(function (id) { impSet(id, false); }); });
      toast('عادت هذه المجموعة من أولها'); render(); return;
    }
    case 'ic-next': icStep(1); return;
    case 'ic-prev': icStep(-1); return;
    case 'ic-keep': if (icOn()) { var ick = IC.ids[IC.i]; IC.kept[ick] = !IC.kept[ick]; icPaint(); } return;
    case 'ic-quit': { var icg = IC ? IC.g.idx + 1 : 0; IC = null; go(icg ? '#imp-' + icg : '#imp'); return; }
    case 'ir-next': irStep(1); return;
    case 'ir-prev': irStep(-1); return;
    case 'ir-quit': { var irg = IR ? IR.g.idx + 1 : 0; IR = null; go(irg ? '#imp-' + irg : '#imp'); return; }
    case 'cells-start': {
      var cChs = CHS.filter(function (x) { return objSel.indexOf(x.id) > -1 && cellsOf(x.id).length; });
      var cPool = CELLS.filter(function (x) { return cChs.some(function (y) { return y.id === x.ch.id; }); });
      var cAll = CHS.filter(function (x) { return cellsOf(x.id).length; }).length;
      var cLbl = cChs.length === cAll ? 'الفصول كلها' : cChs.length === 1 ? cChs[0].title : 'الفصول: ' + cChs.map(chShort).join('، ');
      startCells(cellPick(cPool, objCount), 'سؤال الخانة: ' + cLbl, '#quiz', { k: 'chs', chs: cChs.map(function (x) { return x.id; }), n: objCount });
      return;
    }
    case 'cells-table': {
      var cTid = el.getAttribute('data-t'), cList = tableCells(cTid);
      if (cList.length) startCells(cellPick(cList, 0), 'سؤال الخانة', location.hash || '#rev', { k: 'tbl', id: cTid });
      return;
    }
    case 'cell-answer': {
      if (!CQ || CQ.picked !== null || CQ.i >= CQ.ids.length) return;
      var cCell = CBY[CQ.ids[CQ.i]], cV = +el.getAttribute('data-v'), cOk = !!cCell && cV === cCell.ci;
      CQ.picked = cV; CQ.res.push(cOk); if (cCell) cellRecord(cCell.id, cOk);
      render();
      var cVd = view.querySelector('.verdict'); if (cVd && cVd.getBoundingClientRect().bottom > window.innerHeight - 70) cVd.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    case 'cell-next': if (CQ) { CQ.i++; CQ.picked = null; } render(); window.scrollTo(0, 0); return;
    case 'cell-again': cellsAgain(); return;
    case 'cell-quit': { var cBack = CQ ? CQ.back : '#quiz'; CQ = null; go(cBack === '#cells' ? '#quiz' : cBack); return; }
    case 'nb-ch': nbCh = ch; render(); return;
    case 'start-nb': { var list = mistakes(nbCh === 'all' ? null : nbCh); startQuiz(shuffle(list.map(function (x) { return x.id; })), 'دفتر الأخطاء', 'nb'); return; }
    case 'rev-sub': revSub = el.getAttribute('data-sub'); ST.setPref('revSub', revSub); render(); return;
    case 'cmp-test': {
      var sec = el.closest('.cmp'), onT = !sec.classList.contains('testing');
      sec.classList.toggle('testing', onT); el.setAttribute('aria-pressed', onT);
      sec.querySelectorAll('td').forEach(function (td) { td.classList.remove('shown'); if (onT) td.setAttribute('tabindex', '0'); else td.removeAttribute('tabindex'); });
      sec.querySelector('[data-act="cmp-all"]').hidden = !onT; return;
    }
    case 'cell': { var s2 = el.closest('.cmp'); if (s2 && s2.classList.contains('testing')) { el.classList.toggle('shown'); tqCheck(s2); } return; }
    case 'cmp-all': { var s3 = el.closest('.cmp'); s3.querySelectorAll('td').forEach(function (td) { td.classList.add('shown'); }); tqCheck(s3); return; }
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
  if ((screen === 'deck' || viewOn() || icOn()) && e.touches.length === 1 && e.target.closest('.fc')) sw = { x: e.touches[0].clientX, y: e.touches[0].clientY }; else sw = null;
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
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) { e.preventDefault(); if (screen === 'deck') deckStep(dx < 0 ? 1 : -1); else if (icOn()) icStep(dx < 0 ? 1 : -1); else viewStep(dx < 0 ? 1 : -1); }
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
ST.onRemote(function () { S = ST.state(); reportNb(); if (!busy()) render(); else updateBadge(); });
initSchedule();
reportNb();
route();
var lastDay = todayISO();
setInterval(function () { var t = todayISO(); if (t !== lastDay) { lastDay = t; reportNb(); if (!busy()) render(); } }, 60000);
})();
