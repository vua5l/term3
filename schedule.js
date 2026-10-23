/*
  ربط الجدول بمواقع المواد (الترم الثالث).
  اقرأ SCHEDULE.md في جذر المستودع قبل أي تعديل هنا.

  - الجدول وحده يملك مواعيد الاختبارات والتوزيع على الأيام.
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
  function todayISO() { return iso(new Date()); }

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

  function store(path, merge) {
    function local() { return merge(lsGet(cacheKey(path)), lsGet(pendKey(path))); }
    function flush(keepalive) {
      var run = (chains[path] || Promise.resolve()).then(function () {
        var rec = lsGet(pendKey(path)); if (!rec || !token()) return;
        return remoteRead(path).then(function (cur) {
          var m = merge(cur, rec);
          return remoteWrite(path, m, merge, keepalive);
        }).then(function (saved) {
          lsSet(cacheKey(path), saved);
          var now = lsGet(pendKey(path)); if (now && now.savedAt === rec.savedAt) lsSet(pendKey(path), null);
        });
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
      var i = k.lastIndexOf('|'), id = k.slice(0, i), d = k.slice(i + 1);
      (out[id] = out[id] || []).push(d);
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
        var i = k.lastIndexOf('|'), d = k.slice(i + 1);
        if (d < today) ev.push({ c: c, id: k.slice(0, i), d: d, t: m.t });
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

  /* ---------- التوزيع التلقائي على قواعد البحث ---------- */
  /*
    exams:   [{code, name, date}]
    lessons: {code: [{id, title, minutes}]}   (أو sessions القديمة)
    passes:  {code: {id: [YYYY-MM-DD]}}
    cap:     السقف اليومي بالجلسات، والجلسة 25 دقيقة (8 = 200 دقيقة)
    factors: {code: نسبة الوقت الفعلي إلى المقدَّر}
    يُبنى بالدقائق من بداية اليوم: ما أُنجز اليوم لا يغيّر خطة اليوم، بل يُعلَّم منجزاً فيها.
  */
  function buildPlan(exams, lessons, passes, today, cap, factors) {
    cap = cap || 8; factors = factors || {};
    var CAP = cap * SESSION;
    var subj = [], warnings = [];
    exams.forEach(function (e) {
      if (!e.code || !e.date || !lessons[e.code] || !lessons[e.code].length) return;
      if (diffDays(today, e.date) <= 0) return;
      var st = lessons[e.code].map(function (l) {
        var ds = ((passes[e.code] || {})[l.id] || []).filter(function (d) { return d < today; });
        ds = ds.filter(function (d, i) { return ds.indexOf(d) === i; });
        var m = lessonMinutes(l, factors[e.code]);
        return { l: l, m: m, r: recallOf(m), n: Math.min(ds.length, REQ), last: ds.length ? ds[ds.length - 1] : null };
      });
      subj.push({ e: e, st: st });
    });
    var days = [], end = today;
    subj.forEach(function (s) { var last = addDays(s.e.date, -1); if (last > end) end = last; });
    if (!subj.length) return { days: [], warnings: [] };

    function remaining(s) {
      var L = 0, R = 0;
      s.st.forEach(function (x) { if (x.n === 0) { L += x.m; R += x.r * (REQ - 1); } else R += x.r * (REQ - x.n); });
      return { L: L, R: R, total: L + R };
    }
    function task(s, x, kind) { return { code: s.e.code, lesson: x.l.id, kind: kind, minutes: kind === 'learn' ? x.m : x.r }; }
    // الترتيب داخل المادة: التسميع أول الجلسة، ثم الدرس الجديد، ثم المراجعة الشاملة
    var ORDER = { recall: 0, learn: 1, review: 2, eve: 2 };
    function byOrder(a, b) { return ORDER[a.kind] - ORDER[b.kind]; }

    for (var d = today; d <= end; d = addDays(d, 1)) {
      var active = subj.filter(function (s) {
        var A = diffDays(d, s.e.date);
        return A > 0 && (remaining(s).total > 0 || A <= 2); // اليومان الأخيران للمراجعة الشاملة دائماً
      });
      var day = { date: d, tasks: [] };
      if (active.length) {
        // معدّل الحاجة لكل مادة بالدقائق: التعلّم ينتهي قبل الاختبار بيومين ليبقى للتسميع مكان،
        // والتسميع يتوزع على كل الأيام الباقية
        active.forEach(function (s) {
          var A = diffDays(d, s.e.date); s._A = A; s._eve = A === 1; s._final = A <= 2;
          var r = remaining(s);
          s._need = r.L / Math.max(1, A - 2) + r.R / A;
          if (s._eve) { var rec = 0; s.st.forEach(function (x) { if (x.n >= 1 && x.n < REQ) rec += x.r; if (x.n === 0) rec += x.m; }); s._need = rec; }
          if (s._final) s._need += SPECIAL_MIN; // جلسة المراجعة الشاملة
          s._alloc = Math.min(CAP, ceilStep(s._need));
        });
        // الأقرب اختباراً أولاً، وليلة الاختبار مقدّمة
        active.sort(function (a, b) { return (b._eve - a._eve) || (a.e.date < b.e.date ? -1 : a.e.date > b.e.date ? 1 : 0); });
        if (active.length > MAX_SUBJECTS) active = active.slice(0, MAX_SUBJECTS);
        var sum = active.reduce(function (t, s) { return t + s._alloc; }, 0);
        if (sum > CAP) {
          // ضاق اليوم: تُقسم الدقائق على قدر حاجة كل مادة، فلا تُهمل مادة يومها
          // (البحث: المادتان المتقاربتان تظهران كل يوم، ولا يوم كامل لمادة واحدة)
          var scale = CAP / sum, used = 0;
          active.forEach(function (s) { s._alloc = Math.max(Math.min(SESSION, s._alloc), floorStep(s._alloc * scale)); used += s._alloc; });
          for (var k = 0, moved = true; used < CAP && moved && k < 100; k++) {
            moved = false;
            active.forEach(function (s) {
              if (used < CAP && s._alloc < s._need) { var add = Math.min(STEP, CAP - used); s._alloc += add; used += add; moved = true; }
            });
          }
          warnings.push({ date: d, type: 'tight' });
        } else if (sum < CAP) {
          // فائض اليوم يُقدَّم به العمل، والأقرب اختباراً أحق به
          var spare = CAP - sum, wsum = 0;
          active.forEach(function (s) { s._w = 1 / s._A; wsum += s._w; });
          active.forEach(function (s) {
            var r = remaining(s).total + (s._final ? SPECIAL_MIN : 0), extra = floorStep(spare * s._w / wsum);
            s._alloc = Math.max(s._alloc, Math.min(r, s._alloc + extra));
          });
        }
        var groups = [];
        active.forEach(function (s) {
          var budget = s._alloc, tasks = [];
          if (budget <= 0) return;
          if (s._final) budget -= SPECIAL_MIN;
          // 1) يُحجز للتعلّم نصيبه أولاً حتى لا يتأخر درس جديد عن موعد تسميعيه
          var fresh = s.st.filter(function (x) { return x.n === 0; });
          var learnTarget = s._eve ? 0 : remaining(s).L / Math.max(1, s._A - 2), learned = 0, fi = 0;
          function learnUpTo(limit) {
            while (fi < fresh.length) {
              var u = fresh[fi].m;
              if (budget <= 0 || budget < u - TOL || learned >= limit) break;
              tasks.push(task(s, fresh[fi], 'learn'));
              budget -= u; learned += u; fresh[fi].n = 1; fresh[fi].last = d; fi++;
            }
          }
          learnUpTo(learnTarget);
          // 2) ثم التسميع: ما حان موعده، وكله في ليلة الاختبار
          var due = s.st.filter(function (x) {
            if (x.n < 1 || x.n >= REQ || !x.last || x.last >= d) return false;
            if (s._eve) return true;
            var gap = Math.max(1, Math.round(0.3 * diffDays(x.last, s.e.date)));
            return diffDays(x.last, d) >= gap;
          }).sort(function (a, b) {
            // الأضيق فرصة أولاً (ما بقي له من مرور أكثر مما بقي من أيام)، ثم الأقدم
            var sa = s._A - (REQ - a.n), sb = s._A - (REQ - b.n);
            return (sa - sb) || (a.last < b.last ? -1 : a.last > b.last ? 1 : 0);
          });
          due.forEach(function (x) {
            if (budget < x.r - 2) return;
            tasks.push(task(s, x, 'recall'));
            budget -= x.r; x.n++; x.last = d;
          });
          // 3) ما فضل من نصيب المادة لدرس جديد آخر، ولا يُقطع درس، ولا يُتجاوز النصيب إلا قليلاً
          learnUpTo(Infinity);
          if (s._eve && fresh.some(function (x) { return x.n === 0; })) warnings.push({ date: d, type: 'unfinished', code: s.e.code });
          // 4) المراجعة الشاملة في اليومين الأخيرين: قبل الأخير مراجعة عامة، وليلة الاختبار تسميع البطاقات وورقة الليلة الأخيرة
          if (s._final) tasks.push({ code: s.e.code, lesson: s._eve ? '_eve' : '_review', kind: s._eve ? 'eve' : 'review', minutes: SPECIAL_MIN });
          tasks.sort(byOrder);
          if (tasks.length) groups.push({ s: s, tasks: tasks });
        });
        // ما فضل من السقف (لأن الدرس لا يُقطع) يُعطى لدروس جديدة، والأقرب اختباراً أولاً.
        // (البحث: تغطية أساسيات المنهج كله أهم من إتقان نصفه.) ولا تعلّم جديد ليلة الاختبار.
        var left = CAP - groups.reduce(function (t, g) { return t + g.tasks.reduce(function (a, x) { return a + x.minutes; }, 0); }, 0);
        active.slice().sort(function (a, b) { return a.e.date < b.e.date ? -1 : 1; }).forEach(function (s) {
          if (left < 1 || s._eve) return;
          var g = null; groups.forEach(function (x) { if (x.s === s) g = x; });
          var fresh = s.st.filter(function (x) { return x.n === 0; });
          for (var i = 0; i < fresh.length; i++) {
            var u = fresh[i].m;
            if (left < u - TOL) break;
            if (!g) { g = { s: s, tasks: [] }; groups.push(g); }
            g.tasks.push(task(s, fresh[i], 'learn'));
            left -= u; fresh[i].n = 1; fresh[i].last = d;
          }
          if (g) g.tasks.sort(byOrder);
        });
        // مادة ليلة الاختبار آخر اليوم، لتكون آخر ما يُراجع قبل النوم
        groups.sort(function (a, b) { return (a.s._eve - b.s._eve) || (a.s.e.date < b.s.e.date ? -1 : 1); });
        groups.forEach(function (g) { g.tasks.forEach(function (t) { t.units = unitsOf(t.minutes); day.tasks.push(t); }); });
      }
      days.push(packDay(day));
    }
    // تنبيه صادق: دروس لن تمرّ ثلاث مرات قبل اختبارها بهذا السقف
    subj.forEach(function (s) {
      var short = s.st.filter(function (x) { return x.n < REQ; }).length;
      var never = s.st.filter(function (x) { return x.n === 0; }).length;
      if (short) warnings.push({ type: 'short', code: s.e.code, count: short, unlearned: never });
    });
    warnings = warnings.filter(function (w) { return w.type !== 'unfinished'; });
    return { days: days, warnings: warnings };
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
    } else {
      plan = buildPlan(exams, lessonList, passes, today, cap, factors);
    }

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
      lessons: lessonList, passes: passes, progress: progress,
      days: plan.days, warnings: plan.warnings || [], calib: calib,
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
    var k = lessonId + '|' + (date || todayISO());
    var rec = { v: 1, marks: {} };
    rec.marks[k] = { on: on ? 1 : 0, t: Date.now(), k: kind || '' };
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
      lines.push('اليوم: ' + s.today + '. السقف اليومي: ' + (s.cap * SESSION) + ' دقيقة صافية، أي ' + s.cap + ' جلسات من 25 دقيقة، وتمتد الجلسة إلى 30.');
      lines.push('');
      lines.push('القواعد:');
      lines.push('1. لا تُخلط مادتان في جلسة واحدة، ولا تزيد المواد في اليوم على ثلاث. ودروس المادة الصغيرة المتتالية تُجمع في جلسة واحدة.');
      lines.push('2. كل درس يمرّ ثلاث مرات في أيام مختلفة: تعلّم (learn) ثم تسميعان (recall) متباعدان، والتسميع نحو ثلث وقت تعلّمه ولا يقل عن دقيقة.');
      lines.push('3. الأقرب اختباراً يأخذ الحصة الأكبر، والمادة البعيدة تأخذ جرعات صغيرة.');
      lines.push('4. في اليومين الأخيرين قبل كل اختبار تظهر المادة كل يوم، وليلة الاختبار تسميع فقط.');
      lines.push('5. ما فاتني يتوزع على الأيام القادمة دون تكديس.');
      lines.push('6. لا مهام لمادة في يوم اختبارها ولا بعده.');
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
    hasToken: function () { return !!token(); }
  };

  /* رفع ما بقي في الجهاز عند العودة أو الإغلاق */
  function flushAll(keepalive) {
    examsStore.flush(keepalive);
    Object.keys(markStores).forEach(function (c) { markStores[c].flush(keepalive); });
  }
  window.addEventListener('online', function () { flushAll(); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flushAll(true);
    else load().catch(function () {});
  });
  setTimeout(function () { flushAll(); }, 800);
})();
