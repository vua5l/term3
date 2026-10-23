/*
  جدول الاختبارات: الصفحة الرئيسة للترم.
  - المواعيد ومهام اليوم من schedule.js (window.term3Schedule)، ولا بيانات مكتوبة هنا.
  - الإنجاز يُعلَّم بـ done/undo، والمهمة تفتح درسها في موقع مادتها.
  - ثلاث شاشات: اليوم (#today)، والتقويم (#calendar)، والتعديل (#settings).
*/
(function () {
  'use strict';

  var S = window.term3Schedule || null;
  var LS_THEME = 'term3_sched_theme';
  var LS_PICK = 'term3_sched_pick';
  var SESSION = 25;
  var CAP_MIN = 3, CAP_MAX = 12;
  var MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var LETTERS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
  var KIND = { learn: 'تعلّم', recall: 'تسميع', review: 'مراجعة', eve: 'تسميع' };
  var HEADS = ['القانون', 'قانون', 'مصادر', 'أحكام', 'مبادئ', 'أصول', 'نظام', 'مدخل', 'علم', 'فقه'];

  var state = null;       // حالة الجدول كاملة من schedule.js
  var loadFailed = false; // تعذّر الوصول إلى المستودع ولا نسخة في الجهاز
  var screen = 'today';
  var pick = null;        // 'auto' أو 'smart'
  var pasteOpen = false, smartErrors = null, smartText = '';
  var armed = null;       // فعل ينتظر ضغطة ثانية للتأكيد: { act, code, t }

  /* ---------- أدوات ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parseISO(s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); }
  function diffDays(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
  function todayISO() { return (state && state.today) || iso(new Date()); }

  /* الأعداد على قواعد العربية */
  function unit(n, one, two, few, many) { if (n === 1) return one; if (n === 2) return two; return n + ' ' + (n >= 3 && n <= 10 ? few : many); }
  function daysShort(n) { if (n === 0) return 'اليوم'; if (n < 0) return 'انتهى'; return unit(n, 'يوم واحد', 'يومان', 'أيام', 'يوماً'); }
  function daysAfter(n) { if (n === 0) return 'اليوم'; if (n < 0) return 'انتهى'; if (n === 1) return 'بعد يوم'; if (n === 2) return 'بعد يومين'; return 'بعد ' + n + ' ' + (n <= 10 ? 'أيام' : 'يوماً'); }
  function sessionsWord(n) { if (n === 1) return 'جلسة واحدة'; if (n === 2) return 'جلستان'; return n >= 3 && n <= 10 ? 'جلسات' : 'جلسة'; }
  function samplesWord(n) { return unit(n, 'قياس واحد', 'قياسان', 'قياسات', 'قياساً'); }
  function lessonsWord(n) { return unit(n, 'درس واحد', 'درسان', 'دروس', 'درساً'); }

  function dateText(s) { var d = parseISO(s); return WEEKDAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function dayMonth(s) { var d = parseISO(s); return d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function shortName(name) {
    var w = String(name || '').trim().split(/\s+/);
    return (w.length >= 2 && HEADS.indexOf(w[0]) >= 0) ? w.slice(1).join(' ') : name;
  }
  function keyOf(e) { return e.key || e.code || 'other'; }
  function dotColor(k) { return 'var(--dot-' + k + ', var(--dot-other))'; }
  function textColor(k) { return 'var(--sub-' + k + ', var(--sub-other))'; }
  function onColor(k) { return 'var(--on-' + k + ', var(--on-other))'; }

  /* المواد مرتبة بموعدها، مع أيامها الباقية وهل لها موقع */
  function subjects() {
    if (!state) return [];
    var today = todayISO();
    return state.exams.filter(function (e) { return e.date; }).map(function (e) {
      return { code: e.code, key: keyOf(e), name: e.name || e.code, short: shortName(e.name || e.code), date: e.date,
        tentative: !!e.tentative, left: diffDays(today, e.date), hasSite: !!(e.code && state.lessons[e.code]) };
    }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }
  function todayTasks() {
    if (!state) return [];
    var today = todayISO(), day = null;
    state.days.forEach(function (d) { if (d.date === today) day = d; });
    return day ? day.tasks : [];
  }
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._h); toast._h = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  /* تأكيد بضغطة ثانية خلال خمس ثوانٍ، بدل نوافذ المتصفح */
  function isArmed(act, code) { return !!(armed && armed.act === act && armed.code === code && Date.now() - armed.t < 5000); }
  function arm(act, code) {
    if (isArmed(act, code)) { armed = null; clearTimeout(arm._h); return true; }
    armed = { act: act, code: code, t: Date.now() };
    clearTimeout(arm._h); arm._h = setTimeout(function () { armed = null; render(); }, 5000);
    render();
    return false;
  }

  /* ---------- الوضع الفاتح والداكن ---------- */
  function theme() {
    var t = lsGet(LS_THEME);
    if (t === 'light' || t === 'dark') return t;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  function applyTheme() { document.documentElement.setAttribute('data-theme', theme()); }
  function toggleTheme() { lsSet(LS_THEME, theme() === 'dark' ? 'light' : 'dark'); applyTheme(); render(); }

  var ICON_MOON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg>';
  var ICON_SUN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>';
  var ICON_GEAR = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"></path></svg>';
  var ICON_CHECK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"></path></svg>';
  var ICON_PEN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>';
  var ICON_COPY = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>';
  var ICON_PASTE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1"></rect></svg>';
  var ICON_MINUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"></path></svg>';
  var ICON_PLUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>';

  /* ---------- الرأس ---------- */
  function renderHead(id, withGear) {
    var d = parseISO(todayISO()), dark = theme() === 'dark';
    $(id).innerHTML =
      '<div class="date"><div class="daynum">' + d.getDate() + '</div>' +
      '<div class="monthrow"><span class="month">' + MONTHS[d.getMonth()] + '</span><span class="year">' + d.getFullYear() + '</span></div></div>' +
      '<div class="side">' +
      '<button type="button" class="theme-btn" data-act="theme" aria-label="' + (dark ? 'الوضع الفاتح' : 'الوضع الداكن') + '">' + (dark ? ICON_SUN : ICON_MOON) + '</button>' +
      '<div class="sub">' + (withGear ? '<a class="gear" href="#settings" aria-label="التعديل">' + ICON_GEAR + '</a>' : '') +
      '<span class="weekday">' + WEEKDAYS[d.getDay()] + '</span></div></div>';
  }

  /* ---------- شاشة اليوم ---------- */
  function renderToday() {
    renderHead('head-today', true);
    var subs = subjects().filter(function (s) { return s.left >= 0; });
    var maxLeft = subs.length ? Math.max(1, subs[subs.length - 1].left) : 1;
    var h = '';
    if (subs.length) {
      h += '<div class="track-line"><span class="rail"></span><span class="today-dot"></span>';
      subs.forEach(function (s) {
        h += '<span class="sub-dot" style="right:' + (s.left / maxLeft * 96).toFixed(1) + '%;background:' + dotColor(s.key) + '"></span>';
      });
      h += '</div><div class="track-names" style="grid-template-columns:repeat(' + subs.length + ',minmax(0,1fr))">';
      subs.forEach(function (s) {
        h += '<div><div class="tn" style="color:' + textColor(s.key) + '">' + esc(s.short) + '</div><div class="tl">' + daysShort(s.left) + '</div></div>';
      });
      h += '</div>';
    }
    $('track').innerHTML = h;

    var tasks = todayTasks(), total = tasks.length, done = 0;
    tasks.forEach(function (t) { if (t.done) done++; });
    var pct = total ? Math.round(done / total * 100) : 0;
    $('today-card').innerHTML =
      '<div class="tc"><div class="tc-label">تقدم اليوم</div>' +
      '<div class="tc-big">' + (total ? done + ' من ' + total : (state ? 'لا مهام' : '…')) + '</div>' +
      '<div class="tc-small">' + (total ? 'مهام منجزة' : (state ? 'اليوم بلا مهام' : 'جارٍ التحميل')) + '</div></div>' +
      '<div class="ring"><svg width="74" height="74" viewBox="0 0 74 74" aria-hidden="true">' +
      '<circle class="track-c" cx="37" cy="37" r="31" fill="none" stroke-width="7"></circle>' +
      '<circle class="arc" cx="37" cy="37" r="31" fill="none" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + (pct / 100 * 194.8).toFixed(1) + ' 194.8"></circle></svg>' +
      '<div class="pct">' + (total ? pct + '%' : '—') + '</div></div>';

    var g = '';
    if (!state) {
      g = '<div class="empty">' + (loadFailed ? 'افتح الصفحة مع الاتصال ليصلك الجدول.' : 'جارٍ تحميل الجدول من المستودع…') + '</div>';
    } else if (!total) {
      var future = subjects().some(function (s) { return s.left > 0 && s.hasSite; });
      g = '<div class="empty">' + (future ? 'لا مهام مقررة اليوم.' : 'لا مواد قادمة لها دروس في الجدول.') + '</div>';
    } else {
      var groups = [], byCode = {}, nextFound = false, subByCode = {};
      subjects().forEach(function (s) { subByCode[s.code] = s; });
      tasks.forEach(function (t) {
        if (!byCode[t.code]) { byCode[t.code] = { code: t.code, tasks: [] }; groups.push(byCode[t.code]); }
        byCode[t.code].tasks.push(t);
      });
      groups.forEach(function (gr) {
        var s = subByCode[gr.code] || { key: 'other', name: gr.code, left: 0 };
        g += '<section class="group"><div class="g-head"><div class="g-name" style="color:' + textColor(s.key) + '">' + esc(s.name) + '</div><div class="g-left">' + daysAfter(s.left) + '</div></div>';
        gr.tasks.forEach(function (t) {
          var next = !t.done && !nextFound; if (next) nextFound = true;
          g += '<div class="task' + (t.done ? ' done' : '') + '">' +
            '<button type="button" class="check' + (t.done ? ' done' : next ? ' next' : '') + '" data-act="toggle" data-code="' + esc(t.code) + '" data-lesson="' + esc(t.lesson) + '" data-kind="' + esc(t.kind) + '" data-done="' + (t.done ? 1 : 0) + '" aria-label="' + (t.done ? 'إلغاء إنجاز المهمة' : 'إنجاز المهمة') + '">' + ICON_CHECK + '</button>' +
            '<a class="t-title" href="' + esc(t.link) + '">' + esc(t.title) + '</a>' +
            (next ? '<span class="next-chip">التالي</span>' : '') +
            '<span class="t-kind">' + (KIND[t.kind] || esc(t.kind)) + '</span>' +
            '<span class="t-min">' + (t.minutes | 0) + ' د</span></div>';
        });
        g += '</section>';
      });
    }
    g += extraBlock(total, done);
    $('groups').innerHTML = g;
  }

  /* «إن بقي عندك وقت»: في أسفل شاشة اليوم بعد المهام الأساسية، يظهر حين تُنجز مهام اليوم كلها أو لا تكون
     لليوم مهام، ويقترح أنفع مهمة تالية كما يحسبها الجدول (state.extra). وهي اختيارية */
  function extraBlock(total, done) {
    var ex = state && state.extra;
    if (!ex || (total && done < total)) return '';
    var s = { key: 'other', name: ex.code };
    subjects().forEach(function (x) { if (x.code === ex.code) s = x; });
    return '<section class="group extra"><div class="g-head"><div class="g-name">إن بقي عندك وقت</div><div class="g-left">اختيارية</div></div>' +
      '<div class="task">' +
      '<button type="button" class="check" data-act="extra" data-code="' + esc(ex.code) + '" data-lesson="' + esc(ex.lesson) + '" data-kind="' + esc(ex.kind) + '" aria-label="إنجاز المهمة">' + ICON_CHECK + '</button>' +
      '<a class="t-title" href="' + esc(ex.link) + '">' + esc(ex.title) + '</a>' +
      '<span class="t-kind">' + (KIND[ex.kind] || esc(ex.kind)) + '</span>' +
      '<span class="t-min">' + (ex.minutes | 0) + ' د</span></div>' +
      '<div class="extra-note"><span style="color:' + textColor(s.key) + '">' + esc(s.name) + '</span> · إن أنجزتها خفّت بها أيامك التالية.</div></section>';
  }

  /* ---------- شاشة التقويم ---------- */
  function renderCalendar() {
    renderHead('head-calendar', false);
    var subs = subjects(), today = todayISO();
    var examBy = {}; subs.forEach(function (s) { examBy[s.date] = s; });
    var last = subs.length ? subs[subs.length - 1].date : today; if (last < today) last = today;
    var start = addDays(today, -parseISO(today).getDay());
    var end = addDays(last, 6 - parseISO(last).getDay());
    var todayDow = parseISO(today).getDay();

    var h = '<div class="cal-head"><div class="cal-title">من اليوم إلى آخر اختبار</div><div class="cal-count">' + daysShort(diffDays(today, last)) + '</div></div>';
    h += '<div class="wk-letters">';
    LETTERS.forEach(function (l, i) { h += '<div' + (i === todayDow ? ' class="today"' : '') + '>' + l + '</div>'; });
    h += '</div><div class="weeks">';
    var row = 0;
    for (var d = start; d <= end; d = addDays(d, 7), row++) {
      var cells = [], label = '';
      for (var i = 0; i < 7; i++) {
        var day = addDays(d, i), dt = parseISO(day);
        if (row === 0 && i === 0) label = MONTHS[dt.getMonth()];
        else if (row > 0 && dt.getDate() === 1) label = MONTHS[dt.getMonth()];
        var ex = examBy[day], cls = ex ? 'exam' : day === today ? 'today' : day < today ? 'past' : 'future';
        var st = ex ? ' style="background:' + dotColor(ex.key) + ';border-color:' + dotColor(ex.key) + ';color:' + onColor(ex.key) + '"' : '';
        var label2 = ex ? (ex.short + ' ' + dayMonth(day)) : (day === today ? 'اليوم' : '');
        cells.push('<div class="cellwrap"><div class="cell ' + cls + '"' + st + (label2 ? ' title="' + esc(label2) + '"' : '') + '>' + dt.getDate() + '</div></div>');
      }
      h += '<div class="week">' + (label ? '<div class="mlabel"><span>' + label + '</span><i></i></div>' : '') + '<div class="cells">' + cells.join('') + '</div></div>';
    }
    h += '</div><div class="rule"></div><div class="exlist">';
    subs.forEach(function (s) {
      h += '<div class="ex"><div class="ex-rail"><span class="ex-dot" style="background:' + dotColor(s.key) + '"></span><span class="ex-vline"></span></div>' +
        '<div class="ex-body"><div class="ex-main"><div class="ex-name-row"><span class="ex-name" style="color:' + textColor(s.key) + '">' + esc(s.name) + '</span>' +
        (s.tentative ? '<span class="chip">مبدئي</span>' : '') + '</div><div class="ex-date">' + dateText(s.date) + '</div></div>' +
        '<div class="ex-left' + (s.left < 0 ? ' over' : '') + '">' + daysAfter(s.left) + '</div></div></div>';
    });
    if (!subs.length) h += '<div class="empty">' + (state ? 'لا مواعيد بعد.' : 'جارٍ تحميل الجدول…') + '</div>';
    h += '</div>';
    $('cal').innerHTML = h;
  }

  /* ---------- شاشة التعديل ---------- */
  function currentPick() {
    if (pick) return pick;
    var saved = lsGet(LS_PICK);
    if (state && state.source === 'smart') return 'smart';
    return saved === 'smart' ? 'smart' : 'auto';
  }
  function calibText(c) {
    if (!c) return 'لم يُقَس بعد';
    var p = Math.round((c.factor - 1) * 100), w;
    if (Math.abs(p) < 3) w = 'مطابق للتقدير'; else if (p > 0) w = 'أطول بـ' + p + '%'; else w = 'أقصر بـ' + (-p) + '%';
    return w + ' · ' + samplesWord(c.samples);
  }
  /* حالة الحفظ في المستودع، سطر تحت وصف المزامنة */
  function ago(t) {
    var m = Math.floor((Date.now() - t) / 60000);
    if (m < 1) return 'الآن';
    if (m < 60) return 'قبل ' + unit(m, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة');
    var hr = Math.floor(m / 60);
    if (hr < 24) return 'قبل ' + unit(hr, 'ساعة', 'ساعتين', 'ساعات', 'ساعة');
    return 'قبل ' + unit(Math.floor(hr / 24), 'يوم', 'يومين', 'أيام', 'يوماً');
  }
  function whenText(t) {
    var d = new Date(t), hm = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    return (iso(d) === iso(new Date()) ? 'اليوم' : dateText(iso(d))) + ' ' + hm;
  }
  function changesWait(n) {
    if (n === 1) return 'تغيير واحد ينتظر الرفع';
    if (n === 2) return 'تغييران ينتظران الرفع';
    return n + (n <= 10 ? ' تغييرات تنتظر' : ' تغييراً ينتظر') + ' الرفع';
  }
  function syncLine() {
    var st = S && S.syncStatus ? S.syncStatus() : null;
    if (!st) return '';
    var txt, retry = '';
    if (st.busy) txt = 'جارٍ الحفظ في المستودع…';
    else if (st.pending) {
      txt = (st.failed ? 'تعذّر الحفظ: ' : '') + changesWait(st.pending);
      retry = '<button type="button" class="chip-btn armed" style="align-self:flex-start" data-act="retry">أعد المحاولة</button>';
    }
    else if (st.lastSaved) txt = 'آخر حفظ في المستودع ' + ago(st.lastSaved) + ' (' + whenText(st.lastSaved) + ')';
    else txt = 'لم يُحفظ في المستودع شيء بعد';
    return '<div class="t2"' + (st.failed ? ' style="color:var(--coral)"' : '') + '>' + esc(txt) + '</div>' + retry;
  }
  /* الدقائق على قواعد العدد: دقيقة، دقيقتان، 3 دقائق، 11 دقيقة، 104 دقائق */
  function minutesText(m) {
    m = Math.round(+m || 0);
    if (m === 1) return 'دقيقة';
    if (m === 2) return 'دقيقتان';
    var r = m % 100;
    return m + (r >= 3 && r <= 10 ? ' دقائق' : ' دقيقة');
  }
  /* تنبيه الجدول في أعلى شاشة التعديل: التغطية، والأيام التي تحتاج أكثر من السقف لأجلها،
     وليلة اختبار دخلها تعلّم، والمواد التي بلا موقع */
  function coverageCard() {
    if (!state) return '';
    var over = [], eve = [], nosite = [], name = {};
    (state.exams || []).forEach(function (e) { name[e.code] = e.name || e.code; });
    (state.warnings || []).forEach(function (w) {
      if (w.type === 'over') over.push(w);
      else if (w.type === 'eve-learn') eve.push(w);
      else if (w.type === 'nosite') nosite.push(w);
    });
    var h = '';
    if (Object.keys(state.lessons || {}).length) h += '<div class="cv-line">كل درس من دروس المواد التي لها مواقع له مكان قبل اختبار مادته.</div>';
    if (over.length) {
      h += '<div class="cv-line">ويحتاج ذلك أكثر من سقفك (' + minutesText(state.capMinutes) + ') في هذه الأيام:</div><ul class="cv-list">' +
        over.slice(0, 7).map(function (w) { return '<li><span>' + esc(dateText(w.date)) + '</span><b>' + esc(minutesText(w.minutes)) + '</b></li>'; }).join('') +
        '</ul><div class="cv-note">السقف حدّ اليوم المريح، ولا يتجاوزه الجدول إلا لتغطية الدروس. وإن تأخرت يوماً زادت دقائق ما بعده.</div>';
    }
    eve.forEach(function (w) { h += '<div class="cv-line">ليلة اختبار ' + esc(name[w.code] || w.code) + ' فيها دروس لم تُتعلَّم بعد، لأن التعلّم تأخر عن موعده.</div>'; });
    if (nosite.length) {
      var n = nosite.length;
      var tail = n === 1 ? 'بلا موقع، فلا يعرف الجدول دروسها ولا يضمن تغطيتها.' : n === 2 ? 'بلا موقعين، فلا يعرف الجدول دروسهما ولا يضمن تغطيتهما.' : 'بلا مواقع، فلا يعرف الجدول دروسها ولا يضمن تغطيتها.';
      h += '<div class="cv-line">' + nosite.map(function (w) { return esc(w.name) + ' (' + esc(dayMonth(w.date)) + ')'; }).join('، ') + ': ' + tail + '</div>';
    }
    if (state.overrideLost) h += '<div class="cv-line">الخطة الذكية تركت دروساً بلا مكان قبل اختبارها، فعاد الجدول إلى الترتيب التلقائي.</div>';
    if (!h) return '';
    var warn = over.length || eve.length || nosite.length || state.overrideLost;
    return '<div class="cover' + (warn ? ' warn' : '') + '"><div class="sec-title">التغطية قبل الاختبارات</div>' + h + '</div>';
  }

  function renderSettings() {
    var subs = subjects(), today = todayISO(), h = '';
    var pk = currentPick();

    h += coverageCard();

    h += '<div class="exam-rows"><div class="sec-head"><div class="sec-title">مواعيد الاختبارات</div><div class="sec-note">تُغيَّر من هنا وحده</div></div>';
    subs.forEach(function (s) {
      h += '<div class="exam-row"><span class="dot" style="background:' + dotColor(s.key) + '"></span>' +
        '<div class="names"><div class="name" style="color:' + textColor(s.key) + '">' + esc(s.name) + '</div>' + (s.hasSite ? '' : '<div class="nosite">بلا موقع بعد</div>') + '</div>' +
        (s.tentative ? '<button type="button" class="chip-btn' + (isArmed('confirm-date', s.code) ? ' armed' : '') + '" data-act="confirm-date" data-code="' + esc(s.code) + '" aria-label="تثبيت الموعد">' + (isArmed('confirm-date', s.code) ? 'تثبيت الموعد؟' : 'مبدئي') + '</button>' : '') +
        '<label class="date-btn" aria-label="تغيير موعد ' + esc(s.name) + '"><span>' + dayMonth(s.date) + '</span>' + ICON_PEN +
        '<input type="date" data-act="date" data-code="' + esc(s.code) + '" value="' + esc(s.date) + '" min="' + today + '"></label></div>';
    });
    if (!subs.length) h += '<div class="empty">' + (state ? 'لا مواعيد بعد.' : 'جارٍ تحميل الجدول…') + '</div>';
    h += '</div>';

    var status = !state ? '' : state.source === 'smart' ? 'الخطة الحالية ذكية.' : state.overrideLost ? 'الخطة الذكية تركت دروساً بلا مكان قبل اختبارها، والجدول الآن تلقائي.' : state.overrideExpired ? 'الخطة الذكية السابقة انتهت بتغيير المواعيد، والجدول الآن تلقائي.' : 'الخطة الحالية تلقائية.';
    h += '<div class="mode-card"><div><div class="k">بعد تغيير موعد</div><div class="q">كيف تُعاد خطة الأيام؟</div></div>' +
      '<button type="button" class="opt' + (pk === 'auto' ? ' on' : '') + '" data-act="pick-auto"><span class="radio"><i></i></span><span class="txt"><span class="t1">ترتيب تلقائي</span><span class="t2">فوري ومجاني، بقواعد الجدول نفسها</span></span></button>' +
      '<button type="button" class="opt' + (pk === 'smart' ? ' on' : '') + '" data-act="pick-smart"><span class="radio"><i></i></span><span class="txt"><span class="t1">ترتيب ذكي</span><span class="t2">ينسخ طلباً تلصقه في محادثة جديدة، ثم تلصق الجواب هنا</span></span></button>';
    if (pk === 'smart') {
      h += '<div class="smart-btns"><button type="button" class="btn-coral" data-act="copy">' + ICON_COPY + '<span>نسخ الطلب</span></button>' +
        '<button type="button" class="btn-ghost" data-act="paste">' + ICON_PASTE + '<span>لصق الجواب</span></button></div>';
      if (pasteOpen) {
        h += '<div class="paste-box"><textarea id="paste-ta" placeholder="ألصق جواب المحادثة هنا">' + esc(smartText) + '</textarea>' +
          '<div class="row"><button type="button" class="btn-coral" data-act="apply">تطبيق الخطة</button><button type="button" class="btn-ghost" data-act="paste-close">إغلاق</button></div></div>';
      }
      if (smartErrors && smartErrors.length) {
        h += '<ul class="errs">'; smartErrors.slice(0, 6).forEach(function (e) { h += '<li>' + esc(e) + '</li>'; }); h += '</ul>';
      }
    }
    if (status) h += '<div class="status">' + status + '</div>';
    h += '</div>';

    var cap = state ? state.cap : 8, short = [];
    (state ? state.warnings : []).forEach(function (w) { if (w.type === 'short') short.push(w); });
    var subName = {}; subs.forEach(function (s) { subName[s.code] = s.name; });
    h += '<div><div class="cap"><div class="l"><div class="sec-title">السقف اليومي</div><div class="l2">لا يُرفع إلا بعد التزام يومين</div></div>' +
      '<div class="ctl"><button type="button" class="round" data-act="cap-minus" aria-label="تقليل">' + ICON_MINUS + '</button>' +
      '<div class="num"><div class="n1">' + cap + '</div><div class="n2">' + sessionsWord(cap) + ' · ' + (cap * SESSION) + ' د</div></div>' +
      '<button type="button" class="round" data-act="cap-plus" aria-label="زيادة">' + ICON_PLUS + '</button></div></div>';
    if (short.length) {
      h += '<div class="cap-warn" style="margin-top:10px">بهذا السقف لن تمرّ هذه الدروس ثلاث مرات قبل اختبارها: ' +
        short.map(function (w) {
          var total = (state.lessons[w.code] || []).length;
          return esc(subName[w.code] || w.code) + ' ' + w.count + ' من ' + lessonsWord(total) + (w.unlearned ? ' (' + w.unlearned + ' منها بلا تعلّم)' : '');
        }).join('، ') + '.</div>';
    }
    h += '</div>';

    h += '<div class="calib-rows"><div class="sec-head"><div class="sec-title">تصحيح الوقت الفعلي</div><div class="sec-note">يحتاج 4 قياسات</div></div>';
    var any = false;
    subs.forEach(function (s) {
      if (!s.hasSite) return; any = true;
      h += '<div class="calib-row"><div class="name" style="color:' + textColor(s.key) + '">' + esc(s.name) + '</div><div class="val">' + calibText(state.calib && state.calib[s.code]) + '</div></div>';
    });
    if (!any) h += '<div class="calib-row"><div class="val">لا مواد لها مواقع بعد.</div></div>';
    h += '</div>';

    var has = S && S.hasToken();
    h += '<div class="sync"><div class="l"><div class="t1">المزامنة بين الأجهزة</div><div class="t2">' +
      (has ? 'مفعّلة: يُحفظ تقدمك في المستودع ويُقرأ من أي جهاز' : 'لم يُدخَل مفتاح: التقدم في هذا الجهاز وحده') + '</div>' +
      (has ? syncLine() : '') + '</div>' +
      '<button type="button" class="pill" data-act="sync">' + (has ? 'المفتاح' : 'إدخال المفتاح') + '</button></div>';

    $('settings').innerHTML = h;
  }

  /* ---------- التنقل بين الشاشات ---------- */
  function screenFromHash() {
    var x = (location.hash || '').replace('#', '');
    return (x === 'calendar' || x === 'settings') ? x : 'today';
  }
  function render() {
    screen = screenFromHash();
    ['today', 'calendar', 'settings'].forEach(function (s) { $('screen-' + s).classList.toggle('on', s === screen); });
    $('nav').classList.toggle('hidden', screen === 'settings');
    $('nav-today').classList.toggle('on', screen === 'today');
    $('nav-calendar').classList.toggle('on', screen === 'calendar');
    if (screen === 'today') renderToday();
    else if (screen === 'calendar') renderCalendar();
    else renderSettings();
  }

  /* ---------- الأفعال ---------- */
  function saveExams(exams, opts) {
    if (!S) return;
    try { S.saveExams(exams, opts || {}); } catch (e) { toast('تعذّر الحفظ'); }
  }
  function setDate(code, date) {
    if (!state || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    var exams = clone(state.exams), changed = false;
    exams.forEach(function (e) { if (e.code === code && e.date !== date) { e.date = date; changed = true; } });
    if (!changed) return;
    var opts = {};
    if (currentPick() === 'auto' && (state.source === 'smart' || state.overrideExpired)) opts.override = null;
    saveExams(exams, opts);
    toast('حُفظ الموعد: ' + dateText(date) + (currentPick() === 'smart' ? '. انسخ الطلب لترتيب ذكي' : ''));
  }
  function confirmDate(code) {
    if (!state) return;
    if (!arm('confirm-date', code)) { toast('اضغط «تثبيت الموعد؟» مرة أخرى ليُرفع عنه وصف «مبدئي»'); return; }
    var exams = clone(state.exams);
    exams.forEach(function (e) { if (e.code === code) e.tentative = false; });
    saveExams(exams);
    toast('ثُبّت الموعد');
  }
  function setCap(n) {
    n = Math.max(CAP_MIN, Math.min(CAP_MAX, n));
    if (!state || n === state.cap) return;
    saveExams(null, { cap: n });
    toast('السقف اليومي: ' + n + ' ' + sessionsWord(n).replace(/^\d+ /, '') + ' (' + (n * SESSION) + ' دقيقة)');
  }
  function copyPrompt() {
    if (!S || !state) return;
    var text = S.smartPrompt(state);
    function ok() { toast('نُسخ الطلب. ألصقه في محادثة جديدة'); }
    function fallback() { smartText = text; pasteOpen = true; render(); var ta = $('paste-ta'); if (ta) { ta.focus(); ta.select(); } toast('انسخ النص من الصندوق'); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
  }
  function applyText(text) {
    if (!S || !state) return;
    var r = S.parseSmart(text, state);
    if (!r.ok) { smartErrors = r.errors; smartText = text; pasteOpen = true; render(); return; }
    smartErrors = null; smartText = ''; pasteOpen = false;
    try { S.applySmart(r.plan); toast('طُبقت الخطة الذكية'); } catch (e) { toast('تعذّر الحفظ'); }
    render();
  }
  function pasteAnswer() {
    function manual() { smartText = ''; pasteOpen = true; smartErrors = null; render(); var ta = $('paste-ta'); if (ta) ta.focus(); }
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (t) { if (t && t.indexOf('{') >= 0) applyText(t); else manual(); }, manual);
    } else manual();
  }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]'); if (!el) return;
    var act = el.getAttribute('data-act');
    if (act === 'theme') toggleTheme();
    else if (act === 'toggle') {
      if (!S) return;
      var code = el.getAttribute('data-code'), lesson = el.getAttribute('data-lesson'), kind = el.getAttribute('data-kind');
      try { if (el.getAttribute('data-done') === '1') S.undo(code, lesson); else S.done(code, lesson, kind); } catch (e) { toast('تعذّر الحفظ'); }
    }
    else if (act === 'extra') {
      if (!S) return;
      try { S.done(el.getAttribute('data-code'), el.getAttribute('data-lesson'), el.getAttribute('data-kind')); toast('سُجّلت، وتخفّ بها أيامك التالية'); } catch (e) { toast('تعذّر الحفظ'); }
    }
    else if (act === 'confirm-date') confirmDate(el.getAttribute('data-code'));
    else if (act === 'pick-auto') {
      if (state && state.source === 'smart') {
        if (!arm('pick-auto', '')) { toast('اضغط «ترتيب تلقائي» مرة أخرى لإلغاء الخطة الذكية'); return; }
        try { S.clearOverride(); toast('أُلغيت الخطة الذكية، والجدول الآن تلقائي'); } catch (e) { toast('تعذّر الحفظ'); }
      }
      pick = 'auto'; lsSet(LS_PICK, 'auto'); pasteOpen = false; smartErrors = null; render();
    }
    else if (act === 'pick-smart') { pick = 'smart'; lsSet(LS_PICK, 'smart'); render(); }
    else if (act === 'copy') copyPrompt();
    else if (act === 'paste') pasteAnswer();
    else if (act === 'apply') { var ta = $('paste-ta'); applyText(ta ? ta.value : ''); }
    else if (act === 'paste-close') { pasteOpen = false; smartErrors = null; render(); }
    else if (act === 'cap-minus') setCap((state ? state.cap : 8) - 1);
    else if (act === 'cap-plus') setCap((state ? state.cap : 8) + 1);
    else if (act === 'sync') location.href = location.pathname + '?sync#settings';
    else if (act === 'retry') { if (S && S.retrySync) { S.retrySync(); toast('جارٍ إعادة المحاولة'); } }
  });
  /* سطر «آخر حفظ» يتجدد كل دقيقة ما دامت شاشة التعديل مفتوحة وصندوق اللصق مغلقاً */
  setInterval(function () { if (screen === 'settings' && !pasteOpen) renderSettings(); }, 60000);
  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.getAttribute && el.getAttribute('data-act') === 'date' && el.value) setDate(el.getAttribute('data-code'), el.value);
  });
  window.addEventListener('hashchange', function () { window.scrollTo(0, 0); render(); });

  /* ---------- البدء ---------- */
  applyTheme();
  render();
  if (!S) {
    loadFailed = true; render();
    return;
  }
  try { var first = S.cached(); if (first) state = first; } catch (e) {}
  render();
  S.load().then(function (s) { state = s; loadFailed = false; render(); }, function () { if (!state) loadFailed = true; render(); });
  S.onChange(function (s) { if (s) state = s; render(); });
})();
