/*
  ربط الجدول بمواقع المواد (الترم الثالث).
  اقرأ SCHEDULE.md في جذر المستودع قبل أي تعديل هنا.

  - الجدول وحده يملك مواعيد الاختبارات والتوزيع على الأيام.
  - القاعدة الأولى في التوزيع: كل درس من كل مادة يُتعلَّم قبل اختبارها، ولو زاد اليوم على السقف.
  - كل موقع مادة يملك تقسيم مادته إلى دروس في <المجلد>/lessons.json.
  - الإنجاز يُسجَّل من داخل موقع المادة، فيقرؤه الجدول.
  - الحفظ في فرع progress بالمفتاح نفسه الذي يستعمله sync.js، ويقع في الجهاز أولاً.
  - الوقت كله بالدقائق: جهد كل درس في lessons.json (minutes)، والجدول يجمع دروس المادة الصغيرة
    في جلسة واحدة، ويصحح تقديره لكل مادة بالوقت الفعلي من توقيت علامات الإنجاز.
*/
(function () {
  'use strict';
  if (window.term3Schedule) return;

  var TOKEN_KEY = 'term3_gh_token';
  var BRANCH = 'progress';
  var API = 'https://api.github.com';
  var EXAMS_PATH = '_schedule/exams.json';
  var REQ = 3;              // مرات مرور الدرس: تعلّم ثم تسميعان في أيام مختلفة
  var MAX_SUBJECTS = 3;     // لا تزيد المواد في اليوم على ثلاث
  var NEAR_DAYS = 7;        // المادة القريبة: اختبارها خلال سبعة أيام، فتتوزع دروسها الباقية على أيامها بالتساوي
  var FAR_DOSE = 2;         // والبعيدة تأخذ من المتسع جرعة صغيرة: درسين في اليوم على الأكثر
  /* الوقت بالدقائق، على قواعد البحث: الجلسة 25 إلى 30 دقيقة لمادة واحدة، والسقف 6 إلى 8 جلسات */
  var SESSION = 25;         // الجلسة، والسقف اليومي = السقف بالجلسات × 25 دقيقة (8 = 200)
  var SESSION_MAX = 30;     // وتمتد الجلسة إلى 30 دقيقة قبل أن تُفتح جلسة جديدة
  var RECALL_SHARE = 1 / 3; // التسميع نحو ثلث وقت تعلّم الدرس (تقدير؛ البحث يقول: سمّع حتى تصيب مرة)
  var RECALL_MIN = 1;       // ولا يقل التسميع عن دقيقة
  var SPECIAL_MIN = 25;     // المراجعة الشاملة وليلة الاختبار جلسة كاملة
  var STEP = 5;             // تُقرَّب أنصبة المواد بخمس دقائق
  var TOL = 10;             // ويجوز تجاوز النصيب بعشر دقائق حتى لا يُقطع درس
  var BURST_MS = 60000;     // علامات الإنجاز المتلاحقة في أقل من دقيقة دفعة واحدة
  var CAL_MIN = 4, CAL_KEEP = 15; // لا يُصحَّح تقدير مادة قبل أربع عينات، ويُعتمد آخر خمس عشرة
  var DAY_START = 7;        // يبدأ يوم الجدول في السابعة صباحاً، فالسهر بعد منتصف الليل يُحسب لليوم السابق
  var SPECIAL = { _review: 'مراجعة شاملة بالتسميع', _eve: 'ليلة الاختبار: تسميع البطاقات وورقة الليلة الأخيرة' };
  var KINDS = { learn: 1, recall: 1, review: 1, eve: 1 };

  /* ---------- المكان ---------- */
  var host = location.hostname, parts = location.pathname.split('/').filter(Boolean);
  var OWNER = host.slice(-10) === '.github.io' ? host.slice(0, -10) : 'vua5l';
  var REPO = host.slice(-10) === '.github.io' && parts[0] ? parts[0] : 'term3';
  var BASE = (function () {
    var s = document.currentScript && document.currentScript.src;
    try { return s ? new URL('.', s).href : new URL('../', location.href).href; } catch (e) { return '../'; }
  })();

  /* ---------- أدوات ---------- */
  function token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function lsGet(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob(String(b64).replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* التواريخ بصيغة YYYY-MM-DD على توقيت الجهاز */
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parseISO(s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); }
  function diffDays(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); } // b - a
  /* يوم الجدول لوقتٍ ما: ما قبل السابعة صباحاً من اليوم السابق */
  function dayOf(t) { var d = new Date(t); if (d.getHours() < DAY_START) d.setDate(d.getDate() - 1); return iso(d); }
  function todayISO() { return dayOf(Date.now()); }
  /* يوم العلامة من مفتاحها (الدرس|اليوم). وما سُجّل بين منتصف الليل والسابعة قبل أن يبدأ اليوم في السابعة
     كُتب بتاريخ اليوم الجديد، فيُعاد إلى يومه، والعلامات الجديدة لا يمسّها هذا لأن تاريخها يوم الجدول */
  function markDay(k, m) {
    var d = k.slice(k.lastIndexOf('|') + 1), t = m && m.t > 0 ? new Date(m.t) : null;
    return t && t.getHours() < DAY_START && iso(t) === d ? addDays(d, -1) : d;
  }

  /* ---------- GitHub ---------- */
  function gh(method, path, body, keepalive) {
    var opt = { method: method, cache: 'no-store', headers: { 'Authorization': 'Bearer ' + token(), 'Accept': 'application/vnd.github+json' } };
    if (body) { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
    if (keepalive && opt.body && opt.body.length < 60000) opt.keepalive = true;
    return fetch(API + path, opt).then(function (r) {
      return r.text().then(function (t) { var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {} return { status: r.status, body: j }; });
    });
  }
  var branchReady = null;
  function ensureBranch() {
    if (branchReady) return branchReady;
    branchReady = gh('GET', '/repos/' + OWNER + '/' + REPO + '/git/ref/heads/' + BRANCH).then(function (r) {
      if (r.status === 200) return true;
      return gh('GET', '/repos/' + OWNER + '/' + REPO).then(function (rr) {
        return gh('GET', '/repos/' + OWNER + '/' + REPO + '/git/ref/heads/' + ((rr.body && rr.body.default_branch) || 'main'));
      }).then(function (m) {
        return gh('POST', '/repos/' + OWNER + '/' + REPO + '/git/refs', { ref: 'refs/heads/' + BRANCH, sha: m.body.object.sha });
      }).then(function () { return true; });
    });
    branchReady.catch(function () { branchReady = null; });
    return branchReady;
  }

  /* ملف في فرع progress: قراءة وكتابة، والجهاز أولاً */
  var shas = {}, chains = {};
  function remoteRead(path) {
    if (token()) {
      return gh('GET', '/repos/' + OWNER + '/' + REPO + '/contents/' + path + '?ref=' + BRANCH).then(function (r) {
        if (r.status === 404) { shas[path] = null; return null; }
        if (r.status !== 200) throw new Error('unavailable');
        shas[path] = r.body.sha;
        try { return JSON.parse(b64decode(r.body.content)); } catch (e) { return null; }
      });
    }
    // بلا مفتاح: النسخة العامة (قد تتأخر دقائق)
    return fetch('https://raw.githubusercontent.com/' + OWNER + '/' + REPO + '/' + BRANCH + '/' + path + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (r.status === 404) return null; if (!r.ok) throw new Error('unavailable'); return r.json(); });
  }
  function remoteWrite(path, rec, merge, keepalive, retried) {
    return ensureBranch().then(function () {
      var body = { message: 'الجدول: ' + path, content: b64encode(JSON.stringify(rec)), branch: BRANCH };
      if (shas[path]) body.sha = shas[path];
      return gh('PUT', '/repos/' + OWNER + '/' + REPO + '/contents/' + path, body, keepalive);
    }).then(function (r) {
      if (r.status === 200 || r.status === 201) { shas[path] = r.body.content && r.body.content.sha; return rec; }
      if ((r.status === 409 || r.status === 422 || r.status === 404) && !retried) {
        return remoteRead(path).then(function (cur) { var m = merge(cur, rec); return remoteWrite(path, m, merge, keepalive, true); });
      }
      throw new Error('unavailable');
    });
  }
  function pendKey(path) { return 'term3_sched_pend_' + path; }
  function cacheKey(path) { return 'term3_sched_cache_' + path; }

  /* حالة الرفع، تعرضها شاشة التعديل: كم رفعة جارية، وهل أخفقت آخر محاولة ومتى */
  var syncBusy = 0, syncFailed = false, syncFailedAt = 0;
  function syncNote(ok) { if (ok) syncFailed = false; else { syncFailed = true; syncFailedAt = Date.now(); } emit(); }

  function store(path, merge) {
    function local() { return merge(lsGet(cacheKey(path)), lsGet(pendKey(path))); }
    function flush(keepalive) {
      var run = (chains[path] || Promise.resolve()).then(function () {
        var rec = lsGet(pendKey(path)); if (!rec || !token()) return;
        syncBusy++; emit();
        return remoteRead(path).then(function (cur) {
          var m = merge(cur, rec);
          return remoteWrite(path, m, merge, keepalive);
        }).then(function (saved) {
          lsSet(cacheKey(path), saved);
          var now = lsGet(pendKey(path)); if (now && now.savedAt === rec.savedAt) lsSet(pendKey(path), null);
          syncBusy--; syncNote(true);
        }, function (e) { syncBusy--; syncNote(false); throw e; });
      }).catch(function () {});
      chains[path] = run;
      return run;
    }
    return {
      local: local,
      pull: function () {
        return remoteRead(path).then(function (cur) {
          var m = merge(lsGet(cacheKey(path)), cur);
          lsSet(cacheKey(path), cur ? m : lsGet(cacheKey(path)));
          return local();
        }).catch(function () { return local(); });
      },
      put: function (rec) {
        rec.savedAt = Date.now();
        lsSet(pendKey(path), merge(lsGet(pendKey(path)), rec));
        return flush();
      },
      flush: flush
    };
  }

  /* الدمج: المواعيد بالأحدث، والإنجاز علامةً علامة بالأحدث */
  function mergeLatest(a, b) { if (!a) return b || null; if (!b) return a; return (b.savedAt || 0) >= (a.savedAt || 0) ? b : a; }
  function mergeMarks(a, b) {
    if (!a) return b ? clone(b) : null; if (!b) return clone(a);
    var out = { v: 1, savedAt: Math.max(a.savedAt || 0, b.savedAt || 0), marks: {}, level: null };
    [a.marks || {}, b.marks || {}].forEach(function (m) {
      Object.keys(m).forEach(function (k) { if (!out.marks[k] || (m[k].t || 0) >= (out.marks[k].t || 0)) out.marks[k] = m[k]; });
    });
    var la = a.level, lb = b.level; out.level = !la ? lb || null : !lb ? la : ((lb.t || 0) >= (la.t || 0) ? lb : la);
    return out;
  }

  var examsStore = store(EXAMS_PATH, mergeLatest);
  var markStores = {};
  function marksStore(code) { return markStores[code] || (markStores[code] = store(code + '/_passes.json', mergeMarks)); }

  /* ---------- دروس كل مادة (ملف ثابت في مجلدها) ---------- */
  function loadLessons(code) {
    var k = 'term3_sched_lessons_' + code;
    return fetch(BASE + code + '/lessons.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (r.status === 404) return null; if (!r.ok) throw new Error('x'); return r.json(); })
      .then(function (j) { lsSet(k, j || { none: true }); return j; })
      .catch(function () { var c = lsGet(k); return c && !c.none ? c : null; });
  }

  /* من العلامات إلى تواريخ المرور لكل درس */
  function passesOf(rec) {
    var out = {};
    if (!rec || !rec.marks) return out;
    Object.keys(rec.marks).forEach(function (k) {
      var m = rec.marks[k]; if (!m || !m.on) return;
      var id = k.slice(0, k.lastIndexOf('|')), d = markDay(k, m);
      out[id] = out[id] || [];
      if (out[id].indexOf(d) < 0) out[id].push(d);
    });
    Object.keys(out).forEach(function (id) { out[id].sort(); });
    return out;
  }

  /* ---------- الوقت بالدقائق ---------- */
  /* جهد الدرس أول مرة بالدقائق: خانة minutes، وإلا الجلسات القديمة × 25 دقيقة */
  function baseMinutes(l) {
    var m = +(l && l.minutes); if (m > 0) return m;
    var s = +(l && l.sessions); return (s > 0 ? s : 1) * SESSION;
  }
  /* بعد تصحيحه بالوقت الفعلي للمادة إن وُجد */
  function lessonMinutes(l, f) { return Math.max(1, Math.round(baseMinutes(l) * (f || 1))); }
  function recallOf(m) { return Math.max(RECALL_MIN, Math.round(m * RECALL_SHARE)); }
  /* الجلسات بأنصافها، للمواقع التي ما زالت تعرض الجلسات */
  function unitsOf(m) { return Math.max(0.5, Math.round(m / SESSION * 2) / 2); }
  function ceilStep(x) { return Math.ceil(x / STEP) * STEP; }
  function floorStep(x) { return Math.floor(x / STEP) * STEP; }

  /* جمع مهام اليوم في جلسات: مادة واحدة في الجلسة، ودروسها الصغيرة المتتالية في جلسة واحدة
     إلى 30 دقيقة، والدرس الطويل يمتد على أكثر من جلسة ولا يُقطع */
  function packDay(day) {
    var no = 0, fill = 0, prev = null;
    day.minutes = 0; day.load = 0;
    day.tasks.forEach(function (t) {
      var m = +t.minutes || 0;
      if (t.code !== prev || (fill > 0 && fill + m > SESSION_MAX)) { no++; fill = 0; }
      prev = t.code; t.session = no; fill += m;
      day.minutes += m; day.load += unitsOf(m);
      while (fill > SESSION_MAX) { no++; fill -= SESSION; }
    });
    day.sessions = no;
    return day;
  }

  /* ---------- الوقت الفعلي ----------
     من توقيت علامات الإنجاز قبل اليوم: الوقت بين دفعة علامات والتي قبلها في اليوم نفسه
     هو وقت مذاكرة مهامها. والعلامات المتلاحقة دفعة واحدة، وتُترك الفترات التي فيها استراحة
     طويلة أو مادتان. فإن علّمتُ دروسي جملةً في آخر اليوم لم يتغير شيء.
     والنتيجة لكل مادة نسبة الوقت الفعلي إلى المقدَّر، ولا تُعتمد قبل أربع عينات. */
  function calibrate(marksBy, lessonIndex, passes, today) {
    var ev = [];
    Object.keys(marksBy || {}).forEach(function (c) {
      var rec = marksBy[c]; if (!rec || !rec.marks) return;
      Object.keys(rec.marks).forEach(function (k) {
        var m = rec.marks[k]; if (!m || !m.on || !(m.t > 0)) return;
        var d = markDay(k, m);
        if (d < today) ev.push({ c: c, id: k.slice(0, k.lastIndexOf('|')), d: d, t: m.t });
      });
    });
    ev.sort(function (a, b) { return a.t - b.t; });
    var bursts = [];
    ev.forEach(function (e) {
      var b = bursts[bursts.length - 1];
      if (b && b.d === e.d && e.t - b.end < BURST_MS) { b.items.push(e); b.end = e.t; }
      else bursts.push({ d: e.d, start: e.t, end: e.t, items: [e] });
    });
    var samples = {};
    for (var i = 1; i < bursts.length; i++) {
      var b = bursts[i], p = bursts[i - 1], c = b.items[0].c, est = 0, ok = b.d === p.d;
      b.items.forEach(function (e) {
        var l = (lessonIndex[e.c] || {})[e.id];
        if (e.c !== c || !l) { ok = false; return; }
        var m = baseMinutes(l), first = ((passes[e.c] || {})[e.id] || [])[0];
        est += e.d === first ? m : recallOf(m);
      });
      if (!ok || !est) continue;
      var actual = (b.start - p.end) / 60000;
      if (actual < 1 || actual > Math.min(150, Math.max(3 * est, est + 30))) continue;
      (samples[c] = samples[c] || []).push(Math.min(3, Math.max(0.2, actual / est)));
    }
    var out = {};
    Object.keys(samples).forEach(function (c) {
      var s = samples[c].slice(-CAL_KEEP).sort(function (a, b) { return a - b; });
      if (s.length < CAL_MIN) return;
      var h = s.length >> 1, med = s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
      out[c] = { factor: Math.min(2.5, Math.max(0.4, Math.round(med * 100) / 100)), samples: s.length };
    });
    return out;
  }

  /* ---------- التوزيع التلقائي: التغطية أولاً، ثم قواعد البحث ---------- */
  /*
    exams:   [{code, name, date}]
    lessons: {code: [{id, title, minutes}]}   (أو sessions القديمة)
    passes:  {code: {id: [YYYY-MM-DD]}}
    cap:     السقف اليومي بالجلسات، والجلسة 25 دقيقة (8 = 200 دقيقة)
    factors: {code: نسبة الوقت الفعلي إلى المقدَّر}

    القاعدة الأولى وأعلاها: كل درس من كل مادة يُتعلَّم قبل اختبارها.
    - المادة القريبة (اختبارها خلال سبعة أيام): دروسها الباقية تتوزع بالتساوي على أيام تعلّمها،
      وآخرها يوم المراجعة الشاملة، فلا يُترك منها شيء لليلة الاختبار إلا إن تأخر الطالب.
    - المادة البعيدة: لا تأخذ من وقت القريبة إلا ما لا يحتمل التأجيل، حتى تُضمن تغطيتها هي أيضاً.
    - السقف حدّ اليوم المريح: لا يتجاوزه إلا التعلّم الذي تحتاجه التغطية، والمراجعة الشاملة، وليلة الاختبار.
    ثم ما بقي داخل السقف: تسميع القريبة أولاً، ثم البعيدة جرعات صغيرة، ثم التقدم في دروس القريبة.
    وتبقى قواعد البحث: مادة واحدة في الجلسة، وثلاث مواد في اليوم على الأكثر لغير التغطية، والأقرب
    اختباراً أول اليوم، ومادة ليلة الاختبار آخره، والتسميع أول جلسة المادة.
    يُبنى بالدقائق من بداية اليوم: ما أُنجز اليوم لا يغيّر خطة اليوم، بل يُعلَّم منجزاً فيها.
  */
  function buildPlan(exams, lessons, passes, today, cap, factors) {
    cap = cap || 8; factors = factors || {};
    var CAP = cap * SESSION;
    var subj = [], warnings = [];
    exams.forEach(function (e) {
      if (!e.date || diffDays(today, e.date) <= 0) return;
      if (!e.code || !lessons[e.code] || !lessons[e.code].length) {
        // مادة بلا موقع: لا يعرف الجدول دروسها، فلا يقدر أن يضمن تغطيتها
        warnings.push({ type: 'nosite', code: e.code || '', key: e.key || '', name: e.name || e.code || '', date: e.date });
        return;
      }
      var st = lessons[e.code].map(function (l) {
        var ds = ((passes[e.code] || {})[l.id] || []).filter(function (d) { return d < today; });
        ds = ds.filter(function (d, i) { return ds.indexOf(d) === i; });
        var m = lessonMinutes(l, factors[e.code]);
        return { l: l, m: m, r: recallOf(m), n: Math.min(ds.length, REQ), last: ds.length ? ds[ds.length - 1] : null };
      });
      subj.push({ e: e, st: st });
    });
    if (!subj.length) return { days: [], warnings: warnings };
    // الأقرب اختباراً أولاً في كل خطوة
    subj.sort(function (a, b) { return a.e.date < b.e.date ? -1 : a.e.date > b.e.date ? 1 : 0; });
    var days = [], end = today;
    subj.forEach(function (s) { var last = addDays(s.e.date, -1); if (last > end) end = last; });

    function freshOf(s) { return s.st.filter(function (x) { return x.n === 0; }); }
    function freshMin(s) { return freshOf(s).reduce(function (t, x) { return t + x.m; }, 0); }
    /* أيام التعلّم الباقية من يوم d: إلى يوم المراجعة الشاملة، وليلة الاختبار وحدها إن لم يبقَ غيرها */
    function learnDays(s, d) { var A = diffDays(d, s.e.date); return A >= 2 ? A - 1 : 1; }
    function task(s, x, kind) { return { code: s.e.code, lesson: x.l.id, kind: kind, minutes: kind === 'learn' ? x.m : x.r }; }
    function dueRecalls(s, d) {
      var A = diffDays(d, s.e.date);
      return s.st.filter(function (x) {
        if (x.n < 1 || x.n >= REQ || !x.last || x.last >= d) return false;
        if (A === 1) return true; // ليلة الاختبار: كل ما لم يكمل مروره
        var gap = Math.max(1, Math.round(0.3 * diffDays(x.last, s.e.date)));
        return diffDays(x.last, d) >= gap;
      }).sort(function (a, b) {
        // الأضيق فرصة أولاً (ما بقي له من مرور أكثر مما بقي من أيام)، ثم الأقدم
        var sa = A - (REQ - a.n), sb = A - (REQ - b.n);
        return (sa - sb) || (a.last < b.last ? -1 : a.last > b.last ? 1 : 0);
      });
    }
    /* الوقت المريح (داخل السقف) الباقي لدروس مادة بعيدة في أيام تعلّمها بعد يوم d، بعد ما تحتاجه
       المواد الأقرب منها: نصيبها المتساوي من دروسها الباقية، ومراجعتها الشاملة، وليلة اختبارها */
    function roomAfter(s, d) {
      var room = 0, lastLearn = addDays(s.e.date, -2), next = addDays(d, 1);
      var near = subj.filter(function (n) { return n.e.date < s.e.date && diffDays(next, n.e.date) > 0; }).map(function (n) {
        return { n: n, pace: freshMin(n) / learnDays(n, next), lastLearn: addDays(n.e.date, -2) };
      });
      for (var x = next; x <= lastLearn; x = addDays(x, 1)) {
        var used = diffDays(x, s.e.date) === 2 ? SPECIAL_MIN : 0;
        near.forEach(function (o) {
          var A = diffDays(x, o.n.e.date);
          if (A <= 0) return;
          if (x <= o.lastLearn) used += o.pace;
          if (A <= 2) used += SPECIAL_MIN;
        });
        room += Math.max(0, CAP - used);
      }
      return room;
    }
    // الترتيب داخل المادة: التسميع أول الجلسة، ثم الدرس الجديد، ثم المراجعة الشاملة أو ليلة الاختبار
    var ORDER = { recall: 0, learn: 1, review: 2, eve: 2 };
    function byOrder(a, b) { return ORDER[a.kind] - ORDER[b.kind]; }

    for (var d = today; d <= end; d = addDays(d, 1)) {
      var day = { date: d, tasks: [] }, load = 0, groups = [], byCode = {};
      var active = subj.filter(function (s) { return diffDays(d, s.e.date) > 0; });
      active.forEach(function (s) { s._A = diffDays(d, s.e.date); s._near = s._A <= NEAR_DAYS; });
      var add = function (s, t) {
        var g = byCode[s.e.code];
        if (!g) { g = byCode[s.e.code] = { s: s, tasks: [] }; groups.push(g); }
        g.tasks.push(t); load += t.minutes;
      };
      var room = function () { return CAP - load; };
      var canJoin = function (s) { return !!byCode[s.e.code] || groups.length < MAX_SUBJECTS; };
      /* يتعلّم من دروس المادة بالترتيب ما يقارب target دقيقة، ولا يُقطع درس. وفي آخر أيام تعلّمها
         (all) يضع كل ما بقي، فلا يبقى درس بلا مكان قبل اختبارها */
      var learnTo = function (s, target, all) {
        var fr = freshOf(s), done = 0;
        for (var i = 0; i < fr.length; i++) {
          if (!all && done + fr[i].m / 2 > target) break;
          add(s, task(s, fr[i], 'learn')); done += fr[i].m; fr[i].n = 1; fr[i].last = d;
        }
        return done;
      };
      // 1) التغطية في المواد القريبة: دروسها الباقية بالتساوي على أيام تعلّمها، ولو زاد اليوم على السقف.
      //    ويوزن اليوم بأقل معدّل يومي ثابت يكفي لتغطية المواد القريبة كلها في مواعيدها (rate)، فلا يثقل
      //    يوم ويخف آخر: الأقرب اختباراً يأخذ نصيبه أولاً، والتي بعدها ما بقي من المعدّل ولا تتأخر عن موعدها.
      var near = active.filter(function (s) { return s._near; });
      var fixedToday = active.filter(function (s) { return s._A <= 2; }).length * SPECIAL_MIN;
      var rate = 0, cum = 0, paces = 0;
      near.forEach(function (s) {
        var left = learnDays(s, d), last = addDays(d, left - 1), fixed = 0;
        cum += freshMin(s); paces += freshMin(s) / left;
        active.forEach(function (o) { // المراجعة الشاملة وليلة الاختبار الواقعتان في أيام تعلّمها
          var rv = addDays(o.e.date, -2), ev = addDays(o.e.date, -1);
          if (rv >= d && rv <= last) fixed += SPECIAL_MIN;
          if (ev >= d && ev <= last) fixed += SPECIAL_MIN;
        });
        rate = Math.max(rate, (cum + fixed) / left);
      });
      var budget = Math.max(rate, Math.min(CAP, paces + fixedToday)) - fixedToday, used = 0;
      near.forEach(function (s) {
        var left = learnDays(s, d), L = freshMin(s);
        if (!L) return;
        used += learnTo(s, left === 1 ? L : Math.min(L / left, Math.max(0, budget - used)), left === 1);
      });
      // 2) المراجعة الشاملة قبل الاختبار بيومين، وليلة الاختبار
      active.forEach(function (s) {
        if (s._A <= 2) add(s, { code: s.e.code, lesson: s._A === 1 ? '_eve' : '_review', kind: s._A === 1 ? 'eve' : 'review', minutes: SPECIAL_MIN });
      });
      // 3) ما لا يحتمل التأجيل من دروس المواد البعيدة، حتى تُضمن تغطيتها هي أيضاً
      active.forEach(function (s) {
        if (s._near) return;
        var must = freshMin(s) - roomAfter(s, d);
        if (must > 0) learnTo(s, must, false);
      });
      // 4) المتسع داخل السقف: تسميع المواد القريبة أولاً والأقرب اختباراً أحق به، ثم تسميع ما تعلّمه من البعيدة
      [true, false].forEach(function (nearPass) {
        active.forEach(function (s) {
          if (s._near !== nearPass || !canJoin(s)) return;
          dueRecalls(s, d).forEach(function (x) {
            if (room() < x.r - 2) return;
            add(s, task(s, x, 'recall')); x.n++; x.last = d;
          });
        });
      });
      // 5) ثم المادة البعيدة جرعات صغيرة: نصيبها المتساوي من دروسها الباقية على أيامها، ودرسان على الأكثر
      active.forEach(function (s) {
        if (s._near || !canJoin(s)) return;
        var fr = freshOf(s), pace = freshMin(s) / learnDays(s, d), done = 0;
        for (var i = 0; i < fr.length && i < FAR_DOSE; i++) {
          if (done + fr[i].m / 2 > pace || room() < fr[i].m - TOL) break;
          add(s, task(s, fr[i], 'learn')); done += fr[i].m; fr[i].n = 1; fr[i].last = d;
        }
      });
      // 6) ثم التقدم في دروس القريبة إن بقي متسع، ولا تعلّم ليلة الاختبار إلا ما تحتاجه التغطية
      active.forEach(function (s) {
        if (!s._near || s._A === 1 || !canJoin(s)) return;
        var fr = freshOf(s);
        for (var i = 0; i < fr.length; i++) {
          if (room() < fr[i].m - TOL) break;
          add(s, task(s, fr[i], 'learn')); fr[i].n = 1; fr[i].last = d;
        }
      });
      // الأقرب اختباراً أول اليوم، ومادة ليلة الاختبار آخره لتكون آخر ما يُراجع قبل النوم
      groups.sort(function (a, b) { return ((a.s._A === 1) - (b.s._A === 1)) || (a.s.e.date < b.s.e.date ? -1 : 1); });
      groups.forEach(function (g) {
        g.tasks.sort(byOrder);
        if (g.s._A === 1 && g.tasks.some(function (t) { return t.kind === 'learn'; })) warnings.push({ date: d, type: 'eve-learn', code: g.s.e.code });
        g.tasks.forEach(function (t) { t.units = unitsOf(t.minutes); day.tasks.push(t); });
      });
      if (load > CAP + TOL) warnings.push({ date: d, type: 'over', minutes: load, cap: CAP });
      days.push(packDay(day));
      // ما أُنجز اليوم خارج مهامه، كمهمة «إن بقي عندك وقت»، يُحسب في الأيام التالية في الحال،
      // فيُحذف درسه من يومه الآتي وتخفّ الأيام بعده. وتبقى مهام اليوم نفسه كما بُنيت من أوله.
      if (d === today) {
        var planned = {};
        day.tasks.forEach(function (t) { planned[t.code + '|' + t.lesson] = 1; });
        subj.forEach(function (s) {
          s.st.forEach(function (x) {
            if (planned[s.e.code + '|' + x.l.id]) return;
            if (((passes[s.e.code] || {})[x.l.id] || []).indexOf(today) < 0) return;
            x.n = Math.min(REQ, x.n + 1); x.last = today;
          });
        });
      }
    }
    // تنبيه صادق: دروس لن تمرّ ثلاث مرات قبل اختبارها
    subj.forEach(function (s) {
      var short = s.st.filter(function (x) { return x.n < REQ; }).length;
      var never = s.st.filter(function (x) { return x.n === 0; }).length;
      if (short) warnings.push({ type: 'short', code: s.e.code, count: short, unlearned: never });
    });
    return { days: days, warnings: warnings };
  }

  /* «إن بقي عندك وقت»: أنفع مهمة تالية لمن أنهى مهام يومه، بترتيب المتسع نفسه: تسميع المواد القريبة
     الذي حان، ثم تسميع البعيدة، ثم درس من المادة البعيدة، ثم التقدم في دروس القريبة.
     فإن كانت الأيام الآتية فوق السقف لأجل التغطية (tight)، قُدّم التقدم في دروس القريبة، لأنه يخفّفها.
     ولا يُقترح درس مرّ اليوم، ولا ما في مهام اليوم، ولا تعلّم جديد ليلة اختبار مادته. */
  function extraFor(today, exams, lessonList, passes, factors, todayTasks, tight) {
    var inToday = {};
    (todayTasks || []).forEach(function (t) { inToday[t.code + '|' + t.lesson] = 1; });
    var subs = (exams || []).filter(function (e) { return e.code && e.date && lessonList[e.code] && diffDays(today, e.date) > 0; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var rec = [], farRec = [], far = [], ahead = [];
    subs.forEach(function (e) {
      var A = diffDays(today, e.date), near = A <= NEAR_DAYS;
      lessonList[e.code].forEach(function (l) {
        if (inToday[e.code + '|' + l.id]) return;
        var all = (passes[e.code] || {})[l.id] || [];
        if (all.indexOf(today) >= 0) return;
        var ds = all.filter(function (x, i) { return x < today && all.indexOf(x) === i; }).sort();
        var n = Math.min(ds.length, REQ), m = lessonMinutes(l, factors[e.code]);
        if (n === 0) {
          if (!near) far.push({ code: e.code, lesson: l.id, kind: 'learn', minutes: m });
          else if (A > 1) ahead.push({ code: e.code, lesson: l.id, kind: 'learn', minutes: m });
        } else if (n < REQ) {
          var last = ds[ds.length - 1], gap = A === 1 ? 0 : Math.max(1, Math.round(0.3 * diffDays(last, e.date)));
          if (diffDays(last, today) >= gap) (near ? rec : farRec).push({ code: e.code, lesson: l.id, kind: 'recall', minutes: recallOf(m) });
        }
      });
    });
    if (tight) return ahead[0] || rec[0] || farRec[0] || far[0] || null;
    return rec[0] || farRec[0] || far[0] || ahead[0] || null;
  }

  /* ---------- الحالة المجمّعة ---------- */
  var state = null, listeners = [];
  function emit() { listeners.forEach(function (f) { try { f(state); } catch (e) {} }); }

  function examsBasis(exams) { return (exams || []).map(function (e) { return (e.code || e.key) + '@' + e.date; }).join(','); }

  function compose(examsRec, lessonsBy, marksBy) {
    var today = todayISO();
    var exams = (examsRec && examsRec.exams) || [];
    var cap = (examsRec && examsRec.cap) || 8;
    var passes = {}, levels = {};
    Object.keys(marksBy).forEach(function (c) { passes[c] = passesOf(marksBy[c]); levels[c] = marksBy[c] && marksBy[c].level || null; });
    var lessonList = {}, lessonIndex = {};
    Object.keys(lessonsBy).forEach(function (c) {
      var j = lessonsBy[c]; if (!j || !j.lessons) return;
      lessonList[c] = j.lessons;
      lessonIndex[c] = {}; j.lessons.forEach(function (l) { lessonIndex[c][l.id] = l; });
    });

    // الوقت الفعلي: نسبة ما استغرقته كل مادة إلى تقديرها، من علامات ما قبل اليوم
    var calib = calibrate(marksBy, lessonIndex, passes, today), factors = {};
    Object.keys(calib).forEach(function (c) { factors[c] = calib[c].factor; });

    var ov = examsRec && examsRec.override;
    var source = 'auto', plan;
    if (ov && ov.basis === examsBasis(exams) && ov.days) {
      source = 'smart';
      plan = { days: ov.days.filter(function (x) { return x.date >= today; }).map(function (x) {
        return { date: x.date, tasks: x.tasks.map(function (t) {
          var l = (lessonIndex[t.code] || {})[t.lesson], m = SPECIAL_MIN;
          if (l && (t.kind === 'learn' || t.kind === 'recall')) { m = lessonMinutes(l, factors[t.code]); if (t.kind === 'recall') m = recallOf(m); }
          return { code: t.code, lesson: t.lesson, kind: t.kind, minutes: m };
        }) };
      }), warnings: [] };
      // التغطية أولاً: إن ترك فوات مهامها درساً لم يُتعلَّم بلا مكان قبل اختباره، عاد الجدول إلى الترتيب التلقائي
      var placed = {};
      plan.days.forEach(function (x) { x.tasks.forEach(function (t) { if (t.kind === 'learn') placed[t.code + '|' + t.lesson] = 1; }); });
      var lost = exams.some(function (e) {
        if (!e.code || !e.date || !lessonList[e.code] || diffDays(today, e.date) <= 0) return false;
        return lessonList[e.code].some(function (l) { return !((passes[e.code] || {})[l.id] || []).length && !placed[e.code + '|' + l.id]; });
      });
      if (lost) { source = 'auto'; plan = null; }
      else plan.warnings = buildPlan(exams, lessonList, passes, today, cap, factors).warnings.filter(function (w) { return w.type === 'nosite'; });
    }
    if (!plan) plan = buildPlan(exams, lessonList, passes, today, cap, factors);

    // تفاصيل كل مهمة: عنوانها ورابطها ووقتها وهل أُنجزت في يومها، ثم جلسات اليوم
    plan.days.forEach(function (day) {
      day.tasks.forEach(function (t) {
        var l = (lessonIndex[t.code] || {})[t.lesson] || {};
        t.title = SPECIAL[t.lesson] || l.title || t.lesson; t.pages = l.pages || '';
        t.link = BASE + t.code + '/' + (l.link || '');
        t.done = ((passes[t.code] || {})[t.lesson] || []).indexOf(day.date) >= 0;
        t.units = unitsOf(t.minutes);
      });
      packDay(day);
    });

    // «إن بقي عندك وقت»: أنفع مهمة تالية بعد مهام اليوم، بعنوانها ورابطها
    var todayPlan = null;
    plan.days.forEach(function (x) { if (x.date === today) todayPlan = x; });
    var tight = (plan.warnings || []).some(function (w) { return w.type === 'over' && w.date > today; });
    var extra = extraFor(today, exams, lessonList, passes, factors, todayPlan ? todayPlan.tasks : [], tight);
    if (extra) {
      var el = (lessonIndex[extra.code] || {})[extra.lesson] || {};
      extra.title = el.title || extra.lesson; extra.pages = el.pages || '';
      extra.link = BASE + extra.code + '/' + (el.link || '');
      extra.done = false; extra.units = unitsOf(extra.minutes);
    }

    // التقدم: مرات المرور المنجزة من المطلوب
    var progress = {};
    Object.keys(lessonList).forEach(function (c) {
      var need = lessonList[c].length * REQ, got = 0, learned = 0;
      lessonList[c].forEach(function (l) { var n = ((passes[c] || {})[l.id] || []).length; got += Math.min(n, REQ); if (n) learned++; });
      progress[c] = { pct: need ? Math.round(got / need * 100) : 0, learned: learned, total: lessonList[c].length, level: levels[c] };
    });

    return {
      today: today, cap: cap, capMinutes: cap * SESSION, exams: exams, source: source,
      overrideExpired: !!(ov && ov.basis !== examsBasis(exams)),
      overrideLost: !!(ov && ov.basis === examsBasis(exams) && source === 'auto'),
      lessons: lessonList, passes: passes, progress: progress,
      days: plan.days, warnings: plan.warnings || [], calib: calib, extra: extra,
      updated: examsRec && examsRec.savedAt || 0
    };
  }

  function refreshFromLocal() {
    if (!state || !state._raw) return;
    var raw = state._raw, marksBy = {};
    Object.keys(raw.lessonsBy).forEach(function (c) { marksBy[c] = marksStore(c).local(); });
    var s = compose(examsStore.local() || raw.examsRec, raw.lessonsBy, marksBy);
    s._raw = { examsRec: examsStore.local() || raw.examsRec, lessonsBy: raw.lessonsBy };
    state = s; emit();
  }

  var loading = null;
  function load() {
    if (loading) return loading;
    loading = examsStore.pull().then(function (examsRec) {
      var exams = (examsRec && examsRec.exams) || [];
      var codes = exams.map(function (e) { return e.code; }).filter(Boolean);
      return Promise.all(codes.map(function (c) {
        return Promise.all([loadLessons(c), marksStore(c).pull()]);
      })).then(function (rs) {
        var lessonsBy = {}, marksBy = {};
        codes.forEach(function (c, i) { lessonsBy[c] = rs[i][0]; marksBy[c] = rs[i][1]; });
        var s = compose(examsRec, lessonsBy, marksBy);
        s._raw = { examsRec: examsRec, lessonsBy: lessonsBy };
        state = s; loading = null; emit();
        flushAll(); // ما بقي في الجهاز يُرفع فور فتح الصفحة، لا عند مغادرتها فقط
        return state;
      });
    });
    loading.catch(function () { loading = null; });
    return loading;
  }

  /* ---------- واجهة المواقع ---------- */
  function forSite(s, code) {
    var exam = null; s.exams.forEach(function (e) { if (e.code === code) exam = e; });
    var mine = s.days.map(function (d) {
      var tasks = d.tasks.filter(function (t) { return t.code === code; });
      return { date: d.date, tasks: tasks, minutes: tasks.reduce(function (a, t) { return a + (t.minutes || 0); }, 0) };
    }).filter(function (d) { return d.tasks.length; });
    var today = (mine[0] && mine[0].date === s.today) ? mine[0].tasks : [];
    return {
      exam: exam, today: today, days: mine, progress: s.progress[code] || null,
      passes: s.passes[code] || {}, scheduleUrl: BASE + '#settings', all: s
    };
  }

  function mark(code, lessonId, on, kind, date) {
    var day = date || todayISO(), k = lessonId + '|' + day, now = Date.now();
    var rec = { v: 1, marks: {} };
    rec.marks[k] = { on: on ? 1 : 0, t: now, k: kind || '' };
    if (!on) { // والإلغاء يشمل علامة الدرس التي كُتبت بتاريخ الغد وهي لهذا اليوم (انظر markDay)
      var cur = (marksStore(code).local() || {}).marks || {};
      Object.keys(cur).forEach(function (x) {
        if (x !== k && cur[x] && cur[x].on && x.slice(0, x.lastIndexOf('|')) === lessonId && markDay(x, cur[x]) === day)
          rec.marks[x] = { on: 0, t: now, k: '' };
      });
    }
    var p = marksStore(code).put(rec);
    refreshFromLocal();
    return p;
  }

  window.term3Schedule = {
    version: 2,
    base: BASE,
    todayISO: todayISO,
    /* load(code): للموقع: موعده ومهامه. load(): للجدول: كل شيء */
    load: function (code) { return load().then(function (s) { return code ? forSite(s, code) : s; }); },
    /* تحميل سريع من الجهاز بلا انتظار الشبكة (قد يكون فارغاً أول مرة) */
    cached: function (code) {
      var examsRec = examsStore.local(); if (!examsRec) return null;
      var lessonsBy = {}, marksBy = {};
      (examsRec.exams || []).forEach(function (e) {
        if (!e.code) return;
        var c = lsGet('term3_sched_lessons_' + e.code); lessonsBy[e.code] = c && !c.none ? c : null;
        marksBy[e.code] = marksStore(e.code).local();
      });
      var s = compose(examsRec, lessonsBy, marksBy);
      return code ? forSite(s, code) : s;
    },
    onChange: function (cb) {
      listeners.push(cb);
      return function () { listeners = listeners.filter(function (f) { return f !== cb; }); };
    },
    /* يُستدعى من موقع المادة حين ينجز درساً تعلّماً أو تسميعاً */
    done: function (code, lessonId, kind) { return mark(code, lessonId, true, kind); },
    undo: function (code, lessonId, date) { return mark(code, lessonId, false, '', date); },
    /* مستوى المادة من بنك الأسئلة: النسبة وعدد الإجابات */
    level: function (code, pct, answered) {
      var p = marksStore(code).put({ v: 1, marks: {}, level: { pct: Math.round(pct), n: answered | 0, t: Date.now() } });
      refreshFromLocal(); return p;
    },

    /* ---------- للجدول وحده ---------- */
    saveExams: function (exams, opts) {
      opts = opts || {};
      var cur = examsStore.local() || { v: 1, exams: [], cap: 8, override: null };
      var rec = { v: 1, exams: clone(exams || cur.exams), cap: opts.cap || cur.cap || 8,
        override: opts.override !== undefined ? opts.override : cur.override };
      var p = examsStore.put(rec);
      refreshFromLocal(); return p;
    },
    clearOverride: function () { return this.saveExams(null, { override: null }); },
    buildPlan: buildPlan,
    calibrate: calibrate,
    basis: examsBasis,

    /* الترتيب الذكي: طلب جاهز يُلصق في محادثة جديدة */
    smartPrompt: function (s) {
      s = s || state; if (!s) return '';
      var lines = [];
      lines.push('رتّب لي خطة مذاكرة يومية حتى اختباراتي، واكتب الجواب بالصيغة المطلوبة في آخره.');
      lines.push('اليوم: ' + s.today + '. السقف اليومي: ' + (s.cap * SESSION) + ' دقيقة صافية، أي ' + s.cap + ' جلسات من 25 دقيقة، وتمتد الجلسة إلى 30. والسقف حدّ اليوم المريح، لا يتجاوزه إلا ما تحتاجه التغطية.');
      lines.push('');
      lines.push('القواعد، والأولى أعلاها:');
      lines.push('1. التغطية أولاً: كل درس لم يُتعلَّم يُتعلَّم قبل اختبار مادته، وينتهي تعلّم دروس المادة يوم مراجعتها الشاملة، ولا يدخل ليلة الاختبار إلا إن لم يبقَ غيرها. فإن لم يتسع السقف لذلك زد دقائق الأيام بقدر الحاجة موزعة بالتساوي، ولا تترك درساً.');
      lines.push('2. المادة البعيدة لا تأخذ من وقت مادة قريبة لم تكتمل دروسها، إلا ما لا يحتمل التأجيل لتغطية البعيدة نفسها.');
      lines.push('3. ما بقي داخل السقف بعد التغطية: تسميع المواد القريبة أولاً، ثم المادة البعيدة جرعات صغيرة.');
      lines.push('4. لا تُخلط مادتان في جلسة واحدة، ولا تزيد المواد في اليوم على ثلاث. ودروس المادة الصغيرة المتتالية تُجمع في جلسة واحدة.');
      lines.push('5. كل درس يمرّ ثلاث مرات في أيام مختلفة إن اتسع الوقت: تعلّم (learn) ثم تسميعان (recall) متباعدان، والتسميع نحو ثلث وقت تعلّمه ولا يقل عن دقيقة.');
      lines.push('6. في اليومين الأخيرين قبل كل اختبار تظهر المادة كل يوم، وليلة الاختبار تسميع فقط ما لم تحتج التغطية إليها.');
      lines.push('7. ما فاتني يتوزع على الأيام القادمة دون تكديس.');
      lines.push('8. لا مهام لمادة في يوم اختبارها ولا بعده.');
      lines.push('');
      lines.push('الاختبارات:');
      s.exams.forEach(function (e) { if (e.code && s.lessons[e.code]) lines.push('- ' + e.code + ' (' + e.name + '): ' + e.date + (e.tentative ? ' (مبدئي)' : '')); });
      lines.push('');
      lines.push('الدروس (المعرّف | العنوان | دقائق التعلّم | مرات المرور المنجزة):');
      Object.keys(s.lessons).forEach(function (c) {
        var f = s.calib && s.calib[c] ? s.calib[c].factor : 1;
        lines.push(c + ':');
        s.lessons[c].forEach(function (l) {
          lines.push('  ' + l.id + ' | ' + l.title + ' | ' + lessonMinutes(l, f) + ' | ' + Math.min(((s.passes[c] || {})[l.id] || []).length, REQ));
        });
      });
      lines.push('');
      lines.push('صيغة الجواب: كتلة JSON واحدة فقط، تبدأ من اليوم، ولكل درس لم يُتعلّم بعد مهمة learn واحدة.');
      lines.push('وفي اليوم الذي قبل الاختبار بيومين مهمة {"kind":"review"} للمادة، وفي ليلة الاختبار مهمة {"kind":"eve"}، وكلتاهما 25 دقيقة بلا درس:');
      lines.push('{"days":[{"date":"YYYY-MM-DD","tasks":[{"code":"law114","lesson":"المعرّف","kind":"learn"},{"code":"law114","lesson":"المعرّف","kind":"recall"},{"code":"law114","kind":"review"}]}]}');
      return lines.join('\n');
    },
    /* يستخرج الخطة من جواب ملصوق ويتحقق منها */
    parseSmart: function (text, s) {
      s = s || state;
      var errors = [], plan = null;
      var t = String(text || ''), i = t.indexOf('{'), found = null;
      while (i >= 0 && !found) {
        var depth = 0, inStr = false, esc = false;
        for (var j = i; j < t.length; j++) {
          var ch = t[j];
          if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
          if (ch === '"') inStr = true; else if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) {
            try { var o = JSON.parse(t.slice(i, j + 1)); if (o && o.days) found = o; } catch (e) {}
            break;
          } }
        }
        i = t.indexOf('{', i + 1);
      }
      if (!found) return { ok: false, errors: ['لم أجد في الجواب خطة بالصيغة المطلوبة.'] };
      var examOf = {}; s.exams.forEach(function (e) { if (e.code) examOf[e.code] = e.date; });
      var learnCount = {};
      found.days.forEach(function (d) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date || '')) { errors.push('تاريخ غير صحيح: ' + d.date); return; }
        (d.tasks || []).forEach(function (tk) {
          if (!s.lessons[tk.code]) { errors.push('مادة غير معروفة: ' + tk.code); return; }
          if (!(tk.kind in KINDS)) { errors.push('نوع مهمة غير معروف: ' + tk.kind); return; }
          if (tk.kind === 'review' || tk.kind === 'eve') tk.lesson = tk.kind === 'eve' ? '_eve' : '_review';
          else if (!s.lessons[tk.code].some(function (l) { return l.id === tk.lesson; })) { errors.push('درس غير معروف: ' + tk.code + ' ' + tk.lesson); return; }
          if (d.date < s.today || d.date >= examOf[tk.code]) errors.push(tk.code + ' ' + tk.lesson + ': خارج الأيام المتاحة (' + d.date + ')');
          if (tk.kind === 'learn') { var k = tk.code + '|' + tk.lesson; learnCount[k] = (learnCount[k] || 0) + 1; }
        });
      });
      Object.keys(s.lessons).forEach(function (c) {
        if (!examOf[c] || examOf[c] <= s.today) return;
        s.lessons[c].forEach(function (l) {
          var done = ((s.passes[c] || {})[l.id] || []).filter(function (d) { return d < s.today; }).length > 0;
          var k = c + '|' + l.id, n = learnCount[k] || 0;
          if (!done && n !== 1) errors.push(c + ' ' + l.id + ': ورد للتعلّم ' + n + ' مرة، والمطلوب مرة واحدة.');
        });
      });
      if (errors.length) return { ok: false, errors: errors };
      plan = { basis: examsBasis(s.exams), created: Date.now(), days: found.days.map(function (d) {
        return { date: d.date, tasks: (d.tasks || []).map(function (tk) { return { code: tk.code, lesson: tk.lesson, kind: tk.kind }; }) };
      }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }) };
      return { ok: true, plan: plan, errors: [] };
    },
    applySmart: function (plan) { return this.saveExams(null, { override: plan }); },
    hasToken: function () { return !!token(); },

    /* حالة الحفظ في المستودع: ما ينتظر الرفع من هذا الجهاز، وآخر تغيير محفوظ في المستودع من أي جهاز */
    syncStatus: function () {
      var pending = 0, lastSaved = 0;
      function look(path, count) {
        var p = lsGet(pendKey(path)); if (p) pending += count(p);
        var c = lsGet(cacheKey(path)); if (c && (c.savedAt || 0) > lastSaved) lastSaved = c.savedAt;
      }
      look(EXAMS_PATH, function () { return 1; });
      knownCodes().forEach(function (c) {
        look(c + '/_passes.json', function (p) { return Object.keys(p.marks || {}).length + (p.level ? 1 : 0); });
      });
      return { token: !!token(), pending: pending, lastSaved: lastSaved, busy: syncBusy > 0, failed: syncFailed && pending > 0, failedAt: syncFailedAt };
    },
    /* إعادة محاولة الرفع بطلب من الصفحة */
    retrySync: function () { syncFailed = false; return flushAll(); }
  };

  /* رموز المواد المعروفة في الجهاز، ولو لم يكتمل التحميل بعد */
  function knownCodes() {
    var rec = examsStore.local(), codes = {};
    ((rec && rec.exams) || []).forEach(function (e) { if (e.code) codes[e.code] = 1; });
    Object.keys(markStores).forEach(function (c) { codes[c] = 1; });
    return Object.keys(codes);
  }
  /* رفع ما بقي في الجهاز: عند الفتح، وعند عودة الاتصال، وعند المغادرة */
  function flushAll(keepalive) {
    var runs = [examsStore.flush(keepalive)];
    knownCodes().forEach(function (c) { runs.push(marksStore(c).flush(keepalive)); });
    return Promise.all(runs);
  }
  window.addEventListener('online', function () { flushAll(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flushAll(true);
    else load().catch(function () {});
  });
  setTimeout(function () { flushAll(); }, 800);
})();
